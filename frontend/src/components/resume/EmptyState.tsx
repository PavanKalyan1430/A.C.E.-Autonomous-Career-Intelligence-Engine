import React from 'react'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

/**
 * Premium empty state component.
 * Uses a subtle ACE-green tinted background. Never leaves a giant blank card.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  compact = false,
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center rounded-xl
        bg-gradient-to-br from-neutral-50 to-brand-light/30
        dark:from-neutral-900/40 dark:to-brand-primary/5
        border border-dashed border-neutral-200 dark:border-neutral-800
        ${compact ? 'py-6 px-4' : 'py-10 px-6'}`}
    >
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/15 flex items-center justify-center mb-3 text-brand-ai">
          {icon}
        </div>
      )}
      <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{title}</p>
      {description && (
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
