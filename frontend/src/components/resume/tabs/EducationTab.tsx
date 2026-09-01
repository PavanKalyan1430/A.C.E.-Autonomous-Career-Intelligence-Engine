import React from 'react'
import { GraduationCap } from 'lucide-react'
import { EmptyState } from '../EmptyState'

interface Education {
  institution: string
  degree?: string
  field_of_study?: string
  graduation_date?: string
  gpa?: string
}

interface EducationTabProps {
  education: Education[]
}

export const EducationTab: React.FC<EducationTabProps> = ({ education }) => {
  if (!education || education.length === 0) {
    return (
      <EmptyState
        icon={<GraduationCap size={16} />}
        title="No education records detected"
        description="ACE didn't find education sections in your resume. Add your degree, institution, and graduation date."
        compact
      />
    )
  }

  return (
    <div className="space-y-3">
      {education.map((edu, i) => (
        <div
          key={i}
          className="flex items-start gap-4 p-4 bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card hover:border-brand-primary/15 transition-all"
        >
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-brand-light dark:bg-brand-primary/10 border border-brand-primary/15 flex items-center justify-center flex-shrink-0">
            <GraduationCap size={16} className="text-brand-primary" />
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-[13px] font-bold text-neutral-800 dark:text-white leading-tight">
                  {edu.degree}
                  {edu.field_of_study && ` in ${edu.field_of_study}`}
                </h4>
                <div className="text-[12px] font-semibold text-brand-primary mt-0.5">{edu.institution}</div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {edu.graduation_date && (
                  <span className="text-[10px] text-neutral-400 font-medium">{edu.graduation_date}</span>
                )}
                {edu.gpa && (
                  <span className="px-2 py-0.5 rounded-full bg-brand-light dark:bg-brand-primary/10 text-[10px] font-bold text-brand-primary border border-brand-primary/15">
                    GPA: {edu.gpa}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
