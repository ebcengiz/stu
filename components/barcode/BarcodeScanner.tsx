'use client'

import { useState, useEffect, useRef } from 'react'
import { Camera, Keyboard, X } from 'lucide-react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose?: () => void
  placeholder?: string
  autoFocus?: boolean
}

export default function BarcodeScanner({
  onScan,
  onClose,
  placeholder = 'Barkodu okutun veya manuel girin...',
  autoFocus = true
}: BarcodeScannerProps) {
  const [scanMode, setScanMode] = useState<'manual' | 'camera'>('manual')
  const [manualInput, setManualInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)

  // USB/Bluetooth scanner için otomatik focus
  useEffect(() => {
    if (scanMode === 'manual' && autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [scanMode, autoFocus])

  // Camera scanner başlat/durdur
  useEffect(() => {
    if (scanMode === 'camera') {
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.QR_CODE
        ],
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true
      }

      scannerRef.current = new Html5QrcodeScanner('barcode-reader', config, /* verbose= */ false)

      scannerRef.current.render(
        (decodedText) => {
          // Başarılı okuma
          console.log('Barkod okundu:', decodedText)
          onScan(decodedText)
          if (scannerRef.current) {
            scannerRef.current.clear().catch(console.error)
          }
          setScanMode('manual')
        },
        (errorMessage) => {
          // Okuma hatası - sessiz geç (sürekli tarama yaparken normal)
        }
      )
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {})
        scannerRef.current = null
      }
    }
  }, [scanMode, onScan])

  // Manuel giriş submit
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (manualInput.trim()) {
      onScan(manualInput.trim())
      setManualInput('')
    }
  }

  // USB/Bluetooth scanner için Enter tuşunu yakala
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleManualSubmit(e)
    }
  }

  return (
    <div className="space-y-4">
      {/* Mod seçimi */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setScanMode('manual')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            scanMode === 'manual'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Keyboard className="h-4 w-4" />
          USB/Manuel Giriş
        </button>
        <button
          type="button"
          onClick={() => setScanMode('camera')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            scanMode === 'camera'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Camera className="h-4 w-4" />
          Kamera ile Oku
        </button>
      </div>

      {/* Manuel/USB Giriş Modu */}
      {scanMode === 'manual' && (
        <form onSubmit={handleManualSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            className="w-full px-4 py-3 border-2 border-primary-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
          />
          <p className="text-xs text-gray-500 mt-2">
            💡 USB barkod okuyucu ile direkt okutabilir veya manuel girebilirsiniz
          </p>
        </form>
      )}

      {/* Kamera Modu */}
      {scanMode === 'camera' && (
        <div className="space-y-2">
          <div id="barcode-reader" className="rounded-lg overflow-hidden"></div>
          <p className="text-xs text-gray-500 text-center">
            Barkodu kamera görüş alanına getirin
          </p>
        </div>
      )}
    </div>
  )
}
