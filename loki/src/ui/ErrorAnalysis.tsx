import React, { useState, useCallback } from 'react'
import type { ErrorAnalysis as ErrorAnalysisType } from '@/ai/error-analyzer'
import { copyToClipboard } from '@/lib/clipboard'

interface ErrorAnalysisProps {
  analysis?: ErrorAnalysisType
  isLoading: boolean
  onAnalyze: () => void
}

const SparkleIcon: React.FC = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3z" />
    <path d="M6 18l1 2.5L9.5 21.5 7 23l-1 3-1-3-2.5-1.5L5 20.5 6 18z" />
    <path d="M18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16z" />
  </svg>
)

const SkeletonLine: React.FC<{ width?: string }> = ({ width = '100%' }) => (
  <div className="ea-skeleton-line" style={{ width }} />
)

export const ErrorAnalysis: React.FC<ErrorAnalysisProps> = React.memo(({
  analysis,
  isLoading,
  onAnalyze,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const handleCopySuggestion = useCallback(async (cmd: string, index: number) => {
    await copyToClipboard(cmd)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 1500)
  }, [])

  if (!analysis && !isLoading) {
    return (
      <div className="ea-container">
        <div className="ea-header" onClick={() => setIsCollapsed(!isCollapsed)}>
          <span className="ea-header-left">
            <span className="ea-sparkle"><SparkleIcon /></span>
            <span className="ea-title">AI Analysis</span>
          </span>
          <button
            className="ea-analyze-btn"
            onClick={(e) => { e.stopPropagation(); onAnalyze() }}
          >
            <SparkleIcon />
            <span>Analyze</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="ea-container">
      <div className="ea-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <span className="ea-header-left">
          <span className="ea-sparkle"><SparkleIcon /></span>
          <span className="ea-title">AI Analysis</span>
        </span>
        <span className="ea-collapse-arrow">{isCollapsed ? '▶' : '▼'}</span>
      </div>

      {!isCollapsed && (
        <div className="ea-body">
          {isLoading ? (
            <div className="ea-loading">
              <SkeletonLine width="90%" />
              <SkeletonLine width="100%" />
              <SkeletonLine width="70%" />
              <SkeletonLine width="85%" />
              <SkeletonLine width="40%" />
            </div>
          ) : analysis ? (
            <>
              <p className="ea-analysis-text">{analysis.analysis}</p>

              {analysis.suggestions.length > 0 && (
                <div className="ea-suggestions">
                  <div className="ea-suggestions-label">Suggestions</div>
                  <ul className="ea-suggestions-list">
                    {analysis.suggestions.map((cmd, i) => (
                      <li key={i} className="ea-suggestion-item">
                        <button
                          className="ea-suggestion-btn"
                          onClick={() => handleCopySuggestion(cmd, i)}
                        >
                          <code className="ea-suggestion-cmd">{cmd}</code>
                          <span className="ea-suggestion-action">
                            {copiedIndex === i ? '✓ Copied' : 'Copy'}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  )
})
