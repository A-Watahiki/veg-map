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
    if (mapsLoaded) { resolve(); return; }
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
  document.getElementById('controls').style.display   = isReady ? 'flex' : 'none';
  if (isReady) {
    try { await loadGoogleMaps(); } catch (e) { alert(e.message); }
  }
});

// 4) サインアップフォームイベント
function setupAuthEventHandlers() {
  console.log('🔧 setupAuthEventHandlers');
  const btn = document.getElementById('btn-send-link');
  if (btn) {
    btn.addEventListener('click', async () => {
      const userID = document.getElementById('signup-userid').value.trim();
      const email  = document.getElementById('signup-email').value.trim();
      const errEl  = document.getElementById('signup-error'); errEl.style.display = 'none';
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupAuthEventHandlers);
} else { setupAuthEventHandlers(); }

// 5) 検索処理
async function onSearch() {
  console.log('🖱️ onSearch');
  const place = autocomplete.getPlace();
  if (!place || !place.geometry) {
    alert('候補から選択してください'); return;
  }
  map.setCenter(place.geometry.location);
  await multiKeywordSearch({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }, [
    'vegetarian','vegan','ヴィーガン','ベジタリアン','素食','マクロビ','マクロビオティック'
  ]);
}

// 6) 詳細取得＋距離フィルタ＋ソート＋ベジ・ヴィーガンアイコン＋描画
async function multiKeywordSearch(loc, keywords) {
  console.log('🔍 multiKeywordSearch', loc, keywords);
  const service = new google.maps.places.PlacesService(map);
  const distanceService = new google.maps.DistanceMatrixService();
  try {
    const rawPlaces = await searchPlacesFn(loc, keywords);
    console.log('🔎 rawPlaces:', rawPlaces.length);

    // Details 取得
    const detailPromises = rawPlaces.map(p => new Promise(resolve => {
      service.getDetails({ placeId: p.place_id, fields: ['name','vicinity','geometry','place_id'] },
        (detail, status) => resolve(status===google.maps.places.PlacesServiceStatus.OK ? detail : null)
      );
    }));
    let details = (await Promise.all(detailPromises)).filter(d => d);
    console.log('ℹ️ details fetched:', details.length);

    // Distance Matrix & フィルタ・ソート
    const origins = [new google.maps.LatLng(loc.lat, loc.lng)];
    const destinations = details.map(d => d.geometry.location);
    const dm = await new Promise(resolve => {
      distanceService.getDistanceMatrix({ origins, destinations, travelMode:'WALKING', unitSystem: google.maps.UnitSystem.METRIC },
        (res, status) => resolve({ res, status }));
    });
    if (dm.status === google.maps.DistanceMatrixStatus.OK) {
      details = details.map((d,i) => {
        const el = dm.res.rows[0].elements[i];
        return { detail: d, distanceValue: el.distance.value, distanceText: el.distance.text, durationValue: el.duration.value, durationText: el.duration.text };
      }).filter(item => item.distanceValue <= 1500)
        .sort((a,b) => a.durationValue - b.durationValue);
    }
    console.log('✅ filtered & sorted:', details.length);

    // 描画準備
    markers.forEach(m => m.setMap(null)); markers.length = 0;
    const ul = document.getElementById('results'); ul.innerHTML = '';
    const defaultIcon = { url:'http://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new google.maps.Size(32,32) };
    const hoverIcon   = { url:'http://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new google.maps.Size(48,48) };

    for (const item of details) {
      const d = item.detail;
      // フラグ取得
      const vegFlag   = (await getVegetarianFlagFn(d.place_id)).serves_vegetarian_food;
      const veganFlag = (await getVeganFlagFn(d.place_id)).serves_vegan_food;
      // 飾り絵文字決定
      let prefix = '';
      if (veganFlag) prefix = '❤️ ';
      else if (vegFlag) prefix = '💚 ';

      // リスト描画
      const li = document.createElement('li'); li.classList.add('result-item');
      const nameDiv = document.createElement('div'); nameDiv.classList.add('item-name');
      nameDiv.textContent = prefix + d.name;
      const vicinityDiv = document.createElement('div'); vicinityDiv.classList.add('item-vicinity'); vicinityDiv.textContent = d.vicinity;
      const distanceDiv  = document.createElement('div'); distanceDiv.classList.add('item-distance'); distanceDiv.textContent = `${item.distanceText} (${item.durationText})`;
      li.append(nameDiv, vicinityDiv, distanceDiv);
      ul.appendChild(li);

      // マーカー描画
      const marker = new google.maps.Marker({ position: d.geometry.location, map, title: d.name, icon: defaultIcon });
      markers.push(marker);
      // ホバー連携
      marker.addListener('mouseover', ()=>{ marker.setIcon(hoverIcon); li.classList.add('hover'); });
      marker.addListener('mouseout',  ()=>{ marker.setIcon(defaultIcon); li.classList.remove('hover'); });
      li.addEventListener('mouseover', ()=> marker.setIcon(hoverIcon));
      li.addEventListener('mouseout',  ()=> marker.setIcon(defaultIcon));
    }
  } catch (e) {
    console.error('検索エラー:', e);
    alert('検索エラー: ' + e.message);
  }
}
