<template>
  <div v-if="modelValue" class="modal-overlay">
    <div class="modal-content">
      <div class="modal-header">
        <img src="/whale-icon.svg" alt="Deepseek Logo" class="whale-icon" />
      </div>
      
      <h2 class="modal-title">关联 Deepseek 大模型账号</h2>
      <p class="modal-subtitle">
        请填写相关信息后进行关联，前往获取相关信息
        <a href="https://bytedance.larkoffice.com/wiki/YwQmwA4gki2pXsk4rqBcB93gnPe" target="_blank" rel="noopener noreferrer">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      </p>

      <div class="input-group">
        <input 
          type="text" 
          v-model="arkApiKey"
          placeholder="密钥 ARK_API_KEY"
          class="modal-input"
          :class="{ 'error': showErrors && !arkApiKey }"
        >
        <div v-if="showErrors && !arkApiKey" class="error-text">
          请填写 密钥 ARK_API_KEY
        </div>
      </div>

      <div class="input-group">
        <input 
          type="text" 
          v-model="endpointId"
          placeholder="接入点ID YOUR_ENDPOINT_ID"
          class="modal-input"
          :class="{ 'error': showErrors && !endpointId }"
        >
        <div v-if="showErrors && !endpointId" class="error-text">
          请填写 接入点ID YOUR_ENDPOINT_ID
        </div>
      </div>

      <button class="submit-button" @click="handleSubmit">
        关联账号
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', arkApiKey: string, endpointId: string): void
}>()

const arkApiKey = ref('')
const endpointId = ref('')
const showErrors = ref(false)

const handleSubmit = () => {
  showErrors.value = true

  if (!arkApiKey.value || !endpointId.value) {
    return
  }

  // 保存到 localStorage
  localStorage.setItem('ARK_API_KEY', arkApiKey.value)
  localStorage.setItem('ENDPOINT_ID', endpointId.value)
  
  emit('submit', arkApiKey.value, endpointId.value)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  position: relative;
}

.modal-header {
  display: flex;
  justify-content: center;
  position: relative;
  margin-bottom: 1rem;
}

.whale-icon {
  width: 48px;
  height: 48px;
}

.modal-title {
  text-align: center;
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: #333;
}

.modal-subtitle {
  text-align: center;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.modal-subtitle a {
  color: #1a73e8;
  text-decoration: none;
}

.input-group {
  margin-bottom: 1rem;
}

.modal-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.modal-input::placeholder {
  color: #999;
}

.modal-input.error {
  border-color: #ff4d4f;
}

.error-text {
  color: #ff4d4f;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.submit-button {
  width: 100%;
  padding: 0.75rem;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover {
  background-color: #1557b0;
}
</style> 