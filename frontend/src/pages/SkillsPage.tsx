import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { resumeApi, careerApi } from '@/api'
import { normalizePercentage } from '@/utils/error'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  AlertTriangle,
  Lightbulb,
  X,
  Target,
  Briefcase,
  MapPin,
  CheckCircle,
  HelpCircle,
  ArrowDown,
  Layers,
  Map,
  Compass,
  ArrowDownRight,
  ArrowDownLeft
} from 'lucide-react'

interface SkillNode {
  id: string
  name: string
  status: 'completed' | 'focus' | 'recommended' | 'blocked'
  impact: 'high' | 'medium'
  prereqs: { name: string; met: boolean }[]
  reason: string
  effort: string
}

export default function SkillsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  // 1. Fetch resume status
  const { data: resume, isLoading: isResumeLoading } = useQuery({
    queryKey: ['latestResume'],
    queryFn: async () => {
      const res = await resumeApi.getLatest()
      return res.data
    },
    retry: false
  })

  // 2. Fetch live career intelligence DAG & recommendations
  const { data: careerIntel, isLoading: isIntelLoading } = useQuery({
    queryKey: ['careerIntelligence'],
    queryFn: async () => {
      const res = await careerApi.getIntelligence()
      return res.data
    },
    retry: false
  })

  const targetRole = careerIntel?.skill_alignment?.target_role || ''

  const dynamicRoadmap: SkillNode[] = (careerIntel?.learning_roadmap || []).map((node: any) => ({
    id: node.id || node.name.toLowerCase().replace(/\s+/g, '_'),
    name: node.name,
    status: (node.status || 'recommended') as SkillNode['status'],
    impact: (node.impact || 'high') as SkillNode['impact'],
    prereqs: (node.prerequisites || []).map((p: any) => ({
      name: typeof p === 'string' ? p : p.name,
      met: typeof p === 'string' ? true : !!p.met
    })),
    reason: node.reason || 'Recommended by ACE career intelligence engine.',
    effort: node.estimated_effort_hours ? `${node.estimated_effort_hours} hours` : 'Variable effort'
  }))

  const coveragePercentage = normalizePercentage(careerIntel?.skill_alignment?.coverage_percentage)

  const activeNode = dynamicRoadmap.find((n) => n.id === selectedNodeId) || dynamicRoadmap[0] || null

  const isLoading = isResumeLoading || isIntelLoading

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex justify-between items-end mb-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card className="h-[450px]">
          <Skeleton className="h-full w-full" />
        </Card>
      </div>
    )
  }

  // ─── EMPTY STATE (No Resume Uploaded) ──────────────────────────────────
  if (!resume) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 animate-fade-in">
        <div className="w-16 h-16 bg-brand-light dark:bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-primary/20">
          <Map size={32} className="text-brand-primary animate-pulse-dot" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-700 dark:text-white mb-2">
          Upload resume to map learning path
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
          The skill roadmap matches your technical experience against target market requirements. Upload your resume to begin.
        </p>
        <Button onClick={() => navigate('/resume')} icon={<ArrowRight size={16} />}>
          Upload Resume
        </Button>
      </div>
    )
  }

  // ─── EMPTY STATE (No Target Role Configured) ───────────────────────────
  if (resume && !targetRole) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 animate-fade-in">
        <div className="w-16 h-16 bg-brand-light dark:bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-primary/20">
          <Target size={32} className="text-brand-primary animate-pulse-dot" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-700 dark:text-white mb-2">
          Configure target role to see roadmap
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed">
          You need to configure a target role in order to see your personalized learning path and skill alignment diagnostics.
        </p>
        <Button onClick={() => navigate('/resume')} icon={<ArrowRight size={16} />}>
          Configure Target Role
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-neutral-700 dark:text-neutral-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight mb-1">Skill Roadmap</h1>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Your path from current skills to your target career.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase">Target Role</span>
          <Badge variant="blue">{targetRole}</Badge>
        </div>
      </div>

      {/* Target Role Readiness score */}
      <Card className="border-l-4 border-l-brand-primary">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-widest mb-1">Target Role Profile</h3>
            <span className="text-sm font-bold text-[#3d3d3d] dark:text-white">{targetRole}</span>
          </div>
          
          <div className="w-full sm:w-80">
            <div className="flex justify-between items-end text-xs font-semibold mb-1.5">
              <span className="text-neutral-400 dark:text-neutral-500">Career Readiness</span>
              <span className="text-brand-primary font-bold">{coveragePercentage}%</span>
            </div>
            <ProgressBar value={coveragePercentage} variant="blue" />
          </div>
        </div>
      </Card>

      {/* Side-by-Side: Graph flowchart (Left) vs Detail Drawer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        {/* Visual Skill Graph Flowchart */}
        <Card className="lg:col-span-2 flex flex-col justify-between min-h-[480px]">
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-[#3d3d3d] dark:text-white">Intelligent Learning Path</h2>
              
              {/* Legend */}
              <div className="flex items-center gap-3 text-[10px] font-semibold text-neutral-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-sage border border-brand-primary/20" /> Completed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-brand-primary" /> Focus</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0891B2]" /> Recommended</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-neutral-300 dark:bg-neutral-800" /> Blocked</span>
              </div>
            </div>

            {/* Dynamic Skill Nodes List & Flowchart */}
            {dynamicRoadmap.length > 0 ? (
              <div className="flex flex-col items-center py-6 space-y-3">
                {dynamicRoadmap.map((node, index) => {
                  const isSelected = activeNode?.id === node.id
                  const isCompleted = node.status === 'completed'
                  const isFocus = node.status === 'focus'
                  const isRecommended = node.status === 'recommended'
                  
                  return (
                    <React.Fragment key={node.id}>
                      {index > 0 && <ArrowDown size={16} className="text-neutral-300 dark:text-neutral-700" />}
                      
                      <button
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
                          isSelected ? 'ring-2 ring-brand-primary/50 scale-105 shadow-md' : 'hover:scale-102'
                        } ${
                          isCompleted
                            ? 'bg-neutral-100 dark:bg-[#1E293B] text-neutral-600 dark:text-neutral-300 border-neutral-300 dark:border-[#334155]'
                            : isFocus
                            ? 'bg-brand-primary text-white border-transparent'
                            : isRecommended
                            ? 'bg-brand-cyan10 text-[#0891B2] border-brand-cyan/20'
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 border-transparent'
                        }`}
                      >
                        <span>{node.name}</span>
                        {isCompleted && <span>✓</span>}
                        {isFocus && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        {isRecommended && <span className="w-1.5 h-1.5 rounded-full bg-[#0891B2]" />}
                      </button>
                    </React.Fragment>
                  )
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-neutral-400">
                No skill prerequisite graph generated. Upload a resume or refresh career profile.
              </div>
            )}
          </div>
        </Card>

        {/* Selected Node Details side drawer */}
        <Card className="lg:col-span-1 flex flex-col justify-between">
          {activeNode ? (
            <div className="h-full flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="font-bold text-xs dark:text-white uppercase tracking-wider">Skill Diagnosis</span>
                  <Badge variant={
                    activeNode.status === 'completed' ? 'neutral' :
                    activeNode.status === 'focus' ? 'blue' :
                    activeNode.status === 'recommended' ? 'cyan' : 'warning'
                  }>
                    {activeNode.status.toUpperCase()}
                  </Badge>
                </div>

                <h3 className="text-lg font-bold text-[#3d3d3d] dark:text-white mb-2">{activeNode.name}</h3>
                
                <div className="flex justify-between text-2xs mb-4 font-semibold text-neutral-500">
                  <span>Target Impact</span>
                  <span className="text-brand-primary uppercase">{activeNode.impact} Impact</span>
                </div>

                <div className="space-y-4">
                  {/* Prerequisites */}
                  {activeNode.prereqs && activeNode.prereqs.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5">Prerequisites</h4>
                      <div className="space-y-1">
                        {activeNode.prereqs.map((p: { name: string; met: boolean }, idx: number) => (
                          <div key={idx} className="flex items-center gap-1.5 text-2xs font-semibold">
                            <span className={p.met ? 'text-success' : 'text-neutral-300 dark:text-neutral-700'}>
                              ✓
                            </span>
                            <span className={p.met ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-400 dark:text-neutral-500'}>
                              {p.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendation Why */}
                  <div>
                    <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5">A.C.E. Recommendation</h4>
                    <p className="text-2xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                      {activeNode.reason}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mt-6">
                <Button 
                  fullWidth 
                  iconRight={<ArrowRight size={14} />}
                  onClick={() => navigate('/career')}
                >
                  Ask ACE Agent
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-center text-xs text-neutral-400">
              Select any skill node in the roadmap to view details.
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Grid: Next Best Skill & Path Summary */}
      {(() => {
        const completedCount = dynamicRoadmap.filter(n => n.status === 'completed').length
        const remainingCount = dynamicRoadmap.filter(n => n.status !== 'completed').length
        const totalEffortHours = dynamicRoadmap
          .filter(n => n.status !== 'completed')
          .reduce((acc, n) => acc + parseInt(n.effort) || 12, 0)
        const nextSkill = dynamicRoadmap.find(n => n.status === 'focus') || dynamicRoadmap.find(n => n.status === 'recommended')

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            
            {/* Next Best Skill */}
            <Card className="border-t-4 border-t-[#0891B2] flex flex-col justify-between">
              <div>
                <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#0891B2] animate-pulse-dot" /> Next Best Skill
                </h3>
                {nextSkill ? (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-base font-bold text-[#3d3d3d] dark:text-white">{nextSkill.name}</h4>
                      <Badge variant="cyan">{nextSkill.impact === 'high' ? 'High Impact' : 'Medium Impact'}</Badge>
                    </div>
                    <p className="text-2xs text-neutral-500 dark:text-neutral-400 leading-normal max-w-sm mb-4">
                      {nextSkill.reason}
                    </p>
                  </>
                ) : (
                  <p className="text-2xs text-neutral-400 mb-4">All skills in your current roadmap are completed.</p>
                )}
              </div>

              <Button variant="secondary" iconRight={<ArrowRight size={14} />} onClick={() => navigate('/career')}>
                Start Learning Path
              </Button>
            </Card>

            {/* Path Summary stats */}
            <Card className="flex flex-col justify-between">
              <div>
                <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <Layers size={14} className="text-brand-primary" /> Path Summary
                </h3>
                
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-neutral-100 dark:divide-neutral-800">
                  <div>
                    <div className="text-metric font-bold text-brand-primary leading-none">{remainingCount}</div>
                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-semibold mt-2">Remaining</div>
                  </div>
                  <div>
                    <div className="text-metric font-bold text-brand-primary leading-none">{completedCount}</div>
                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-semibold mt-2">Completed</div>
                  </div>
                  <div>
                    <div className="text-metric font-bold text-brand-primary leading-none">{totalEffortHours > 0 ? `${totalEffortHours}h` : '—'}</div>
                    <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-semibold mt-2">Est. Effort</div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )
      })()}

    </div>
  )
}
