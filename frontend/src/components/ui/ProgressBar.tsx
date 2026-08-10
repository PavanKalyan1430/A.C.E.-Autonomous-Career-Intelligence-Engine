import React from 'react'

interface ProgressBarProps {
  value: number           // 0–100
  variant?: 'blue' | 'cyan' | 'success' | 'warning'
  height?: 'xs' | 'sm' | 'md'
  showLabel?: boolean
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  variant = 'blue',
  height = 'sm',
  showLabel = false,
  className = '',
}) => {
  const clamped = Math.min(Math.max(value, 0), 100)

  const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2.5' }

  const fills = {
    blue:    'bg-brand-blue',
    cyan:    'bg-brand-cyan',
    success: 'bg-success',
    warning: 'bg-warning',
  }

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between mb-1.5 text-xs">
          <span className="text-neutral-500">Progress</span>
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-neutral-100 dark:bg-[#1E293B] rounded-full overflow-hidden ${heights[height]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${fills[variant]}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
