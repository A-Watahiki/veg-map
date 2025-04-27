// firebase-init.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
// modular Firestore 初期化用
import {
  initializeFirestore,
  persistentLocalCache,
  experimentalForceLongPolling,
  useFetchStreams
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDa-5ULVWt44aHOKFui6y4bn-tKCJk4xQY",
  authDomain: "blissful-shore-458002-e9.firebaseapp.com",
  projectId: "blissful-shore-458002-e9",
  storageBucket: "blissful-shore-458002-e9.appspot.com",
  messagingSenderId: "570582104108",
  appId: "1:570582104108:web:87c3efeadafc22da9f3989",
  measurementId: "G-TLC59XH1R5"
};

// Firebase アプリ初期化
const app = initializeApp(firebaseConfig);

// Auth 初期化（これは今まで通り）
export const auth = getAuth(app);

// Firestore を “long-polling” で強制起動
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabMultiWindowSharedClientState: true }),
  experimentalForceLongPolling: true,
  // 通常ストリームが効かない環境であれば fetchStreams 停止
  useFetchStreams: false,
});

// デバッグ用にグローバルにも
window.db   = db;
window.auth = auth;
