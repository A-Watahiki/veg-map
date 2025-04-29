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
      https://maps.googleapis.com
      https://maps.gstatic.com
      https://asia-northeast1-blissful-shore-458002-e9.cloudfunctions.net
      https://verifyusername-ictqzxcg5a-an.a.run.app
      https://searchplaces-ictqzxcg5a-an.a.run.app
      https://veg-map-simple-mzwngqbnea-an.a.run.app;
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
      https://*.firebaseapp.com
      https://apis.google.com;
  ">
  <meta charset="utf-8" />
  <title>目的地近辺のベジタリアン料理のお店</title>
  <style>
    /* 省略：前回ご提示の CSS をここに丸ごと貼り付けてください */
  </style>
</head>

<body>
  <h2>目的地近辺のベジタリアン料理のお店</h2>

  <div id="controls">
    <input id="location-input" type="text" placeholder="目的地を入力してください" />
    <button id="search-btn">検索</button>
  </div>

  <p class="note">
    ※「❗️」マークはビジネスプロフィールに「ベジタリアン料理があるお店」の表記がないものです。
  </p>

  <div class="map-container">
    <div id="map"></div>
    <ul id="results"></ul>
  </div>

  <script
    src="https://maps.googleapis.com/maps/api/js?key=$GOOGLE_MAPS_API_KEY_CLIENT&libraries=places,geometry&callback=initMap"
    async
    defer
  ></script>
  <script type="module" src="main.js"></script>
</body>
</html>
