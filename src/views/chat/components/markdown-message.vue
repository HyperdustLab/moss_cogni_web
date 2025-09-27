<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ message: string }>()

// 简单的 Markdown 渲染函数
const renderMarkdown = (text: string): string => {
  if (!text) return ''

  let html = text

  // 处理标题，不依赖换行符
  // 处理 H3 标题
  const h3Matches = html.match(/###\s+[^#\n]+/g)
  if (h3Matches) {
    h3Matches.forEach((match) => {
      const content = match.replace(/^###\s+/, '')
      html = html.replace(match, `<h3>${content}</h3>`)
    })
  }

  // 处理 H2 标题
  const h2Matches = html.match(/##\s+[^#\n]+/g)
  if (h2Matches) {
    h2Matches.forEach((match) => {
      const content = match.replace(/^##\s+/, '')
      html = html.replace(match, `<h2>${content}</h2>`)
    })
  }

  // 处理 H1 标题
  const h1Matches = html.match(/#\s+[^#\n]+/g)
  if (h1Matches) {
    h1Matches.forEach((match) => {
      const content = match.replace(/^#\s+/, '')
      html = html.replace(match, `<h1>${content}</h1>`)
    })
  }

  // 处理粗体
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // 处理斜体
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // 处理无序列表
  html = html.replace(/^-\s+(.+)$/gim, '<li>$1</li>')
  // 将连续的 li 标签包装在 ul 中
  html = html.replace(/(<li>.*<\/li>)(\s*<li>.*<\/li>)*/gs, (match) => {
    return `<ul>${match}</ul>`
  })

  // 处理有序列表
  html = html.replace(/^(\d+)\.\s+(.+)$/gim, '<li>$2</li>')

  // 处理换行
  html = html.replace(/\n/g, '<br>')

  return html
}

// 计算属性：渲染 markdown 内容
const renderedMarkdown = computed(() => {
  return renderMarkdown(props.message)
})
</script>

<template>
  <div class="custom-markdown" v-html="renderedMarkdown"></div>
</template>

<style scoped>
.custom-markdown {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
  line-height: 2;
  color: #374151;
  font-size: 16px;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.custom-markdown h1 {
  font-size: 1.9em;
  font-weight: 700;
  margin: 1.8em 0 1em 0;
  color: #111827;
  border-bottom: 2px solid #e5e7eb;
  padding-bottom: 0.6em;
}

.custom-markdown h2 {
  font-size: 1.65em;
  font-weight: 700;
  margin: 1.5em 0 1em 0;
  color: #111827;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5em;
}

.custom-markdown h3 {
  font-size: 1.4em;
  font-weight: 600;
  margin: 1.3em 0 0.7em 0;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 0.5em;
}

.custom-markdown h3::before {
  content: '';
  width: 4px;
  height: 1.2em;
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 2px;
  flex-shrink: 0;
}

.custom-markdown ul {
  margin: 1em 0;
  padding-left: 0;
  list-style: none;
}

.custom-markdown li {
  margin: 0.6em 0;
  line-height: 1.8;
  position: relative;
  padding-left: 1.5em;
}

.custom-markdown li::before {
  content: '•';
  color: #6b7280;
  font-weight: bold;
  position: absolute;
  left: 0;
  top: 0;
}

.custom-markdown ol {
  margin: 1em 0;
  padding-left: 1.5em;
}

.custom-markdown ol li {
  margin: 0.6em 0;
  line-height: 1.8;
  padding-left: 0.5em;
}

.custom-markdown ol li::before {
  display: none;
}

.custom-markdown strong {
  font-weight: 600;
  color: #111827;
  background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
  padding: 0.1em 0.3em;
  border-radius: 4px;
  font-size: 0.95em;
}

.custom-markdown em {
  font-style: italic;
  color: #6b7280;
  background: #f9fafb;
  padding: 0.1em 0.3em;
  border-radius: 4px;
  font-size: 0.9em;
}

.custom-markdown p {
  margin: 1em 0;
  line-height: 1.9;
}

.custom-markdown blockquote {
  margin: 1.2em 0;
  padding: 1em 1.2em;
  background: #f8fafc;
  border-left: 4px solid #3b82f6;
  border-radius: 0 6px 6px 0;
  color: #475569;
  font-style: italic;
}

.custom-markdown code {
  background: #f1f5f9;
  color: #e11d48;
  padding: 0.3em 0.5em;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 0.95em;
}

.custom-markdown pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 1.2em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1.2em 0;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
  font-size: 0.95em;
  line-height: 1.6;
}

.custom-markdown pre code {
  background: none;
  color: inherit;
  padding: 0;
}

.custom-markdown table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.2em 0;
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.custom-markdown th,
.custom-markdown td {
  padding: 0.9em 1.2em;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
}

.custom-markdown th {
  background: #f9fafb;
  font-weight: 600;
  color: #374151;
}

.custom-markdown tr:hover {
  background: #f9fafb;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .custom-markdown {
    font-size: 15px;
    line-height: 1.9;
  }

  .custom-markdown h1 {
    font-size: 1.7em;
    margin: 1.6em 0 0.9em 0;
  }

  .custom-markdown h2 {
    font-size: 1.5em;
    margin: 1.4em 0 0.9em 0;
  }

  .custom-markdown h3 {
    font-size: 1.3em;
    margin: 1.2em 0 0.6em 0;
  }

  .custom-markdown p {
    margin: 0.9em 0;
    line-height: 1.8;
  }

  .custom-markdown li {
    margin: 0.5em 0;
    line-height: 1.7;
  }
}
</style>
