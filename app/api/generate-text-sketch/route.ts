import { NextRequest, NextResponse } from "next/server"

const API_URL = "https://ismaque.org/v1/images/generations"
const API_KEY = process.env.OPENAI_API_KEY!;

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  try {
    const { prompt } = await request.json()
    if (!prompt) {
      return NextResponse.json({ success: false, error: "没有收到描述" }, { status: 400 })
    }

    const fullPrompt = `${prompt.trim()}，创建一张黑白色的线稿图，就是那种涂色图，只有简洁的线条轮廓，适合儿童涂色。`

    const apiResponse = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: API_KEY,
      },
      body: JSON.stringify({
        prompt: fullPrompt,
        n: 1,
        model: "gpt-image-1",
        size: "1024x1024",
        response_format: "b64_json",
      }),
      signal: AbortSignal.timeout(120000),
    })

    const responseText = await apiResponse.text()

    if (!apiResponse.ok) {
      return NextResponse.json(
        { success: false, error: `API调用失败: ${apiResponse.status} - ${responseText}` },
        { status: apiResponse.status }
      )
    }

    let apiResult: any
    try {
      apiResult = JSON.parse(responseText)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "API响应不是有效的JSON格式", debug: { responseText } },
        { status: 500 }
      )
    }

    if (!apiResult.data?.[0]?.b64_json) {
      return NextResponse.json(
        { success: false, error: "API响应格式错误", debug: { apiResult } },
        { status: 500 }
      )
    }

    const imageData = apiResult.data[0].b64_json
    const processingTime = Date.now() - startTime

    return NextResponse.json({ success: true, image: imageData, processingTime })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
} 