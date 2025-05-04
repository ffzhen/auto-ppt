<template>
  <div 
    class="flex justify-center items-center min-h-[300px]"
    role="status"
    aria-label="加载中"
  >
    <div class="loading-animation">
      <div></div>
      <div></div>
      <div></div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.loading-animation {
  @apply flex gap-2;
  
  div {
    @apply w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500;
    animation: bounce 0.5s infinite alternate;
    
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes bounce {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-10px);
  }
}
</style> 