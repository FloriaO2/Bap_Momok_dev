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
        
        # serviceAccountKey.json 파일 경로
        cred_path = "serviceAccountKey.json"

        # 환경변수에서 JSON 문자열 읽기
        if not os.path.exists(cred_path):
            print("📁 serviceAccountKey.json 파일이 없습니다. 환경변수에서 읽어옵니다...")
            service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
            print(f"🔑 FIREBASE_SERVICE_ACCOUNT 환경변수 존재: {service_account_json is not None}")
            if service_account_json:
                print(f"🔑 환경변수 길이: {len(service_account_json)}")
            if not service_account_json:
                raise FileNotFoundError(f"Firebase 설정 파일을 찾을 수 없습니다: {cred_path} (환경변수도 없음)")
            # 임시 파일로 저장
            with open(cred_path, "w") as f:
                f.write(service_account_json)
            print("✅ 환경변수에서 Firebase 설정을 파일로 저장했습니다.")
        else:
            print("✅ serviceAccountKey.json 파일이 이미 존재합니다.")

        # Firebase 초기화
        cred = credentials.Certificate(cred_path)
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