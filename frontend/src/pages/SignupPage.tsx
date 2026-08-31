import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  Sparkles, 
  Target, 
  Building2, 
  Map, 
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  ArrowRight
} from 'lucide-react'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { formatApiError } from '@/utils/error'

const schema = z.object({
  email: z.string().email('Valid email address required'),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(128, 'Password must be at most 128 characters long'),
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
      await authApi.register(data.email, data.password)
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
      setError(formatApiError(err, 'Registration failed. This email may already exist.'))
    }
  }

  const features = [
    {
      icon: <Target size={18} className="text-brand-ai" />,
      title: 'Resume & JD Intelligence',
      desc: 'Semantic match scoring aligned to target role requirements and evidence',
    },
    {
      icon: <Building2 size={18} className="text-brand-ai" />,
      title: 'Live Company Research',
      desc: 'Real-time engineering tech stack analysis and candidate compatibility signals',
    },
    {
      icon: <Map size={18} className="text-brand-ai" />,
      title: 'Prerequisite Skill Maps',
      desc: 'Topological gap analysis charting your optimal career learning sequence',
    },
    {
      icon: <MessageSquare size={18} className="text-brand-ai" />,
      title: 'AI Voice Interview Studio',
      desc: 'Real-time technical interview coaching with instant communication diagnostics',
    },
  ]

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0D2B1D] flex flex-col lg:flex-row font-sans text-neutral-700 dark:text-neutral-200">
      
      {/* Left Panel — Brand Showcase */}
      <div className="lg:w-5/12 bg-[#0D2B1D] border-b lg:border-b-0 lg:border-r border-[#18291E] p-8 sm:p-12 flex flex-col justify-between relative overflow-hidden text-white">
        
        {/* Background Subtle Gradient & Grid Accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/10 via-transparent to-black/40 pointer-events-none" />
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header & Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3.5 mb-10 sm:mb-14">
            <img 
              src="/logo.png" 
              alt="A.C.E. Logo" 
              className="h-10 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(51,102,89,0.6)]"
            />
            <div className="flex flex-col leading-none">
              <h1 className="font-extrabold text-white text-2xl tracking-tight">A.C.E.</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#34B36F] mt-1">Career OS</p>
            </div>
          </div>

          {/* AI Active Indicator */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18291E] border border-[#345635] text-xs font-semibold text-[#AEC3B0] mb-6">
            <span className="ai-pulse" />
            <span>Autonomous Career Intelligence Framework</span>
          </div>

          {/* Main Hero Title */}
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight mb-4">
            Your AI-Powered<br />
            <span className="text-brand-ai">Career Operating System</span>
          </h2>
          <p className="text-[#AEC3B0] text-sm sm:text-base leading-relaxed max-w-lg mb-8">
            An integrated career engine connecting resume analytics, live company research, skill prerequisite roadmaps, and real-time interview coaching.
          </p>

          {/* Feature List */}
          <div className="space-y-4 max-w-lg">
            {features.map((f, i) => (
              <div key={i} className="flex items-start gap-3.5 p-3 rounded-xl bg-[#18291E]/60 border border-[#345635]/40 hover:bg-[#18291E] transition-all">
                <div className="p-2 rounded-lg bg-[#0D2B1D] border border-[#345635]/60 flex-shrink-0 mt-0.5">
                  {f.icon}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">{f.title}</h4>
                  <p className="text-xs text-[#AEC3B0] mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Metrics Bar */}
        <div className="relative z-10 pt-8 mt-8 border-t border-[#18291E] grid grid-cols-3 gap-4">
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-white">Full-Stack</span>
            <p className="text-[11px] text-[#AEC3B0] font-medium mt-0.5">Career Guidance</p>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-white">Real-Time</span>
            <p className="text-[11px] text-[#AEC3B0] font-medium mt-0.5">Voice Feedback</p>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-extrabold text-white">Private</span>
            <p className="text-[11px] text-[#AEC3B0] font-medium mt-0.5">Secure Processing</p>
          </div>
        </div>
      </div>

      {/* Right Panel — Signup Form */}
      <div className="lg:w-7/12 flex items-center justify-center p-6 sm:p-12 bg-neutral-50 dark:bg-[#0D2B1D]">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-md"
        >
          {/* Card Container */}
          <div className="bg-white dark:bg-[#0D1117] border border-neutral-200 dark:border-[#1E293B] rounded-2xl shadow-elevated p-8 sm:p-10 relative overflow-hidden border-t-4 border-t-brand-primary">
            
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={20} className="text-brand-primary" />
                <h3 className="text-2xl font-extrabold text-neutral-800 dark:text-white tracking-tight">
                  Create your account
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                Get started with your personalized AI career workspace
              </p>
            </div>

            {/* Error Alert Box */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-6 p-3.5 bg-danger/10 border border-danger/20 rounded-xl text-danger text-xs font-medium flex items-start gap-2.5"
              >
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-danger" />
                <span className="leading-snug">{error}</span>
              </motion.div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              
              {/* Email Address */}
              <div>
                <label className="block text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Email address
                </label>
                <div className="relative rounded-xl border border-neutral-200 dark:border-[#1E293B] bg-white dark:bg-[#18291E] focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="name@company.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none"
                  />
                </div>
                {errors.email && (
                  <p className="text-danger text-xs font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative rounded-xl border border-neutral-200 dark:border-[#1E293B] bg-white dark:bg-[#18291E] focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                  <input
                    {...register('password')}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-transparent text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors"
                  >
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-danger text-xs font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-2xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Confirm Password
                </label>
                <div className="relative rounded-xl border border-neutral-200 dark:border-[#1E293B] bg-white dark:bg-[#18291E] focus-within:border-brand-primary focus-within:ring-2 focus-within:ring-brand-primary/20 transition-all">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500" />
                  <input
                    {...register('confirm')}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-2.5 bg-transparent text-sm text-neutral-800 dark:text-white placeholder-neutral-400 focus:outline-none"
                  />
                </div>
                {errors.confirm && (
                  <p className="text-danger text-xs font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} />
                    {errors.confirm.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-brand-primary hover:bg-brand-hover active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            {/* Footer Navigation */}
            <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-[#1E293B] text-center text-xs text-neutral-500">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="text-brand-primary hover:text-brand-hover font-bold transition-colors underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </div>

          </div>

          {/* Privacy Note */}
          <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-6">
            By signing up, you agree to A.C.E. Enterprise security and zero-disk privacy terms.
          </p>
        </motion.div>
      </div>

    </div>
  )
}
