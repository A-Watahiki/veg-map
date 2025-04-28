// main.js
import { auth, sendSignInLink, handleEmailLinkSignIn, searchPlacesFn, getVegetarianFlagFn } from './firebase-init.js';
import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

let map, autocomplete;

// ──────────────
// ページロード時にメールリンク認証を処理
// ──────────────
handleEmailLinkSignIn()
  .then(user => {
    if (user) {
      alert('認証に成功しました！');
      // 認証後に地図を表示
      window.initMap = initMap;
      document.getElementById('controls').style.display = 'flex';
      document.getElementById('signup-form').style.display = 'none';
    }
  })
  .catch(console.error);

// ──────────────
// 認証状態変化ハンドラ
// ──────────────
onAuthStateChanged(auth, user => {
  const verified = user && user.emailVerified;

  // UI切り替え
  document.getElementById('signup-form').style.display = verified ? 'none' : 'block';
  document.getElementById('controls').style.display   = verified ? 'flex' : 'none';
  if (verified) {
    window.initMap = initMap;
  }
});

// ──────────────
// フォーム設定
// ──────────────
document.addEventListener('DOMContentLoaded', () => {
  // メールリンク送信＋ID照合
  document.getElementById('btn-email-signup').addEventListener('click', async () => {
    const email  = document.getElementById('signup-email').value.trim();
    const userId = document.getElementById('signup-userid').value.trim();
    const errEl  = document.getElementById('signup-error');
    errEl.style.display = 'none';

    if (!email || !userId) {
      errEl.textContent = 'メールアドレスとユーザーIDを入力してください。';
      return errEl.style.display = 'block';
    }
    try {
      // メールアドレスを保存
      window.localStorage.setItem('emailForSignIn', email);
      // ユーザーID照合とリンク送信
      await sendSignInLink(email, userId);
      alert('確認メールを送信しました。リンクをクリックしてアクセスしてください。');
    } catch (e) {
      errEl.textContent = 'エラー: ' + e.message;
      errEl.style.display = 'block';
    }
  });
});

// ──────────────
// Google Maps 初期化
// ──────────────
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 35.681236, lng: 139.767125 },
    zoom: 14
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
      const { serves_vegetarian_food } = await getVegetarianFlagFn(p.place_id);
      if (!serves_vegetarian_food) li.textContent += ' ❗️';
      ul.appendChild(li);
    }
  } catch (e) {
    alert('検索エラー: ' + e.message);
  }
}
