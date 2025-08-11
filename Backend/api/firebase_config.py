import firebase_admin
from firebase_admin import credentials, db
import os
import json

def initialize_firebase():
    """Firebase를 초기화합니다."""
    try:
        print("🔍 Firebase 초기화 시작...")
        
        # 이미 초기화되었는지 확인
        try:
            firebase_admin.get_app()
            print("✅ Firebase가 이미 초기화되어 있습니다.")
            return True
        except ValueError:
            print("🔄 Firebase 초기화가 필요합니다.")
        
        # 환경변수에서 직접 JSON 파싱
        service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
        print(f"🔑 FIREBASE_SERVICE_ACCOUNT 환경변수 존재: {service_account_json is not None}")
        
        if not service_account_json:
            raise FileNotFoundError("FIREBASE_SERVICE_ACCOUNT 환경변수가 설정되지 않았습니다.")
        
        # JSON 파싱
        try:
            service_account_info = json.loads(service_account_json)
            print("✅ JSON 파싱 성공")
        except json.JSONDecodeError as e:
            print(f"❌ JSON 파싱 실패: {e}")
            raise
        
        # Firebase 초기화 (파일 없이 직접)
        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred, {
            'databaseURL': 'https://bap-momok-dev-default-rtdb.firebaseio.com'
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
        import traceback
        print(f"❌ 상세 오류: {traceback.format_exc()}")
        return False

def get_database():
    """Firebase Realtime Database 인스턴스를 반환합니다."""
    try:
        # Firebase가 초기화되었는지 확인
        firebase_admin.get_app()
        return db.reference()
    except ValueError:
        print("❌ Firebase가 초기화되지 않았습니다. 초기화를 시도합니다...")
        if initialize_firebase():
            return db.reference()
        else:
            raise Exception("Firebase 초기화에 실패했습니다.") 