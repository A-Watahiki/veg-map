// main.js
console.log('🟢 main.js 実行開始');

import {
  auth,
  handleEmailLinkSignIn,
  sendSignInLink,
  searchPlacesFn,
  getVegetarianFlagFn
} from './firebase-init.js';
import {
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

let map, autocomplete;
const API_KEY = 'AIzaSyDqBaGedqbzQ5ad-6_0-_JNKy2BDILsqGA';
let mapsLoaded = false;
const markers = [];

// 1) initMap をグローバルに登録
function initMap() {
  console.log('▶️ initMap called');
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 35.681236, lng: 139.767125 },
    zoom: 14
  });
  autocomplete = new google.maps.places.Autocomplete(
    document.getElementById('location-input')
  );
  autocomplete.bindTo('bounds', map);

  const btn = document.getElementById('search-btn');
  console.log('📦 search-btn:', btn);
  btn.addEventListener('click', onSearch);
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
  document.getElementById('auth-forms').style.display = isReady ? 'none' : 'block';
  document.getElementById('controls').style.display = isReady ? 'flex' : 'none';

  if (isReady) {
    try {
      await loadGoogleMaps();
    } catch (e) {
      alert(e.message);
    }
  }
});

// 4) 認証フォーム周りのイベントハンドラを登録
function setupAuthEventHandlers() {
  console.log('🔧 setupAuthEventHandlers');

  const btn = document.getElementById('btn-send-link');
  console.log('📦 signup button element:', btn);
  if (!btn) {
    console.warn('❗️ btn-send-link が取得できません');
  } else {
    btn.addEventListener('click', async () => {
      console.log('🖱️ btn-send-link clicked');
      const userID = document.getElementById('signup-userid').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const errEl = document.getElementById('signup-error');
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
  }

  const okBtn = document.getElementById('success-ok');
  console.log('📦 success-ok button element:', okBtn);
  if (okBtn) {
    okBtn.addEventListener('click', async () => {
      console.log('🖱️ success-ok clicked');
      document.getElementById('auth-success').style.display = 'none';
      try {
        await loadGoogleMaps();
      } catch (e) {
        alert(e.message);
      }
    });
  }
}

// DOM の準備が済んでいれば即実行、まだなら待つ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAuthEventHandlers);
} else {
  setupAuthEventHandlers();
}

// 5) 検索ロジック
async function onSearch() {
  console.log('🖱️ onSearch');
  const place = autocomplete.getPlace();
  if (!place || !place.geometry) {
    alert('候補から選択してください');
    return;
  }
  const latLng = place.geometry.location;
  const lat = typeof latLng.lat === 'function' ? latLng.lat() : latLng.lat;
  const lng = typeof latLng.lng === 'function' ? latLng.lng() : latLng.lng;
  console.log('📍 selected location lat/lng:', lat, lng);
  map.setCenter(latLng);
  await multiKeywordSearch({ lat, lng }, [
    'vegetarian','vegan','ヴィーガン','ベジタリアン','素食','マクロビ','マクロビオティック'
  ]);
}

// 6) 結果取得と描画
async function multiKeywordSearch(loc, keywords) {
  console.log('🔍 multiKeywordSearch', loc, keywords);
  // アイコン定義
  const defaultIcon = {
    url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    scaledSize: new google.maps.Size(32, 32)
  };
  const hoverIcon = {
    url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    scaledSize: new google.maps.Size(48, 48)
  };

  try {
    const places = await searchPlacesFn(loc, keywords);
    console.log('🔎 places result:', places);

    // 既存マーカーをクリア
    markers.forEach(m => m.setMap(null));
    markers.length = 0;

    const ul = document.getElementById('results');
    ul.innerHTML = '';

    for (const p of places) {
      // フラグ取得
      const flag = (await getVegetarianFlagFn(p.place_id)).serves_vegetarian_food;

      // リストアイテム作成
      const li = document.createElement('li');
      li.classList.add('result-item');

      // 店名カラム
      const nameDiv = document.createElement('div');
      nameDiv.classList.add('item-name');
      if (!flag) {
        const emoji = document.createElement('span');
        emoji.textContent = '❗️ ';
        nameDiv.appendChild(emoji);
      }
      nameDiv.appendChild(document.createTextNode(p.name));

      // 住所カラム
      const vicinityDiv = document.createElement('div');
      vicinityDiv.classList.add('item-vicinity');
      vicinityDiv.textContent = p.vicinity || '';

      // 空の距離カラム（後で拡張用）
      const distanceDiv = document.createElement('div');
      distanceDiv.classList.add('item-distance');
      distanceDiv.textContent = '';

      li.append(nameDiv, vicinityDiv, distanceDiv);
      ul.appendChild(li);

      // マーカー作成
      let marker;
      if (p.geometry && p.geometry.location) {
        marker = new google.maps.Marker({
          position: p.geometry.location,
          map,
          title: p.name,
          icon: defaultIcon
        });
        markers.push(marker);
      }

      // ホバー連携
      if (marker) {
        marker.addListener('mouseover', () => {
          marker.setIcon(hoverIcon);
          li.classList.add('hover');
        });
        marker.addListener('mouseout', () => {
          marker.setIcon(defaultIcon);
          li.classList.remove('hover');
        });
      }
      li.addEventListener('mouseover', () => {
        if (marker) marker.setIcon(hoverIcon);
      });
      li.addEventListener('mouseout', () => {
        if (marker) marker.setIcon(defaultIcon);
      });
    }
  } catch (e) {
    console.error('検索エラー:', e);
    alert('検索エラー: ' + e.message);
  }
}