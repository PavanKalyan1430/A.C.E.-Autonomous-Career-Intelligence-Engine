export interface ScoreVisuals {
  bg: string
  text: string
  border: string
  indicator: string
}

export function getScoreVisuals(score: number): ScoreVisuals {
  const clamped = Math.min(Math.max(score, 0), 100)
  
  if (clamped >= 80) {
    return {
      bg: 'bg-[#E3EFD3]/40',
      text: 'text-[#18291E] dark:text-[#E3EFD3] font-bold',
      border: 'border-[#234F45]/30 dark:border-[#234F45]/50',
      indicator: 'bg-[#234F45]'
    }
  } else if (clamped >= 50) {
    return {
      bg: 'bg-[#E3EFD3]/20',
      text: 'text-[#18291E] dark:text-[#AEC3B0] font-bold',
      border: 'border-[#6B8F71]/30 dark:border-[#6B8F71]/50',
      indicator: 'bg-[#4E6243]'
    }
  } else {
    return {
      bg: 'bg-[#E3EFD3]/10',
      text: 'text-[#18291E] dark:text-[#AEC3B0] font-bold',
      border: 'border-[#AEC3B0]/20 dark:border-[#AEC3B0]/40',
      indicator: 'bg-[#6B8F71]'
    }
  }
}
