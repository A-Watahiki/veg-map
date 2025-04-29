#!/usr/bin/env bash
set -euo pipefail

# ---- 1) .env があれば読み込む ----
if [ -f "$(dirname "$0")/../veg-map/.env" ]; then
  # export で子プロセスにも渡るように
  set -a  
  # shellcheck disable=SC1090
  source "$(dirname "$0")/../veg-map/.env"
  set +a
fi

# ---- 2) 必須環境変数チェック ----
missing=0
for v in GOOGLE_MAPS_API_KEY_SERVER GOOGLE_MAPS_API_KEY_CLIENT; do
  if [ -z "${!v-}" ]; then
    echo "Error: 環境変数 $v が定義されていません。"
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  echo "→ .env に両方のキーを記載してください（.env.sample を参照）"
  exit 1
fi

# ---- 3) プロジェクトルートへ移動 ----
cd "$(dirname "$0")/../veg-map"

PROJECT_ID="veg-map-simple"
SERVICE_NAME="veg-map-simple"
REGION="asia-northeast1"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest"

# ---- 4) Docker イメージビルド & プッシュ ----
#Cloud Run（amd64）で動く単一アーキテクチャイメージを作成
docker build --platform=linux/amd64 -t "${IMAGE}" .
docker push "${IMAGE}"

# ---- 5) Cloud Run にデプロイ ----
gcloud run deploy "${SERVICE_NAME}" \
  --project="${PROJECT_ID}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --set-env-vars=GOOGLE_MAPS_API_KEY_SERVER="${GOOGLE_MAPS_API_KEY_SERVER}",GOOGLE_MAPS_API_KEY_CLIENT="${GOOGLE_MAPS_API_KEY_CLIENT}" \
  --allow-unauthenticated
