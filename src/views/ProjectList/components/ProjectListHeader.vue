<script lang="ts" setup>
import { useProjectStore } from '@/store/projects'

defineEmits<{
  (e: 'create'): void
}>()

const projectStore = useProjectStore()
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
    <el-button 
      type="primary" 
      class="w-full sm:w-auto create-btn" 
      @click="$emit('create')"
      aria-label="新建项目"
    >
      新建项目
    </el-button>
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
</style> 