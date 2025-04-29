// index.js (Express サーバー直起動版、CommonJS + CORS ミドルウェア)
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { getFirestore } = require('firebase-admin/firestore');

// Firebase Admin 初期化
admin.initializeApp();
const vegDb = getFirestore(); // default database
const FieldValue = admin.firestore.FieldValue;

// 環境変数から API キー取得
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Express アプリ生成
const app = express();

// CORS ミドルウェア設定（全 origin 許可）
app.use(cors({
  origin: '*',
  methods: ['GET','POST','OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// JSON ボディパーサー
app.use(express.json());

// ヘルスチェック
app.get('/', (req, res) => res.status(200).send('OK'));

// vegetarianFlag エンドポイント
app.get('/vegetarianFlag', async (req, res) => {
  const placeId = req.query.place_id;
  if (!placeId) return res.status(400).json({ error: 'Missing place_id' });
  try {
    const doc = await vegDb.collection('vegetarianFlags').doc(placeId).get();
    if (doc.exists) {
      return res.json({ serves_vegetarian_food: doc.data().flag });
    }
  } catch (e) {
    console.warn(e);
  }
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'serves_vegetarian_food');
    url.searchParams.set('key', API_KEY);
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK') {
      return res.status(500).json({ error: data.status, message: data.error_message });
    }
    const flag = data.result.serves_vegetarian_food;
    if (typeof flag === 'boolean') {
      await vegDb.collection('vegetarianFlags').doc(placeId)
        .set({ flag, updated: FieldValue.serverTimestamp() });
    }
    return res.json({ serves_vegetarian_food: flag });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// veganFlag エンドポイント
app.get('/veganFlag', async (req, res) => {
  const placeId = req.query.place_id;
  if (!placeId) return res.status(400).json({ error: 'Missing place_id' });
  try {
    const doc = await vegDb.collection('veganFlags').doc(placeId).get();
    if (doc.exists) {
      return res.json({ serves_vegan_food: doc.data().flag });
    }
  } catch (e) {
    console.warn(e);
  }
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'serves_vegan_food');
    url.searchParams.set('key', API_KEY);
    const response = await fetch(url);
    const data = await response.json();
    if (data.status !== 'OK') {
      return res.status(500).json({ error: data.status, message: data.error_message });
    }
    const flag = data.result.serves_vegan_food;
    if (typeof flag === 'boolean') {
      await vegDb.collection('veganFlags').doc(placeId)
        .set({ flag, updated: FieldValue.serverTimestamp() });
    }
    return res.json({ serves_vegan_food: flag });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

// searchPlaces エンドポイント (Nearby Search)
app.post('/searchPlaces', async (req, res) => {
  const { location, keywords } = req.body;
  if (!location || !Array.isArray(keywords)) {
    return res.status(400).json({ error: 'location と keywords が必要です' });
  }
  try {
    const allResults = [];
    for (const keyword of keywords) {
      let pageToken = null;
      let pageCount = 0;
      do {
        const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
        url.searchParams.set('key', API_KEY);
        url.searchParams.set('location', `${location.lat},${location.lng}`);
        url.searchParams.set('radius', '1500');
        url.searchParams.set('type', 'restaurant');
        url.searchParams.set('keyword', keyword);
        if (pageToken) url.searchParams.set('pagetoken', pageToken);
        const response = await fetch(url);
        const json = await response.json();
        if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
          throw new Error(json.status);
        }
        allResults.push(...(json.results || []));
        pageToken = json.next_page_token;
        pageCount++;
        if (pageToken && pageCount < 3) await new Promise(r => setTimeout(r, 3000));
      } while (pageToken && pageCount < 3);
    }
    const seen = new Set();
    const merged = allResults.filter(p => {
      if (seen.has(p.place_id)) return false;
      seen.add(p.place_id);
      return true;
    });
    res.json({ places: merged });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// サーバー起動
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
