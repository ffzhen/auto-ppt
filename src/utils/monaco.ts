import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

// @ts-ignore
self.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new jsonWorker()
    }
    return new editorWorker()
  }
}

// 初始化 Monaco 编辑器配置
export function initMonacoEditor() {
  // JSON 语言配置
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    allowComments: false,
    schemas: [],
    enableSchemaRequest: false,
    schemaRequest: 'warning',
    schemaValidation: 'warning',
    trailingCommas: 'error',
  })
  
  // 主题配置
  monaco.editor.defineTheme('jsonCustomTheme', {
    base: 'vs',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#f8f8f8',
    }
  })
}

export default monaco 