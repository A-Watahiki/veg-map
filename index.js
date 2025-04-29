// index.js
console.log('▶︎ [DEBUG] index.js loading…');

const express = require('express');
const functions = require('@google-cloud/functions-framework');
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { getFirestore } = require('firebase-admin/firestore');

console.log('▶︎ [DEBUG] modules loaded:', {
  express: !!express,
  admin: !!admin,
  fetch: !!fetch,
  getFirestore: !!getFirestore,
});

// Firebase Admin SDK 初期化
admin.initializeApp();
console.log('▶︎ [DEBUG] admin.initializeApp() done');
// マルチテナントDB "veg-map" を指定してFirestoreインスタンスを取得
const vegDb = getFirestore(undefined, { databaseId: 'veg-map' });
const FieldValue = admin.firestore.FieldValue;
const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// 共通 CORS 設定ヘルパー
function setCors(req, res, next) { // Express ミドルウェアとして使用
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next(); // 次の処理へ
}

// Express アプリケーションの作成
const app = express();
app.use(express.json()); // JSON リクエストボディの解析用
app.use(setCors);       // CORS 設定

// ヘルスチェックエンドポイント
app.get('/', (req, res) => {
  res.status(200).send('OK'); // ヘルスチェック用
});

// ルーティング設定
app.post('/verifyUsername', verifyUsername);
app.get('/vegetarianFlag', getVegetarianFlag);
app.get('/veganFlag', getVeganFlag);
app.post('/searchPlaces', searchPlaces);

// 1) verifyUsername 関数
async function verifyUsername(req, res) {
  console.log('▶︎ [DEBUG] verifyUsername handler invoked');
  const { username } = req.body;
  if (!username) return res.status(400).json({ error: 'username が必要です' });
  try {
    const qsnap = await vegDb
      .collection('allowedUsers')
      .where('userID', '==', Number(username))
      .limit(1)
      .get();
    return res.json({ ok: !qsnap.empty });
  } catch (e) {
    console.error('verifyUsername error:', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}

// 2) getVegetarianFlag 関数
async function getVegetarianFlag(req, res) {
  console.log('▶︎ [DEBUG] getVegetarianFlag handler invoked');
  const placeId = req.query.place_id;
  if (!placeId) return res.status(400).json({ error: 'Missing place_id' });
  // キャッシュ取得
  try {
    const doc = await vegDb.collection('vegetarianFlags').doc(placeId).get();
    if (doc.exists) {
      console.log('▶︎ [DEBUG] Cache hit for placeId:', placeId);
      return res.json({ serves_vegetarian_food: doc.data().flag });
    }
  } catch (e) {
    console.warn('Firestore read failed getVegetarianFlag:', e);
  }
  // 外部API呼び出し
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'serves_vegetarian_food');
    url.searchParams.set('key', API_KEY);
    const r = await fetch(url);
    const data = await r.json();
    if (data.status !== 'OK') {
      console.error('Places API error:', data);
      return res.status(500).json({ error: data.status, message: data.error_message });
    }
    const flag = data.result.serves_vegetarian_food;
    if (typeof flag === 'boolean') {
      try {
        await vegDb.collection('vegetarianFlags').doc(placeId)
          .set({ flag, updated: FieldValue.serverTimestamp() });
        console.log('▶︎ [DEBUG] Firestore cache updated for placeId:', placeId, 'flag:', flag);
      } catch (e) {
        console.error('Firestore write error:', e);
        // キャッシュ書き込みに失敗しても、API の結果は返す
      }
    }
    res.json({ serves_vegetarian_food: flag });
  } catch (e) {
    console.error('getVegetarianFlag internal error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
}

// 3) getVeganFlag 関数
async function getVeganFlag(req, res) {
  console.log('▶︎ [DEBUG] getVeganFlag handler invoked');
  const placeId = req.query.place_id;
  if (!placeId) return res.status(400).json({ error: 'Missing place_id' });
  try {
    const doc = await vegDb.collection('veganFlags').doc(placeId).get();
    if (doc.exists) {
      console.log('▶︎ [DEBUG] Cache hit for placeId:', placeId);
      return res.json({ serves_vegan_food: doc.data().flag });
    }
  } catch (e) {
    console.warn('Firestore read failed getVeganFlag:', e);
  }
  try {
    const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    url.searchParams.set('place_id', placeId);
    url.searchParams.set('fields', 'serves_vegan_food');
    url.searchParams.set('key', API_KEY);
    const r = await fetch(url);
    const data = await r.json();
    if (data.status !== 'OK') {
      console.error('Places API error:', data);
      return res.status(500).json({ error: data.status, message: data.error_message });
    }
    const flag = data.result.serves_vegan_food;
    if (typeof flag === 'boolean') {
      try {
        await vegDb.collection('veganFlags').doc(placeId)
          .set({ flag, updated: FieldValue.serverTimestamp() });
        console.log('▶︎ [DEBUG] Firestore cache updated for placeId:', placeId, 'flag:', flag);
      } catch (e) {
        console.error('Firestore write error:', e);
        // キャッシュ書き込みに失敗しても、API の結果は返す
      }
    }
    res.json({ serves_vegan_food: flag });
  } catch (e) {
    console.error('getVeganFlag internal error:', e);
    res.status(500).json({ error: 'Internal error' });
  }
}

// 4) searchPlaces — 改良版：ページネーション最大3ページ
async function searchPlaces(req, res) {
  console.log('▶︎ [DEBUG] searchPlaces invoked');
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'トークンがありません' });
  try {
    await admin.auth().verifyIdToken(match[1]);
  } catch (e) {
    console.error('Authentication error:', e);
    return res.status(401).json({ error: '認証に失敗しました' });
  }
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
        pageCount++;
        const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
        url.searchParams.set('key', API_KEY);
        url.searchParams.set('location', `${location.lat},${location.lng}`);
        url.searchParams.set('radius', '1500');
        url.searchParams.set('type', 'restaurant');
        url.searchParams.set('keyword', keyword);
        if (pageToken) url.searchParams.set('pagetoken', pageToken);
        const response = await fetch(url);
        const json = await response.json();
        if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') throw new Error(json.status);
        allResults.push(...(json.results || []));
        pageToken = json.next_page_token;
        if (pageToken && pageCount < 3) await new Promise(r => setTimeout(r, 3000));
      } while (pageToken && pageCount < 3);
    }
    const seen = new Set();
    const merged = allResults.filter(p => {
      if (seen.has(p.place_id)) return false;
      seen.add(p.place_id);
      return true;
    });
    return res.json({ places: merged });
  } catch (e) {
    console.error('searchPlaces error:', e);
    return res.status(500).json({ error: e.message });
  }
}

// Express アプリを Cloud Run のハンドラーとして登録
functions.http('app', app);
