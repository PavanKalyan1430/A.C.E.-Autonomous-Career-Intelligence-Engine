import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User, Loader2, Sparkles, Zap } from 'lucide-react'
import { agentApi } from '@/api'

interface Message { role: 'user' | 'assistant'; content: string; agent?: string }

const SUGGESTIONS = [
  'Should I apply to Observe.ai?',
  'What skills am I missing for an AI Engineer role?',
  'Create a 6-week learning roadmap for me.',
  'How do I prepare for a System Design interview at Google?',
  'Which companies best match my profile?',
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I\'m A.C.E., your Autonomous Career Intelligence Engine. Ask me anything about your career, skills, target companies, or interview prep. I\'ll use multi-agent reasoning to give you the most accurate guidance.', agent: 'orchestrator' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const sendMessage = async (text?: string) => {
    const msg = text ?? input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)
    try {
      const res = await agentApi.query(msg)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        agent: res.data.current_agent,
      }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I encountered an issue connecting to the agent system. Make sure the backend is running and your API keys are configured.',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col animate-fade-in -m-8 p-0">
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-5 border-b border-bg-border bg-bg-surface flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-violet flex items-center justify-center">
          <Zap size={17} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary">A.C.E. Assistant</p>
          <p className="text-xs text-text-muted">Multi-agent career intelligence • Powered by Gemini</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse-slow" />
          <span className="text-xs text-text-muted">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 
                ${msg.role === 'assistant' ? 'bg-gradient-to-br from-accent to-violet' : 'bg-bg-elevated border border-bg-border'}`}>
                {msg.role === 'assistant'
                  ? <Bot size={15} className="text-white" />
                  : <User size={15} className="text-text-muted" />}
              </div>

              {/* Bubble */}
              <div className={`max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                {msg.agent && msg.role === 'assistant' && (
                  <span className="badge-accent text-[10px]">
                    <Sparkles size={9} /> {msg.agent.replace('_', ' ')}
                  </span>
                )}
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
                  ${msg.role === 'user'
                    ? 'bg-accent text-white rounded-tr-sm'
                    : 'bg-bg-elevated border border-bg-border text-text-primary rounded-tl-sm'}`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}

          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-violet flex items-center justify-center">
                <Bot size={15} className="text-white" />
              </div>
              <div className="bg-bg-elevated border border-bg-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <Loader2 size={13} className="text-accent animate-spin" />
                  <span className="text-xs text-text-muted">Agents processing your query...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-8 pb-3">
          <p className="text-xs text-text-muted mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="text-xs bg-bg-elevated border border-bg-border text-text-secondary hover:border-accent/40 hover:text-text-primary px-3 py-1.5 rounded-xl transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-8 pb-6 pt-2 flex-shrink-0">
        <div className="flex gap-3 bg-bg-elevated border border-bg-border rounded-2xl p-2 focus-within:border-accent/50 transition-all">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Ask about your career, skills, companies, or interview prep..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none px-2"
          />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="w-9 h-9 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 flex items-center justify-center flex-shrink-0 transition-all">
            <Send size={15} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
