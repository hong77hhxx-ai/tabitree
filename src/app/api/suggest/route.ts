import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from "@google/generative-ai"

// 2点間の距離をkmで計算（ハバーサイン公式）
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export async function POST(req: Request) {
  try {
    const { lat, lng, category, radiusKm = 30 } = await req.json()
    // BOM・非ASCII文字を除去（環境変数のエンコード問題対策）
    const apiKey = process.env.GEMINI_API_KEY?.replace(/[^\x20-\x7E]/g, '').trim()

    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    // 2026年現在の環境で利用可能な最新の軽量モデルを使用
    const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" })

    const prompt = `位置情報（緯度: ${lat}, 経度: ${lng}）とカテゴリ（${category || '一般'}）に基づいて、周辺の高評価スポットを3つ日本語で提案してください。
【重要】提案するスポットは、必ず指定された位置から半径${radiusKm}km以内に実在する場所に限定してください。${radiusKm}kmを超える場所は絶対に含めないでください。緯度・経度は実在する正確な座標を返してください。
カテゴリは、必ず以下の4つのいずれかから最も適切なものを選択してください：
- Eat (飲食店、カフェ、レストラン)
- Stay (ホテル、旅館、宿泊施設)
- Sightseeing (観光名所、公園、展望台、史跡)
- Onsen (温泉、銭湯、スパ)

結果は厳密に以下のJSON配列フォーマットで返してください。
[
  {
    "name": "正確なスポット名",
    "category": "Eat, Stay, Sightseeing, Onsen のいずれか一つを厳守",
    "reason": "グループ旅行に最適な理由を日本語で1文",
    "imageSearchTerm": "その場所を象徴する具体的な英語の検索キーワード（例: 'Tokyo Tower', 'Sushi restaurant interior'）",
    "lat": 数値,
    "lng": 数値
  }
]
マークダウン（\`\`\`jsonなど）は含めず、純粋なJSON文字列のみを返してください。`

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()

    if (!text) {
      return NextResponse.json({ error: 'Empty response from AI.' }, { status: 500 })
    }

    try {
      const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(cleanText)
      // 距離(km)を計算して付与し、30km以内のみ返す
      const suggestions = (Array.isArray(parsed) ? parsed : [])
        .map((s: any) => ({ ...s, distanceKm: haversineKm(lat, lng, s.lat, s.lng) }))
        .filter((s: any) => s.distanceKm <= radiusKm)
        .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
      return NextResponse.json({ suggestions })
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', text)
      return NextResponse.json({ error: 'AI response was not valid JSON.' }, { status: 500 })
    }

  } catch (error: any) {
    console.error('Error in /api/suggest:', error)
    return NextResponse.json({ error: error.message || 'Internal server error.' }, { status: 500 })
  }
}
