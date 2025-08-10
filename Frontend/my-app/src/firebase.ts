import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyArSVqlMe8DhlUVX1RvJQGEbmkzYzkY9FY",
  authDomain: "bap-momok-dev.firebaseapp.com",
  projectId: "bap-momok-dev",
  storageBucket: "bap-momok-dev.firebasestorage.app",
  messagingSenderId: "775253348914",
  appId: "1:775253348914:web:37c8beb1ac7f72bda3a22b",
  measurementId: "G-S6GN9EXXR4"
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
export const database = getDatabase(app); 