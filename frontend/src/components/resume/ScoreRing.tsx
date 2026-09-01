import React, { useEffect, useRef } from 'react'

interface ScoreRingProps {
  score: number        // 0–100
  size?: 'lg' | 'md' | 'sm' | 'xs'
  label?: string       // label below score, e.g. "Resume Score"
  sublabel?: string    // smaller text below label
  showScore?: boolean
}

const SIZE_MAP = {
  lg: { dim: 160, stroke: 12, r: 66, fontSize: 38, subSize: 12 },
  md: { dim: 96,  stroke: 8,  r: 40, fontSize: 24, subSize: 10 },
  sm: { dim: 76,  stroke: 6,  r: 32, fontSize: 19, subSize: 9  },
  xs: { dim: 58,  stroke: 5,  r: 24, fontSize: 14, subSize: 8  },
}

/**
 * Radial progress ring using SVG stroke-dasharray technique.
 * Uses rich dark ACE green gradient.
 */
export const ScoreRing: React.FC<ScoreRingProps> = ({
  score,
  size = 'md',
  label,
  sublabel,
  showScore = true,
}) => {
  const clamped = Math.min(Math.max(score, 0), 100)
  const cfg = SIZE_MAP[size]
  const circumference = 2 * Math.PI * cfg.r
  const offset = circumference - (clamped / 100) * circumference

  const circleRef = useRef<SVGCircleElement>(null)
  const gradId = `ace-grad-${size}-${Math.floor(score)}`

  useEffect(() => {
    if (!circleRef.current) return
    circleRef.current.style.transition = 'none'
    circleRef.current.style.strokeDashoffset = String(circumference)
    void circleRef.current.getBoundingClientRect()
    circleRef.current.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
    circleRef.current.style.strokeDashoffset = String(offset)
  }, [circumference, offset])

  // Rich Dark ACE Green Palette
  const gradStart = clamped >= 70 ? '#336659' : clamped >= 40 ? '#6B8F71' : '#AEC3B0'
  const gradEnd   = clamped >= 70 ? '#12362b' : clamped >= 40 ? '#1f493d' : '#336659'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={cfg.dim}
        height={cfg.dim}
        viewBox={`0 0 ${cfg.dim} ${cfg.dim}`}
        className="drop-shadow-md"
        aria-label={label ? `${label}: ${clamped}` : `Score: ${clamped}`}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor={gradStart} />
            <stop offset="100%" stopColor={gradEnd} />
          </linearGradient>
        </defs>

        {/* Track ring */}
        <circle
          cx={cfg.dim / 2}
          cy={cfg.dim / 2}
          r={cfg.r}
          fill="none"
          stroke="#E3EFD3"
          strokeWidth={cfg.stroke}
          className="dark:opacity-15 opacity-70"
        />

        {/* Progress ring */}
        <circle
          ref={circleRef}
          cx={cfg.dim / 2}
          cy={cfg.dim / 2}
          r={cfg.r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={cfg.stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform={`rotate(-90 ${cfg.dim / 2} ${cfg.dim / 2})`}
          style={{ filter: 'drop-shadow(0 2px 6px rgba(18,54,43,0.4))' }}
        />

        {/* Score text */}
        {showScore && (
          <>
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={cfg.fontSize}
              fontWeight="800"
              fill="#12362b"
              className="dark:fill-white"
              fontFamily="'Plus Jakarta Sans', Inter, system-ui, sans-serif"
              dy="-4"
            >
              {clamped}
            </text>
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={cfg.subSize + 2}
              fontWeight="600"
              fill="#6B8F71"
              fontFamily="Inter, system-ui, sans-serif"
              dy={cfg.fontSize * 0.52}
            >
              /100
            </text>
          </>
        )}
      </svg>

      {label && (
        <div className="text-center mt-1">
          <div
            className="font-bold text-neutral-800 dark:text-neutral-200 leading-tight"
            style={{ fontSize: cfg.subSize + 2 }}
          >
            {label}
          </div>
          {sublabel && (
            <div
              className="text-brand-ai font-medium mt-0.5 leading-tight"
              style={{ fontSize: cfg.subSize }}
            >
              {sublabel}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
