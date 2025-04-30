// main.js
console.log('🟢 main.js 実行開始');

let map, autocomplete, selectedPlace;
const markers = [];
let searchMarker = null;
const STAGGER_MS = 200;

// 1) Google One-Tap で認証後に呼ばれるコールバック
function handleCredentialResponse(response) {
  console.log("ID Token:", response.credential);
  // 必要に応じてバックエンドへ送って検証／セッション発行

  // UI を切り替え：サインインボタンを隠し、検索エリアを表示
  document.getElementById('google-signin-btn').classList.add('hidden');
  document.getElementById('search-area').classList.remove('hidden');
}

// 2) ページ読み込み時に GSI を初期化
window.onload = () => {
  google.accounts.id.initialize({
    client_id: "399808708717-8km5qd5gcqvbmji0a47keoij9mcivns3.apps.googleusercontent.com",
    callback: handleCredentialResponse,
  });
  google.accounts.id.renderButton(
    document.getElementById("google-signin-btn"),
    { theme: "outline", size: "large" }
  );
  // 自動ワンタイムサインインを無効化したい場合:
  // google.accounts.id.disableAutoSelect();
};

// 3) initMap をグローバルに定義（Maps API callback）
function initMap() {
  console.log('▶️ initMap called');
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 35.681236, lng: 139.767125 },
    zoom: 14
  });

  // グローバルに一度だけ設定
  const hoverInfoWindow = new google.maps.InfoWindow({
    pixelOffset: new google.maps.Size(0, -10),  // 上向きに 10px オフセット
    maxWidth: 200                               // 幅制限して余計な余白を防止
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

// 4) 検索ボタン押下時
async function onSearch() {
  if (!selectedPlace?.geometry) {
    alert('候補から選択してください');
    return;
  }

  const loc = selectedPlace.geometry.location;
  map.setCenter(loc);

  // 検索地点マーカー
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

// 5) テキスト検索のみで結果を取得・表示
async function multiKeywordSearch(loc, keywords) {
  const service = new google.maps.places.PlacesService(map);
  let allResults = [];

  // 各キーワードで textSearch
  for (const kw of keywords) {
    const req = {
      query: `${kw} restaurant`,
      location: new google.maps.LatLng(loc.lat, loc.lng),
      radius: 1500
    };
    const results = await new Promise(resolve =>
      service.textSearch(req, (ps, st) =>
        resolve(st === google.maps.places.PlacesServiceStatus.OK ? ps : [])
      )
    );
    allResults.push(...results);
  }

  // place_id で重複排除
  const seen = new Set();
  const unique = allResults.filter(p => {
    const id = p.place_id || p.placeId;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  // 距離計算とフィルタ&ソート
  const origin = new google.maps.LatLng(loc.lat, loc.lng);
  const items = unique
    .map(d => {
      const position = d.geometry.location;
      const dist = google.maps.geometry.spherical
        .computeDistanceBetween(origin, position);
      const dur = dist / 1.4;
      return {
        detail: {
          name:     d.name,
          vicinity: d.formatted_address || d.vicinity,
          geometry: d.geometry,
          place_id: d.place_id || d.placeId
        },
        distanceValue: dist,
        distanceText:  `${Math.round(dist)} m`,
        durationText:  `${Math.round(dur/60)}分`
      };
    })
    .filter(i => i.distanceValue <= 1500)
    .sort((a, b) => a.distanceValue - b.distanceValue);

  // 既存マーカーとリストをクリア
  markers.forEach(m => m.setMap(null));
  markers.length = 0;
  const ul = document.getElementById('results');
  ul.innerHTML = '';

  // InfoWindow for hover
  const hoverInfoWindow = new google.maps.InfoWindow();

  // 各件描画
  items.forEach((item, idx) => {
    const d       = item.detail;
    const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${d.place_id}`;

    // リスト項目作成
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

    // マーカー作成
    const marker = new google.maps.Marker({
      position: d.geometry.location,
      map,
      title:  d.name,
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
        scaledSize: new google.maps.Size(32, 32)
      }
    });
    markers.push(marker);

    // クリックで新タブに地図リンク
    marker.addListener('click', () => window.open(mapsUrl, '_blank', 'noopener'));
    li.addEventListener('click',  () => window.open(mapsUrl, '_blank', 'noopener'));

    // ホバーで名称ポップアップ＆リストハイライト
    marker.addListener('mouseover', () => {
      hoverInfoWindow.setContent(`<strong>${d.name}</strong>`);
      hoverInfoWindow.open(map, marker);
      li.classList.add('hover');
    });
    marker.addListener('mouseout',  () => {
      hoverInfoWindow.close();
      li.classList.remove('hover');
    });

    // リストホバーでマーカー拡大
    li.addEventListener('mouseover', () => marker.setIcon({
      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
      scaledSize: new google.maps.Size(48, 48)
    }));
    li.addEventListener('mouseout',  () => marker.setIcon({
      url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
      scaledSize: new google.maps.Size(32, 32)
    }));

    // フェードイン
    setTimeout(() => {
      li.style.transition = 'opacity 0.3s';
      li.style.opacity = '1';
    }, idx * STAGGER_MS);
  });
}
