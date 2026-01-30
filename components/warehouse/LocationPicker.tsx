'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Search, MapPin, Loader2 } from 'lucide-react'

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
  const [position, setPosition] = useState<[number, number] | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  // Parse initial value if exists (format: "Address (lat, lng)")
  useEffect(() => {
    if (value) {
      const match = value.match(/\((-?\d+\.?\d*),\s*(-?\d+\.?\d*)\)/)
      if (match) {
        setPosition([parseFloat(match[1]), parseFloat(match[2])])
      } else {
        // If no coordinates, just use Turkey's center as default
        setPosition([39.9334, 32.8597])
      }
    } else {
      // Default to Ankara, Turkey
      setPosition([39.9334, 32.8597])
    }
  }, [])

  const handleMapClick = async (lat: number, lng: number) => {
    setPosition([lat, lng])

    // Reverse geocode to get address
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'User-Agent': 'StokTakipApp/1.0'
          }
        }
      )
      const data = await response.json()
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      const locationString = `${address} (${lat.toFixed(6)}, ${lng.toFixed(6)})`
      console.log('Location selected:', locationString) // Debug için
      onChange(locationString)
    } catch (error) {
      console.error('Reverse geocoding error:', error)
      const locationString = `${lat.toFixed(6)}, ${lng.toFixed(6)}`
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
    setPosition([lat, lng])
    const locationString = `${result.display_name} (${lat.toFixed(6)}, ${lng.toFixed(6)})`
    console.log('Selected from search:', locationString) // Debug için
    onChange(locationString)
    setShowResults(false)
    setSearchQuery('')
    setSearchResults([])
  }

  if (!position) {
    return <div className="h-64 bg-gray-100 rounded flex items-center justify-center">Yükleniyor...</div>
  }

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative z-[100]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                }
              }}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setShowResults(true)
                }
              }}
              placeholder="Adres ara... (örn: İstanbul Beşiktaş)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent relative z-10"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 z-10"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ara'}
          </button>
        </div>

        {/* Search Results Dropdown - z-index çok yüksek */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-[200] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-2xl max-h-60 overflow-auto">
            {searchResults.map((result, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b last:border-b-0 flex items-start gap-2"
              >
                <MapPin className="h-4 w-4 text-primary-600 mt-1 flex-shrink-0" />
                <span className="text-sm">{result.display_name}</span>
              </button>
            ))}
          </div>
        )}

        {showResults && searchResults.length === 0 && !searching && searchQuery.trim() !== '' && (
          <div className="absolute z-[200] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-2xl p-4">
            <p className="text-sm text-gray-500">Sonuç bulunamadı. Farklı bir arama yapın.</p>
          </div>
        )}
      </div>

      {/* Map - z-index düşük tutulmalı */}
      <div className="h-64 rounded-md overflow-hidden border border-gray-300 relative z-0">
        <MapContainer
          center={position}
          zoom={13}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          key={position.join(',')} // Force re-render when position changes
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onClick={handleMapClick} />
          {position && <Marker position={position} />}
        </MapContainer>
      </div>

      {/* Seçilen lokasyon bilgisi */}
      {value && (
        <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
          <MapPin className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-green-700">
            <p className="font-semibold">Seçili Lokasyon:</p>
            <p className="mt-1">{value.replace(/\s*\(-?\d+\.?\d*,\s*-?\d+\.?\d*\)\s*$/, '')}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 flex items-start gap-1">
        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
        <span>Harita üzerinde istediğiniz noktaya tıklayın veya yukarıdaki arama kutusunu kullanın</span>
      </p>
    </div>
  )
}
