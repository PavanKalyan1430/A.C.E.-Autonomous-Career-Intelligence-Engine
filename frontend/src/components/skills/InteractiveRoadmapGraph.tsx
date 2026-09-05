import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Search,
  Layers,
  ArrowDown,
  ChevronRight,
  GitCommit,
  Maximize2
} from 'lucide-react'

export interface SkillNodeData {
  id: string
  name: string
  status: 'completed' | 'focus' | 'recommended' | 'blocked'
  impact: 'high' | 'medium'
  prerequisites: { name: string; met: boolean }[]
  reason: string
  estimated_effort_hours: number
  category?: string
  phase: number
}

interface InteractiveRoadmapGraphProps {
  nodes: SkillNodeData[]
  selectedNodeId: string | null
  onSelectNode: (nodeId: string) => void
  targetRole: string
}

export const InteractiveRoadmapGraph: React.FC<InteractiveRoadmapGraphProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  targetRole
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'focus' | 'recommended' | 'blocked' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Categorize nodes into 3 sequential milestone phases based on topological ordering
  const categorizedPhases = useMemo(() => {
    if (!nodes || nodes.length === 0) return []
    
    const maxPhase = Math.max(...nodes.map(n => n.phase || 1))
    const phases = []
    
    const titles = ['FOUNDATIONAL PREREQUISITES', 'CORE ROLE ARCHITECTURE', 'PRODUCTION & SCALING']
    const descriptions = [
        'Baseline technologies and core requirements required before advancing.',
        'Primary framework competencies and domain engineering skills.',
        'Advanced deployment, vector infrastructure, and production tuning.'
    ]
    
    for (let i = 1; i <= maxPhase; i++) {
        const pNodes = nodes.filter(n => (n.phase || 1) === i)
        if (pNodes.length > 0) {
            phases.push({
                id: `phase_${i}`,
                phaseNumber: `Phase ${i}`,
                title: titles[i-1] || `PHASE ${i} ADVANCED`,
                description: descriptions[i-1] || 'Advanced specialization topics.',
                nodes: pNodes
            })
        }
    }
    return phases
  }, [nodes])

  // Filtered nodes based on search & dropdown
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchesFilter = filterStatus === 'all' || node.status === filterStatus
      const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [nodes, filterStatus, searchQuery])

  return (
    <Card className="p-6 md:p-7 border border-neutral-200 dark:border-neutral-800 bg-[#FDFDFB] dark:bg-[#18291E] rounded-2xl shadow-md flex flex-col justify-between min-h-[580px]">
      <div>
        {/* Top Header & Search/Filter Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-neutral-200/80 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 rounded-lg bg-[#10B981]/15 text-[#0D4738] dark:text-[#34D399]">
                <Layers size={18} />
              </span>
              <h2 className="text-base md:text-lg font-black text-neutral-900 dark:text-white tracking-tight">
                YOUR CAREER ROADMAP
              </h2>
            </div>
            <p className="text-2xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
              Directed Acyclic Graph (DAG) of verified prerequisites & learning dependencies for <span className="font-bold text-[#0D4738] dark:text-[#34D399]">{targetRole}</span>.
            </p>
          </div>

          {/* Search & Filter Inputs */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Search skill..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-40 px-3 py-1.5 pl-8 text-2xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#10B981]"
              />
              <Search size={12} className="absolute left-2.5 top-2.5 text-neutral-400" />
            </div>

            <select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-2xs font-semibold rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#10B981] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="focus">Current Focus</option>
              <option value="recommended">Recommended</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Status Legend Bar (Strictly Green Semantic Palette) */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-2xs font-bold px-4 py-2.5 bg-[#F5F5F0] dark:bg-neutral-900/80 rounded-xl border border-neutral-200/80 dark:border-neutral-800 mb-6">
          <span className="text-neutral-500 uppercase tracking-widest text-[10px] font-extrabold">Status Legend:</span>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5 text-[#065F46] dark:text-[#34D399]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/30 border border-[#10B981] flex items-center justify-center text-[8px] font-black">✓</span>
              Completed
            </span>
            <span className="flex items-center gap-1.5 text-[#0D4738] dark:text-[#34D399]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] ring-4 ring-[#10B981]/25 animate-pulse" />
              Current Focus
            </span>
            <span className="flex items-center gap-1.5 text-[#047857] dark:text-[#34D399]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/60" />
              Recommended
            </span>
            <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
              <Lock size={11} className="text-neutral-400" />
              Blocked (Prereqs Unmet)
            </span>
          </div>
        </div>

        {/* DAG Milestone Phases Layout */}
        {filteredNodes.length > 0 ? (
          <div className="space-y-8 relative">
            {categorizedPhases.map((phase, pIdx) => {
              const phaseNodes = phase.nodes.filter(n => filteredNodes.some(fn => fn.id === n.id))
              if (phaseNodes.length === 0) return null

              return (
                <div key={phase.id} className="relative">
                  {/* Phase Title Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-[#10B981]/15 text-[#0D4738] dark:text-[#34D399] border border-[#10B981]/30">
                        {phase.phaseNumber}
                      </span>
                      <span className="text-xs font-black text-neutral-700 dark:text-neutral-200 tracking-tight">
                        [{phase.title}]
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                  </div>

                  {/* Nodes Grid with Prerequisite Connection Markers */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative">
                    {phaseNodes.map((node, nIdx) => {
                      const isSelected = selectedNodeId === node.id
                      const isCompleted = node.status === 'completed'
                      const isFocus = node.status === 'focus'
                      const isRecommended = node.status === 'recommended'
                      const isBlocked = node.status === 'blocked'

                      return (
                        <div key={node.id} className="relative group">
                          {/* Node Card */}
                          <button
                            onClick={() => onSelectNode(node.id)}
                            className={`w-full p-4 rounded-xl text-left border transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${
                              isSelected
                                ? 'bg-[#062C22] text-white border-[#10B981] ring-2 ring-[#10B981] shadow-[0_0_20px_rgba(16,185,129,0.35)] scale-[1.02]'
                                : isFocus
                                ? 'bg-gradient-to-br from-[#062C22] to-[#0D2B1D] text-white border-[#10B981]/80 shadow-md hover:scale-[1.01]'
                                : isCompleted
                                ? 'bg-emerald-50/70 dark:bg-emerald-950/30 text-neutral-900 dark:text-white border-emerald-300 dark:border-emerald-800/60 hover:border-emerald-500'
                                : isBlocked
                                ? 'bg-neutral-100/80 dark:bg-neutral-900/60 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-800'
                                : 'bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 border-neutral-200 dark:border-neutral-800 hover:border-[#10B981]/50 hover:shadow-md'
                            }`}
                          >
                            {/* Card Content Top */}
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={`text-[9px] font-extrabold uppercase tracking-wider ${
                                  isSelected || isFocus ? 'text-emerald-300' : 'text-neutral-400'
                                }`}>
                                  {node.impact === 'high' ? 'High Impact' : 'Medium Impact'}
                                </span>

                                {/* Status Badge (Green-Only Palette) */}
                                {isCompleted && (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-[#065F46] dark:text-emerald-300 text-[10px] font-black flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                                    <CheckCircle2 size={11} /> Completed
                                  </span>
                                )}
                                {isFocus && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#10B981] text-white text-[10px] font-black flex items-center gap-1 shadow-sm">
                                    ● Current Focus
                                  </span>
                                )}
                                {isRecommended && (
                                  <span className="px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#0D4738] dark:text-[#34D399] text-[10px] font-black border border-[#10B981]/30">
                                    ● Recommended
                                  </span>
                                )}
                                {isBlocked && (
                                  <span className="px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-black flex items-center gap-1">
                                    <Lock size={10} /> Blocked
                                  </span>
                                )}
                              </div>

                              {/* Skill Title */}
                              <h3 className={`text-base font-black tracking-tight mb-1 ${
                                isSelected || isFocus ? 'text-white' : 'text-neutral-900 dark:text-white'
                              }`}>
                                {node.name}
                              </h3>

                              {/* Prerequisites Summary */}
                              {node.prerequisites && node.prerequisites.length > 0 && (
                                <div className={`text-[10px] font-semibold mt-2 flex items-center gap-1.5 ${
                                  isSelected || isFocus ? 'text-neutral-300' : 'text-neutral-500 dark:text-neutral-400'
                                }`}>
                                  <span className="uppercase font-bold tracking-wider">Prereqs:</span>
                                  <span>{node.prerequisites.filter(p => p.met).length}/{node.prerequisites.length} Met</span>
                                </div>
                              )}
                            </div>

                            {/* Card Footer */}
                            <div className={`flex justify-between items-center text-[10px] font-bold mt-3 pt-2 border-t ${
                              isSelected || isFocus
                                ? 'border-white/10 text-neutral-300'
                                : 'border-neutral-100 dark:border-neutral-800 text-neutral-400'
                            }`}>
                              <span>Effort: {(node.estimated_effort_hours + 'h')}</span>
                              <span className={`flex items-center gap-1 ${
                                isSelected ? 'text-emerald-300 font-extrabold' : 'text-[#10B981]'
                              }`}>
                                Inspect Node <ChevronRight size={12} />
                              </span>
                            </div>
                          </button>
                        </div>
                      )
                    })}
                  </div>

                  {/* Inter-phase Sequential DAG Connector Arrow */}
                  {pIdx < categorizedPhases.length - 1 && (
                    <div className="flex justify-center items-center my-4">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[#0D4738] dark:text-[#34D399] text-[10px] font-black">
                        <span>Prerequisite Flow</span>
                        <ArrowDown size={12} className="animate-bounce" />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-neutral-400 font-medium">
            No roadmap skill nodes match your search or status filter.
          </div>
        )}
      </div>

      {/* Footer Info Prompt */}
      <div className="text-2xs text-neutral-500 dark:text-neutral-400 text-center border-t border-neutral-200/80 dark:border-neutral-800 pt-3 mt-6 font-medium">
        Click any skill node above to inspect market diagnosis, dependency prerequisites, learning plan, and verification actions.
      </div>
    </Card>
  )
}
