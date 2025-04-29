// main.js
console.log('🟢 main.js 実行開始');

let map, autocomplete, selectedPlace;
const markers = [];
const STAGGER_MS = 200;

// 1) initMap（HTML の callback=initMap で呼ばれる）
export function initMap() {
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

  document.getElementById('search-btn')
    .addEventListener('click', onSearch);
}
window.initMap = initMap;

// 2) onSearch → multiKeywordSearch 呼び出し
async function onSearch() {
  if (!selectedPlace?.geometry) {
    alert('候補から選択してください');
    return;
  }
  map.setCenter(selectedPlace.geometry.location);
  await multiKeywordSearch(
    {
      lat: selectedPlace.geometry.location.lat(),
      lng: selectedPlace.geometry.location.lng()
    },
    ['vegetarian','vegan','ヴィーガン','ベジタリアン','素食','マクロビ','マクロビオティック']
  );
}

// 3) multiKeywordSearch 本体
async function multiKeywordSearch(loc, keywords) {
  const service = new google.maps.places.PlacesService(map);
  const placeIds = new Set();

  // 3-1. テキスト検索
  for (const kw of keywords) {
    const req = {
      query: `${kw} restaurant`,
      location: new google.maps.LatLng(loc.lat, loc.lng),
      radius: 1500
    };
    const results = await new Promise(resolve =>
      service.textSearch(req, (places, status) =>
        resolve(status === google.maps.places.PlacesServiceStatus.OK ? places : [])
      )
    );
    console.log(`Keyword='${kw}', results=${results.length}`);
    results.forEach(p => placeIds.add(p.place_id || p.placeId));
  }

  // 3-2. 詳細取得
  const detailSvc = new google.maps.places.PlacesService(map);
  const details = (await Promise.all(
    [...placeIds].map(id =>
      new Promise(resolve =>
        detailSvc.getDetails(
          { placeId: id, fields: ['name','vicinity','geometry','place_id'] },
          (d, st) => resolve(st === google.maps.places.PlacesServiceStatus.OK ? d : null)
        )
      )
    )
  )).filter(d => d);
  console.log(`Details fetched=${details.length}`);

  // 3-3. Geometry で距離＆時間計算
  const origin = new google.maps.LatLng(loc.lat, loc.lng);
  const items = details
    .map(d => {
      const dist = google.maps.geometry.spherical
        .computeDistanceBetween(origin, d.geometry.location);
      const duration = dist / 1.4; // m ÷ 歩速1.4m/s
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

  // 3-4. ステージング描画
  markers.forEach(m => m.setMap(null));
  markers.length = 0;
  const ul = document.getElementById('results');
  ul.innerHTML = '';

  const defaultIcon = {
    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
    scaledSize: new google.maps.Size(32, 32)
  };
  const hoverIcon = {
    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
    scaledSize: new google.maps.Size(48, 48)
  };

  items.forEach((item, idx) => {
    const d = item.detail;
    // li要素作成
    const li = document.createElement('li');
    li.className = 'result-item';
    li.style.opacity = '0';

    // Google Maps リンク生成
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${d.place_id}`;
    // li の中身を <a> でくるむ
    li.innerHTML = `
      <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" class="result-link">
        <div class="item-name">${d.name}</div>
        <div class="item-vicinity">${d.vicinity}</div>
        <div class="item-distance">${item.distanceText} (${item.durationText})</div>
      </a>
    `;
    ul.appendChild(li);

    // marker
    const marker = new google.maps.Marker({
      position: d.geometry.location,
      title: d.name,
      icon: defaultIcon
    });
    markers.push(marker);
 
    // ホバー時にリスト項目にも .hover を付け外し
    marker.addListener('mouseover', () => {
      marker.setIcon(hoverIcon);
      li.classList.add('hover');
    });
    marker.addListener('mouseout', () => {
      marker.setIcon(defaultIcon);
      li.classList.remove('hover');
    });
    // リストにホバーしてもマーカーアイコンが変わる
    li.addEventListener('mouseover', () => {
      marker.setIcon(hoverIcon);
      li.classList.add('hover');
    });
    li.addEventListener('mouseout', () => {
      marker.setIcon(defaultIcon);
      li.classList.remove('hover');
    });

    // 遅延して表示
    setTimeout(() => {
      marker.setMap(map);
      li.style.transition = 'opacity 0.3s';
      li.style.opacity = '1';
    }, idx * STAGGER_MS);
  });
}
