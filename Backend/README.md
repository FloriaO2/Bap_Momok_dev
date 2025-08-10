# Babmomok API 서버

밥모임 데이터를 관리하는 REST API 서버입니다.

## 설치 및 실행

### 1. 의존성 설치
```bash
pip install -r requirements.txt
```

### 2. 서버 실행
```bash
python run.py
```

또는
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

서버가 실행되면 다음 URL에서 접근할 수 있습니다:
- API 서버: http://localhost:8000
- API 문서: http://localhost:8000/docs
- 대안 API 문서: http://localhost:8000/redoc

## API 엔드포인트

### 전체 데이터 구조 API (groups 루트 키 포함)

#### 1. 전체 데이터 생성 (POST)
```
POST /data
```

전체 데이터 구조를 생성합니다 (groups 루트 키 포함).

**요청 예시:**
```json
{
  "groups": {
    "group_123": {
      "candidates": {
        "candidate_1": {
          "added_by": "participant_1",
          "bad": 1,
          "detail": {
            "addr": "대전 유성구 대덕대로 535",
            "category": "음식점 > 패스트푸드 > 맥도날드",
            "kakao_id": 22559525
          },
          "good": 3,
          "name": "맥도날드 대전카이스트점",
          "never": 1,
          "soso": 2,
          "type": "kakao"
        }
      },
      "delivery": true,
      "delivery_time": "18:00",
      "offline": true,
      "radius": 300,
      "participants": {
        "participant_1": {
          "nickname": "재호",
          "suggest_complete": false
        }
      },
      "start_votingtime": "2025-07-19T18:30:00",
      "state": "suggestion",
      "votes": {},
      "x": 127.123,
      "y": 37.456
    }
  }
}
```

#### 2. 전체 데이터 조회 (GET)
```
GET /data
```

전체 데이터 구조를 조회합니다 (groups 루트 키 포함).

#### 3. 전체 데이터 업데이트 (PUT)
```
PUT /data
```

전체 데이터 구조를 업데이트합니다 (groups 루트 키 포함).

### 개별 그룹 API

#### 1. 그룹 생성 (POST)
```
POST /groups
```

새로운 그룹 데이터를 생성합니다.

**요청 예시:**
```json
{
  "group_id": "group_123",
  "data": {
    "candidates": {
      "candidate_1": {
        "added_by": "participant_1",
        "bad": 1,
        "detail": {
          "addr": "대전 유성구 대덕대로 535",
          "category": "음식점 > 패스트푸드 > 맥도날드",
          "kakao_id": 22559525
        },
        "good": 3,
        "name": "맥도날드 대전카이스트점",
        "never": 1,
        "soso": 2,
        "type": "kakao"
      }
    },
    "delivery": true,
    "delivery_time": "18:00",
    "offline": true,
    "radius": 300,
    "participants": {
      "participant_1": {
        "nickname": "재호",
        "suggest_complete": false
      }
    },
    "start_votingtime": "2025-07-19T18:30:00",
    "state": "suggestion",
    "votes": {},
    "x": 127.123,
    "y": 37.456
  }
}
```

#### 2. 그룹 조회 (GET)
```
GET /groups                    # 모든 그룹 조회
GET /groups/{group_id}         # 특정 그룹 조회
```

#### 3. 그룹 업데이트 (PUT)
```
PUT /groups/{group_id}
```

기존 그룹 데이터를 업데이트합니다.

**요청 예시:**
```json
{
  "data": {
    "candidates": {
      "candidate_1": {
        "added_by": "participant_1",
        "bad": 2,
        "detail": {
          "addr": "대전 유성구 대덕대로 535",
          "category": "음식점 > 패스트푸드 > 맥도날드",
          "kakao_id": 22559525
        },
        "good": 4,
        "name": "맥도날드 대전카이스트점",
        "never": 1,
        "soso": 2,
        "type": "kakao"
      }
    },
    "delivery": true,
    "delivery_time": "18:00",
    "offline": true,
    "radius": 300,
    "participants": {
      "participant_1": {
        "nickname": "재호",
        "suggest_complete": true
      }
    },
    "start_votingtime": "2025-07-19T18:30:00",
    "state": "voting",
    "votes": {
      "participant_1": {
        "candidate_1": "good"
      }
    },
    "x": 127.123,
    "y": 37.456
  }
}
```

#### 4. 그룹 삭제 (DELETE)
```
DELETE /groups/{group_id}
```

### 5. 서버 상태 확인 (GET)
```
GET /health
```

## 데이터 구조

### Candidate (후보 음식점)
- `added_by`: 추가한 참가자 ID
- `bad`: 싫어요 투표 수
- `detail`: 상세 정보 (카카오, 요기요, 커스텀 타입)
- `good`: 좋아요 투표 수
- `name`: 음식점 이름
- `never`: 절대 안돼 투표 수
- `soso`: 그럭저럭 투표 수
- `type`: 데이터 타입 (kakao, yogiyo, custom)

### Participant (참가자)
- `nickname`: 닉네임
- `suggest_complete`: 제안 완료 여부

### GroupData (그룹 데이터)
- `candidates`: 후보 음식점 목록
- `delivery`: 배달 가능 여부
- `delivery_time`: 배달 시간
- `offline`: 오프라인 모임 여부
- `participants`: 참가자 목록
- `radius`: 검색 반경 (미터)
- `start_votingtime`: 투표 시작 시간
- `state`: 그룹 상태 (suggestion, voting, complete)
- `votes`: 투표 결과
- `x`, `y`: 위치 좌표

### GroupsData (전체 데이터)
- `groups`: 그룹 데이터들의 딕셔너리

## 테스트

API 문서 페이지(http://localhost:8000/docs)에서 직접 테스트할 수 있습니다.

또는 curl을 사용하여 테스트할 수 있습니다:

```bash
# 전체 데이터 생성
curl -X POST "http://localhost:8000/data" \
     -H "Content-Type: application/json" \
     -d @full_data.json

# 전체 데이터 조회
curl -X GET "http://localhost:8000/data"

# 전체 데이터 업데이트
curl -X PUT "http://localhost:8000/data" \
     -H "Content-Type: application/json" \
     -d @updated_full_data.json

# 개별 그룹 생성
curl -X POST "http://localhost:8000/groups" \
     -H "Content-Type: application/json" \
     -d @group_data.json

# 개별 그룹 조회
curl -X GET "http://localhost:8000/groups/group_123"

# 개별 그룹 업데이트
curl -X PUT "http://localhost:8000/groups/group_123" \
     -H "Content-Type: application/json" \
     -d @update_data.json

# 개별 그룹 삭제
curl -X DELETE "http://localhost:8000/groups/group_123"
```

또는 Python 테스트 스크립트를 실행할 수 있습니다:

```bash
python test_api.py
``` 