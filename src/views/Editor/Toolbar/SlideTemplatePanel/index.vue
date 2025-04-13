<template>
  <div class="slide-template-panel">
    <div class="title">模板库</div>
    <div class="template-list">
      <div
        class="template-item"
        v-for="(template, index) in templates"
        :key="index"
        @click="applyTemplate(template)"
      >
        <div class="template-preview" :style="{ backgroundImage: `url(${template.thumbnail})` }"></div>
        <div class="template-name">{{ template.name }}</div>
      </div>
    </div>
    
    <Divider />
    
    <div class="title">从Markdown生成</div>
    <div class="row">
      <TextArea
        v-model:value="markdownContent"
        placeholder="输入Markdown内容，或粘贴内容后点击生成"
        :rows="6"
      />
    </div>
    <div class="row" style="flex-wrap: wrap;">
      <div style="flex: 1; margin-right: 10px; margin-bottom: 5px;">
        <Select 
          style="width: 100%;" 
          v-model:value="selectedTemplateId"
          :options="templateOptions.map(tpl => ({ label: tpl.name, value: tpl.id }))"
        >
          <template #prefix>模板：</template>
        </Select>
      </div>
      <div style="flex: 0 0 auto; margin-bottom: 5px; display: flex;">
        <Select 
          style="width: 120px; margin-right: 5px;" 
          v-model:value="language"
          :options="[
            { label: '中文', value: 'zh' },
            { label: '英文', value: 'en' }
          ]"
        />
        <Select 
          style="width: 160px; margin-right: 10px;" 
          v-model:value="model"
          :options="[
            { label: 'DeepSeek-v3', value: 'ep-20250411144626-zx55l' },
          ]"
        />
        <Button style="width: 80px;" @click="generateFromMarkdown" :disabled="!markdownContent || loading">
          <span v-if="!loading">生成</span>
          <span v-else>处理中</span>
        </Button>
      </div>
    </div>
    
    <div class="preview" v-if="outlineContent && !loading">
      <div class="outline-header">
        <div class="outline-title">已生成的大纲：</div>
        <div class="outline-actions">
          <Button size="small" @click="confirmOutline">确认生成</Button>
          <Button size="small" @click="editOutline = !editOutline">{{ editOutline ? '预览' : '编辑' }}</Button>
        </div>
      </div>
      <div class="outline-view">
        <OutlineEditor v-if="editOutline" v-model:value="outlineContent" />
        <pre v-else>{{ outlineContent }}</pre>
      </div>
    </div>
    
    <Divider />
    
    <div class="title">自定义模板</div>
    <div class="row">
      <Button style="flex: 1;" @click="saveAsTemplate">保存当前页为模板</Button>
    </div>
    <div class="custom-templates" v-if="customTemplates.length">
      <div
        class="template-item"
        v-for="(template, index) in customTemplates"
        :key="index"
        @click="applyTemplate(template)"
      >
        <div class="template-preview" :style="{ backgroundImage: `url(${template.thumbnail})` }"></div>
        <div class="template-name">{{ template.name }}</div>
        <div class="template-actions">
          <Button size="small" @click.stop="deleteCustomTemplate(index)">删除</Button>
        </div>
      </div>
    </div>
    
    <Divider />
    
    <div class="title">文件操作</div>
    <div class="row">
      <Button style="flex: 1;" @click="showJSONViewer = true">查看当前页面JSON</Button>
    </div>
    
    <FullscreenSpin :loading="loading" tip="AI生成中，请耐心等待 ..." />
    
    <JSONViewer v-if="showJSONViewer" :data="currentSlide" @close="showJSONViewer = false" />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import { nanoid } from 'nanoid'
import type { Slide, SlideBackground, PPTElement, PPTTextElement } from '@/types/slides'
import type { AIPPTSlide } from '@/types/AIPPT'
import api from '@/services'
import useAIPPT from '@/hooks/useAIPPT'
import message from '@/utils/message'
import { throttle } from 'lodash'

