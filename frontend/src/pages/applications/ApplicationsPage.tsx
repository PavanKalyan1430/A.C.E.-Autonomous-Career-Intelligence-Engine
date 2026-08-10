import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, GripVertical } from 'lucide-react'

type Status = 'applied' | 'oa' | 'interview' | 'offer' | 'rejected'
interface App { id: number; company: string; role: string; status: Status; date: string }

const COLUMNS: { key: Status; label: string; color: string; bg: string }[] = [
  { key: 'applied',   label: 'Applied',   color: 'text-accent',   bg: 'bg-accent/10 border-accent/20' },
  { key: 'oa',        label: 'OA',        color: 'text-violet',   bg: 'bg-violet/10 border-violet/20' },
  { key: 'interview', label: 'Interview', color: 'text-warning',  bg: 'bg-warning/10 border-warning/20' },
  { key: 'offer',     label: 'Offer',     color: 'text-success',  bg: 'bg-success/10 border-success/20' },
  { key: 'rejected',  label: 'Rejected',  color: 'text-danger',   bg: 'bg-danger/10 border-danger/20' },
]

const MOCK_APPS: App[] = [
  { id: 1, company: 'Observe.ai', role: 'Backend Engineer', status: 'interview', date: 'Jul 15' },
  { id: 2, company: 'Razorpay', role: 'Software Engineer', status: 'applied', date: 'Jul 14' },
  { id: 3, company: 'Atlassian', role: 'Backend Developer', status: 'oa', date: 'Jul 12' },
  { id: 4, company: 'Stripe', role: 'Platform Engineer', status: 'applied', date: 'Jul 10' },
  { id: 5, company: 'OpenAI', role: 'AI Engineer', status: 'rejected', date: 'Jul 8' },
]

export default function ApplicationsPage() {
  const [apps, setApps] = useState<App[]>(MOCK_APPS)
  const [showForm, setShowForm] = useState(false)
  const [newApp, setNewApp] = useState({ company: '', role: '' })

  const addApp = () => {
    if (!newApp.company || !newApp.role) return
    const app: App = { id: Date.now(), company: newApp.company, role: newApp.role, status: 'applied', date: 'Today' }
    setApps(prev => [app, ...prev])
    setNewApp({ company: '', role: '' })
    setShowForm(false)
  }

  const moveApp = (id: number, newStatus: Status) => {
    setApps(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header flex items-end justify-between">
        <div>
          <h1 className="page-title">Application Tracker</h1>
          <p className="page-subtitle">Visualize your entire job pipeline in one place.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={15} /> Add Application
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        {COLUMNS.map(col => {
          const count = apps.filter(a => a.status === col.key).length
          return (
            <div key={col.key} className={`card border ${col.bg} text-center`}>
              <p className={`text-2xl font-bold ${col.color}`}>{count}</p>
              <p className="text-xs text-text-muted mt-1">{col.label}</p>
            </div>
          )
        })}
      </div>

      {/* Add form */}
      {showForm && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="card mb-5 border-accent/20 bg-accent/5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-text-primary">Add Application</p>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-1"><X size={15} /></button>
          </div>
          <div className="flex gap-3">
            <input value={newApp.company} onChange={e => setNewApp(p => ({ ...p, company: e.target.value }))}
              placeholder="Company name" className="input flex-1" />
            <input value={newApp.role} onChange={e => setNewApp(p => ({ ...p, role: e.target.value }))}
              placeholder="Role title" className="input flex-1" />
            <button onClick={addApp} className="btn-primary flex-shrink-0">Add</button>
          </div>
        </motion.div>
      )}

      {/* Kanban board */}
      <div className="grid grid-cols-5 gap-3">
        {COLUMNS.map(col => (
          <div key={col.key}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              const id = parseInt(e.dataTransfer.getData('appId'))
              moveApp(id, col.key)
            }}
          >
            <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border ${col.bg}`}>
              <span className={`text-xs font-semibold ${col.color}`}>{col.label}</span>
              <span className={`ml-auto text-xs font-bold ${col.color}`}>
                {apps.filter(a => a.status === col.key).length}
              </span>
            </div>

            <div className="space-y-2 min-h-[200px]">
              {apps.filter(a => a.status === col.key).map(app => (
                <div
                  key={app.id}
                  draggable
                  onDragStart={e => (e as React.DragEvent<HTMLDivElement>).dataTransfer.setData('appId', app.id.toString())}
                  className="card p-3 cursor-grab active:cursor-grabbing hover:border-accent/30 transition-all group"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical size={13} className="text-text-muted mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">{app.company}</p>
                      <p className="text-[10px] text-text-muted truncate mt-0.5">{app.role}</p>
                      <p className="text-[10px] text-text-muted mt-1.5">{app.date}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
