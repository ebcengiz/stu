'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Search, MapPin, Loader2, X } from 'lucide-react'
import { createPortal } from 'react-dom'

// Fix for default marker icon
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface LocationPickerProps {
  value: string
  onChange: (location: string) => void
}

interface SearchResult {
  display_name: string
  lat: string
  lon: string
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const [position, setPosition] = useState<[number, number]>([41.0082, 28.9784]) // Istanbul default
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Parse initial value if exists (format: "Address (lat, lng)")
  useEffect(() => {
    if (value && value.trim()) {
      const match = value.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/)
      if (match) {
        const lat = parseFloat(match[1])
        const lng = parseFloat(match[2])
        if (!isNaN(lat) && !isNaN(lng)) {
          setPosition([lat, lng])
        }
      }
    }
  }, [value])

  const handleMapClick = async (lat: number, lng: number) => {
    console.log('Map clicked:', lat, lng)
    setPosition([lat, lng])
    setShowResults(false) // Close dropdown when map is clicked

    // Reverse geocode to get address
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=tr`,
        {
          headers: {
            'User-Agent': 'StokTakipApp/1.0'
          }
        }
      )
      const data = await response.json()
      const address = data.display_name || `Seçilen Konum`
      const locationString = `${address} (${lat.toFixed(6)}, ${lng.toFixed(6)})`
      console.log('Location string created:', locationString)
      onChange(locationString)
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      const locationString = `Seçilen Konum (${lat.toFixed(6)}, ${lng.toFixed(6)})`
      onChange(locationString)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setShowResults(true)

    try {
      // Nominatim requires a proper user-agent
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=tr`,
        {
          headers: {
            'User-Agent': 'StokTakipApp/1.0'
          }
        }
      )
      const data = await response.json()
      console.log('Search results:', data) // Debug için
      setSearchResults(data)

      if (data.length === 0) {
        console.log('No results found for:', searchQuery)
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleSelectResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat)
    const lng = parseFloat(result.lon)
    console.log('Selected from search:', result.display_name, lat, lng)
    setPosition([lat, lng])
    const locationString = `${result.display_name} (${lat.toFixed(6)}, ${lng.toFixed(6)})`
    onChange(locationString)
    setShowResults(false)
    setSearchQuery('')
  }

  return (
    <div className="space-y-3 relative">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                } else if (e.key === 'Escape') {
                  setShowResults(false)
                }
              }}
              onClick={() => {
                if (searchResults.length > 0) {
                  setShowResults(true)
                }
              }}
              placeholder="Adres ara... (örn: İstanbul Beşiktaş)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ara'}
          </button>
        </div>
      </div>

      {/* Search Results Dropdown - Portal to avoid z-index issues */}
      {showResults && mounted && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99999]"
          onClick={() => setShowResults(false)}
        >
          <div
            className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white border-2 border-primary-500 rounded-lg shadow-2xl max-h-96 overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 border-b bg-primary-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Arama Sonuçları
              </h3>
              <button
                type="button"
                onClick={() => setShowResults(false)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div>
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectResult(result)}
                    className="w-full text-left px-4 py-3 hover:bg-primary-50 border-b last:border-b-0 flex items-start gap-2 transition-colors"
                  >
                    <MapPin className="h-5 w-5 text-primary-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{result.display_name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <p>Sonuç bulunamadı.</p>
                <p className="text-xs mt-1">Farklı bir arama deneyin.</p>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Map */}
      <div className="h-80 rounded-md overflow-hidden border-2 border-gray-300 relative">
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          key={`${position[0]}-${position[1]}`}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onClick={handleMapClick} />
          <Marker position={position} />
        </MapContainer>
      </div>

      {/* Seçilen lokasyon bilgisi */}
      {value && value.trim() && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border-2 border-green-300 rounded-md">
          <MapPin className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-green-900 mb-1">✓ Lokasyon Seçildi</p>
            <p className="text-xs text-green-700 break-words">
              {value.replace(/\s*\(-?\d+\.?\d*,\s*-?\d+\.?\d*\)\s*$/, '')}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <div className="text-xs text-blue-700">
          <p className="font-semibold mb-1">💡 Nasıl Kullanılır:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Yukarıdaki kutuda adres arayın (örn: "İstanbul Beşiktaş")</li>
            <li>VEYA harita üzerinde istediğiniz noktaya tıklayın</li>
            <li>Seçilen konum otomatik olarak kaydedilir</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
