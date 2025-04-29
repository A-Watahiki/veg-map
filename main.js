// main.js
console.log('🟢 main.js 実行開始');

let map, autocomplete, selectedPlace;
const markers = [];

// 1) initMap をグローバル登録（HTML から callback で呼ばれる）
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
  autocomplete.addListener('place_changed', () => {
    const place = autocomplete.getPlace();
    if (place.geometry) selectedPlace = place;
  });

  // 検索ボタンはここで登録
  document.getElementById('search-btn').addEventListener('click', onSearch);
}
window.initMap = initMap;

// 2) onSearch → multiKeywordSearch を呼び出す
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

// 3) multiKeywordSearch
async function multiKeywordSearch(loc, keywords) {
  const service = new google.maps.places.PlacesService(map);
  const placeIds = new Set();

  // キーワードごとに textSearch
  for (const keyword of keywords) {
    const query = `${keyword} restaurant`;
    const request = {
      query,
      location: new google.maps.LatLng(loc.lat, loc.lng),
      radius: 1500
    };
    const results = await new Promise(resolve => {
      service.textSearch(request, (places, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK) {
          resolve(places);
        } else if (status === google.maps.places.PlacesServiceStatus.INVALID_REQUEST) {
          // フォールバック: 座標制限を外して再試行
          service.textSearch({ query }, (p2, s2) => {
            resolve(s2 === google.maps.places.PlacesServiceStatus.OK ? p2 : []);
          });
        } else {
          resolve([]);
        }
      });
    });
    console.log(`Keyword='${keyword}', results=${results.length}`);
    results.forEach(p => placeIds.add(p.place_id || p.placeId));
  }

  // 詳細取得
  const detailService = new google.maps.places.PlacesService(map);
  const details = (await Promise.all(
    Array.from(placeIds).map(id => new Promise(resolve => {
      detailService.getDetails(
        { placeId: id, fields: ['name','vicinity','geometry','place_id'] },
        (detail, status) => resolve(status === google.maps.places.PlacesServiceStatus.OK ? detail : null)
      );
    }))
  )).filter(d => d);
  console.log(`Details fetched=${details.length}`);

  // 距離・所要時間計算
  const origin = new google.maps.LatLng(loc.lat, loc.lng);
  const items = details.map(d => {
    const dist = google.maps.geometry.spherical.computeDistanceBetween(origin, d.geometry.location);
    const duration = dist / 1.4; // 歩行速度 1.4 m/s
    return {
      detail: d,
      distanceValue: dist,
      distanceText: `${Math.round(dist)} m`,
      durationValue: duration,
      durationText: `${Math.round(duration/60)}分`
    };
  })
  .filter(i => i.distanceValue <= 1500)
  .sort((a,b) => a.distanceValue - b.distanceValue);
  console.log(`Final items=${items.length}`);

  // 描画
  markers.forEach(m => m.setMap(null));
  markers.length = 0;
  const ul = document.getElementById('results');
  ul.innerHTML = '';
  const defaultIcon = {
    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
    scaledSize: new google.maps.Size(32,32)
  };
  const hoverIcon = {
    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
    scaledSize: new google.maps.Size(48,48)
  };

  for (const item of items) {
    const { detail, distanceText, durationText } = item;
    const li = document.createElement('li');
    li.classList.add('result-item');
    li.innerHTML = `
      <div class="item-name">${detail.name}</div>
      <div class="item-vicinity">${detail.vicinity}</div>
      <div class="item-distance">${distanceText} (${durationText})</div>
    `;
    ul.appendChild(li);

    const marker = new google.maps.Marker({
      position: detail.geometry.location,
      map,
      title: detail.name,
      icon: defaultIcon
    });
    markers.push(marker);
    marker.addListener('mouseover', () => { marker.setIcon(hoverIcon); li.classList.add('hover'); });
    marker.addListener('mouseout',  () => { marker.setIcon(defaultIcon); li.classList.remove('hover'); });
    li.addEventListener('mouseover', () => marker.setIcon(hoverIcon));
    li.addEventListener('mouseout',  () => marker.setIcon(defaultIcon));
  }
}
