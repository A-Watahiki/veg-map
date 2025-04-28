import { initializeApp } from 'firebase-admin/app'; // モジュール版に変更
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const firebaseConfig = { // 使われていないが、残しておく
  apiKey: 'AIzaSyDa-5ULVWt44aHOKFui6y4bn-tKCJk4xQY',
  authDomain: 'blissful-shore-458002-e9.firebaseapp.com',
  projectId: 'blissful-shore-458002-e9',
  storageBucket: 'blissful-shore-458002-e9.appspot.com',
  messagingSenderId: '570582104108',
  appId: '1:570582104108:web:87c3efeadafc22da9f3989',
  measurementId: 'G-TLC59XH1R5'
};

// Firebase アプリ初期化
const app = initializeApp(); // 引数なしで初期化

// Auth & 永続化設定 (サーバーサイドでは不要)
export const auth = getAuth(app);
// await setPersistence(auth, browserLocalPersistence);  // 削除

// Firestore (デフォルトデータベース)
export const db = getFirestore(app);

// メールリンク用設定 (サーバーサイドでは使用しない)
// const base = window.location.origin;
// const repoPath = window.location.pathname.replace(/\/index\.html$/, '');
// const actionCodeSettings = {
//   url: `${base}${repoPath}`,
//   handleCodeInApp: true
// };

// エンドポイント定義 (Cloud Functions の URL。Cloud Run では不要)
// const VERIFY_URL        = 'https://verifyusername-ictqzxcg5a-an.a.run.app/';
// const SEARCHPLACES_URL  = 'https://searchplaces-ictqzxcg5a-an.a.run.app/';
// const FLAG_URL_BASE     = 'https://asia-northeast1-blissful-shore-458002-e9.cloudfunctions.net/getVegetarianFlag';
// const VEGAN_FLAG_URL_BASE = 'https://asia-northeast1-blissful-shore-458002-e9.cloudfunctions.net/getVeganFlag';

// 1) メールリンク送信 (サーバーサイドでは使用しない)
// export async function sendSignInLink(email, userId) {
//   const { ok } = await verifyUsernameUnauthenticated(userId);
//   if (!ok) throw new Error('ユーザーIDが名簿と一致しません。');
//   window.localStorage.setItem('emailForSignIn', email);
//   return sendSignInLinkToEmail(auth, email, actionCodeSettings);
// }

// 2) メールリンクサインイン (サーバーサイドでは使用しない)
// export async function handleEmailLinkSignIn() {
//   const link = window.location.href;
//   if (isSignInWithEmailLink(auth, link)) {
//     let email = window.localStorage.getItem('emailForSignIn');
//     if (!email) email = window.prompt('メールアドレスを入力してください');
//     const result = await signInWithEmailLink(auth, email, link);
//     window.localStorage.removeItem('emailForSignIn');
//     return result.user;
//   }
//   return null;
// }

// 3) ユーザー照合（認証前）(サーバーサイドでfetchを使うのは非効率。admin sdkを使う)
export async function verifyUsernameUnauthenticated(username) {
  try {
    const qsnap = await db.collection('allowedUsers') // vegDb ではなく db を使用
      .where('userID', '==', Number(username))
      .limit(1)
      .get();
    return { ok: !qsnap.empty };
  } catch (e) {
    console.error('verifyUsernameUnauthenticated error:', e);
    return { ok: false }; // エラーの場合もfalseを返す
  }
}

// 4) 場所検索 (サーバーサイドでfetchを使うのは非効率。admin sdkを使う)
export async function searchPlacesFn(location, keywords) {
  // const idToken = await auth.currentUser.getIdToken();  //サーバーサイドではauth.currentUserは使えない
  // const res = await fetch(SEARCHPLACES_URL, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${idToken}`
  //   },
  //   body: JSON.stringify({ location, keywords })
  // });
  // if (!res.ok) throw new Error(`searchPlaces failed: ${res.status}`);
  // return (await res.json()).places;

  // ★★★  代わりにFirestoreを使って検索する実装例
  try {
    const places = [];
    // keywordsに基づいてFirestoreをクエリ (実際のデータ構造に合わせてクエリを調整してください)
    for (const keyword of keywords) {
      const snapshot = await db.collection('places')  // 例: 'places' コレクション
        .where('location', '==', location) // locationフィールドでフィルタ
        .where('keywords', 'array-contains', keyword) // keywords配列にkeywordが含まれるドキュメント
        .get();

      snapshot.forEach(doc => {
        places.push({ id: doc.id, ...doc.data() }); // ドキュメントIDとデータを取得
      });
    }
    return { places };
  } catch (error) {
    console.error("searchPlacesFn error:", error);
    throw error; // エラーをrethrowして、Express側で処理する
  }
}

// 5) ベジタリアンフラグ取得 (Cloud Runの内部で処理するので、fetchしない)
export async function getVegetarianFlagFn(placeId) {
  try {
    const doc = await db.collection('vegetarianFlags').doc(placeId).get(); //vegDb ではなく　db
    if (doc.exists) {
      return { serves_vegetarian_food: doc.data().flag };
    }
     return { serves_vegetarian_food: false }; //ドキュメントが存在しない場合
  } catch (e) {
    console.error('getVegetarianFlagFn error:', e);
    return { serves_vegetarian_food: false }; //エラーの場合
  }
}

// 6) ヴィーガンフラグ取得 (Cloud Runの内部で処理するので、fetchしない)
export async function getVeganFlagFn(placeId) {
  try {
    const doc = await db.collection('veganFlags').doc(placeId).get();  //vegDb ではなく　db
    if (doc.exists) {
      return { serves_vegan_food: doc.data().flag };
    }
    return { serves_vegan_food: false };  //ドキュメントが存在しない場合
  } catch (e) {
    console.error('getVeganFlagFn error:', e);
    return { serves_vegan_food: false };  //エラーの場合
  }
}

// 初期化完了通知 (サーバーサイドでは不要)
// window.dispatchEvent(new Event('firebaseReady'));

// デバッグ用公開 (サーバーサイドでは不要)
// window.auth = auth;
// window.db   = db;
