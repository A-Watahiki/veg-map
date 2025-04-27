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

// 認証
export const auth = getAuth(app);

// 「veg-map」という名前のデータベースを指定する
export const db = initializeFirestore(app, {
  databaseId: 'veg-map',               // ← ここで既存 DB 名を指定
  localCache: persistentLocalCache(),  
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});

// デバッグ用にグローバルにも置く
window.auth = auth;
window.db   = db;

// initMap 登録用ヘルパー
export function registerInitMap(fn) {
  window.initMap = fn;
}
