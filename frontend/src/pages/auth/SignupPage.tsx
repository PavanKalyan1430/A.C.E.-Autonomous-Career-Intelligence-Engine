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
  password: z.string().min(6, 'Minimum 6 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: 'Passwords do not match', path: ['confirm'] })
type FormData = z.infer<typeof schema>

export default function SignupPage() {
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
      // Bypass database register & login calls entirely
      setAuth({
        id: 1,
        email: data.email,
        is_active: true,
        created_at: new Date().toISOString()
      }, "dummy-bypass-token")
      navigate('/dashboard')
    } catch {
      setError('Registration failed. This email may already exist.')
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="flex items-center gap-2.5 mb-8">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-violet flex items-center justify-center">
            <Zap size={17} className="text-white" />
          </div>
          <span className="text-lg font-bold text-text-primary">A.C.E.</span>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-text-primary">Create your account</h2>
          <p className="text-text-muted text-sm mt-1">Start your AI career journey today</p>
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
              <input {...register('password')} type={showPwd ? 'text' : 'password'} placeholder="Min 6 characters" className="input pl-10 pr-10" />
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input {...register('confirm')} type={showPwd ? 'text' : 'password'} placeholder="Re-enter password" className="input pl-10" />
            </div>
            {errors.confirm && <p className="text-danger text-xs mt-1">{errors.confirm.message}</p>}
          </div>

          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm">{error}</div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center py-3">
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover font-medium">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}
