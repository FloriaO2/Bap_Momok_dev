# main.py
import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Body, Query, Path
from fastapi.middleware.cors import CORSMiddleware
from models import GroupCreate, GroupUpdate, GroupData, GroupsData, Candidate, Vote, ParticipantJoin, Participant
from database import (
    create_group, get_group, update_group, delete_group, get_all_groups,
    get_groups_data, create_groups_data, update_groups_data
)
from firebase_config import initialize_firebase
from typing import Dict, Optional
import json
import random
import string
import requests
from itertools import combinations
import threading
from firebase_admin import db
from queue import Queue, Empty
from threading import Thread
from datetime import datetime, timedelta
import time

# 전역 락 객체 생성
vote_lock = threading.Lock()
global_lock = threading.Lock()

# import os
# from dotenv import load_dotenv
# load_dotenv()
# FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
# BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")

app = FastAPI(title="Babmomok API", description="밥머먹 API 서버")

# Firebase 초기화
print("🚀 Firebase 초기화 시작...")
firebase_initialized = initialize_firebase()
print(f"🔥 Firebase 초기화 결과: {firebase_initialized}")
if not firebase_initialized:
    print("❌ Firebase 초기화 실패! 서버가 정상 작동하지 않을 수 있습니다.")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 origin 허용
    allow_credentials=False,  # credentials 비활성화
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

def generate_random_id(length=20):
    chars = string.ascii_letters + string.digits
    return ''.join(random.choices(chars, k=length))

def get_next_candidate_id(group):
    existing = group.candidates.keys()
    nums = [int(k.split('_')[-1]) for k in existing if k.startswith('candidate_') and k.split('_')[-1].isdigit()]
    next_num = max(nums) + 1 if nums else 1
    return f"candidate_{next_num}"

def update_candidate_vote_counts(group):
    # 후보별 집계 초기화
    for candidate in group.candidates.values():
        candidate.good = 0
        candidate.bad = 0
        candidate.never = 0
        candidate.soso = 0
    # votes 순회하며 집계
    for user_vote in group.votes.values():
        for candidate_id, vote_value in user_vote.items():
            candidate = group.candidates.get(candidate_id)
            if candidate:
                if vote_value == "good":
                    candidate.good += 1
                elif vote_value == "bad":
                    candidate.bad += 1
                elif vote_value == "never":
                    candidate.never += 1
                elif vote_value == "soso":
                    candidate.soso += 1

YOGIYO_AUTH = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NTI4Mzc3OTUsImV4cCI6MTc1Mjg0NDk5NSwicGxhdGZvcm0iOiJZR1kiLCJyb2xlIjoidXNlciIsInN1Yl9pZCI6IjkwMjIxNTQyOSIsImJhc2VfdXJsIjoiaHR0cHM6Ly93d3cueW9naXlvLmNvLmtyIn0.nQzYafM-w33dP5Pc8uRQsbk3CQwQmM4zxuHPRYIF2JSnihhl7PwChpcc7KZuM6y9MRgelIjg3OPjSGFpPrwdMi4AzYA5EYph0mLn0rpWi6T_fLTRsRnso3IUc5EGZSNHoC1UXPopBUEMQi7tNLrDbaxRFtcAc-Q5L3GPP0M3438Xick7DZ648JPtk2nAYKNp-uGhLoYG1VFZw3sIl7dgSyoZhzyvD6pmOhNc1GzhXRFtUdTv8WqAr3aKjmjWq6xpzrzmXu7AHkaMifi1N-lm0-Wi25M6XRukWUI4YIgPd7RmyAadRQh7sJm9pQYxPMVnhfdgthxSmTLsSkomn2izqg"
YOGIYO_APISECRET = "fe5183cc3dea12bd0ce299cf110a75a2"
YOGIYO_APIKEY = "iphoneap"

vote_queue = Queue()

def get_batch_for_first_group(vote_queue):
    batch = []
    temp = []
    try:
        # 1. 큐에서 첫 데이터 꺼내서 기준 group_id 결정
        first = vote_queue.get(timeout=1)
        group_id = first[0]
        batch.append(first)
        # 2. 큐에 남은 데이터들 검사
        while True:
            item = vote_queue.get_nowait()
            if item[0] == group_id:
                batch.append(item)
            else:
                temp.append(item)
    except Empty:
        pass
    # 3. group_id가 다른 데이터는 다시 큐에 넣기
    for item in temp:
        vote_queue.put(item)
    return group_id, batch

