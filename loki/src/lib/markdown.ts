const CODE_PLACEHOLDER = '\x00CB\x00'

function processInline(text: string): string {
  return text
    .replace(/`([^`]+)`/g, '<code class="bg-loki-bg px-1 rounded text-sm font-mono">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      (_full: string, text: string, url: string) => {
        const safe = /^(https?|mailto):/i.test(url)
        return safe
          ? `<a href="${url}" target="_blank" rel="noopener" class="text-loki-accent underline">${text}</a>`
          : text
      },
    )
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function renderMarkdown(text: string): string {
  // Phase 1: Extract code blocks and replace with placeholders
  const codeBlocks: Array<{ lang: string; code: string }> = []

  let html = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_full, lang: string, code: string) => {
    const idx = codeBlocks.length
    codeBlocks.push({ lang: lang || 'text', code: escapeHtml(code.trimEnd()) })
    return `${CODE_PLACEHOLDER}${idx}${CODE_PLACEHOLDER}`
  })

  // Phase 2: Escape HTML in remaining text
  html = escapeHtml(html)

  // Phase 3: Process line-by-line for block elements
  const lines = html.split('\n')
  const result: string[] = []
  let inList = false
  let paraLines: string[] = []

  function flushParagraph() {
    if (paraLines.length > 0) {
      const content = paraLines.join('\n').trim()
      if (content) {
        result.push(`<p class="mb-2 last:mb-0">${processInline(content)}</p>`)
      }
      paraLines = []
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code block placeholder — pass through unchanged
    if (line.includes(CODE_PLACEHOLDER)) {
      flushParagraph()
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      result.push(line)
      continue
    }

    // Headers
    const h3 = /^### (.+)/.exec(line)
    if (h3) {
      flushParagraph()
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      result.push(`<h3 class="text-base font-semibold mt-3 mb-1 text-loki-fg">${processInline(h3[1])}</h3>`)
      continue
    }
    const h2 = /^## (.+)/.exec(line)
    if (h2) {
      flushParagraph()
      if (inList) {
        result.push('</ul>')
        inList = false
      }
      result.push(`<h2 class="text-lg font-semibold mt-4 mb-2 text-loki-fg">${processInline(h2[1])}</h2>`)
      continue
    }

    // Bullet list items
    const li = /^- (.+)/.exec(line)
    if (li) {
      if (!inList) {
        flushParagraph()
        inList = true
        result.push('<ul class="list-disc list-inside mb-2 space-y-1">')
      }
      result.push(`<li>${processInline(li[1])}</li>`)
      continue
    }
    if (inList) {
      result.push('</ul>')
      inList = false
    }

    // Empty line signals paragraph break
    if (line.trim() === '') {
      flushParagraph()
      continue
    }

    // Regular text — accumulate for paragraph wrapping
    paraLines.push(line)
  }

  if (inList) result.push('</ul>')
  flushParagraph()

  html = result.join('\n')

  // Phase 4: Restore code blocks
  html = html.replace(
    new RegExp(CODE_PLACEHOLDER.replace(/\x00/g, '\\x00') + '(\\d+)' + CODE_PLACEHOLDER.replace(/\x00/g, '\\x00'), 'g'),
    (_full, idx: string) => {
      const block = codeBlocks[parseInt(idx, 10)]
      if (!block) return ''
      return `<pre class="bg-loki-bg rounded-lg p-3 my-2 overflow-x-auto border border-loki-border"><code class="language-${block.lang} text-sm font-mono">${block.code}</code></pre>`
    },
  )

  return html
}
