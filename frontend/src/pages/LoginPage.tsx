import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { Zap, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/authStore'

const schema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    try {
      setError('')
      const loginRes = await authApi.login(data.email, data.password)
      const token = loginRes.data.access_token
      
      // Temporary token set to allow authApi.me() interceptor to use it
      setAuth({
        id: 0,
        email: data.email,
        is_active: true,
        created_at: new Date().toISOString()
      }, token)
      
      const meRes = await authApi.me()
      setAuth(meRes.data, token)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid credentials. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-bg-surface border-r border-bg-border relative overflow-hidden flex-col justify-between p-12">
        <div className="absolute inset-0 bg-gradient-radial from-accent/10 via-transparent to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent to-violet flex items-center justify-center">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold text-text-primary">A.C.E.</span>
          </div>
          <h1 className="text-4xl font-bold text-text-primary leading-tight mb-4">
            Your AI-Powered<br />
            <span className="gradient-text">Career Operating System</span>
          </h1>
          <p className="text-text-muted text-lg leading-relaxed">
            Multi-agent intelligence that analyzes your profile, identifies gaps, and drives smarter career decisions.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-4">
          {[
            '🎯 Resume Intelligence & JD Matching',
            '🏢 Company Research & Hiring Trends',
            '🗺️ Personalized Career Roadmaps',
            '🤖 AI Mock Interviews & Coaching',
          ].map((f) => (
            <div key={f} className="flex items-center gap-3 text-sm text-text-secondary">
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-text-primary">Welcome back</h2>
            <p className="text-text-muted text-sm mt-1">Sign in to your A.C.E. account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input {...register('email')} type="email" placeholder="you@example.com" className="input pl-10" />
              </div>
              {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                <input {...register('password')} type={showPwd ? 'text' : 'password'} placeholder="••••••••" className="input pl-10 pr-10" />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
            </div>

            {error && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm">
                {error}
              </div>
            )}

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-text-muted mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-accent hover:text-accent-hover font-medium">Create one</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
