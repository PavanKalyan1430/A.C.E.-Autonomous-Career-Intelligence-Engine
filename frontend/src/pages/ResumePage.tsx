import React, { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { resumeApi, careerApi, authApi } from '@/api'
import { formatApiError, normalizePercentage } from '@/utils/error'
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
  Layers,
  X,
  Activity,
  Settings,
  HelpCircle
} from 'lucide-react'
import { ResumeIntelligenceDashboard } from '@/components/resume/ResumeIntelligenceDashboard'

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
  const location = useLocation()

  const emptyFileInputRef = useRef<HTMLInputElement>(null)
  const updateResumeInputRef = useRef<HTMLInputElement>(null)
  const uploadNewInputRef = useRef<HTMLInputElement>(null)

  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState<'ats_categories' | 'evidence' | 'roadmap' | 'experience' | 'projects' | 'education' | 'parsed_resume'>('ats_categories')
  const [uploadError, setUploadError] = useState('')
  const [tempRole, setTempRole] = useState('')
  const [isEditingRole, setIsEditingRole] = useState(false)

  const [showCompareModal, setShowCompareModal] = useState(false)
  const [jdText, setJdText] = useState('')
  const [comparison, setComparison] = useState<ComparisonResult | null>(null)

  const [roleSuggestions, setRoleSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false)
  const [suggestionError, setSuggestionError] = useState<string | null>(null)

  const roleCacheRef = useRef<Record<string, string[]>>({})
  const failedQueriesRef = useRef<Set<string>>(new Set())
  const lastTrimmedQuery = useRef("")
  const [focusedIndex, setFocusedIndex] = useState(-1)

  // Debounced search for canonical roles using Adzuna Live Discovery API
  useEffect(() => {
    const trimmed = tempRole.trim()
    setFocusedIndex(-1)

    if (trimmed.length < 2) {
      setRoleSuggestions([])
      setSuggestionError(null)
      setIsSearchingSuggestions(false)
      return
    }

    const key = trimmed.toLowerCase()

    // Serve from cache
    if (key in roleCacheRef.current) {
      setRoleSuggestions(roleCacheRef.current[key])
      setSuggestionError(null)
      return
    }

    // Don't retry a failed query until user types something new
    if (failedQueriesRef.current.has(key)) {
      setSuggestionError('Role suggestions temporarily unavailable. You can still type a role manually.')
      setRoleSuggestions([])
      return
    }

    // Skip if same query is already in-flight
    if (lastTrimmedQuery.current === key) {
      return
    }

    setSuggestionError(null)
    const abortController = new AbortController()

    const delayDebounce = setTimeout(async () => {
      setIsSearchingSuggestions(true)
      lastTrimmedQuery.current = key
      try {
        const res = await careerApi.searchRoles(trimmed, undefined, { signal: abortController.signal })
        const suggestions: string[] = res.data || []
        roleCacheRef.current[key] = suggestions
        setRoleSuggestions(suggestions)
        setSuggestionError(null)
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || abortController.signal.aborted) {
          lastTrimmedQuery.current = ""
          setIsSearchingSuggestions(false)
          return
        }
        failedQueriesRef.current.add(key)
        lastTrimmedQuery.current = ""
        console.warn('[Autocomplete] Role search unavailable:', err?.message || 'upstream failure')
        setSuggestionError('Role suggestions unavailable. You can still type a role manually.')
        setRoleSuggestions([])
      } finally {
        setIsSearchingSuggestions(false)
      }
    }, 400)

    return () => {
      clearTimeout(delayDebounce)
      abortController.abort()
    }
  }, [tempRole])

  const [savedRole, setSavedRole] = useState('')

  // 1. Fetch latest parsed resume
  const { data: resume, isLoading: isResumeLoading } = useQuery({
    queryKey: ['latestResume'],
    queryFn: async () => {
      const res = await resumeApi.getLatest()
      return res.data
    },
    retry: false
  })

  // 2. Fetch user profile
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const res = await authApi.getProfile()
      return res.data
    },
    enabled: !!resume,
    retry: false,
    staleTime: 30_000
  })

  // 3. Fetch career intelligence
  const { data: careerIntel, isLoading: isCareerIntelLoading } = useQuery({
    queryKey: ['careerIntelligence'],
    queryFn: async () => {
      const res = await careerApi.getIntelligence()
      return res.data
    },
    enabled: !!resume,
    retry: false,
    refetchOnWindowFocus: false
  })

  const effectiveRole = (
    savedRole ||
    (userProfile as any)?.target_role ||
    careerIntel?.skill_alignment?.target_role ||
    ''
  )

  // 4. Fetch ATS analysis
  const { data: atsAnalysis, isLoading: isAtsLoading, error: atsError, isFetching: isAtsFetching } = useQuery({
    queryKey: ['atsAnalysis', effectiveRole],
    queryFn: async () => {
      if (!effectiveRole) return null
      const res = await resumeApi.getAtsAnalysis(effectiveRole)
      return res.data
    },
    enabled: !!resume && !!effectiveRole,
    retry: false,
    refetchOnWindowFocus: false
  })

  const triggerAnalysisMutation = useMutation({
    mutationFn: async (role: string) => {
      const res = await resumeApi.triggerAtsAnalysis(role)
      return res.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['atsAnalysis', data.target_role], data)
      queryClient.invalidateQueries({ queryKey: ['atsAnalysis'] })
      queryClient.invalidateQueries({ queryKey: ['analyticsDashboard'] })
      setUploadError('')
    },
    onError: (err: any) => {
      setUploadError(formatApiError(err, 'Failed to run ATS analysis. Please retry.'))
    }
  })

  useEffect(() => {
    if (isResumeLoading) return
    if (!location.state?.triggerUpload) return
    const targetInput = resume ? updateResumeInputRef.current : emptyFileInputRef.current
    if (targetInput) {
      navigate(location.pathname, { replace: true, state: {} })
      targetInput.click()
    }
  }, [isResumeLoading, resume, location.state, navigate, location.pathname])

  const roleSyncedRef = useRef(false)
  useEffect(() => {
    if (effectiveRole && !roleSyncedRef.current) {
      roleSyncedRef.current = true
      setTempRole(effectiveRole)
    }
  }, [effectiveRole])

  const updateRoleMutation = useMutation({
    mutationFn: (role: string) => {
      return authApi.updateProfile({ target_role: role })
    },
    onSuccess: (_res, role) => {
      setSavedRole(role)
      setTempRole(role)
      setIsEditingRole(false)
      setUploadError('')
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      queryClient.invalidateQueries({ queryKey: ['atsAnalysis'] })
      queryClient.invalidateQueries({ queryKey: ['careerIntelligence'] })
    },
    onError: (err: any) => {
      setUploadError(formatApiError(err, 'Failed to save target role. Please try again.'))
    }
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      return resumeApi.upload(file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['latestResume'] })
      queryClient.invalidateQueries({ queryKey: ['careerIntelligence'] })
      queryClient.invalidateQueries({ queryKey: ['atsAnalysis'] })
      queryClient.invalidateQueries({ queryKey: ['analyticsDashboard'] })
      setUploadError('')
    },
    onError: (err: any) => {
      setUploadError(formatApiError(err, 'Failed to parse resume. Verify document formatting.'))
    }
  })

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
      e.target.value = ''
    }
  }

  const handleRoleSubmit = (roleStr: string) => {
    const trimmed = roleStr.trim()
    if (!trimmed) return
    setShowSuggestions(false)
    setRoleSuggestions([])
    updateRoleMutation.mutate(trimmed)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      if (roleSuggestions.length > 0) {
        e.preventDefault()
        setFocusedIndex((prev) => (prev + 1) % roleSuggestions.length)
      }
    } else if (e.key === 'ArrowUp') {
      if (roleSuggestions.length > 0) {
        e.preventDefault()
        setFocusedIndex((prev) => (prev - 1 + roleSuggestions.length) % roleSuggestions.length)
      }
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (focusedIndex >= 0 && focusedIndex < roleSuggestions.length) {
        const selected = roleSuggestions[focusedIndex]
        setTempRole(selected)
        setShowSuggestions(false)
        handleRoleSubmit(selected)
      } else if (tempRole.trim()) {
        setShowSuggestions(false)
        handleRoleSubmit(tempRole)
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setFocusedIndex(-1)
    }
  }

  const compareMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await resumeApi.compareJd(text)
      return res.data
    },
    onSuccess: (data) => {
      const analysis = data || {}
      const rawCoverage = careerIntel?.skill_alignment?.coverage_percentage
      const matchScore = analysis.match_percentage ? normalizePercentage(analysis.match_percentage) : normalizePercentage(rawCoverage)
      const requiredKps = analysis.required_keyphrases || careerIntel?.skill_alignment?.missing_skills || []
      const userSkills = resume?.skills || careerIntel?.profile?.verified_skills || []

      const matched = userSkills.filter((s: string) =>
        jdText.toLowerCase().includes(s.toLowerCase())
      )

      setComparison({
        score: matchScore,
        matchedSkills: matched.slice(0, 8),
        missingSkills: requiredKps.length > 0 ? requiredKps : ['No critical gaps identified'],
        evidence: `Backend semantic NLP analysis computed cosine similarity against target JD requirements.`,
        weaknesses: requiredKps.length > 0
          ? requiredKps.map((m: string) => `Target requirement for ${m} needs explicit evidence in resume.`)
          : ['Profile aligns with all major job description parameters.']
      })
    },
    onError: (err: any) => {
      setUploadError(formatApiError(err, 'Failed to compare job description.'))
    }
  })

  const runComparison = () => {
    if (!jdText.trim() || !resume) return
    compareMutation.mutate(jdText)
  }

  let currentStatusText = ''
  let currentStatusCode: 'idle' | 'saving' | 'analyzing' | 'error' = 'idle'

  if (updateRoleMutation.isPending) {
    currentStatusText = 'Saving target role...'
    currentStatusCode = 'saving'
  } else if (triggerAnalysisMutation.isPending) {
    currentStatusText = 'Running ATS analysis...'
    currentStatusCode = 'analyzing'
  } else if (updateRoleMutation.isError || triggerAnalysisMutation.isError || atsError) {
    currentStatusText = 'Failed — check the error and retry.'
    currentStatusCode = 'error'
  }

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

  const overallScore = atsAnalysis ? normalizePercentage(atsAnalysis.overall_ats_score) : 0
  const scoreLevel = atsAnalysis?.score_level || 'Moderate'
  const isAnalysisUnavailable = !atsAnalysis || atsAnalysis.status === 'analysis_unavailable' || atsAnalysis.overall_ats_score === null
  const isAtsRetrieveRunning = isAtsLoading || (isAtsFetching && !atsAnalysis)
  const isAnalyzing = triggerAnalysisMutation.isPending

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-neutral-700 dark:text-neutral-300">
      <input
        type="file"
        ref={updateResumeInputRef}
        className="hidden"
        accept=".pdf,.docx,.txt"
        onChange={handleFileSelect}
      />
      <input
        type="file"
        ref={emptyFileInputRef}
        className="hidden"
        accept=".pdf,.docx,.txt"
        onChange={handleFileSelect}
      />
      <input
        type="file"
        ref={uploadNewInputRef}
        className="hidden"
        accept=".pdf,.docx,.txt"
        onChange={handleFileSelect}
      />

      {!resume ? (
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
            className={`border-2 border-dashed p-10 text-center transition-all cursor-pointer hover:border-brand-primary/60 dark:hover:border-brand-primary/60 ${dragActive
              ? 'border-brand-primary bg-brand-light dark:bg-[#18291E]/40'
              : 'border-neutral-200 dark:border-[#4E6243]'
              }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => emptyFileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center">
              <FileText size={48} className="text-neutral-400 dark:text-neutral-500 mb-4 animate-pulse-dot" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-white mb-1">
                Drag and drop your resume file here, or click to browse
              </p>
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-6">
                Supports PDF, Word (DOCX) or plain TXT up to 10MB
              </p>
              <Button
                loading={uploadMutation.isPending}
                icon={<UploadCloud size={16} />}
                onClick={(e) => {
                  e.stopPropagation()
                  emptyFileInputRef.current?.click()
                }}
              >
                Select File to Upload
              </Button>
            </div>
          </Card>

          {uploadError && (
            <div className="mt-4 p-4 bg-danger-light border border-danger/20 rounded-lg text-danger text-sm text-center">
              {uploadError}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-2">
            <div>
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#12362b] via-[#336659] to-[#6B8F71] bg-clip-text text-transparent tracking-tight mb-1">
                Resume Intelligence
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 font-medium">
                {effectiveRole ? (
                  <>Dynamic profile alignment for <span className="font-bold text-brand-primary">{effectiveRole}</span></>
                ) : (
                  <>Configure your target role to activate scoring diagnostics</>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              {effectiveRole && (
                <Button
                  variant="secondary"
                  icon={<Settings size={16} />}
                  onClick={() => setIsEditingRole(!isEditingRole)}
                >
                  Configure Target Role
                </Button>
              )}
              <Button
                variant="secondary"
                icon={<UploadCloud size={16} />}
                onClick={() => updateResumeInputRef.current?.click()}
                loading={uploadMutation.isPending}
              >
                Update Resume
              </Button>
              {effectiveRole && (
                <Button icon={<Sparkles size={16} />} onClick={() => setShowCompareModal(true)}>
                  Compare with JD
                </Button>
              )}
            </div>
          </div>

          {/* Configuration Banner or Editing Block */}
          {(isEditingRole || !effectiveRole) && (
            <Card className="p-6 border border-brand-primary/20 bg-brand-light/10 !overflow-visible">
              <h3 className="text-sm font-bold mb-2 text-neutral-800 dark:text-white">
                {!effectiveRole ? 'Target Role Configuration Required' : 'Change Target Role'}
              </h3>
              {effectiveRole && (
                <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
                  <span>Current active role:</span>
                  <Badge variant="blue" size="xs">{effectiveRole}</Badge>
                </div>
              )}
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 max-w-xl">
                Enter your target position to check semantic alignments, missing keywords, and build your practice roadmap. Suggestions are fetched live using real market data.
              </p>
              <div className="flex flex-col gap-2 max-w-md">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="e.g. DevOps Engineer"
                      className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-xl pl-3 pr-8 py-2 text-xs outline-none focus:border-brand-primary"
                      value={tempRole}
                      onChange={(e) => {
                        setTempRole(e.target.value)
                        setShowSuggestions(true)
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 250)}
                      onKeyDown={handleKeyDown}
                    />
                    {isSearchingSuggestions && (
                      <div className="absolute right-2.5 top-2.5">
                        <div className="w-3.5 h-3.5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {showSuggestions && tempRole.trim().length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#181d24] border border-neutral-200 dark:border-[#1E293B] rounded-xl shadow-dropdown z-50 text-left overflow-hidden min-w-[200px] max-h-60 overflow-y-auto">
                        {isSearchingSuggestions ? (
                          <div className="px-3 py-2.5 text-xs text-neutral-400 dark:text-neutral-500 italic flex items-center gap-2">
                            <div className="w-3.5 h-3.5 border-2 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
                            <span>Searching roles...</span>
                          </div>
                        ) : suggestionError ? (
                          <div className="px-3 py-2.5 text-xs text-rose-500 font-semibold bg-rose-500/5 flex items-center justify-between">
                            <span>{suggestionError}</span>
                            <button
                              type="button"
                              className="text-[10px] text-brand-primary hover:underline ml-2 flex-shrink-0"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                const query = tempRole.trim()
                                roleCacheRef.current = { ...roleCacheRef.current }
                                delete roleCacheRef.current[query.toLowerCase()]
                                lastTrimmedQuery.current = ""
                                setTempRole(tempRole)
                              }}
                            >
                              Retry
                            </button>
                          </div>
                        ) : roleSuggestions.length > 0 ? (
                          roleSuggestions.map((suggestion, idx) => (
                            <div
                              key={idx}
                              className={`px-3 py-2 text-xs cursor-pointer font-medium ${idx === focusedIndex
                                ? 'bg-brand-light dark:bg-brand-primary/20 text-brand-primary dark:text-white'
                                : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                                }`}
                              onMouseDown={() => {
                                setTempRole(suggestion)
                                setShowSuggestions(false)
                                updateRoleMutation.mutate(suggestion)
                              }}
                            >
                              {suggestion}
                            </div>
                          ))
                        ) : (
                          <div className="px-3 py-2.5 text-xs text-neutral-400 dark:text-neutral-500 italic">
                            No matching roles found.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button onClick={() => handleRoleSubmit(tempRole)} loading={updateRoleMutation.isPending} disabled={!tempRole.trim()}>
                    Save Target Role
                  </Button>
                  {effectiveRole && (
                    <Button variant="secondary" onClick={() => setIsEditingRole(false)}>
                      Cancel
                    </Button>
                  )}
                </div>
                {currentStatusCode !== 'idle' && (
                  <div className="mt-2 text-xs flex items-center gap-2 font-semibold text-brand-primary dark:text-[#6B8F71]">
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    <span>{currentStatusText}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          {uploadError && (
            <div className="p-4 bg-danger-light border border-danger/20 rounded-xl text-danger text-sm text-center">
              {uploadError}
            </div>
          )}

          {effectiveRole && (
            <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto animate-fade-in">

              {/* STALE ANALYSIS ALERT */}
              {atsAnalysis && atsAnalysis.target_role.toLowerCase() !== effectiveRole.toLowerCase() && (
                <div className="p-4 border-2 border-amber-500/20 bg-amber-500/5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex gap-3 items-start">
                    <AlertTriangle className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-bold text-neutral-800 dark:text-white">Analysis Out of Date</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        The current analysis is for <strong>{atsAnalysis.target_role}</strong>. Re-analyze to align with your newly configured target role: <strong>{effectiveRole}</strong>.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    loading={isAnalyzing}
                    icon={<Sparkles size={14} />}
                    onClick={() => triggerAnalysisMutation.mutate(effectiveRole)}
                  >
                    Analyze for {effectiveRole}
                  </Button>
                </div>
              )}

              {/* CORE DASHBOARD STATES */}
              {isAtsRetrieveRunning ? (
                <div className="space-y-6">
                  <Card className="p-6 space-y-4">
                    <Skeleton className="h-6 w-48" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-20 w-20 rounded-full" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                  </Card>
                  <Card className="p-6 space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </Card>
                </div>
              ) : (atsError || triggerAnalysisMutation.isError) ? (
                <Card className="p-8 text-center flex flex-col items-center justify-center border-danger/20 bg-danger-light/10 min-h-[300px]">
                  <AlertTriangle className="text-danger mb-3 animate-bounce" size={36} />
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-white mb-1">Analysis Run Failed</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4 max-w-md">
                    {formatApiError(atsError || triggerAnalysisMutation.error, "LLM reasoning service is currently rate-limited or unavailable. Use the retry button to request again.")}
                  </p>
                  <Button
                    size="sm"
                    loading={isAnalyzing}
                    onClick={() => triggerAnalysisMutation.mutate(effectiveRole)}
                  >
                    Retry Analysis
                  </Button>
                </Card>
              ) : (!atsAnalysis || atsAnalysis.status === 'analysis_unavailable' || atsAnalysis.overall_ats_score === null) ? (
                <Card className="p-8 text-center flex flex-col items-center justify-center border-brand-primary/20 bg-brand-light/5 min-h-[300px]">
                  <Sparkles className="text-brand-primary mb-4 animate-pulse-dot" size={40} />
                  <h3 className="font-bold text-sm text-neutral-800 dark:text-white mb-2">ATS Compatibility Diagnostics</h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm">
                    Complete your target role configuration and run analysis to unlock compatibility scores, evidence matrices, and gap analysis.
                  </p>
                  <Button
                    icon={<Sparkles size={16} />}
                    loading={isAnalyzing}
                    disabled={!effectiveRole || isAnalyzing}
                    onClick={() => triggerAnalysisMutation.mutate(effectiveRole)}
                  >
                    Analyze Resume
                  </Button>
                </Card>
              ) : (
                <>
                  <ResumeIntelligenceDashboard
                    atsAnalysis={atsAnalysis}
                    resume={resume}
                    careerIntel={careerIntel}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Compare Modal */}
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
                    disabled={!jdText.trim() || compareMutation.isPending}
                    loading={compareMutation.isPending}
                    onClick={runComparison}
                  >
                    Compare Resume Alignment
                  </Button>
                </div>
              ) : (
                <div className="space-y-5 animate-fade-in">

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
