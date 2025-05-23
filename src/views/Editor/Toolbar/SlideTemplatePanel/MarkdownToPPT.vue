<template>
  <div class="markdown-to-ppt">
    <div class="header">
      <span class="title">Markdown 转 卡片</span>
      <span class="subtitle" v-if="step === 'template'">从下方挑选合适的模板，我们将基于您的内容生成精美卡片</span>
      <span class="subtitle" v-else>在下方输入Markdown内容，系统将自动生成大纲</span>
    </div>
    
    <!-- 步骤 1: 输入 Markdown -->
    <template v-if="step === 'input'">
      <div class="markdown-input">
        <TextArea
          ref="inputRef"
          v-model:value="markdownContent"
          class="md-editor"
          placeholder="输入 Markdown 内容，或粘贴内容后点击生成..."
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
              @click="goToTemplateStep"
              :disabled="!markdownContent || loading"
            >
              选择模版
            </Button>
          </div>
        </div>
      </div>
    </template>
    
    <!-- 步骤 2: 选择模板 -->
    <div class="select-template" v-if="step === 'template'">
      <TemplateSelector 
        v-model="selectedTemplateId" 
        :templates="templatePreviews" 
        displayMode="advanced"
      >
        <template #actions>
          <Button class="btn back" @click="step = 'input'">
            <i class="el-icon-arrow-left"></i> 返回编辑
          </Button>
          <Button class="btn generate" type="primary" @click="generatePPT()">
            <i class="el-icon-magic-stick"></i> 生成卡片
          </Button>
        </template>
      </TemplateSelector>
    </div>
    
    <FullscreenSpin :loading="loading ||isImageGenerating" tip="AI生成中，请耐心等待 ..." />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import Button from '@/components/Button.vue'
import Select from '@/components/Select.vue'
import TextArea from '@/components/TextArea.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import TemplateSelector from '@/components/TemplateSelector.vue'
import message from '@/utils/message'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import useAIPPT from '@/hooks/useAIPPT'
import api from '@/services'
import type { Slide } from '@/types/slides'
import type { AIPPTSlide } from '@/types/AIPPT'

const emit = defineEmits<{
  (event: 'closed'): void
}>()

const slidesStore = useSlidesStore()
const { templates } = storeToRefs(slidesStore)
const { addHistorySnapshot } = useHistorySnapshot()
const { AIPPT, isImageGenerating } = useAIPPT()

// 步骤状态管理
const step = ref<'input' | 'template'>('input')
const markdownContent = ref('')

const inputRef = ref<InstanceType<typeof TextArea>>()
const loading = ref(false)
const language = ref<'zh' | 'en'>('zh')
const model = ref('ep-20250411144626-zx55l')
const selectedTemplateId = ref(templates.value[0]?.id || '')

// 模板预览数据
const templatePreviews = ref<{ 
  id: string; 
  name: string; 
}[]>([])

// 初始化模板预览数据
const initTemplatePreviews = () => {
  templatePreviews.value = templates.value.map(template => ({
    id: template.id,
    name: template.name
  }))
}

onMounted(() => {
  setTimeout(() => {
    if (inputRef.value) {
      inputRef.value.focus()
    }
  }, 500)
  
  // 初始化模板预览数据
  initTemplatePreviews()
})

// 从输入步骤转到模板选择步骤
const goToTemplateStep = () => {
  // 显示短暂的加载状态，确保UI更新
  loading.value = true
  setTimeout(() => {
    step.value = 'template'
    loading.value = false
  }, 300)
}

// 生成 PPT
const generatePPT = async () => {
  // 检查模板是否可用
  if (!templates.value || templates.value.length === 0) {
    message.error('无可用模板，请先添加模板')
    return
  }
  
  loading.value = true
  
  try {
    // 获取模板幻灯片
    const templateSlides: Slide[] = await api.getFileData(selectedTemplateId.value).then(ret => ret.slides)
    
    // 确保模板幻灯片不为空
    if (!templateSlides || templateSlides.length === 0) {
      throw new Error('无法获取模板幻灯片')
    }

    // 检查模板是否包含必要的幻灯片类型
    const coverSlides = templateSlides.filter(slide => slide.type === 'cover')
    
    if (coverSlides.length === 0) {
      throw new Error('模板缺少必要的幻灯片类型（封面）')
    }
    
    // 调用 AI 服务生成 PPT
    const stream = await api.AIPPT(
      markdownContent.value, 
      language.value, 
      model.value, 
      selectedTemplateId.value,
    )
    
    const reader = stream.body.getReader()
    const decoder = new TextDecoder('utf-8')
    
    const readStream = () => {
      reader.read().then(({ done, value }: ReadableStreamReadResult<Uint8Array>) => {
        if (done) {
          // 检查图片是否正在生成中，如果是则等待完成后再关闭
          if (isImageGenerating.value) {
            const checkInterval = setInterval(() => {
              if (!isImageGenerating.value) {
                clearInterval(checkInterval)
                emit('closed')
                loading.value = false
                markdownContent.value = ''
                step.value = 'input'
                addHistorySnapshot()
              }
            }, 300)
          } 
          else {
            emit('closed')
            loading.value = false
            markdownContent.value = ''
            step.value = 'input'
            addHistorySnapshot()
          }
          return
        }
        
        const chunk = decoder.decode(value, { stream: true })
        console.log('收到的数据:', chunk)
        try {
          const slide: AIPPTSlide = JSON.parse(chunk)
          console.log('收到的幻灯片数据:', slide)
          
          // 确保幻灯片类型正确并且具有必要的数据结构
          if (slide && typeof slide === 'object' && 'type' in slide) {
            AIPPT(templateSlides, [slide])
          } 
          else {
            console.error('收到的数据不是有效的幻灯片格式', slide)
          }
        }
        catch (err) {
          console.error('解析 AI 返回的幻灯片数据失败', err)
        }
        
        readStream()
      })
    }
    readStream()
  }
  catch (error) {
    console.error('AI 生成 PPT 失败', error)
    message.error(error instanceof Error ? error.message : 'AI 生成 PPT 失败，请重试')
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.markdown-to-ppt {
  position: relative;
  margin: 20px;
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

.markdown-input {
  display: flex;
  flex-direction: column;
  height: calc(100% - 60px);
  
  .md-editor {
    flex: 1;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    transition: border-color 0.2s;
    margin-bottom: 15px;
    
    &:focus {
      border-color: #409EFF;
    }
  }
}

.control-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  
  .left-controls {
    display: flex;
    align-items: center;
    gap: 15px;
    
    .language-toggle {
      cursor: pointer;
      color: #409EFF;
      font-size: 14px;
      user-select: none;
      transition: opacity 0.2s;
      
      &:hover {
        opacity: 0.8;
      }
    }
  }
}

.select-template {
  .btn {
    margin: 0 8px;
    min-width: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    
    i {
      margin-right: 5px;
    }
    
    &.back {
      border-color: #dcdfe6;
      color: #606266;
      
      &:hover {
        color: #409EFF;
        border-color: #c6e2ff;
        background-color: #ecf5ff;
      }
    }
    
    &.generate {
      font-weight: 500;
      padding-left: 20px;
      padding-right: 20px;
      transition: all 0.3s;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
      }
    }
  }
}

@keyframes slideIn {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.select-template {
  animation: slideIn 0.3s ease-out;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
  background-color: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: #e1e1e1;
  border-radius: 4px;

  &:hover {
    background-color: #d1d1d1;
  }
}
</style> 