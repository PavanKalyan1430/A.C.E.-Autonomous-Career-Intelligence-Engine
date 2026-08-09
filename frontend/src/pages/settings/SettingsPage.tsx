import { useState } from 'react'
import { motion } from 'framer-motion'
import { Settings, User, Bell, Shield, Palette, Save, Loader2, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'

type Tab = 'profile' | 'notifications' | 'security' | 'appearance'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const [tab, setTab] = useState<Tab>('profile')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ bio: '', target_role: '', location: '' })

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => { setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2500) }, 800)
  }

  const tabs: { key: Tab; label: string; icon: React.FC<any> }[] = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'security', label: 'Security', icon: Shield },
    { key: 'appearance', label: 'Appearance', icon: Palette },
  ]

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account, preferences, and security.</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Sidebar tabs */}
        <div className="col-span-1 space-y-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`nav-item w-full ${tab === t.key ? 'active' : ''}`}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="col-span-3">
          {tab === 'profile' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card space-y-5">
              <h3 className="text-base font-semibold text-text-primary">Profile Information</h3>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-violet flex items-center justify-center text-white text-2xl font-bold">
                  {user?.email?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div>
                  <p className="text-sm font-medium text-text-primary">{user?.email}</p>
                  <p className="text-xs text-text-muted">Free Plan · Member since July 2025</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Target Role</label>
                  <input value={form.target_role} onChange={e => setForm(p => ({ ...p, target_role: e.target.value }))}
                    placeholder="e.g. Backend Engineer" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Location</label>
                  <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="e.g. Bangalore, India" className="input" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1.5">Bio / Summary</label>
                <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                  placeholder="Brief professional summary..." className="input min-h-[80px] resize-none" />
              </div>

              <button onClick={handleSave} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle2 size={14} /> : <Save size={14} />}
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
              </button>
            </motion.div>
          )}

          {tab === 'notifications' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card space-y-5">
              <h3 className="text-base font-semibold text-text-primary">Notification Preferences</h3>
              {[
                { label: 'Weekly Career Report', desc: 'Summary of your progress and AI recommendations', on: true },
                { label: 'Job Match Alerts', desc: 'When new roles match your profile', on: true },
                { label: 'Interview Reminders', desc: 'Remind me to practice before scheduled interviews', on: false },
                { label: 'Skill Gap Updates', desc: 'When market demand for your skills changes', on: false },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-bg-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-text-primary">{n.label}</p>
                    <p className="text-xs text-text-muted mt-0.5">{n.desc}</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full cursor-pointer transition-all ${n.on ? 'bg-accent' : 'bg-bg-border'}`}>
                    <div className={`w-4 h-4 rounded-full bg-white m-0.5 transition-transform ${n.on ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {tab === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card space-y-5">
              <h3 className="text-base font-semibold text-text-primary">Security</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Current Password</label>
                  <input type="password" placeholder="••••••••" className="input" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">New Password</label>
                  <input type="password" placeholder="••••••••" className="input" />
                </div>
                <button className="btn-primary">Update Password</button>
              </div>
              <div className="border-t border-bg-border pt-5">
                <p className="text-sm font-medium text-danger mb-1">Danger Zone</p>
                <p className="text-xs text-text-muted mb-3">This action is irreversible. All your data will be deleted.</p>
                <button className="btn-secondary border-danger/30 text-danger hover:bg-danger/10">Delete Account</button>
              </div>
            </motion.div>
          )}

          {tab === 'appearance' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card space-y-5">
              <h3 className="text-base font-semibold text-text-primary">Appearance</h3>
              <div>
                <p className="text-xs font-medium text-text-secondary mb-3">Theme</p>
                <div className="grid grid-cols-3 gap-3">
                  {['Dark (Default)', 'System', 'Light'].map((t, i) => (
                    <button key={t} className={`p-4 rounded-xl border text-sm font-medium transition-all
                      ${i === 0 ? 'border-accent/50 bg-accent/10 text-accent' : 'border-bg-border bg-bg-elevated text-text-muted hover:border-accent/30'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-text-secondary mb-3">Accent Color</p>
                <div className="flex gap-3">
                  {['#6366f1', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'].map(c => (
                    <button key={c} className="w-8 h-8 rounded-full ring-2 ring-offset-2 ring-offset-bg ring-transparent hover:ring-white/30 transition-all"
                      style={{ background: c }} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
