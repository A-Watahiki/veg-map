// firebase-init.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
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

// Firestore 初期化 (デフォルトDB、databaseId指定なし)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache(),   // Tab間キャッシュ共有
  experimentalForceLongPolling: true,   // WebChannel失敗時は常にロングポーリング
  useFetchStreams: false                // fetchStreamsを使わずXHR
});

// Firebase初期化完了を通知するイベントを発火
const firebaseReadyEvent = new Event('firebaseReady');
window.dispatchEvent(firebaseReadyEvent);

// デバッグ用グローバル公開
window.auth = auth;
window.db   = db;

// initMap 登録用ヘルパー
export function registerInitMap(fn) {
  window.initMap = fn;
}