import React, { useEffect, useRef } from 'react'

interface ScoreRingProps {
  score: number        // 0–100
  size?: 'lg' | 'md' | 'sm' | 'xs'
  label?: string       // label below score, e.g. "Resume Score"
  sublabel?: string    // smaller text below label
  showScore?: boolean
}

const SIZE_MAP = {
  lg: { dim: 140, stroke: 10, r: 58, fontSize: 32, subSize: 11 },
  md: { dim: 88,  stroke: 7,  r: 37, fontSize: 22, subSize: 9  },
  sm: { dim: 72,  stroke: 6,  r: 30, fontSize: 18, subSize: 8  },
  xs: { dim: 56,  stroke: 5,  r: 23, fontSize: 14, subSize: 7  },
}

/**
 * Radial progress ring using SVG stroke-dasharray technique.
 * Uses an ACE green gradient (light → dark) via linearGradient.
 * Animates on mount. No hard-coded colours — all from ACE palette.
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
    // Start at 0, animate to final offset
    circleRef.current.style.transition = 'none'
    circleRef.current.style.strokeDashoffset = String(circumference)
    // Force reflow then animate
    void circleRef.current.getBoundingClientRect()
    circleRef.current.style.transition = 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)'
    circleRef.current.style.strokeDashoffset = String(offset)
  }, [circumference, offset])

  // Determine gradient colours based on score
  const gradStart = clamped >= 70 ? '#6B8F71' : clamped >= 40 ? '#AEC3B0' : '#E3EFD3'
  const gradEnd   = clamped >= 70 ? '#1f493d' : clamped >= 40 ? '#336659' : '#4E6243'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg
        width={cfg.dim}
        height={cfg.dim}
        viewBox={`0 0 ${cfg.dim} ${cfg.dim}`}
        className="drop-shadow-sm"
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
          className="dark:opacity-10 opacity-60"
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
          style={{ filter: 'drop-shadow(0 0 4px rgba(51,102,89,0.35))' }}
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
              fontWeight="700"
              fill="#336659"
              fontFamily="'Plus Jakarta Sans', Inter, system-ui, sans-serif"
              dy="-2"
            >
              {clamped}
            </text>
            <text
              x="50%"
              y="50%"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={cfg.subSize + 1}
              fontWeight="500"
              fill="#6B8F71"
              fontFamily="Inter, system-ui, sans-serif"
              dy={cfg.fontSize * 0.55}
            >
              /100
            </text>
          </>
        )}
      </svg>

      {label && (
        <div className="text-center">
          <div
            className="font-semibold text-neutral-700 dark:text-neutral-300 leading-tight"
            style={{ fontSize: cfg.subSize + 2 }}
          >
            {label}
          </div>
          {sublabel && (
            <div
              className="text-brand-ai mt-0.5 leading-tight"
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
