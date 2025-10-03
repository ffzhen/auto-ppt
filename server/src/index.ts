import express from 'express'
import compression from 'compression'
import etag from 'etag'
import fs from 'fs'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import presentationRoutes from './routes/presentations'
import toolsRoutes from './routes/tools'
import aiRouter from './routes/ai'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3002

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Compression middleware - exclude streaming endpoints
app.use((req, res, next) => {
  // Skip compression for streaming endpoints
  const isStreamingRequest = 
    req.path.includes('/aippt_stream') || 
    req.path.includes('/stream') ||
    (req.path.includes('/api/tools/aippt') && req.body && req.body.stream === true) ||
    (req.path.includes('/api/tools/aippt_outline') && req.body && req.body.stream === true)
  
  if (isStreamingRequest) {
    return next()
  }
  return compression()(req, res, next)
})

// 提供静态文件服务（带缓存与压缩）
const publicDir = path.join(__dirname, '../public')

// 针对静态资源（图片、字体等）使用长效缓存
app.use('/assets', express.static(path.join(publicDir, 'assets'), {
  maxAge: '30d',
  immutable: true,
  etag: true,
  lastModified: true,
}))

// 为静态 JSON 模板文件增加协商缓存（ETag/Last-Modified），并要求必须重新验证
// 只对模板文件加缓存，不对其他文件加缓存
app.get('/assets/data/:name', (req, res, next) => {
  const filePath = path.join(publicDir, 'assets', 'data', req.params.name)
  
  // 只对模板文件加缓存（包含 template003.json / template_3.json 等命名形式）
  const templateFilePattern = /^(template\d+\.json|template_\d+\.json|template_custom\.json|custom_template\.json|slides\.json|AIPPT\.json|templates\.json)$/i
  const isTemplateFile = templateFilePattern.test(req.params.name)
  console.log(`文件 ${req.params.name} 是否为模板文件: ${!!isTemplateFile}`)
  if (!isTemplateFile) {
    // 非模板文件不缓存
    console.log(`设置 ${req.params.name} 为不缓存`)
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.setHeader('Pragma', 'no-cache')
    res.setHeader('Expires', '0')
    return next()
  }
  
  fs.stat(filePath, (err, stats) => {
    if (err) return next()

    // 设置 Last-Modified
    res.setHeader('Last-Modified', stats.mtime.toUTCString())

    // 设置 ETag
    try {
      const fileContent = fs.readFileSync(filePath)
      const tag = etag(fileContent, { weak: true })
      res.setHeader('ETag', tag)

      // 协商缓存验证
      if (req.headers['if-none-match'] === tag) {
        return res.status(304).end()
      }
      const ifModifiedSince = req.headers['if-modified-since']
      if (ifModifiedSince && new Date(ifModifiedSince) >= stats.mtime) {
        return res.status(304).end()
      }
    } catch (_) {
      // 忽略ETag计算错误，继续回退静态处理
    }

    // 为模板数据开启协商缓存，客户端可携带 ETag/Last-Modified 进行验证
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    next()
  })
}, express.static(path.join(publicDir, 'assets', 'data')))

// Serve the SSR demo page
app.get('/ssr-demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/ssr-demo.html'))
})

// API 路由中间件 - 确保所有 API 接口都不被缓存
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  next()
})

// Routes
app.use('/api/presentations', presentationRoutes)
app.use('/api/tools', toolsRoutes)
app.use('/api/ai', aiRouter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' })
})

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`Assets available at http://localhost:${PORT}/assets`)
  console.log(`API available at http://localhost:${PORT}/api`)
}) 
