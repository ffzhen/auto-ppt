<template>
  <div class="auto-ppt">
    <div class="header">
      <span class="title">自动生成 PPT</span>
      <span class="subtitle">输入主题和关键点，AI 将自动生成结构化的 PPT 内容</span>
    </div>
    
    <!-- 步骤 1: 输入内容 -->
    <div v-if="step === 'input'" class="content-input">
      <div class="input-group">
        <label>演示文稿主题</label>
        <Input
          ref="titleInputRef"
          v-model:value="title"
          placeholder="输入演示文稿主题，例如：数字化转型策略、产品发布计划"
          :maxlength="50"
          show-count
        />
      </div>
      
      <div class="input-group">
        <label>演示文稿内容要点 (Markdown 格式)</label>
        <TextArea
          ref="contentInputRef"
          v-model:value="content"
          placeholder="输入内容要点，使用 Markdown 格式，例如：
# 引言
- 背景介绍
- 目标和挑战

# 方法论
- 关键策略
- 实施步骤

# 结果和展望
- 预期成果
- 未来计划"
          :rows="8"
        />
      </div>
      
      <div class="options-panel">
        <div class="option-group">
          <label>语言</label>
          <div class="language-toggle" @click="language = language === 'zh' ? 'en' : 'zh'">
            {{ language === 'zh' ? '中文' : 'English' }}
          </div>
        </div>
        
        <div class="option-group">
          <label>AI 模型</label>
          <Select 
            style="width: 160px;" 
            v-model:value="model"
            :options="[
              { label: 'DeepSeek-v3', value: 'ep-20250411144626-zx55l' },
            ]"
          />
        </div>
      </div>
      
      <div class="btn-container">
        <Button 
          class="next-btn" 
          type="primary" 
          @click="goToTemplateSelection"
          :disabled="!title || !content || loading"
        >
          选择模板
        </Button>
      </div>
    </div>
    
    <!-- 步骤 2: 选择模板 -->
    <div v-if="step === 'template'" class="template-selection">
      <div class="templates">
        <div 
          class="template" 
          :class="{ 'selected': selectedTemplateId === template.id }" 
          v-for="template in templates" 
          :key="template.id" 
          @click="selectedTemplateId = template.id"
        >
          <img :src="template.cover" :alt="template.name">
          <div class="template-name">{{ template.name }}</div>
        </div>
      </div>
      <div class="btns">
        <Button class="btn" type="primary" @click="generatePPT">生成演示文稿</Button>
        <Button class="btn" @click="step = 'input'">返回编辑内容</Button>
      </div>
    </div>
    
    <FullscreenSpin :loading="loading" tip="AI 正在生成演示文稿，请稍候..." />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import Button from '@/components/Button.vue'
import Input from '@/components/Input.vue'
import Select from '@/components/Select.vue'
import TextArea from '@/components/TextArea.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
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
const { AIPPT } = useAIPPT()

// 状态管理
const step = ref<'input' | 'template'>('input')
const title = ref('')
const content = ref('')
const titleInputRef = ref<InstanceType<typeof Input>>()
const contentInputRef = ref<InstanceType<typeof TextArea>>()
const loading = ref(false)
const language = ref<'zh' | 'en'>('zh')
const model = ref('ep-20250411144626-zx55l')
const selectedTemplateId = ref('')

onMounted(() => {
  setTimeout(() => {
    if (titleInputRef.value) {
      titleInputRef.value.focus()
    }
  }, 500)
  
  // 默认选择第一个模板
  if (templates.value.length > 0) {
    selectedTemplateId.value = templates.value[0].id
  }
})

// 跳转到模板选择步骤
const goToTemplateSelection = () => {
  if (!title.value) {
    message.error('请输入演示文稿主题')
    return
  }
  
  if (!content.value) {
    message.error('请输入演示文稿内容要点')
    return
  }
  
  step.value = 'template'
}

