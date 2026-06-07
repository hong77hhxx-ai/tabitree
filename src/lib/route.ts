import { Pin } from '@/lib/supabase'

// ============================================================
// ルート最適化（Google Directions API / waypoint最適化）
//
// ※ Google Cloud 側で「Directions API」（または Routes API）の有効化が別途必要です。
//   APIキーは既存の NEXT_PUBLIC_GOOGLE_MAPS_API_KEY を流用します。
//   DirectionsService は useMapsLibrary('routes') でロードした routesLibrary から生成します。
// ============================================================

export type TravelMode = 'WALKING' | 'DRIVING'

// ルートの色（赤）
export const ROUTE_COLOR = '#dc2626'

// Googleマップのナビ（経路案内）URLを生成する
// orderedPins: origin → 経由地 → destination の順
export function googleMapsDirUrl(
  orderedPins: { lat: number; lng: number }[],
  mode: TravelMode,
): string {
  if (orderedPins.length < 2) return ''
  const origin = orderedPins[0]
  const destination = orderedPins[orderedPins.length - 1]
  const waypoints = orderedPins.slice(1, -1)
  const params = new URLSearchParams({
    api: '1',
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: mode === 'WALKING' ? 'walking' : 'driving',
  })
  if (waypoints.length > 0) {
    params.set('waypoints', waypoints.map(p => `${p.lat},${p.lng}`).join('|'))
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`
}

export type RouteResult = {
  orderedPinIds: string[] // origin → 最適化後waypoints → destination の順
  totalDistanceM: number
  totalDurationS: number
  directions: google.maps.DirectionsResult // 地図描画用
}

type RouteSummary = Omit<RouteResult, 'directions'>

// directions を含む完全な結果はメモリにのみ保持（localStorageには複雑なため保存しない）
const routeMemory: Record<string, RouteResult> = {}

// キャッシュキー：選択ピンIDをsortして連結（順不同で同一視）
export function routeCacheKey(groupId: string, mode: TravelMode, pinIds: string[]): string {
  const ids = [...pinIds].sort().join(',')
  return `tabitree_route_${groupId}_${mode}_${ids}`
}

// メモリキャッシュ（directions込み）から取得
export function getCachedRoute(key: string): RouteResult | null {
  return routeMemory[key] ?? null
}

// localStorage に保存されたサマリ（directionsは含まない）から取得
export function getCachedSummary(key: string): RouteSummary | null {
  if (typeof window === 'undefined') return null
  try {
    const s = localStorage.getItem(key)
    return s ? (JSON.parse(s) as RouteSummary) : null
  } catch {
    return null
  }
}

// 結果を保存：メモリにフル、localStorageにはサマリのみ
export function saveRoute(key: string, result: RouteResult) {
  routeMemory[key] = result
  if (typeof window === 'undefined') return
  try {
    // NOTE: directions(DirectionsResult)はシリアライズが複雑なためlocalStorageには保存しない。
    // TODO: directionsもキャッシュしたい場合は overview_polyline 等から再構築する。
    const summary: RouteSummary = {
      orderedPinIds: result.orderedPinIds,
      totalDistanceM: result.totalDistanceM,
      totalDurationS: result.totalDurationS,
    }
    localStorage.setItem(key, JSON.stringify(summary))
  } catch {
    /* 容量超過などは無視 */
  }
}

// DirectionsService().route() を Promise でラップし、waypoint最適化で巡回順を計算
export async function computeRoute(
  originPin: Pin,
  destinationPin: Pin,
  waypointPins: Pin[],
  mode: TravelMode,
  routesLibrary: google.maps.RoutesLibrary | null,
): Promise<RouteResult> {
  if (!routesLibrary) {
    throw new Error('地図ライブラリ(routes)の読み込みが完了していません。少し待って再試行してください。')
  }

  const service = new routesLibrary.DirectionsService()

  const waypoints: google.maps.DirectionsWaypoint[] = waypointPins.map(p => ({
    location: { lat: p.lat, lng: p.lng },
    stopover: true,
  }))

  const result = await service.route({
    origin: { lat: originPin.lat, lng: originPin.lng },
    destination: { lat: destinationPin.lat, lng: destinationPin.lng },
    waypoints,
    optimizeWaypoints: true,
    travelMode: google.maps.TravelMode[mode],
  })

  const route = result.routes[0]
  if (!route) throw new Error('ルートが見つかりませんでした。ピンの位置や移動手段を確認してください。')

  // 最適化後の経由地の並び順
  const order = route.waypoint_order ?? waypointPins.map((_, i) => i)
  const orderedWaypointIds = order.map(i => waypointPins[i].id)
  const orderedPinIds = [originPin.id, ...orderedWaypointIds, destinationPin.id]

  let totalDistanceM = 0
  let totalDurationS = 0
  for (const leg of route.legs ?? []) {
    totalDistanceM += leg.distance?.value ?? 0
    totalDurationS += leg.duration?.value ?? 0
  }

  return { orderedPinIds, totalDistanceM, totalDurationS, directions: result }
}

// 保存済みルートを「決められた順番のまま」描画用に再計算する（最適化はしない）
export async function computeRouteForOrder(
  orderedPins: Pin[],
  mode: TravelMode,
  routesLibrary: google.maps.RoutesLibrary | null,
): Promise<RouteResult> {
  if (!routesLibrary) throw new Error('地図ライブラリ(routes)の読み込みが完了していません。')
  if (orderedPins.length < 2) throw new Error('ルートには2地点以上が必要です。')

  const service = new routesLibrary.DirectionsService()
  const origin = orderedPins[0]
  const destination = orderedPins[orderedPins.length - 1]
  const waypointPins = orderedPins.slice(1, -1)

  const result = await service.route({
    origin: { lat: origin.lat, lng: origin.lng },
    destination: { lat: destination.lat, lng: destination.lng },
    waypoints: waypointPins.map(p => ({ location: { lat: p.lat, lng: p.lng }, stopover: true })),
    optimizeWaypoints: false, // 保存時の順番を維持
    travelMode: google.maps.TravelMode[mode],
  })

  const route = result.routes[0]
  if (!route) throw new Error('ルートが見つかりませんでした。')

  let totalDistanceM = 0
  let totalDurationS = 0
  for (const leg of route.legs ?? []) {
    totalDistanceM += leg.distance?.value ?? 0
    totalDurationS += leg.duration?.value ?? 0
  }

  return {
    orderedPinIds: orderedPins.map(p => p.id),
    totalDistanceM,
    totalDurationS,
    directions: result,
  }
}
