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

// Auth & 永続化設定
export const auth = getAuth(app);
await setPersistence(auth, browserLocalPersistence);

// Firestore (veg-map データベース指定)
export const db = initializeFirestore(app, {}, 'veg-map');

// メールリンク用設定
const base = window.location.origin;
const repoPath = window.location.pathname.replace(/\/index\.html$/, '');  
// GH Pages なら "/veg-map" または "/veg-map/" になるはず

const actionCodeSettings = {
  url: `${base}${repoPath}`,       // → https://a-watahiki.github.io/veg-map に誘導
  handleCodeInApp: true
};

// Cloud Run（Gen2）エンドポイントのベース URL
const VERIFY_URL       = 'https://verifyusername-ictqzxcg5a-an.a.run.app/';
const SEARCHPLACES_URL = 'https://searchplaces-ictqzxcg5a-an.a.run.app/';
const FLAG_URL_BASE    = 'https://asia-northeast1-blissful-shore-458002-e9.cloudfunctions.net/getVegetarianFlag';

// ——————————————————————————————
// 1) ユーザーID＋メールリンク 認証ワークフロー
// ——————————————————————————————

/**
 * 1) allowedUsers 照合 → 2) 照合OKならメールリンク送信
 * @param {string} email 
 * @param {string} userId 
 */
export async function sendSignInLink(email, userId) {
  // 1) Firestore で ID 照合（認証前）
  const { ok } = await verifyUsernameUnauthenticated(userId);
  if (!ok) throw new Error('ユーザーIDが名簿と一致しません。');
  // 2) メールリンク送信
  window.localStorage.setItem('emailForSignIn', email);
  return sendSignInLinkToEmail(auth, email, actionCodeSettings);
}

/**
 * ページ読み込み時に呼び出して、リンク認証を完了
 */
export async function handleEmailLinkSignIn() {
  const link = window.location.href;
  if (isSignInWithEmailLink(auth, link)) {
    let email = window.localStorage.getItem('emailForSignIn');
    if (!email) {
      email = window.prompt('メールアドレスを入力してください');
    }
    const result = await signInWithEmailLink(auth, email, link);
    window.localStorage.removeItem('emailForSignIn');
    return result.user;
  }
  return null;
}

// ——————————————————————————————
// 2) ユーザーID照合：認証前版（トークン不要）
// ——————————————————————————————

/**
 * auth.currentUser が null でも使えるよう、認証チェックをしない
 * @param {string} username 
 */
export async function verifyUsernameUnauthenticated(username) {
  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });
  if (!res.ok) throw new Error(`verifyUsername failed: ${res.status}`);
  return res.json();
}

// ——————————————————————————————
// 3) 場所検索／フラグ取得
// ——————————————————————————————

/**
 * Cloud Run searchPlaces (認証後に呼ぶ)
 */
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

/**
 * Cloud Functions getVegetarianFlag (認証不要)
 */
export async function getVegetarianFlagFn(placeId) {
  const res = await fetch(
    `${FLAG_URL_BASE}?place_id=${encodeURIComponent(placeId)}`
  );
  if (!res.ok) throw new Error(`getVegetarianFlag failed: ${res.status}`);
  return res.json();
}

// Firebase 初期化完了を通知
window.dispatchEvent(new Event('firebaseReady'));

// デバッグ用公開
window.auth = auth;
window.db   = db;