# 기존 vote_worker를 배치 버전으로 교체

def vote_worker_batch():
    while True:
        try:
            group_id, batch = get_batch_for_first_group(vote_queue)
        except Exception as e:
            continue  # 큐가 비어있으면 대기
        with global_lock:
            try:
                group = get_group(group_id)
                if group is None:
                    print(f"[vote_worker_batch] 그룹을 찾을 수 없습니다: {group_id}")
                    continue
                for _, user_id, vote in batch:
                    # 기존 process_vote의 투표 반영 로직을 인라인으로 작성
                    candidate_id = list(vote.keys())[0]
                    vote_value = vote[candidate_id]
                    participant_nickname = group.participants.get(user_id, Participant(nickname="알 수 없는 사용자", suggest_complete=False)).nickname
                    print(f"✅ 투표 기록: [{participant_nickname}({user_id})]님이 [{candidate_id}]에 [{vote_value}] 투표함")
                    prev_vote = group.votes.get(user_id, {})
                    prev_vote.update(vote)
                    group.votes[user_id] = prev_vote
                    print(f"[vote_worker_batch] votes after update: {group.votes}")
                    update_candidate_vote_counts(group)
                    print(f"[vote_worker_batch] candidates after 집계: {group.candidates}")
                    group.calculate_ranks()
                    print(f"[vote_worker_batch] candidates after rank calculation: {group.candidates}")
                    participant = group.participants.get(user_id)
                    if participant:
                        participant.voted_count = len([v for v in group.votes[user_id].values() if v in ("good", "bad", "never", "soso")])
                        print(f"[vote_worker_batch] participant {user_id} voted_count: {participant.voted_count}")
                update_group(group_id, GroupUpdate(data=group))
            except Exception as e:
                print(f"🚨 vote_worker_batch 처리 중 오류 발생: {e}")
            finally:
                for _ in batch:
                    vote_queue.task_done()

# 워커 스레드 실행
Thread(target=vote_worker_batch, daemon=True).start()

def process_vote(group_id, user_id, vote):
    with global_lock:
        try:
            group = get_group(group_id)
            if group is None:
                print(f"[process_vote] 그룹을 찾을 수 없습니다: {group_id}")
                return
            candidate_id = list(vote.keys())[0]
            vote_value = vote[candidate_id]
            participant_nickname = group.participants.get(user_id, Participant(nickname="알 수 없는 사용자", suggest_complete=False)).nickname
            print(f"✅ 투표 기록: [{participant_nickname}({user_id})]님이 [{candidate_id}]에 [{vote_value}] 투표함")
            prev_vote = group.votes.get(user_id, {})
            prev_vote.update(vote)
            group.votes[user_id] = prev_vote
            print(f"[process_vote] votes after update: {group.votes}")
            update_candidate_vote_counts(group)
            print(f"[process_vote] candidates after 집계: {group.candidates}")
            group.calculate_ranks()
            print(f"[process_vote] candidates after rank calculation: {group.candidates}")
            participant = group.participants.get(user_id)
            if participant:
                participant.voted_count = len([v for v in group.votes[user_id].values() if v in ("good", "bad", "never", "soso")])
                print(f"[process_vote] participant {user_id} voted_count: {participant.voted_count}")
            update_group(group_id, GroupUpdate(data=group))
        except Exception as e:
            print(f"🚨 process_vote 처리 중 오류 발생: {e}")

@app.get("/")
def read_root():
    return {"message": "Babmomok API 서버에 오신 것을 환영합니다!"}

# 기존 그룹별 API 엔드포인트들
@app.get("/groups")
def get_groups():
    """모든 그룹 데이터를 조회합니다."""
    return get_all_groups()

