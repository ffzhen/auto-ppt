import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';

// 加载环境变量
dotenv.config();

// 火山引擎配置
const VOLC_API_KEY = process.env.VOLC_API_KEY || '';
const VOLC_ENDPOINT_ID = process.env.VOLC_ENDPOINT_ID || '';

// 模拟数据目录
const MOCK_DATA_DIR = path.join(__dirname, '../../public/assets/data/mock_ai');

// 确保模拟数据目录存在
if (!fs.existsSync(MOCK_DATA_DIR)) {
  fs.mkdirSync(MOCK_DATA_DIR, { recursive: true });
}

// 创建OpenAI客户端（使用ARK API兼容接口）
const openai = new OpenAI({
  apiKey: process.env.ARK_API_KEY,
  baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
});

// 封装流式处理器
interface StreamHandler {
  write: (chunk: string) => void;
  end: () => void;
}

/**
 * 模拟调用大语言模型API
 */
async function callLLMApi(prompt: string, model: string): Promise<string> {
  // 记录请求
  const requestId = Date.now().toString();
  const requestLog = {
    requestId,
    timestamp: new Date().toISOString(),
    prompt,
    model
  };
  
  // 保存请求日志
  const requestLogPath = path.join(MOCK_DATA_DIR, `request_${requestId}.json`);
  fs.writeFileSync(requestLogPath, JSON.stringify(requestLog, null, 2));
  
  // 模拟API延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 提取主题
  const topic = prompt.includes('主题:') 
    ? prompt.split('主题:')[1].split('\n')[0].trim()
    : (prompt.includes('Topic:') 
       ? prompt.split('Topic:')[1].split('\n')[0].trim() 
       : '未指定主题');
  
  console.log(`处理主题: ${topic}`);
  
  // 根据提示词语言确定返回语言
  const isEnglish = prompt.includes('Generate a Xiaohongshu (RED) style content outline');
  
  // 默认模板 - 这是一个基础模板，在真实环境中会被LLM回答替代
  return isEnglish 
    ? `# 5 Amazing Ways to ${topic} That Will Change Your Life!

## 1. The Game-Changing Method Everyone's Talking About
- Found this technique accidentally and it completely transformed my approach
- Works 3x better than traditional methods
- You'll see results in just 2 days

## 2. Secret Tools the Pros Use
- These aren't expensive - most under $20!
- The second tool saved me 5 hours every week
- Pro tip: combine the first and third for best results

## 3. Common Mistakes to Avoid
- I made these errors for years and wasted so much time
- The biggest mistake is actually the easiest to fix
- Before and after: my results improved 80% after changing this one habit

## 4. Quick Daily Routine for Success
- Takes only 10 minutes each morning
- The perfect sequence I discovered after months of testing
- How to adapt it for beginners vs advanced practitioners

## 5. My Personal Experience & Results
- Started from zero knowledge just 6 months ago
- Progress timeline: what to expect at 1 week, 1 month, 3 months
- The unexpected benefits nobody talks about

## Let me know in the comments if you've tried any of these methods! What worked best for you? Drop a ❤️ if you found this helpful and I'll share more tips soon! #${topic.replace(/\s+/g, '')} #LifeHacks #GameChanger`
    : `# 我尝试了5种${topic}的方法，第3种彻底惊艳到我！

## 01 | 无意中发现的神仙方法
- 偶然发现这个技巧，完全改变了我的思路
- 比传统方法效果好3倍
- 只需2天就能看到明显效果

## 02 | 大神都在用的秘密工具
- 这些工具都不贵，大多数不到100元
- 第二个工具每周为我节省5小时
- 小技巧：结合第一个和第三个工具效果最佳

## 03 | 新手常犯的错误（我踩过的坑）
- 这些错误我犯了好几年，浪费了太多时间
- 最大的误区其实最容易解决
- 前后对比：改掉这个习惯后，效果提升了80%

## 04 | 每日10分钟小习惯
- 每天早上只需10分钟
- 经过数月测试发现的完美流程
- 新手和进阶者如何调整难度

## 05 | 我的亲身经历和变化
- 6个月前我还是零基础小白
- 进度时间线：1周、1个月、3个月分别能达到什么水平
- 没人告诉你的意外收获

## 评论区告诉我你尝试过哪种方法？哪个效果最好？如果觉得有帮助点个❤️，我会分享更多干货！#${topic.replace(/\s+/g, '')} #生活技巧 #经验分享`;
}

/**
 * 使用OpenAI SDK调用ARK API
 */
async function callOpenAI(systemPrompt: string, userPrompt: string, model: string, options: any = {}): Promise<string> {
  // 记录请求
  const requestId = Date.now().toString();
  const requestLog = {
    requestId,
    timestamp: new Date().toISOString(),
    systemPrompt,
    userPrompt,
    model,
    options
  };
  
  // 保存请求日志
  const requestLogPath = path.join(MOCK_DATA_DIR, `request_openai_${requestId}.json`);
  fs.writeFileSync(requestLogPath, JSON.stringify(requestLog, null, 2));
  
  // 检查是否配置了API密钥
  if (!process.env.ARK_API_KEY) {
    console.warn('ARK API密钥未配置，使用模拟响应');
    return await callLLMApi(userPrompt, model);
  }
  
  try {
    console.log(`使用OpenAI SDK调用ARK API（${model}）...`);

    // 使用OpenAI SDK调用ARK API
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt } as ChatCompletionMessageParam,
        { role: 'user', content: userPrompt } as ChatCompletionMessageParam,
      ],
      model: model || 'ep-20250411144626-zx55l',
      ...options
    });
    
    // 保存响应
    const responsePath = path.join(MOCK_DATA_DIR, `response_openai_${requestId}.json`);
    fs.writeFileSync(responsePath, JSON.stringify(completion, null, 2));
    
    return completion.choices[0]?.message?.content || '';
    
  } catch (error) {
    console.error('使用OpenAI SDK调用ARK API出错:', error);
    
    // 调用失败时，使用模拟函数作为备份
    console.log('使用模拟数据作为备份');
    return await callLLMApi(userPrompt, model);
  }
}

