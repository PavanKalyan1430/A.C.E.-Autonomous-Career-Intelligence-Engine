import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { agentApi, memoryApi, resumeApi, analyticsApi, careerApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Skeleton } from '@/components/ui/Skeleton'
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Plus,
  Trash2,
  Brain,
  MessageSquare,
  Award,
  Target,
  Clock,
  User,
  ArrowRight,
  TrendingUp,
  Map,
  Lightbulb,
  Menu,
  X,
  Briefcase
} from 'lucide-react'

// Render specialized capability card if message content matches certain patterns

export default function CareerPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null)
  const [inputText, setInputText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Fetch all chat sessions
  const { data: sessions, isLoading: isSessionsLoading } = useQuery({
    queryKey: ['chatSessions'],
    queryFn: async () => {
      const res = await agentApi.listSessions()
      return res.data
    }
  })

  // 2. Fetch active session messages
  const { data: activeSession, isLoading: isSessionDetailLoading } = useQuery({
    queryKey: ['chatSessionDetail', activeSessionId],
    queryFn: async () => {
      if (!activeSessionId) return null
      const res = await agentApi.getSessionDetail(activeSessionId)
      return res.data
    },
    enabled: activeSessionId !== null
  })

  // 3. Fetch user memories to populate context panel
  const { data: memories } = useQuery({
    queryKey: ['userMemories'],
    queryFn: async () => {
      const res = await memoryApi.getAll()
      return res.data
    }
  })

  // 4. Fetch resume parser details to enrich context panel
  const { data: resume } = useQuery({
    queryKey: ['latestResume'],
    queryFn: async () => {
      const res = await resumeApi.getLatest()
      return res.data
    },
    retry: false
  })

  // Fetch dashboard analytics for dynamic career score in context panel
  const { data: dashboardData } = useQuery({
    queryKey: ['analyticsDashboard'],
    queryFn: async () => {
      const res = await analyticsApi.getDashboard()
      return res.data
    },
    retry: false
  })

  // Fetch career intelligence for target role & alignment context
  const { data: careerIntel } = useQuery({
    queryKey: ['careerIntelligence'],
    queryFn: async () => {
      const res = await careerApi.getIntelligence()
      return res.data
    },
    retry: false
  })

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages, isSessionDetailLoading])

  // 5. Submit chat mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await agentApi.query(message, activeSessionId || undefined)
      return res.data
    },
    onSuccess: (data) => {
      setInputText('')
      // Invalidate queries to reload session list and active detail
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] })
      queryClient.invalidateQueries({ queryKey: ['chatSessionDetail', data.session_id] })
      setActiveSessionId(data.session_id)
    }
  })

  // 6. Delete session mutation
  const deleteSessionMutation = useMutation({
    mutationFn: async (id: number) => {
      await agentApi.deleteSession(id)
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['chatSessions'] })
      if (activeSessionId === deletedId) {
        setActiveSessionId(null)
      }
    }
  })

  const handleSend = () => {
    if (!inputText.trim() || chatMutation.isPending) return
    chatMutation.mutate(inputText)
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
    chatMutation.mutate(promptText)
  }

  const toggleRecording = () => {
    // Disabled: Voice input is not supported for Career Agent. Go to Mock Interview for real-time speech evaluation.
  }

  const hasResume = !!resume
  const targetRole = careerIntel?.skill_alignment?.target_role || user?.profile?.target_role || ''
  const hasTargetRole = !!targetRole
  const hasInterviews = (dashboardData?.overview?.completed_interviews || 0) > 0
  const hasApplications = (dashboardData?.overview?.active_applications || 0) > 0
  const hasGaps = (careerIntel?.prioritized_gaps || []).length > 0

  const suggestedPrompts: string[] = []
  if (!hasResume) {
    suggestedPrompts.push("How do I upload my resume?")
  } else {
    if (!hasTargetRole) {
      suggestedPrompts.push("What target roles align with my resume?")
    } else {
      suggestedPrompts.push(`Why is my match score for ${targetRole} ${dashboardData?.overview?.career_score ?? 0}%?`)
      if (hasGaps) {
        suggestedPrompts.push(`What is my highest-impact skill gap for ${targetRole}?`)
      }
    }
    if (hasInterviews) {
      suggestedPrompts.push("What are my weakest interview areas?")
    } else {
      suggestedPrompts.push("Start interview preparation")
    }
    if (hasApplications) {
      suggestedPrompts.push("Which application should I prioritize?")
    }
  }

  if (suggestedPrompts.length < 2) {
    suggestedPrompts.push("Analyze my resume for engineering roles")
    suggestedPrompts.push("What skills am I missing?")
  }

  // Render context data or fallback defaults
  const parsedSkillsCount = resume?.skills?.length || 0
  const extractedTargetRole = targetRole || 'Not Configured'

  return (
    <div className="flex h-[calc(100vh-80px)] -m-8 relative overflow-hidden bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300">
      
      {/* ── SESSION HISTORY SIDEBAR (Collapsible on Mobile) ───────────────── */}
      <aside className={`w-64 bg-white dark:bg-[#0D1117] border-r border-neutral-200 dark:border-[#1E293B] flex flex-col z-30 transition-transform duration-300 lg:static absolute top-0 bottom-0 left-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-4 border-b border-neutral-200 dark:border-[#1E293B] flex items-center justify-between">
          <span className="font-semibold text-sm tracking-tight flex items-center gap-1.5 dark:text-white">
            <MessageSquare size={16} className="text-brand-primary" /> Chat Sessions
          </span>
          <button onClick={startNewChat} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md text-brand-primary transition-colors" title="New Chat">
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {isSessionsLoading ? (
            <div className="space-y-2 p-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <div className="text-xs text-neutral-400 dark:text-neutral-500 text-center py-8">
              No sessions yet.
            </div>
          ) : (
            sessions.map((session: any) => (
              <div 
                key={session.id}
                onClick={() => {
                  setActiveSessionId(session.id)
                  setSidebarOpen(false)
                }}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  activeSessionId === session.id 
                    ? 'bg-brand-light dark:bg-[#18291E] text-brand-primary dark:text-white' 
                    : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                }`}
              >
                <span className="truncate pr-2">{session.title}</span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteSessionMutation.mutate(session.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded text-danger transition-all"
                  title="Delete Session"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Background Overlay for Mobile Sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── MAIN CHAT WORKSPACE ─────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-neutral-900 relative">
        
        {/* Workspace Sub Header */}
        <header className="h-14 border-b border-neutral-200 dark:border-[#1E293B] px-6 flex items-center justify-between bg-white dark:bg-[#0D1117] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded lg:hidden text-neutral-500">
              <Menu size={18} />
            </button>
            <div>
              <h2 className="font-bold text-sm text-[#3d3d3d] dark:text-white leading-tight">AI Career Agent</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="ai-pulse bg-brand-primary" />
                <span className="text-[10px] text-brand-primary font-semibold uppercase tracking-wider">ACE Copilot Online</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => setContextOpen(true)} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded lg:hidden text-neutral-500 flex items-center gap-1.5 text-xs font-semibold">
              <Brain size={16} /> Context
            </button>
          </div>
        </header>

        {/* Conversation Streams */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {(!activeSession || activeSession.messages.length === 0) && !chatMutation.isPending ? (
            // Landing state inside workspace
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-12">
              <div className="w-14 h-14 bg-brand-light dark:bg-brand-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-brand-primary/20">
                <Sparkles size={24} className="text-brand-primary" />
              </div>
              <h3 className="text-lg font-bold text-neutral-700 dark:text-white mb-2">
                Start a conversation with A.C.E.
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
                Query the autonomous coordinator about your skills match score, missing prerequisites in learning paths, target interview preparation, or target employer insights.
              </p>
              
              <div className="grid grid-cols-1 gap-3 w-full max-w-md">
                {suggestedPrompts.map((p, i) => (
                  <button 
                    key={i}
                    onClick={() => handlePromptClick(p)}
                    className="p-3 text-left bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-xl hover:border-brand-primary/40 dark:hover:border-brand-primary/40 text-xs font-medium transition-all shadow-card hover:shadow-sm"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeSession?.messages?.map((message: any) => {
                const isUser = message.role === 'user'
                const errorMeta = message.meta_data
                const isError = errorMeta && (errorMeta.status === 'execution_limit_exceeded' || errorMeta.status === 'error')
                
                return (
                  <div key={message.id} className={`flex gap-4 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}>
                    
                    {/* Role Avatar */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white font-bold text-xs ${
                      isUser ? 'bg-brand-primary' : (isError ? 'bg-amber-500' : 'bg-neutral-800')
                    }`}>
                      {isUser ? <User size={14} /> : <Sparkles size={14} className={isError ? 'text-white' : 'text-brand-ai'} />}
                    </div>
 
                    <div className="space-y-3 flex-1">
                      {/* Message Bubble Container */}
                      <div className={`p-4 rounded-xl text-xs leading-relaxed font-medium shadow-card border ${
                        isUser 
                          ? 'bg-brand-primary text-white border-transparent' 
                          : (isError 
                            ? 'bg-amber-50/50 dark:bg-amber-950/10 text-neutral-800 dark:text-neutral-300 border-amber-500/20' 
                            : 'bg-white dark:bg-[#0D1117] text-[#3d3d3d] dark:text-neutral-300 border-neutral-200 dark:border-[#1E293B]')
                      }`}>
                        <div className="whitespace-pre-line">{message.content}</div>
                        
                        {isError && (
                          <div className="mt-3 pt-3 border-t border-amber-500/20 flex items-center gap-3">
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
                              Retry Analysis
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Loader for active agent thinking cycles */}
              {chatMutation.isPending && (
                <div className="flex gap-4 max-w-3xl animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-neutral-800 flex items-center justify-center flex-shrink-0">
                    <Sparkles size={14} className="text-[#0891B2] animate-pulse-dot" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="ai-pulse bg-[#0891B2]" />
                      <span className="text-[10px] text-[#0891B2] font-bold uppercase tracking-wider">ACE is thinking...</span>
                    </div>
                    <div className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-xl p-4 space-y-2">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Suggested Prompt Chips (Disappear or shrink when session populated) */}
        {activeSession && activeSession.messages.length > 0 && (
          <div className="px-6 py-2 flex gap-2 overflow-x-auto border-t border-neutral-100 dark:border-[#1E293B]/40 bg-white dark:bg-[#0D1117] flex-shrink-0">
            <button 
              onClick={() => handlePromptClick("Check my skill alignment")}
              className="px-3 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] hover:border-brand-primary/40 rounded-full text-[11px] font-medium transition-all"
            >
              Analyze Skill Gap
            </button>
            <button 
              onClick={() => handlePromptClick("Analyze resume match score")}
              className="px-3 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] hover:border-brand-primary/40 rounded-full text-[11px] font-medium transition-all"
            >
              Check Matching Score
            </button>
            <button 
              onClick={() => handlePromptClick("Tell me what memory you saved")}
              className="px-3 py-1 bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] hover:border-brand-primary/40 rounded-full text-[11px] font-medium transition-all"
            >
              View Active Memory
            </button>
          </div>
        )}

        {/* Composer Controls */}
        <div className="p-4 border-t border-neutral-200 dark:border-[#1E293B] bg-white dark:bg-[#0D1117] flex-shrink-0">
          <div className="max-w-3xl mx-auto flex items-end gap-3 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-[#1E293B] p-2 focus-within:border-brand-primary focus-within:ring-1 focus-within:ring-brand-primary transition-all">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask ACE anything about your career..."
              className="flex-1 bg-transparent border-none outline-none resize-none px-3 py-2 text-xs text-neutral-800 dark:text-white placeholder-neutral-400 dark:placeholder-neutral-500 max-h-32"
            />
            
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button 
                disabled
                className="p-2 rounded-lg text-neutral-300 dark:text-neutral-600 cursor-not-allowed"
                title="Voice Input (Mock Interview Only)"
              >
                <Mic size={16} />
              </button>
              
              <button 
                onClick={handleSend}
                disabled={!inputText.trim() || chatMutation.isPending}
                className="p-2 bg-brand-primary disabled:opacity-40 text-white rounded-lg transition-all hover:bg-brand-hover active:scale-[0.98]"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 text-center mt-2 font-medium">
            Enter to send • Shift+Enter for new line
          </p>
        </div>
      </section>

      {/* ── RIGHT CONTEXT PANEL (Collapsible Drawer on Mobile) ───────────────── */}
      <aside className={`w-64 bg-white dark:bg-[#0D1117] border-l border-neutral-200 dark:border-[#1E293B] p-5 flex flex-col gap-6 z-30 transition-transform duration-300 lg:static absolute top-0 bottom-0 right-0 ${
        contextOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex justify-between items-center lg:hidden">
          <span className="font-semibold text-xs tracking-wide dark:text-white">ACE Context</span>
          <button onClick={() => setContextOpen(false)} className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded">
            <X size={16} />
          </button>
        </div>

        {/* Target Role */}
        <div>
          <h3 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Target Role</h3>
          <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-[#1E293B] rounded-lg">
            <Briefcase size={16} className="text-neutral-500" />
            <span className="text-xs font-semibold dark:text-white">{extractedTargetRole}</span>
          </div>
        </div>

        {/* Career Score */}
        <div>
          <h3 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Career Score</h3>
          <div className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-[#1E293B] rounded-lg">
            <span className="text-xs font-semibold dark:text-white">Overall score</span>
            <span className="text-base font-bold text-brand-primary">
              {dashboardData?.overview?.career_score && dashboardData.overview.career_score > 0
                ? `${dashboardData.overview.career_score} / 100`
                : 'Run analysis'}
            </span>
          </div>
        </div>

        {/* Extracted Stats */}
        <div>
          <h3 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2">Resume Context</h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between font-medium">
              <span className="text-neutral-500">Skills Extracted</span>
              <span className="dark:text-white">{parsedSkillsCount}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-neutral-500">Projects Done</span>
              <span className="dark:text-white">{resume?.projects?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Active Memories */}
        <div className="flex-1 flex flex-col justify-end min-h-0">
          <div className="border-t border-neutral-100 dark:border-neutral-800 pt-4">
            <h3 className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Brain size={14} className="text-[#0891B2]" /> Agent Memory
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {!memories || memories.length === 0 ? (
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 italic">
                  No memories saved. Ask ACE to analyze skills or remember constraints.
                </p>
              ) : (
                memories.slice(0, 3).map((mem: any) => (
                  <div key={mem.id} className="p-2 bg-[#0891B2]/5 border border-[#0891B2]/10 rounded-lg text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 leading-normal">
                    {mem.memory_text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Background Overlay for Mobile Context Panel */}
      {contextOpen && (
        <div 
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setContextOpen(false)}
        />
      )}

    </div>
  )
}
