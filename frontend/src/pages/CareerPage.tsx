import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentApi, memoryApi, resumeApi, analyticsApi, careerApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Sparkles,
  Send,
  Mic,
  Plus,
  Trash2,
  Brain,
  MessageSquare,
  Target,
  User,
  TrendingUp,
  Briefcase,
  Menu,
  X,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  BookOpen,
  Zap,
  BarChart2,
  PanelLeftClose,
  PanelLeftOpen,
  Square,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: number
  session_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  agent_name: string
  meta_data: Record<string, any>
  created_at: string
}

interface ChatSession {
  id: number
  user_id: number
  title: string
  created_at: string
  updated_at: string
  messages: ChatMessage[]
}

interface SessionHeader {
  id: number
  title: string
  created_at: string
  updated_at: string
}

// ─── Markdown Renderer Component ──────────────────────────────────────────────

/**
 * Renders assistant message content as proper Markdown.
 * Uses react-markdown + remark-gfm for full GFM support.
 * Scoped with ace-prose class for typography control.
 */
function AceMarkdown({ content }: { content: string }) {
  return (
    <div className="ace-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={{
        // Code block: teal-tinted surface, monospace, overflow scroll
        code({ node, className, children, ...props }) {
          const isBlock = !!(props as any).inline === false
          const match = /language-(\w+)/.exec(className || '')
          if (isBlock || match) {
            return (
              <div className="ace-code-block">
                {match && (
                  <div className="ace-code-lang">{match[1]}</div>
                )}
                <code className={className} {...props}>
                  {children}
                </code>
              </div>
            )
          }
          return (
            <code className="ace-inline-code" {...props}>
              {children}
            </code>
          )
        },
        // Tables: responsive scroll wrapper
        table({ children }) {
          return (
            <div className="ace-table-wrapper">
              <table>{children}</table>
            </div>
          )
        },
        // Links: open in new tab, brand color
        a({ children, href }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="ace-link">
              {children}
            </a>
          )
        },
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  )
}

// ─── Session Timestamp Helper ─────────────────────────────────────────────────

function formatSessionTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

// ─── Score Semantic Label Helper ──────────────────────────────────────────────

/**
 * Returns the correct semantic label for the score value.
 * career_score in the dashboard comes from ATS analysis (overall_ats_score)
 * OR interview average — whichever is available.
 * When careerIntel.readiness_score is present, it takes precedence.
 */
