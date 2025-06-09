# 🎨 AI智能涂色图生成器

一个基于Next.js的智能涂色图生成应用，支持图生图和文生图两种模式，使用最先进的AI模型生成高质量的黑白线稿涂色图。

## ✨ 主要功能

### 🖼️ 图生图 (Image-to-Image)
- **模型**: Flux Kontext Pro (black-forest-labs/flux-kontext-pro)
- **智能相框效果**: 保持原图完整不变，仅在外围添加白边达到目标尺寸
- **三种长宽比**: 1:1 (正方形)、2:3 (竖版)、3:2 (横版)
- **完美保持**: 原图内容100%保留，不压缩、不拉伸、不裁剪

### 📝 文生图 (Text-to-Image)  
- **模型**: MiniMax Image-01
- **智能提示词**: 自动优化用户输入，生成专业涂色图
- **尺寸自由选择**: 支持多种长宽比输出
- **高质量输出**: 清晰的黑白线稿，适合儿童涂色

## 🚀 技术栈

- **前端**: Next.js 14 + TypeScript + Tailwind CSS
- **UI组件**: Shadcn UI + Radix UI  
- **AI集成**: Replicate API
- **图像处理**: 智能尺寸适配算法
- **国际化**: next-intl

## 🛠️ 安装和运行

### 1. 克隆项目
```bash
git clone https://github.com/你的用户名/仓库名.git
cd 仓库名
```

### 2. 安装依赖
```bash
npm install
# 或
pnpm install
```

### 3. 环境配置
复制 `.env.example` 到 `.env.local` 并配置API密钥：

```env
# Replicate API密钥
REPLICATE_API_TOKEN=your_replicate_api_token_here

# 其他配置...
```

### 4. 启动开发服务器
```bash
npm run dev
# 或
pnpm dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 🎯 核心特色

### 🖼️ 革命性的"相框"效果
- ✅ **原图完整保留**: 像明信片放进相框，原图内容完全不变
- ✅ **智能白边填充**: 自动在外围添加白色边框达到目标尺寸  
- ✅ **三种比例支持**: 正方形、竖版、横版自由选择
- ✅ **无损处理**: 绝不压缩、拉伸或裁剪原图内容

### 🎨 高质量输出
- 清晰的黑白线稿
- 适合儿童涂色的粗线条
- 纯白背景，便于涂色
- 高分辨率PNG输出

## 📱 使用方法

### 图生图模式
1. 点击"上传图片"选择要转换的图片
2. 选择目标长宽比（1:1、2:3、3:2）
3. 点击"生成涂色图"
4. 等待AI处理完成
5. 下载生成的黑白线稿

### 文生图模式  
1. 在文本框中输入图片描述
2. 选择目标长宽比
3. 点击"生成涂色图"  
4. 等待AI绘制完成
5. 下载生成的涂色图

## 🔧 API配置

### Replicate API
需要在 [Replicate](https://replicate.com/account/api-tokens) 获取API密钥

### 支持的模型
- **图生图**: `black-forest-labs/flux-kontext-pro`
- **文生图**: `minimax/image-01`

## 📂 项目结构

```
├── app/                    # Next.js App Router
│   ├── [locale]/          # 国际化路由
│   └── api/               # API路由
├── components/            # React组件
│   ├── ui/               # UI基础组件
│   └── blocks/           # 页面块组件
├── contexts/             # React Context
├── i18n/                # 国际化配置
├── lib/                 # 工具函数
└── types/               # TypeScript类型定义
```

## 🌟 更新日志

### v2.0.0 - 图生图相框效果
- ✨ 实现革命性的相框效果
- ✨ 原图内容100%保留
- ✨ 智能白边填充
- ✨ 支持三种长宽比

### v1.0.0 - 基础功能
- 🎉 图生图和文生图基础功能
- 🎉 Replicate API集成
- 🎉 响应式UI设计

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交Issues和Pull Requests！

## 📞 联系方式

如有问题或建议，请通过GitHub Issues联系。

---

**⭐ 如果这个项目对你有帮助，请给个Star支持一下！**
