<template>
  <div class="export-json-dialog">
    <div class="preview">
      <pre>{{ json }}</pre>
    </div>

    <div class="btns">
      <Button class="btn export" type="primary" @click="exportJSON()">导出 JSON</Button>
      <Button class="btn copy" type="primary" @click="copyToClipboard()">复制 JSON</Button>
      <Button class="btn close" @click="emit('close')">关闭</Button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import useExport from '@/hooks/useExport'
import Button from '@/components/Button.vue'
import message from '@/utils/message'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const { slides, viewportRatio, title, viewportSize, theme } = storeToRefs(useSlidesStore())
const { exportJSON } = useExport()

const json = computed(() => {
  return {
    title: title.value,
    width: viewportSize.value,
    height: viewportSize.value * viewportRatio.value,
    theme: theme.value,
    slides: slides.value,
  }
})

// 复制JSON到剪贴板
const copyToClipboard = () => {
  const jsonString = JSON.stringify(json.value, null, 2)
  navigator.clipboard.writeText(jsonString).then(() => {
    message.success('JSON 已复制到剪贴板')
  }).catch(() => {
    message.error('复制失败，请检查浏览器权限设置')
  })
}
</script>

<style lang="scss" scoped>
.export-json-dialog {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.preview {
  width: 100%;
  height: calc(100% - 100px);
  background-color: #f9f9f9;
  color: #0451a5;
  overflow: auto;
}
pre {
  font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, Courier, monospace;
}
.btns {
  width: 300px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;

  .export {
    flex: 1;
  }
  .copy {
    flex: 1;
    margin-left: 10px;
  }
  .close {
    width: 100px;
    margin-left: 10px;
  }
}
::-webkit-scrollbar {
  width: 10px;
  height: 10px;
  background-color: transparent;
}
::-webkit-scrollbar-thumb {
  background-color: #e1e1e1;
  border-radius: 5px;
}
</style>