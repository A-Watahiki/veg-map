// main.js (レガシーモード + Autocomplete ＋ Geometry 版 with staggered display)
console.log('🟢 main.js 実行開始');

let map;
let autocomplete;
let selectedPlace;
const BROWSER_API_KEY = '<<<←ここはテンプレートで埋め込まれます>>>';
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
  document.getElementById('search-btn').addEventListener('click', onSearch);
}
window.initMap = initMap;

// 2) Maps API を動的ロード
function loadGoogleMaps() {
  return new Promise((resolve, reject) => {
    if (mapsLoaded) return resolve();
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${BROWSER_API_KEY}&libraries=places,geometry&callback=initMap`;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error('Google Maps API の読み込みに失敗しました'));
    document.head.appendChild(script);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadGoogleMaps();
  } catch (e) {
    alert(e.message);
  }
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

// 4) multiKeywordSearch + staggered display
async function multiKeywordSearch(loc, keywords) {
  // ...（TextSearch / Details / Geometry 計算は従来通り）...
  // 最終的に distance/value でフィルタ＆ソートした items が得られた前提で ↓
  
  // 4-4) staggered 描画
  // 先にクリア
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

  const STAGGER_MS = 100;
  items.forEach((item, idx) => {
    const d = item.detail;
    // li を準備
    const li = document.createElement('li');
    li.classList.add('result-item');
    li.style.opacity = '0';
    li.innerHTML = `
      <div class="item-name">${d.name}</div>
      <div class="item-vicinity">${d.vicinity}</div>
      <div class="item-distance">${item.distanceText} (${item.durationText})</div>
    `;
    ul.appendChild(li);

    // マーカーを準備（map はまだセットしない）
    const marker = new google.maps.Marker({
      position: d.geometry.location,
      title: d.name,
      icon: defaultIcon
    });
    markers.push(marker);

    // つながるハイライト
    marker.addListener('mouseover', () => { marker.setIcon(hoverIcon); li.classList.add('hover'); });
    marker.addListener('mouseout',  () => { marker.setIcon(defaultIcon); li.classList.remove('hover'); });
    li.addEventListener('mouseover', () => marker.setIcon(hoverIcon));
    li.addEventListener('mouseout',  () => marker.setIcon(defaultIcon));

    // ステージング表示
    setTimeout(() => {
      marker.setMap(map);
      li.style.transition = 'opacity 0.3s ease-in';
      li.style.opacity = '1';
    }, idx * STAGGER_MS);
  });
}
