import React, { useState, useEffect, useCallback, useRef } from 'react'
import type { Block } from '@/terminal/block-manager'
import { useTerminalStore } from '@/store/terminal'

interface BlockSearchProps {
  blocks: Block[]
}

export const BlockSearch: React.FC<BlockSearchProps> = ({ blocks }) => {
  const searchQuery = useTerminalStore(s => s.searchQuery)
  const searchMatches = useTerminalStore(s => s.searchMatches)
  const isSearchOpen = useTerminalStore(s => s.isSearchOpen)
  const setSearchQuery = useTerminalStore(s => s.setSearchQuery)
  const setSearchMatches = useTerminalStore(s => s.setSearchMatches)
  const setSearchOpen = useTerminalStore(s => s.setSearchOpen)

  const [inputValue, setInputValue] = useState(searchQuery)
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Focus input when opened
  useEffect(() => {
    if (isSearchOpen) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isSearchOpen])

  // Compute matches when search query changes
  useEffect(() => {
    if (!searchQuery) {
      setSearchMatches([])
      setCurrentMatchIndex(0)
      return
    }
    const q = searchQuery.toLowerCase()
    const matched = blocks
      .filter(b => {
        if (!b.command && !b.plainText) return false
        return (b.command || '').toLowerCase().includes(q) ||
          (b.plainText || '').toLowerCase().includes(q)
      })
      .map(b => b.id)
    setSearchMatches(matched)
    setCurrentMatchIndex(matched.length > 0 ? 0 : -1)
  }, [searchQuery, blocks, setSearchMatches])

  // Scroll to current match
  useEffect(() => {
    if (currentMatchIndex < 0 || currentMatchIndex >= searchMatches.length) return
    const id = searchMatches[currentMatchIndex]
    const el = document.getElementById(`block-${id}`)
    if (el) {
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [currentMatchIndex, searchMatches])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSearchQuery(val)
    }, 300)
  }, [setSearchQuery])

  const navigateNext = useCallback(() => {
    if (searchMatches.length === 0) return
    setCurrentMatchIndex(prev => (prev + 1) % searchMatches.length)
  }, [searchMatches])

  const navigatePrev = useCallback(() => {
    if (searchMatches.length === 0) return
    setCurrentMatchIndex(prev =>
      prev <= 0 ? searchMatches.length - 1 : prev - 1
    )
  }, [searchMatches])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        navigatePrev()
      } else {
        navigateNext()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setSearchOpen(false)
      setSearchQuery('')
    }
  }, [navigateNext, navigatePrev, setSearchOpen, setSearchQuery])

  const handleClose = useCallback(() => {
    setSearchOpen(false)
    setSearchQuery('')
  }, [setSearchOpen, setSearchQuery])

  // Subscribe to Cmd+F externally and close on Escape globally
  useEffect(() => {
    if (!isSearchOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setSearchQuery('')
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [isSearchOpen, setSearchOpen, setSearchQuery])

  if (!isSearchOpen) return null

  const matchLabel = searchQuery
    ? searchMatches.length > 0
      ? `${currentMatchIndex + 1} of ${searchMatches.length}`
      : 'no matches'
    : ''

  return (
    <div className="block-search-bar">
      <div className="block-search-input-row">
        <svg className="block-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          className="block-search-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search blocks..."
        />
        {matchLabel && (
          <span className="block-search-count">{matchLabel}</span>
        )}
        <button
          className="block-search-nav-btn"
          onClick={navigatePrev}
          title="Previous match (Shift+Enter)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
        <button
          className="block-search-nav-btn"
          onClick={navigateNext}
          title="Next match (Enter)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <button
          className="block-search-close-btn"
          onClick={handleClose}
          title="Close search (Escape)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
