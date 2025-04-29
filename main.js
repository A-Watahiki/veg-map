// main.js (レガシーモード + Autocomplete に戻し)
console.log('🟢 main.js 実行開始');

import { getBrowserApiKey, getVegetarianFlagFn, getVeganFlagFn } from './firebase-init.js';

let map;
let autocomplete;
let selectedPlace;
const BROWSER_API_KEY = getBrowserApiKey();
let mapsLoaded = false;
const markers = [];

// 1) initMap をグローバル登録
function initMap() {
  console.log('▶️ initMap called');
  // Google Maps オブジェクト生成
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 35.681236, lng: 139.767125 },
    zoom: 14
  });
  // 従来の Autocomplete を使用
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

// 4) multiKeywordSearch (Text Search → 詳細取得 → 距離計算 → 描画)
async function multiKeywordSearch(loc, keywords) {
  // 4-1) Text Search via PlacesService
  const service = new google.maps.places.PlacesService(map);
  const placeIds = new Set();
  for (const keyword of keywords) {
    const request = {
      query: keyword,
      location: new google.maps.LatLng(loc.lat, loc.lng),
      radius: 1500,
      type: 'restaurant'
    };
    const results = await new Promise(resolve => {
      service.textSearch(request, (places, status) => {
        resolve(status === google.maps.places.PlacesServiceStatus.OK ? places : []);
      });
    });
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

  // 4-3) Distance Matrix + フィルタ＆ソート
  const distanceService = new google.maps.DistanceMatrixService();
  const origins = [new google.maps.LatLng(loc.lat, loc.lng)];
  const destinations = details.map(d => d.geometry.location);
  const dm = await new Promise(resolve => {
    distanceService.getDistanceMatrix(
      { origins, destinations, travelMode: 'WALKING', unitSystem: google.maps.UnitSystem.METRIC },
      (res, status) => resolve({ res, status })
    );
  });
  let items = [];
  if (dm.status === google.maps.DistanceMatrixStatus.OK) {
    items = details.map((d, i) => {
      const el = dm.res.rows[0].elements[i];
      return { detail: d, distanceValue: el.distance.value, distanceText: el.distance.text, durationValue: el.duration.value, durationText: el.duration.text };
    }).filter(item => item.distanceValue <= 1500)
      .sort((a, b) => a.durationValue - b.durationValue);
  }

  // 4-4) 描画
  markers.forEach(m => m.setMap(null)); markers.length = 0;
  const ul = document.getElementById('results'); ul.innerHTML = '';
  const defaultIcon = { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new google.maps.Size(32, 32) };
  const hoverIcon   = { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new google.maps.Size(48, 48) };

  for (const item of items) {
    const d = item.detail;
    let vegFlag = false, veganFlag = false;
    try { vegFlag   = (await getVegetarianFlagFn(d.place_id)).serves_vegetarian_food; } catch (e) { console.warn(e); }
    try { veganFlag = (await getVeganFlagFn(d.place_id)).serves_vegan_food;       } catch (e) { console.warn(e); }
    const prefix = veganFlag ? '❤️ ' : vegFlag ? '💚 ' : '';

    const li = document.createElement('li'); li.classList.add('result-item');
    li.innerHTML = `
      <div class="item-name">${prefix}${d.name}</div>
      <div class="item-vicinity">${d.vicinity}</div>
      <div class="item-distance">${item.distanceText} (${item.durationText})</div>
    `;
    ul.appendChild(li);

    const marker = new google.maps.Marker({ position: d.geometry.location, map, title: d.name, icon: defaultIcon });
    markers.push(marker);
    marker.addListener('mouseover', () => { marker.setIcon(hoverIcon); li.classList.add('hover'); });
    marker.addListener('mouseout',  () => { marker.setIcon(defaultIcon); li.classList.remove('hover'); });
    li.addEventListener('mouseover', () => marker.setIcon(hoverIcon));
    li.addEventListener('mouseout',  () => marker.setIcon(defaultIcon));
  }
}

// 必要な API:
// - Maps JavaScript API（libraries=places,geometry）
// - サーバー側: Places API（Web Service）
