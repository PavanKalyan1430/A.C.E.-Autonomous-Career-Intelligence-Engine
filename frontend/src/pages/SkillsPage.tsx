import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { resumeApi } from '@/api'
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

// --- Graph Types & Mock DAG mapping ---
interface SkillNode {
  id: string
  name: string
  status: 'completed' | 'focus' | 'recommended' | 'blocked'
  impact: 'high' | 'medium'
  prereqs: { name: string; met: boolean }[]
  reason: string
  effort: string
}

const MOCK_NODES: Record<string, SkillNode> = {
  python: {
    id: 'python',
    name: 'Python',
    status: 'completed',
    impact: 'high',
    prereqs: [],
    reason: 'Identified as your core programming language in your uploaded resume.',
    effort: '0 hours (Completed)'
  },
  rest: {
    id: 'rest',
    name: 'REST APIs',
    status: 'completed',
    impact: 'high',
    prereqs: [{ name: 'Python', met: true }],
    reason: 'Required for microservice communication architectures.',
    effort: '0 hours (Completed)'
  },
  system_design: {
    id: 'system_design',
    name: 'System Design',
    status: 'focus',
    impact: 'high',
    prereqs: [{ name: 'REST APIs', met: true }],
    reason: 'Crucial for scaling services. Identified as a weakness area in recent mock sessions.',
    effort: '12 hours'
  },
  docker: {
    id: 'docker',
    name: 'Docker',
    status: 'focus',
    impact: 'high',
    prereqs: [{ name: 'REST APIs', met: true }],
    reason: 'Base containerization format. Required before learning cloud orchestration.',
    effort: '8 hours'
  },
  kubernetes: {
    id: 'kubernetes',
    name: 'Kubernetes',
    status: 'recommended',
    impact: 'high',
    prereqs: [{ name: 'Docker', met: true }],
    reason: 'Frequently required across 82% of target backend engineering opportunities.',
    effort: '16 hours'
  },
  grpc: {
    id: 'grpc',
    name: 'gRPC',
    status: 'blocked',
    impact: 'medium',
    prereqs: [{ name: 'REST APIs', met: true }, { name: 'Kubernetes', met: false }],
    reason: 'Prerequisite for high-performance service mesh communication.',
    effort: '6 hours'
  }
}

