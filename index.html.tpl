<!DOCTYPE html>
<html lang="ja">
<head>
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src
      'self' 'unsafe-inline' 'unsafe-eval'
      https://maps.googleapis.com
      https://maps.gstatic.com
      https://www.gstatic.com;
    connect-src
      'self'
      https://veg-map-simple-*.run.app
      https://maps.googleapis.com
      https://maps.gstatic.com;
    img-src
      'self'
      data:
      https://maps.googleapis.com
      https://maps.gstatic.com
      https://maps.google.com
      https://www.google.com;
    style-src
      'self' 'unsafe-inline'
      https://fonts.googleapis.com
      https://maps.gstatic.com;
    font-src
      'self' data:
      https://fonts.gstatic.com;
    frame-src
      'self'
      https://apis.google.com;
  ">
  <meta charset="utf-8" />
  <title>目的地近辺のベジタリアン料理のお店</title>
  <style>
    body { font-family: sans-serif; margin: 0; padding: 1rem; }
    #map {
      position: sticky; top: 0; z-index: 1000;
      width: 100%; height: 400px; margin-bottom: 1rem;
    }
    #controls {
      display: flex; justify-content: center; margin: 1rem 0;
    }
    #location-input {
      width: 80%; max-width: 600px; font-size: 1.2rem;
      padding: 0.8rem 1rem; border: 2px solid #23408C;
      border-radius: 8px 0 0 8px; background: #f3f3f9; color: #333;
    }
    #search-btn {
      font-size: 1.2rem; padding: 0.8rem 1.2rem;
      border: 2px solid #23408C; border-left: none;
      border-radius: 0 8px 8px 0; background: #23408C; color: #fff;
      cursor: pointer;
    }
    #search-btn:hover, #location-input:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    #location-input:focus {
      outline: none;
      border-color: #77B8D1;
      box-shadow: 0 0 0 3px rgba(119,184,209,0.3);
    }
    .note {
      font-size: 0.875rem; color: #666; margin: 0 0 1rem; line-height: 1.4;
    }
    #results { list-style: none; margin: 0; padding: 0; }
    .result-item {
      display: grid; grid-template-columns: 2fr 3fr 2fr;
      align-items: center; padding: 0.5rem 1rem; margin: 0 10pt;
      border-bottom: 1px solid #e0e0e0; cursor: pointer; gap: 0.5rem;
      transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
    }
    .result-item .item-name { font-weight: 500; color: #2a4f9c; }
    .result-item .item-vicinity,
    .result-item .item-distance { font-size: 0.875rem; color: #444; }
    .result-item .item-distance { text-align: right; white-space: nowrap; }
    .result-item:hover, .result-item.hover {
      background: #f0f8ff; transform: translateY(-2px);
      box-shadow: 0 6px 12px rgba(0,0,0,0.12);
    }
  </style>
</head>
<body>
  <h2>目的地近辺のベジタリアン料理のお店</h2>

  <div id="controls">
    <input id="location-input" type="text" placeholder="目的地を入力してください" />
    <button id="search-btn">検索</button>
  </div>

  <p class="note">
    ※ 「❗️」はビジネスプロフィールに「ベジタリアン料理がある」とは記載のないお店です。
  </p>

  <div id="map"></div>
  <ul id="results"></ul>

  <!-- Google Maps JS API をコールバック付きで１回だけ読み込む -->
  <script
    src="https://maps.googleapis.com/maps/api/js?key=$GOOGLE_MAPS_API_KEY_CLIENT&libraries=places,geometry&callback=initMap"
    async
    defer>
  </script>

  <!-- アプリ本体 -->
  <script type="module" src="./main.js"></script>
</body>
</html>
