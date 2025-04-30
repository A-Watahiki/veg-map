// index.js の先頭に追加読み込み
const { OAuth2Client } = require('google-auth-library');
const jwt            = require('jsonwebtoken');
const cookieParser   = require('cookie-parser');

const CLIENT_ID      = '399808708717-8km5qd5gcqvbmji0a47keoij9mcivns3.apps.googleusercontent.com';
const SESSION_SECRET = process.env.SESSION_SECRET;
const client         = new OAuth2Client(CLIENT_ID);


// index.js (Express サーバー直起動版、CommonJS + CORS ミドルウェア)
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');



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

// CORS のあと、JSON パーサーのあとに
app.use(cookieParser());

app.post('/auth/google', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'Missing ID token' });
  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: CLIENT_ID,
    });
    payload = ticket.getPayload();  // email, sub, name などが取れる
  } catch (e) {
    return res.status(401).json({ error: 'Invalid ID token' });
  }

  // 例：payload.sub を自社ユーザーIDとして扱う
  const googleUid = payload.sub;
  // ← ここでユーザーデータベースに登録 or 照合 を行う

  // セッショントークンを発行
  const sessionToken = jwt.sign({ uid: googleUid }, SESSION_SECRET, {
    expiresIn: '7d'
  });
  res.cookie('session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ success: true });
});



// ヘルスチェック
app.get('/', (req, res) => res.status(200).send('OK'));

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
