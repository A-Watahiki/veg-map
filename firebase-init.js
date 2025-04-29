// firebase-init.js (自動生成)
const BASE_URL = 'https://veg-map-simple-mzwngqbnea-an.a.run.app';
export const getBrowserApiKey = () => 'AIzaSyD9nZCDLaAdxlut2f4TIJScBhfsXjC57bA';
export async function getVegetarianFlagFn(placeId) {
  const res = await fetch(`${BASE_URL}/vegetarianFlag?place_id=${encodeURIComponent(placeId)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
export async function getVeganFlagFn(placeId) {
  const res = await fetch(`${BASE_URL}/veganFlag?place_id=${encodeURIComponent(placeId)}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
