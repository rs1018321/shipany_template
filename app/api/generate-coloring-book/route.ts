import { type NextRequest, NextResponse } from "next/server"

const API_URL = "https://ismaque.org/v1/images/edits"
const API_KEY = "sk-kdpP7Q3MxIhSlwvQ01GWm4tY0GEsMAUdJfDpmQxWUGScjkt1"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const maxRetries = 2
  let lastError: Error | null = null
  let imageData: any // Declare imageData here
  let imageFile!: File // 用于存储上传的原始文件

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 第 ${attempt} 次尝试调用API`)

      console.log("🚀 开始处理图片生成请求")

      // 获取表单数据
      const formData = await request.formData()
      const image = formData.get("image") as File
      imageFile = image
      if (!imageFile) {
        console.error("❌ 没有收到图片文件")
        return NextResponse.json({ success: false, error: "没有收到图片文件" }, { status: 400 })
      }

      console.log(`📁 收到图片文件: ${image.name}, 大小: ${image.size} bytes`)

      // 创建新的FormData发送给API
      const apiFormData = new FormData()
      apiFormData.append("image", imageFile)
      apiFormData.append("prompt", "转换为黑白线稿涂色图，简洁的线条，适合儿童涂色")
      apiFormData.append("model", "gpt-image-1")
      apiFormData.append("n", "1")
      apiFormData.append("quality", "auto")
      apiFormData.append("response_format", "b64_json")
      apiFormData.append("size", "1024x1024")

      console.log("🌐 准备调用外部API:", API_URL)

      // 调用外部API
      const apiResponse = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: API_KEY,
        },
        body: apiFormData,
        signal: AbortSignal.timeout(120000), // 120秒超时
      })

      console.log(`📡 API响应状态: ${apiResponse.status} ${apiResponse.statusText}`)

      // 先获取原始响应文本
      const responseText = await apiResponse.text()
      console.log("📄 API原始响应文本:", responseText)

      if (!apiResponse.ok) {
        console.error("❌ API调用失败:", {
          status: apiResponse.status,
          statusText: apiResponse.statusText,
          responseText: responseText,
        })

        if (responseText.includes("FUNCTION_INVOCATION_TIMEOUT")) {
          return NextResponse.json(
            {
              success: false,
              error: "API处理超时，请稍后重试或尝试使用更小的图片",
              debug: {
                status: apiResponse.status,
                statusText: apiResponse.statusText,
                responseText: responseText,
                errorType: "TIMEOUT",
                suggestion: "尝试压缩图片或稍后重试",
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
              responseText: responseText,
              apiUrl: API_URL,
              timestamp: new Date().toISOString(),
            },
          },
          { status: apiResponse.status },
        )
      }

      // 尝试解析JSON
      let apiResult
      try {
        apiResult = JSON.parse(responseText)
        console.log("📦 API响应数据结构:", {
          hasData: !!apiResult.data,
          dataLength: apiResult.data?.length || 0,
          keys: Object.keys(apiResult),
        })
      } catch (parseError) {
        console.error("❌ JSON解析失败:", parseError)
        console.error("📄 无法解析的响应文本:", responseText)

        return NextResponse.json(
          {
            success: false,
            error: "API响应不是有效的JSON格式",
            debug: {
              parseError: parseError instanceof Error ? parseError.message : String(parseError),
              responseText: responseText,
              responseLength: responseText.length,
              apiUrl: API_URL,
              timestamp: new Date().toISOString(),
            },
          },
          { status: 500 },
        )
      }

      // 检查响应格式
      if (!apiResult.data || !Array.isArray(apiResult.data) || apiResult.data.length === 0) {
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

      // 提取base64图片数据
      imageData = apiResult.data[0]
      if (!imageData.b64_json) {
        console.error("❌ 没有找到b64_json数据:", imageData)
        return NextResponse.json(
          {
            success: false,
            error: "没有找到图片数据",
            debug: {
              imageData,
              availableKeys: Object.keys(imageData),
            },
          },
          { status: 500 },
        )
      }

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
  console.log(`✅ 图片生成成功，耗时: ${processingTime}ms`)

  return NextResponse.json({
    success: true,
    image: imageData.b64_json,
    processingTime,
    debug: {
      originalSize: imageFile.size,
      apiResponseTime: processingTime,
      imageGenerated: true,
    },
  })
}