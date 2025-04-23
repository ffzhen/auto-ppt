<template>
  <div class="markdown-to-html">
    <div class="header">
      <span class="title">Markdown 转 HTML 幻灯片</span>
      <span class="subtitle">输入 Markdown 内容，系统将自动转换为适合 3:4 比例幻灯片的 HTML 片段</span>
    </div>
    
    <div class="content-container">
      <!-- Markdown 输入区域 -->
      <div class="markdown-input">
        <TextArea
          ref="inputRef"
          v-model:value="markdownContent"
          class="md-editor"
          placeholder="输入 Markdown 内容，或粘贴内容后点击转换..."
          :rows="15"
        />
        <div class="control-bar">
          <div class="left-controls">
            <span class="language-toggle" @click="language = language === 'zh' ? 'en' : 'zh'">
              {{ language === 'zh' ? '中文' : 'English' }}
            </span>
            <span class="model-selector">
              <Select 
                style="width: 160px;" 
                v-model:value="model"
                :options="[
                  { label: 'DeepSeek-v3', value: 'ep-20250411144626-zx55l' },
                ]"
              />
            </span>
          </div>
          <div class="right-controls">
            <Button 
              class="generate-btn" 
              type="primary" 
              @click="generateHTML"
              :disabled="!markdownContent || loading"
            >
              转换为HTML
            </Button>
          </div>
        </div>
      </div>
      
      <!-- HTML 预览区域 -->
      <div class="html-preview" v-if="htmlFragments.length > 0">
        <div class="preview-header">
          <div class="preview-title">HTML 幻灯片预览</div>
          <div class="preview-controls">
            <Button class="btn" @click="insertAllSlides">插入所有幻灯片</Button>
          </div>
        </div>
        
        <div class="fragments-container">
          <div 
            v-for="(fragment, index) in htmlFragments" 
            :key="index"
            class="fragment-card"
          >
            <div class="fragment-header">
              <span class="fragment-title">幻灯片 {{ index + 1 }}</span>
              <Button size="small" class="insert-btn" @click="insertSlide(fragment)">插入</Button>
            </div>
            <div class="fragment-preview">
              <div class="aspect-ratio-box">
                <div class="fragment-content" v-html="fragment"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <FullscreenSpin :loading="loading" tip="AI生成中，请耐心等待 ..." />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useSlidesStore, useMainStore } from '@/store'
import Button from '@/components/Button.vue'
import Select from '@/components/Select.vue'
import TextArea from '@/components/TextArea.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import message from '@/utils/message'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import api from '@/services'
import { nanoid } from 'nanoid'
import DOMPurify from 'dompurify'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const slidesStore = useSlidesStore()
const mainStore = useMainStore()
const { addHistorySnapshot } = useHistorySnapshot()

// 状态管理
const markdownContent = ref('')
const inputRef = ref<InstanceType<typeof TextArea>>()
const loading = ref(false)
const language = ref<'zh' | 'en'>('zh')
const model = ref('ep-20250411144626-zx55l')
const htmlFragments = ref<string[]>([])

onMounted(() => {
  setTimeout(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  }, 500)
})

// 生成 HTML 片段
const generateHTML = async () => {
  if (!markdownContent.value) {
    message.error('请输入 Markdown 内容')
    return
  }
  
  loading.value = true
  htmlFragments.value = []
  
  try {
    // 调用 AI 服务将 Markdown 转换为 HTML 片段
    const stream = await api.markdown2html(markdownContent.value, language.value, model.value)
    
    const reader = stream.body.getReader()
    const decoder = new TextDecoder('utf-8')
    
    const readStream = () => {
      reader.read().then(({ done, value }: ReadableStreamReadResult<Uint8Array>) => {
        if (done) {
          loading.value = false
          return
        }
        
        const chunk = decoder.decode(value, { stream: true })
        try {
          // 尝试解析JSON
          const parsedData = JSON.parse(chunk)
          if (parsedData.htmlFragment) {
            // 使用 DOMPurify 净化 HTML 内容，防止 XSS 攻击
            const sanitizedHtml = DOMPurify.sanitize(parsedData.htmlFragment, {
              USE_PROFILES: { html: true },
              ALLOWED_TAGS: [
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'ul', 'ol', 'li', 
                'strong', 'em', 'u', 'strike', 'blockquote', 'code', 'pre',
                'div', 'span', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'a', 'hr', 'sup', 'sub'
              ],
              ALLOWED_ATTR: [
                'href', 'src', 'alt', 'style', 'class', 'target', 'width', 'height',
                'align', 'border', 'cellpadding', 'cellspacing'
              ],
            })
            htmlFragments.value.push(sanitizedHtml)
          }
        }
        catch (err) {
          // 如果返回的不是有效的JSON，尝试提取 HTML 内容
          console.warn('解析 AI 返回的 HTML 片段失败，尝试直接提取 HTML', err)
          
          // 对整个 chunk 进行简单的 HTML 净化
          try {
            // 尝试检测 HTML 文档结构
            const htmlMatch = /<\!DOCTYPE html>[\s\S]*<\/html>/i.exec(chunk) ||
                            /<html>[\s\S]*<\/html>/i.exec(chunk) || 
                            /<body>[\s\S]*<\/body>/i.exec(chunk)
                            
            if (htmlMatch) {
              const sanitizedHtml = DOMPurify.sanitize(htmlMatch[0], {
                USE_PROFILES: { html: true },
                ALLOWED_TAGS: [
                  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'ul', 'ol', 'li', 
                  'strong', 'em', 'u', 'strike', 'blockquote', 'code', 'pre',
                  'div', 'span', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                  'a', 'hr', 'sup', 'sub'
                ],
                ALLOWED_ATTR: [
                  'href', 'src', 'alt', 'style', 'class', 'target', 'width', 'height',
                  'align', 'border', 'cellpadding', 'cellspacing'
                ]
              })
              htmlFragments.value.push(sanitizedHtml)
            }
          } catch (htmlError) {
            console.error('直接提取 HTML 内容失败', htmlError)
          }
        }
        
        readStream()
      })
    }
    readStream()
  }
  catch (error) {
    console.error('AI 转换 Markdown 失败', error)
    message.error(error instanceof Error ? error.message : 'AI 转换失败，请重试')
    loading.value = false
  }
}

