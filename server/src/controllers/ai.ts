import type { Request, Response } from 'express';
import { AIService } from '../services/ai';
import imageService from '../services/image';

export class AIController {
  /**
   * AI PPT大纲生成
   */
  static async generateOutline(req: Request, res: Response): Promise<void> {
    try {
      const { content, language = 'zh', model = 'doubao-1.5-pro-32k', stream = false } = req.body;
      
      if (!content) {
        res.status(400).json({ error: '缺少必要的内容参数' });
        return;
      }
      
      // 流式响应
      if (stream) {
        // 设置流式响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 创建流处理器
        const handler = AIService.getStreamHandler(res);
        
        // 开始生成大纲
        AIService.generateOutlineStream(content, language, model, handler);
      } 
      // 非流式响应
      else {
        const result = await AIService.generateOutline(content, language, model);
        res.json(result);
      }
    } catch (error) {
      console.error('生成AI PPT大纲出错:', error);
      res.status(500).json({ error: '生成大纲时发生错误' });
    }
  }
  
  /**
   * AI PPT生成
   */
  static async generatePPT(req: Request, res: Response): Promise<void> {
    try {
      const { content, language = 'zh', model = 'doubao-1.5-pro-32k', stream = false } = req.body;
      
      if (!content) {
        res.status(400).json({ error: '缺少必要的内容参数' });
        return;
      }
      
      // 流式响应
      if (stream) {
        // 设置流式响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 创建流处理器
        const handler = AIService.getStreamHandler(res);
        
        // 开始生成PPT
        AIService.generatePPTStream(content, language, model, handler);
      } 
      // 非流式响应
      else {
        const result = await AIService.generatePPT(content, language, model);
        res.json(result);
      }
    } catch (error) {
      console.error('生成AI PPT出错:', error);
      res.status(500).json({ error: '生成PPT时发生错误' });
    }
  }

  // 图片生成（使用Coze工作流API）
  static async generateVolcengineImage(req: Request, res: Response) {
    try {
      const {
        prompt,
        workflow_id,
        api_token,
      } = req.body

      if (!prompt) {
        return res.status(400).json({ 
          error: 'prompt is required' 
        })
      }

      if (!workflow_id) {
        return res.status(400).json({ 
          error: 'workflow_id is required' 
        })
      }

      try {
        console.log('使用Coze工作流API生成图片...')
        
        // 调用Coze工作流API生成图片
        const result = await imageService.generateImageWithCoze({
          prompt,
          workflow_id,
          api_token
        })
        
        // 封装并返回结果
        return res.json(result)
      } catch (apiError) {
        console.error('API Error:', apiError)
        
        // 返回API错误给调用方
        return res.status(500).json({
          error: 'Image generation failed',
          message: apiError instanceof Error ? apiError.message : '未知错误'
        })
      }
    } catch (error) {
      console.error('Error generating image:', error)
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : '未知错误'
      })
    }
  }
} 