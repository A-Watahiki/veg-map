# deploy.sh

# ——— デプロイしたい関数名をここに列挙 ———
FUNCTIONS=(verifyUsername getVegetarianFlag getVeganFlag searchPlaces)

# ——— 共通フラグをまとめておく ———
COMMON_FLAGS=(
  --gen2
  --region=asia-northeast1
  --runtime=nodejs20
  --trigger-http
  --allow-unauthenticated
  --quiet
)

for FN in "${FUNCTIONS[@]}"; do
  echo "👉 Deploying $FN"
  gcloud functions deploy "$FN" "${COMMON_FLAGS[@]}" --entry-point="app"  # エントリポイントを "app" に変更
done