@app.get("/groups/{group_id}")
def get_group_by_id(group_id: str):
    """특정 그룹 ID의 데이터를 조회합니다."""
    group = get_group(group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
    
    # 순위 계산
    group.calculate_ranks()
    
    return group

@app.post("/groups")
def create_new_group(group_create: GroupCreate):
    print(f"🚀 그룹 생성 요청 시작")
    print(f"🔍 받은 데이터: {group_create}")
    print(f"🔍 데이터 타입: {type(group_create)}")
    print(f"🔍 데이터 내용: {group_create.dict() if hasattr(group_create, 'dict') else group_create}")
    
    with global_lock:
        try:
            print(f"🔒 락 획득 완료")
            group_id, created_group = create_group(group_create)
            print(f"✅ 그룹 생성 성공: {group_id}")
            return {
                "message": "그룹이 성공적으로 생성되었습니다",
                "group_id": group_id,
                "data": created_group
            }
        except Exception as e:
            print(f"❌ 그룹 생성 오류: {str(e)}")
            print(f"❌ 오류 타입: {type(e)}")
            import traceback
            print(f"❌ 상세 오류: {traceback.format_exc()}")
            raise HTTPException(status_code=400, detail=f"그룹 생성 중 오류가 발생했습니다: {str(e)}")
        finally:
            print(f"🔓 락 해제")

@app.put("/groups/{group_id}")
def update_existing_group(group_id: str, group_update: GroupUpdate):
    with global_lock:
        updated_group = update_group(group_id, group_update)
        if updated_group is None:
            raise HTTPException(status_code=404, detail="업데이트할 그룹을 찾을 수 없습니다")
        return {
            "message": "그룹이 성공적으로 업데이트되었습니다",
            "group_id": group_id,
            "data": updated_group
        }

@app.delete("/groups/{group_id}")
def delete_existing_group(group_id: str):
    with global_lock:
        success = delete_group(group_id)
        if not success:
            raise HTTPException(status_code=404, detail="삭제할 그룹을 찾을 수 없습니다")
        return {"message": "그룹이 성공적으로 삭제되었습니다", "group_id": group_id}

# 새로운 전체 데이터 구조 API 엔드포인트들
# /health, /upload, /data 관련 엔드포인트 모두 삭제

@app.post("/groups/{group_id}/candidates")
def add_candidate(group_id: str, candidate: Candidate):
    with global_lock:
        group = get_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
        candidate_id = get_next_candidate_id(group)
        group.candidates[candidate_id] = candidate
        update_group(group_id, GroupUpdate(data=group))
        return {"message": "후보가 성공적으로 추가되었습니다", "candidate_id": candidate_id, "data": group}

@app.post("/groups/{group_id}/candidates/kakao")
def add_kakao_candidate(
    group_id: str,
    added_by: str = Body(...),
    kakao_data: dict = Body(...)
):
    with global_lock:
        group = get_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
        candidate_id = get_next_candidate_id(group)
        detail = {
            "addr": kakao_data.get("address_name"),
            "category": kakao_data.get("category_name"),
            "kakao_id": kakao_data.get("id")
        }
        candidate = Candidate(
            added_by=added_by,
            name=kakao_data.get("place_name", ""),
            type="kakao",
            detail=detail
        )
        group.candidates[candidate_id] = candidate
        update_group(group_id, GroupUpdate(data=group))
        return {"message": "카카오 후보가 성공적으로 추가되었습니다", "candidate_id": candidate_id, "data": group}

@app.post("/groups/{group_id}/candidates/yogiyo")
def add_yogiyo_candidate(
    group_id: str,
    added_by: str = Body(...),
    yogiyo_data: dict = Body(...)
):
    with global_lock:
        group = get_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
        candidate_id = get_next_candidate_id(group)
        detail = {
            "category": yogiyo_data.get("categories", []),
            "delivery_time": yogiyo_data.get("estimated_delivery_time"),
            "yogiyo_id": yogiyo_data.get("id")
        }
        candidate = Candidate(
            added_by=added_by,
            name=yogiyo_data.get("name", ""),
            type="yogiyo",
            detail=detail
        )
        group.candidates[candidate_id] = candidate
        update_group(group_id, GroupUpdate(data=group))
        return {"message": "요기요 후보가 성공적으로 추가되었습니다", "candidate_id": candidate_id, "data": group}

@app.post("/groups/{group_id}/votes/{user_id}")
def add_or_update_vote(group_id: str, user_id: str, vote: dict = Body(...)):
    vote_queue.put((group_id, user_id, vote))
    return {"message": "투표가 큐에 등록되었습니다."}

@app.post("/groups/{group_id}/participants")
def join_group(group_id: str, join: ParticipantJoin):
    with global_lock:
        group = get_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
        participant_id = generate_random_id()
        participant = Participant(
            nickname=join.nickname,
            suggest_complete=False,
            vote_complete=False
        )
        group.participants[participant_id] = participant
        update_group(group_id, GroupUpdate(data=group))
        return {"message": "참가자가 성공적으로 추가되었습니다", "participant_id": participant_id, "data": group}

@app.post("/groups/{group_id}/participants/{participant_id}/suggest-complete")
def set_suggest_complete(group_id: str, participant_id: str):
    with global_lock:
        group = get_group(group_id)
        if group is None:
            raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
        participant = group.participants.get(participant_id)
        if participant is None:
            raise HTTPException(status_code=404, detail="참가자를 찾을 수 없습니다")
        participant.suggest_complete = True
        
        # 일반모드일 때 모든 참가자가 완료 상태인지 체크
        if not group.timer_mode:
            all_complete = all(p.suggest_complete for p in group.participants.values())
            if all_complete:
                # 모든 참가자가 완료 상태이면 그룹 상태를 voting으로 변경
                group.state = "voting"
                print(f"🎯 일반모드: 모든 참가자 완료 - 그룹 {group_id} 상태를 voting으로 변경")
        
        update_group(group_id, GroupUpdate(data=group))
        return {"message": "제안 완료 처리됨", "participant_id": participant_id}

@app.get("/groups/{group_id}/results")
def get_voting_results(group_id: str):
    """투표 결과와 순위를 조회합니다."""
    group = get_group(group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
    
    # 순위 계산
    group.calculate_ranks()
    
    # 전체 결과 (순위순으로 정렬)
    all_candidates = []
    for candidate_id, candidate in group.candidates.items():
        all_candidates.append({
            "id": candidate_id,
            "name": candidate.name,
            "type": candidate.type,
            "rank": candidate.rank,
            "good": candidate.good,
            "soso": candidate.soso,
            "bad": candidate.bad,
            "never": candidate.never
        })
    all_candidates.sort(key=lambda x: x["rank"])
    # top3는 never 여부와 상관없이 상위 3개
    top3 = all_candidates[:3]
    return {
        "top3": top3,
        "all_results": all_candidates
    }

@app.get("/groups/{group_id}/yogiyo-restaurants")
def get_yogiyo_restaurants(
    group_id: str, 
    category: str = Query("", description="카테고리(선택)"),
    page: int = Query(1, description="페이지 번호"),
    search: str = Query("", description="가게 이름 검색어(선택)")
):
    """
    그룹의 위치(x, y)로 요기요에서 배달 가능한 식당 전체 정보를 반환합니다.
    category 파라미터로 카테고리 필터링도 지원합니다.
    page 파라미터로 페이지네이션을 지원합니다.
    search 파라미터로 가게 이름 검색도 지원합니다.
    """
    group = get_group(group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")

    lat = group.x
    lng = group.y
    items_per_page = 20  # 페이지 당 20개씩

    if search:
        # 검색어가 있을 때는 discovery/search/restaurant API 사용
        url = f"https://api.yogiyo.co.kr/discovery/search/restaurant?incoming_service_type=YGY_WEB&items={items_per_page}&lat={lat}&lng={lng}&order=rank&page={page-1}&search={search}&serving_type=vd"
    else:
        url = f"https://www.yogiyo.co.kr/api/v2/restaurants?items_per_page={items_per_page}&lat={lat}&lng={lng}&order=rank&page={page-1}"
        if category:
            url += f"&category={category}"
    print(f"[요기요 API 요청 URL] {url}")

    headers = {
        "Authorization": YOGIYO_AUTH,
        "X-Apisecret": YOGIYO_APISECRET,
        "X-Apikey": YOGIYO_APIKEY,
        "User-Agent": "Mozilla/5.0"
    }

    try:
        response = requests.get(url, headers=headers, timeout=30)  # 30초 타임아웃 설정
        response.raise_for_status()  # 200 OK가 아닐 경우 예외 발생
        data = response.json()

        # 응답 구조 통일
        if search:
            # discovery/search/restaurant API는 data['restaurant']['restaurants']
            restaurants = data.get('restaurant', {}).get('restaurants', [])
        else:
            # 기존 API는 data['restaurants']
            restaurants = data.get('restaurants', [])

        # 영업 중인 식당만 필터링
        if not search:
            if group.delivery_time:
                filtered_restaurants = []
                for restaurant in restaurants:
                    estimated_time = restaurant.get('estimated_delivery_time', '')
                    if estimated_time:
                        try:
                            import re
                            numbers = re.findall(r'\d+', estimated_time)
                            if numbers:
                                max_delivery_time = max(int(num) for num in numbers)
                                if max_delivery_time <= group.delivery_time:
                                    filtered_restaurants.append(restaurant)
                        except (ValueError, TypeError):
                            filtered_restaurants.append(restaurant)
                    else:
                        filtered_restaurants.append(restaurant)
                restaurants = filtered_restaurants
            # 영업중 필터(기존 API만)
            restaurants = [restaurant for restaurant in restaurants if restaurant.get('is_open', True)]
        # 검색 API는 영업중 필터, 배달시간 필터 생략(필요시 추가)

        return {"restaurants": restaurants}
    except requests.exceptions.Timeout:
        # 타임아웃 발생 시
        raise HTTPException(status_code=504, detail="요기요 API 응답 시간 초과 (30초)")
    except requests.exceptions.HTTPError as err:
        # 요기요 API에서 4xx 또는 5xx 응답이 올 경우
        raise HTTPException(status_code=err.response.status_code, detail=f"요기요 API 오류: {err.response.text}")
    except requests.exceptions.RequestException as err:
        # 네트워크 문제 등 기타 요청 관련 예외
        raise HTTPException(status_code=502, detail=f"요기요 API 호출 실패: {err}")

@app.get("/yogiyo-menu/{restaurant_id}")
def get_yogiyo_menu_summary(
    restaurant_id: str = Path(..., description="요기요 식당 ID")
):
    """
    요기요 식당의 상위 메뉴(이미지, 메뉴이름)만 반환합니다.
    """
    url = f"https://www.yogiyo.co.kr/api/v1/restaurants/{restaurant_id}/menu/?add_photo_menu=android&add_one_dish_menu=true&order_serving_type=delivery&serving_type=vd"
    headers = {
        "Authorization": f"Bearer {YOGIYO_AUTH}",
        "X-Apisecret": YOGIYO_APISECRET,
        "X-Apikey": YOGIYO_APIKEY,
        "User-Agent": "Mozilla/5.0"
    }
    try:
        response = requests.get(url, headers=headers, timeout=15)  # 15초 타임아웃 설정
        response.raise_for_status()
        data = response.json()
        # 상위 메뉴만 추출 (items의 name, original_image)
        menu_list = []
        for section in data:
            for item in section.get("items", []):
                menu_list.append({
                    "name": item.get("name"),
                    "image": item.get("original_image")
                })
        return {"menus": menu_list}
    except requests.exceptions.Timeout:
        # 타임아웃 발생 시
        raise HTTPException(status_code=504, detail="요기요 메뉴 API 응답 시간 초과 (15초)")
    except requests.exceptions.HTTPError as err:
        raise HTTPException(status_code=err.response.status_code, detail=f"요기요 API 오류: {err.response.text}")
    except requests.exceptions.RequestException as err:
        raise HTTPException(status_code=502, detail=f"요기요 API 호출 실패: {err}")

@app.get("/groups/{group_id}/participants/{participant_id}/vote_complete")
def check_vote_complete(group_id: str, participant_id: str):
    group_ref = db.reference(f"groups/{group_id}")
    group_data = group_ref.get()
    if not group_data:
        raise HTTPException(status_code=404, detail="Group not found")
    participants = group_data.get("participants", {})
    participant = participants.get(participant_id)
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    voted_count = participant.get("voted_count", 0)
    candidates = group_data.get("candidates", {})
    candidate_count = len(candidates)
    return {"vote_complete": voted_count == candidate_count}

@app.get("/groups/{group_id}/best_couple")
def get_best_couple(group_id: str):
    group = get_group(group_id)
    if group is None:
        raise HTTPException(status_code=404, detail="그룹을 찾을 수 없습니다")
    if not group.candidates or not group.votes or not group.participants:
        raise HTTPException(status_code=404, detail="후보, 참가자, 투표 정보가 부족합니다")

    candidate_ids = list(group.candidates.keys())
    num_candidates = len(candidate_ids)
    if num_candidates < 2:
        return {"best_couple": [], "best_couple_ids": [], "max_inner_product": None}

    # 투표값을 벡터로 변환
    vote_map = {"good": 3, "soso": 1, "bad": -1, "never": -3}
    participant_vectors = {}
    for pid, vote_dict in group.votes.items():
        vec = []
        for cid in candidate_ids:
            v = vote_dict.get(cid, None)
            if v is None:
                vec.append(0)
            else:
                vec.append(vote_map.get(v, 0))
        # 벡터 길이 체크: 후보 개수와 다르면 무시
        if len(vec) == num_candidates and sum([1 for cid in candidate_ids if cid in vote_dict]) == num_candidates:
            participant_vectors[pid] = vec
    if len(participant_vectors) < 2:
        return {"best_couple": [], "best_couple_ids": [], "max_inner_product": None}

    # nC2 쌍에 대해 내적 계산
    max_score = None
    best_pair = None
    for (pid1, vec1), (pid2, vec2) in combinations(participant_vectors.items(), 2):
        inner = sum([a*b for a, b in zip(vec1, vec2)])
        if (max_score is None) or (inner > max_score):
            max_score = inner
            best_pair = (pid1, pid2)
    if best_pair is None:
        return {"best_couple": [], "best_couple_ids": [], "max_inner_product": None}
    # 닉네임 추출 (Participant 객체가 아닐 수도 있으니 dict도 처리)
    def get_nickname(pid):
        p = group.participants.get(pid)
        if p is None:
            return pid
        if hasattr(p, 'nickname'):
            return p.nickname
        if isinstance(p, dict) and 'nickname' in p:
            return p['nickname']
        return pid
    nickname1 = get_nickname(best_pair[0])
    nickname2 = get_nickname(best_pair[1])
    return {"best_couple": [nickname1, nickname2], "best_couple_ids": list(best_pair), "max_inner_product": max_score}

def check_timer_mode_groups():
    """타이머 모드 그룹들의 시간을 체크하고 시간이 끝나면 모든 참가자를 완료 상태로 만드는 함수"""
    try:
        groups = get_all_groups()
        current_time = datetime.now()
        
        for group_id, group in groups.items():
            if group.timer_mode and group.state == "suggestion":
                # 그룹 생성 시간과 start_votingtime을 이용해 투표 시작 시간 계산
                creation_time = datetime.fromisoformat(group.group_creation_time.replace('Z', '+00:00'))
                voting_start_time = creation_time + timedelta(minutes=group.start_votingtime)
                
                # 현재 시간이 투표 시작 시간을 지났으면 모든 참가자를 완료 상태로 변경
                if current_time >= voting_start_time:
                    print(f"⏰ 타이머 모드: 그룹 {group_id} 시간 종료 - 모든 참가자를 완료 상태로 변경")
                    
                    # 모든 참가자를 완료 상태로 변경
                    for participant in group.participants.values():
                        participant.suggest_complete = True
                    
                    # 그룹 상태를 voting으로 변경
                    group.state = "voting"
                    
                    # 그룹 업데이트
                    update_group(group_id, GroupUpdate(data=group))
    except Exception as e:
        print(f"❌ 타이머 모드 체크 중 오류: {e}")

# 주기적으로 타이머 모드 그룹들을 체크하는 스레드
def start_timer_checker():
    """타이머 모드 그룹들을 주기적으로 체크하는 스레드를 시작합니다"""
    def timer_checker():
        while True:
            try:
                check_timer_mode_groups()
                time.sleep(30)  # 30초마다 체크
            except Exception as e:
                print(f"❌ 타이머 체커 스레드 오류: {e}")
                time.sleep(30)
    
    timer_thread = Thread(target=timer_checker, daemon=True)
    timer_thread.start()
    print("⏰ 타이머 모드 체커 스레드 시작됨")

# Vercel 배포를 위한 실행 코드
if __name__ == "__main__":
    import uvicorn
    # 타이머 체커 스레드 시작
    start_timer_checker()
    uvicorn.run(app, host="0.0.0.0", port=8000)
