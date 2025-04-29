// main.js (新版 Places API 版)
console.log('🟢 main.js 実行開始');

import { getBrowserApiKey, getVegetarianFlagFn, getVeganFlagFn } from './firebase-init.js';

let map, autocomplete;
const BROWSER_API_KEY = getBrowserApiKey();
let mapsLoaded = false;
const markers = [];

// 1) initMap をグローバル登録
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
}
window.initMap = initMap;

// 2) Maps API を動的ロード
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (mapsLoaded) return resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_API_KEY}&libraries=places,marker,geometry`;
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
  const place = autocomplete.getPlace();
  if (!place || !place.geometry) {
    alert('候補から選択してください');
    return;
  }
  map.setCenter(place.geometry.location);
  await multiKeywordSearch(
    { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() },
    ['vegetarian','vegan','ヴィーガン','ベジタリアン','素食','マクロビ','マクロビオティック']
  );
}

// 4) multiKeywordSearch (新版 Nearby Search + 既存詳細取得)
async function multiKeywordSearch(loc, keywords) {
  // 4-1) 新版 Places API searchNearby
  const { Place, SearchNearbyRankPreference } = await google.maps.importLibrary('places');
  const placeMap = new Map();
  for (const keyword of keywords) {
    const request = {
      fields: ['placeId'],
      locationRestriction: { center: new google.maps.LatLng(loc.lat, loc.lng), radius: 1500 },
      includedPrimaryTypes: ['restaurant'],
      keyword,
      rankPreference: SearchNearbyRankPreference.DISTANCE,
      maxResultCount: 60
    };
    // @ts-ignore
    const { places } = await Place.searchNearby(request);
    for (const p of places) {
      if (!placeMap.has(p.placeId)) {
        placeMap.set(p.placeId, { place_id: p.placeId });
      }
    }
  }
  const rawPlaces = Array.from(placeMap.values());

  // 4-2) 詳細取得（従来通り）
  const service = new google.maps.places.PlacesService(map);
  const details = (await Promise.all(
    rawPlaces.map(p => new Promise(resolve => {
      service.getDetails(
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
    })
    .filter(item => item.distanceValue <= 1500)
    .sort((a, b) => a.durationValue - b.durationValue);
  }

  // 4-4) 描画
  markers.forEach(m => m.setMap(null)); markers.length = 0;
  const ul = document.getElementById('results'); ul.innerHTML = '';
  const defaultIcon = { url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new google.maps.Size(32, 32) };
  const hoverIcon   = { url: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png', scaledSize: new google.maps.Size(48, 48) };

  for (const item of items) {
    const d = item.detail;
    // フラグ取得
    let vegFlag = false, veganFlag = false;
    try { vegFlag   = (await getVegetarianFlagFn(d.place_id)).serves_vegetarian_food; } catch (e) { console.warn(e); }
    try { veganFlag = (await getVeganFlagFn(d.place_id)).serves_vegan_food;       } catch (e) { console.warn(e); }
    const prefix = veganFlag ? '❤️ ' : vegFlag ? '💚 ' : '';

    // リスト
    const li = document.createElement('li'); li.classList.add('result-item');
    li.innerHTML = `
      <div class="item-name">${prefix}${d.name}</div>
      <div class="item-vicinity">${d.vicinity}</div>
      <div class="item-distance">${item.distanceText} (${item.durationText})</div>
    `;
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
