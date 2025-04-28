```javascript
// firebase-init.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { 
  getFunctions,
  httpsCallable
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-functions.js';
import { initializeFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

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

// Firestore（veg-map データベース）
export const db = initializeFirestore(app, {}, 'veg-map');

// Functions (asia-northeast1)
const functions = getFunctions(app, 'asia-northeast1');

// Cloud Function 呼び出しラッパー
export const verifyUsername     = httpsCallable(functions, 'verifyUsername');
export const searchPlacesFn     = httpsCallable(functions, 'searchPlaces');
export const getVegetarianFlagFn = httpsCallable(functions, 'getVegetarianFlag');

// Firebase初期化完了を通知するイベントを発火
window.dispatchEvent(new Event('firebaseReady'));

// デバッグ用グローバル公開
window.auth      = auth;
window.db        = db;
window.functions = functions;
```
