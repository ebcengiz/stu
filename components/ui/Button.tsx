import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]'

  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200',
    outline: 'border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-400',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-sm',
  }

  const sizes = {
    sm: 'px-3.5 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}
