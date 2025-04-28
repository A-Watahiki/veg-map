// firebase-init.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth }      from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
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

// Auth & Firestore
export const auth = getAuth(app);
export const db   = initializeFirestore(app, {}, 'veg-map');

// ----------
// Cloud Run (v2) エンドポイントを fetch で呼ぶラッパー
// ----------

/**
 * ユーザー名照合
 * @param {string} username
 * @returns {Promise<{ok: boolean}>}
 */
export async function verifyUsername(username) {
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(
    'https://verifyusername-ictqzxcg5a-an.a.run.app',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ username })
    }
  );
  if (!res.ok) throw new Error(`verifyUsername failed: ${res.status}`);
  return res.json();
}

/**
 * Nearby Search (searchPlaces)
 * @param {{lat:number,lng:number}} location
 * @param {string[]} keywords
 */
export async function searchPlacesFn(location, keywords) {
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(
    'https://searchplaces-ictqzxcg5a-an.a.run.app/searchPlaces',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({ location, keywords })
    }
  );
  if (!res.ok) throw new Error(`searchPlaces failed: ${res.status}`);
  return (await res.json()).places;
}

/**
 * Vegetarian Flag 取得
 * @param {string} placeId
 */
export async function getVegetarianFlagFn(placeId) {
  const res = await fetch(
    `https://asia-northeast1-blissful-shore-458002-e9.cloudfunctions.net/getVegetarianFlag?place_id=${encodeURIComponent(placeId)}`
  );
  if (!res.ok) throw new Error(`getVegetarianFlag failed: ${res.status}`);
  return res.json();
}

// Firebase初期化完了を通知
window.dispatchEvent(new Event('firebaseReady'));

// デバッグ用公開
window.auth      = auth;
window.db        = db;