function getScoreLabel(
  readinessScore: number | null | undefined,
  careerScore: number | null | undefined
): { label: string; value: number | null } {
  if (readinessScore != null && readinessScore > 0) {
    return { label: 'Career Readiness', value: Math.round(readinessScore) }
  }
  if (careerScore != null && careerScore > 0) {
    return { label: 'Career Readiness', value: Math.round(careerScore) }
  }
  return { label: 'Career Readiness', value: null }
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CareerPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()

  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [inputText, setInputText] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [contextOpen, setContextOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ── Data Fetching ────────────────────────────────────────────────────────────

  const { data: sessions, isLoading: isSessionsLoading } = useQuery({
    queryKey: ['chatSessions'],
    queryFn: async () => {
      const res = await agentApi.listSessions()
      return res.data as SessionHeader[]
    },
  })

  const { data: activeSession, isLoading: isSessionDetailLoading } = useQuery({
    queryKey: ['chatSessionDetail', activeSessionId],
    queryFn: async () => {
      if (!activeSessionId) return null
      const res = await agentApi.getSessionDetail(activeSessionId)
      return res.data as ChatSession
    },
    enabled: activeSessionId !== null,
  })

  const { data: memories } = useQuery({
    queryKey: ['userMemories'],
    queryFn: async () => {
      const res = await memoryApi.getAll()
      return res.data
    },
  })

  const { data: resume } = useQuery({
    queryKey: ['latestResume'],
    queryFn: async () => {
      const res = await resumeApi.getLatest()
      return res.data
    },
    retry: false,
  })

  const { data: dashboardData } = useQuery({
    queryKey: ['analyticsDashboard'],
    queryFn: async () => {
      const res = await analyticsApi.getDashboard()
      return res.data
    },
    retry: false,
  })

  const { data: careerIntel } = useQuery({
    queryKey: ['careerIntelligence'],
    queryFn: async () => {
      const res = await careerApi.getIntelligence()
      return res.data
    },
    retry: false,
  })

  // ── Speech Recognition (Mic Feature) ──────────────────────────────────────────
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.')
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        let transcript = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript
        }
        if (transcript.trim()) {
          setInputText(transcript.trim())
        }
      }

      recognition.onerror = () => {
        setIsListening(false)
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch {
      setIsListening(false)
    }
  }

  // ── Abort Controller for Stop Generation ──────────────────────────────────────
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    chatMutation.reset()
  }

  // ── Mutations ────────────────────────────────────────────────────────────────

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      const res = await agentApi.query(message, activeSessionId || undefined, {
        signal: controller.signal,
      })
      return res.data
    },
    onSuccess: (data) => {
      abortControllerRef.current = null
      setInputText('')
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] })
      queryClient.invalidateQueries({ queryKey: ['chatSessionDetail', data.session_id] })
      setActiveSessionId(data.session_id)
    },
    onError: (err: any) => {
      abortControllerRef.current = null
    },
  })

  const deleteSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      await agentApi.deleteSession(id)
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] })
      if (activeSessionId === deletedId) setActiveSessionId(null)
    },
  })

  // ── Effects ──────────────────────────────────────────────────────────────────

  // Auto-send prompt from navigation state (e.g. "Ask A.C.E." from SkillsPage)
  const initialPromptSent = useRef(false)
  useEffect(() => {
    const statePrompt = (location.state as any)?.initialPrompt
    if (statePrompt && !initialPromptSent.current) {
      initialPromptSent.current = true
      chatMutation.mutate(statePrompt)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate, location.pathname, chatMutation])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages, chatMutation.isPending])

  // ── Derived State ────────────────────────────────────────────────────────────

  const hasResume = !!resume
  const targetRole =
    careerIntel?.skill_alignment?.target_role || user?.profile?.target_role || ''
  const hasTargetRole = !!targetRole
  const hasGaps = (careerIntel?.prioritized_gaps || []).length > 0
  const hasInterviews = (dashboardData?.overview?.completed_interviews || 0) > 0
  const hasApplications = (dashboardData?.overview?.active_applications || 0) > 0

  // Contextual action chips — built from real data, not hardcoded
  const suggestedPrompts: string[] = []
  if (!hasResume) {
    suggestedPrompts.push('How do I upload my resume to ACE?')
  } else if (!hasTargetRole) {
    suggestedPrompts.push('What target roles align with my background?')
  } else {
    suggestedPrompts.push(`Explain my career readiness score for ${targetRole}`)
    if (hasGaps) {
      suggestedPrompts.push(`What is my highest-impact skill gap for ${targetRole}?`)
    }
    suggestedPrompts.push(`What should I learn first for ${targetRole}?`)
  }
  if (hasInterviews) {
    suggestedPrompts.push('What are my weakest interview areas?')
  } else {
    suggestedPrompts.push(`Prepare me for a ${targetRole || 'technical'} interview`)
  }
  if (hasApplications) {
    suggestedPrompts.push('Which of my applications should I prioritize?')
  }
  if (hasResume && hasTargetRole) {
    suggestedPrompts.push('Show me my strongest skills')
  }

  // Ensure we have at least 4 sensible prompts
  const fallbacks = [
    'Analyze my resume for engineering roles',
    'What skills am I missing for my target role?',
    'Help me craft a learning plan',
    'What is hurting my role match score?',
  ]
  let fi = 0
  while (suggestedPrompts.length < 4 && fi < fallbacks.length) {
    if (!suggestedPrompts.includes(fallbacks[fi])) {
      suggestedPrompts.push(fallbacks[fi])
    }
    fi++
  }

  // Context panel values — from authoritative backend data only
  const parsedSkillsCount = resume?.skills?.length || 0
  const extractedTargetRole = targetRole || null
  const { label: scoreLabel, value: scoreValue } = getScoreLabel(
    careerIntel?.readiness_score,
    dashboardData?.overview?.career_score
  )
  const roleMatchPct =
    careerIntel?.skill_alignment?.coverage_percentage != null
      ? Math.round(careerIntel.skill_alignment.coverage_percentage)
      : null
  const topGap = careerIntel?.prioritized_gaps?.[0]?.skill ?? null
  const nextAction = careerIntel?.next_best_action?.recommended_action ?? null

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleSend = () => {
    const textToSend = inputText.trim()
    if (!textToSend || chatMutation.isPending) return
    setInputText('')
    chatMutation.mutate(textToSend)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startNewChat = () => {
    setActiveSessionId(null)
    setInputText('')
    setSidebarOpen(false)
  }

  const handlePromptClick = (promptText: string) => {
    if (chatMutation.isPending) return
    setInputText('')
    chatMutation.mutate(promptText)
  }

  const hasActiveMessages =
    (activeSession?.messages?.length ?? 0) > 0 || chatMutation.isPending

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-80px)] -m-8 relative overflow-hidden bg-[#FAF9F6] text-[#3d3d3d]">

      {/* ══ SESSION HISTORY SIDEBAR ══════════════════════════════════════════ */}
      <aside
        className={`bg-white flex flex-col z-30 transition-all duration-300 ease-in-out flex-shrink-0 ${
          sidebarOpen
            ? 'w-60 opacity-100 border-r border-[#E8E4DB] relative'
            : 'w-0 opacity-0 overflow-hidden border-none pointer-events-none'
        }`}
      >
        {/* Sidebar Header */}
        <div className="px-4 py-3 border-b border-[#E8E4DB] flex items-center justify-between min-w-[240px]">
          <span className="font-semibold text-xs tracking-tight flex items-center gap-1.5 text-[#3d3d3d]">
            <MessageSquare size={14} className="text-[#336659]" />
            Conversations
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={startNewChat}
              className="p-1.5 hover:bg-[#F3EFE8] rounded-md text-[#336659] transition-colors"
              title="New conversation"
              aria-label="Start new conversation"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 hover:bg-[#F3EFE8] rounded-md text-[#6B8F71] hover:text-[#336659] transition-colors"
              title="Hide sidebar"
              aria-label="Hide conversation sidebar"
            >
              <PanelLeftClose size={15} />
            </button>
          </div>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {isSessionsLoading ? (
            <div className="p-2 space-y-1.5">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="w-8 h-8 rounded-lg bg-[#F3EFE8] flex items-center justify-center mb-2.5">
                <MessageSquare size={14} className="text-[#6B8F71]" />
              </div>
              <p className="text-[11px] text-[#6B8F71] font-medium leading-relaxed">
                No conversations yet.
                <br />
                Ask ACE something to begin.
              </p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id)
                }}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                  activeSessionId === session.id
                    ? 'bg-[#F3EFE8] text-[#336659]'
                    : 'hover:bg-[#FAF9F6] text-[#3d3d3d]'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setActiveSessionId(session.id)}
                aria-label={`Open conversation: ${session.title}`}
                aria-current={activeSessionId === session.id ? 'true' : undefined}
              >
                <div className="flex-1 min-w-0 pr-1.5">
                  <p className="text-xs font-medium truncate leading-tight">
                    {session.title}
                  </p>
                  <p className="text-[10px] text-[#6B8F71] mt-0.5">
                    {formatSessionTime(session.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSessionMutation.mutate(session.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-400 transition-all flex-shrink-0"
                  title="Delete conversation"
                  aria-label={`Delete conversation: ${session.title}`}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* ══ MAIN CONVERSATION WORKSPACE ════════════════════════════════════════ */}
      <section className="flex-1 flex flex-col h-full bg-[#FAF9F6] relative min-w-0">

        {/* Workspace header */}
        <header className="h-13 border-b border-[#E8E4DB] px-5 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-1.5 hover:bg-[#F3EFE8] rounded-md text-[#336659] transition-colors"
              title={sidebarOpen ? "Hide conversation panel" : "Show conversation panel"}
              aria-label="Toggle session sidebar"
            >
              {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
            </button>
          </div>

          <button
            onClick={() => setContextOpen((prev) => !prev)}
            className="p-1.5 hover:bg-[#F3EFE8] rounded text-[#6B8F71] hover:text-[#336659] flex items-center gap-1.5 text-xs font-semibold transition-colors"
            aria-label="Toggle career context panel"
          >
            <Brain size={15} />
            <span className="hidden sm:inline">Context</span>
          </button>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {!hasActiveMessages ? (
            /* ── EMPTY STATE: ACE Context-Aware Landing ─────────────────── */
            <div className="h-full flex flex-col items-center justify-center max-w-xl mx-auto py-6">

              {/* ACE Identity Header */}
              <div className="flex items-center gap-3.5 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#336659] flex items-center justify-center flex-shrink-0 p-2 shadow-sm">
                  <img src="/ace-symbol.svg" alt="A.C.E." className="w-7 h-7 object-contain" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                    <span className="bg-gradient-to-r from-[#0D2B1D] via-[#10B981] via-[#336659] to-[#047857] bg-clip-text text-transparent">
                      A.C.E. Career Intelligence
                    </span>
                  </h1>
                </div>
              </div>

              {/* What ACE can help with */}
              <div className="w-full bg-white border border-[#E8E4DB] rounded-xl p-4 mb-5">
                <p className="text-[10px] font-bold text-[#6B8F71] uppercase tracking-widest mb-3">
                  ACE is ready to help you
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: BarChart2, text: 'Understand your career score' },
                    { icon: Target, text: 'Identify skill gaps' },
                    { icon: BookOpen, text: 'Decide what to learn next' },
                    { icon: Zap, text: 'Prepare for interviews' },
                  ].map(({ icon: Icon, text }) => (
                    <div
                      key={text}
                      className="flex items-center gap-2 p-2.5 bg-[#FAF9F6] rounded-lg"
                    >
                      <Icon size={13} className="text-[#336659]" />
                      <span className="text-[11px] font-medium text-[#3d3d3d] leading-tight">
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Contextual Action Chips */}
              <div className="w-full space-y-2">
                <p className="text-[10px] font-bold text-[#6B8F71] uppercase tracking-widest mb-2">
                  Suggested actions
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {suggestedPrompts.slice(0, 4).map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => handlePromptClick(prompt)}
                      className="ace-prompt-chip group"
                      disabled={chatMutation.isPending}
                    >
                      <span className="flex-1 text-left">{prompt}</span>
                      <ChevronRight
                        size={13}
                        className="text-[#6B8F71] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            /* ── CONVERSATION STREAM ─────────────────────────────────────── */
            <>
              {activeSession?.messages?.map((message) => {
                const isUser = message.role === 'user'
                const isError =
                  message.meta_data &&
                  (message.meta_data.status === 'execution_limit_exceeded' ||
                    message.meta_data.status === 'error')

                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 max-w-3xl items-start ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden ${
                        isUser
                          ? 'bg-[#336659]'
                          : isError
                          ? 'bg-amber-500'
                          : 'bg-[#336659] p-1.5'
                      }`}
                      aria-hidden="true"
                    >
                      {isUser ? (
                        <User size={13} className="text-white" />
                      ) : isError ? (
                        <AlertCircle size={13} className="text-white" />
                      ) : (
                        <img src="/ace-symbol.svg" alt="A.C.E." className="w-5 h-5 object-contain" />
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Role label */}
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#6B8F71]">
                        {isUser ? 'You' : isError ? 'System Notice' : 'A.C.E.'}
                      </p>

                      {/* Bubble */}
                      <div
                        className={`rounded-xl px-4 py-3 border ${
                          isUser
                            ? 'bg-[#336659] text-white border-transparent'
                            : isError
                            ? 'bg-amber-50 text-[#252A27] border-amber-200'
                            : 'bg-[#F3EFE8] text-[#252A27] border-[#E8E4DB]'
                        }`}
                        role="article"
                        aria-label={isUser ? 'Your message' : 'ACE response'}
                      >
                        {isUser ? (
                          /* User messages: plain text, no Markdown */
                          <p className="text-sm leading-[1.6] font-normal whitespace-pre-wrap break-words">
                            {message.content}
                          </p>
                        ) : (
                          /* Assistant messages: full Markdown render */
                          <AceMarkdown content={message.content} />
                        )}

                        {/* Error retry */}
                        {isError && (
                          <div className="mt-3 pt-3 border-t border-amber-200 flex items-center gap-2.5">
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={() => {
                                const idx = activeSession.messages.indexOf(message)
                                for (let i = idx - 1; i >= 0; i--) {
                                  if (activeSession.messages[i].role === 'user') {
                                    chatMutation.mutate(activeSession.messages[i].content)
                                    break
                                  }
                                }
                              }}
                              disabled={chatMutation.isPending}
                            >
                              <RefreshCw size={11} className="mr-1.5" />
                              Retry
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Thinking Indicator */}
              {chatMutation.isPending && (
                <div className="flex gap-3 max-w-3xl items-start">
                  <div className="w-8 h-8 rounded-lg bg-[#336659] flex items-center justify-center flex-shrink-0 mt-0.5 p-1.5">
                    <img src="/ace-symbol.svg" alt="A.C.E." className="w-4 h-4 object-contain animate-pulse" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="ai-pulse bg-[#6B8F71]" />
                        <span className="text-[10px] text-[#6B8F71] font-bold uppercase tracking-wider">
                          Analyzing your career profile...
                        </span>
                      </div>
                      <button
                        onClick={handleStopGeneration}
                        className="text-xs font-semibold text-[#336659] hover:text-[#18291E] flex items-center gap-1 px-2 py-0.5 rounded border border-[#E8E4DB] bg-white transition-colors shadow-2xs cursor-pointer"
                        title="Stop response generation"
                      >
                        <Square size={10} className="fill-current text-[#336659]" />
                        <span>Stop</span>
                      </button>
                    </div>
                    <div className="bg-[#F3EFE8] border border-[#E8E4DB] rounded-xl px-4 py-3 space-y-2">
                      <Skeleton className="h-3 w-full bg-[#E8E4DB]" />
                      <Skeleton className="h-3 w-4/5 bg-[#E8E4DB]" />
                      <Skeleton className="h-3 w-3/5 bg-[#E8E4DB]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* ── Contextual Follow-Up Chips ─────────────────────────────────── */}
        {hasActiveMessages && !chatMutation.isPending && (
          <div className="px-5 py-2 flex gap-2 overflow-x-auto border-t border-[#E8E4DB]/60 bg-white flex-shrink-0">
            <button
              onClick={() =>
                handlePromptClick(
                  hasTargetRole
                    ? `Analyze my skill gaps for ${targetRole}`
                    : 'Analyze my skill gaps'
                )
              }
              className="ace-chip"
              disabled={chatMutation.isPending}
            >
              <Target size={11} />
              Analyze Skill Gaps
            </button>
            <button
              onClick={() =>
                handlePromptClick(
                  hasTargetRole
                    ? `What is my career readiness score for ${targetRole}?`
                    : 'Explain my career readiness score'
                )
              }
              className="ace-chip"
              disabled={chatMutation.isPending}
            >
              <TrendingUp size={11} />
              Career Score
            </button>
            <button
              onClick={() => handlePromptClick('What memory do you have about me?')}
              className="ace-chip"
              disabled={chatMutation.isPending}
            >
              <Brain size={11} />
              View Memory
            </button>
            {hasTargetRole && (
              <button
                onClick={() =>
                  handlePromptClick(`What should I learn next for ${targetRole}?`)
                }
                className="ace-chip"
                disabled={chatMutation.isPending}
              >
                <BookOpen size={11} />
                Learning Path
              </button>
            )}
          </div>
        )}

        {/* ── Composer ─────────────────────────────────────────────────────── */}
        <div className="p-4 border-t border-[#E8E4DB] bg-white flex-shrink-0">
          <div
            className="max-w-3xl mx-auto flex items-end gap-2.5 bg-[#FAF9F6] rounded-xl border border-[#E8E4DB] p-2 focus-within:border-[#336659] focus-within:ring-1 focus-within:ring-[#336659]/20 transition-all"
          >
            <textarea
              id="ace-chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={isListening ? "Listening to your voice..." : "Ask ACE about your career..."}
              className={`flex-1 bg-transparent border-none outline-none resize-none px-3 py-2 text-sm text-[#252A27] max-h-36 ${
                isListening ? 'placeholder-rose-500 font-medium' : 'placeholder-[#6B8F71]/60'
              }`}
              aria-label="Chat input"
              disabled={chatMutation.isPending}
            />

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 rounded-lg transition-all flex items-center justify-center cursor-pointer ${
                  isListening
                    ? 'bg-rose-500 text-white animate-pulse shadow-md ring-2 ring-rose-300'
                    : 'text-[#336659] hover:bg-[#F3EFE8] hover:text-[#18291E]'
                }`}
                title={isListening ? "Listening... Click to stop" : "Voice input (Speech-to-text)"}
                aria-label={isListening ? "Stop listening" : "Start voice input"}
                disabled={chatMutation.isPending}
              >
                <Mic size={15} className={isListening ? 'animate-bounce' : ''} />
              </button>

              {chatMutation.isPending ? (
                <button
                  id="ace-stop-button"
                  onClick={handleStopGeneration}
                  className="p-2 bg-[#18291E] hover:bg-black text-white rounded-lg transition-all active:scale-[0.97] flex items-center justify-center shadow-xs cursor-pointer"
                  title="Stop generation"
                  aria-label="Stop generation"
                >
                  <Square size={14} className="fill-current text-white" />
                </button>
              ) : (
                <button
                  id="ace-send-button"
                  onClick={handleSend}
                  disabled={!inputText.trim()}
                  className="p-2 bg-[#336659] disabled:opacity-40 text-white rounded-lg transition-all hover:bg-[#1f493d] active:scale-[0.97] cursor-pointer"
                  aria-label="Send message"
                >
                  <Send size={15} />
                </button>
              )}
            </div>
          </div>
          <p className="text-[10px] text-[#6B8F71] text-center mt-2 font-medium">
            Enter to send · Shift+Enter for new line
          </p>
        </div>
      </section>

      {/* Mobile context overlay */}
      {contextOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 lg:hidden"
          onClick={() => setContextOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ══ RIGHT CONTEXT PANEL ═════════════════════════════════════════════ */}
      <aside
        className={`w-60 bg-white border-l border-[#E8E4DB] p-4 flex flex-col gap-5 z-30 transition-transform duration-300 lg:static absolute top-0 bottom-0 right-0 flex-shrink-0 overflow-y-auto ${
          contextOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        aria-label="Career context panel"
      >
        {/* Mobile close button */}
        <div className="flex justify-between items-center lg:hidden">
          <span className="font-bold text-xs text-[#252A27]">Career Context</span>
          <button
            onClick={() => setContextOpen(false)}
            className="p-1 hover:bg-[#F3EFE8] rounded"
            aria-label="Close context panel"
          >
            <X size={15} />
          </button>
        </div>

        {/* Target Role */}
        <div>
          <p className="ace-context-label">Target Role</p>
          <div className="flex items-center gap-2 p-2.5 bg-[#FAF9F6] border border-[#E8E4DB] rounded-lg">
            <Briefcase size={13} className="text-[#336659] flex-shrink-0" />
            <span className="text-xs font-semibold text-[#252A27] truncate">
              {extractedTargetRole ?? 'Not configured'}
            </span>
          </div>
        </div>

        {/* Career Readiness Score */}
        <div>
          <p className="ace-context-label">{scoreLabel}</p>
          <div className="p-2.5 bg-[#FAF9F6] border border-[#E8E4DB] rounded-lg">
            {scoreValue != null ? (
              <>
                <div className="flex items-end justify-between mb-1.5">
                  <span className="text-[22px] font-bold text-[#336659] leading-none">
                    {scoreValue}
                  </span>
                  <span className="text-xs text-[#6B8F71] font-medium">/ 100</span>
                </div>
                <div className="w-full h-1.5 bg-[#E8E4DB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#336659] rounded-full transition-all"
                    style={{ width: `${Math.min(scoreValue, 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-[#6B8F71]">
                <AlertCircle size={12} />
                <span>Not analyzed yet</span>
              </div>
            )}
          </div>
        </div>

        {/* Role Match (coverage_percentage) */}
        {roleMatchPct != null && (
          <div>
            <p className="ace-context-label">Role Match</p>
            <div className="p-2.5 bg-[#FAF9F6] border border-[#E8E4DB] rounded-lg">
              <div className="flex items-end justify-between mb-1.5">
                <span className="text-[22px] font-bold text-[#6B8F71] leading-none">
                  {roleMatchPct}
                </span>
                <span className="text-xs text-[#6B8F71] font-medium">%</span>
              </div>
              <div className="w-full h-1.5 bg-[#E8E4DB] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6B8F71] rounded-full transition-all"
                  style={{ width: `${Math.min(roleMatchPct, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Resume Context */}
        <div>
          <p className="ace-context-label">Resume</p>
          {hasResume ? (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center px-2.5 py-2 bg-[#FAF9F6] border border-[#E8E4DB] rounded-lg">
                <span className="text-[11px] text-[#6B8F71] font-medium">Skills extracted</span>
                <span className="text-xs font-bold text-[#252A27]">{parsedSkillsCount}</span>
              </div>
              <div className="flex justify-between items-center px-2.5 py-2 bg-[#FAF9F6] border border-[#E8E4DB] rounded-lg">
                <span className="text-[11px] text-[#6B8F71] font-medium">Projects</span>
                <span className="text-xs font-bold text-[#252A27]">
                  {resume?.projects?.length || 0}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 p-2.5 bg-[#FAF9F6] border border-[#E8E4DB] rounded-lg text-xs text-[#6B8F71]">
              <AlertCircle size={12} />
              No resume uploaded
            </div>
          )}
        </div>

        {/* Top Gap */}
        <div>
          <p className="ace-context-label">Top Skill Gap</p>
          <div className="p-2.5 bg-[#FAF9F6] border border-[#E8E4DB] rounded-lg">
            {topGap ? (
              <span className="text-xs font-semibold text-[#252A27]">{topGap}</span>
            ) : (
              <span className="text-xs text-[#6B8F71]">Not analyzed yet</span>
            )}
          </div>
        </div>

        {/* Next Best Action */}
        {nextAction && (
          <div>
            <p className="ace-context-label">Next Action</p>
            <div className="p-2.5 bg-[#E3EFD3] border border-[#6B8F71]/20 rounded-lg">
              <p className="text-[11px] font-medium text-[#1f493d] leading-relaxed">{nextAction}</p>
            </div>
          </div>
        )}

        {/* Agent Memory */}
        <div className="flex-1 flex flex-col justify-end min-h-0">
          <div className="border-t border-[#E8E4DB] pt-4">
            <p className="ace-context-label flex items-center gap-1.5">
              <Brain size={12} className="text-[#6B8F71]" /> Agent Memory
            </p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {!memories || memories.length === 0 ? (
                <p className="text-[11px] text-[#6B8F71] leading-relaxed">
                  No memories saved. Ask ACE to analyze your profile.
                </p>
              ) : (
                memories.slice(0, 4).map((mem: any) => (
                  <div
                    key={mem.id}
                    className="p-2 bg-[#E3EFD3]/50 border border-[#6B8F71]/15 rounded-lg text-[10px] font-medium text-[#1f493d] leading-normal"
                  >
                    {mem.memory_text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
