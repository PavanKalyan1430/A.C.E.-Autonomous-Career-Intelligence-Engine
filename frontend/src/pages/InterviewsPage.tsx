import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { interviewApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ProgressBar } from '@/components/ui/ProgressBar'
import {
  Mic,
  MicOff,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  AlertTriangle,
  Lightbulb,
  X,
  Compass,
  CheckCircle,
  HelpCircle,
  Clock,
  Play,
  Pause,
  ChevronRight,
  Volume2,
  ChevronLeft,
  ChevronUp
} from 'lucide-react'

// Define Interview stages
type InterviewState = 'setup' | 'live' | 'results'

interface FeedbackReport {
  overall_score: number
  strengths: string
  areas_for_improvement: string[]
}

export default function InterviewsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [appState, setAppState] = useState<InterviewState>('setup')
  
  // Setup fields
  const [roleTitle, setRoleTitle] = useState(user?.profile?.target_role || '')
  const [companyName, setCompanyName] = useState('')
  const [difficulty, setDifficulty] = useState('Medium')
  const [techStack, setTechStack] = useState('')

  // Live session state
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [questions, setQuestions] = useState<string[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  
  // Recording & timer state
  const [isRecording, setIsRecording] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [userTypedAnswer, setUserTypedAnswer] = useState('')
  const [voicePace, setVoicePace] = useState<'idle' | 'listening' | 'transcribing' | 'analyzing' | 'completed'>('idle')
  
  // Real-time metadata for completed questions
  const [liveFeedback, setLiveFeedback] = useState<{
    wpm: number | null
    fillerRatio: number
    suggestions: string[]
    score: number | null
  } | null>(null)

  // Report results state
  const [report, setReport] = useState<FeedbackReport | null>(null)

  const timerRef = useRef<any>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])

  // Stopwatch timer logic
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(p => p + 1)
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isRecording])

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
    const secs = totalSec % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // start session mutation
  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await interviewApi.start({
        role_title: roleTitle,
        company_name: companyName,
        tech_stack_or_jd: techStack,
        difficulty: difficulty
      })
      return res.data
    },
    onSuccess: (data) => {
      setSessionId(data.session_id)
      setQuestions(data.questions)
      setCurrentIdx(0)
      setLiveFeedback(null)
      setAppState('live')
      setVoicePace('idle')
    }
  })

  // submit answer mutation
  const submitAnswerMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!sessionId || questions.length === 0) return
      setVoicePace('analyzing')
      const res = await interviewApi.submitAnswer({
        session_id: sessionId,
        question_index: currentIdx,
        question: questions[currentIdx],
        user_answer: text,
        speech_duration_seconds: timerSeconds > 0 ? timerSeconds : undefined
      })
      return res.data
    },
    onSuccess: (data) => {
      if (!data) return
      setLiveFeedback({
        wpm: data.wpm_speech_pace,
        fillerRatio: data.filler_word_ratio,
        suggestions: data.suggestions || [],
        score: data.evaluation_score
      })
      setUserTypedAnswer('')
      setTimerSeconds(0)
      setVoicePace('completed')
    }
  })

  // submit audio answer mutation
  const submitAudioAnswerMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setVoicePace('transcribing')
      const res = await interviewApi.submitAudioAnswer(formData)
      return res.data
    },
    onSuccess: (data) => {
      if (!data) return
      setLiveFeedback({
        wpm: data.wpm_speech_pace,
        fillerRatio: data.filler_word_ratio,
        suggestions: data.suggestions || [],
        score: data.evaluation_score
      })
      setVoicePace('completed')
    },
    onError: () => {
      setVoicePace('idle')
    }
  })

  // finish mutation
  const finishMutation = useMutation({
    mutationFn: async () => {
      if (!sessionId) return
      const res = await interviewApi.finish({ session_id: sessionId })
      return res.data
    },
    onSuccess: (data) => {
      if (!data) return
      setReport({
        overall_score: data.overall_score,
        strengths: data.strengths,
        areas_for_improvement: data.areas_for_improvement || []
      })
      setAppState('results')
    }
  })

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
      setIsRecording(false)
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mediaRecorder = new MediaRecorder(stream)
        mediaRecorderRef.current = mediaRecorder
        audioChunksRef.current = []

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data)
          }
        }

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          stream.getTracks().forEach(track => track.stop())
          
          if (!sessionId || questions.length === 0) return
          
          const formData = new FormData()
          formData.append('session_id', String(sessionId))
          formData.append('question_index', String(currentIdx))
          formData.append('question', questions[currentIdx])
          formData.append('audio_file', audioBlob, 'answer.webm')
          
          submitAudioAnswerMutation.mutate(formData)
        }

        mediaRecorder.start()
        setIsRecording(true)
        setLiveFeedback(null)
        setVoicePace('listening')
        setTimerSeconds(0)
      } catch (err) {
        console.error('Failed to access microphone', err)
        alert('Could not access microphone. Please check permissions or use text input.')
      }
    }
  }

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(p => p + 1)
      setLiveFeedback(null)
      setVoicePace('idle')
    } else {
      finishMutation.mutate()
    }
  }

  const handleSubmitTextAnswer = () => {
    if (!userTypedAnswer.trim() || submitAnswerMutation.isPending) return
    submitAnswerMutation.mutate(userTypedAnswer)
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animate-fade-in text-neutral-700 dark:text-neutral-300">
      
      {/* ── STATE 1: SETUP FORM ─────────────────────────────────────────────── */}
      {appState === 'setup' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mb-1">
              <span className="bg-gradient-to-r from-[#0D2B1D] via-[#10B981] via-[#336659] to-[#047857] bg-clip-text text-transparent">
                Mock Interview Studio
              </span>
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 font-medium">Practice for your next technical round with ACE's Whisper-Whisper loop.</p>
          </div>

          <Card className="max-w-xl mx-auto p-8 space-y-6 shadow-elevated border border-neutral-200 dark:border-[#1E293B]">
            <h2 className="text-base font-bold text-[#3d3d3d] dark:text-white pb-3 border-b border-neutral-100 dark:border-neutral-800">
              Configure Interview Session
            </h2>

            <div className="space-y-4 text-xs font-semibold">
              {/* Role Title */}
              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">Target Role</label>
                <input 
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-lg p-3 outline-none focus:border-brand-primary"
                />
              </div>

              {/* Company */}
              <div>
                <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">Company</label>
                <input 
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-lg p-3 outline-none focus:border-brand-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Difficulty */}
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">Difficulty</label>
                  <select 
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-lg p-3 outline-none font-semibold"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                {/* Tech context */}
                <div>
                  <label className="block text-2xs uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">Core Tech Stack</label>
                  <input 
                    type="text"
                    value={techStack}
                    onChange={(e) => setTechStack(e.target.value)}
                    className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-lg p-3 outline-none focus:border-brand-primary"
                  />
                </div>
              </div>
            </div>

            <Button 
              fullWidth 
              loading={startMutation.isPending}
              icon={<Play size={16} />}
              onClick={() => startMutation.mutate()}
            >
              Start Practice Session
            </Button>
          </Card>
        </div>
      )}

      {/* ── STATE 2: LIVE STUDIO ─────────────────────────────────────────────── */}
      {appState === 'live' && questions.length > 0 && (
        <div className="space-y-6">
          
          {/* Header */}
          <div className="flex justify-between items-center bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] p-4 rounded-xl shadow-sm">
            <div>
              <span className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">{companyName} Interview Loop</span>
              <h2 className="text-sm font-bold text-[#3d3d3d] dark:text-white leading-tight mt-0.5">{roleTitle} Role</h2>
            </div>
            <Badge variant="blue">Question {currentIdx + 1} of {questions.length}</Badge>
          </div>

          {/* Core Immersive Prompt */}
          <Card className="text-center p-8 border-2 border-brand-primary/10 bg-gradient-to-br from-white to-brand-sage/5 dark:from-[#0D1117] dark:to-[#18291E]/30 relative overflow-hidden">
            <span className="text-[10px] font-bold text-brand-primary uppercase tracking-widest block mb-4">Prompt Question</span>
            <p className="text-md md:text-lg font-bold text-[#3d3d3d] dark:text-white leading-relaxed max-w-2xl mx-auto">
              "{questions[currentIdx]}"
            </p>
          </Card>

          {/* Voice speaking waveform controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            
            {/* Audio Recording Card */}
            <Card className="md:col-span-2 flex flex-col justify-between items-center py-8 px-6 min-h-[300px]">
              <div className="text-center">
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Voice answer uploader</span>
                <div className="text-2xl font-bold font-mono text-[#3d3d3d] dark:text-white mt-2">
                  {formatTimer(timerSeconds)}
                </div>
              </div>

              {/* Central Mic control */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={toggleRecording}
                  disabled={submitAnswerMutation.isPending || submitAudioAnswerMutation.isPending}
                  className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${
                    isRecording 
                      ? 'bg-danger border-transparent text-white animate-pulse' 
                      : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-[#1E293B] text-brand-primary hover:border-brand-primary/40 shadow-elevated'
                  }`}
                  title={isRecording ? "Stop Recording" : "Start Speaking"}
                >
                  {isRecording ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
                
                <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  voicePace === 'listening' || voicePace === 'transcribing' || voicePace === 'analyzing' ? 'text-danger' : 'text-neutral-400'
                }`}>
                  {(voicePace === 'listening' || voicePace === 'transcribing' || voicePace === 'analyzing') && <span className="w-1.5 h-1.5 rounded-full bg-danger animate-ping" />}
                  {voicePace === 'listening' ? 'Listening' : voicePace === 'transcribing' ? 'Transcribing...' : voicePace === 'analyzing' ? 'Analyzing...' : 'Ready'}
                </span>
              </div>

              <div className="w-full pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center">
                <p className="text-[10px] text-neutral-400 leading-relaxed max-w-xs mx-auto">
                  SOTA Zero-Disk audio processing. Audio remains in memory buffer and is purged on transcription.
                </p>
              </div>
            </Card>

            {/* Fallback Text area editor */}
            <Card className="md:col-span-1 flex flex-col justify-between p-5">
              <div>
                <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider block mb-3">Text Answer Override</span>
                <textarea
                  value={userTypedAnswer}
                  onChange={(e) => setUserTypedAnswer(e.target.value)}
                  rows={6}
                  placeholder="Type your explanation answer here if microphone access is blocked..."
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-[#1E293B] rounded-lg p-2.5 text-xs outline-none focus:border-brand-primary"
                />
              </div>

              <Button 
                fullWidth 
                size="sm"
                loading={submitAnswerMutation.isPending}
                disabled={!userTypedAnswer.trim()}
                onClick={handleSubmitTextAnswer}
              >
                Submit Explanation
              </Button>
            </Card>

          </div>

          {/* Live Feedback Diagnostics Block */}
          {liveFeedback && (
            <Card className="border-t-4 border-t-[#0891B2] animate-slide-up">
              <h3 className="text-2xs font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#0891B2]" /> Diagnostic results
              </h3>
              
              <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                <div>
                  <div className="text-md font-bold text-[#3d3d3d] dark:text-white">
                    {liveFeedback.wpm ? `${liveFeedback.wpm} WPM` : '—'}
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Speed</span>
                </div>
                <div>
                  <div className="text-md font-bold text-[#3d3d3d] dark:text-white">
                    {Math.round(liveFeedback.fillerRatio * 100)}%
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Filler Words</span>
                </div>
                <div>
                  <div className="text-md font-bold text-[#3d3d3d] dark:text-white">
                    {liveFeedback.score ? `${liveFeedback.score}/100` : '—'}
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">Response Score</span>
                </div>
              </div>

              {/* Suggestions */}
              {liveFeedback.suggestions.length > 0 && (
                <div className="space-y-1.5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                  <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">Suggestions</span>
                  <ul className="list-disc pl-4 text-2xs text-neutral-500 dark:text-neutral-400 space-y-1 leading-normal font-medium">
                    {liveFeedback.suggestions.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          )}

          {/* Action Row */}
          <div className="flex justify-between items-center pt-2">
            <Button variant="ghost" onClick={() => setAppState('setup')}>Quit</Button>
            <Button 
              disabled={voicePace !== 'completed'}
              onClick={handleNextQuestion}
              iconRight={<ChevronRight size={16} />}
            >
              {currentIdx + 1 === questions.length ? 'Finish Interview' : 'Next Question'}
            </Button>
          </div>

        </div>
      )}

      {/* ── STATE 3: RESULTS REPORT ─────────────────────────────────────────── */}
      {appState === 'results' && report && (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-heading font-bold text-[#3d3d3d] dark:text-white tracking-tight mb-1">Interview Results</h1>
            <p className="text-neutral-600 dark:text-neutral-400 font-medium">Diagnostic evaluation report of your {roleTitle} loop.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            
            {/* Health Score metrics */}
            <Card className="md:col-span-1 flex flex-col justify-center items-center text-center p-8">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-4">Overall Score</span>
              <div className="w-32 h-32 rounded-full border-4 border-brand-primary flex items-center justify-center flex-shrink-0">
                <span className="text-metric font-bold text-brand-primary leading-none">{report.overall_score}</span>
              </div>
            </Card>

            {/* Score breakdowns */}
            <Card className="md:col-span-2 p-6 space-y-4">
              <h3 className="text-xs font-bold text-[#3d3d3d] dark:text-white pb-2 border-b border-neutral-100 dark:border-neutral-800">Diagnostic Breakdowns</h3>
              
              <div className="space-y-3 font-semibold text-xs">
                <div>
                  <div className="flex justify-between text-2xs mb-1">
                    <span>Technical Depth</span>
                    <span className="text-brand-primary font-bold">{Math.min(Math.round(report.overall_score * 0.95), 100)}%</span>
                  </div>
                  <ProgressBar value={Math.min(Math.round(report.overall_score * 0.95), 100)} variant="blue" />
                </div>
                <div>
                  <div className="flex justify-between text-2xs mb-1">
                    <span>Communication Clarity</span>
                    <span className="text-brand-primary font-bold">{Math.min(Math.round(report.overall_score * 1.05), 100)}%</span>
                  </div>
                  <ProgressBar value={Math.min(Math.round(report.overall_score * 1.05), 100)} variant="blue" />
                </div>
                <div>
                  <div className="flex justify-between text-2xs mb-1">
                    <span>STAR Structure Format</span>
                    <span className="text-brand-primary font-bold">{report.overall_score}%</span>
                  </div>
                  <ProgressBar value={report.overall_score} variant="blue" />
                </div>
              </div>
            </Card>

          </div>

          {/* Strengths & Weaknesses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card className="border-t-4 border-t-brand-primary">
              <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-brand-primary" /> Key Strengths
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed font-medium">
                {report.strengths}
              </p>
            </Card>

            {/* Improvement Areas */}
            <Card className="border-t-4 border-t-amber-500">
              <h3 className="text-2xs font-bold text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-500" /> Areas for Improvement
              </h3>
              <ul className="list-disc pl-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-1.5 leading-relaxed font-medium">
                {report.areas_for_improvement.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Action shortcut panel */}
          <div className="flex justify-between items-center pt-4">
            <Button variant="ghost" onClick={() => setAppState('setup')}>Start Another Session</Button>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => navigate('/skills')}>Practice Weak Area</Button>
              <Button icon={<Sparkles size={16} />} onClick={() => navigate('/career')}>Ask ACE for Feedback</Button>
            </div>
          </div>

        </div>
      )}

    </div>
  )
}
