export type SplitMode = 'none' | 'auto' | 'divider'

export interface CardTemplate {
  id: string
  name: string
  description: string
  icon: string
  styles: {
    background: string
    color: string
    borderRadius: string
    padding: string
    fontFamily: string
    fontSize: string
    lineHeight: string
    boxShadow?: string
    border?: string
    backgroundImage?: string
    backgroundSize?: string
    backgroundPosition?: string
  }
  customCSS?: string
}

export const cardTemplates: CardTemplate[] = [
  {
    id: 'apple-notes',
    name: '苹果备忘录',
    description: '仿苹果备忘录风格的简洁卡片',
    icon: '📱',
    styles: {
      background: '#fefcf3',
      color: '#1d1d1f',
      borderRadius: '0',
      padding: '24px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif',
      fontSize: '16px',
      lineHeight: '1.6',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
      border: '1px solid #f0f0f0'
    },
    customCSS: `
      .preview h1, .preview h2, .preview h3 {
        color: #1d1d1f;
        font-weight: 600;
      }
      .preview h1 {
        font-size: 24px;
        margin-bottom: 16px;
      }
      .preview h2 {
        font-size: 20px;
        margin-bottom: 12px;
      }
      .preview code {
        background: #f5f5f7;
        color: #d73502;
        padding: 2px 6px;
        border-radius: 4px;
        font-family: 'SF Mono', Monaco, monospace;
      }
      .preview blockquote {
        background: #f8f9fa;
        border-left: 4px solid #007aff;
        padding: 16px;
        margin: 16px 0;
        border-radius: 0;
      }
      .preview ul, .preview ol {
        padding-left: 20px;
      }
      .preview li {
        margin: 8px 0;
      }
    `
  },
  {
    id: 'spiral-notebook',
    name: '线圈笔记本',
    description: '怀旧的线圈笔记本风格',
    icon: '📒',
    styles: {
      background: 'linear-gradient(to bottom, #faf0e6 0%, #f5f5dc 100%)',
      color: '#2c3e50',
      borderRadius: '0',
      padding: '32px 28px 32px 48px',
      fontFamily: '"Courier New", "DejaVu Sans Mono", monospace',
      fontSize: '15px',
      lineHeight: '1.8',
      boxShadow: '0 6px 25px rgba(0, 0, 0, 0.15)',
      border: '2px solid #d4af37'
    },
    customCSS: `
      .preview {
        position: relative;
        background-image: 
          linear-gradient(90deg, #ff6b6b 0, #ff6b6b 2px, transparent 2px),
          repeating-linear-gradient(0deg, transparent, transparent 27px, #e0e0e0 27px, #e0e0e0 28px);
      }
      .preview::before {
        content: '';
        position: absolute;
        left: 20px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: #ff6b6b;
        border-radius: 1px;
      }
      .preview h1, .preview h2, .preview h3 {
        color: #2c3e50;
        font-weight: bold;
        text-decoration: underline;
        text-decoration-color: #3498db;
      }
      .preview h1 {
        font-size: 20px;
        margin-bottom: 20px;
      }
      .preview code {
        background: #fff8dc;
        color: #8b4513;
        padding: 2px 4px;
        border: 1px dashed #daa520;
        border-radius: 0;
      }
      .preview blockquote {
        background: rgba(255, 235, 59, 0.2);
        border-left: 4px solid #ffc107;
        padding: 12px;
        margin: 16px 0;
        font-style: italic;
      }
    `
  },
  {
    id: 'gradient-card',
    name: '渐变卡片',
    description: '现代化渐变背景卡片',
    icon: '🌈',
    styles: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: '#ffffff',
      borderRadius: '0',
      padding: '32px',
      fontFamily: '"Inter", "Helvetica Neue", sans-serif',
      fontSize: '16px',
      lineHeight: '1.7',
      boxShadow: '0 20px 40px rgba(102, 126, 234, 0.3)',
    },
    customCSS: `
      .preview {
        position: relative;
        overflow: hidden;
      }
      .preview::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -50%;
        width: 100%;
        height: 100%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        pointer-events: none;
      }
      .preview h1, .preview h2, .preview h3 {
        color: #ffffff;
        font-weight: 700;
        text-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      .preview h1 {
        font-size: 28px;
        margin-bottom: 20px;
        background: linear-gradient(45deg, #fff, #f0f8ff);
        -webkit-background-clip: text;
        background-clip: text;
        -webkit-text-fill-color: transparent;
      }
      .preview h2 {
        font-size: 22px;
        margin-bottom: 16px;
      }
      .preview code {
        background: rgba(255, 255, 255, 0.2);
        color: #f8f8f2;
        padding: 4px 8px;
        border-radius: 0;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
      }
      .preview blockquote {
        background: rgba(255, 255, 255, 0.1);
        border-left: 4px solid #ff6b6b;
        padding: 16px;
        margin: 16px 0;
        border-radius: 0;
        backdrop-filter: blur(10px);
      }
      .preview ul, .preview ol {
        color: #f0f8ff;
      }
      .preview li::marker {
        color: #ff6b6b;
      }
      .preview strong {
        color: #ffeb3b;
        text-shadow: 0 1px 2px rgba(0,0,0,0.2);
      }
    `
  },
  {
    id: 'minimal-white',
    name: '极简白卡',
    description: '简约现代的白色卡片设计',
    icon: '🤍',
    styles: {
      background: '#ffffff',
      color: '#2d3748',
      borderRadius: '0',
      padding: '40px',
      fontFamily: '"Source Sans Pro", -apple-system, sans-serif',
      fontSize: '16px',
      lineHeight: '1.6',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e2e8f0'
    },
    customCSS: `
      .preview h1, .preview h2, .preview h3 {
        color: #1a202c;
        font-weight: 600;
        letter-spacing: -0.02em;
      }
      .preview h1 {
        font-size: 32px;
        margin-bottom: 24px;
        position: relative;
      }
      .preview h1::after {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 0;
        width: 50px;
        height: 3px;
        background: linear-gradient(90deg, #4299e1, #63b3ed);
        border-radius: 0;
      }
      .preview h2 {
        font-size: 24px;
        margin-bottom: 16px;
        color: #2d3748;
      }
      .preview code {
        background: #f7fafc;
        color: #e53e3e;
        padding: 3px 8px;
        border-radius: 0;
        border: 1px solid #e2e8f0;
        font-size: 14px;
      }
      .preview blockquote {
        background: #f8f9fa;
        border-left: 4px solid #4299e1;
        padding: 20px;
        margin: 24px 0;
        border-radius: 0;
        font-style: italic;
        color: #4a5568;
      }
      .preview ul, .preview ol {
        color: #4a5568;
      }
      .preview li {
        margin: 6px 0;
      }
      .preview strong {
        color: #2d3748;
        font-weight: 600;
      }
    `
  }
] 