import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyArSVqlMe8DhlUVX1RvJQGEbmkzYzkY9FY",
  authDomain: "bap-momok-dev.firebaseapp.com",
  databaseURL: "https://bap-momok-dev-default-rtdb.firebaseio.com",
  projectId: "bap-momok-dev",
  storageBucket: "bap-momok-dev.firebasestorage.app",
  messagingSenderId: "775253348914",
  appId: "1:775253348914:web:37c8beb1ac7f72bda3a22b",
  measurementId: "G-S6GN9EXXR4"
};

console.log('🔥 Firebase 초기화 시작...');
console.log('🌐 현재 환경:', process.env.NODE_ENV);
console.log('🔗 Database URL:', firebaseConfig.databaseURL);

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase 앱 초기화 완료');
} else {
  app = getApps()[0];
  console.log('✅ 기존 Firebase 앱 사용');
}

export const database = getDatabase(app);
console.log('✅ Firebase Database 인스턴스 생성 완료');

// Firebase 연결 상태 확인 함수
export const checkFirebaseConnection = async () => {
  try {
    console.log('🔍 Firebase 연결 상태 확인 중...');
    const testRef = ref(database, '.info/connected');
    const snapshot = await get(testRef);
    console.log('✅ Firebase 연결 상태:', snapshot.val());
    return snapshot.val() === true;
  } catch (error) {
    console.error('❌ Firebase 연결 확인 실패:', error);
    return false;
  }
}; 