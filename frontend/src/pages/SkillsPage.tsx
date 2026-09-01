import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { resumeApi, careerApi } from '@/api'
import { normalizePercentage } from '@/utils/error'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { TargetRoleGuidedSetup } from '@/components/skills/TargetRoleGuidedSetup'
import { ExecutiveSummaryHeader } from '@/components/skills/ExecutiveSummaryHeader'
import { InteractiveRoadmapGraph } from '@/components/skills/InteractiveRoadmapGraph'
import type { SkillNodeData } from '@/components/skills/InteractiveRoadmapGraph'
import { SkillDetailDrawer } from '@/components/skills/SkillDetailDrawer'
import { AICareerGuidancePanel } from '@/components/skills/AICareerGuidancePanel'
import { Map, ArrowRight, Target, RefreshCw } from 'lucide-react'

export default function SkillsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [isEditingRole, setIsEditingRole] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 1. Fetch latest resume
  const { data: resume, isLoading: isResumeLoading } = useQuery({
    queryKey: ['latestResume'],
    queryFn: async () => {
      const res = await resumeApi.getLatest()
      return res.data
    },
    retry: false
  })

  // 2. Fetch live career intelligence DAG & recommendations
  const { data: careerIntel, isLoading: isIntelLoading, refetch } = useQuery({
    queryKey: ['careerIntelligence'],
    queryFn: async () => {
      const res = await careerApi.getIntelligence()
      return res.data
    },
    retry: false
  })

  const targetRole = careerIntel?.skill_alignment?.target_role || careerIntel?.profile?.target_role || ''
  const verifiedSkills: string[] = careerIntel?.profile?.verified_skills || []

  // Transform backend roadmap items into rich SkillNodeData
  const dynamicRoadmap: SkillNodeData[] = (careerIntel?.learning_roadmap || []).map((node: any) => {
    const rawStatus = (node.status || 'recommended').toLowerCase()
    const validStatus: SkillNodeData['status'] = ['completed', 'focus', 'recommended', 'blocked'].includes(rawStatus)
      ? (rawStatus as SkillNodeData['status'])
      : 'recommended'

    return {
      id: node.id || node.name.toLowerCase().replace(/\s+/g, '_'),
      name: node.name,
      status: validStatus,
      impact: (node.impact || 'high').toLowerCase() === 'medium' ? 'medium' : 'high',
      prereqs: (node.prerequisites || []).map((p: any) => ({
        name: typeof p === 'string' ? p : p.name,
        met: typeof p === 'string' ? verifiedSkills.some(s => s.toLowerCase() === p.toLowerCase()) : !!p.met
      })),
      reason: node.reason || 'Recommended by A.C.E. career intelligence engine.',
      effort: node.estimated_effort_hours ? `${node.estimated_effort_hours}h` : '12h'
    }
  })

  const coveragePercentage = normalizePercentage(careerIntel?.skill_alignment?.coverage_percentage)

  const completedCount = dynamicRoadmap.filter(n => n.status === 'completed').length
  const remainingCount = dynamicRoadmap.filter(n => n.status !== 'completed').length
  const totalEffortHours = dynamicRoadmap
    .filter(n => n.status !== 'completed')
    .reduce((acc, n) => acc + (parseInt(n.effort) || 12), 0)

  // Determine active selected node (default to first focus/recommended gap or first node)
  const activeNode = dynamicRoadmap.find(n => n.id === selectedNodeId)
    || dynamicRoadmap.find(n => n.status === 'focus')
    || dynamicRoadmap.find(n => n.status === 'recommended')
    || dynamicRoadmap[0]
    || null

  const nextBestSkill = dynamicRoadmap.find(n => n.status === 'focus')
    || dynamicRoadmap.find(n => n.status === 'recommended' && n.impact === 'high')
    || dynamicRoadmap.find(n => n.status === 'recommended')
    || null

  const handleManualRefresh = async () => {
    setIsRefreshing(true)
    try {
      await careerApi.refresh()
      await refetch()
    } catch (err) {
      console.error('Failed to refresh career intelligence', err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const isLoading = isResumeLoading || isIntelLoading

  // Loading Skeleton State
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in p-2">
        <div className="flex justify-between items-end mb-2">
          <Skeleton className="h-10 w-56 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-[500px] rounded-2xl" />
          <Skeleton className="h-[500px] rounded-2xl" />
        </div>
      </div>
    )
  }

  // ─── EMPTY STATE 1: No Resume Uploaded ──────────────────────────────────
  if (!resume) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4 animate-fade-in">
        <div className="w-16 h-16 bg-brand-light dark:bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-brand-primary/20 shadow-elevated">
          <Map size={32} className="text-brand-primary animate-pulse-dot" />
        </div>
        <h2 className="text-2xl font-black tracking-tight text-neutral-800 dark:text-white mb-2">
          Upload Resume to Map Career Skill Roadmap
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed font-medium">
          The A.C.E. skill roadmap matches your technical experience against target market requirements. Upload your resume to begin baseline extraction.
        </p>
        <Button onClick={() => navigate('/resume')} icon={<ArrowRight size={16} />} className="bg-brand-hover hover:bg-brand-hover/90 text-white font-bold px-6">
          Upload Resume Baseline
        </Button>
      </div>
    )
  }

  // ─── EMPTY / UNCONFIGURED STATE 2: Target Role Unconfigured ────────────
  if (resume && !targetRole) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in">
        <TargetRoleGuidedSetup
          onCompleted={() => refetch()}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-neutral-800 dark:text-neutral-200">
      
      {/* Top Header & Refresh Control */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1">
            <span className="bg-gradient-to-r from-[#0D2B1D] via-[#10B981] to-[#336659] dark:from-white dark:via-brand-sage dark:to-emerald-400 bg-clip-text text-transparent">
              Career Skill Roadmap & Intelligence Workspace
            </span>
          </h1>
          <p className="text-2xs md:text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Dynamic DAG prerequisite path & prioritized gap breakdown for {targetRole}.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            isLoading={isRefreshing}
            onClick={handleManualRefresh}
            icon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
            className="text-2xs border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300"
          >
            Refresh Intelligence
          </Button>
        </div>
      </div>

      {/* Target Role Guided Setup Modal / Inline Editor toggle */}
      {isEditingRole && (
        <div className="mb-4">
          <TargetRoleGuidedSetup
            currentRole={targetRole}
            isInline
            onCompleted={() => {
              setIsEditingRole(false)
              refetch()
            }}
          />
        </div>
      )}

      {/* Executive Summary Header */}
      <ExecutiveSummaryHeader
        targetRole={targetRole}
        coveragePercentage={coveragePercentage}
        completedCount={completedCount}
        remainingCount={remainingCount}
        totalEffortHours={totalEffortHours}
        nextBestSkill={nextBestSkill}
        onOpenRoleSetup={() => setIsEditingRole(!isEditingRole)}
        onSelectNextSkill={(skillId) => setSelectedNodeId(skillId)}
      />

      {/* Main Workspace Layout: Roadmap & Detail Panel (Left) vs AI Guidance Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Interactive Roadmap DAG & Skill Detail Drawer */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Hero Roadmap Visual Pipeline */}
          <InteractiveRoadmapGraph
            nodes={dynamicRoadmap}
            selectedNodeId={activeNode?.id || null}
            onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
            targetRole={targetRole}
          />

          {/* Interactive Selected Node Detail Drawer */}
          <SkillDetailDrawer
            skill={activeNode}
            targetRole={targetRole}
            verifiedSkills={verifiedSkills}
          />

        </div>

        {/* Right Column: AI Career Guidance & Provenance Panel */}
        <div className="lg:col-span-1 space-y-6">
          <AICareerGuidancePanel
            aiSynthesis={careerIntel?.ai_synthesis}
            prioritizedGaps={careerIntel?.prioritized_gaps || []}
            recommendations={careerIntel?.recommendations || []}
            targetRole={targetRole}
            coveragePercentage={coveragePercentage}
          />
        </div>

      </div>

    </div>
  )
}
