// firebase-init.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth        } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import {
  initializeFirestore,
  persistentLocalCache
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';


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

// Auth
export const auth = getAuth(app);

// Firestore をロングポーリング強制＋キャッシュ有効化
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),   // Tab 間キャッシュ共有
  experimentalForceLongPolling: true,   // WebChannel 失敗時は常に長輪受信
  useFetchStreams: false                // fetchStreams を使わず XHR
});

// デバッグ用にグローバルにも置く
window.auth = auth;
window.db   = db;

// initMap 登録用ヘルパー
export function registerInitMap(fn) {
  window.initMap = fn;
}
