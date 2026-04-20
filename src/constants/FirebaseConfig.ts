import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD5TE5cDQTR1cull-VGbQDw3Tlbd6DU5rM",
  authDomain: "maviinci-erp.firebaseapp.com",
  projectId: "maviinci-erp",
  storageBucket: "maviinci-erp.firebasestorage.app",
  messagingSenderId: "787319154913",
  appId: "1:787319154913:web:d7c5ac957ba8fc73a2afa0",
};

// Check if Firebase is already initialized to avoid "Already exists" error
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);