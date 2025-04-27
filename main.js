// main.js
import { auth, db } from './firebase-init.js';

// Auth functions from CDN build
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Firestore functions from CDN build
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

let map, service, autocomplete, distanceService, originLocation;

// ──────────────
// 1) Google Maps 初期化
// ──────────────
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 35.681236, lng: 139.767125 },
    zoom: 14
  });
  service = new google.maps.places.PlacesService(map);
  distanceService = new google.maps.DistanceMatrixService();
  autocomplete = new google.maps.places.Autocomplete(
    document.getElementById("location-input")
  );
  autocomplete.bindTo("bounds", map);

  document.getElementById("search-btn")
    .addEventListener("click", async () => {
      const place = autocomplete.getPlace();
      if (!place?.geometry) {
        alert("候補から場所を選択してください");
        return;
      }
      originLocation = place.geometry.location;
      map.setCenter(originLocation);
      map.setZoom(15);
      await multiKeywordSearch(originLocation, [
        'vegetarian','vegan',
        'ヴィーガン','ベジタリアン',
        '素食','マクロビ','マクロビオティック'
      ]);
    });
}

// Google Maps API が呼ぶコールバックとして公開
window.initMap = initMap;

// ──────────────
// 2) 検索ロジック
// ──────────────
async function multiKeywordSearch(location, keywords) {
  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(
    'https://asia-northeast1-blissful-shore-458002-e9.cloudfunctions.net/searchPlaces',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        location: { lat: location.lat(), lng: location.lng() },
        keywords
      })
    }
  );
  if (res.status === 401) {
    alert('検索するにはログインが必要です');
    return;
  }
  if (!res.ok) {
    console.error('検索エラー:', await res.text());
    return;
  }
  const { places } = await res.json();
  drawResults(places);
}

// …（fetchVegetarianFlag, drawResults のコードは省略）…

// ──────────────
// 3) 認証＆UI 切り替え
// ──────────────
document.addEventListener('DOMContentLoaded', () => {
  // メール登録フォームを開く
  document.getElementById('btn-email-show').addEventListener('click', () => {
    document.getElementById('signup-methods').style.display = 'none';
    document.getElementById('signup-form').style.display   = 'block';
  });

  // 新規登録
  document.getElementById('btn-email-signup').addEventListener('click', async () => {
    const email = document.getElementById('signup-email').value;
    const pwd   = document.getElementById('signup-password').value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pwd);
      await sendEmailVerification(cred.user);
      alert('登録完了! 確認メールを送信しました。');
    } catch (e) {
      alert('登録エラー: ' + e.message);
    }
  });

  // Google 認証
  document.getElementById('btn-google-signin').addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      alert(`${result.user.displayName}さん、ようこそ！`);
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user')
        alert('Google認証エラー: ' + e.message);
    }
  });

  // ユーザー名照合
  document.getElementById('btn-verify-username').addEventListener('click', async () => {
    const inputName = document.getElementById('username-input').value.trim();
    const errorEl   = document.getElementById('username-error');
    if (!inputName) {
      errorEl.textContent = 'ユーザー名を入力してください。';
      return errorEl.style.display = 'block';
    }
    try {
      const snap = await getDoc(doc(db, 'allowedUsers', inputName));
      console.log('照合結果:', snap.exists() ? snap.data() : 'なし');
      if (!snap.exists()) {
        errorEl.textContent = 'ユーザー名が名簿と一致しません。';
        return errorEl.style.display = 'block';
      }
      errorEl.style.display = 'none';
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        username:   inputName,
        verifiedAt: serverTimestamp()
      }, { merge: true });
      document.getElementById('username-verification').style.display = 'none';
      document.getElementById('controls').style.display              = 'flex';
    } catch (e) {
      console.error(e);
      errorEl.textContent = '通信エラーが発生しました。';
      errorEl.style.display = 'block';
    }
  });

  // ログイン実行
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const pwd   = document.getElementById('login-password').value;
    try {
      await signInWithEmailAndPassword(auth, email, pwd);
      alert('ログイン成功！');
    } catch (e) {
      alert('ログインエラー: ' + e.message);
    }
  });

  // UI切り替え
  onAuthStateChanged(auth, user => {
    document.getElementById('auth-forms').style.display            = user ? 'none' : 'block';
    document.getElementById('username-verification').style.display = user ? 'block' : 'none';
    document.getElementById('controls').style.display              = user ? 'none' : 'none';
  });
});
