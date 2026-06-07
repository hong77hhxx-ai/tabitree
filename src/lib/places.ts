// ============================================================
// Google Places API (New) を使ったスポット検索 / POI詳細取得
//
// ※ Google Cloud 側で「Places API (New)」の有効化が別途必要です。
//   APIキーは既存の NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を流用します。
//   placesLibrary は useMapsLibrary('places') でロードします。
// ============================================================

export type PlaceCategory = 'Eat' | 'Stay' | 'Sightseeing' | 'Onsen'

export type PlaceResult = {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  category: PlaceCategory
}

// Google の place types を本アプリのカテゴリに対応づける
export function placeTypeToCategory(types: string[] = []): PlaceCategory {
  const t = new Set(types.map(x => x.toLowerCase()))
  const has = (...keys: string[]) => keys.some(k => t.has(k))
  if (has('lodging', 'hotel', 'resort_hotel', 'guest_house', 'motel')) return 'Stay'
  if (has('spa') || [...t].some(x => x.includes('onsen') || x.includes('hot_spring') || x.includes('public_bath'))) return 'Onsen'
  if (has('restaurant', 'cafe', 'food', 'bakery', 'bar', 'meal_takeaway', 'meal_delivery', 'fast_food_restaurant', 'coffee_shop')) return 'Eat'
  if (has('tourist_attraction', 'museum', 'park', 'art_gallery', 'aquarium', 'zoo', 'amusement_park', 'place_of_worship', 'hindu_temple', 'church', 'mosque', 'national_park')) return 'Sightseeing'
  return 'Sightseeing'
}

const FIELDS = ['displayName', 'location', 'formattedAddress', 'types']

// テキスト検索（例: 「ラーメン 渋谷」）
export async function searchPlaces(
  query: string,
  placesLib: google.maps.PlacesLibrary,
  locationBias?: google.maps.LatLngBounds | google.maps.LatLng | null,
): Promise<PlaceResult[]> {
  const { places } = await placesLib.Place.searchByText({
    textQuery: query,
    fields: FIELDS,
    maxResultCount: 15,
    language: 'ja',
    region: 'jp',
    ...(locationBias ? { locationBias } : {}),
  })

  return (places ?? [])
    .map(p => {
      const loc = p.location
      return {
        id: p.id ?? '',
        name: p.displayName ?? '名称不明',
        address: p.formattedAddress ?? '',
        lat: loc?.lat() ?? 0,
        lng: loc?.lng() ?? 0,
        category: placeTypeToCategory(p.types ?? []),
      }
    })
    .filter(r => r.lat !== 0 || r.lng !== 0)
}

// placeId から詳細を取得（地図上のPOIをタップしたとき用）
export async function getPlaceById(
  placeId: string,
  placesLib: google.maps.PlacesLibrary,
): Promise<PlaceResult | null> {
  const place = new placesLib.Place({ id: placeId })
  await place.fetchFields({ fields: FIELDS })
  const loc = place.location
  if (!loc) return null
  return {
    id: place.id ?? placeId,
    name: place.displayName ?? '名称不明',
    address: place.formattedAddress ?? '',
    lat: loc.lat(),
    lng: loc.lng(),
    category: placeTypeToCategory(place.types ?? []),
  }
}
