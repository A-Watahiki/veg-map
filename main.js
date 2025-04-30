// main.js
console.log('🟢 main.js 実行開始');

let map, autocomplete, selectedPlace;
const markers = [];
let searchMarker = null;
const STAGGER_MS = 200;

function handleCredentialResponse(response) {
  // response.credential に JWT が入る
  console.log("ID Token:", response.credential);
  // 必要に応じてバックエンドに送ってセッションを発行
}

window.onload = () => {
  google.accounts.id.initialize({
    client_id: "399808708717-8km5qd5gcqvbmji0a47keoij9mcivns3.apps.googleusercontent.com",
    callback: handleCredentialResponse,
  });
  google.accounts.id.renderButton(
    document.getElementById("google-signin-btn"),
    { theme: "outline", size: "large" }
  );
  // 自動ワンタイムサインインを無効化したいとき:
  // google.accounts.id.disableAutoSelect();
};



// 1) initMap をグローバルに定義
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
    const p = autocomplete.getPlace();
    if (p.geometry) selectedPlace = p;
  });

  document.getElementById('search-btn')
    .addEventListener('click', onSearch);
}
window.initMap = initMap;

// 2) onSearch
async function onSearch() {
  if (!selectedPlace?.geometry) {
    alert('候補から選択してください');
    return;
  }

  const loc = selectedPlace.geometry.location;
  map.setCenter(loc);

  const searchIcon = {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: '#000080',
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 2,
    scale: 8
  };

  if (searchMarker) searchMarker.setMap(null);
  searchMarker = new google.maps.Marker({
    position: loc,
    map,
    icon: searchIcon,
    title: selectedPlace.name || '検索地点'
  });

  await multiKeywordSearch(
    { lat: loc.lat(), lng: loc.lng() },
    ['vegetarian','vegan','ヴィーガン','ベジタリアン','素食','マクロビ','マクロビオティック']
  );
}

// 3) multiKeywordSearch
async function multiKeywordSearch(loc, keywords) {
  const service = new google.maps.places.PlacesService(map);
  const placeIds = new Set();

  // テキスト検索
  for (const kw of keywords) {
    const req = {
      query: `${kw} restaurant`,
      location: new google.maps.LatLng(loc.lat, loc.lng),
      radius: 1500
    };
    const results = await new Promise(r =>
      service.textSearch(req, (ps, st) =>
        r(st === google.maps.places.PlacesServiceStatus.OK ? ps : [])
      )
    );
    results.forEach(p => placeIds.add(p.place_id || p.placeId));
  }

  // 詳細取得
  const detailSvc = new google.maps.places.PlacesService(map);
  const details = (await Promise.all(
    [...placeIds].map(id =>
      new Promise(r =>
        detailSvc.getDetails(
          { placeId: id, fields: ['name','vicinity','geometry','place_id'] },
          (d, st) => r(st === google.maps.places.PlacesServiceStatus.OK ? d : null)
        )
      )
    )
  )) .filter(Boolean);

  // 距離計算
  const origin = new google.maps.LatLng(loc.lat, loc.lng);
  const items = details
    .map(d => {
      const dist = google.maps.geometry.spherical
        .computeDistanceBetween(origin, d.geometry.location);
      const dur = dist / 1.4;
      return {
        detail: d,
        distanceValue: dist,
        distanceText: `${Math.round(dist)} m`,
        durationText: `${Math.round(dur/60)}分`
      };
    })
    .filter(i => i.distanceValue <= 1500)
    .sort((a,b) => a.distanceValue - b.distanceValue);

  // 既存マーカー・リストをクリア
  markers.forEach(m => m.setMap(null));
  markers.length = 0;
  const ul = document.getElementById('results');
  ul.innerHTML = '';

  // hover 用 InfoWindow を一つだけ作成
  const hoverInfoWindow = new google.maps.InfoWindow();

  // 各アイテムを描画
  items.forEach((item, idx) => {
    const d      = item.detail;
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${d.place_id}`;

    // リスト項目
    const li = document.createElement('li');
    li.className = 'result-item';
    li.style.opacity = '0';
    li.setAttribute('data-url', mapsUrl);
    li.innerHTML = `
      <div class="item-content">
        <div class="item-name">${d.name}</div>
        <div class="item-vicinity">${d.vicinity}</div>
        <div class="item-distance">${item.distanceText} (${item.durationText})</div>
      </div>
    `;
    ul.appendChild(li);

    // マーカー
    const marker = new google.maps.Marker({
      position: d.geometry.location,
      map: map,
      title: d.name,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });
    markers.push(marker);

    // ——— 追加部分 ———
    // マーカークリックで詳細を新タブ
    marker.addListener('click', () => {
      window.open(mapsUrl, '_blank', 'noopener');
    });
    // リスト項目クリックで詳細を新タブ
    li.addEventListener('click', () => {
      window.open(li.getAttribute('data-url'), '_blank', 'noopener');
    });
    // マウスオーバーで InfoWindow 表示
    marker.addListener('mouseover', () => {
      hoverInfoWindow.setContent(`<div style="font-weight:500;">${d.name}</div>`);
      hoverInfoWindow.open(map, marker);
      li.classList.add('hover');
    });
    marker.addListener('mouseout', () => {
      hoverInfoWindow.close();
      li.classList.remove('hover');
    });
    // li のホバーでもマーカーアイコン拡大（既存）
    li.addEventListener('mouseover', () => {
      marker.setIcon({
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(48, 48)
      });
    });
    li.addEventListener('mouseout', () => {
      marker.setIcon({
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      });
    });
    // ——————————

    // ステージング表示
    setTimeout(() => {
      li.style.transition = 'opacity 0.3s';
      li.style.opacity = '1';
    }, idx * STAGGER_MS);
  });
}
