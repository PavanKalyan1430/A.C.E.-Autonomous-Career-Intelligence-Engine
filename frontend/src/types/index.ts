// Shared TypeScript types across the A.C.E. frontend

export interface User {
  id: number
  email: string
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: number
  user_id: number
  bio?: string
  target_role?: string
  overall_score: number
  skills_json: Record<string, string[]>
  updated_at: string
}

export interface Resume {
  id: number
  user_id: number
  file_name: string
  parsed_data: ParsedResume
  created_at: string
}

export interface ParsedResume {
  personal_info: {
    name?: string
    email?: string
    phone?: string
    location?: string
    links: string[]
  }
  work_experience: WorkExperience[]
  education: Education[]
  projects: Project[]
  skills: string[]
  languages: string[]
  summary?: string
}

export interface WorkExperience {
  company: string
  role: string
  start_date?: string
  end_date?: string
  description: string[]
  technologies: string[]
}

export interface Education {
  institution: string
  degree?: string
  field_of_study?: string
  graduation_date?: string
  gpa?: string
}

export interface Project {
  title: string
  description: string
  technologies: string[]
  link?: string
}

export interface Application {
  id: number
  user_id: number
  company_name: string
  role_title: string
  status: 'applied' | 'oa' | 'interview' | 'offer' | 'rejected'
  jd_text?: string
  analysis?: {
    match_score: number
    matched_skills: string[]
    missing_skills: string[]
  }
  created_at: string
}

export interface Company {
  company_name: string
  tech_stack: string[]
  interview_process: string
  hiring_trends: string
  sources: string[]
}

export interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
  current_agent?: string
}

export interface AnalyticsDashboard {
  funnel: Record<string, number>
  average_interview_score: number
  total_sessions: number
  activity_timeline: { month: string; applications: number; interviews: number }[]
}

export interface AuthTokens {
  access_token: string
  token_type: string
}
