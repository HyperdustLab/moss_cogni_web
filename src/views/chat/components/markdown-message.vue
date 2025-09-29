<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ message: string }>()

// Enhanced regex matching function for dash-space patterns
const processDashSpacePattern = (text: string): string => {
  // Handle various dash-space patterns for better line breaking
  let processedText = text

  // Pattern 1: Handle inline dash-space patterns (e.g., "text - item")
  processedText = processedText.replace(/([^\n\r])\s*-\s+([^-\n\r]+)/g, '$1\n- $2')

  // Pattern 2: Handle market data specific patterns with numbers and percentages
  processedText = processedText.replace(/(\d+(?:,\d+)*(?:\.\d+)?[^\n\r]*?)\s*-\s+([^-\n\r]+)/g, '$1\n- $2')

  // Pattern 3: Handle emoji and text combinations
  processedText = processedText.replace(/([🇺🇸🇬🇧🇯🇵🇨🇳🇩🇪🇫🇷]+\s*[^\n\r]*?)\s*-\s+([^-\n\r]+)/g, '$1\n- $2')

  // Pattern 4: Handle colon followed by dash-space
  processedText = processedText.replace(/([^\n\r]*：)\s*-\s+([^-\n\r]+)/g, '$1\n- $2')

  // Pattern 5: Clean up multiple consecutive dashes
  processedText = processedText.replace(/\n-\s+([^-\n\r]*)\s*-\s+/g, '\n- $1\n- ')

  return processedText
}

// Simple Markdown rendering function
const renderMarkdown = (text: string): string => {
  if (!text) return ''

  // First process dash-space patterns
  let html = processDashSpacePattern(text)

  // Handle headings, not dependent on line breaks
  // Handle H3 headings
  const h3Matches = html.match(/###\s+[^#\n]+/g)
  if (h3Matches) {
    h3Matches.forEach((match) => {
      const content = match.replace(/^###\s+/, '')
      html = html.replace(match, `<h3>${content}</h3>`)
    })
  }

  // Handle H2 headings
  const h2Matches = html.match(/##\s+[^#\n]+/g)
  if (h2Matches) {
    h2Matches.forEach((match) => {
      const content = match.replace(/^##\s+/, '')
      html = html.replace(match, `<h2>${content}</h2>`)
    })
  }

  // Handle H1 headings
  const h1Matches = html.match(/#\s+[^#\n]+/g)
  if (h1Matches) {
    h1Matches.forEach((match) => {
      const content = match.replace(/^#\s+/, '')
      html = html.replace(match, `<h1>${content}</h1>`)
    })
  }

  // Handle bold text
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')

  // Handle italic text
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // Tool calls are now handled in thinking list, so remove these patterns from text content
  html = html.replace(/^Running\s+([^-]+)(?:\s*-\s*(.+))?$/gim, '')
  html = html.replace(/^✅\s+Complete\s+([^\n]+)$/gim, '')

  // Handle reasoning content - convert <think> and </think> tags to special styles
  html = html.replace(/<think>(.*?)<\/think>/gs, '<div class="thinking-content">💭 Thinking process<br>$1</div>')

  // Additional regex patterns for specific formatting (after initial dash-space processing)
  // Handle any remaining inline dash patterns that weren't caught by the initial processing
  html = html.replace(/([^\n])\s*-\s+([^-\n]+)/g, '$1<br>- $2')

  // Clean up any double line breaks
  html = html.replace(/<br><br>/g, '<br>')

  // // Handle unordered lists - optimized list recognition logic
  // // First handle list items at the beginning of lines - only match true list patterns
  // // Avoid matching negative numbers, ranges, or other non-list uses of -
  // html = html.replace(/^-\s+(.+)$/gim, (match, content) => {
  //   // Check if this looks like a list item (not a negative number or range)
  //   const trimmedContent = content.trim()
  //   // If it starts with a number or looks like a negative number, don't treat as list
  //   if (/^[\d\-]/.test(trimmedContent) && !/^[\d\-]+\s/.test(trimmedContent)) {
  //     return match // Return original if it looks like a negative number
  //   }
  //   return `<li>${content}</li>`
  // })
  html = html.replace(/^[\*\+]\s+(.+)$/gim, '<li>$1</li>')

  // Wrap consecutive li tags in ul
  html = html.replace(/(<li>.*<\/li>)(\s*<li>.*<\/li>)*/gs, (match) => {
    return `<ul>${match}</ul>`
  })

  // Handle ordered lists - support decimal numbers like 1.0, 2.1, etc.
  // Split by number pattern and reconstruct as list items
  const orderedListPattern = /(\d+(?:\.\d+)?)\.\s+/g
  const parts = html.split(orderedListPattern)

  if (parts.length > 1) {
    let result = parts[0] // Keep text before first number
    let listItems = []

    for (let i = 1; i < parts.length; i += 2) {
      if (parts[i] && parts[i + 1]) {
        const number = parts[i]
        const content = parts[i + 1].trim()
        if (content) {
          listItems.push(`<li>${content}</li>`)
        }
      }
    }

    if (listItems.length > 0) {
      result += `<ol>${listItems.join('')}</ol>`
    }

    html = result
  }

  // Handle line breaks
  html = html.replace(/\n/g, '<br>')

  return html
}

// Computed property: render markdown content
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
  white-space: pre-wrap;
  display: block;
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
  display: block;
  clear: both;
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
  counter-reset: item;
}

.custom-markdown ol li {
  margin: 0.6em 0;
  line-height: 1.8;
  padding-left: 0.5em;
  counter-increment: item;
  position: relative;
}

.custom-markdown ol li::before {
  content: counter(item) '. ';
  color: #6b7280;
  font-weight: bold;
  position: absolute;
  left: -1.5em;
  top: 0;
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

/* Tool call styles removed - now handled in thinking list */

/* Reasoning content styles */
.thinking-content {
  display: block;
  padding: 8px 12px;
  margin: 4px 0;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.2);
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.5;
  color: #1e40af;
  font-style: italic;
}

/* Responsive design */
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