/**
 * 调用火山引擎大语言模型API
 */
async function callVolcLLMApi(prompt: string, model: string, options: any = {}): Promise<string> {
  // 记录请求
  const requestId = Date.now().toString();
  const requestLog = {
    requestId,
    timestamp: new Date().toISOString(),
    prompt,
    model,
    options
  };
  
  // 保存请求日志
  const requestLogPath = path.join(MOCK_DATA_DIR, `request_${requestId}.json`);
  fs.writeFileSync(requestLogPath, JSON.stringify(requestLog, null, 2));
  
  // 检查是否配置了API密钥
  if (!process.env.ARK_API_KEY) {
    console.warn('ARK API密钥未配置，使用模拟响应');
    return await callLLMApi(prompt, model);
  }
  
  try {
    // ARK API调用 (使用OpenAI兼容接口)
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    
    // 默认参数
    const defaultParams = {
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 1
    };
    
    // 合并用户参数
    const parameters = {
      ...defaultParams,
      ...options
    };
    
    // 从prompt构建messages
    const messages = [
      { role: 'system', content: '你是一个擅长创建小红书风格内容和大纲的AI助手。' },
      { role: 'user', content: prompt }
    ];
    
    const requestData = {
      model: model || 'ep-20250411144626-zx55l', // 默认使用ARK模型
      messages: messages,
      ...parameters
    };
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ARK_API_KEY}`
    };
    
    console.log('正在调用ARK大模型API...', {
      model: requestData.model,
      temperature: parameters.temperature
    });
    
    const response = await axios.post(apiUrl, requestData, { headers });
    
    if (response.status === 200 && response.data && response.data.choices && response.data.choices.length > 0) {
      // 保存响应
      const responsePath = path.join(MOCK_DATA_DIR, `response_${requestId}.json`);
      fs.writeFileSync(responsePath, JSON.stringify(response.data, null, 2));
      
      // 提取并返回模型生成的文本
      return response.data.choices[0].message.content;
    } else {
      console.error('ARK API调用失败:', response.data);
      throw new Error('API响应格式错误');
    }
  } catch (error) {
    console.error('调用ARK API出错:', error);
    
    // 调用失败时，使用模拟函数作为备份
    console.log('使用模拟数据作为备份');
    return await callLLMApi(prompt, model);
  }
}

/**
 * 流式调用ARK大语言模型API
 */
async function callVolcLLMApiStream(prompt: string, model: string, handler: StreamHandler, options: any = {}): Promise<void> {
  // 记录请求
  const requestId = Date.now().toString();
  const requestLog = {
    requestId,
    timestamp: new Date().toISOString(),
    prompt,
    model,
    options,
    stream: true
  };
  
  // 保存请求日志
  const requestLogPath = path.join(MOCK_DATA_DIR, `request_stream_${requestId}.json`);
  fs.writeFileSync(requestLogPath, JSON.stringify(requestLog, null, 2));
  
  // 检查是否配置了API密钥
  if (!process.env.ARK_API_KEY) {
    console.warn('ARK API密钥未配置，使用模拟流式响应');
    
    // 获取模拟内容并按行发送
    const mockContent = await callLLMApi(prompt, model);
    const lines = mockContent.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        handler.write(line);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    handler.end();
    return;
  }
  
  try {
    // ARK API流式调用 (使用OpenAI兼容接口)
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    
    // 默认参数
    const defaultParams = {
      temperature: 0.7,
      max_tokens: 2000,
      top_p: 1,
      stream: true
    };
    
    // 合并用户参数
    const parameters = {
      ...defaultParams,
      ...options
    };
    
    // 从prompt构建messages
    const messages = [
      { role: 'system', content: '你是一个擅长创建小红书风格内容和大纲的AI助手。' },
      { role: 'user', content: prompt }
    ];
    
    const requestData = {
      model: model || 'ep-20250411144626-zx55l', // 默认使用ARK模型
      messages: messages,
      ...parameters
    };
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.ARK_API_KEY}`
    };
    
    console.log('正在调用ARK流式API...', {
      model: requestData.model,
      temperature: parameters.temperature,
      stream: true
    });
    
    // 发送流式请求
    const response = await axios.post(apiUrl, requestData, { 
      headers,
      responseType: 'stream'
    });
    
    // 处理流式响应
    let lineBuffer = '';
    response.data.on('data', (chunk: Buffer) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.substring(6);
          if (data === '[DONE]') continue;
          
          try {
            const jsonData = JSON.parse(data);
            const content = jsonData.choices[0]?.delta?.content;
            
            if (content) {
              // 积累内容到行缓冲区
              lineBuffer += content;
              
              // 如果包含换行符，按行处理
              if (content.includes('\n')) {
                const parts = lineBuffer.split('\n');
                // 保留最后一部分（可能不是完整行）
                lineBuffer = parts.pop() || '';
                
                // 发送完整的行
                let lineCounter = 0; // 行号计数器
                for (const part of parts) {
                  lineCounter++;
                  if (part.trim()) {
                    handler.write(`${lineCounter}. ${part}\n`);
                  } else {
                    // 空行也有行号
                    handler.write(`${lineCounter}. \n`);
                  }
                }
              }
            }
          } catch (err) {
            console.error('解析流式数据出错:', err);
          }
        }
      }
    });
    
    // 处理完成
    response.data.on('end', () => {
      console.log('ARK流式响应完成');
      // 发送任何剩余的内容
      if (lineBuffer.trim()) {
        handler.write(lineBuffer);
      }
      handler.end();
    });
    
    // 处理错误
    response.data.on('error', (err: Error) => {
      console.error('ARK流式响应出错:', err);
      handler.end();
    });
    
  } catch (error) {
    console.error('调用ARK流式API出错:', error);
    
    // 调用失败时，使用模拟函数作为备份
    console.log('使用模拟数据作为流式备份');
    const mockContent = await callLLMApi(prompt, model);
    const lines = mockContent.split('\n');
    
    for (const line of lines) {
      if (line.trim()) {
        handler.write(line);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    handler.end();
  }
}

/**
 * 使用OpenAI SDK调用API（流式）
 */
async function callOpenAIStream(
  systemPrompt: string,
  userPrompt: string, 
  model: string, 
  handler: StreamHandler,
  options: any = {}
): Promise<void> {
  const requestId = uuidv4();
  console.log(`[${requestId}] OpenAI API Stream请求开始`, new Date().toISOString());
  console.log(`[${requestId}] 系统提示词:`, systemPrompt.substring(0, 100) + '...');
  console.log(`[${requestId}] 用户提示词:`, userPrompt.substring(0, 100) + '...');
  
  // 获取API密钥
  const apiKey = process.env.ARK_API_KEY || process.env.VOLC_API_KEY;
  
  if (!apiKey) {
    console.warn(`[${requestId}] 未配置API密钥，使用模拟响应`);
    
    // 模拟数据
    const mockData = '# 10个提高工作效率的实用技巧\n\n## 高效时间管理\n- 使用番茄工作法，25分钟专注工作，5分钟短暂休息\n- 制定每日三件最重要的事情清单\n- 避免多任务处理，专注单一任务\n\n## 工作环境优化\n- 保持桌面整洁，减少视觉干扰\n- 准备一个专注工作的安静空间\n- 调整适合的光线和温度\n\n## 数字工具利用\n- 使用任务管理软件追踪待办事项\n- 设置自动化流程减少重复工作\n- 学习键盘快捷键提高操作速度\n\n## 身心健康维护\n- 保持规律作息和充足睡眠\n- 工作间隙进行简短的伸展运动\n- 保持适当水分摄入和健康饮食\n\n## 持续学习与成长\n- 每天留出时间阅读专业书籍或文章\n- 参加行业研讨会或在线课程\n- 寻找导师或加入同行社群交流经验\n\n这些方法帮助你事半功倍，欢迎在评论区分享你的高效工作技巧！\n#效率提升 #时间管理 #职场技巧';
    
    // 将模拟数据按行切分，逐行发送
    const lines = mockData.split('\n');
    for (const line of lines) {
      // 直接返回文本内容，不包装为JSON对象
      handler.write(line);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    handler.end();
    console.log(`[${requestId}] 模拟响应结束`);
    return;
  }
  
  try {
    // 创建OpenAI客户端实例
    const openai = new OpenAI({
      apiKey,
      baseURL: 'https://ark.cn-beijing.volces.com/api/v3', // 方舟API基础URL
    });
    
    // 设置默认参数
    const params = {
      model: model || 'qwen-max',
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 3000,
      stream: true,
      ...options
    };
    
    // 构建messages数组
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt
      } as ChatCompletionMessageParam,
      {
        role: 'user',
        content: userPrompt
      } as ChatCompletionMessageParam
    ];
    
    console.log(`[${requestId}] 调用OpenAI API流式请求:`, {
      model: params.model,
      temperature: params.temperature,
      max_tokens: params.max_tokens
    });
    
    // 发起流式请求
    const stream = await openai.chat.completions.create({
      model: params.model,
      messages,
      temperature: params.temperature,
      max_tokens: params.max_tokens,
      stream: true
    });
    
    // 处理流式响应
    let lineBuffer = '';
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // 将内容添加到行缓冲区
        lineBuffer += content;
        
        // 检查是否包含换行符
        if (content.includes('\n')) {
          // 按行分割并处理
          const lines = lineBuffer.split('\n');
          // 最后一部分可能不是完整的行，保留在缓冲区
          lineBuffer = lines.pop() || '';
          
          // 发送完整的行
          for (const line of lines) {
            if (line.trim()) {
              handler.write(line + '\n');
            } else {
              // 发送空行
              handler.write('\n');
            }
          }
        }
      }
    }
    
    // 处理最后剩余的内容
    if (lineBuffer.trim()) {
      handler.write(lineBuffer);
    }
    
    handler.end();
    console.log(`[${requestId}] OpenAI API流式请求完成`);
    
  } catch (error) {
    console.error(`[${requestId}] OpenAI API流式请求失败:`, error);
    
    // 发送错误信息
    handler.write('调用AI服务失败，请稍后重试');
    handler.end();
  }
}