// 生成 PPT
const generatePPT = async () => {
  if (!selectedTemplateId.value) {
    message.error('请选择一个模板')
    return
  }
  
  loading.value = true
  
  try {
    // 构建发送给 AI 的内容
    const promptContent = `# ${title.value}\n\n${content.value}`
    
    // 获取模板幻灯片
    const templateSlides = await api.getFileData(selectedTemplateId.value)
      .then(ret => ret.slides)
    
    // 确保模板幻灯片不为空
    if (!templateSlides || templateSlides.length === 0) {
      throw new Error('无法获取模板幻灯片')
    }

    // 调用 AI 服务生成 PPT
    const stream = await api.AIPPT(
      promptContent, 
      language.value, 
      model.value, 
      selectedTemplateId.value
    )
    
    const reader = stream.body.getReader()
    const decoder = new TextDecoder('utf-8')
    
    function readStream() {
      reader.read().then(({ done, value }) => {
        if (done) {
          emit('closed')
          loading.value = false
          title.value = ''
          content.value = ''
          step.value = 'input'
          addHistorySnapshot()
          message.success('演示文稿已成功生成')
          return
        }
        
        const chunk = decoder.decode(value, { stream: true })
        try {
          const slide = JSON.parse(chunk)
          
          if (slide && typeof slide === 'object' && 'type' in slide) {
            AIPPT(templateSlides, [slide])
          } else {
            console.error('收到的数据不是有效的幻灯片格式', slide)
          }
        } catch (err) {
          console.error('解析 AI 返回的幻灯片数据失败', err)
        }
        
        readStream()
      })
    }
    
    readStream()
  } catch (error) {
    console.error('AI 生成 PPT 失败', error)
    message.error(error instanceof Error ? error.message : 'AI 生成 PPT 失败，请重试')
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.auto-ppt {
  position: relative;
  padding: 20px;
}

.header {
  margin-bottom: 24px;
  
  .title {
    font-weight: 700;
    font-size: 20px;
    margin-right: 8px;
    background: linear-gradient(270deg, #3B82F6, #60A5FA);
    background-clip: text;
    color: transparent;
    vertical-align: text-bottom;
    line-height: 1.1;
  }
  
  .subtitle {
    color: #6B7280;
    font-size: 14px;
  }
}

.content-input {
  display: flex;
  flex-direction: column;
  gap: 16px;
  
  .input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    label {
      font-weight: 600;
      color: #374151;
      font-size: 14px;
    }
  }
}

.options-panel {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin: 12px 0;
  
  .option-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    
    label {
      font-weight: 600;
      color: #374151;
      font-size: 14px;
    }
    
    .language-toggle {
      padding: 6px 12px;
      background-color: #EFF6FF;
      border: 1px solid #DBEAFE;
      border-radius: 4px;
      color: #3B82F6;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      
      &:hover {
        background-color: #DBEAFE;
      }
    }
  }
}

.btn-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
  
  .next-btn {
    min-width: 120px;
  }
}

.template-selection {
  margin-top: 20px;
  
  .templates {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
    max-height: 400px;
    overflow-y: auto;
    
    &::-webkit-scrollbar {
      width: 6px;
    }
    
    &::-webkit-scrollbar-track {
      background: #f1f1f1;
      border-radius: 3px;
    }
    
    &::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 3px;
    }
  }
  
  .template {
    position: relative;
    border: 2px solid #E5E7EB;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
    
    img {
      width: 100%;
      aspect-ratio: 16/9;
      object-fit: cover;
    }
    
    .template-name {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px;
      background-color: rgba(0, 0, 0, 0.6);
      color: white;
      font-size: 12px;
      text-align: center;
    }
    
    &:hover {
      border-color: #93C5FD;
      transform: translateY(-2px);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    &.selected {
      border-color: #3B82F6;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
    }
  }
  
  .btns {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-top: 16px;
    
    .btn {
      min-width: 120px;
    }
  }
}
</style> 