import firebase_admin
from firebase_admin import credentials, db
import os
import json

def initialize_firebase():
    """Firebase를 초기화합니다."""
    try:
        # serviceAccountKey.json 파일 경로
        cred_path = "serviceAccountKey.json"

        # 환경변수에서 JSON 문자열 읽기
        if not os.path.exists(cred_path):
            service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
            if not service_account_json:
                raise FileNotFoundError(f"Firebase 설정 파일을 찾을 수 없습니다: {cred_path} (환경변수도 없음)")
            # 임시 파일로 저장
            with open(cred_path, "w") as f:
                f.write(service_account_json)

        # Firebase 초기화
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            'databaseURL': 'https://bap-momok-dev-default-rtdb.firebaseio.com'  # 새로운 프로젝트 ID 기반 URL
        })

        print("Firebase가 성공적으로 초기화되었습니다.")
        
        # Firebase 연결 테스트
        try:
            test_ref = db.reference()
            test_ref.child('test').set({'test': 'connection'})
            test_ref.child('test').delete()
            print("✅ Firebase Realtime Database 연결 테스트 성공")
        except Exception as e:
            print(f"❌ Firebase Realtime Database 연결 테스트 실패: {e}")
            print("Firebase Console에서 Realtime Database를 생성해주세요.")
            return False
            
        return True

    except Exception as e:
        print(f"Firebase 초기화 중 오류 발생: {e}")
        return False

def get_database():
    """Firebase Realtime Database 인스턴스를 반환합니다."""
    return db.reference() 