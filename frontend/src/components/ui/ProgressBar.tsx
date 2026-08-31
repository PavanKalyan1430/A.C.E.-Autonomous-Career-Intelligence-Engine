import React from 'react'

interface ProgressBarProps {
  value: number           // 0–100
  variant?: 'score' | 'green' | 'blue' | 'cyan' | 'success' | 'warning' | 'danger'
  height?: 'xs' | 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animated?: boolean
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  variant = 'score',
  height = 'sm',
  showLabel = false,
  animated = true,
  className = '',
}) => {
  const clamped = Math.min(Math.max(value, 0), 100)

  const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2', lg: 'h-3' }

  // Determine fill & glow dynamically based on score value if variant is 'score' or 'green'
  let fillClass = 'bg-brand-primary'
  let glowClass = 'shadow-[0_0_6px_rgba(51,102,89,0.3)]'

  if (variant === 'score' || variant === 'green' || variant === 'blue') {
    if (clamped >= 80) {
      fillClass = 'bg-[#336659]' // Strong/dark green Primary Teal
      glowClass = 'shadow-[0_0_6px_rgba(51,102,89,0.4)]'
    } else if (clamped >= 50) {
      fillClass = 'bg-[#4E6243]' // Medium green Asparagus / Fern
      glowClass = 'shadow-[0_0_6px_rgba(78,98,67,0.3)]'
    } else {
      fillClass = 'bg-[#6B8F71]' // Light/pale sage Fern / Sage
      glowClass = 'shadow-[0_0_6px_rgba(107,143,113,0.2)]'
    }
  } else {
    // Fallbacks for other specific variants, keeping them mapped to our green system
    const fills = {
      cyan: 'bg-[#AEC3B0]',
      success: 'bg-[#336659]',
      warning: 'bg-[#6B8F71]',
      danger: 'bg-[#E3EFD3]',
    }
    const glows = {
      cyan: 'shadow-[0_0_6px_rgba(174,195,176,0.3)]',
      success: 'shadow-[0_0_6px_rgba(51,102,89,0.3)]',
      warning: 'shadow-[0_0_6px_rgba(107,143,113,0.3)]',
      danger: 'shadow-[0_0_6px_rgba(227,239,211,0.2)]',
    }
    fillClass = fills[variant as keyof typeof fills] || 'bg-brand-primary'
    glowClass = glows[variant as keyof typeof glows] || 'shadow-[0_0_6px_rgba(51,102,89,0.3)]'
  }

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden ${heights[height]}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${fillClass} ${glowClass}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