export default function SkillsPage() {
  const navigate = useNavigate()
  const [targetRole, setTargetRole] = useState('Backend Engineer')
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('kubernetes')

  // 1. Fetch resume parser details
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

  // Active selected node or dynamic node from API
  const dynamicRoadmap = careerIntel?.learning_roadmap || []
  const coveragePercentage = careerIntel?.skill_alignment?.coverage_percentage || 72

  const activeNode = selectedNodeId ? (
    dynamicRoadmap.find((n: any) => n.id === selectedNodeId) || MOCK_NODES[selectedNodeId] || MOCK_NODES['kubernetes']
  ) : MOCK_NODES['kubernetes']

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
          <select 
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-lg px-3 py-2 outline-none text-xs font-semibold shadow-sm"
          >
            <option value="Backend Engineer">Backend Engineer</option>
            <option value="DevOps Engineer">DevOps Engineer</option>
            <option value="Frontend Engineer">Frontend Engineer</option>
          </select>
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

            {/* Custom SVG/HTML Node Connections Flowchart */}
            <div className="flex flex-col items-center py-6 space-y-4">
              
              {/* Python */}
              <button 
                onClick={() => setSelectedNodeId('python')}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedNodeId === 'python'
                    ? 'ring-2 ring-brand-primary/40 scale-105'
                    : ''
                } bg-neutral-100 dark:bg-[#1E293B] text-neutral-500 border-neutral-300 dark:border-[#334155]`}
              >
                Python ✓
              </button>
              
              <ArrowDown size={16} className="text-neutral-300 dark:text-neutral-700" />

              {/* REST APIs */}
              <button 
                onClick={() => setSelectedNodeId('rest')}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedNodeId === 'rest'
                    ? 'ring-2 ring-brand-primary/40 scale-105'
                    : ''
                } bg-neutral-100 dark:bg-[#1E293B] text-neutral-500 border-neutral-300 dark:border-[#334155]`}
              >
                REST APIs ✓
              </button>

              <ArrowDown size={16} className="text-neutral-300 dark:text-neutral-700" />

              {/* System Design */}
              <button 
                onClick={() => setSelectedNodeId('system_design')}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                  selectedNodeId === 'system_design'
                    ? 'ring-2 ring-brand-primary/40 scale-105'
                    : ''
                } bg-brand-primary text-white border-transparent`}
              >
                System Design ●
              </button>

              {/* Split row: Docker (Focus) vs Kubernetes (Recommended) */}
              <div className="w-full max-w-sm flex items-center justify-between py-2">
                <div className="flex flex-col items-center">
                  <ArrowDownLeft size={24} className="text-neutral-300 dark:text-neutral-700 mr-8" />
                  <button 
                    onClick={() => setSelectedNodeId('docker')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedNodeId === 'docker'
                        ? 'ring-2 ring-brand-primary/40 scale-105'
                        : ''
                    } bg-brand-primary text-white border-transparent`}
                  >
                    Docker ●
                  </button>
                </div>

                <div className="flex flex-col items-center">
                  <ArrowDownRight size={24} className="text-[#0891B2]/50 ml-8" />
                  <button 
                    onClick={() => setSelectedNodeId('kubernetes')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      selectedNodeId === 'kubernetes'
                        ? 'ring-2 ring-brand-cyan/40 scale-105'
                        : ''
                    } bg-brand-cyan10 text-[#0891B2] border-brand-cyan/20`}
                  >
                    Kubernetes ○
                  </button>
                </div>
              </div>

              {/* gRPC */}
              <div className="w-full flex flex-col items-center">
                <ArrowDown size={16} className="text-neutral-300 dark:text-neutral-700" />
                <button 
                  onClick={() => setSelectedNodeId('grpc')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                    selectedNodeId === 'grpc'
                      ? 'ring-2 ring-brand-primary/40 scale-105'
                      : ''
                  } bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 border-transparent`}
                >
                  gRPC
                </button>
              </div>

            </div>
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
                  <span>Impact Impact</span>
                  <span className="text-brand-primary uppercase">{activeNode.impact} Impact</span>
                </div>

                <div className="space-y-4">
                  {/* Prerequisites */}
                  {activeNode.prereqs.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5">Prerequisites</h4>
                      <div className="space-y-1">
                        {activeNode.prereqs.map((p, idx) => (
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
                  Start Learning Path
                </Button>
                <Button 
                  fullWidth 
                  variant="ghost"
                  onClick={() => navigate('/career')}
                >
                  Ask ACE about {activeNode.name}
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        
        {/* Next Best Skill */}
        <Card className="border-t-4 border-t-[#0891B2] flex flex-col justify-between">
          <div>
            <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#0891B2] animate-pulse-dot" /> Next Best Skill
            </h3>
            <div className="flex justify-between items-start mb-2">
              <h4 className="text-base font-bold text-[#3d3d3d] dark:text-white">Kubernetes</h4>
              <Badge variant="cyan">High Impact</Badge>
            </div>
            <p className="text-2xs text-neutral-500 dark:text-neutral-400 leading-normal max-w-sm mb-4">
              Strengthen container orchestration to improve your match score compatibility by up to 12%.
            </p>
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
                <div className="text-metric font-bold text-brand-primary leading-none">3</div>
                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-semibold mt-2">Remaining</div>
              </div>
              <div>
                <div className="text-metric font-bold text-brand-primary leading-none">2</div>
                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-semibold mt-2">Completed</div>
              </div>
              <div>
                <div className="text-metric font-bold text-brand-primary leading-none">24h</div>
                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 uppercase font-semibold mt-2">Est. Effort</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

    </div>
  )
}
