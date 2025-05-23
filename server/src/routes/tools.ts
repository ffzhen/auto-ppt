import { Router } from 'express'
import { ToolsController } from '../controllers/tools'
import type { Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { AIService } from '../services/ai'

const router = Router()

// AI PPT大纲生成
router.post('/aippt_outline', ToolsController.generateAIPPTOutline)

// AI PPT生成
router.post('/aippt', ToolsController.generateAIPPT)

// Markdown 转 HTML
router.post('/markdown2html', ToolsController.generateMarkdownToHTML)

router.post('/aippt_stream', async (req: Request, res: Response) => {
  try {
    const { content, language = 'zh', model = 'gpt-3.5-turbo' } = req.body

    if (!content) {
      return res.status(400).json({ error: '缺少必要参数 content' })
    }

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const streamHandler = AIService.getStreamHandler(res)

    // 第一步：生成大纲
    await AIService.generateOutlineStream(content, language, model, streamHandler)
    
    // 发送大纲完成标记
    streamHandler.write(JSON.stringify({
      type: 'outline_complete',
      data: 'outline_complete'
    }))

    // 第二步：根据大纲生成幻灯片
    await AIService.generatePPTStream(content, language, model, streamHandler)
    
    streamHandler.end()
  }
  catch (error) {
    console.error('生成PPT出错：', error)
    res.status(500).json({ error: '生成PPT失败' })
  }
})

export default router 