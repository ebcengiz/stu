'use client'

import { forwardRef, type InputHTMLAttributes } from 'react'
import { normalizeTrNumberInput } from '@/lib/tr-number-input'

export type TrNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'value' | 'onChange' | 'inputMode'
> & {
  value: string
  onChange: (value: string) => void
}

/**
 * Tutar / sayı girişi: 1000 → 1.000; ondalık için virgül (örn. 1.234,56).
 * Gönderimde `parseTrNumberInput` kullanın.
 */
const TrNumberInput = forwardRef<HTMLInputElement, TrNumberInputProps>(function TrNumberInput(
  { value, onChange, onBlur, className, ...rest },
  ref
) {
  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => {
        onChange(normalizeTrNumberInput(e.target.value))
      }}
      className={className}
      onBlur={(e) => {
        onBlur?.(e)
      }}
    />
  )
})

export default TrNumberInput
