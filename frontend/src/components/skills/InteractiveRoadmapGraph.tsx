import React, { useState, useMemo } from 'react'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  Filter,
  Search,
  Layers,
  Flame,
  HelpCircle,
  Maximize2
} from 'lucide-react'

export interface SkillNodeData {
  id: string
  name: string
  status: 'completed' | 'focus' | 'recommended' | 'blocked'
  impact: 'high' | 'medium'
  prereqs: { name: string; met: boolean }[]
  reason: string
  effort: string
  category?: string
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

  // Categorize / group nodes into logical milestone phases
  const categorizedPhases = useMemo(() => {
    // Partition nodes into 3 milestone phases based on index & prerequisite depth
    const phase1: SkillNodeData[] = []
    const phase2: SkillNodeData[] = []
    const phase3: SkillNodeData[] = []

    nodes.forEach((node, idx) => {
      // Completed or foundational skills go into phase 1
      if (node.status === 'completed' || idx < Math.ceil(nodes.length / 3)) {
        phase1.push(node)
      } else if (idx < Math.ceil((nodes.length * 2) / 3)) {
        phase2.push(node)
      } else {
        phase3.push(node)
      }
    })

    return [
      { id: 'foundations', title: 'Phase 1: Foundational Prerequisites', nodes: phase1 },
      { id: 'core', title: 'Phase 2: Core Role Architecture', nodes: phase2 },
      { id: 'advanced', title: 'Phase 3: Production & Scaling', nodes: phase3 }
    ].filter(p => p.nodes.length > 0)
  }, [nodes])

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      const matchesFilter = filterStatus === 'all' || node.status === filterStatus
      const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesFilter && matchesSearch
    })
  }, [nodes, filterStatus, searchQuery])

  return (
    <Card className="p-6 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#18291E] flex flex-col justify-between min-h-[560px] shadow-card">
      <div>
        {/* Header & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-neutral-800 dark:text-white flex items-center gap-2">
                <Layers size={18} className="text-brand-primary" />
                Target Prerequisite DAG Roadmap
              </h2>
              <Badge variant="blue" className="text-2xs">{targetRole}</Badge>
            </div>
            <p className="text-2xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-medium">
              Interactive topological learning path mapped against verified requirements.
            </p>
          </div>

          {/* Filter & Search Bar */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <input
                type="text"
                placeholder="Search skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-36 px-3 py-1.5 pl-8 text-2xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
              <Search size={12} className="absolute left-2.5 top-2.5 text-neutral-400" />
            </div>

            <select
              value={filterStatus}
              onChange={(e: any) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 text-2xs font-semibold rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-pointer"
            >
              <option value="all">All States</option>
              <option value="focus">Current Focus</option>
              <option value="recommended">Recommended</option>
              <option value="blocked">Blocked</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Legend Bar */}
        <div className="flex flex-wrap items-center gap-4 text-2xs font-bold text-neutral-500 dark:text-neutral-400 mb-6 px-4 py-2 bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-100 dark:border-neutral-800">
          <span className="text-neutral-400 dark:text-neutral-500 uppercase tracking-widest text-[10px]">Legend:</span>
          <span className="flex items-center gap-1.5 text-neutral-700 dark:text-neutral-300">
            <span className="w-2.5 h-2.5 rounded-md bg-brand-sage/80 border border-brand-primary/40 flex items-center justify-center text-[8px] font-bold text-brand-primary">✓</span>
            Completed
          </span>
          <span className="flex items-center gap-1.5 text-brand-primary">
            <span className="w-2.5 h-2.5 rounded-full bg-brand-hover ring-2 ring-brand-primary/30 animate-pulse-dot" />
            Current Focus
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Recommended
          </span>
          <span className="flex items-center gap-1.5 text-neutral-400">
            <Lock size={10} className="text-neutral-400" />
            Blocked (Prereqs Unmet)
          </span>
        </div>

        {/* Multi-Stage Phase Flow */}
        {filteredNodes.length > 0 ? (
          <div className="space-y-8 py-2">
            {categorizedPhases.map((phase, pIdx) => {
              const phaseNodes = phase.nodes.filter(n => filteredNodes.some(fn => fn.id === n.id))
              if (phaseNodes.length === 0) return null

              return (
                <div key={phase.id} className="relative">
                  {/* Phase Milestone Title */}
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
                      {phase.title}
                    </span>
                    <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
                  </div>

                  {/* Nodes Grid within Phase */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {phaseNodes.map((node) => {
                      const isSelected = selectedNodeId === node.id
                      const isCompleted = node.status === 'completed'
                      const isFocus = node.status === 'focus'
                      const isRecommended = node.status === 'recommended'
                      const isBlocked = node.status === 'blocked'

                      return (
                        <button
                          key={node.id}
                          onClick={() => onSelectNode(node.id)}
                          className={`relative p-4 rounded-xl text-left border transition-all duration-200 flex flex-col justify-between ${
                            isSelected
                              ? 'ring-2 ring-brand-primary shadow-elevated scale-[1.02] bg-brand-light/30 dark:bg-brand-primary/10 border-brand-primary'
                              : 'hover:border-brand-primary/40 hover:shadow-card bg-white dark:bg-neutral-900/80 border-neutral-200 dark:border-neutral-800'
                          }`}
                        >
                          <div>
                            {/* Node Header Badges */}
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                                {node.impact === 'high' ? 'High Impact' : 'Medium Impact'}
                              </span>

                              {isCompleted && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
                                  <CheckCircle2 size={10} /> Completed
                                </span>
                              )}
                              {isFocus && (
                                <span className="px-2 py-0.5 rounded-full bg-brand-hover text-white text-[10px] font-extrabold flex items-center gap-1 shadow-sm animate-pulse">
                                  ● Current Focus
                                </span>
                              )}
                              {isRecommended && (
                                <span className="px-2 py-0.5 rounded-full bg-brand-sage/60 dark:bg-brand-primary/20 text-brand-primary dark:text-brand-sage text-[10px] font-extrabold border border-brand-primary/20">
                                  Recommended
                                </span>
                              )}
                              {isBlocked && (
                                <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 text-[10px] font-extrabold flex items-center gap-1 border border-neutral-200 dark:border-neutral-700">
                                  <Lock size={10} /> Blocked
                                </span>
                              )}
                            </div>

                            {/* Node Title */}
                            <h3 className="text-sm font-bold text-neutral-800 dark:text-white mb-1">
                              {node.name}
                            </h3>

                            {/* Prerequisites Summary */}
                            {node.prereqs && node.prereqs.length > 0 && (
                              <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-2 font-medium flex items-center gap-1">
                                <span className="text-neutral-400 uppercase font-bold">Prereqs:</span>
                                <span>{node.prereqs.filter(p => p.met).length}/{node.prereqs.length} Met</span>
                              </div>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-semibold text-neutral-400 mt-3 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                            <span>Effort: {node.effort}</span>
                            <span className="text-brand-primary flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                              Inspect <ArrowRight size={10} />
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-neutral-400 font-medium">
            No skill roadmap nodes match your current search or filter criteria.
          </div>
        )}
      </div>

      <div className="text-2xs text-neutral-400 text-center border-t border-neutral-100 dark:border-neutral-800 pt-3 mt-4 font-medium">
        Select any node above to inspect skill diagnosis, market relevance, prerequisites, and learning resources.
      </div>
    </Card>
  )
}
