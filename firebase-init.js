// firebase-init.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyDa-5ULVWt44aHOKFui6y4bn-tKCJk4xQY',
  authDomain: 'blissful-shore-458002-e9.firebaseapp.com',
  projectId: 'blissful-shore-458002-e9',
  storageBucket: 'blissful-shore-458002-e9.appspot.com',
  messagingSenderId: '570582104108',
  appId: '1:570582104108:web:87c3efeadafc22da9f3989',
  measurementId: 'G-TLC59XH1R5'
};

// Firebase アプリ初期化
const app = initializeApp(firebaseConfig);

// Auth & 永続化設定
export const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

// Firestore (デフォルトデータベース)
export const db = getFirestore(app);

// メールリンク用設定
const base = window.location.origin;
const repoPath = window.location.pathname.replace(/\/index\.html$/, '');
const actionCodeSettings = {
  url: `${base}${repoPath}`,
  handleCodeInApp: true
};

// エンドポイント定義
const VERIFY_URL        = 'https://verifyusername-ictqzxcg5a-an.a.run.app/';
const SEARCHPLACES_URL  = 'https://searchplaces-ictqzxcg5a-an.a.run.app/';
const FLAG_URL_BASE     = 'https://asia-northeast1-blissful-shore-458002-e9.cloudfunctions.net/getVegetarianFlag';
const VEGAN_FLAG_URL_BASE = 'https://asia-northeast1-blissful-shore-458002-e9.cloudfunctions.net/getVeganFlag';

// 1) メールリンク送信
export async function sendSignInLink(email, userId) {
  const { ok } = await verifyUsernameUnauthenticated(userId);
  if (!ok) throw new Error('ユーザーIDが名簿と一致しません。');
  window.localStorage.setItem('emailForSignIn', email);
  return sendSignInLinkToEmail(auth, email, actionCodeSettings);
}

// 2) メールリンクサインイン
export async function handleEmailLinkSignIn() {
  const link = window.location.href;
  if (isSignInWithEmailLink(auth, link)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) email = window.prompt('メールアドレスを入力してください');
    const result = await signInWithEmailLink(auth, email, link);
    window.localStorage.removeItem('emailForSignIn');
    return result.user;
  }
  return null;
}

// 3) ユーザー照合（認証前）
export async function verifyUsernameUnauthenticated(username) {
  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  if (!res.ok) throw new Error(`verifyUsername failed: ${res.status}`);
  return res.json();
}

// 4) 場所検索
export async function searchPlacesFn(location, keywords) {
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(SEARCHPLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`
    },
    body: JSON.stringify({ location, keywords })
  });
  if (!res.ok) throw new Error(`searchPlaces failed: ${res.status}`);
  return (await res.json()).places;
}

// 5) ベジタリアンフラグ取得
export async function getVegetarianFlagFn(placeId) {
  try {
    const res = await fetch(`${FLAG_URL_BASE}?place_id=${encodeURIComponent(placeId)}`);
    if (!res.ok) {
      console.error('getVegetarianFlag failed status:', res.status);
      return { serves_vegetarian_food: false };
    }
    const data = await res.json();
    return { serves_vegetarian_food: data.serves_vegetarian_food ?? false };
  } catch (e) {
    console.error('getVegetarianFlag error:', e);
    return { serves_vegetarian_food: false };
  }
}

// 6) ヴィーガンフラグ取得
export async function getVeganFlagFn(placeId) {
  try {
    const res = await fetch(`${VEGAN_FLAG_URL_BASE}?place_id=${encodeURIComponent(placeId)}`);
    if (!res.ok) {
      console.error('getVeganFlag failed status:', res.status);
      return { serves_vegan_food: false };
    }
    const data = await res.json();
    return { serves_vegan_food: data.serves_vegan_food ?? false };
  } catch (e) {
    console.error('getVeganFlag error:', e);
    return { serves_vegan_food: false };
  }
}

// 初期化完了通知
window.dispatchEvent(new Event('firebaseReady'));

// デバッグ用公開
window.auth = auth;
window.db   = db;
