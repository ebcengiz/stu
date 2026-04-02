'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Plus, Check, ChevronDown, X } from 'lucide-react'

interface Tag {
  id: string
  name: string
  type: string
}

interface TagSelectorProps {
  label: string
  type: 'category1' | 'category2'
  value: string
  placeholder: string
  onChange: (value: string) => void
}

export function TagSelector({ label, type, value, placeholder, onChange }: TagSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchTags()
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchTags = async () => {
    try {
      const res = await fetch(`/api/customer-tags?type=${type}`)
      const data = await res.json()
      setTags(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error fetching tags:', err)
    }
  }

  const handleCreateTag = async () => {
    if (!searchTerm.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/customer-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: searchTerm.trim(), type })
      })
      const newTag = await res.json()
      if (newTag && newTag.name) {
        setTags(prev => [...prev.filter(t => t.name !== newTag.name), newTag].sort((a, b) => a.name.localeCompare(b.name)))
        onChange(newTag.name)
        setIsOpen(false)
        setSearchTerm('')
      }
    } catch (err) {
      console.error('Error creating tag:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTags = tags.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const showCreateOption = searchTerm.trim() !== '' && !tags.some(t => t.name.toLowerCase() === searchTerm.toLowerCase())

  return (
    <div className="space-y-1 relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white flex items-center justify-between cursor-pointer hover:border-primary-500 transition-colors"
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <div className="flex items-center gap-1">
          {value && (
            <button 
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="p-0.5 hover:bg-gray-100 rounded-full text-gray-400"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="p-2 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                className="w-full pl-8 pr-3 py-1.5 text-sm border-0 focus:ring-0 outline-none bg-gray-50 rounded-md"
                placeholder="Ara veya yeni ekle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {filteredTags.length > 0 ? (
              filteredTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    onChange(tag.name)
                    setIsOpen(false)
                    setSearchTerm('')
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-primary-50 flex items-center justify-between group"
                >
                  <span className={value === tag.name ? 'font-bold text-primary-700' : 'text-gray-700'}>
                    {tag.name}
                  </span>
                  {value === tag.name && <Check className="h-4 w-4 text-primary-600" />}
                </button>
              ))
            ) : !showCreateOption && (
              <div className="px-3 py-4 text-center text-xs text-gray-500 italic">
                Sonuç bulunamadı
              </div>
            )}

            {showCreateOption && (
              <button
                type="button"
                disabled={loading}
                onClick={handleCreateTag}
                className="w-full text-left px-3 py-2 text-sm bg-primary-50 hover:bg-primary-100 text-primary-700 flex items-center gap-2 border-t border-primary-100"
              >
                <Plus className="h-4 w-4" />
                <span>"{searchTerm}" ekle</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
