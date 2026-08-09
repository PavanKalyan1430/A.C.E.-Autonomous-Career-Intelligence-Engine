import { useState } from 'react'
import { motion } from 'framer-motion'
import { MessageSquare, Play, ChevronRight, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

const MOCK_QUESTIONS = [
  'Design a URL shortener like bit.ly that handles 100M daily requests.',
  'How would you optimize a slow SQL query in a high-traffic application?',
  'Explain the trade-offs between REST and GraphQL APIs.',
]

export default function InterviewsPage() {
  const [mode, setMode] = useState<'home' | 'mock'>('home')
  const [qIdx, setQIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState<null | { score: number; strength: string; improvements: string[] }>(null)
  const [loading, setLoading] = useState(false)

  const evaluateAnswer = () => {
    setLoading(true)
    setTimeout(() => {
      setFeedback({
        score: answer.split(' ').length > 20 ? 78 : 45,
        strength: 'Shows conceptual understanding of the core problem.',
        improvements: [
          'Use the STAR framework — Situation, Task, Action, Result.',
          'Include scalability trade-offs and specific numbers.',
          'Discuss failure modes and how you would handle them.',
        ],
      })
      setLoading(false)
    }, 1500)
  }

  const nextQuestion = () => {
    setQIdx(prev => (prev + 1) % MOCK_QUESTIONS.length)
    setAnswer('')
    setFeedback(null)
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Interview Preparation</h1>
        <p className="page-subtitle">AI-powered mock interviews with real-time evaluation and coaching.</p>
      </div>

      {mode === 'home' && (
        <div className="grid grid-cols-3 gap-4">
          {/* Start mock */}
          <motion.div onClick={() => setMode('mock')}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="card col-span-1 cursor-pointer border-accent/20 hover:border-accent/50 hover:bg-accent/5 transition-all text-center py-8">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Play size={24} className="text-accent" />
            </div>
            <p className="text-base font-bold text-text-primary">Start Mock Interview</p>
            <p className="text-xs text-text-muted mt-2">AI-generated questions with live evaluation</p>
            <span className="badge-accent mt-4 inline-flex">Begin Session</span>
          </motion.div>

          {/* Question bank */}
          <div className="card col-span-2">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
              <MessageSquare size={15} className="text-violet" /> Company-Specific Questions
            </h3>
            <div className="space-y-3">
              {[
                { company: 'Google', topic: 'System Design', q: 'Design Google Drive — storage, sync, and sharing.' },
                { company: 'Stripe', topic: 'Backend', q: 'How do you design a payment retry mechanism with idempotency?' },
                { company: 'Observe.ai', topic: 'ML Systems', q: 'Explain how you would deploy a real-time speech-to-text model at scale.' },
              ].map((item, i) => (
                <div key={i} className="p-4 bg-bg-elevated rounded-xl border border-bg-border">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="badge-accent text-[10px]">{item.company}</span>
                    <span className="badge-muted text-[10px]">{item.topic}</span>
                  </div>
                  <p className="text-sm text-text-primary">{item.q}</p>
                  <button onClick={() => setMode('mock')} className="btn-ghost text-xs mt-2">
                    Practice <ChevronRight size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === 'mock' && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <span className="badge-accent">Question {qIdx + 1} / {MOCK_QUESTIONS.length}</span>
            <button onClick={() => setMode('home')} className="btn-ghost text-xs">Exit</button>
          </div>

          <div className="card border-accent/20 bg-accent/5">
            <p className="text-base font-medium text-text-primary leading-relaxed">{MOCK_QUESTIONS[qIdx]}</p>
          </div>

          <div>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)}
              placeholder="Type your answer here... Use STAR format: Situation → Task → Action → Result"
              className="input min-h-[160px] resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={evaluateAnswer} disabled={!answer || loading} className="btn-primary flex-1 justify-center">
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? 'Evaluating...' : 'Submit Answer'}
            </button>
            <button onClick={nextQuestion} className="btn-secondary">Next Question</button>
          </div>

          {feedback && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              <div className="card flex items-center gap-4">
                <div className="text-4xl font-bold text-accent">{feedback.score}</div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">Score / 100</p>
                  <p className="text-xs text-text-muted">{feedback.strength}</p>
                </div>
                <div className={`ml-auto w-10 h-10 rounded-full flex items-center justify-center ${feedback.score >= 70 ? 'bg-success/10' : 'bg-warning/10'}`}>
                  {feedback.score >= 70 ? <CheckCircle2 className="text-success" size={20} /> : <AlertCircle className="text-warning" size={20} />}
                </div>
              </div>
              <div className="card">
                <p className="text-xs font-semibold text-warning mb-3">Areas for Improvement</p>
                <div className="space-y-2">
                  {feedback.improvements.map((imp, i) => (
                    <div key={i} className="flex gap-2 text-xs text-text-secondary">
                      <ChevronRight size={13} className="text-warning flex-shrink-0 mt-0.5" /> {imp}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}
