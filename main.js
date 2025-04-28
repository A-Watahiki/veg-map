// main.js
import { auth, verifyUsername, searchPlacesFn, getVegetarianFlagFn } from './firebase-init.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

let map, autocomplete;

// ──────────────
// 認証状態変化ハンドラ
// ──────────────
onAuthStateChanged(auth, user => {
  const ready = user && user.emailVerified;
  document.getElementById('signup-form').style.display = ready ? 'none' : 'block';
  document.getElementById('login-form').style.display  = ready ? 'none' : 'none';
  document.getElementById('controls').style.display    = ready ? 'flex' : 'none';
  if (ready) window.initMap = initMap;
});

// ──────────────
// フォーム設定
// ──────────────
document.addEventListener('DOMContentLoaded', () => {
  // サインアップ＋ID照合＋確認メール送信
  document.getElementById('btn-email-signup').addEventListener('click', async () => {
    const email  = document.getElementById('signup-email').value.trim();
    const pwd    = document.getElementById('signup-password').value;
    const userId = document.getElementById('signup-userid').value.trim();
    const errEl  = document.getElementById('signup-error');
    errEl.style.display = 'none';

    if (!email || !pwd || !userId) {
      errEl.textContent = '全ての項目を入力してください。';
      return errEl.style.display = 'block';
    }
    try {
      // 1) ユーザー登録
      const cred = await createUserWithEmailAndPassword(auth, email, pwd);
      // 2) ID 照合
      const { ok } = await verifyUsername(userId);
      if (!ok) throw new Error('ID照合に失敗しました');
      // 3) 照合OKなら確認メール
      await sendEmailVerification(cred.user);
      alert('ID確認OK! 確認メールを送信しました。リンクをクリックしてからログインしてください。');
    } catch (e) {
      errEl.textContent = e.message.includes('ID照合') 
        ? 'ユーザーIDが名簿と一致しません。'
        : '登録エラー: ' + e.message;
      errEl.style.display = 'block';
    }
  });

  // ログイン
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const pwd   = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    errEl.style.display = 'none';
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pwd);
      if (!cred.user.emailVerified) 
        throw new Error('メールを確認してからログインしてください');
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    }
  });
});

// ──────────────
// Google Maps 初期化
// ──────────────
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 35.681236, lng: 139.767125 }, zoom: 14
  });
  autocomplete = new google.maps.places.Autocomplete(
    document.getElementById('location-input')
  );
  autocomplete.bindTo('bounds', map);
  document.getElementById('search-btn').addEventListener('click', onSearch);
}

async function onSearch() {
  const place = autocomplete.getPlace();
  if (!place || !place.geometry) {
    alert('候補から選択してください');
    return;
  }
  map.setCenter(place.geometry.location);
  await multiKeywordSearch(place.geometry.location, [
    'vegetarian','vegan','ヴィーガン','ベジタリアン','素食','マクロビ','マクロビオティック'
  ]);
}

async function multiKeywordSearch(loc, keywords) {
  try {
    const places = await searchPlacesFn(loc, keywords);
    const ul = document.getElementById('results');
    ul.innerHTML = '';
    for (const p of places) {
      const li = document.createElement('li');
      li.textContent = p.name;
      const flag = (await getVegetarianFlagFn(p.place_id)).serves_vegetarian_food;
      if (!flag) li.textContent += ' ❗️';
      ul.appendChild(li);
    }
  } catch (e) {
    alert('検索エラー: ' + e.message);
  }
}
