// main.js (レガシーモード + Autocomplete ＋ Geometry 版)
console.log('🟢 main.js 実行開始');

// ↓ firebase-init.js への依存を削除 ↓
// import { getBrowserApiKey, getVegetarianFlagFn, getVeganFlagFn } from './firebase-init.js';

let map;
let autocomplete;
let selectedPlace;
const BROWSER_API_KEY = window.BROWSER_API_KEY;  // HTML 側で定義済みのキーを参照
let mapsLoaded = false;
const markers = [];

// 1) initMap をグローバル登録
function initMap() {
  console.log('▶️ initMap called');
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 35.681236, lng: 139.767125 },
    zoom: 14
  });
  const input = document.getElementById('location-input');
  autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.bindTo('bounds', map);
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (place.geometry) {
      selectedPlace = place;
    }
  });
}
window.initMap = initMap;

// 2) Maps API を動的ロード
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (mapsLoaded) return resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => { mapsLoaded = true; initMap(); resolve(); };
    script.onerror = () => reject(new Error('Google Maps API の読み込みに失敗しました'));
    document.head.appendChild(script);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadGoogleMaps();
  } catch (e) {
    alert(e.message);
    return;
  }
  document.getElementById('search-btn').addEventListener('click', onSearch);
});

// 3) onSearch
async function onSearch() {
  if (!selectedPlace || !selectedPlace.geometry) {
    alert('候補から選択してください');
    return;
  }
  map.setCenter(selectedPlace.geometry.location);
  await multiKeywordSearch(
    { lat: selectedPlace.geometry.location.lat(), lng: selectedPlace.geometry.location.lng() },
    ['vegetarian','vegan','ヴィーガン','ベジタリアン','素食','マクロビ','マクロビオティック']
  );
}

// 4) multiKeywordSearch
async function multiKeywordSearch(loc, keywords) {
  const service = new google.maps.places.PlacesService(map);
  const placeIds = new Set();
  for (const keyword of keywords) {
    const queryString = `${keyword} restaurant`;
    const request = {
      query: queryString,
      location: new google.maps.LatLng(loc.lat, loc.lng),
      radius: 1500
    };
    const results = await new Promise(resolve => {
      service.textSearch(request, (places, status) => {
        if (status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST) {
          service.textSearch({ query: queryString }, (p2, s2) => {
            resolve(s2 === google.maps.places.PlacesServiceStatus.OK ? p2 : []);
          });
        } else {
          resolve(status === google.maps.places.PlacesServiceStatus.OK ? places : []);
        }
      });
    });
    console.log(`Keyword='${keyword}', results=${results.length}`);
    results.forEach(p => placeIds.add(p.place_id || p.placeId));
  }
  const rawPlaces = Array.from(placeIds).map(id => ({ place_id: id }));

  // 4-2) 詳細取得
  const detailService = new google.maps.places.PlacesService(map);
  const details = (await Promise.all(
    rawPlaces.map(p => new Promise(resolve => {
      detailService.getDetails(
        { placeId: p.place_id, fields: ['name','vicinity','geometry','place_id'] },
        (detail, status) => resolve(status === google.maps.places.PlacesServiceStatus.OK ? detail : null)
      );
    }))
  )).filter(d => d);
  console.log(`Details fetched=${details.length}`);

  // 4-3) Geometry で直線距離＆擬似所要時間計算
  const origin = new google.maps.LatLng(loc.lat, loc.lng);
  const items = details
    .map(d => {
      const dist = google.maps.geometry.spherical.computeDistanceBetween(origin, d.geometry.location);
      const walkSpeed = 1.4; // m/s
      const durationSec = dist / walkSpeed;
      return {
        detail: d,
        distanceValue: dist,
        distanceText: `${Math.round(dist)} m`,
        durationValue: durationSec,
        durationText: `${Math.round(durationSec/60)}分`
      };
    })
    .filter(item => item.distanceValue <= 1500)
    .sort((a, b) => a.distanceValue - b.distanceValue);
  console.log(`Final items=${items.length}`);

  // 4-4) 描画
  markers.forEach(m => m.setMap(null));
  markers.length = 0;
  const ul = document.getElementById('results');
  ul.innerHTML = '';
  const defaultIcon = {
    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
    scaledSize: new google.maps.Size(32, 32)
  };
  const hoverIcon = {
    url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
    scaledSize: new google.maps.Size(48, 48)
  };

  for (const item of items) {
    const d = item.detail;
    const li = document.createElement('li');
    li.classList.add('result-item');
    li.innerHTML = `
      <div class="item-name">${d.name}</div>
      <div class="item-vicinity">${d.vicinity}</div>
      <div class="item-distance">${item.distanceText} (${item.durationText})</div>
    `;
    ul.appendChild(li);

    const marker = new google.maps.Marker({
      position: d.geometry.location,
      map,
      title: d.name,
      icon: defaultIcon
    });
    markers.push(marker);
    marker.addListener('mouseover', () => {
      marker.setIcon(hoverIcon);
      li.classList.add('hover');
    });
    marker.addListener('mouseout', () => {
      marker.setIcon(defaultIcon);
      li.classList.remove('hover');
    });
    li.addEventListener('mouseover', () => marker.setIcon(hoverIcon));
    li.addEventListener('mouseout', () => marker.setIcon(defaultIcon));
  }
}
