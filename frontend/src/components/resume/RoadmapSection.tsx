import React from 'react'
import { CheckCircle, Clock, ArrowRight, Map } from 'lucide-react'
import { EmptyState } from './EmptyState'

interface RoadmapItem {
  title: string
  action_item?: string
  why_recommended?: string
  estimated_effort?: string
  effort_hours?: number
  score_impact?: number
}

interface RoadmapSectionProps {
  immediate: RoadmapItem[]
  shortTerm: RoadmapItem[]
  longTerm: RoadmapItem[]
}

const PHASE_CONFIG = [
  {
    key: 'now',
    label: 'NOW',
    sublabel: '0–2 Weeks',
    activeBg: 'bg-brand-primary',
    activeBorder: 'border-brand-primary',
    taskBorder: 'border-brand-primary/20',
    taskBg: 'bg-brand-light/50 dark:bg-brand-primary/5',
  },
  {
    key: 'next',
    label: 'NEXT 30 DAYS',
    sublabel: '2–6 Weeks',
    activeBg: 'bg-brand-ai',
    activeBorder: 'border-brand-ai',
    taskBorder: 'border-brand-ai/20',
    taskBg: 'bg-brand-ai/5 dark:bg-brand-ai/5',
  },
  {
    key: 'future',
    label: 'NEXT 90 DAYS',
    sublabel: '3–6 Months',
    activeBg: 'bg-neutral-300 dark:bg-neutral-700',
    activeBorder: 'border-neutral-300 dark:border-neutral-600',
    taskBorder: 'border-neutral-200 dark:border-neutral-700',
    taskBg: 'bg-neutral-50 dark:bg-neutral-900/30',
  },
]

interface RoadmapTaskProps {
  item: RoadmapItem
  phaseIndex: number
}

const RoadmapTask: React.FC<RoadmapTaskProps> = ({ item, phaseIndex }) => {
  const cfg = PHASE_CONFIG[phaseIndex]
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border ${cfg.taskBorder} ${cfg.taskBg} mb-2`}>
      <CheckCircle size={13} className="text-brand-primary flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 leading-tight">{item.title}</div>
        {item.action_item && (
          <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed line-clamp-2">{item.action_item}</div>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {item.estimated_effort && (
            <div className="flex items-center gap-1 text-[9px] text-neutral-400">
              <Clock size={8} />
              {item.estimated_effort}
            </div>
          )}
          {item.effort_hours && !item.estimated_effort && (
            <div className="flex items-center gap-1 text-[9px] text-neutral-400">
              <Clock size={8} />
              {item.effort_hours}h
            </div>
          )}
          {item.score_impact && (
            <div className="text-[9px] font-bold text-brand-primary">
              +{item.score_impact} pts
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 3-phase roadmap section with horizontal connecting line/arrows.
 * Uses career_roadmap data from atsAnalysis. Shows elegant empty state per phase.
 */
export const RoadmapSection: React.FC<RoadmapSectionProps> = ({
  immediate,
  shortTerm,
  longTerm,
}) => {
  const phases = [immediate, shortTerm, longTerm]
  const totalTasks = immediate.length + shortTerm.length + longTerm.length

  return (
    <div className="bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card p-5 md:p-6">
      <div className="mb-5">
        <h3 className="text-[14px] font-bold text-neutral-800 dark:text-white">Action Plan & Roadmap</h3>
      </div>

      {/* Phase tabs connected with arrows */}
      <div className="flex flex-col md:flex-row gap-0 mb-5 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800">
        {PHASE_CONFIG.map((cfg, i) => (
          <React.Fragment key={cfg.key}>
            {/* Phase tab header */}
            <div
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-center
                ${i === 0
                  ? `${cfg.activeBg} text-white`
                  : i === 1
                    ? 'bg-brand-ai/10 dark:bg-brand-ai/15 text-brand-ai'
                    : 'bg-neutral-50 dark:bg-neutral-900/30 text-neutral-500 dark:text-neutral-400'
                }`}
            >
              <span className="text-[10px] font-bold tracking-wide">{cfg.label}</span>
              <span className="text-[9px] opacity-75">({cfg.sublabel})</span>
            </div>

            {/* Arrow connector (between phases, not after last) */}
            {i < PHASE_CONFIG.length - 1 && (
              <div className="hidden md:flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 px-1">
                <ArrowRight size={14} className="text-neutral-400 dark:text-neutral-500" />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {totalTasks === 0 ? (
        <EmptyState
          icon={<Map size={16} />}
          title="Your roadmap will appear here"
          description="ACE will generate a personalized action plan as it identifies improvement opportunities from your resume analysis."
          compact
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {phases.map((phaseItems, phaseIdx) => (
            <div key={phaseIdx}>
              {phaseItems.length === 0 ? (
                <div className="h-8" />
              ) : (
                phaseItems.map((item, i) => (
                  <RoadmapTask key={i} item={item} phaseIndex={phaseIdx} />
                ))
              )}
            </div>
          ))}
        </div>
      )}


    </div>
  )
}
