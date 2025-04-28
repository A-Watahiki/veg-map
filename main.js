// main.js
import { auth, db, verifyUsername, searchPlacesFn, getVegetarianFlagFn } from './firebase-init.js';

// Auth functions from CDN build
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

let map, service, autocomplete, distanceService, originLocation;

// ---------------------------
// Handle Auth State Changes
// ---------------------------
function handleAuthChange(user) {
  const isReady = user && user.emailVerified;
  document.getElementById('auth-forms').style.display = isReady ? 'none' : 'block';
  document.getElementById('username-verification').style.display = isReady ? 'block' : 'none';
  document.getElementById('controls').style.display = isReady ? 'flex' : 'none';

  if (isReady) {
    registerMap();
  }
}

// Register listener at top-level so cached session works on reload
onAuthStateChanged(auth, handleAuthChange);

// ---------------------------
// Setup Forms and Listeners
// ---------------------------
function setupForms() {
  document.getElementById('btn-email-show').addEventListener('click', () => {
    document.getElementById('signup-methods').style.display = 'none';
    document.getElementById('signup-form').style.display = 'block';
  });

  document.getElementById('btn-email-signup').addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const pwd = document.getElementById('signup-password').value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pwd);
      await sendEmailVerification(cred.user);
      alert('登録完了! 確認メールを送信しました。');
    } catch (e) {
      if (e.code === 'auth/invalid-email') {
        alert('無効なメールアドレスです');
      } else if (e.code === 'auth/weak-password') {
        alert('パスワードは6文字以上にしてください');
      } else {
        alert('登録エラー: ' + e.message);
      }
    }
  });

  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pwd = document.getElementById('login-password').value;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pwd);
      if (!cred.user.emailVerified) {
        alert('メールを確認してから再度ログインしてください');
      }
    } catch (e) {
      if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
        alert('メールまたはパスワードが正しくありません');
      } else {
        alert('ログインエラー: ' + e.message);
      }
    }
  });

  document.getElementById('btn-verify-username').addEventListener('click', async () => {
    const inputName = document.getElementById('username-input').value.trim();
    const errorEl = document.getElementById('username-error');
    if (!inputName) {
      errorEl.textContent = 'ユーザーIDを入力してください。';
      return errorEl.style.display = 'block';
    }
    try {
      const { ok } = await verifyUsername(inputName);
      if (!ok) {
        errorEl.textContent = 'ユーザーIDが名簿と一致しません。';
        return errorEl.style.display = 'block';
      }
      errorEl.style.display = 'none';
      registerMap();
    } catch (e) {
      console.error('verifyUsername error:', e);
      if (e.message.includes('401')) {
        alert('認証切れです。再ログインしてください');
      } else {
        alert('通信エラーが発生しました。');
      }
      errorEl.style.display = 'block';
    }
  });
}

document.addEventListener('DOMContentLoaded', setupForms);

// ---------------------------
// Map Initialization Logic
// ---------------------------
function registerMap() {
  window.initMap = initMap;
}

window.addEventListener('firebaseReady', registerMap);

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

  document.getElementById('search-btn').addEventListener('click', onSearch);
}

async function onSearch() {
  const place = autocomplete.getPlace();
  if (!place?.geometry) {
    alert('候補から場所を選択してください');
    return;
  }
  originLocation = place.geometry.location;
  map.setCenter(originLocation);
  map.setZoom(15);
  await multiKeywordSearch(originLocation, [
    'vegetarian','vegan','ヴィーガン','ベジタリアン','素食','マクロビ','マクロビオティック'
  ]);
}

async function multiKeywordSearch(location, keywords) {
  try {
    const places = await searchPlacesFn(location, keywords);
    await drawResults(places);
  } catch (e) {
    console.error('検索エラー:', e);
    if (e.message.includes('401')) {
      alert('認証が必要です。ログインしてください');
    } else {
      alert('検索に失敗しました。ネットワークを確認してください');
    }
  }
}

async function drawResults(places) {
  const resultsEl = document.getElementById('results');
  resultsEl.innerHTML = '';
  for (const p of places) {
    const li = document.createElement('li');
    li.textContent = p.name;
    try {
      const { serves_vegetarian_food } = await getVegetarianFlagFn(p.place_id);
      if (!serves_vegetarian_food) {
        li.textContent += ' ❗️';
      }
    } catch (_) {
      // ignore flag errors
    }
    resultsEl.appendChild(li);
  }
}
