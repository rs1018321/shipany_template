import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

const replicate = new Replicate({
  auth: process.env.REPLICATE_TEXT_API_TOKEN!,
})

export async function POST(request: NextRequest) {
  const maxRetries = 3
  const baseDelay = 5000

  // 检查 API token
  if (!process.env.REPLICATE_TEXT_API_TOKEN) {
    console.error("❌ REPLICATE_TEXT_API_TOKEN 环境变量未设置")
    return NextResponse.json({ error: "API 配置错误，请联系管理员" }, { status: 500 })
  }

  try {
    console.log("🚀 开始处理文生图请求")

    // 读取请求参数
    const { prompt, size = "1024x1024" } = await request.json()
    
    if (!prompt) {
      return NextResponse.json({ error: "没有收到描述" }, { status: 400 })
    }

    // 构建完整的提示词（在用户描述后添加涂色图要求）
    const fullPrompt = `${prompt.trim()}, drawn as clean black-and-white coloring-book line art for children. Keep only bold, continuous pure-black outlines of the main subject and essential scene elements; remove all color, shading, gradients and fills. Have the characters and scene elements fill the entire canvas, avoiding large blank areas. Background must remain pure white. Centered composition, high-resolution PNG.`

    console.log(`📝 文字生成请求: ${prompt}`)
    console.log(`📝 输出尺寸: ${size}`)
    console.log(`📝 完整提示词: ${fullPrompt}`)

    // 准备 Replicate API 参数
    const input = {
      prompt: fullPrompt,
      aspect_ratio: size === "1024x1024" ? "1:1" :     // 1:1 正方形
                   size === "832x1248" ? "2:3" :      // 2:3 竖版
                   size === "1248x832" ? "3:2" :      // 3:2 横版
                   "1:1",                              // 默认 1:1
      number_of_images: 1,
      prompt_optimizer: true
    }

    // 重试循环
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 第 ${attempt} 次尝试调用 Replicate API`)
        console.log("🌐 准备调用 Replicate API: minimax/image-01")
        console.log("🔑 API Token 已设置:", process.env.REPLICATE_TEXT_API_TOKEN ? '是' : '否')

        const startTime = Date.now()

        // 调用 Replicate API
        const output = await replicate.run("minimax/image-01", { input }) as any

        console.log(`📡 Replicate API 调用成功`)
        console.log("🔍 输出类型:", typeof output)
        console.log("🔍 输出内容:", output)

        // 处理 Replicate 输出（可能是 URL 数组或 ReadableStream）
        let imageUrl: string
        let imageData: string

        if (Array.isArray(output) && output.length > 0) {
          const firstOutput = output[0]
          
          if (typeof firstOutput === 'string') {
            // minimax/image-01 返回 URL 数组
            imageUrl = firstOutput
            console.log("📎 输出格式: URL 数组")
            
            // 验证 URL 格式
            if (!imageUrl || !imageUrl.startsWith('http')) {
              throw new Error(`无效的图片 URL: ${imageUrl}`)
            }

            // 下载图片并转换为 base64
            const imageResponse = await fetch(imageUrl)
            if (!imageResponse.ok) {
              throw new Error(`下载生成的图片失败: ${imageResponse.status} ${imageResponse.statusText}`)
            }
            
            const imageBuffer = await imageResponse.arrayBuffer()
            imageData = Buffer.from(imageBuffer).toString('base64')
            
          } else if (firstOutput && typeof firstOutput.getReader === 'function') {
            // 如果是 ReadableStream，直接读取为二进制图片数据
            console.log("📎 输出格式: ReadableStream (二进制图片数据)")
            const reader = firstOutput.getReader()
            const chunks = []
            
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                chunks.push(value)
              }
              
              // 将 chunks 合并为完整的图片数据
              const fullData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0))
              let offset = 0
              for (const chunk of chunks) {
                fullData.set(chunk, offset)
                offset += chunk.length
              }
              
              console.log("📄 获取到图片数据，大小:", fullData.length, "bytes")
              console.log("📄 文件头:", fullData.slice(0, 8))
              
              // 直接将二进制数据转换为 base64
              imageData = Buffer.from(fullData).toString('base64')
              
            } finally {
              reader.releaseLock()
            }
          } else {
            console.error("❌ 未知的数组元素格式:", firstOutput)
            throw new Error(`不支持的数组元素格式: ${typeof firstOutput}`)
          }
        } else if (typeof output === 'string') {
          // 如果直接返回单个 URL
          imageUrl = output
          console.log("📎 输出格式: 直接 URL 字符串")
          
          // 验证 URL 格式
          if (!imageUrl || !imageUrl.startsWith('http')) {
            throw new Error(`无效的图片 URL: ${imageUrl}`)
          }

          // 下载图片并转换为 base64
          const imageResponse = await fetch(imageUrl)
          if (!imageResponse.ok) {
            throw new Error(`下载生成的图片失败: ${imageResponse.status} ${imageResponse.statusText}`)
          }
          
          const imageBuffer = await imageResponse.arrayBuffer()
          imageData = Buffer.from(imageBuffer).toString('base64')
          
        } else {
          console.error("❌ 未知的输出格式:", output)
          throw new Error(`不支持的输出格式: ${typeof output}`)
        }

        console.log("✅ 图片数据处理成功，base64长度:", imageData.length)

        // 如果成功，返回结果
        const processingTime = Date.now() - startTime
        
        return NextResponse.json({
          success: true,
          image: imageData,
          processingTime: `${processingTime}ms`,
          model: "minimax/image-01",
          attempt: attempt,
          debug: {
            promptLength: prompt.length,
            fullPromptLength: fullPrompt.length,
            imageGenerated: true
          }
        })

      } catch (error: any) {
        console.error(`❌ 第 ${attempt} 次尝试失败:`, error)

        if (attempt === maxRetries) {
          console.error("❌ 文生图最终失败:", error.message)
          return NextResponse.json({ 
            error: error.message || "文生图生成失败",
            model: "minimax/image-01",
            attempts: maxRetries,
            suggestion: error.message.includes('rate limit') ? '请稍后再试，API 调用频率限制' :
                       error.message.includes('timeout') ? '请尝试简化描述或稍后重试' :
                       error.message.includes('Unauthorized') || error.message.includes('authentication') ? 'API 认证失败，请检查配置' :
                       error.message.includes('invalid') ? '请检查描述是否符合要求' : 
                       '请检查网络连接或稍后重试'
          }, { status: 500 })
        }

        // 等待后重试
        const delay = baseDelay * attempt
        console.log(`⏳ 等待 ${delay}ms 后重试...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

  } catch (error: any) {
    console.error("❌ 请求处理失败:", error)
    return NextResponse.json({ 
      error: error.message || "请求处理失败",
      suggestion: '请检查描述是否正确'
    }, { status: 500 })
  }
} 