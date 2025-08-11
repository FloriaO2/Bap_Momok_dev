from typing import Dict, Optional
from models import GroupData, GroupCreate, GroupUpdate, GroupsData
from firebase_config import get_database
import json

def create_group(group_create: GroupCreate) -> (str, GroupData):
    """새로운 그룹 데이터를 Firebase에 생성하고, 자동 생성된 group_id를 반환합니다."""
    try:
        db = get_database()
        ref = db.child('groups').push(group_create.data.dict())
        group_id = ref.key  # 자동 생성된 20글자 난수
        return group_id, group_create.data
    except Exception as e:
        raise Exception(f"Firebase 그룹 생성 중 오류: {str(e)}")

def get_group(group_id: str) -> Optional[GroupData]:
    """Firebase에서 그룹 ID로 그룹 데이터를 조회합니다."""
    try:
        db = get_database()
        data = db.child('groups').child(group_id).get()
        if data:
            return GroupData(**data)
        return None
    except Exception as e:
        print(f"Firebase 그룹 조회 중 오류: {str(e)}")
        return None

def update_group(group_id: str, group_update: GroupUpdate) -> Optional[GroupData]:
    print(f"[update_group] 진입: group_id={group_id}")
    try:
        db = get_database()
        data_dict = group_update.data.dict()
        print(f"[update_group] set 직전: group_id={group_id}, 저장할 데이터=", data_dict)
        db.child('groups').child(group_id).set(data_dict)
        print(f"[update_group] set 직후: group_id={group_id}")
        return group_update.data
    except Exception as e:
        print(f"[update_group] Firebase 그룹 업데이트 중 오류: {str(e)}")
        return None

def delete_group(group_id: str) -> bool:
    """Firebase에서 그룹 데이터를 삭제합니다."""
    try:
        db = get_database()
        db.child('groups').child(group_id).delete()
        return True
    except Exception as e:
        print(f"Firebase 그룹 삭제 중 오류: {str(e)}")
        return False

def get_all_groups() -> Dict[str, GroupData]:
    """Firebase에서 모든 그룹 데이터를 반환합니다."""
    try:
        db = get_database()
        data = db.child('groups').get()
        if data:
            groups = {}
            for group_id, group_data in data.items():
                groups[group_id] = GroupData(**group_data)
            return groups
        return {}
    except Exception as e:
        print(f"Firebase 모든 그룹 조회 중 오류: {str(e)}")
        return {}

def get_groups_data() -> GroupsData:
    """Firebase에서 groups 루트 키를 포함한 전체 데이터 구조를 반환합니다."""
    try:
        db = get_database()
        data = db.get()
        if data and 'groups' in data:
            groups = {}
            for group_id, group_data in data['groups'].items():
                groups[group_id] = GroupData(**group_data)
            return GroupsData(groups=groups)
        return GroupsData(groups={})
    except Exception as e:
        print(f"Firebase 전체 데이터 조회 중 오류: {str(e)}")
        return GroupsData(groups={})

def create_groups_data(groups_data: GroupsData) -> GroupsData:
    """Firebase에 전체 groups 데이터를 생성합니다."""
    try:
        db = get_database()
        # 전체 데이터를 Firebase에 저장
        groups_dict = {}
        for group_id, group_data in groups_data.groups.items():
            groups_dict[group_id] = group_data.dict()
        
        db.child('groups').set(groups_dict)
        return groups_data
    except Exception as e:
        raise Exception(f"Firebase 전체 데이터 생성 중 오류: {str(e)}")

def update_groups_data(groups_data: GroupsData) -> GroupsData:
    """Firebase에서 전체 groups 데이터를 업데이트합니다."""
    try:
        db = get_database()
        # 전체 데이터를 Firebase에 업데이트
        groups_dict = {}
        for group_id, group_data in groups_data.groups.items():
            groups_dict[group_id] = group_data.dict()
        
        db.child('groups').update(groups_dict)
        return groups_data
    except Exception as e:
        raise Exception(f"Firebase 전체 데이터 업데이트 중 오류: {str(e)}") 

# vote_complete 관련 함수, 로직, 주석 전체 삭제 