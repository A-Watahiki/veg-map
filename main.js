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
const API_KEY = 'AIzaSyDqBaGedqbzQ5ad-6_0-_JNKy2BDILsqGA';
let mapsLoaded = false;

// 1) initMap をグローバルに登録
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

// 2) Maps API を動的にロード
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (mapsLoaded) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry&callback=initMap`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      mapsLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Google Maps API の読み込みに失敗しました'));
    document.head.appendChild(script);
  });
}

// 3) 認証状態／メールリンク処理
onAuthStateChanged(auth, async user => {
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

  if (isReady) {
    try {
      await loadGoogleMaps();
    } catch (e) {
      alert(e.message);
    }
  }
});


// 4) DOM 完全構築後にボタンのハンドラを設定
document.addEventListener('DOMContentLoaded', () => {
  console.log('➡️ DOMContentLoaded fired');

  const btn = document.getElementById('btn-send-link');
  console.log('📦 signup button element:', btn);
  if (!btn) {
    console.warn('❗️ btn-send-link が取得できませんでした');
    return;
  }

  btn.addEventListener('click', async (e) => {
    console.log('🖱️ btn-send-link clicked', e);

    // 追加で要注意！
    // HTML では input の id が "signup-userid" (小文字) ですが、
    // ここでは "signup-userID" (D が大文字) を参照していると要素が null になります。
    // const userID = document.getElementById('signup-userID').value.trim();
    //                            ↑ ここ、HTML に合わせて小文字にしてください
    const userID = document.getElementById('signup-userid').value.trim();
    const email  = document.getElementById('signup-email').value.trim();
    const errEl  = document.getElementById('signup-error');
    errEl.style.display = 'none';

    if (!userID || !email) {
      console.log('⚠️ 入力不足:', { userID, email });
      errEl.textContent = '両方入力してください';
      return errEl.style.display = 'block';
    }
    try {
      await sendSignInLink(email, userID);
      console.log('✅ sendSignInLink 成功');
      alert('確認メールを送りました。リンクを開いて認証を完了してください。');
    } catch (e) {
      console.error('❌ sendSignInLink 失敗', e);
      errEl.textContent = e.message;
      errEl.style.display = 'block';
    }
  });

  const okBtn = document.getElementById('success-ok');
  console.log('📦 success-ok button element:', okBtn);
  okBtn.addEventListener('click', async () => {
    console.log('🖱️ success-ok clicked');
    document.getElementById('auth-success').style.display = 'none';
    try {
      await loadGoogleMaps();
    } catch (e) {
      alert(e.message);
    }
  });
});


// 5) 検索ロジック
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
