// CORS と Functions Framework を読み込む
import functions from '@google-cloud/functions-framework';
import fetch from 'node-fetch';

// HTTP トリガー関数を定義
functions.http('getVegetarianFlag', async (req, res) => {
  // 1) CORS 対応
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }

  // 2) place_id をクエリから取得
  const placeId = req.query.place_id;
  if (!placeId) {
    return res.status(400).json({ error: 'Missing place_id' });
  }

  // 3) REST API 呼び出し（中継）
  const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  const url = new URL(
    'https://maps.googleapis.com/maps/api/place/details/json'
  );
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', 'serves_vegetarian_food');
  url.searchParams.set('key', API_KEY);

  try {
    const r = await fetch(url);
    const data = await r.json();
    if (data.status !== 'OK') {
      return res.status(500).json({
        error: data.status,
        message: data.error_message || 'Places API error'
      });
    }
    // 4) 必要な値だけ返す
    return res.json({
      serves_vegetarian_food: data.result.serves_vegetarian_food
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal error' });
  }
});
