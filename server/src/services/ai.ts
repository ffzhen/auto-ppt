import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources';
import { getTemplatePrompt } from '../configs/templates'

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
 * 获取流式处理器
 */
function getStreamHandler(res: Response): StreamHandler {
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
      max_tokens: 16384,
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
      max_tokens: 16384,
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
      max_tokens: options.max_tokens || 16384,
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

/**
 * 生成AI PPT大纲（非流式）
 */
async function generateOutline(content: string, language: string, model: string): Promise<any> {
  // 获取大纲文本
  const outlineText = await getOutlineTextByContent(content, model, language);
  
  // 解析为大纲对象
  const outline = parseOutlineFromContent(outlineText);
  
  // 保存为本地文件，方便调试
  const fileName = `outline_${Date.now()}.json`;
  const filePath = path.join(MOCK_DATA_DIR, fileName);
  fs.writeFileSync(filePath, JSON.stringify(outline, null, 2));
  
  return { outline };
}

/**
 * 生成AI PPT大纲（流式）
 */
async function generateOutlineStream(
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
    max_tokens: 16384
  };
  
  // 使用OpenAI SDK流式API直接生成内容
  await callOpenAIStream(systemPrompt, userPrompt, model, handler, modelParams);
}

/**
 * 获取PPT生成的提示词
 */
async function getPPTPrompt(content: string, templateType: string, isStream: boolean = false): Promise<{ systemPrompt: string; userPrompt: string }> {
  const systemPrompt = getTemplatePrompt(templateType, isStream)
  const userPrompt = `请根据以下内容生成卡片内容：\n\n${content}`
  return { systemPrompt, userPrompt }
}

/**
 * 获取大纲文本
 */
async function getOutlineTextByContent(content: string, model: string, language: string): Promise<string> {
  // 根据语言选择不同的提示词
  const prompt = language === 'zh' 
    ? `请为以下主题生成一个小红书风格的分享内容大纲，使用Markdown格式，遵循以下结构：
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
`
    : `Generate a Xiaohongshu (RED) style content outline for the following topic using Markdown format, following this structure:
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

  // 调用大语言模型API获取大纲文本
  const outlineText = await callLLMApi(prompt, model);
  return outlineText;
}

/**
 * 解析大纲文本为对象
 */
function parseOutlineFromContent(outlineText: string): any {
  // 实现解析逻辑
  // 这里需要根据实际的Markdown格式来解析大纲文本
  // 这里只是一个示例，实际解析逻辑需要根据Markdown格式来实现
  return {
    title: '示例大纲',
    sections: [
      { title: '第一部分', points: ['点1', '点2', '点3'] },
      { title: '第二部分', points: ['点4', '点5', '点6'] },
      { title: '第三部分', points: ['点7', '点8', '点9'] }
    ]
  };
}

/**
 * 创建结束幻灯片
 */
function createEndingSlide(content: string): string {
  // 实现创建结束幻灯片的逻辑
  // 这里只是一个示例，实际实现逻辑需要根据具体需求来实现
  return `# 结束语

${content}`;
}

/**
 * 生成幻灯片
 */
function generateSlidesFromOutline(outline: any): string[] {
  // 实现生成幻灯片的逻辑
  // 这里只是一个示例，实际实现逻辑需要根据大纲对象来生成幻灯片
  return [
    createTitleSlide(outline.title),
    createSectionSlide(outline.sections[0]),
    createSectionSlide(outline.sections[1]),
    createSectionSlide(outline.sections[2]),
    createEndingSlide(outline.conclusion)
  ];
}

/**
 * 创建标题幻灯片
 */
function createTitleSlide(title: string): string {
  // 实现创建标题幻灯片的逻辑
  // 这里只是一个示例，实际实现逻辑需要根据具体需求来实现
  return `# ${title}`;
}

/**
 * 创建章节幻灯片
 */
function createSectionSlide(section: any): string {
  // 实现创建章节幻灯片的逻辑
  // 这里只是一个示例，实际实现逻辑需要根据章节对象来实现
  return `## ${section.title}

${section.points.join('\n')}`;
}

/**
 * 创建内容幻灯片
 */
function createContentSlide(content: string): string {
  // 实现创建内容幻灯片的逻辑
  // 这里只是一个示例，实际实现逻辑需要根据内容来实现
  return content;
}

/**
 * 获取Markdown到HTML的系统提示词
 */
function getMarkdownToHTMLSystemPrompt(): string {
  // 实现获取Markdown到HTML的系统提示词的逻辑
  // 这里只是一个示例，实际实现逻辑需要根据具体需求来实现
  return '你是一个擅长将Markdown文本转换为HTML的AI助手。请将以下Markdown文本转换为HTML格式：';
}

/**
 * 获取Markdown到HTML的提示词
 */
function getMarkdownToHTMLPrompt(markdown: string): string {
  // 实现获取Markdown到HTML的提示词的逻辑
  // 这里只是一个示例，实际实现逻辑需要根据具体需求来实现
  return markdown;
}

/**
 * 将Markdown文本转换为HTML
 */
function generateMarkdownToHTML(markdown: string): string {
  // 实现将Markdown文本转换为HTML的逻辑
  // 这里只是一个示例，实际实现逻辑需要根据具体需求来实现
  return markdown;
}

/**
 * 将Markdown文本转换为HTML（流式）
 */
function generateMarkdownToHTMLStream(markdown: string): StreamHandler {
  // 实现将Markdown文本转换为HTML（流式）的逻辑
  // 这里只是一个示例，实际实现逻辑需要根据具体需求来实现
  const handler: StreamHandler = {
    write: (chunk: string) => {
      // 实现将Markdown文本转换为HTML（流式）的逻辑
    },
    end: () => {
      // 实现将Markdown文本转换为HTML（流式）的逻辑
    }
  };
  return handler;
}

/**
 * 生成AI PPT（非流式）
 */
async function generatePPT(content: string, language: string, model: string, templateType: string = 'default'): Promise<any> {
  // 获取提示词
  const { systemPrompt, userPrompt } = await getPPTPrompt(content, templateType, false);
  
  // 调用大语言模型API生成PPT内容
  const pptContent = await callLLMApi(userPrompt, model);
  
  // 解析PPT内容
  const slides = parseOutlineFromContent(pptContent);
  
  return slides;
}

/**
 * 生成AI PPT（流式）
 */
async function generatePPTStream(
  content: string, 
  language: string, 
  model: string, 
  handler: StreamHandler,
  templateType: string = 'default'
): Promise<void> {
  // 获取提示词
  const { systemPrompt, userPrompt } = await getPPTPrompt(content, templateType, true);
  
  // 调用大语言模型API生成PPT内容（流式）
  await generateOutlineStream(content, language, model, handler);
}

export default {
  callLLMApi,
  callOpenAI,
  callVolcLLMApi,
  callVolcLLMApiStream,
  callOpenAIStream,
  getStreamHandler,
  generateOutline,
  generateOutlineStream,
  getPPTPrompt,
  generatePPT,
  generatePPTStream,
  getOutlineTextByContent,
  parseOutlineFromContent,
  createEndingSlide,
  generateSlidesFromOutline,
  createTitleSlide,
  createSectionSlide,
  createContentSlide,
  getMarkdownToHTMLSystemPrompt,
  getMarkdownToHTMLPrompt,
  generateMarkdownToHTML,
  generateMarkdownToHTMLStream
}; 