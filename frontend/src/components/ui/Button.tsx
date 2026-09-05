import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  loading?: boolean
  isLoading?: boolean
  fullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  isLoading,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const isBtnLoading = Boolean(loading || isLoading)

  const base = [
    'inline-flex items-center justify-center font-medium rounded-lg',
    'transition-all duration-150 focus-visible:ring-2 focus-visible:ring-brand-blue/30 focus-visible:outline-none',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    fullWidth ? 'w-full' : '',
  ].join(' ')

  const variants = {
    primary:   'bg-brand-primary text-white hover:bg-brand-hover shadow-sm active:scale-[0.98]',
    secondary: 'bg-white dark:bg-[#0D1117] text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-[#1E293B] hover:border-neutral-300 hover:bg-neutral-50 dark:hover:bg-[#111827]',
    ghost:     'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-[#1E293B]',
    danger:    'bg-danger text-white hover:bg-red-700 shadow-sm',
  }

  const sizes = {
    xs: 'px-2.5 py-1 text-xs gap-1.5',
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isBtnLoading}
      {...props}
    >
      {isBtnLoading ? (
        <svg className="animate-spin h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon ? (
        <span className="flex-shrink-0 flex items-center">{icon}</span>
      ) : null}
      {children}
      {iconRight && <span className="flex-shrink-0 flex items-center">{iconRight}</span>}
    </button>
  )
}
