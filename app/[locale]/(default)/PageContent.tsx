"use client"

import { useState, useRef } from "react"
import { Upload, Wand2, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { AspectRatioSelector } from "@/components/ui/aspect-ratio-selector"

import Branding from "@/components/blocks/branding";
import CTA from "@/components/blocks/cta";
import FAQ from "@/components/blocks/faq";
import Feature from "@/components/blocks/feature";
import Feature1 from "@/components/blocks/feature1";
import Feature2 from "@/components/blocks/feature2";
import Feature3 from "@/components/blocks/feature3";
import Hero from "@/components/blocks/hero";
import Pricing from "@/components/blocks/pricing";
import Showcase from "@/components/blocks/showcase";
import Stats from "@/components/blocks/stats";
import Testimonial from "@/components/blocks/testimonial";
import { getLandingPage } from "@/services/page";


interface GenerationResult {
  originalImage: string
  generatedImage: string
  timestamp: number
}

interface LandingPageProps {
  page: Awaited<ReturnType<typeof getLandingPage>>
  locale: string
}


export default function LandingPage({ page, locale }: LandingPageProps) {
 
  const [originalImage, setOriginalImage] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [promptText, setPromptText] = useState<string>("")
  const [textGeneratedImage, setTextGeneratedImage] = useState<string | null>(null)
  const [isGeneratingText, setIsGeneratingText] = useState(false)
  const [textError, setTextError] = useState<string | null>(null)
  
  // 添加尺寸比例状态
  const [imageAspectRatio, setImageAspectRatio] = useState<string>("1:1")
  const [textAspectRatio, setTextAspectRatio] = useState<string>("1:1")

  // 将比例转换为具体尺寸
  const getImageSize = (aspectRatio: string): string => {
    switch (aspectRatio) {
      case "1:1":
        return "1024x1024" // 1:1 比例 (正方形)
      case "2:3":
        return "832x1248"  // 2:3 比例 (竖版)
      case "3:2":
        return "1248x832"  // 3:2 比例 (横版)
      default:
        return "1024x1024" // 默认 1:1 比例
    }
  }

  // 从localStorage加载历史记录
  const loadHistory = (): GenerationResult[] => {
    try {
      const history = localStorage.getItem("coloring-book-history")
      return history ? JSON.parse(history) : []
    } catch (error) {
      console.error("Failed to load history:", error)
      return []
    }
  }

  // 保存到localStorage
  const saveToHistory = (result: GenerationResult) => {
    try {
      const history = loadHistory()
      history.unshift(result)
      // 只保留最近5个结果，减少存储占用
      const limitedHistory = history.slice(0, 5)
      
      // 检查存储大小
      const historyString = JSON.stringify(limitedHistory)
      if (historyString.length > 1024 * 1024) { // 1MB限制
        console.warn("历史记录过大，清理旧记录")
        // 只保留最新的2个记录
        const minimalHistory = limitedHistory.slice(0, 2)
        localStorage.setItem("coloring-book-history", JSON.stringify(minimalHistory))
      } else {
        localStorage.setItem("coloring-book-history", historyString)
      }
    } catch (error) {
      console.error("Failed to save to history:", error)
      // 如果存储失败，尝试清理存储后重试
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          localStorage.removeItem("coloring-book-history")
          const newHistory = [result]
          localStorage.setItem("coloring-book-history", JSON.stringify(newHistory))
          console.log("清理历史记录后重新保存成功")
        } catch (retryError) {
          console.error("重试保存也失败了:", retryError)
        }
      }
    }
  }

  const compressImage = (base64: string, quality: number, maxWidth: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("无法创建canvas上下文"))
          return
        }

        // 计算新尺寸
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        // 绘制并压缩
        ctx.drawImage(img, 0, 0, width, height)
        const compressedBase64 = canvas.toDataURL("image/jpeg", quality)
        resolve(compressedBase64)
      }
      img.onerror = () => reject(new Error("图片加载失败"))
      img.src = base64
    })
  }

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // 检查文件类型
    if (!file.type.startsWith("image/")) {
      setError("请选择一个有效的图片文件")
      return
    }

    // 检查文件大小 (限制为5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("图片文件大小不能超过5MB")
      return
    }

    const reader = new FileReader()
    reader.onload = async (e) => {
      const result = e.target?.result as string

      // 如果图片较大，进行压缩
      let processedImage = result
      if (file.size > 1024 * 1024) {
        // 大于1MB时压缩
        try {
          processedImage = await compressImage(result, 0.8, 1024)
          setDebugInfo(`图片已压缩: ${file.name}, 原始大小: ${(file.size / 1024).toFixed(2)}KB`)
        } catch (error) {
          console.error("图片压缩失败:", error)
          setDebugInfo(`图片上传成功: ${file.name}, 大小: ${(file.size / 1024).toFixed(2)}KB (未压缩)`)
        }
      } else {
        setDebugInfo(`图片上传成功: ${file.name}, 大小: ${(file.size / 1024).toFixed(2)}KB`)
      }

      setOriginalImage(processedImage)
      setGeneratedImage(null)
      setError(null)
    }
    reader.onerror = () => {
      setError("图片读取失败，请重试")
    }
    reader.readAsDataURL(file)
  }

  const generateColoringBook = async () => {
    if (!originalImage) {
      setError("请先上传一张图片")
      return
    }

    setIsGenerating(true)
    setError(null)
    setDebugInfo("开始生成线稿图，使用 Flux Kontext Pro 模型...")

    try {
      // 将base64转换为File对象
      const response = await fetch(originalImage)
      const blob = await response.blob()

      const formData = new FormData()
      formData.append("image", blob, "image.png")
      formData.append("size", getImageSize(imageAspectRatio))

      setDebugInfo("正在调用 Replicate API...")

      const apiResponse = await fetch("/api/generate-coloring-book", {
        method: "POST",
        body: formData,
      })

      const result = await apiResponse.json()

      if (!apiResponse.ok) {
        throw new Error(result.error || `API调用失败: ${apiResponse.status}`)
      }

      if (result.success && result.image) {
        console.log('result: ', result.image)
        let generatedImageData = result.image
        const base64Prefix = "data:image/png;base64,"
        if (!generatedImageData.startsWith(base64Prefix)) {
          generatedImageData = base64Prefix + generatedImageData
        }
        setGeneratedImage(generatedImageData)
        

        // 保存到历史记录
        saveToHistory({
          originalImage,
          generatedImage: generatedImageData,
          timestamp: Date.now(),
        })

        setDebugInfo(`生成成功! 使用 Flux Kontext Pro 模型，耗时: ${result.processingTime}ms`)
      } else {
        throw new Error(result.error || "生成失败")
      }
    } catch (error) {
      console.error("Generation error:", error)

      let errorMessage = "生成失败，请重试"
      let debugDetails = ""

      if (error instanceof Error) {
        errorMessage = error.message
        debugDetails = `错误类型: ${error.constructor.name}\n错误信息: ${error.message}\n时间: ${new Date().toISOString()}`

        // 特殊错误处理
        if (error.message.includes("timeout") || error.message.includes("TIMEOUT")) {
          debugDetails += "\n建议: 图片处理超时，请尝试使用更小的图片或稍后重试"
        } else if (error.message.includes("fetch")) {
          debugDetails += "\n可能的原因: 网络连接问题或API服务不可用"
        } else if (error.message.includes("quota") || error.message.includes("rate limit")) {
          debugDetails += "\n建议: API 调用限额已达上限，请稍后重试"
        }
      }

      setError(errorMessage)
      setDebugInfo(debugDetails)
    } finally {
      setIsGenerating(false)
    }
  }

  const downloadImage = () => {
    if (!generatedImage) return

    const link = document.createElement("a")
    link.href = generatedImage
    link.download = `coloring-book-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  const generateFromText = async () => {
    if (!promptText.trim()) {
      setTextError("请输入描述")
      return
    }
    setIsGeneratingText(true)
    setTextError(null)
    setDebugInfo("使用 Minimax Image-01 模型生成线稿中，这可能需要30-60秒，请耐心等待...")
    try {
      const response = await fetch("/api/generate-text-sketch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: promptText,
          size: getImageSize(textAspectRatio)
        }),
      })
      const result = await response.json()
      if (!response.ok) {
        const errorMessage = result.error || `API调用失败: ${response.status}`
        const suggestion = result.suggestion || "请稍后重试"
        throw new Error(`${errorMessage}。建议：${suggestion}`)
      }
      if (result.success && result.image) {
        let textImageData = result.image
        const base64Prefix = "data:image/png;base64,"
        if (!textImageData.startsWith(base64Prefix)) {
          textImageData = base64Prefix + textImageData
        }
        setTextGeneratedImage(textImageData)
        setDebugInfo(`Minimax Image-01 生成成功! 处理时间: ${result.processingTime}, 尝试次数: ${result.attempt}`)
      } else {
        throw new Error(result.error || "生成失败")
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      setTextError(errorMessage)
      setDebugInfo("")
      
      // 根据错误类型给出更具体的建议
      if (errorMessage.includes('认证失败')) {
        setTextError("API 认证失败，请联系管理员检查配置")
      } else if (errorMessage.includes('频率限制')) {
        setTextError("API 调用频率限制，请稍后再试")
      } else if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
        setTextError("请求超时，请尝试简化描述或稍后重试")
      }
    } finally {
      setIsGeneratingText(false)
    }
  }

  return (
    <>
       {/* ✅ 功能区域提到页面顶部 Hero 下方 */}
       {page.hero && <Hero hero={page.hero} />}

<div className="relative z-10 -mt-12 pb-8 px-4">
  <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-32">

    {/* 🎨 图生图区域 */}
    <div className="flex flex-col items-center h-full">
      <h3 className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-md text-sm font-medium h-10 px-4 mb-4">将图片转换为填色页</h3>
      <Card className="flex flex-col flex-1 w-full p-6 bg-white/90 shadow-xl border rounded-2xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-blue-600" /> 上传图片生成线稿图
        </h2>
        <div
          onClick={triggerFileInput}
          className="border-2 border-dashed border-blue-300 rounded-lg w-full aspect-[5/4] overflow-hidden flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition"
        >
          {originalImage ? (
            <img src={originalImage} alt="上传" className="w-full h-full object-contain" />
          ) : (
            <p className="text-gray-500">点击上传图片</p>
          )}
        </div>
        <input ref={fileInputRef} type="file" onChange={handleImageUpload} className="hidden" />
        
        {/* 添加尺寸选择器 */}
        <AspectRatioSelector
          value={imageAspectRatio}
          onChange={setImageAspectRatio}
          className="mt-4"
        />
        
        <Button onClick={generateColoringBook} disabled={!originalImage || isGenerating} className="w-full mt-4">
          {isGenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />生成中...</>
          ) : (
            <><Wand2 className="w-4 h-4 mr-2" />生成涂色图</>
          )}
        </Button>
        
        {/* 显示调试信息 */}
        {debugInfo && !isGeneratingText && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            {debugInfo}
          </div>
        )}
        
        {/* 显示错误信息 */}
        {error && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {error}
          </div>
        )}
        
        {generatedImage && (
          <div className="mt-4 text-center">
            <img src={generatedImage} alt="线稿" className="rounded-lg shadow max-h-64 mx-auto" />
            <Button onClick={downloadImage} className="mt-2 w-full">下载图片</Button>
          </div>
        )}
      </Card>
    </div>

    {/* ✏️ 文生图区域 */}
    <div className="flex flex-col items-center h-full">
      <h3 className="inline-flex items-center justify-center bg-primary text-primary-foreground rounded-md text-sm font-medium h-10 px-4 mb-4">转换文字为填色书</h3>
      <Card className="flex flex-col flex-1 w-full p-6 bg-white/90 shadow-xl border rounded-2xl">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-green-600" /> 文字描述生成线稿图
        </h2>
        <Textarea
          value={promptText}
          onChange={(e) => setPromptText(e.target.value)}
          placeholder="例如：一个在海滩玩耍的小孩"
          className="mb-4 w-full aspect-[5/4]"
        />
        
        {/* 添加尺寸选择器 */}
        <AspectRatioSelector
          value={textAspectRatio}
          onChange={setTextAspectRatio}
          className="mb-4"
        />
        
        <Button onClick={generateFromText} disabled={!promptText.trim() || isGeneratingText} className="w-full">
          {isGeneratingText ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />生成中...</>
          ) : (
            <><Wand2 className="w-4 h-4 mr-2" />生成线稿图</>
          )}
        </Button>
        
        {/* 显示调试信息 */}
        {debugInfo && (
          <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
            {debugInfo}
          </div>
        )}
        
        {/* 显示错误信息 */}
        {textError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
            {textError}
          </div>
        )}
        
        {textGeneratedImage && (
          <div className="mt-4 text-center">
            <img src={textGeneratedImage} alt="线稿图" className="rounded-lg shadow max-h-64 mx-auto" />
            <Button onClick={() => {
              const link = document.createElement("a")
              link.href = textGeneratedImage
              link.download = `text-sketch-${Date.now()}.png`
              link.click()
            }} className="mt-2 w-full">下载图片</Button>
          </div>
        )}
      </Card>
    </div>
  </div>
</div>

{/* 原本内容继续渲染 */}
{page.branding && <Branding section={page.branding} />}
{page.introduce && <Feature1 section={page.introduce} />}
{page.benefit && <Feature2 section={page.benefit} />}
{page.usage && <Feature3 section={page.usage} />}
{page.feature && <Feature section={page.feature} />}
{page.showcase && <Showcase section={page.showcase} />}
{page.stats && <Stats section={page.stats} />}
{page.pricing && <Pricing pricing={page.pricing} />}
{page.testimonial && <Testimonial section={page.testimonial} />}
{page.faq && <FAQ section={page.faq} />}
{page.cta && <CTA section={page.cta} />}
    </>
  );
}
