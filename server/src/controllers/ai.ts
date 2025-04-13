import { Request, Response } from 'express';
import { AIService } from '../services/ai';

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
} 