#!/usr/bin/env bash
set -euo pipefail

# 1) .env があれば読み込む
if [ -f "$(dirname "$0")/../veg-map/.env" ]; then
  set -a
  source "$(dirname "$0")/../veg-map/.env"
  set +a
fi

# 2) 必須環境変数チェック
missing=0
for v in GOOGLE_MAPS_API_KEY_SERVER SESSION_SECRET; do
  if [ -z "${!v-}" ]; then
    echo "Error: \$${v} が未設定です（.env を確認）"
    missing=1
  fi
done
[ $missing -eq 0 ] || exit 1

# 2.5) Secret Manager に自動登録 or バージョン追加
for SECRET in GOOGLE_MAPS_API_KEY_SERVER SESSION_SECRET; do
  if ! gcloud secrets describe "$SECRET" \
       --project="veg-map-simple" &>/dev/null; then
    echo "Creating secret $SECRET..."
    echo -n "${!SECRET}" | \
      gcloud secrets create "$SECRET" \
        --project="veg-map-simple" \
        --replication-policy="automatic" \
        --data-file=-
  else
    echo "Adding new version to $SECRET..."
    echo -n "${!SECRET}" | \
      gcloud secrets versions add "$SECRET" \
        --project="veg-map-simple" \
        --data-file=-
  fi
done

# 3) プロジェクトルートに移動
cd "$(dirname "$0")/../veg-map"

PROJECT_ID="veg-map-simple"
SERVICE_NAME="veg-map-simple"
REGION="asia-northeast1"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

# 5) Docker イメージビルド（amd64 指定）
docker build --platform=linux/amd64 -t "${IMAGE}" .

# 6) コンテナレジストリへプッシュ
docker push "${IMAGE}"

# 7) Cloud Run にデプロイ
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --set-env-vars=GOOGLE_MAPS_API_KEY_SERVER="${GOOGLE_MAPS_API_KEY_SERVER}" \
  --set-secrets=SESSION_SECRET=SESSION_SECRET:latest
