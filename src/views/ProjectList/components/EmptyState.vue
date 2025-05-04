<script lang="ts" setup>
defineEmits<{
  (e: 'create'): void
}>()
</script>

<template>
  <div 
    class="flex flex-col items-center justify-center min-h-[300px] empty-state"
    role="status"
    aria-label="无项目"
  >
    <div class="empty-icon">
      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" aria-hidden="true">
        <circle cx="60" cy="60" r="50" stroke="currentColor" stroke-width="4" stroke-dasharray="8 8"/>
        <path d="M40 60h40M60 40v40" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
      </svg>
    </div>
    <p class="text-xl mt-4 mb-6">开始创建你的第一个项目吧！</p>
    <el-button 
      type="primary" 
      class="create-btn" 
      @click="$emit('create')"
      aria-label="创建新项目"
    >
      创建项目
    </el-button>
  </div>
</template>

<style lang="scss" scoped>
.empty-state {
  @apply relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-dashed border-gray-200;
  
  .empty-icon {
    @apply text-gray-300 transition-colors duration-300;
  }
  
  &:hover .empty-icon {
    @apply text-purple-500;
  }
}

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