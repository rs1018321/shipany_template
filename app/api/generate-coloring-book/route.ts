import { NextRequest, NextResponse } from 'next/server'
import Replicate from 'replicate'

// ------ 新增：获取最新 version 哈希 ------
// async function getLatestVersionId() {
//   const res = await fetch(
//     "https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/versions",
//     {
//       headers: {
//         Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
//       },
//     }
//   );
//   if (!res.ok)
//     throw new Error(`Replicate version list HTTP ${res.status}`);

//   const json = await res.json();
//   return json.results[0].id as string; // 第 0 条就是最新
// }
// ----------------------------------------


const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

export async function POST(request: NextRequest) {
  const maxRetries = 3
  const baseDelay = 5000

  // 检查 API token
  if (!process.env.REPLICATE_API_TOKEN) {
    console.error("❌ REPLICATE_API_TOKEN 环境变量未进行设置")
    return NextResponse.json({ error: "API 配置错误，请联系管理员" }, { status: 500 })
  }

  try {
    console.log("🚀 开始处理图片生成请求")

    // 在重试循环外读取 formData（只能读取一次）
    const formData = await request.formData()
    const file = formData.get('image') as File
    const size = formData.get('size') as string || '1024x1024'

    if (!file) {
      return NextResponse.json({ error: "未上传图片" }, { status: 400 })
    }

    // 转换图片为 base64（只需要做一次）
    const bytes = await file.arrayBuffer()
    const base64Image = Buffer.from(bytes).toString('base64')
    const imageDataUrl = `data:${file.type};base64,${base64Image}`

    console.log(`📁 收到图片文件: ${file.name}, 大小: ${file.size} bytes, 输出尺寸: ${size}`)

    // 准备 Replicate API 参数
    const input = {
      //image: imageDataUrl,
      input_image: imageDataUrl,  
      prompt: "Convert this colored illustration into clean black-and-white coloring-book line art. CRITICAL REQUIREMENT: The ENTIRE original image must be preserved completely - DO NOT crop, cut, trim, or remove ANY portion of the original image. ALL elements from edge to edge of the original image must remain visible and intact. Create a larger canvas with the target aspect ratio and place the complete, unmodified original image in the center. Fill the extra space around the original image with pure white background. Think of this as putting a complete postcard into a larger picture frame - the postcard (original image) stays exactly the same size and shape, you just add a white border around it. Draw bold, continuous pure-black strokes for outlines only. Remove all color, shading, gradients and fills, leaving crisp, simple contours. Output as a high-resolution PNG.",
      guidance_scale: 2.5,
      num_inference_steps: 28,
      aspect_ratio: size === "1024x1024" ? "1:1" :     // 1:1 正方形
                   size === "832x1248" ? "2:3" :      // 2:3 竖版
                   size === "1248x832" ? "3:2" :      // 3:2 横版
                   "1:1",                              // 默认 1:1
      seed: Math.floor(Math.random() * 1000000)
    }

    // 重试循环（只重试 API 调用部分）
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 第 ${attempt} 次尝试调用 Replicate API`)
        console.log("🌐 准备调用 Replicate API: black-forest-labs/flux-kontext-pro")
        console.log("🔑 API Token 已设置:", process.env.REPLICATE_API_TOKEN ? '是' : '否')

        const startTime = Date.now()

        // 调用 Replicate API
        // 原来：
        //const output = await replicate.run("black-forest-labs/flux-kontext-pro", { input }) 

        // 改成：
        
        
        //const MODEL = `black-forest-labs/flux-kontext-pro:${latest}`;
        const output = await replicate.run("black-forest-labs/flux-kontext-pro", { input }) as any;


        //const output = await replicate.run(MODEL, { input });
        


        


        console.log(`📡 Replicate API 调用成功`)
        console.log("🔍 输出类型:", typeof output)
        console.log("🔍 输出构造函数:", output?.constructor?.name)

        // 处理不同类型的 Replicate 输出
        let imageUrl: string

        if (typeof output === 'string') {
          // 直接返回 URL 字符串
          imageUrl = output
          console.log("📎 输出格式: 直接 URL 字符串")
        } else if (Array.isArray(output) && output.length > 0) {
          // 如果返回数组，取第一个元素
          imageUrl = output[0]
          console.log("📎 输出格式: URL 数组")
          
        } else if (output && typeof output.getReader === 'function') {
          // 如果是 ReadableStream，直接读取为二进制图片数据
          console.log("📎 输出格式: ReadableStream (二进制图片数据)")
          const reader = output.getReader()
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
            const imageData = Buffer.from(fullData).toString('base64')
            
            console.log("✅ 图片数据转换为 base64 成功，长度:", imageData.length)

            // 直接返回结果，不需要下载步骤
            const processingTime = Date.now() - startTime
            
            return NextResponse.json({
              success: true,
              image: `data:image/png;base64,${imageData}`,
              processingTime: `${processingTime}ms`,
              model: "flux-kontext-pro",
              attempt: attempt,
              format: "ReadableStream"
            })
            
          } finally {
            reader.releaseLock()
          }
        } else if (output && output.url) {
          // 如果是包含 url 属性的对象
          imageUrl = typeof output.url === 'function' ? output.url() : output.url
          console.log("📎 输出格式: URL 对象")
        } else {
          console.error("❌ 未知的输出格式:", output)
          console.error("❌ 输出详细信息:", JSON.stringify(output, null, 2))
          throw new Error(`不支持的输出格式: ${typeof output}, constructor: ${output?.constructor?.name}`)
        }

        console.log("🔗 解析得到的图片 URL:", imageUrl)

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
        const imageData = Buffer.from(imageBuffer).toString('base64')

        console.log("✅ 图片转换为 base64 成功，长度:", imageData.length)

        // 如果成功，返回结果
        const processingTime = Date.now() - startTime
        
        return NextResponse.json({
          success: true,
          image: `data:image/png;base64,${imageData}`,
          processingTime: `${processingTime}ms`,
          model: "flux-kontext-pro",
          attempt: attempt
        })

      } catch (error: any) {
        console.error(`❌ 第 ${attempt} 次尝试失败:`, error)

        if (attempt === maxRetries) {
          console.error("❌ 图片生成最终失败:", error.message)
          return NextResponse.json({ 
            error: error.message || "图片生成失败",
            model: "flux-kontext-pro",
            attempts: maxRetries,
            suggestion: error.message.includes('rate limit') ? '请稍后再试，API 调用频率限制' :
                       error.message.includes('timeout') ? '请尝试使用更小的图片或降低质量' :
                       error.message.includes('Unauthorized') || error.message.includes('authentication') ? 'API 认证失败，请检查配置' :
                       error.message.includes('invalid') ? '请检查图片格式是否正确' : 
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
      suggestion: '请检查上传的图片格式是否正确'
    }, { status: 500 })
  }
}