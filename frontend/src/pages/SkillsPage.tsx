import React, { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { resumeApi, careerApi, authApi } from '@/api'
import { normalizePercentage } from '@/utils/error'
import { useNavigationStore } from '@/store/navigationStore'
import {
  Map, ArrowRight, RefreshCw, Sparkles, Target, CheckCircle2,
  Lock, Circle, ChevronRight, TrendingUp, Clock, BookOpen,
  Zap, AlertCircle, BarChart2, Brain, Layers, Crosshair
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────
type NodeStatus = 'completed' | 'focus' | 'recommended' | 'blocked'
type NodeImpact = 'high' | 'medium' | 'low'

interface Prereq { name: string; met: boolean }

interface SkillNode {
  id: string
  name: string
  status: NodeStatus
  impact: NodeImpact
  prereqs: Prereq[]
  reason: string
  effort: string
}

interface GapItem {
  skill: string
  priority: 'high' | 'medium' | 'low'
  source?: string
  gap_description?: string
}

interface Recommendation {
  title: string
  description?: string
  priority?: string
  why?: string
}

interface DAGPhase {
  phaseIndex: number
  title: string
  nodes: SkillNode[]
}

// ─── Strict Green Impact Config (No Red/Yellow) ───────────────────────────────
const IMPACT_BADGE: Record<NodeImpact, { label: string; cls: string }> = {
  high:   { label: 'High Impact',   cls: 'text-[#18291E] dark:text-[#E3EFD3] bg-[#18291E]/10 dark:bg-[#E3EFD3]/10 border border-[#18291E]/20 dark:border-[#E3EFD3]/20' },
  medium: { label: 'Medium Impact', cls: 'text-[#336659] dark:text-[#AEC3B0] bg-[#336659]/10 dark:bg-[#AEC3B0]/10 border border-[#336659]/20 dark:border-[#AEC3B0]/20' },
  low:    { label: 'Low Impact',    cls: 'text-[#6B8F71] dark:text-[#6B8F71] bg-[#6B8F71]/10 dark:bg-[#6B8F71]/10 border border-[#6B8F71]/20 dark:border-[#6B8F71]/20' },
}

// ─── DAG Builder ──────────────────────────────────────────────────────────────
function buildDAGPhases(roadmap: SkillNode[]): DAGPhase[] {
  if (!roadmap || roadmap.length === 0) return []

  const unassigned = [...roadmap]
  const phases: DAGPhase[] = []
  const resolvedSkillNames = new Set<string>(
    roadmap.filter(n => n.status === 'completed').map(n => n.name.toLowerCase())
  )

  let phaseIdx = 1
  // Max iterations to prevent infinite loop on cyclic prereqs
  let iterations = 0
  
  while (unassigned.length > 0 && iterations < 10) {
    iterations++
    
    // Find nodes whose unmet prereqs are all either met globally OR present in `resolvedSkillNames`
    const currentPhaseNodes = unassigned.filter(node => {
      const missingPrereqs = node.prereqs.filter(p => !p.met && !resolvedSkillNames.has(p.name.toLowerCase()))
      return missingPrereqs.length === 0
    })

    if (currentPhaseNodes.length === 0) {
      // Cyclic or unresolved dependencies exist; dump the rest into the final phase
      phases.push({
        phaseIndex: phaseIdx,
        title: `Phase ${phaseIdx}: Advanced Specialization`,
        nodes: [...unassigned]
      })
      break
    }

    phases.push({
      phaseIndex: phaseIdx,
      title: `Phase ${phaseIdx}: ${phaseIdx === 1 ? 'Foundational Prerequisites' : phaseIdx === 2 ? 'Core Architecture' : 'Production & Scaling'}`,
      nodes: currentPhaseNodes
    })

    currentPhaseNodes.forEach(n => resolvedSkillNames.add(n.name.toLowerCase()))
    
    // Remove assigned nodes from unassigned pool
    currentPhaseNodes.forEach(n => {
      const idx = unassigned.findIndex(u => u.id === n.id)
      if (idx !== -1) unassigned.splice(idx, 1)
    })
    
    phaseIdx++
  }

  return phases
}

function parseRoadmap(raw: any[], verifiedSkills: string[]): SkillNode[] {
  return (raw || []).map((n: any) => {
    const rawStatus = (n.status || 'recommended').toLowerCase()
    const status: NodeStatus = ['completed', 'focus', 'recommended', 'blocked'].includes(rawStatus)
      ? (rawStatus as NodeStatus) : 'recommended'
    const rawImpact = (n.impact || '').toLowerCase()
    const impact: NodeImpact = ['high', 'medium', 'low'].includes(rawImpact)
      ? (rawImpact as NodeImpact) : 'medium'
    return {
      id: n.id || n.name.toLowerCase().replace(/\s+/g, '_'),
      name: n.name,
      status,
      impact,
      prereqs: (n.prerequisites || []).map((p: any) => ({
        name: typeof p === 'string' ? p : p.name,
        met: typeof p === 'string'
          ? verifiedSkills.some(s => s.toLowerCase() === p.toLowerCase())
          : !!p.met,
      })),
      reason: n.reason || '',
      effort: n.estimated_effort_hours ? `${n.estimated_effort_hours}h` : '',
    }
  })
}

// ─── DAG Node Component ───────────────────────────────────────────────────────
const DAGNodeCard: React.FC<{
  node: SkillNode
  isActive: boolean
  onClick: () => void
}> = ({ node, isActive, onClick }) => {
  const isFocus = node.status === 'focus'
  const isCompleted = node.status === 'completed'
  const isBlocked = node.status === 'blocked'
  const isRecommended = node.status === 'recommended'

  const baseStyles = 'relative rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer min-w-[240px]'
  
  let stateStyles = ''
  if (isFocus) {
    stateStyles = 'bg-brand-light dark:bg-brand-primary/10 border-brand-primary/60 shadow-[0_0_15px_rgba(51,102,89,0.15)] hover:shadow-[0_0_20px_rgba(51,102,89,0.25)] hover:-translate-y-1'
  } else if (isCompleted) {
    stateStyles = 'bg-[#f3efe8]/50 dark:bg-neutral-800/40 border-brand-primary/20 hover:border-brand-primary/40'
  } else if (isRecommended) {
    stateStyles = 'bg-white dark:bg-[#18291E] border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-sm hover:-translate-y-0.5'
  } else if (isBlocked) {
    stateStyles = 'bg-neutral-50 dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800 opacity-75 grayscale-[0.2]'
  }

  const activeStyles = isActive 
    ? 'ring-2 ring-brand-primary/80 ring-offset-2 ring-offset-[var(--surface-secondary)] scale-[1.02]' 
    : ''

  const StatusIcon = isCompleted ? CheckCircle2 : isBlocked ? Lock : isFocus ? Zap : Circle

  return (
    <div onClick={onClick} className={`${baseStyles} ${stateStyles} ${activeStyles}`}>
      {/* Node Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={`font-bold text-sm leading-tight ${isFocus ? 'text-brand-primary dark:text-[#E3EFD3]' : isBlocked ? 'text-neutral-500' : 'text-neutral-800 dark:text-neutral-100'}`}>
          {node.name}
        </h3>
        {node.impact === 'high' && (
          <span className={`flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded ${IMPACT_BADGE.high.cls}`}>
            HIGH
          </span>
        )}
      </div>

      {/* Node Footer */}
      <div className="flex items-center gap-2 mt-auto pt-2 text-[11px] font-medium border-t border-black/5 dark:border-white/5">
        <div className={`flex items-center gap-1.5 ${isCompleted ? 'text-brand-primary' : isFocus ? 'text-brand-primary' : 'text-neutral-500'}`}>
          <StatusIcon size={12} className={isCompleted ? 'text-brand-primary' : ''} />
          <span>
            {isCompleted ? 'Verified' : isFocus ? 'Current Focus' : isBlocked ? 'Blocked' : 'Recommended'}
          </span>
        </div>
        {node.effort && (
          <>
            <span className="text-neutral-300">·</span>
            <span className="text-neutral-500 flex items-center gap-1"><Clock size={10}/> {node.effort}</span>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Diagnostic Panel ─────────────────────────────────────────────────────────
const DiagnosticWorkspace: React.FC<{
  skill: SkillNode | null
  targetRole: string
  verifiedSkills: string[]
  navigate: ReturnType<typeof useNavigate>
}> = ({ skill, targetRole, navigate }) => {
  if (!skill) {
    return (
      <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#18291E] p-8 text-center">
        <Target size={24} className="mx-auto text-neutral-300 mb-3" />
        <p className="text-sm font-semibold text-neutral-500">Select a node from the roadmap to inspect.</p>
      </div>
    )
  }

  const isFocus = skill.status === 'focus'
  const metPrereqs = skill.prereqs.filter(p => p.met)
  const unmetPrereqs = skill.prereqs.filter(p => !p.met)
  const impCfg = IMPACT_BADGE[skill.impact]

  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#18291E] overflow-hidden shadow-card animate-fade-in">
      {/* Workspace Header */}
      <div className="bg-neutral-50 dark:bg-neutral-900/50 p-5 border-b border-neutral-200 dark:border-neutral-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Skill Diagnostic Panel</span>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impCfg.cls}`}>{impCfg.label}</span>
          </div>
          <h2 className="text-xl font-black text-neutral-900 dark:text-white flex items-center gap-2">
            {skill.name}
            {isFocus && <span className="inline-flex h-2 w-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(51,102,89,0.8)]" />}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate('/resume', { state: { triggerUpload: true } })} icon={<BookOpen size={14} />}>
            Upload Proof
          </Button>
          <Button size="sm" onClick={() => navigate('/assistant', { state: { initialPrompt: `How can I learn ${skill.name} for my ${targetRole} role?` } })} icon={<Brain size={14} />}>
            Ask A.C.E.
          </Button>
        </div>
      </div>

      {/* Workspace Body */}
      <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Left Col: Reason & Evidence */}
        <div className="space-y-6">
          {skill.reason && (
            <section>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-2 flex items-center gap-1.5">
                <Sparkles size={12} className="text-brand-primary" /> Why This Matters
              </h4>
              <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                {skill.reason}
              </p>
            </section>
          )}

          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3 flex items-center gap-1.5">
              <Crosshair size={12} /> Diagnostic Evidence
            </h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                Target Role Requirement
              </span>
              {skill.status !== 'completed' && (
                <span className="px-3 py-1.5 rounded-lg border border-[#336659]/20 bg-[#336659]/10 text-xs font-semibold text-[#336659] dark:text-[#AEC3B0]">
                  Resume Gap Detected
                </span>
              )}
            </div>
          </section>
        </div>

        {/* Right Col: Prerequisites & Meta */}
        <div className="space-y-6 md:border-l border-neutral-100 dark:border-neutral-800 md:pl-8">
          <section>
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-3 flex items-center gap-1.5">
              <Layers size={12} /> Required Prerequisites
            </h4>
            {skill.prereqs.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">No prerequisites required. Ready to learn.</p>
            ) : (
              <div className="space-y-2">
                {metPrereqs.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#E3EFD3]/30 border border-[#E3EFD3]/50">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">{p.name}</span>
                    <span className="text-[10px] font-bold text-brand-primary flex items-center gap-1"><CheckCircle2 size={12}/> MET</span>
                  </div>
                ))}
                {unmetPrereqs.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{p.name}</span>
                    <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1"><Lock size={12}/> BLOCKED</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {skill.effort && (
            <section>
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Estimated Effort</h4>
              <p className="text-lg font-black text-neutral-900 dark:text-white flex items-center gap-2">
                <Clock size={16} className="text-brand-primary" /> {skill.effort}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Target Role Setup ────────────────────────────────────────────────────────
const TargetRoleSetup: React.FC<{ onCompleted: () => void }> = ({ onCompleted }) => {
  const [role, setRole] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!role.trim()) return
    setSaving(true)
    try {
      await authApi.updateProfile({ target_role: role.trim() })
      await careerApi.refresh()
      onCompleted()
    } catch { /* noop */ } 
    finally { setSaving(false) }
  }

  return (
    <div className="max-w-xl mx-auto py-16 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto mb-6">
        <Target size={30} className="text-brand-primary" />
      </div>
      <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mb-2">
        Set Your Target Role
      </h2>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
        A.C.E. will map your skills against market requirements and generate a personalized prerequisite roadmap.
      </p>
      <div className="flex gap-2">
        <input
          value={role}
          onChange={e => setRole(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSave()}
          placeholder="Type your target role (e.g. AI/ML Engineer)"
          className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
        />
        <Button onClick={handleSave} isLoading={saving} disabled={!role.trim()}>
          Analyze
        </Button>
      </div>
    </div>
  )
}

// ─── Main SkillsPage ──────────────────────────────────────────────────────────
export default function SkillsPage() {
  const navigate = useNavigate()
  const { selectedSkillNodeId, setSelectedSkillNodeId } = useNavigationStore()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 1. Fetch resume
  const { data: resume, isLoading: resumeLoading } = useQuery({
    queryKey: ['latestResume'],
    queryFn: () => resumeApi.getLatest().then(r => r.data),
    retry: false,
  })

  // 2. Fetch career intelligence
  const { data: intel, isLoading: intelLoading, refetch } = useQuery({
    queryKey: ['careerIntelligence'],
    queryFn: () => careerApi.getIntelligence().then(r => r.data),
    retry: false,
  })

  const isLoading = resumeLoading || intelLoading

  const targetRole: string = intel?.skill_alignment?.target_role || intel?.profile?.target_role || ''
  const verifiedSkills: string[] = intel?.profile?.verified_skills || []
  
  const roadmap = useMemo(() => parseRoadmap(intel?.learning_roadmap || [], verifiedSkills), [intel?.learning_roadmap, verifiedSkills])
  const dagPhases = useMemo(() => buildDAGPhases(roadmap), [roadmap])

  const coveragePct = normalizePercentage(intel?.skill_alignment?.coverage_percentage)
  const completedCount = roadmap.filter(n => n.status === 'completed').length
  const remainingCount = roadmap.filter(n => n.status !== 'completed').length
  const totalHours = roadmap.filter(n => n.status !== 'completed' && n.effort !== '').reduce((a, n) => a + (parseInt(n.effort) || 0), 0)

  const nextFocus = roadmap.find(n => n.status === 'focus')
    || roadmap.find(n => n.status === 'recommended' && n.impact === 'high')
    || roadmap.find(n => n.status === 'recommended')

  const activeNode = roadmap.find(n => n.id === selectedSkillNodeId)
    || nextFocus
    || roadmap[0]
    || null

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try { await careerApi.refresh(); await refetch() } catch { /* noop */ }
    finally { setIsRefreshing(false) }
  }, [refetch])

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-4">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    )
  }

  // ── No Resume ──
  if (!resume) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4 animate-fade-in">
        <div className="w-16 h-16 bg-brand-light dark:bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-primary/20">
          <Map size={30} className="text-brand-primary animate-pulse" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mb-2">
          Upload Resume to Build Your Roadmap
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
          A.C.E. maps your verified skills against target market requirements using a dynamic prerequisite graph engine.
        </p>
        <Button onClick={() => navigate('/resume')} icon={<ArrowRight size={15} />}>
          Upload Resume
        </Button>
      </div>
    )
  }

  if (!targetRole) {
    return <TargetRoleSetup onCompleted={refetch} />
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[1400px] mx-auto flex flex-col gap-8 pb-16 animate-fade-in text-neutral-800 dark:text-neutral-200">
      
      {/* ── 1. PAGE HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            Skill Roadmap
          </h1>
          <p className="text-xs text-neutral-500 mt-1 font-medium">
            Dynamic profile alignment and prerequisite path for <span className="text-brand-primary font-bold">{targetRole}</span>
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="sm" variant="secondary" onClick={() => navigate('/resume')} icon={<Target size={14}/>}>
            Edit Role
          </Button>
          <Button size="sm" onClick={handleRefresh} isLoading={isRefreshing} icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''}/>}>
            Refresh Intelligence
          </Button>
        </div>
      </div>

      {/* ── 2. READINESS HERO ── */}
      <div className="relative rounded-2xl overflow-hidden shadow-elevated bg-[#0F1E16] text-white border border-[#18291E]">
        {/* Subtle radial lighting */}
        <div className="absolute top-0 right-0 w-[500px] h-[300px] bg-brand-primary/20 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="relative p-8 flex flex-col lg:flex-row items-center gap-10">
          
          {/* Target Role & Progress */}
          <div className="flex-1 w-full border-b lg:border-b-0 lg:border-r border-white/10 pb-8 lg:pb-0 lg:pr-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#AEC3B0] mb-2 block">Target Role</span>
            <h2 className="text-3xl font-black mb-6">{targetRole}</h2>
            
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-[#E3EFD3]">Role Readiness Coverage</span>
                <span className="text-xl font-black text-white">{coveragePct}%</span>
              </div>
              {/* Progress Bar (Linear Green) */}
              <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-[#234F45] to-[#6B8F71] transition-all duration-1000 ease-out"
                  style={{ width: `${coveragePct}%` }}
                />
              </div>
              <p className="text-[10px] text-[#AEC3B0] mt-2">Steady progress. {remainingCount} key gaps to level up.</p>
            </div>
          </div>

          {/* Metrics */}
          <div className="flex gap-6 w-full lg:w-auto shrink-0 justify-between lg:justify-start">
            {[
              { label: 'Completed', value: completedCount, icon: CheckCircle2 },
              { label: 'Gaps Left', value: remainingCount, icon: Target },
              { label: 'Est. Effort', value: totalHours > 0 ? `${totalHours}h` : '—', icon: Clock },
            ].map((m, i) => (
              <div key={i} className="flex flex-col bg-white/5 p-4 rounded-xl border border-white/10 min-w-[110px] backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2 text-[#AEC3B0]">
                  <m.icon size={12} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{m.label}</span>
                </div>
                <span className="text-2xl font-black text-white">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. ACTION & VELOCITY ROW ── */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Next Best Action (65%) */}
        {nextFocus && (
          <div className="lg:w-[65%] rounded-2xl border border-brand-primary/20 bg-white dark:bg-[#0D1117] shadow-card p-6 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary" />
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-brand-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Next Best Action</span>
              </div>
              {nextFocus.impact === 'high' && (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${IMPACT_BADGE.high.cls}`}>
                  HIGH IMPACT
                </span>
              )}
            </div>
            
            <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-2">
              Focus Next on: {nextFocus.name}
            </h3>
            {nextFocus.reason && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6 max-w-2xl leading-relaxed">
                {nextFocus.reason}
              </p>
            )}
            
            <div className="mt-auto">
              <Button onClick={() => {
                setSelectedSkillNodeId(nextFocus.id)
                document.getElementById('diagnostic-panel')?.scrollIntoView({ behavior: 'smooth' })
              }}>
                Inspect Skill Node <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Velocity Commitment (35%) */}
        <div className="lg:w-[35%] rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0D1117] shadow-card p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={16} className="text-brand-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-neutral-500">Velocity Commitment</span>
          </div>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            Set your weekly study commitment to hit your target role readiness.
          </p>
          
          <div className="flex justify-between gap-2 mb-6">
            {[5, 10, 15].map(h => (
              <div key={h} className={`flex-1 text-center py-2 rounded-lg border text-sm font-bold cursor-default transition-all ${
                h === 10 ? 'bg-brand-primary text-white border-brand-primary shadow-sm' : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
              }`}>
                {h}h / wk
              </div>
            ))}
          </div>
          
          <div className="mt-auto flex justify-between items-center text-xs font-semibold pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <span className="text-neutral-500">Pace: <span className="text-brand-primary">Accelerated</span></span>
            <span className="text-neutral-500">
              Ready in <span className="text-neutral-900 dark:text-white">~{Math.ceil(totalHours / 10)} wks</span>
            </span>
          </div>
        </div>
      </div>

      {/* ── 4. MAIN WORKSPACE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: DAG + DIAGNOSTIC (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* DAG Visual Container */}
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0D1117] shadow-card overflow-hidden">
            <div className="p-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Map size={18} className="text-brand-primary" />
                <h3 className="font-bold text-sm">Your Career Roadmap</h3>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold text-neutral-500 uppercase">
                <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-brand-primary"/> Completed</span>
                <span className="flex items-center gap-1"><Zap size={10} className="text-brand-primary"/> Current Focus</span>
                <span className="flex items-center gap-1"><Circle size={10}/> Recommended</span>
                <span className="flex items-center gap-1"><Lock size={10}/> Blocked</span>
              </div>
            </div>
            
            <div className="p-6 md:p-10 overflow-x-auto">
              <div className="min-w-[600px] space-y-12">
                {dagPhases.map((phase, idx) => (
                  <div key={idx} className="relative">
                    {/* Connecting line to next phase (except last) */}
                    {idx < dagPhases.length - 1 && (
                      <div className="absolute left-[120px] top-[100%] h-12 w-px border-l-2 border-dashed border-neutral-200 dark:border-neutral-700 -z-10" />
                    )}
                    
                    <div className="flex items-start gap-8">
                      <div className="w-32 flex-shrink-0 pt-2">
                        <span className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Phase {phase.phaseIndex}</span>
                        <span className="text-xs font-bold text-brand-primary dark:text-[#6B8F71] leading-tight block">{phase.title}</span>
                      </div>
                      <div className="flex-1 flex flex-wrap gap-4">
                        {phase.nodes.map(node => (
                          <DAGNodeCard
                            key={node.id}
                            node={node}
                            isActive={activeNode?.id === node.id}
                            onClick={() => setSelectedSkillNodeId(node.id)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {dagPhases.length === 0 && (
                  <div className="text-center py-12 text-sm text-neutral-500">No roadmap data generated yet.</div>
                )}
              </div>
              <p className="text-center text-[10px] text-neutral-400 mt-8 font-medium">Click any skill node to view diagnostics, prerequisites & learning plan</p>
            </div>
          </div>

          {/* Diagnostic Panel */}
          <div id="diagnostic-panel">
            <DiagnosticWorkspace
              skill={activeNode}
              targetRole={targetRole}
              verifiedSkills={verifiedSkills}
              navigate={navigate}
            />
          </div>

        </div>

        {/* RIGHT COLUMN: INTELLIGENCE SIDEBAR (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* A.C.E. Synthesis */}
          {intel?.ai_synthesis && (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0D1117] p-5 shadow-sm">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3 flex items-center gap-1.5">
                <Sparkles size={12} className="text-brand-primary" /> A.C.E. Career Intelligence Synthesis
              </h4>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
                {intel.ai_synthesis}
              </p>
              <div className="flex justify-between items-center pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[10px] font-semibold text-neutral-400">
                <span>Source: AI Analysis</span>
                <span className="text-brand-primary">Real-time</span>
              </div>
            </div>
          )}

          {/* Highest Impact Gap */}
          {intel?.prioritized_gaps?.[0] && (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0D1117] p-5 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-brand-primary flex items-center gap-1.5">
                  <TrendingUp size={12} /> Highest Impact Gap
                </h4>
                {intel.prioritized_gaps[0].priority && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${IMPACT_BADGE[(intel.prioritized_gaps[0].priority.toLowerCase() as NodeImpact) || 'medium'].cls}`}>
                    {intel.prioritized_gaps[0].priority.toUpperCase()} PRIORITY
                  </span>
                )}
              </div>
              <h3 className="text-sm font-black text-neutral-900 dark:text-white mb-2">{intel.prioritized_gaps[0].skill}</h3>
              {intel.prioritized_gaps[0].gap_description && (
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed mb-4">
                  {intel.prioritized_gaps[0].gap_description}
                </p>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[10px] font-semibold text-neutral-400">
                <span>Impact: High Readiness Increase</span>
                <span>Source: Gap Analysis</span>
              </div>
            </div>
          )}

          {/* Validated Gaps List */}
          {(intel?.prioritized_gaps?.length || 0) > 1 && (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0D1117] p-5 shadow-sm">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-1.5">
                <Target size={12} className="text-brand-primary" /> Validated Priority Skill Gaps ({intel.prioritized_gaps.length})
              </h4>
              <div className="space-y-3">
                {intel.prioritized_gaps.slice(1, 5).map((gap: GapItem, i: number) => {
                  const impCode = (gap.priority?.toLowerCase() as NodeImpact) || 'medium'
                  return (
                    <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-white dark:bg-neutral-900 shadow-sm border border-neutral-200 dark:border-neutral-700 text-[10px] font-black flex items-center justify-center text-neutral-500">
                          {i + 2}
                        </span>
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">{gap.skill}</span>
                      </div>
                      <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${IMPACT_BADGE[impCode].cls}`}>
                        {gap.priority || 'MED'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actionable Provenance Strategy */}
          {intel?.recommendations?.[0] && (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#0D1117] p-5 shadow-sm">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-3 flex items-center gap-1.5">
                <AlertCircle size={12} className="text-brand-primary" /> Actionable Provenance Strategy
              </h4>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed mb-4">
                {intel.recommendations[0].description || intel.recommendations[0].title}
              </p>
              <div className="flex justify-between items-center pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[10px] font-semibold text-neutral-400">
                <span>Source: Provenance Engine</span>
                <span className="text-brand-primary">Real-time</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
