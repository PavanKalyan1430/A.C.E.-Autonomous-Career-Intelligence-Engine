import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AssistantPage() {
  const navigate = useNavigate()
  
  useEffect(() => {
    navigate('/career', { replace: true })
  }, [navigate])

  return (
    <div className="p-8 text-slate-400">
      <h1 className="text-2xl font-bold text-white mb-4">AI Assistant</h1>
      <p>Redirecting to AI Career Agent...</p>
    </div>
  )
}

