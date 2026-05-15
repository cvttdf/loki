import { ansiToHtml, stripAnsi } from './ansi-to-html'
import type { ErrorAnalysis } from '@/ai/error-analyzer'

export interface Block {
  id: string
  type: 'command' | 'ai-response' | 'system'
  command: string
  exitCode: number
  startTime: number
  endTime: number
  htmlContent: string
  rawContent: string
  plainText: string
  status: 'running' | 'success' | 'error'
  isCollapsed: boolean
  analysis?: ErrorAnalysis
  analysisLoading?: boolean
}

type BlockHandler = (block: Block) => void

export class BlockManager {
  private blocks = new Map<string, Block>()
  private blockOrder: string[] = []
  private activeBlockId: string | null = null
  private rawChunks: string[] = []
  private totalChunkSize = 0
  private handlers = new Map<string, BlockHandler[]>()

  createBlock(command: string): Block {
    const block: Block = {
      id: crypto.randomUUID(),
      type: 'command',
      command,
      exitCode: -1,
      startTime: Date.now(),
      endTime: 0,
      htmlContent: '',
      rawContent: '',
      plainText: '',
      status: 'running',
      isCollapsed: false,
    }
    this.blocks.set(block.id, block)
    this.blockOrder.push(block.id)
    this.activeBlockId = block.id
    this.rawChunks = []
    this.emit('block-created', block)
    return block
  }

  feedOutput(data: string): void {
    if (!this.activeBlockId) return
    this.rawChunks.push(data)
    this.totalChunkSize += data.length
    // Cap at 1MB — keep only the last 100 chunks
    if (this.totalChunkSize > 1_000_000 && this.rawChunks.length > 100) {
      const removed = this.rawChunks.splice(0, this.rawChunks.length - 100)
      this.totalChunkSize = this.rawChunks.reduce((sum, c) => sum + c.length, 0)
    }
  }

  finishBlock(id: string, exitCode: number): void {
    const block = this.blocks.get(id)
    if (!block) return

    const raw = this.rawChunks.join('')
    block.exitCode = exitCode
    block.endTime = Date.now()
    block.rawContent = raw
    block.htmlContent = ansiToHtml(raw)
    block.plainText = stripAnsi(raw)
    block.status = exitCode === 0 ? 'success' : 'error'
    this.activeBlockId = null
    this.rawChunks = []
    this.totalChunkSize = 0
    this.emit('block-finished', block)
  }

  getBlock(id: string): Block | undefined {
    return this.blocks.get(id)
  }

  getAllBlocks(): Block[] {
    return this.blockOrder.map((id) => this.blocks.get(id)!)
  }

  getActiveBlock(): Block | null {
    if (!this.activeBlockId) return null
    return this.blocks.get(this.activeBlockId) ?? null
  }

  getLastBlock(): Block | null {
    if (this.blockOrder.length === 0) return null
    return this.blocks.get(this.blockOrder[this.blockOrder.length - 1]) ?? null
  }

  clear(): void {
    this.blocks.clear()
    this.blockOrder = []
    this.activeBlockId = null
    this.rawChunks = []
    this.totalChunkSize = 0
  }

  on(event: string, handler: BlockHandler): { dispose: () => void } {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
    return {
      dispose: () => {
        const arr = this.handlers.get(event)
        if (arr) {
          const idx = arr.indexOf(handler)
          if (idx !== -1) arr.splice(idx, 1)
        }
      },
    }
  }

  private emit(event: string, block: Block): void {
    this.handlers.get(event)?.forEach((h) => h(block))
  }

  setBlockAnalysis(id: string, analysis: ErrorAnalysis): void {
    const block = this.blocks.get(id)
    if (block) {
      block.analysis = analysis
      this.emit('block-updated', block)
    }
  }

  dispose(): void {
    this.clear()
    this.handlers.clear()
  }
}
