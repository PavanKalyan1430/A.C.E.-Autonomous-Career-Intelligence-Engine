import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'blue' | 'cyan' | 'success' | 'warning' | 'danger' | 'neutral'
  size?: 'xs' | 'sm'
  dot?: boolean
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'sm',
  dot = false,
  className = '',
}) => {
  const variants = {
    blue:    'bg-brand-blue50 text-brand-blue border-brand-blue/20',
    cyan:    'bg-brand-cyan10 text-[#0891B2] dark:text-brand-cyan border-brand-cyan/25',
    success: 'bg-success-light text-success border-success-border',
    warning: 'bg-warning-light text-warning border-warning-border',
    danger:  'bg-danger-light text-danger border-danger-border',
    neutral: 'bg-neutral-100 dark:bg-[#1E293B] text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-[#334155]',
  }

  const sizes = {
    xs: 'px-1.5 py-0.5 text-2xs',
    sm: 'px-2 py-0.5 text-xs',
  }

  return (
    <span className={`inline-flex items-center gap-1 font-medium rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />}
      {children}
    </span>
  )
}
