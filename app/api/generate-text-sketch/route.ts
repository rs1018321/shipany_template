import { NextRequest, NextResponse } from "next/server"

const API_URL = "https://ismaque.org/v1/images/generations"
const API_KEY = "sk-kdpP7Q3MxIhSlwvQ01GWm4tY0GEsMAUdJfDpmQxWUGScjkt1"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const maxRetries = 1
  let lastError: Error | null = null
  let imageData: any

  try {
    const { prompt, size = "1024x1024" } = await request.json()
    if (!prompt) {
      return NextResponse.json({ success: false, error: "没有收到描述" }, { status: 400 })
    }

    const fullPrompt = `Simple black and white line art coloring page of ${prompt.trim()}, clean minimalist outlines, simple shapes, suitable for children to color, no shading, no details, just clear black lines on white background`
    
    console.log(`📝 文字生成请求: ${prompt}, 输出尺寸: ${size}`)
    console.log(`📝 优化后的提示词: ${fullPrompt}`)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 第 ${attempt} 次尝试调用文生图API`)

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
            size: size,
            response_format: "b64_json",
          }),
          signal: AbortSignal.timeout(240000),
        })

        console.log(`📡 API响应状态: ${apiResponse.status} ${apiResponse.statusText}`)

        const responseText = await apiResponse.text()
        console.log("📄 API原始响应文本长度:", responseText.length)

        if (!apiResponse.ok) {
          console.error("❌ API调用失败:", {
            status: apiResponse.status,
            statusText: apiResponse.statusText,
            responseText: responseText.substring(0, 500), // 只记录前500字符
          })

          if (responseText.includes("FUNCTION_INVOCATION_TIMEOUT")) {
            return NextResponse.json(
              {
                success: false,
                error: "API处理超时，请稍后重试或简化描述",
                debug: {
                  status: apiResponse.status,
                  statusText: apiResponse.statusText,
                  errorType: "TIMEOUT",
                  suggestion: "尝试简化描述或稍后重试",
                  apiUrl: API_URL,
                  timestamp: new Date().toISOString(),
                },
              },
              { status: 408 },
            )
          }

          return NextResponse.json(
            {
              success: false,
              error: `API调用失败: ${apiResponse.status} - ${responseText}`,
              debug: {
                status: apiResponse.status,
                statusText: apiResponse.statusText,
                apiUrl: API_URL,
                timestamp: new Date().toISOString(),
              },
            },
            { status: apiResponse.status },
          )
        }

        let apiResult: any
        try {
          apiResult = JSON.parse(responseText)
          console.log("📦 API响应数据结构:", {
            hasData: !!apiResult.data,
            dataLength: apiResult.data?.length || 0,
            keys: Object.keys(apiResult),
          })
        } catch (parseError) {
          console.error("❌ JSON解析失败:", parseError)
          return NextResponse.json(
            {
              success: false,
              error: "API响应不是有效的JSON格式",
              debug: {
                parseError: parseError instanceof Error ? parseError.message : String(parseError),
                responseText: responseText.substring(0, 500),
                apiUrl: API_URL,
                timestamp: new Date().toISOString(),
              },
            },
            { status: 500 },
          )
        }

        if (!apiResult.data?.[0]?.b64_json) {
          console.error("❌ API响应格式错误:", apiResult)
          return NextResponse.json(
            {
              success: false,
              error: "API响应格式错误",
              debug: {
                apiResult,
                expectedFormat: "data数组包含b64_json格式的图片",
              },
            },
            { status: 500 },
          )
        }

        imageData = apiResult.data[0].b64_json
        // 如果成功，跳出重试循环
        break
      } catch (error) {
        lastError = error as Error
        console.error(`❌ 第 ${attempt} 次尝试失败:`, error)

        if (attempt < maxRetries) {
          const delay = attempt * 5000 // 5秒, 10秒
          console.log(`⏳ 等待 ${delay}ms 后重试...`)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }

    if (lastError) {
      throw lastError
    }

    const processingTime = Date.now() - startTime
    console.log(`✅ 文字生成成功，耗时: ${processingTime}ms`)

    return NextResponse.json({ 
      success: true, 
      image: imageData, 
      processingTime,
      debug: {
        promptLength: prompt.length,
        apiResponseTime: processingTime,
        imageGenerated: true,
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error("❌ 文字生成最终失败:", message)
    
    let errorMessage = "生成失败，请重试"
    if (message.includes("timeout") || message.includes("TIMEOUT")) {
      errorMessage = "请求超时，请稍后重试或简化描述"
    } else if (message.includes("fetch")) {
      errorMessage = "网络连接问题，请检查网络后重试"
    }
    
    return NextResponse.json({ 
      success: false, 
      error: errorMessage,
      debug: {
        originalError: message,
        timestamp: new Date().toISOString(),
      }
    }, { status: 500 })
  }
} 