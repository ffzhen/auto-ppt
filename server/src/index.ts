import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import presentationRoutes from './routes/presentations'
import toolsRoutes from './routes/tools'
import aiRouter from './routes/ai'
import config from './config'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 提供静态文件服务
const publicDir = path.join(__dirname, '../public')


// 自定义中间件处理静态文件请求
app.use('/assets', (req, res, next) => {
  const arkApiKey = req.headers['arkapikey']
  const endpointId = req.headers['endpointid']
  
  if (arkApiKey && typeof arkApiKey === 'string') {
    config.setArkApiKey(arkApiKey)
  }
  
  if (endpointId && typeof endpointId === 'string') {
    config.setEndpointId(endpointId)
  }
  
  console.log('加载33', {
    arkApiKey,
    endpointId,
    path: req.path
  })
  
  // 继续处理静态文件请求
  express.static(path.join(publicDir, 'assets'))(req, res, next)
})

// Serve the SSR demo page
app.get('/ssr-demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/ssr-demo.html'))
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