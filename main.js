// main.js
console.log('🟢 main.js 実行開始');

import {
  auth,
  handleEmailLinkSignIn,
  sendSignInLink,
  searchPlacesFn,
  getVegetarianFlagFn,
  getVeganFlagFn
} from './firebase-init.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

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
  btn.addEventListener('click', onSearch);
}
window.initMap = initMap;

// 2) Maps API を動的にロード
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (mapsLoaded) return resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => { mapsLoaded = true; initMap(); resolve(); };
    script.onerror = () => reject(new Error('Google Maps API の読み込みに失敗しました'));
    document.head.appendChild(script);
  });
}

// 3) 認証状態管理と Maps ロード
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
    try { await loadGoogleMaps(); } catch (e) { alert(e.message); }
  }
});

// 4) サインアップフォームイベント
function setupAuthEventHandlers() {
  const btn = document.getElementById('btn-send-link');
  if (btn) {
    btn.addEventListener('click', async () => {
      const userID = document.getElementById('signup-userid').value.trim();
      const email = document.getElementById('signup-email').value.trim();
      const errEl = document.getElementById('signup-error'); errEl.style.display = 'none';
      if (!userID || !email) {
        errEl.textContent = '両方入力してください';
        return errEl.style.display = 'block';
      }
      try {
        await sendSignInLink(email, userID);
        alert('確認メールを送りました。リンクを開いて認証を完了してください。');
      } catch (e) {
        errEl.textContent = e.message;
        errEl.style.display = 'block';
      }
    });
  }
  const okBtn = document.getElementById('success-ok');
  if (okBtn) {
    okBtn.addEventListener('click', async () => {
      document.getElementById('auth-success').style.display = 'none';
      try { await loadGoogleMaps(); } catch(e) { alert(e.message); }
    });
  }
}
document.readyState === 'loading' ?
  document.addEventListener('DOMContentLoaded', setupAuthEventHandlers) :
  setupAuthEventHandlers();

// 5) 検索処理
async function onSearch() {
  const place = autocomplete.getPlace();
  if (!place || !place.geometry) {
    alert('候補から選択してください'); return;
  }
  map.setCenter(place.geometry.location);
  await multiKeywordSearch(
    { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
    ['vegetarian','vegan','ヴィーガン','ベジタリアン','素食','マクロビ','マクロビオティック']
  );
}

// 6) multiKeywordSearch: ステップごとに個別 try-catch
async function multiKeywordSearch(loc, keywords) {
  const service = new google.maps.places.PlacesService(map);
  const distanceService = new google.maps.DistanceMatrixService();
  let rawPlaces;

  // Step1: nearbySearch
  try {
    rawPlaces = await searchPlacesFn(loc, keywords);
  } catch (e) {
    console.error('SearchPlaces API error:', e);
    alert('検索結果取得エラー: ' + e.message);
    return;
  }

  // Step2: 詳細取得
  let details;
  try {
    const promises = rawPlaces.map(p => new Promise(resolve => {
      service.getDetails(
        { placeId: p.place_id, fields: ['name','vicinity','geometry','place_id'] },
        (detail, status) => resolve(status === google.maps.places.PlacesServiceStatus.OK ? detail : null)
      );
    }));
    details = (await Promise.all(promises)).filter(d => d);
  } catch (e) {
    console.error('PlacesService getDetails error:', e);
    alert('詳細取得エラー');
    return;
  }

  // Step3: Distance Matrix
  try {
    const origins = [new google.maps.LatLng(loc.lat, loc.lng)];
    const destinations = details.map(d => d.geometry.location);
    const dm = await new Promise(resolve => {
      distanceService.getDistanceMatrix(
        { origins, destinations, travelMode: 'WALKING', unitSystem: google.maps.UnitSystem.METRIC },
        (res, status) => resolve({ res, status })
      );
    });
    if (dm.status === google.maps.DistanceMatrixStatus.OK) {
      details = details.map((d, i) => {
        const el = dm.res.rows[0].elements[i];
        return {
          detail: d,
          distanceValue: el.distance.value,
          distanceText: el.distance.text,
          durationValue: el.duration.value,
          durationText: el.duration.text
        };
      }).filter(item => item.distanceValue <= 1500)
        .sort((a, b) => a.durationValue - b.durationValue);
    }
  } catch (e) {
    console.error('DistanceMatrix error:', e);
    alert('距離計算エラー');
    return;
  }

  // Step4: 描画
  markers.forEach(m => m.setMap(null)); markers.length = 0;
  const ul = document.getElementById('results'); ul.innerHTML = '';
  const defaultIcon = { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new google.maps.Size(32, 32) };
  const hoverIcon   = { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new google.maps.Size(48, 48) };

  for (const item of details) {
    const d = item.detail;
    // Step5: フラグ取得
    let vegFlag = false, veganFlag = false;
    try { vegFlag = (await getVegetarianFlagFn(d.place_id)).serves_vegetarian_food; } catch (e) { console.warn('VegFlag error:', e); }
    try { veganFlag = (await getVeganFlagFn(d.place_id)).serves_vegan_food; } catch (e) { console.warn('VeganFlag error:', e); }

    const prefix = veganFlag ? '❤️ ' : vegFlag ? '💚 ' : '';
    // リストアイテム
    const li = document.createElement('li'); li.classList.add('result-item');
    li.innerHTML = `<div class="item-name">${prefix}${d.name}</div>` +
                   `<div class="item-vicinity">${d.vicinity}</div>` +
                   `<div class="item-distance">${item.distanceText} (${item.durationText})</div>`;
    ul.appendChild(li);

    // マーカー
    const marker = new google.maps.Marker({ position: d.geometry.location, map, title: d.name, icon: defaultIcon });
    markers.push(marker);
    marker.addListener('mouseover', () => { marker.setIcon(hoverIcon); li.classList.add('hover'); });
    marker.addListener('mouseout',  () => { marker.setIcon(defaultIcon); li.classList.remove('hover'); });
    li.addEventListener('mouseover', () => marker.setIcon(hoverIcon));
    li.addEventListener('mouseout',  () => marker.setIcon(defaultIcon));
  }
}
