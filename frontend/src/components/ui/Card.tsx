import React from 'react'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle hover border effect */
  hoverable?: boolean
  /** Removes all padding for full-bleed content */
  noPadding?: boolean
  /** Padding size */
  padding?: 'sm' | 'md' | 'lg'
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  noPadding = false,
  padding = 'lg',
  className = '',
  ...props
}) => {
  const paddings = { sm: 'p-4', md: 'p-5', lg: 'p-6' }

  return (
    <div
      className={[
        'bg-white dark:bg-[#0D1117]',
        'border border-neutral-200 dark:border-[#1E293B]',
        'rounded-xl shadow-card relative overflow-hidden',
        noPadding ? '' : paddings[padding],
        hoverable ? 'transition-all duration-200 ease-out hover:shadow-elevated hover:border-brand-primary/40 hover:-translate-y-0.5 cursor-pointer' : '',
        className,
      ].join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
