<template>
  <div class="json-viewer">
    <div class="header">
      <div class="title">当前文件 JSON 查看器</div>
      <div class="actions">
        <Button class="action-btn" @click="toggleEditMode">{{ isEditMode ? '查看模式' : '编辑模式' }}</Button>
        <Button class="close-btn" @click="emit('close')">关闭</Button>
      </div>
    </div>
    <div class="content">
      <pre v-if="!isEditMode">{{ formattedJSON }}</pre>
      <textarea
        v-else
        v-model="editorContent"
        class="json-editor"
        placeholder="编辑 JSON 内容..."
        spellcheck="false"
      ></textarea>
    </div>
    <div class="footer">
      <div class="left-actions">
        <input 
          type="file" 
          ref="fileInput" 
          accept=".json" 
          style="display: none;" 
          @change="handleFileImport"
        />
        <Button class="import-btn" @click="triggerFileInput">导入 JSON</Button>
        <span class="error-message" v-if="errorMessage">{{ errorMessage }}</span>
      </div>
      <div class="right-actions">
        <Button class="copy-btn" @click="copyToClipboard">复制 JSON</Button>
        <Button class="download-btn" @click="downloadJSON">下载 JSON</Button>
        <Button 
          class="apply-btn" 
          type="primary" 
          @click="applyChanges" 
          :disabled="!isEditMode || !isValidJSON"
        >应用更改</Button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import Button from '@/components/Button.vue'
import message from '@/utils/message'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'

const emit = defineEmits<{
  (event: 'close'): void
}>()

// 从props接收要显示的数据
const props = defineProps<{
  data?: any
}>()

const slidesStore = useSlidesStore()
const { currentSlide, theme, title, viewportSize, viewportRatio } = storeToRefs(slidesStore)
const { addHistorySnapshot } = useHistorySnapshot()

// JSON 编辑状态
const isEditMode = ref(false)
const editorContent = ref('')
const errorMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

// 格式化JSON显示，优先使用传入的数据，否则使用当前幻灯片的完整信息
const formattedJSON = computed(() => {
  if (props.data) return JSON.stringify(props.data, null, 2)
  
  const jsonData = {
    title: title.value,
    width: viewportSize.value,
    height: viewportSize.value * viewportRatio.value,
    theme: theme.value,
    slides: [currentSlide.value],
  }
  return JSON.stringify(jsonData, null, 2)
})

// 监听格式化的JSON，更新编辑器内容
watch(formattedJSON, (newValue) => {
  if (!isEditMode.value) {
    editorContent.value = newValue
  }
})

// 初始化编辑器内容
watch(isEditMode, (newValue) => {
  if (newValue) {
    editorContent.value = formattedJSON.value
  }
})

// 检查JSON是否有效
const isValidJSON = computed(() => {
  if (!editorContent.value) return false
  try {
    JSON.parse(editorContent.value)
    errorMessage.value = ''
    return true
  } catch (e) {
    errorMessage.value = '无效的 JSON 格式'
    return false
  }
})

// 切换编辑模式
const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
  if (isEditMode.value) {
    editorContent.value = formattedJSON.value
  }
}

// 复制到剪贴板
const copyToClipboard = () => {
  const contentToCopy = isEditMode.value ? editorContent.value : formattedJSON.value
  navigator.clipboard.writeText(contentToCopy)
    .then(() => message.success('已复制到剪贴板'))
    .catch(() => message.error('复制失败，请手动复制'))
}

// 下载JSON文件
const downloadJSON = () => {
  const contentToDownload = isEditMode.value ? editorContent.value : formattedJSON.value
  const blob = new Blob([contentToDownload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'slide_' + new Date().getTime() + '.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  message.success('已下载 JSON 文件')
}

// 导入JSON文件
const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    try {
      // 验证是否为有效的JSON
      JSON.parse(content)
      editorContent.value = JSON.stringify(JSON.parse(content), null, 2)
      isEditMode.value = true
      message.success('JSON 文件导入成功')
    } catch (error) {
      message.error('导入失败：无效的 JSON 文件')
    }
    
    // 重置 input 以允许导入相同的文件
    if (fileInput.value) fileInput.value.value = ''
  }
  
  reader.readAsText(file)
}

// 应用更改到当前幻灯片
const applyChanges = () => {
  if (!isValidJSON.value) return
  
  try {
    const newData = JSON.parse(editorContent.value)
    
    // 检查是否为有效的数据结构
    if (typeof newData !== 'object') {
      message.error('无效的数据结构')
      return
    }
    
    // 如果是完整的演示文稿数据
    if (newData.slides && Array.isArray(newData.slides)) {
      // 更新主题
      if (newData.theme) {
        slidesStore.setTheme(newData.theme)
      }
      
      // 更新标题
      if (newData.title) {
        slidesStore.setTitle(newData.title)
      }
      
      // 更新当前幻灯片
      if (newData.slides[0] && newData.slides[0].id) {
        slidesStore.updateSlide(newData.slides[0])
      }
    }
    // 如果只是单个幻灯片数据
    else if (newData.id) {
      slidesStore.updateSlide(newData)
    }
    else {
      message.error('无效的幻灯片数据结构')
      return
    }
    
    addHistorySnapshot()
    message.success('已应用 JSON 更改')
    isEditMode.value = false
  } catch (error) {
    message.error('应用更改失败')
  }
}

// 触发文件输入
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}
</script>

<style lang="scss" scoped>
.json-viewer {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80vw;
  height: 80vh;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  z-index: 1000;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;

  .title {
    font-size: 16px;
    font-weight: 600;
  }
  
  .actions {
    display: flex;
    gap: 10px;
  }
}

.content {
  flex: 1;
  overflow: auto;
  padding: 0;
  background-color: #f9f9f9;

  pre {
    margin: 0;
    padding: 15px;
    font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace;
    font-size: 14px;
    color: #0451a5;
    white-space: pre-wrap;
  }
  
  .json-editor {
    width: 100%;
    height: 100%;
    border: none;
    padding: 15px;
    font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace;
    font-size: 14px;
    color: #0451a5;
    background-color: #f9f9f9;
    resize: none;
    outline: none;
    white-space: pre-wrap;
    box-sizing: border-box;
  }
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-top: 1px solid #eee;
  
  .left-actions, .right-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  .error-message {
    color: #f56c6c;
    font-size: 12px;
    margin-left: 10px;
  }
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