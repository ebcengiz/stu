'use client'

import { useEffect, useRef } from 'react'
import Barcode from 'react-barcode'

interface BarcodeDisplayProps {
  value: string
  format?: 'EAN13' | 'EAN8' | 'CODE128' | 'CODE39' | 'UPC'
  width?: number
  height?: number
  displayValue?: boolean
  fontSize?: number
}

export default function BarcodeDisplay({
  value,
  format = 'CODE128',
  width = 2,
  height = 50,
  displayValue = true,
  fontSize = 14
}: BarcodeDisplayProps) {
  if (!value) {
    return (
      <div className="text-gray-400 text-sm italic">
        Barkod yok
      </div>
    )
  }

  // Barkod formatını otomatik belirle
  const autoFormat = () => {
    if (value.length === 13) return 'EAN13'
    if (value.length === 8) return 'EAN8'
    if (value.length === 12) return 'UPC'
    return format
  }

  try {
    return (
      <div className="inline-block">
        <Barcode
          value={value}
          format={autoFormat()}
          width={width}
          height={height}
          displayValue={displayValue}
          fontSize={fontSize}
          margin={5}
          background="#ffffff"
        />
      </div>
    )
  } catch (error) {
    return (
      <div className="text-red-500 text-sm">
        Geçersiz barkod: {value}
      </div>
    )
  }
}
