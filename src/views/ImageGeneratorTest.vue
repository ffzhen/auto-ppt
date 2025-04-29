<template>
  <div class="image-generator-test">
    <h1>火山引擎生图测试</h1>
    
    <div class="form-container">
      <div class="form-group">
        <label for="prompt">提示词</label>
        <textarea 
          id="prompt" 
          v-model="params.text_prompt" 
          placeholder="请输入图片描述，如：现代简约风格背景"
          rows="3"
        ></textarea>
      </div>
      <div class="form-group">
        <label for="prompt">工作流ID</label>
        <textarea 
          id="prompt" 
          v-model="params.workflow_id" 
          placeholder="请输入工作流ID，如：7497907182836858915"
          rows="3"
        ></textarea>
      </div>
      <div class="form-group">
        <label for="prompt">api_token</label>
        <textarea 
          id="prompt" 
          v-model="params.api_token" 
          placeholder="请输入api_token，如：pat_1HpbPRDq4dMBICHLYDyv3NQD4RYt6zb6a416ywPPxgql0g7AS0cuqoFjCLX408yi"
          rows="3"
        ></textarea>
      </div>
      
     
      
    
      
    
      <div class="form-actions">
        <button @click="generateImage" :disabled="isGenerating">
          {{ isGenerating ? '生成中...' : '生成图片' }}
        </button>
      </div>
    </div>
    
    <div v-if="isGenerating" class="loading">
      <div class="spinner"></div>
      <p>正在生成图片，请稍候...</p>
    </div>
    
    <div v-if="result" class="result">
      <h2>生成结果</h2>
      <div class="image-container">
        <img :src="result.image_url" alt="生成的图片" />
      </div>
      <div class="image-info">
        <p><strong>种子值:</strong> {{ result.seed }}</p>
        <p><strong>风格ID:</strong> {{ result.style_id }}</p>
      </div>
    </div>
    
    <div v-if="error" class="error">
      <p>{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import api from '@/services'

const isGenerating = ref(false)
const result = ref<{ image_url: string; seed: number; style_id: string } | null>(null)
const error = ref<string | null>(null)

const params = reactive({
  prompt: '千军万马',
  workflow_id: '7497907182836858915',
  api_token: 'pat_1HpbPRDq4dMBICHLYDyv3NQD4RYt6zb6a416ywPPxgql0g7AS0cuqoFjCLX408yi',
 
})

async function generateImage() {
  if (!params.prompt) {
    error.value = '请输入提示词'
    return
  }
  
  error.value = null
  isGenerating.value = true
  
  try {
    result.value = await api.generateVolcengineImage(params)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '生成图片失败，请重试'
  } finally {
    isGenerating.value = false
  }
}
</script>

<style scoped>
.image-generator-test {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.form-container {
  background: #f5f7fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-row {
  display: flex;
  gap: 15px;
}

.half {
  width: 50%;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 600;
}

textarea, select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

button {
  background: #3498db;
  color: white;
  border: none;
  padding: 12px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

button:disabled {
  background: #95a5a6;
  cursor: not-allowed;
}

.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 30px 0;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-left-color: #3498db;
  animation: spin 1s ease infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.result {
  margin-top: 30px;
}

.image-container {
  display: flex;
  justify-content: center;
  margin-bottom: 15px;
}

.image-container img {
  max-width: 100%;
  max-height: 600px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.image-info {
  background: #f5f7fa;
  padding: 15px;
  border-radius: 8px;
}

.error {
  color: #e74c3c;
  padding: 15px;
  background: #fadbd8;
  border-radius: 4px;
  margin-top: 20px;
}
</style> 