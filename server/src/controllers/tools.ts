import { Request, Response } from 'express';
import { AIService } from '../services/ai';
import * as path from 'path';
import * as fs from 'fs';

export const ToolsController = {
  /**
   * 生成AI PPT大纲
   */
  async generateAIPPTOutline(req: Request, res: Response) {
    try {
      const { content, language = 'zh', model = 'doubao-1.5-pro-32k', stream = false } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: '内容不能为空' });
      }
      
      // 判断是否为流式响应
      const isStream = stream === true;
      
      if (isStream) {
        // 设置流式响应
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 获取流式处理器
        const streamHandler = AIService.getStreamHandler(res);
        
        // 调用AI服务生成大纲（流式）
        await AIService.generateOutlineStream(content, language, model, streamHandler);
      } else {
        // 调用AI服务生成大纲（非流式）
        const outline = await AIService.generateOutline(content, language, model);
        res.status(200).json(outline);
      }
    } catch (error) {
      console.error('生成AI PPT大纲出错:', error);
      res.status(500).json({ message: '生成AI PPT大纲失败' });
    }
  },
  
  /**
   * 生成完整AI PPT
   */
  async generateAIPPT(req: Request, res: Response) {
    try {
      const { content, language = 'zh', model = 'doubao-1.5-pro-32k', stream = false } = req.body;
      
      if (!content) {
        return res.status(400).json({ message: '内容不能为空' });
      }
      
      // 判断是否为流式响应
      const isStream = stream === true;
      
      if (isStream) {
        // 设置流式响应
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        
        // 获取流式处理器
        const streamHandler = AIService.getStreamHandler(res);
        
        // 调用AI服务生成PPT（流式）
        await AIService.generatePPTStream(content, language, model, streamHandler);
      } else {
        // 调用AI服务生成PPT（非流式）
        const ppt = await AIService.generatePPT(content, language, model);
        res.status(200).json(ppt);
      }
    } catch (error) {
      console.error('生成AI PPT出错:', error);
      res.status(500).json({ message: '生成AI PPT失败' });
    }
  }
}; 