// 插入单个幻灯片
const insertSlide = (htmlContent: string) => {
  // 创建一个新的幻灯片
  const slideId = nanoid()
  slidesStore.addSlide({
    id: slideId,
    elements: [
      {
        type: 'text',
        id: nanoid(),
        left: 40,
        top: 40,
        width: 720,
        height: 440,
        rotate: 0,
        content: htmlContent,
        defaultFontName: '',
        defaultColor: '#333'
      }
    ]
  })
  
  // 选中新插入的幻灯片
  slidesStore.updateActiveElementIdList([])
  slidesStore.setActiveSlideIndex(slidesStore.slides.length - 1)
  
  message.success('幻灯片已插入')
}

// 插入所有幻灯片
const insertAllSlides = () => {
  htmlFragments.value.forEach(fragment => {
    insertSlide(fragment)
  })
  message.success(`已插入 ${htmlFragments.value.length} 张幻灯片`)
  emit('close')
}
</script>

<style lang="scss" scoped>
.markdown-to-html {
  position: relative;
  margin: 20px;
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.header {
  margin-bottom: 20px;
  position: relative;

  .title {
    font-weight: 700;
    font-size: 20px;
    margin-right: 8px;
    background: linear-gradient(270deg, #409EFF, #1890FF);
    background-clip: text;
    color: transparent;
    vertical-align: text-bottom;
    line-height: 1.1;
  }
  
  .subtitle {
    color: #888;
    font-size: 12px;
  }
  
  .close-btn {
    position: absolute;
    right: 0;
    top: 0;
    font-size: 20px;
    cursor: pointer;
    color: #999;
    transition: color 0.2s;
    
    &:hover {
      color: #333;
    }
  }
}

.content-container {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.markdown-input {
  display: flex;
  flex-direction: column;
  height: 300px;
  
  .md-editor {
    flex: 1;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    resize: none;
    padding: 10px;
    font-family: monospace;
    font-size: 14px;
    
    &:focus {
      outline: none;
      border-color: #409EFF;
    }
  }
  
  .control-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    
    .language-toggle {
      background-color: #f0f0f0;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 13px;
      cursor: pointer;
      user-select: none;
      margin-right: 10px;
      
      &:hover {
        background-color: #e0e0e0;
      }
    }
    
    .model-selector {
      display: inline-block;
    }
    
    .generate-btn {
      padding: 0 20px;
    }
  }
}

.html-preview {
  flex: 1;
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    
    .preview-title {
      font-size: 16px;
      font-weight: 500;
    }
  }
  
  .fragments-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    overflow-y: auto;
    flex: 1;
    padding-right: 10px;
  }
  
  .fragment-card {
    width: calc(50% - 10px);
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    
    .fragment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background-color: #f5f7fa;
      border-bottom: 1px solid #e4e7ed;
      
      .fragment-title {
        font-size: 14px;
        font-weight: 500;
      }
    }
    
    .fragment-preview {
      padding: 10px;
      flex: 1;
      overflow: hidden;
      
      .aspect-ratio-box {
        width: 100%;
        height: 0;
        padding-bottom: 75%; /* 4:3 ratio */
        position: relative;
        background-color: white;
        border: 1px solid #ebeef5;
        border-radius: 4px;
        
        .fragment-content {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: auto;
          padding: 10px;
          font-size: 12px;
          
          :deep(h1) {
            font-size: 24px;
            margin-bottom: 16px;
          }
          
          :deep(h2) {
            font-size: 20px;
            margin-bottom: 12px;
          }
          
          :deep(p) {
            margin-bottom: 8px;
          }
          
          :deep(ul, ol) {
            padding-left: 20px;
            margin-bottom: 8px;
          }
        }
      }
    }
  }
}

:deep(.fullscreen-spin) {
  background-color: rgba(255, 255, 255, 0.8);
}
</style> 