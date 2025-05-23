// main.js
console.log('🟢 main.js 実行開始');

let map, autocomplete, selectedPlace;
const markers = [];
let searchMarker = null;
const STAGGER_MS = 200;

// 3) initMap をグローバルに定義（Maps API callback）
function initMap() {
  console.log('▶️ initMap called');
  map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: 35.681236, lng: 139.767125 },
    zoom: 14
  });

  // オートコンプリート初期化
  autocomplete = new google.maps.places.Autocomplete(
    document.getElementById('location-input')
  );
  autocomplete.bindTo('bounds', map);
  autocomplete.addListener('place_changed', () => {
    const p = autocomplete.getPlace();
    if (p.geometry) selectedPlace = p;
  });

  // 検索ボタンにイベントをセット
  document.getElementById('search-btn')
    .addEventListener('click', onSearch);

  // URL パラメータに place_id があれば自動検索
  const params = new URLSearchParams(window.location.search);
  if (params.has('place_id')) {
    const placeId = params.get('place_id');
    const service = new google.maps.places.PlacesService(map);
    service.getDetails(
      { placeId, fields: ['geometry', 'name', 'place_id'] },
      (detail, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          detail.geometry
        ) {
          selectedPlace = detail;
          onSearch();
        }
      }
    );
  }
}
window.initMap = initMap;

// 4) 検索ボタン押下時
async function onSearch() {
  if (!selectedPlace?.geometry) {
    alert('候補から選択してください');
    return;
  }

  // 1) URL を置き換える（履歴に残さないので replaceState）
  const params = new URLSearchParams();
  params.set('place_id', selectedPlace.place_id);
  window.history.replaceState(null, '', `?${params}`);

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
    const mapsUrl =
      'https://www.google.com/maps/search/?api=1' +
      `&query=${encodeURIComponent(d.name)}`;

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


// 共有ボタンのクリックで URL をコピー
const shareBtn = document.getElementById('share-btn');
if (shareBtn) {
  shareBtn.addEventListener('click', async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      alert('検索結果の URL をコピーしました');
    } catch (err) {
      console.error('URL のコピーに失敗しました', err);
      alert('コピーに失敗しました。手動で URL をコピーしてください。');
    }
  });
}