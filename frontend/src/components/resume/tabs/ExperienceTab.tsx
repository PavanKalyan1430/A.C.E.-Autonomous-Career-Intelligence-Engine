import React from 'react'
import { Briefcase, MapPin, Calendar } from 'lucide-react'
import { EmptyState } from '../EmptyState'

interface WorkExperience {
  company: string
  role: string
  start_date?: string
  end_date?: string
  description: string[]
  technologies?: string[]
}

interface ExperienceTabProps {
  workExperience: WorkExperience[]
}

const ExperienceCard: React.FC<{ exp: WorkExperience; index: number; isLast: boolean }> = ({ exp, index, isLast }) => {
  return (
    <div className="flex gap-4">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-brand-light dark:bg-brand-primary/10 border-2 border-brand-primary/30 flex items-center justify-center">
          <Briefcase size={13} className="text-brand-primary" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-gradient-to-b from-brand-primary/20 to-transparent mt-2" />}
      </div>

      {/* Content */}
      <div className={`flex-1 pb-6 ${isLast ? '' : ''}`}>
        <div className="p-4 bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card hover:shadow-elevated hover:border-brand-primary/15 transition-all">

          {/* Role + company */}
          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
            <div>
              <h4 className="text-[13px] font-bold text-neutral-800 dark:text-white leading-tight">{exp.role}</h4>
              <div className="text-[12px] font-semibold text-brand-primary mt-0.5">{exp.company}</div>
            </div>
            {(exp.start_date || exp.end_date) && (
              <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-medium bg-neutral-50 dark:bg-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-neutral-700 flex-shrink-0">
                <Calendar size={9} />
                {exp.start_date}
                {exp.end_date && ` – ${exp.end_date}`}
              </div>
            )}
          </div>

          {/* Description bullets */}
          {exp.description && exp.description.length > 0 && (
            <ul className="space-y-1.5 mb-3">
              {exp.description.map((bullet, k) => (
                <li key={k} className="flex items-start gap-2 text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-ai flex-shrink-0 mt-1.5" />
                  {bullet}
                </li>
              ))}
            </ul>
          )}

          {/* Tech stack */}
          {exp.technologies && exp.technologies.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-3 border-t border-neutral-100 dark:border-neutral-800">
              {exp.technologies.map((tech, ti) => (
                <span key={ti} className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const ExperienceTab: React.FC<ExperienceTabProps> = ({ workExperience }) => {
  if (!workExperience || workExperience.length === 0) {
    return (
      <EmptyState
        icon={<Briefcase size={16} />}
        title="No formal experience detected"
        description="ACE can strengthen this section using internships, freelance work, open-source contributions, research, or high-impact project ownership."
        compact
      />
    )
  }

  return (
    <div className="space-y-0">
      {workExperience.map((exp, i) => (
        <ExperienceCard
          key={i}
          exp={exp}
          index={i}
          isLast={i === workExperience.length - 1}
        />
      ))}
    </div>
  )
}
