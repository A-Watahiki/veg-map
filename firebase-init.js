// firebase-init.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth        } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore   } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';


// あなたの Firebase 設定
const firebaseConfig = {
  apiKey: "AIzaSyDa-5ULVWt44aHOKFui6y4bn-tKCJk4xQY",
  authDomain: "blissful-shore-458002-e9.firebaseapp.com",
  projectId: "blissful-shore-458002-e9",
  storageBucket: "blissful-shore-458002-e9.appspot.com",
  messagingSenderId: "570582104108",
  appId: "1:570582104108:web:87c3efeadafc22da9f3989",
  measurementId: "G-TLC59XH1R5"
};

// Firebaseアプリ初期化
const app = initializeApp(firebaseConfig);

// 認証とFirestoreを初期化
export const auth = getAuth(app);
export const db   = getFirestore(app);

window.auth = auth;
window.db   = db;