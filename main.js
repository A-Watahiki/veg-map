// main.js
import {
  auth,
  handleEmailLinkSignIn,
  sendSignInLink,
  searchPlacesFn,
  getVegetarianFlagFn
} from './firebase-init.js';
import {
  onAuthStateChanged,
  signInWithEmailLink
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

let map, autocomplete;

// 1) initMap をグローバルに公開
function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 35.681236, lng: 139.767125 },
    zoom: 14
  });
  autocomplete = new google.maps.places.Autocomplete(
    document.getElementById('location-input')
  );
  autocomplete.bindTo('bounds', map);
  document.getElementById('search-btn')
    .addEventListener('click', onSearch);
}
window.initMap = initMap;

// 2) 認証状態／メールリンク処理
onAuthStateChanged(auth, async user => {
  // メールリンクサインインのハンドリング
  if (!user) {
    const signedInUser = await handleEmailLinkSignIn();
    if (signedInUser) {
      document.getElementById('auth-forms').style.display = 'none';
      document.getElementById('auth-success').style.display = 'block';
      return;
    }
  }

  const isReady = user && user.emailVerified;
  document.getElementById('auth-forms').style.display   = isReady ? 'none' : 'block';
  document.getElementById('controls').style.display     = isReady ? 'flex' : 'none';
});

// 3) DOM 完全構築後にボタンのハンドラを設定
document.addEventListener('DOMContentLoaded', () => {
  // サインアップ＋リンク送信
  document.getElementById('btn-send-link')
    .addEventListener('click', async () => {
      const userId = document.getElementById('signup-userid').value.trim();
      const email  = document.getElementById('signup-email').value.trim();
      const errEl  = document.getElementById('signup-error');
      errEl.style.display = 'none';

      if (!userId || !email) {
        errEl.textContent = '両方入力してください';
        return errEl.style.display = 'block';
      }
      try {
        await sendSignInLink(email, userId);
        alert('確認メールを送りました。リンクを開いて認証を完了してください。');
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
      }
    });

  // 成功ポップアップの OK ボタン
  document.getElementById('success-ok')
    .addEventListener('click', () => {
      document.getElementById('auth-success').style.display = 'none';
      // 認証済みユーザー用に地図を初期化
      initMap();
    });
});

// 4) 検索ロジック
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
      const li   = document.createElement('li');
      const flag = (await getVegetarianFlagFn(p.place_id))
                     .serves_vegetarian_food;
      li.textContent = p.name + (flag ? '' : ' ❗️');
      ul.appendChild(li);
    }
  } catch (e) {
    alert('検索エラー: ' + e.message);
  }
}
