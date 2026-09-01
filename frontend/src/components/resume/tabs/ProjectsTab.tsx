import React from 'react'
import { ExternalLink, FolderOpen } from 'lucide-react'
import { EmptyState } from '../EmptyState'

interface Project {
  title: string
  description: string
  technologies: string[]
  link?: string
}

interface ProjectsTabProps {
  projects: Project[]
}

const ProjectCard: React.FC<{ proj: Project }> = ({ proj }) => {
  return (
    <div className="p-5 bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card hover:shadow-elevated hover:border-brand-primary/20 transition-all flex flex-col gap-3">

      {/* Title + link */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[13px] font-bold text-neutral-800 dark:text-white leading-tight">{proj.title}</h4>
        {proj.link && (
          <a
            href={proj.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 w-7 h-7 rounded-lg border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-400 hover:text-brand-primary hover:border-brand-primary/30 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Description — real data only */}
      {proj.description && (
        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed flex-1">
          {proj.description}
        </p>
      )}

      {/* Tech stack badges — real data only */}
      {proj.technologies && proj.technologies.length > 0 && (
        <div>
          <div className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Tech Stack</div>
          <div className="flex flex-wrap gap-1.5">
            {proj.technologies.map((tech, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-medium text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const ProjectsTab: React.FC<ProjectsTabProps> = ({ projects }) => {
  if (!projects || projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderOpen size={16} />}
        title="No projects detected"
        description="ACE didn't find a projects section in your resume."
        compact
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {projects.map((proj, i) => <ProjectCard key={i} proj={proj} />)}
    </div>
  )
}