import Button from '@/components/Button.vue'
import Divider from '@/components/Divider.vue'
import TextArea from '@/components/TextArea.vue'
import Select from '@/components/Select.vue'
import OutlineEditor from '@/components/OutlineEditor.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import JSONViewer from './JSONViewer.vue'

interface Template {
  name: string
  thumbnail: string
  id?: string
  slides?: any[]
  elements?: any[]
}

interface TemplateOption {
  id: string
  name: string
}

const slidesStore = useSlidesStore()
const { AIPPT } = useAIPPT()
const { currentSlide, templates: systemTemplates } = storeToRefs(slidesStore)

const { addHistorySnapshot } = useHistorySnapshot()

// AI相关状态
const loading = ref(false)
const language = ref<'zh' | 'en'>('zh')
const model = ref('ep-20250411144626-zx55l')
const outlineContent = ref('')
const editOutline = ref(false)

// Markdown内容
const markdownContent = ref('')
const selectedTemplateId = ref('xiaohongshu')

// JSON查看器状态
const showJSONViewer = ref(false)

// 模板选项
const templateOptions = ref<TemplateOption[]>([
  { id: 'xiaohongshu', name: '小红书风格' },
  { id: 'business', name: '简约商务' },
  { id: 'colorful', name: '创意多彩' }
])

// 预设模板列表
const templates = ref<Template[]>([
  {
    name: '小红书风格',
    id: 'xiaohongshu',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23FFF1F2" /><text x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" fill="%23FF2E63">小红书风格</text></svg>',
  },
  {
    name: '简约商务',
    id: 'business',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23F5F5F5" /><text x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" fill="%23333333">简约商务</text></svg>',
  },
  {
    name: '创意多彩',
    id: 'colorful',
    thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23E3F2FD" /><text x="50" y="50" font-family="Arial" font-size="12" text-anchor="middle" fill="%234285F4">创意多彩</text></svg>',
  },
])

// 用户自定义模板列表
const customTemplates = ref<Template[]>([])

// 应用模板
const applyTemplate = (template: Template) => {
  // 应用模板逻辑（根据实际需要实现）
  console.log('应用模板', template.name)
  
  // 模拟添加一些元素或更改背景
  if (template.name === '小红书风格' || template.id === 'xiaohongshu') {
    slidesStore.updateSlide({ 
      background: {
        type: 'solid',
        color: '#FFF1F2'
      }
    })
    addHistorySnapshot()
  } else if (template.id === 'business') {
    slidesStore.updateSlide({ 
      background: {
        type: 'solid',
        color: '#F5F5F5'
      }
    })
    addHistorySnapshot()
  } else if (template.id === 'colorful') {
    slidesStore.updateSlide({ 
      background: {
        type: 'solid',
        color: '#E3F2FD'
      }
    })
    addHistorySnapshot()
  }
}

// 从Markdown生成PPT大纲
const generateFromMarkdown = async () => {
  if (!markdownContent.value) return message.error('请输入Markdown内容')
  
  loading.value = true
  outlineContent.value = ''
  editOutline.value = false
  
  try {
    // 将Markdown内容发送到AI服务生成大纲
    const stream = await api.AIPPT_Outline(markdownContent.value, language.value, model.value)
    
    const reader = stream.body.getReader()
    const decoder = new TextDecoder('utf-8')
    
    const readStream = () => {
      reader.read().then(({ done, value }: ReadableStreamReadResult<Uint8Array>) => {
        if (done) {
          loading.value = false
          return
        }
        
        const chunk = decoder.decode(value, { stream: true })
        outlineContent.value += chunk
        
        readStream()
      })
    }
    readStream()
  } 
  catch (error) {
    console.error('AI生成大纲失败', error)
    message.error('AI生成大纲失败，请重试')
    loading.value = false
  }
}

