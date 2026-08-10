import React from 'react'

interface AceLogoProps {
  height?: number | string
  className?: string
  style?: React.CSSProperties
  showText?: boolean
}

export const AceLogo: React.FC<AceLogoProps> = ({
  height = 36,
  className = '',
  style = {},
  showText = false,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`} style={style}>
      <img
        src="/logo.png"
        alt="A.C.E. Logo"
        style={{
          height: typeof height === 'number' ? `${height}px` : height,
          width: 'auto',
          objectFit: 'contain',
        }}
        className="transition-transform duration-200 hover:scale-105"
        onError={(e) => {
          // Fallback if SVG fails to load
          e.currentTarget.src = '/logo.png'
        }}
      />
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="font-extrabold text-white text-base tracking-tight">A.C.E.</span>
          <span className="text-[9px] font-bold text-brand-ai uppercase tracking-widest mt-0.5">
            Career OS
          </span>
        </div>
      )}
    </div>
  )
}
