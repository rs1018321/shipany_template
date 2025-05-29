"use client"

import { useState, useRef } from "react"
import { Upload, Wand2, Download, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

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
      // 只保留最近10个结果
      const limitedHistory = history.slice(0, 10)
      localStorage.setItem("coloring-book-history", JSON.stringify(limitedHistory))
    } catch (error) {
      console.error("Failed to save to history:", error)
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
    setDebugInfo("开始生成线稿图...")

    try {
      // 将base64转换为File对象
      const response = await fetch(originalImage)
      const blob = await response.blob()

      const formData = new FormData()
      formData.append("image", blob, "image.png")
      formData.append("prompt", "转换为黑白线稿涂色图，简洁的线条，适合儿童涂色")
      formData.append("model", "gpt-image-1")
      formData.append("n", "1")
      formData.append("quality", "auto")
      formData.append("response_format", "b64_json")
      formData.append("size", "1024x1024")

      setDebugInfo("正在调用API...")

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

        setDebugInfo(`生成成功! 耗时: ${result.processingTime}ms`)
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
    setDebugInfo("文字生成线稿中...")
    try {
      const response = await fetch("/api/generate-text-sketch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptText }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || `API调用失败: ${response.status}`)
      if (result.success && result.image) {
        let textImageData = result.image
        const base64Prefix = "data:image/png;base64,"
        if (!textImageData.startsWith(base64Prefix)) {
          textImageData = base64Prefix + textImageData
        }
        setTextGeneratedImage(textImageData)
      } else {
        throw new Error(result.error || "生成失败")
      }
    } catch (error) {
      setTextError(error instanceof Error ? error.message : String(error))
    } finally {
      setIsGeneratingText(false)
    }
  }

  return (
    <>
      {page.hero && <Hero hero={page.hero} />}
      {page.branding && <Branding section={page.branding} />}
      {page.introduce && <Feature1 section={page.introduce} />}
      {page.benefit && <Feature2 section={page.benefit} />}
      {page.usage && <Feature3 section={page.usage} />}
      {page.feature && <Feature section={page.feature} />}
      {page.showcase && <Showcase section={page.showcase} />}
      {page.stats && <Stats section={page.stats} />}
      
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            🎨 魔法涂色本
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">将你的照片变成有趣的涂色线稿图，让创意无限绽放！</p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left Panel - Upload */}
          <Card className="p-8 bg-white/80 backdrop-blur-sm border-2 border-blue-100 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Upload className="w-6 h-6 text-blue-500" />
              上传图片
            </h2>

            <div
              onClick={triggerFileInput}
              className="border-3 border-dashed border-blue-300 rounded-2xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all duration-300"
            >
              {originalImage ? (
                <div className="space-y-4">
                  <img
                    src={originalImage || "/placeholder.svg"}
                    alt="上传的图片"
                    className="max-w-full max-h-64 mx-auto rounded-xl shadow-lg"
                  />
                  <p className="text-blue-600 font-medium">点击更换图片</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">点击上传图片</p>
                    <p className="text-sm text-gray-500 mt-2">支持 JPG、PNG 格式，最大 5MB</p>
                  </div>
                </div>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />

            <Button
              onClick={generateColoringBook}
              disabled={!originalImage || isGenerating}
              className="w-full mt-6 h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  魔法生成中...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  生成涂色图
                </>
              )}
            </Button>
          </Card>

          {/* Right Panel - Result */}
          <Card className="p-8 bg-white/80 backdrop-blur-sm border-2 border-purple-100 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Wand2 className="w-6 h-6 text-purple-500" />
              涂色线稿图
            </h2>

            <div className="border-3 border-dashed border-purple-300 rounded-2xl p-12 text-center min-h-[300px] flex items-center justify-center">
              {generatedImage ? (
                <div className="space-y-4 w-full">
                  <img
                    src={generatedImage || "/placeholder.svg"}
                    alt="生成的涂色图"
                    className="max-w-full max-h-64 mx-auto rounded-xl shadow-lg"
                  />
                  <Button
                    onClick={downloadImage}
                    className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-medium px-6 py-2"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    下载图片
                  </Button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Wand2 className="w-8 h-8 text-purple-500" />
                  </div>
                  <p className="text-lg font-medium text-gray-700">涂色图将在这里显示</p>
                  <p className="text-sm text-gray-500 mt-2">上传图片并点击生成按钮</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Debug Info */}
        {debugInfo && (
          <Card className="max-w-4xl mx-auto mt-6 p-4 bg-gray-50 border-gray-200">
            <h3 className="font-medium text-gray-700 mb-2">调试信息:</h3>
            <p className="text-sm text-gray-600 font-mono whitespace-pre-wrap">{debugInfo}</p>
          </Card>
        )}

        {/* Detailed Error Info */}
        {error && (
          <Card className="max-w-4xl mx-auto mt-4 p-4 bg-red-50 border-red-200">
            <h3 className="font-medium text-red-700 mb-2">详细错误信息:</h3>
            <div className="text-sm text-red-600 space-y-2">
              <p>
                <strong>错误:</strong> {error}
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">查看技术详情</summary>
                <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify({ error, timestamp: new Date().toISOString() }, null, 2)}
                </pre>
              </details>
            </div>
          </Card>
        )}

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">✨ 特色功能</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 text-center bg-white/60 backdrop-blur-sm border-blue-100">
              <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Wand2 className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">AI智能转换</h3>
              <p className="text-gray-600 text-sm">使用先进的AI技术，将任何照片转换为精美的线稿图</p>
            </Card>
            <Card className="p-6 text-center bg-white/60 backdrop-blur-sm border-purple-100">
              <div className="w-12 h-12 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Download className="w-6 h-6 text-purple-500" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">高清下载</h3>
              <p className="text-gray-600 text-sm">生成的涂色图支持高清下载，打印效果清晰</p>
            </Card>
            <Card className="p-6 text-center bg-white/60 backdrop-blur-sm border-green-100">
              <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Upload className="w-6 h-6 text-green-500" />
              </div>
              <h3 className="font-bold text-gray-800 mb-2">简单易用</h3>
              <p className="text-gray-600 text-sm">只需上传图片，一键生成，操作简单快捷</p>
            </Card>
          </div>
        </div>

        <Card className="p-8 bg-white/80 backdrop-blur-sm border-2 border-green-100 shadow-xl max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-green-500" />
            文字描述生成线稿
          </h2>
          <Textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder="请输入图片描述，例如：一只在森林中漫步的小鹿"
          />
          <Button
            onClick={generateFromText}
            disabled={!promptText.trim() || isGeneratingText}
            className="w-full mt-4 h-12 text-lg font-semibold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isGeneratingText ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                生成线稿
              </>
            )}
          </Button>
          {textError && <p className="text-red-600 mt-2">{textError}</p>}
          {textGeneratedImage && (
            <div className="mt-6 text-center">
              <img
                src={textGeneratedImage}
                alt="生成的线稿图"
                className="max-w-full max-h-64 mx-auto rounded-xl shadow-lg"
              />
              <Button
                onClick={() => {
                  const link = document.createElement("a")
                  link.href = textGeneratedImage
                  link.download = `text-sketch-${Date.now()}.png`
                  document.body.appendChild(link)
                  link.click()
                  document.body.removeChild(link)
                }}
                className="mt-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-medium px-6 py-2"
              >
                <Download className="w-4 h-4 mr-2" />
                下载图片
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
      
      {page.pricing && <Pricing pricing={page.pricing} />}
      {page.testimonial && <Testimonial section={page.testimonial} />}
      {page.faq && <FAQ section={page.faq} />}
      {page.cta && <CTA section={page.cta} />}
    </>
  );
}