// 确认大纲并生成PPT
const confirmOutline = async () => {
  if (!outlineContent.value) return message.error('请先生成大纲')
  
  loading.value = true
  
  try {
    // 获取模板幻灯片
    let templateSlides: Slide[] = []
    
    // 根据选择的模板ID获取对应的系统模板
    if (selectedTemplateId.value === 'xiaohongshu') {
      templateSlides = await api.getFileData('custom_template').then(ret => ret.slides)
    } else if (selectedTemplateId.value === 'business') {
      templateSlides = await api.getFileData('template_2').then(ret => ret.slides)
    } else if (selectedTemplateId.value === 'colorful') {
      templateSlides = await api.getFileData('template_3').then(ret => ret.slides)
    }
    
    // 调用AI服务生成PPT
    const stream = await api.AIPPT(outlineContent.value, language.value, model.value)
    
    const reader = stream.body.getReader()
    const decoder = new TextDecoder('utf-8')
    
    // 清空当前幻灯片 - 使用正确的方法
    const slideCount = slidesStore.slides.length
    for (let i = slideCount - 1; i >= 0; i--) {
      slidesStore.deleteSlide(slidesStore.slides[i].id)
    }
    
    const readStream = () => {
      reader.read().then(({ done, value }: ReadableStreamReadResult<Uint8Array>) => {
        if (done) {
          loading.value = false
          outlineContent.value = ''
          addHistorySnapshot()
          return
        }
        
        const chunk = decoder.decode(value, { stream: true })
        try {
          const slide: AIPPTSlide = JSON.parse(chunk)
          AIPPT(templateSlides, [slide])
        }
        catch (err) {
          console.error('解析AI返回的幻灯片数据失败', err)
        }
        
        readStream()
      })
    }
    readStream()
  }
  catch (error) {
    console.error('AI生成PPT失败', error)
    message.error('AI生成PPT失败，请重试')
    loading.value = false
  }
}

// 保存当前页为模板
const saveAsTemplate = () => {
  if (!currentSlide.value) return
  
  // 创建缩略图（这里用简单的 SVG 代替，实际应用可能需要生成真实缩略图）
  const backgroundColor = currentSlide.value.background?.color || '#ffffff'
  const thumbnail = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${backgroundColor}" /><text x="50" y="50" font-family="Arial" font-size="10" text-anchor="middle" fill="%23333">自定义模板</text></svg>`
  
  // 添加到自定义模板列表
  customTemplates.value.push({
    name: `自定义模板 ${customTemplates.value.length + 1}`,
    thumbnail,
    elements: JSON.parse(JSON.stringify(currentSlide.value.elements))
  })
}

// 删除自定义模板
const deleteCustomTemplate = (index: number) => {
  customTemplates.value.splice(index, 1)
}
</script>

<style lang="scss" scoped>
.slide-template-panel {
  padding: 12px 0;
}

.title {
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 500;
}

.row {
  width: 100%;
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.template-list,
.custom-templates {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.template-item {
  cursor: pointer;
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid #eee;
  position: relative;
  
  &:hover {
    box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
    
    .template-actions {
      opacity: 1;
    }
  }
}

.template-preview {
  height: 80px;
  background-size: cover;
  background-position: center;
  background-color: #f7f7f7;
}

.template-name {
  padding: 5px;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-actions {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0;
  transition: opacity 0.2s;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
  padding: 2px;
}

.preview {
  margin-top: 10px;
  margin-bottom: 15px;
  
  .outline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    
    .outline-title {
      font-weight: 500;
      font-size: 13px;
    }
    
    .outline-actions {
      display: flex;
      gap: 5px;
    }
  }
  
  .outline-view {
    max-height: 200px;
    padding: 10px;
    background-color: #f5f5f5;
    border-radius: 4px;
    overflow: auto;
    
    pre {
      margin: 0;
      white-space: pre-wrap;
      font-size: 12px;
      line-height: 1.5;
    }
  }
}
</style> 