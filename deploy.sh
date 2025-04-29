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
for v in GOOGLE_MAPS_API_KEY_CLIENT GOOGLE_MAPS_API_KEY_SERVER; do
  if [ -z "${!v-}" ]; then
    echo "Error: \$${v} が未設定です（.env を確認）"
    missing=1
  fi
done
[ $missing -eq 0 ] || exit 1

# 3) プロジェクトルートに移動
cd "$(dirname "$0")/../veg-map"

PROJECT_ID="veg-map-simple"
SERVICE_NAME="veg-map-simple"
REGION="asia-northeast1"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

# 4) index.html をテンプレートから生成
#    index.html.tpl 内の ${GOOGLE_MAPS_API_KEY_CLIENT} を置き換える
envsubst '${GOOGLE_MAPS_API_KEY_CLIENT}' \
  < index.html.tpl \
  > index.html

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
  --set-env-vars=GOOGLE_MAPS_API_KEY_SERVER="${GOOGLE_MAPS_API_KEY_SERVER}" \
  --allow-unauthenticated
