import type { Block } from '@/terminal/block-manager'

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      ta.style.top = '-9999px'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      const success = document.execCommand('copy')
      document.body.removeChild(ta)
      return success
    } catch {
      return false
    }
  }
}

export function formatBlockForClipboard(block: Block): string {
  const lines: string[] = []
  lines.push(`$ ${block.command}`)
  if (block.plainText) {
    lines.push(block.plainText.trimEnd())
  }
  lines.push(`(exit code: ${block.exitCode})`)
  return lines.join('\n')
}

export async function copyBlocksToClipboard(blocks: Block[]): Promise<boolean> {
  const text = blocks.map(formatBlockForClipboard).join('\n\n')
  return copyToClipboard(text)
}
