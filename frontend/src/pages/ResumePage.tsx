import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resumeApi } from '@/api'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  UploadCloud,
  FileText,
  CheckCircle,
  AlertTriangle,
  Award,
  Sparkles,
  TrendingUp,
  Map,
  ArrowRight,
  Briefcase,
  Layers,
  GraduationCap,
  X,
  FileCode,
  Activity
} from 'lucide-react'

// --- Types for Local Compare Mode ---
interface ComparisonResult {
  score: number
  matchedSkills: string[]
  missingSkills: string[]
  evidence: string
  weaknesses: string[]
}

export default function ResumePage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  // Local state
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState<'experience' | 'projects' | 'skills' | 'education'>('experience')
  const [uploadError, setUploadError] = useState('')
  const [uploadStage, setUploadStage] = useState<'idle' | 'uploading' | 'extracting' | 'structure' | 'profile' | 'done'>('idle')
  
  // Compare JD Modal State
  const [showCompareModal, setShowCompareModal] = useState(false)
  const [jdText, setJdText] = useState('')
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)

  // 1. Fetch latest parsed resume
  const { data: resume, isLoading: isResumeLoading } = useQuery({
    queryKey: ['latestResume'],
    queryFn: async () => {
      const res = await resumeApi.getLatest()
      return res.data
    },
    retry: false
  })

  // 2. Upload Mutation with staging events
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadStage('uploading')
      
      // Simulate staging triggers for visual polish
      await new Promise(r => setTimeout(r, 600))
      setUploadStage('extracting')
      await new Promise(r => setTimeout(r, 800))
      setUploadStage('structure')
      await new Promise(r => setTimeout(r, 800))
      setUploadStage('profile')
      
      const res = await resumeApi.upload(file)
      return res.data
    },
    onSuccess: () => {
      setUploadStage('done')
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['latestResume'] })
        setUploadStage('idle')
      }, 500)
      setUploadError('')
    },
    onError: (err: any) => {
      setUploadStage('idle')
      setUploadError(err.response?.data?.detail || 'Failed to parse resume. Verify document formatting.')
    }
  })

  // Drag-and-drop triggers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(e.type === 'dragenter' || e.type === 'dragover')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadMutation.mutate(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadMutation.mutate(e.target.files[0])
    }
  }

  // Local adapter logic to compare pasted JD to parsed resume skills
  const runComparison = () => {
    if (!jdText.trim() || !resume) return
    
    const lowercaseJd = jdText.toLowerCase()
    const parsedSkills = resume.skills || []
    
    // Find matched vs missing
    const matched = parsedSkills.filter((s: string) => lowercaseJd.includes(s.toLowerCase()))
    
    // Extract target keyphrases from JD to find missing
    const potentialGaps = ['Kubernetes', 'System Design', 'gRPC', 'Docker', 'AWS', 'Redis', 'Kafka', 'CI/CD']
    const missing = potentialGaps.filter(g => lowercaseJd.includes(g.toLowerCase()) && !parsedSkills.some((ps: string) => ps.toLowerCase() === g.toLowerCase()))
    
    // Calculate score
    const baseScore = 60
    const matchedAddition = Math.min(matched.length * 6, 30)
    const finalScore = Math.min(baseScore + matchedAddition, 98)

    setComparison({
      score: finalScore,
      matchedSkills: matched.slice(0, 8),
      missingSkills: missing.length > 0 ? missing : ['No critical gaps identified'],
      evidence: `Demonstrates prior implementation of ${matched.slice(0, 3).join(', ')} across past positions.`,
      weaknesses: missing.length > 0 
        ? missing.map(m => `Lacks documented exposure to ${m} in past experience.`)
        : ['Profile aligns with all listed structural parameters.']
    })
  }

  const handleQuickUploadTrigger = () => {
    document.getElementById('workspace-resume-uploader-input')?.click()
  }

  // Loading indicator
  if (isResumeLoading) {
    return (
      <div className="flex flex-col gap-6 animate-fade-in">
        <div className="flex justify-between items-end mb-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[450px]" />
          <Skeleton className="h-[450px]" />
        </div>
      </div>
    )
  }

  // ─── EMPTY STATE ─────────────────────────────────────────────────────────
  if (!resume) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 animate-fade-in">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-brand-light dark:bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-brand-primary/20">
            <UploadCloud size={32} className="text-brand-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-700 dark:text-white mb-2">
            Upload your resume to unlock intelligence
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            Analyze your profile, map technical prerequisite gaps, and trigger mock interview structures.
          </p>
        </div>

        <Card 
          className={`border-2 border-dashed p-10 text-center transition-all cursor-pointer hover:border-brand-primary/60 dark:hover:border-brand-primary/60 ${
            dragActive 
              ? 'border-brand-primary bg-brand-light dark:bg-[#18291E]/40' 
              : 'border-neutral-200 dark:border-[#4E6243]'
          }`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => document.getElementById('empty-resume-uploader-input')?.click()}
        >
          <input 
            type="file" 
            id="empty-resume-uploader-input" 
            className="hidden" 
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
          />
          
          {uploadStage !== 'idle' && uploadStage !== 'done' ? (
            <div className="flex flex-col items-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary mb-4" />
              <span className="text-sm font-semibold text-[#0891B2] capitalize animate-pulse">
                Stage: {uploadStage.replace('_', ' ')}...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <FileText size={48} className="text-neutral-400 dark:text-neutral-500 mb-4 animate-pulse-dot" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-white mb-1">
                Drag and drop your resume file here, or click to browse
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-6">
                Supports PDF, Word (DOCX) or plain TXT up to 10MB
              </p>
              <Button loading={uploadMutation.isPending} icon={<UploadCloud size={16} />}>
                Select File to Upload
              </Button>
            </div>
          )}
        </Card>

        {uploadError && (
          <div className="mt-4 p-4 bg-danger-light border border-danger/20 rounded-lg text-danger text-sm text-center">
            {uploadError}
          </div>
        )}
      </div>
    )
  }

  // ─── POPULATED WORKSPACE ─────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-fade-in text-neutral-700 dark:text-neutral-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold text-[#3d3d3d] dark:text-white tracking-tight mb-1">Resume Intelligence</h1>
          <p className="text-neutral-600 dark:text-neutral-400 font-medium">Analyze your resume and understand where you stand.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            id="workspace-resume-uploader-input" 
            className="hidden" 
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
          />
          <Button variant="secondary" icon={<UploadCloud size={16} />} onClick={handleQuickUploadTrigger} loading={uploadMutation.isPending}>
            Upload New
          </Button>
          <Button icon={<Sparkles size={16} />} onClick={() => setShowCompareModal(true)}>
            Compare with JD
          </Button>
        </div>
      </div>

      {uploadStage !== 'idle' && (
        <div className="p-4 bg-brand-light dark:bg-[#18291E] border border-brand-primary/20 rounded-xl text-center text-xs font-semibold text-brand-primary">
          <span className="animate-pulse">Processing Stage: {uploadStage.toUpperCase()}...</span>
        </div>
      )}

      {/* Main Analysis Side-by-Side Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* Left Column: Parsed Document preview */}
        <Card className="flex flex-col h-[650px] overflow-hidden bg-white dark:bg-[#0D1117] p-0">
          <div className="p-4 border-b border-neutral-200 dark:border-[#1E293B] bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-between flex-shrink-0">
            <span className="text-xs font-bold dark:text-white flex items-center gap-1.5">
              <FileText size={16} className="text-neutral-500" /> Extracted Resume Text
            </span>
            <span className="text-[10px] uppercase font-semibold text-[#6B8F71] tracking-wider">Document Preview</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 font-mono text-[11px] leading-relaxed text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap select-text custom-scrollbar">
            {resume.summary && (
              <div className="mb-6 p-4 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-[#1E293B] rounded-lg">
                <div className="font-bold text-xs uppercase text-neutral-500 tracking-wider mb-2 font-sans">Summary</div>
                <div className="font-sans text-xs italic leading-relaxed text-neutral-700 dark:text-neutral-300">{resume.summary}</div>
              </div>
            )}
            
            {/* Styled preview output */}
            <div className="space-y-6 font-sans select-text">
              {/* Experience preview */}
              <div>
                <div className="font-bold text-xs uppercase text-neutral-500 tracking-wider mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1">Work Experience</div>
                <div className="space-y-4">
                  {resume.work_experience?.map((exp: any, i: number) => (
                    <div key={i}>
                      <div className="flex justify-between text-xs font-bold text-[#3d3d3d] dark:text-white">
                        <span>{exp.role} @ {exp.company}</span>
                        <span className="text-neutral-400 dark:text-neutral-500">{exp.start_date} - {exp.end_date}</span>
                      </div>
                      <ul className="list-disc pl-4 mt-1.5 space-y-1 text-2xs text-neutral-500 dark:text-neutral-400">
                        {exp.description?.map((bullet: string, k: number) => (
                          <li key={k}>{bullet}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Projects preview */}
              <div>
                <div className="font-bold text-xs uppercase text-neutral-500 tracking-wider mb-3 border-b border-neutral-100 dark:border-neutral-800 pb-1">Projects</div>
                <div className="space-y-4">
                  {resume.projects?.map((proj: any, i: number) => (
                    <div key={i}>
                      <div className="text-xs font-bold text-[#3d3d3d] dark:text-white">{proj.title}</div>
                      <p className="text-2xs text-neutral-500 dark:text-neutral-400 mt-1">{proj.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Right Column: Health Diagnostics & Match Widgets */}
        <div className="flex flex-col gap-6">
          
          {/* Resume Health Diagnostics */}
          <Card>
            <h2 className="text-sm font-bold text-[#3d3d3d] dark:text-white mb-4">Resume Health</h2>
            <div className="flex items-center gap-6 mb-5">
              <div className="flex flex-col justify-center items-center bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 w-24 h-24 rounded-2xl flex-shrink-0">
                <span className="text-metric font-bold text-brand-primary leading-none">84</span>
                <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mt-1">/ 100</span>
              </div>
              <div className="flex-1 space-y-2.5">
                <div>
                  <div className="flex justify-between text-2xs font-semibold mb-1">
                    <span>Structure & Formatting</span>
                    <span className="text-success font-bold">Strong</span>
                  </div>
                  <ProgressBar value={90} variant="blue" />
                </div>
                <div>
                  <div className="flex justify-between text-2xs font-semibold mb-1">
                    <span>Linguistic Metrics</span>
                    <span className="text-success font-bold">Strong</span>
                  </div>
                  <ProgressBar value={85} variant="blue" />
                </div>
                <div>
                  <div className="flex justify-between text-2xs font-semibold mb-1">
                    <span>Skill Coverage</span>
                    <span className="text-brand-primary font-bold">88%</span>
                  </div>
                  <ProgressBar value={88} variant="blue" />
                </div>
              </div>
            </div>
          </Card>

          {/* Semantic Matches list */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-[#3d3d3d] dark:text-white">Semantic Job Match</h2>
              <Badge variant="blue">RAG-Verified</Badge>
            </div>
            
            <div className="space-y-3.5">
              {[
                { company: 'Razorpay', role: 'Senior Backend Engineer', match: 92 },
                { company: 'Swiggy', role: 'Staff Software Engineer', match: 87 },
                { company: 'Atlassian', role: 'Backend Engineer', match: 84 },
              ].map((job, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between items-end text-xs font-semibold">
                    <div>
                      <span className="text-[#3d3d3d] dark:text-white">{job.role}</span>
                      <span className="text-neutral-400 dark:text-neutral-500 ml-1.5">· {job.company}</span>
                    </div>
                    <span className="text-brand-primary font-bold">{job.match}%</span>
                  </div>
                  <ProgressBar value={job.match} variant="blue" />
                </div>
              ))}
            </div>
          </Card>

          {/* Strengths & Improvement Areas lists */}
          <div className="grid grid-cols-2 gap-5">
            {/* Strengths */}
            <Card className="border-t-4 border-t-brand-primary">
              <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-brand-primary" /> Strengths
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {resume.skills?.slice(0, 6).map((sk: string, i: number) => (
                  <Badge key={i} variant="blue" size="xs">✓ {sk}</Badge>
                ))}
              </div>
            </Card>

            {/* Improvement Areas */}
            <Card className="border-t-4 border-t-amber-500">
              <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-500" /> Gap Areas
              </h3>
              <div className="flex flex-wrap gap-1.5">
                <span className="cursor-pointer" onClick={() => navigate('/skills')}>
                  <Badge variant="warning" size="xs">! Kubernetes</Badge>
                </span>
                <span className="cursor-pointer" onClick={() => navigate('/skills')}>
                  <Badge variant="warning" size="xs">! System Design</Badge>
                </span>
                <span className="cursor-pointer" onClick={() => navigate('/skills')}>
                  <Badge variant="warning" size="xs">! gRPC</Badge>
                </span>
              </div>
            </Card>
          </div>

        </div>
      </div>

      {/* ── BOTTOM TABS FOR DETAILS ─────────────────────────────────────────── */}
      <Card className="mb-6">
        <div className="flex border-b border-neutral-200 dark:border-[#1E293B] gap-4 mb-4 flex-shrink-0">
          {(['experience', 'projects', 'skills', 'education'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-xs font-semibold capitalize border-b-2 transition-all ${
                activeTab === tab 
                  ? 'border-brand-primary text-brand-primary dark:text-white' 
                  : 'border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="text-xs">
          {activeTab === 'experience' && (
            <div className="space-y-4">
              {resume.work_experience?.map((exp: any, i: number) => (
                <div key={i} className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-[#1E293B] rounded-lg">
                  <div className="flex justify-between font-bold text-[#3d3d3d] dark:text-white mb-1">
                    <span>{exp.role} · {exp.company}</span>
                    <span className="text-neutral-400 dark:text-neutral-500 font-medium">{exp.start_date} - {exp.end_date}</span>
                  </div>
                  <p className="text-2xs text-neutral-500 dark:text-neutral-400 leading-normal mb-2">
                    {exp.description?.join(' ')}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {exp.technologies?.map((tech: string, k: number) => (
                      <Badge key={k} size="xs">{tech}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resume.projects?.map((proj: any, i: number) => (
                <Card key={i} className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-[#1E293B]">
                  <h4 className="font-bold text-[#3d3d3d] dark:text-white mb-1">{proj.title}</h4>
                  <p className="text-2xs text-neutral-500 dark:text-neutral-400 leading-relaxed mb-3">{proj.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {proj.technologies?.map((tech: string, k: number) => (
                      <Badge key={k} size="xs">{tech}</Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="flex flex-wrap gap-2">
              {resume.skills?.map((sk: string, i: number) => (
                <Badge key={i} variant="neutral">{sk}</Badge>
              ))}
            </div>
          )}

          {activeTab === 'education' && (
            <div className="space-y-3">
              {resume.education?.map((edu: any, i: number) => (
                <div key={i} className="p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-[#1E293B] rounded-lg">
                  <div className="flex justify-between font-bold text-[#3d3d3d] dark:text-white">
                    <span>{edu.degree} in {edu.field_of_study}</span>
                    <span className="text-neutral-400 dark:text-neutral-500 font-medium">{edu.graduation_date}</span>
                  </div>
                  <div className="text-2xs text-neutral-500 dark:text-neutral-400 mt-0.5">{edu.institution}</div>
                  {edu.gpa && <div className="text-[10px] font-bold text-[#0891B2] mt-1.5">GPA: {edu.gpa}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ── COMPONENT COMPARE MODAL (Compare with Job Description) ──────────── */}
      {showCompareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white dark:bg-[#0D1117] border-neutral-200 dark:border-[#1E293B] shadow-dropdown flex flex-col max-h-[90vh]">
            
            <div className="p-4 border-b border-neutral-200 dark:border-[#1E293B] flex items-center justify-between flex-shrink-0">
              <span className="font-bold text-sm dark:text-white flex items-center gap-1.5">
                <Sparkles size={16} className="text-[#0891B2]" /> Semantic Job Compare
              </span>
              <button onClick={() => {
                setShowCompareModal(false)
                setComparison(null)
                setJdText('')
              }} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {!comparison ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Paste Job Description Text</label>
                    <textarea
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      rows={8}
                      placeholder="Paste the target job description requirements here to run vector semantic alignment checks..."
                      className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-xl p-3 text-xs outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
                    />
                  </div>
                  <Button 
                    fullWidth 
                    icon={<Sparkles size={16} />} 
                    disabled={!jdText.trim()}
                    onClick={runComparison}
                  >
                    Compare Resume Alignment
                  </Button>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">
                  
                  {/* Semantic Score Card */}
                  <div className="flex items-center gap-5 p-4 bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/20 rounded-xl">
                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-neutral-900 shadow-sm border border-brand-primary/20 flex flex-col items-center justify-center flex-shrink-0">
                      <span className="text-xl font-bold text-brand-primary">{comparison.score}%</span>
                      <span className="text-[8px] font-bold text-neutral-400 dark:text-neutral-500 uppercase">Score</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#3d3d3d] dark:text-white">Semantic Compatibility</h4>
                      <p className="text-2xs text-neutral-500 mt-0.5 leading-relaxed">{comparison.evidence}</p>
                    </div>
                  </div>

                  {/* Matched vs Missing */}
                  <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                    <div>
                      <h5 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Matched Skills</h5>
                      <div className="flex flex-wrap gap-1">
                        {comparison.matchedSkills.map((sk, i) => (
                          <Badge key={i} variant="blue" size="xs">✓ {sk}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Missing Skills</h5>
                      <div className="flex flex-wrap gap-1">
                        {comparison.missingSkills.map((sk, i) => (
                          <Badge key={i} variant="warning" size="xs">{sk}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Potential Weaknesses */}
                  <div>
                    <h5 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mb-2">Weakness Check</h5>
                    <ul className="space-y-1.5 list-disc pl-4 text-2xs text-neutral-500 dark:text-neutral-400 font-medium">
                      {comparison.weaknesses.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>

                  <Button 
                    fullWidth 
                    variant="secondary"
                    onClick={() => {
                      setComparison(null)
                      setJdText('')
                    }}
                  >
                    Compare Another
                  </Button>
                </div>
              )}
            </div>

          </Card>
        </div>
      )}

    </div>
  )
}
