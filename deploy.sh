
#!/bin/bash
# deploy.sh

# 0) 必要な API を有効化 (初回のみ実行)
gcloud services enable run.googleapis.com cloudbuild.googleapis.com

# 1) プロジェクトIDを取得
PROJECT_ID=$(gcloud config get-value project)

# 1.1) プロジェクト番号を取得
PROJECT_NUMBER=$(gcloud projects describe ${PROJECT_ID} --format="value(projectNumber)")

echo "[Info] Binding IAM roles to Cloud Build service account..."
# Cloud Build SA に Cloud Run 管理者権限を付与
 gcloud projects add-iam-policy-binding ${PROJECT_ID} \
   --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
   --role="roles/run.admin" --quiet
# Cloud Build SA に Storage Admin 権限を付与 (イメージプッシュ用)
 gcloud projects add-iam-policy-binding ${PROJECT_ID} \
   --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
   --role="roles/storage.admin" --quiet

echo "[Info] Using project: ${PROJECT_ID}"
PROJECT_ID=$(gcloud config get-value project)

echo "[Info] Using project: ${PROJECT_ID}"

# 2) API キーの設定
#   - サーバー用（Cloud Run）
#   - ブラウザ用（クライアント）
SERVER_API_KEY="AIzaSyBKo7dN4-nOWStskzPGRjRGPVHVZ0E9cj4"
BROWSER_API_KEY="AIzaSyD9nZCDLaAdxlut2f4TIJScBhfsXjC57bA"

echo "[Info] Deploying to Cloud Run service: veg-map-simple"

# 3) Cloud Run にデプロイ（Buildpacks でソースからビルド）
#    - Dockerfile不要で、ビルドパックを使ってアプリをビルド＆デプロイします。
echo "[Info] Deploying to Cloud Run (source deploy) service: veg-map-simple"
gcloud run deploy veg-map-simple \
  --project=veg-map-simple \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars=GOOGLE_MAPS_API_KEY=${SERVER_API_KEY} \
  --timeout=300s \
  --memory=512Mi \
  --quiet

# 4) デプロイ後のサービスURL を取得
CLOUDRUN_URL=$(gcloud run services describe veg-map-simple \
  --platform managed \
  --region asia-northeast1 \
  --format "value(status.url)")
echo "[Info] Service URL: ${CLOUDRUN_URL}"

# 5) クライアント用設定ファイルを生成 (firebase-init.js)
cat <<EOF > firebase-init.js
// firebase-init.js (自動生成)
const BASE_URL = '${CLOUDRUN_URL}';
export const getBrowserApiKey = () => '${BROWSER_API_KEY}';
export async function getVegetarianFlagFn(placeId) {
  const res = await fetch(\`\${BASE_URL}/vegetarianFlag?place_id=\${encodeURIComponent(placeId)}\`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function getVeganFlagFn(placeId) {
  const res = await fetch(\`\${BASE_URL}/veganFlag?place_id=\${encodeURIComponent(placeId)}\`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
EOF

echo "[Info] Generated firebase-init.js"

# 6) 必要に応じてクライアントのビルド／ホスティングを実行
# npm run build
# firebase deploy --only hosting
