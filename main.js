// main.js
import { auth, db, verifyUsername, searchPlacesFn, getVegetarianFlagFn } from './firebase-init.js';

// Auth functions from CDN build
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

let map, service, autocomplete, distanceService, originLocation;

// Firestore 初期化完了イベントの待機処理
window.addEventListener('firebaseReady', () => {
  console.log('Firebase準備完了、Firestore利用可能');
  // Google Maps API callback 用に initMap をグローバル登録
  window.initMap = initMap;
});

// ──────────────
// 1) Google Maps 初期化
// ──────────────
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 35.681236, lng: 139.767125 },
    zoom: 14
  });
  service = new google.maps.places.PlacesService(map);
  distanceService = new google.maps.DistanceMatrixService();
  autocomplete = new google.maps.places.Autocomplete(
    document.getElementById('location-input')
  );
  autocomplete.bindTo('bounds', map);

  document.getElementById('search-btn').addEventListener('click', async () => {
    const place = autocomplete.getPlace();
    if (!place?.geometry) {
      alert('候補から場所を選択してください');
      return;
    }
    originLocation = place.geometry.location;
    map.setCenter(originLocation);
    map.setZoom(15);
    await multiKeywordSearch(originLocation, [
      'vegetarian','vegan',
      'ヴィーガン','ベジタリアン',
      '素食','マクロビ','マクロビオティック'
    ]);
  });
}

// ──────────────
// 2) 検索ロジック
// ──────────────
async function multiKeywordSearch(location, keywords) {
  try {
    const places = await searchPlacesFn(location, keywords);
    drawResults(places);
  } catch (e) {
    console.error('検索エラー:', e);
    alert('検索に失敗しました');
  }
}

// …（fetchVegetarianFlag, drawResults のコードは省略）…

// ──────────────
// 3) 認証＆UI 切り替え
// ──────────────
document.addEventListener('DOMContentLoaded', () => {
  // メール登録フォームを開く
  document.getElementById('btn-email-show').addEventListener('click', () => {
    document.getElementById('signup-methods').style.display = 'none';
    document.getElementById('signup-form').style.display   = 'block';
  });

  // 新規登録
  document.getElementById('btn-email-signup').addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const pwd   = document.getElementById('signup-password').value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pwd);
      await sendEmailVerification(cred.user);
      alert('登録完了! 確認メールを送信しました。');
    } catch (e) {
      alert('登録エラー: ' + e.message);
    }
  });

  // Google 認証
  document.getElementById('btn-google-signin').addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      alert(`${result.user.displayName}さん、ようこそ！`);
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user')
        alert('Google認証エラー: ' + e.message);
    }
  });

  // ユーザー名照合
  document.getElementById('btn-verify-username').addEventListener('click', async () => {
    const inputName = document.getElementById('username-input').value.trim();
    const errorEl   = document.getElementById('username-error');
    if (!inputName) {
      errorEl.textContent = 'ユーザー名を入力してください。';
      return errorEl.style.display = 'block';
    }
    try {
      const { ok } = await verifyUsername(inputName);
      if (!ok) {
        errorEl.textContent = 'ユーザー名が名簿と一致しません。';
        return errorEl.style.display = 'block';
      }
      errorEl.style.display = 'none';
      document.getElementById('username-verification').style.display = 'none';
      document.getElementById('controls').style.display              = 'flex';
    } catch (e) {
      console.error(e);
      errorEl.textContent = '通信エラーが発生しました。';
      errorEl.style.display = 'block';
    }
  });

  // ログイン実行
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pwd   = document.getElementById('login-password').value;
    try {
      await signInWithEmailAndPassword(auth, email, pwd);
      alert('ログイン成功！');
    } catch (e) {
      alert('ログインエラー: ' + e.message);
    }
  });

  // UI切り替え
  onAuthStateChanged(auth, user => {
    document.getElementById('auth-forms').style.display            = user ? 'none' : 'block';
    document.getElementById('username-verification').style.display = user ? 'block' : 'none';
    document.getElementById('controls').style.display              = user ? 'none' : 'none';
  });
});
