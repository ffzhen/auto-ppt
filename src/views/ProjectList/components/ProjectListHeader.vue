<script lang="ts" setup>
import { useProjectStore } from '@/store/projects'
import { useRouter } from 'vue-router'

defineEmits<{
  (e: 'create'): void
}>()

const projectStore = useProjectStore()
const router = useRouter()

function openMarkdownEditor() {
  router.push('/markdown')
}
</script>

<template>
  <div class="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
    <h1 
      class="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent"
      role="heading"
      aria-level="1"
    >
      我的项目列表
    </h1>
    <div class="flex gap-3 w-full sm:w-auto">
      <el-button 
        @click="openMarkdownEditor"
        class="flex-1 sm:flex-none markdown-btn"
        plain
        aria-label="打开 Markdown 编辑器"
      >
        📝 Markdown 编辑器
      </el-button>
      <el-button 
        type="primary" 
        class="flex-1 sm:flex-none create-btn" 
        @click="$emit('create')"
        aria-label="新建项目"
      >
        新建项目
      </el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.create-btn {
  @apply relative overflow-hidden;
  background: linear-gradient(45deg, #ec4899, #8b5cf6);
  border: none;
  
  &::before {
    content: '';
    @apply absolute inset-0 bg-white opacity-0 transition-opacity duration-300;
  }
  
  &:hover::before {
    @apply opacity-20;
  }
}

.markdown-btn {
  @apply relative overflow-hidden;
  background: linear-gradient(45deg, #06b6d4, #3b82f6);
  color: white;
  border: none;
  
  &::before {
    content: '';
    @apply absolute inset-0 bg-white opacity-0 transition-opacity duration-300;
  }
  
  &:hover::before {
    @apply opacity-20;
  }
}
</style> 