export const AIService = {
  /**
   * 获取流式处理器
   */
  getStreamHandler(res: Response): StreamHandler {
    // 设置响应头（纯文本）
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    
    return {
      write: (chunk: string) => {
        // 直接写入纯文本，不使用SSE格式
        res.write(chunk);
        res.flushHeaders();
      },
      end: () => {
        res.end();
      }
    };
  },

  /**
   * 生成AI PPT大纲（非流式）
   */
  async generateOutline(content: string, language: string, model: string): Promise<any> {
    // 获取大纲文本
    const outlineText = await this.getOutlineTextByContent(content, model, language);
    
    // 解析为大纲对象
    const outline = this.parseOutlineFromContent(outlineText);
    
    // 保存为本地文件，方便调试
    const fileName = `outline_${Date.now()}.json`;
    const filePath = path.join(MOCK_DATA_DIR, fileName);
    fs.writeFileSync(filePath, JSON.stringify(outline, null, 2));
    
    return { outline };
  },

  /**
   * 生成AI PPT大纲（流式）
   */
  async generateOutlineStream(
    content: string, 
    language: string, 
    model: string, 
    handler: StreamHandler
  ): Promise<void> {
    console.log(`生成${language === 'zh' ? '中文' : '英文'}小红书内容大纲，使用流式响应...`);
    
    // 设置系统提示词
    const systemPrompt = language === 'zh' 
      ? '你是一个擅长创建小红书风格内容和大纲的AI助手。请用Markdown格式输出，使用"#"作为标题，"-"作为要点。'
      : 'You are an AI assistant specialized in creating Xiaohongshu (RED) style content outlines. Please output in Markdown format, using "#" for titles and "-" for bullet points.';
    
    // 构建用户提示词
    let userPrompt = '';
    
    if (language === 'zh') {
      // 中文提示词
      userPrompt = `
请为以下主题生成一个小红书风格的分享内容大纲，使用Markdown格式，遵循以下结构：
1. 使用"# "作为封面标题（吸引人且简洁）
2. 使用"## "作为内容页小标题（通常3-5个内容点）
3. 使用"### "作为每个内容点的子标题（如有必要）
4. 使用"- "作为要点，每个要点简洁有力

主题: ${content}

要求:
- 封面标题要有吸引力，可以使用数字、问句或情感词汇增加吸引力
- 内容页要精简易懂，包含实用信息和个人经验
- 每个内容点要直击痛点或提供解决方案
- 最后有一个结尾/总结段落，鼓励互动
- 语言风格要轻松亲切，像朋友间分享
- 请输出格式化好的Markdown文本,不要输出任何其他内容,不要带markdown的标记
`;
    } else {
      // 英文提示词
      userPrompt = `
Generate a Xiaohongshu (RED) style content outline for the following topic using Markdown format, following this structure:
1. Use "# " for cover title (attractive and concise)
2. Use "## " for content section titles (usually 3-5 content points)
3. Use "### " for subtitles within each content section (if necessary)
4. Use "- " for bullet points, each point should be concise and impactful

Topic: ${content}

Requirements:
- The cover title should be attractive, using numbers, questions, or emotional words
- Content sections should be concise and easy to understand, containing practical information and personal experience
- Each content point should address pain points or provide solutions
- Include a conclusion section at the end that encourages interaction
- The language style should be casual and friendly, like sharing with friends
- Output as properly formatted Markdown text
`;
    }
    
    // 设置模型参数
    const modelParams = {
      temperature: 0.7,
      max_tokens: 3000
    };
    
    // 使用OpenAI SDK流式API直接生成内容
    await callOpenAIStream(systemPrompt, userPrompt, model, handler, modelParams);
  },
  
  getCardPrompt(content: string, language: string): string {
    return language === 'zh' ? 
      `请根据以下主题生成一个完整卡片的JSON数据。主题: ${content}` : 
      `Please generate complete card JSON data based on the following topic. Topic: ${content}`;
  },
  getCardSystemPrompt(language: string): string {
    return language === 'zh' ? 
      `你是一个生成PPT内容的专家。请严格按照以下JSON格式生成内容，不要添加额外的文本、注释或标记。格式如下：` : 
      `You are an expert in generating PPT content. Please generate content strictly in the following JSON format without any additional text, comments, or markup. Format as follows:`;
  },
  /**
   * 获取PPT生成的提示词
   */
  getPPTPrompt(content: string, language: string, isStream: boolean = false): { systemPrompt: string, prompt: string } {
    // 构建用户提示词
    const prompt = `请根据以下主题生成一个完整卡片的JSON数据。主题: ${content}`;
    
    // 系统提示词 - 统一使用中文提示词
    const systemPrompt = `你是一个生成卡片内容的专家。请输出以下格式的完整JSON对象，每个对象代表一页卡片,生成的文案可以是html片段，自动添加eomji和html高亮元素：

1. 首先输出封面页：标题符合小红书爆款标题特性，主副标题由完整标题拆分得到，例如："一年级家长必看！幼小衔接全攻略"拆分得到"一年级家长必看"和"幼小衔接全攻略"
{
  "type": "cover",
  "data": {
    "title": "主标题（7-14字）",
    "text": "副标题（7-14字）"
  }
}

2. 内容页有2种格式随机生成，items中至少3个要点,很重要！
内容1:{
  "type": "content",
  "data": {
    "title": "页面标题",
    "header":"引言（60-80字，背景和引言）",
    "footer":"结语（非必选，footer出现时必须有header，20-40字，总结与呼吁）",
    "items": [
      {
        "title": "要点标题1",
        "text": "要点内容1（20-40字）"
      },
      {
        "title": "要点标题2",
        "text": "要点内容2（20-40字）"
      },
      {
        "title": "要点标题3",
        "text": "要点内容3（20-40字）"
      }
    ]
  }
}
  内容2:没有header或footer时
  {
  "type": "content",
  "data": {
    "title": "页面标题",
    "items": [
      {
        "title": "要点标题1（4-6字）",
        "text": "要点内容1（70-90字）"
      },
      {
        "title": "要点标题2（4-6字）",
        "text": "要点内容2（70-90字）"
      },
      {
        "title": "要点标题3（4-6字）",
        "text": "要点内容3（70-90字）"
      }
    ]
  }
}

3. 最后输出结束页：
{
  "type": "end",
  "data": {
    "content": "结束内容（70-90字）",
    "title": "谢谢观看"
  }
}

重要说明：
- ${isStream ? '每个对象输出后会立即处理，所以确保每个对象都独立有效' : '所有对象应该组成一个有效的JSON数组'}
- 内容对象至少包含3个要点，内容要符合主题风格
- 所有输出必须是有效的JSON格式，不要包含额外的注释或说明文字
- ${isStream ? '输出时请每个对象独立成行，不要将多个对象连在一起' : '请将所有对象放在一个JSON数组中，格式为 [对象1, 对象2, 对象3,...]'}`;

    return { systemPrompt, prompt };
  },

  /**
   * 生成AI PPT（非流式）
   */
  async generatePPT(content: string, language: string, model: string): Promise<any> {
    console.log(`生成${language === 'zh' ? '中文' : '英文'}PPT数据，非流式响应`);
    
    // 获取提示词
    const { systemPrompt, prompt } = this.getPPTPrompt(content, language, false);
    
    // 使用OpenAI SDK调用ARK API
    const response = await callOpenAI(systemPrompt, prompt, model, {
      temperature: 0.7,
      max_tokens: 4000
    });
    
    try {
      // 尝试解析返回的JSON数据
      let slides = [];
      
      // 查找JSON数据的起始和结束位置
      const startIndex = response.indexOf('[');
      const endIndex = response.lastIndexOf(']') + 1;
      
      if (startIndex !== -1 && endIndex !== -1) {
        const jsonText = response.substring(startIndex, endIndex);
        slides = JSON.parse(jsonText);
      } else {
        console.warn('无法在响应中找到有效的JSON数据，使用模拟数据');
        // 使用模拟幻灯片数据
        slides = [
          {
            "type": "cover",
            "data": {
              "title": content,
              "text": "自动生成的演示文稿"
            }
          },
          {
            "type": "contents",
            "data": {
              "items": ["简介", "主要内容", "总结"]
            }
          },
          {
            "type": "end",
            "data": {
              "content": "感谢观看",
              "title": "谢谢"
            }
          }
        ];
      }
      
      // 保存为本地文件，方便调试
      const fileName = `ppt_${Date.now()}.json`;
      const filePath = path.join(MOCK_DATA_DIR, fileName);
      fs.writeFileSync(filePath, JSON.stringify(slides, null, 2));
      
      return slides;
    } catch (error) {
      console.error('解析AI生成的PPT数据失败:', error);
      return { 
        error: '生成PPT数据解析失败',
        rawResponse: response
      };
    }
  },

  /**
   * 生成AI PPT（流式）
   */
  async generatePPTStream(
    content: string, 
    language: string, 
    model: string, 
    handler: StreamHandler
  ): Promise<void> {
    console.log(`生成${language === 'zh' ? '中文' : '英文'}PPT数据，逐对象流式响应`);

    // 用于对象计数和状态追踪
    let objectCounter = 0;
    let currentObj = '';
    let bracketCount = 0;
    let inObject = false;
    let debugLog = '';
    
    // 创建一个解析处理器
    const jsonParserHandler: StreamHandler = {
      write: (chunk: string) => {
        console.log(`[AIPPT Stream] 收到数据块: ${chunk.length}字节`);
        debugLog += chunk;
        
        // 逐字符分析，查找完整JSON对象
        for (let i = 0; i < chunk.length; i++) {
          const char = chunk[i];
          
          // 检测对象开始
          if (char === '{' && !inObject) {
            console.log(`[AIPPT Stream] 检测到新对象开始位置: ${i}`);
            inObject = true;
            bracketCount = 1;
            currentObj = '{';
          }
          // 在对象内部
          else if (inObject) {
            currentObj += char;
            
            // 计算括号平衡
            if (char === '{') {
              bracketCount++;
            } else if (char === '}') {
              bracketCount--;
              
              // 对象结束，解析并发送完整对象
              if (bracketCount === 0) {
                try {
                  // 检查是否为有效JSON
                  const jsonObj = JSON.parse(currentObj);
                  console.log(`[AIPPT Stream] 成功解析对象 #${objectCounter + 1}, 类型: ${jsonObj.type}`);
                  
                  // 将完整对象发送给客户端
                  handler.write(currentObj);
                  
                  // 重置状态
                  inObject = false;
                  currentObj = '';
                  objectCounter++;
                } catch (e: any) {
                  // 对象解析失败，记录错误但继续处理
                  console.error(`[AIPPT Stream] JSON解析失败: ${e.message || '未知错误'}`);
                  console.error(`[AIPPT Stream] 问题对象内容: ${currentObj.substring(0, 100)}...`);
                  inObject = false;
                  currentObj = '';
                }
              }
            }
          }
        }
      },
      end: () => {
        // 记录处理结束
        console.log(`[AIPPT Stream] 数据流结束，总共解析了 ${objectCounter} 个对象`);
        if (currentObj) {
          console.log(`[AIPPT Stream] 存在未完成对象: ${currentObj.substring(0, 100)}...`);
        }
        
        // 处理最后剩余的部分对象
        if (inObject && currentObj) {
          try {
            const obj = JSON.parse(currentObj);
            console.log(`[AIPPT Stream] 解析最终对象，类型: ${obj.type}`);
            handler.write(JSON.stringify(obj));
            objectCounter++;
          } catch (e: any) {
            // 对象解析失败，记录错误但继续处理
            console.error(`[AIPPT Stream] JSON解析失败: ${e.message || '未知错误'}`);
            console.error(`[AIPPT Stream] 问题对象内容: ${currentObj.substring(0, 100)}...`);
            inObject = false;
            currentObj = '';
          }
        }
        
        // 如果没有生成任何对象，返回备用数据
        if (objectCounter === 0) {
          console.warn('[AIPPT Stream] 未能解析任何有效PPT对象，使用备用数据');
          console.log('[AIPPT Stream] 调试：完整响应内容:');
          console.log(debugLog);
          
          const fallbackSlides = [
            {
              "type": "cover",
              "data": {
                "title": content,
                "text": "自动生成的演示文稿"
              }
            },
            {
              "type": "contents",
              "data": {
                "items": ["简介", "主要内容", "总结"]
              }
            },
            {
              "type": "end",
              "data": {
                "content": "感谢观看",
                "title": "谢谢"
              }
            }
          ];
          
          for (const slide of fallbackSlides) {
            handler.write(JSON.stringify(slide));
          }
        }
        
        handler.end();
        console.log(`[AIPPT Stream] 流处理完成，总计返回 ${objectCounter} 个对象`);
      }
    };
    
    try {
      // 获取提示词
      const { systemPrompt, prompt } = this.getPPTPrompt(content, language, true);
      
      // 使用流式API，通过自定义处理器捕获和解析返回的JSON对象
      console.log('[AIPPT Stream] 调用OpenAI流式API');
      await callOpenAIStream(systemPrompt, prompt, model, jsonParserHandler, {
        temperature: 0.7,
        max_tokens: 10000
      });
      
    } catch (error: any) {
      console.error(`[AIPPT Stream] 生成PPT流出错: ${error.message || '未知错误'}`);
      console.error(error.stack || '无堆栈信息');
      handler.write(JSON.stringify({
        type: "error",
        data: { message: "生成过程中出错，请稍后重试" }
      }));
      handler.end();
    }
  },

  /**
   * 根据内容获取对应的大纲文本
   */
  async getOutlineTextByContent(content: string, model: string = 'ep-20250411144626-zx55l', language: string = 'zh'): Promise<string> {
    console.log(`生成${language === 'zh' ? '中文' : '英文'}小红书内容大纲...`);
    
    // 设置系统提示词
    const systemPrompt = language === 'zh' 
      ? '你是一个擅长创建小红书风格内容和大纲的AI助手。请用Markdown格式输出，使用"#"作为标题，"-"作为要点。'
      : 'You are an AI assistant specialized in creating Xiaohongshu (RED) style content outlines. Please output in Markdown format, using "#" for titles and "-" for bullet points.';
    
    // 构建用户提示词
    let userPrompt = '';
    
    if (language === 'zh') {
      // 中文提示词
      userPrompt = `
请为以下主题生成一个小红书风格的分享内容大纲，使用Markdown格式，遵循以下结构：
1. 使用"# "作为封面标题（吸引人且简洁）
2. 使用"## "作为内容页小标题（通常3-5个内容点）
3. 使用"### "作为每个内容点的子标题（如有必要）
4. 使用"- "作为要点，每个要点简洁有力

主题: ${content}

要求:
- 封面标题要有吸引力，可以使用数字、问句或情感词汇增加吸引力
- 内容页要精简易懂，包含实用信息和个人经验
- 每个内容点要直击痛点或提供解决方案
- 最后有一个结尾/总结段落，鼓励互动
- 语言风格要轻松亲切，像朋友间分享
- 请输出格式化好的Markdown文本
`;
    } else {
      // 英文提示词
      userPrompt = `
Generate a Xiaohongshu (RED) style content outline for the following topic using Markdown format, following this structure:
1. Use "# " for cover title (attractive and concise)
2. Use "## " for content section titles (usually 3-5 content points)
3. Use "### " for subtitles within each content section (if necessary)
4. Use "- " for bullet points, each point should be concise and impactful

Topic: ${content}

Requirements:
- The cover title should be attractive, using numbers, questions, or emotional words
- Content sections should be concise and easy to understand, containing practical information and personal experience
- Each content point should address pain points or provide solutions
- Include a conclusion section at the end that encourages interaction
- The language style should be casual and friendly, like sharing with friends
- Output as properly formatted Markdown text
`;
    }
    
    // 设置模型参数
    const modelParams = {
      temperature: 0.7,
      max_tokens: 3000
    };
    
    // 使用OpenAI SDK调用ARK API
    try {
      return await callOpenAI(systemPrompt, userPrompt, model, modelParams);
    } catch (error) {
      console.error('调用ARK API失败，使用模拟数据:', error);
      return await callLLMApi(userPrompt, model);
    }
  },

  /**
   * 解析大纲文本为大纲对象数组
   */
  parseOutlineFromContent(outlineText: string): any[] {
    const lines = outlineText.split('\n');
    
    const outline = [];
    let currentLevel = 0;
    
    for (const line of lines) {
      if (line.startsWith('#')) {
        // 处理标题行
        let level = 0;
        let title = line;
        
        if (line.startsWith('# ')) {
          level = 1;
          title = line.substring(2);
        } else if (line.startsWith('## ')) {
          level = 2;
          title = line.substring(3);
        } else if (line.startsWith('### ')) {
          level = 3;
          title = line.substring(4);
        }
        
        if (level > 0) {
          outline.push({
            title: title.trim(),
            level: level
          });
          currentLevel = level;
        }
      } else if (line.startsWith('- ') && currentLevel > 0) {
        // 处理要点
        outline.push({
          title: line.substring(2).trim(),
          level: currentLevel + 1,
          isBullet: true
        });
      }
    }
    
    return outline;
  },

  /**
   * 创建小红书结尾卡片
   */
  createEndingSlide(content: string): any {
    // 提取标签
    const tags = content.match(/#[\w\u4e00-\u9fa5]+/g) || ['#小红书', '#经验分享', '#生活技巧'];
    const tagsHtml = tags.map(tag => `<span style="color: #FF2E63; font-weight: bold;">${tag}</span>`).join(' ');
    
    return {
      id: `slide_${uuidv4()}`,
      background: {
        type: 'solid',
        color: '#FFF1F2'
      },
      size: {
        width: 600,
        height: 800
      },
      elements: [
        {
          id: `element_${uuidv4()}`,
          type: 'text',
          content: `<p style='text-align: center; font-size: 36px; font-weight: bold; color: #FF2E63;'>感谢阅读 ❤️</p>`,
          left: 75,
          top: 250,
          width: 450,
          height: 80,
          rotate: 0,
          defaultFontName: '',
          defaultColor: '#FF2E63'
        },
        {
          id: `element_${uuidv4()}`,
          type: 'text',
          content: `<p style='text-align: center; font-size: 24px;'>记得点赞评论收藏 👇</p><p style='text-align: center; font-size: 24px; margin-top: 20px;'>有什么问题欢迎留言讨论</p>`,
          left: 75,
          top: 350,
          width: 450,
          height: 120,
          rotate: 0,
          defaultFontName: '',
          defaultColor: '#333333'
        },
        {
          id: `element_${uuidv4()}`,
          type: 'text',
          content: `<p style='text-align: center; font-size: 20px; margin-top: 30px;'>${tagsHtml}</p>`,
          left: 75,
          top: 500,
          width: 450,
          height: 100,
          rotate: 0,
          defaultFontName: '',
          defaultColor: '#333333'
        }
      ]
    };
  },

  /**
   * 从大纲生成幻灯片
   */
  generateSlidesFromOutline(outline: any[], content: string): any[] {
    const slides = [];
    
    // 创建封面幻灯片
    const titleText = outline.length > 0 ? outline[0].title : '小红书分享';
    slides.push(this.createTitleSlide(titleText));
    
    // 收集当前章节的所有要点
    let currentSectionTitle = '';
    let currentSubsectionTitle = '';
    let currentPoints = [];
    
    // 从大纲生成内容幻灯片
    for (let i = 0; i < outline.length; i++) {
      const item = outline[i];
      
      if (item.level === 1) {
        // 如果有收集的要点，先创建前一个子章节的幻灯片
        if (currentPoints.length > 0 && currentSubsectionTitle) {
          slides.push(this.createContentSlide(currentSubsectionTitle, currentPoints));
          currentPoints = [];
        }
        
        // 对于一级标题，创建章节标题幻灯片
        // 跳过第一个一级标题（已作为封面使用）
        if (i > 0) {
          slides.push(this.createSectionSlide(item.title));
        }
        currentSectionTitle = item.title;
        currentSubsectionTitle = '';
        
      } else if (item.level === 2) {
        // 如果有收集的要点，先创建前一个子章节的幻灯片
        if (currentPoints.length > 0 && currentSubsectionTitle) {
          slides.push(this.createContentSlide(currentSubsectionTitle, currentPoints));
          currentPoints = [];
        }
        
        // 对于二级标题，设置当前子章节标题
        currentSubsectionTitle = item.title;
        
      } else if (item.level === 3) {
        // 对于三级标题，创建内容幻灯片
        const nextItems = outline.slice(i + 1);
        const bulletPoints = [item.title];
        
        // 收集该三级标题下的所有要点
        let j = 0;
        while (i + j + 1 < outline.length && 
               outline[i + j + 1].level > 3 && 
               outline[i + j + 1].isBullet) {
          bulletPoints.push(outline[i + j + 1].title);
          j++;
        }
        
        // 跳过已处理的要点
        i += j;
        
        slides.push(this.createContentSlide(currentSubsectionTitle, bulletPoints));
        
      } else if (item.isBullet) {
        // 收集要点
        currentPoints.push(item.title);
        
        // 如果是最后一个元素或下一个元素不是要点，创建幻灯片
        if (i === outline.length - 1 || 
            !outline[i + 1].isBullet || 
            outline[i + 1].level <= 2) {
          if (currentPoints.length > 0 && currentSubsectionTitle) {
            slides.push(this.createContentSlide(currentSubsectionTitle, currentPoints));
            currentPoints = [];
          }
        }
      }
    }
    
    // 处理最后可能剩余的要点
    if (currentPoints.length > 0 && currentSubsectionTitle) {
      slides.push(this.createContentSlide(currentSubsectionTitle, currentPoints));
    }
    
    // 添加结尾卡片
    const outlineText = outline.map(item => {
      if (item.level === 1) return `# ${item.title}`;
      if (item.level === 2) return `## ${item.title}`;
      if (item.level === 3) return `### ${item.title}`;
      if (item.isBullet) return `- ${item.title}`;
      return '';
    }).join('\n');
    
    slides.push(this.createEndingSlide(outlineText));
    
    return slides;
  },

  /**
   * 创建封面幻灯片
   */
  createTitleSlide(title: string): any {
    return {
      id: `slide_${uuidv4()}`,
      background: {
        type: 'solid',
        color: '#FFF1F2' // 小红书风格粉色背景
      },
      size: {
        width: 600,
        height: 800
      },
      elements: [
        {
          id: `element_${uuidv4()}`,
          type: 'text',
          content: `<p style='text-align: center; font-size: 60px; font-weight: bold; color: #FF2E63;'>${title}</p>`,
          left: 75,
          top: 200,
          width: 450,
          height: 200,
          rotate: 0,
          defaultFontName: '',
          defaultColor: '#FF2E63' // 小红书风格粉红色
        },
        {
          id: `element_${uuidv4()}`,
          type: 'text',
          content: '<p style=\'text-align: center; font-size: 24px;\'>👋 点击查看全文 ➡️</p>',
          left: 75,
          top: 500,
          width: 450,
          height: 50,
          rotate: 0,
          defaultFontName: '',
          defaultColor: '#666666'
        }
      ]
    };
  },

  /**
   * 创建节标题幻灯片 (内容页卡片)
   */
  createSectionSlide(title: string): any {
    return {
      id: `slide_${uuidv4()}`,
      background: {
        type: 'solid',
        color: '#FFFFFF'
      },
      size: {
        width: 600,
        height: 800
      },
      elements: [
        {
          id: `element_${uuidv4()}`,
          type: 'text',
          content: `<p style='text-align: center; font-size: 48px; font-weight: bold; color: #FF2E63;'>${title}</p>`,
          left: 75,
          top: 300,
          width: 450,
          height: 100,
          rotate: 0,
          defaultFontName: '',
          defaultColor: '#FF2E63'
        },
        {
          id: `element_${uuidv4()}`,
          type: 'text',
          content: '<p style=\'text-align: center; font-size: 20px;\'>- - - - - - - - - - - - - - -</p>',
          left: 150,
          top: 400,
          width: 300,
          height: 30,
          rotate: 0,
          defaultFontName: '',
          defaultColor: '#AAAAAA'
        }
      ]
    };
  },

  /**
   * 创建内容幻灯片
   */
  createContentSlide(title: string, bulletPoints: string[]): any {
    const bulletHtml = bulletPoints.map(point => `<li style='margin-bottom: 15px;'>${point}</li>`).join('');
    
    return {
      id: `slide_${uuidv4()}`,
      background: {
        type: 'solid',
        color: '#FFFFFF'
      },
      size: {
        width: 600,
        height: 800
      },
      elements: [
        {
          id: `element_${uuidv4()}`,
          type: 'text',
          content: `<p style='font-size: 36px; font-weight: bold; color: #FF2E63;'>${title}</p>`,
          left: 75,
          top: 80,
          width: 450,
          height: 80,
          rotate: 0,
          defaultFontName: '',
          defaultColor: '#FF2E63'
        },
        {
          id: `element_${uuidv4()}`,
          type: 'text',
          content: `<ul style='font-size: 28px; color: #333333;'>${bulletHtml}</ul>`,
          left: 75,
          top: 180,
          width: 450,
          height: 520,
          rotate: 0,
          defaultFontName: '',
          defaultColor: '#333333'
        }
      ]
    };
  },

  /**
   * 获取Markdown转HTML的系统提示词
   */
  getMarkdownToHTMLSystemPrompt(language: string): string {
    return language === 'zh' 
      ? '你是一位HTML专家，专门将Markdown转换成格式良好的HTML片段。请确保生成的HTML片段具有适当的样式和格式，适合在幻灯片中展示。遵循以下要求：1. 使用干净语义化的HTML，2. 使用内联CSS样式美化内容，3. 确保排版美观易读，4. 为标题、列表、强调等元素添加适当的样式。'
      : 'You are an HTML expert specializing in converting Markdown to well-formatted HTML fragments. Ensure the generated HTML fragments have appropriate styling and formatting suitable for slide presentations. Follow these requirements: 1. Use clean semantic HTML, 2. Apply inline CSS styles to beautify content, 3. Ensure pleasant and readable typography, 4. Add appropriate styling for headings, lists, emphasis, and other elements.';
  },

  /**
   * 获取Markdown转HTML的提示词
   */
  getMarkdownToHTMLPrompt(content: string, language: string): string {
    return language === 'zh'
      ? `将以下Markdown内容转换为格式良好的HTML片段，适合在幻灯片中展示。确保HTML代码具有适当的样式和结构，便于阅读和理解。
      
请确保：
1. 使用语义化HTML标签
2. 添加适当的内联CSS样式
3. 保持良好的排版和间距
4. 保留原始内容的结构和逻辑
5. 生成的HTML片段应该是自包含的、可直接使用的

Markdown内容:
${content}

仅返回HTML代码，不要包含任何解释或其他文本。`
      : `Convert the following Markdown content to a well-formatted HTML fragment suitable for display in slides. Ensure the HTML code has appropriate styling and structure for readability and comprehension.

Please ensure:
1. Use semantic HTML tags
2. Add appropriate inline CSS styling
3. Maintain good typography and spacing
4. Preserve the structure and logic of the original content
5. The generated HTML fragment should be self-contained and ready to use

Markdown content:
${content}

Return only the HTML code, without any explanation or other text.`;
  },

  /**
   * 将Markdown转换为HTML（非流式）
   */
  async generateMarkdownToHTML(content: string, language: string, model: string): Promise<string> {
    // 构建提示词
    const systemPrompt = this.getMarkdownToHTMLSystemPrompt(language);
    const userPrompt = this.getMarkdownToHTMLPrompt(content, language);

    // 调用LLM API
    try {
      const htmlContent = await callOpenAI(systemPrompt, userPrompt, model);
      return htmlContent.trim();
    } catch (error) {
      console.error('Markdown转HTML出错:', error);
      throw new Error('Markdown转HTML失败');
    }
  },

  /**
   * 将Markdown转换为HTML（流式）
   */
  async generateMarkdownToHTMLStream(
    content: string, 
    language: string, 
    model: string, 
    handler: StreamHandler
  ): Promise<void> {
    // 构建提示词
    const systemPrompt = this.getMarkdownToHTMLSystemPrompt(language);
    const userPrompt = this.getMarkdownToHTMLPrompt(content, language);

    // 调用LLM API
    try {
      await callOpenAIStream(systemPrompt, userPrompt, model, handler, {
        temperature: 0.5,
        max_tokens: 4000,
      });
    } catch (error) {
      console.error('流式Markdown转HTML出错:', error);
      handler.write(JSON.stringify({ 
        error: '流式Markdown转HTML失败'
      }));
      handler.end();
    }
  },
}; 