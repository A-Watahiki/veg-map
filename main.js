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

// 2) onSearch → multiKeywordSearch は省略…
async function onSearch() {
  if (!selectedPlace || !selectedPlace.geometry) {
    alert('候補から選択してください');
    return;
  }
  map.setCenter(selectedPlace.geometry.location);
  // …以下は既存の multiKeywordSearch 呼び出し
}
