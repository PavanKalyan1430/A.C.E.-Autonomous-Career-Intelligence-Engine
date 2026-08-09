import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Upload, FileText, Star, CheckCircle2, AlertCircle, Target,
  Code, Layers, Loader2, Sparkles, ArrowRight, Cloud
} from 'lucide-react'
import { resumeApi } from '@/api'
import type { ParsedResume } from '@/types'
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip
} from 'recharts'

export default function ResumePage() {
  const [dragging, setDragging] = useState(false)
  const [jd, setJd] = useState('')
  const [matchResult, setMatchResult] = useState<null | { score: number; missing: string[] }>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const qc = useQueryClient()

  const { data: resume, isLoading } = useQuery<ParsedResume>({
    queryKey: ['resume-latest'],
    queryFn: () => resumeApi.getLatest().then(r => r.data),
    retry: false,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => resumeApi.upload(file).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['resume-latest'] }),
  })

  const handleFile = (file: File) => uploadMutation.mutate(file)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleMatch = () => {
    if (!resume || !jd) return
    const resumeSkills = resume.skills?.map(s => s.toLowerCase()) ?? []
    const jdWords = jd.toLowerCase().split(/\s+/)
    const matched = resumeSkills.filter(s => jdWords.includes(s))
    const missing = ['system design', 'kubernetes', 'kafka', 'graphql']
      .filter(s => jdWords.some(w => w.includes(s.split(' ')[0])) && !resumeSkills.includes(s))
    const score = Math.min(95, 40 + matched.length * 8)
    setMatchResult({ score, missing })
  }

  const skillRadarData = resume?.skills?.slice(0, 6).map((s, i) => ({
    skill: s, value: 60 + (i % 4) * 10
  })) ?? []

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Resume Intelligence</h1>
        <p className="page-subtitle">Upload your resume and let AI analyze, score, and improve it.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Upload + Overview column */}
        <div className="col-span-2 space-y-4">
          {/* Upload zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200
              ${dragging ? 'border-accent bg-accent/10' : 'border-bg-border hover:border-accent/50 hover:bg-accent/5'}`}
          >
            <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
            {uploadMutation.isPending ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={36} className="text-accent animate-spin" />
                <p className="text-sm text-text-muted">Analyzing your resume with AI...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <Cloud size={26} className="text-accent" />
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Drop your resume here</p>
                  <p className="text-xs text-text-muted mt-1">PDF, DOC, TXT — up to 5MB</p>
                </div>
                <span className="badge-accent"><Upload size={11} /> Browse Files</span>
              </div>
            )}
          </div>

          {/* Parsed overview */}
          {isLoading && (
            <div className="card space-y-3">
              {[80, 60, 90].map(w => <div key={w} className={`skeleton h-4 w-${w} rounded`} />)}
            </div>
          )}

          {resume && !isLoading && (
            <>
              {/* Scores */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Resume Score', value: 78, color: 'text-accent', bg: 'bg-accent/10', icon: Star },
                  { label: 'ATS Score', value: 84, color: 'text-success', bg: 'bg-success/10', icon: CheckCircle2 },
                  { label: 'Completeness', value: 70, color: 'text-warning', bg: 'bg-warning/10', icon: Target },
                ].map(s => (
                  <motion.div key={s.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card text-center">
                    <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mx-auto mb-3`}>
                      <s.icon size={18} className={s.color} />
                    </div>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}<span className="text-lg">/100</span></p>
                    <p className="text-xs text-text-muted mt-1">{s.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Work Experience */}
              {resume.work_experience?.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Layers size={15} className="text-accent" /> Work Experience
                  </h3>
                  <div className="space-y-4">
                    {resume.work_experience.map((exp, i) => (
                      <div key={i} className="border-l-2 border-accent/30 pl-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-text-primary">{exp.role}</p>
                          <span className="text-xs text-text-muted">{exp.start_date} – {exp.end_date}</span>
                        </div>
                        <p className="text-xs text-accent mt-0.5">{exp.company}</p>
                        <ul className="mt-2 space-y-1">
                          {exp.description.slice(0, 2).map((d, j) => (
                            <li key={j} className="text-xs text-text-secondary flex gap-2">
                              <span className="text-accent mt-0.5">•</span> {d}
                            </li>
                          ))}
                        </ul>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {exp.technologies.map(t => <span key={t} className="badge-muted">{t}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Projects */}
              {resume.projects?.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                    <Code size={15} className="text-violet" /> Projects
                  </h3>
                  <div className="space-y-3">
                    {resume.projects.map((p, i) => (
                      <div key={i} className="bg-bg-elevated rounded-xl p-4 border border-bg-border">
                        <p className="text-sm font-medium text-text-primary">{p.title}</p>
                        <p className="text-xs text-text-muted mt-1">{p.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {p.technologies.map(t => <span key={t} className="badge-accent text-[10px]">{t}</span>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* JD Matching */}
              <div className="card">
                <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <Target size={15} className="text-accent" /> Resume vs Job Description
                </h3>
                <textarea
                  value={jd} onChange={e => setJd(e.target.value)}
                  placeholder="Paste a job description here..."
                  className="input min-h-[100px] resize-none mb-3"
                />
                <button onClick={handleMatch} className="btn-primary">
                  <Sparkles size={14} /> Analyze Match
                </button>
                {matchResult && (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl font-bold text-accent">{matchResult.score}%</div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">Match Score</p>
                        <p className="text-xs text-text-muted">Based on skill overlap</p>
                      </div>
                    </div>
                    {matchResult.missing.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-warning mb-2">Missing Skills</p>
                        <div className="flex flex-wrap gap-2">
                          {matchResult.missing.map(m => <span key={m} className="badge-warning">{m}</span>)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right column — skills */}
        <div className="space-y-4">
          {resume && (
            <>
              {/* Skill radar */}
              <div className="card">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Skill Radar</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={skillRadarData}>
                    <PolarGrid stroke="#2a2a3a" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: '#71717a' }} />
                    <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Skills list */}
              <div className="card">
                <h3 className="text-sm font-semibold text-text-primary mb-4">Extracted Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {resume.skills?.map(s => <span key={s} className="badge-accent">{s}</span>)}
                </div>
              </div>

              {/* Suggestions */}
              <div className="card">
                <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
                  <AlertCircle size={14} className="text-warning" /> Improvement Tips
                </h3>
                <div className="space-y-3">
                  {[
                    'Add quantifiable metrics (e.g. "reduced latency by 40%")',
                    'Include GitHub links for all projects',
                    'Tailor your summary to target role keywords',
                  ].map((tip, i) => (
                    <div key={i} className="flex gap-2 text-xs text-text-secondary">
                      <ArrowRight size={13} className="text-warning flex-shrink-0 mt-0.5" />
                      {tip}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {!resume && !isLoading && (
            <div className="card flex flex-col items-center text-center py-10">
              <FileText size={36} className="text-text-muted mb-3" />
              <p className="text-sm font-medium text-text-primary">No resume yet</p>
              <p className="text-xs text-text-muted mt-1">Upload your resume to see skill analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
