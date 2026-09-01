import React from 'react'
import { ATSCategoriesTab } from './tabs/ATSCategoriesTab'
import { ProjectsTab } from './tabs/ProjectsTab'
import { ExperienceTab } from './tabs/ExperienceTab'
import { EducationTab } from './tabs/EducationTab'
import { ParsedResumeTab } from './tabs/ParsedResumeTab'
import { EvidenceMatrixSection } from './EvidenceMatrixSection'
import { RoadmapSection } from './RoadmapSection'

type TabId = 'ats_categories' | 'evidence' | 'roadmap' | 'experience' | 'projects' | 'education' | 'parsed_resume'

const TAB_LABELS: Record<TabId, string> = {
  ats_categories: 'ATS Categories',
  evidence:       'Evidence',
  roadmap:        'Learning Roadmap',
  experience:     'Experience',
  projects:       'Projects',
  education:      'Education',
  parsed_resume:  'Parsed Resume',
}

interface DetailTabsSectionProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  atsAnalysis: any
  resume: any
  careerIntel: any
  targetRole: string
}

/**
 * Tabbed detail section. All 7 original tabs preserved — layouts redesigned.
 * Tab bar scrolls horizontally on mobile without overflow.
 */
export const DetailTabsSection: React.FC<DetailTabsSectionProps> = ({
  activeTab,
  onTabChange,
  atsAnalysis,
  resume,
  careerIntel,
  targetRole,
}) => {
  const tabs = Object.keys(TAB_LABELS) as TabId[]

  return (
    <div className="bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card overflow-hidden">

      {/* Tab bar */}
      <div className="border-b border-neutral-100 dark:border-neutral-800 overflow-x-auto">
        <div className="flex gap-1 px-4 pt-3 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`pb-3 px-3 text-[11px] font-semibold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab
                  ? 'border-brand-primary text-brand-primary dark:text-brand-primary'
                  : 'border-transparent text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-5 md:p-6">
        {activeTab === 'ats_categories' && (
          <ATSCategoriesTab categories={atsAnalysis?.categories || []} />
        )}

        {activeTab === 'evidence' && (
          <EvidenceMatrixSection
            evidenceMatrix={atsAnalysis?.evidence_matrix || []}
            targetRole={targetRole}
            showLimit={8}
          />
        )}

        {activeTab === 'roadmap' && (
          <div className="space-y-4">
            {/* Learning roadmap from careerIntel (more granular individual skill nodes) */}
            {careerIntel?.learning_roadmap && careerIntel.learning_roadmap.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {careerIntel.learning_roadmap.map((node: any) => {
                  const statusColors: Record<string, string> = {
                    completed:   'border-l-brand-primary bg-brand-primary/5 text-brand-primary',
                    focus:       'border-l-brand-primary bg-brand-primary/5 text-brand-primary',
                    recommended: 'border-l-brand-ai bg-brand-ai/5 text-brand-ai',
                    blocked:     'border-l-neutral-300 bg-neutral-50 dark:bg-neutral-900 text-neutral-400',
                  }
                  const cfg = statusColors[node.status] || statusColors.recommended
                  return (
                    <div key={node.id} className={`p-4 border-l-4 rounded-r-xl border border-neutral-100 dark:border-neutral-800 ${cfg}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[12px] font-bold text-neutral-800 dark:text-white">{node.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white dark:bg-neutral-900 border border-current/20 text-[9px] font-bold capitalize">
                          {node.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed mb-2">{node.reason}</p>
                      <div className="flex gap-4 text-[10px] text-neutral-400 font-medium">
                        {node.estimated_effort_hours && <span>Effort: <strong>{node.estimated_effort_hours}h</strong></span>}
                        {node.impact && <span>Impact: <strong className="capitalize">{node.impact}</strong></span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <RoadmapSection
                immediate={atsAnalysis?.career_roadmap?.immediate_1_2_weeks || []}
                shortTerm={atsAnalysis?.career_roadmap?.short_term_1_2_months || []}
                longTerm={atsAnalysis?.career_roadmap?.long_term_3_6_months || []}
              />
            )}
          </div>
        )}

        {activeTab === 'experience' && (
          <ExperienceTab workExperience={resume?.work_experience || []} />
        )}

        {activeTab === 'projects' && (
          <ProjectsTab projects={resume?.projects || []} />
        )}

        {activeTab === 'education' && (
          <EducationTab education={resume?.education || []} />
        )}

        {activeTab === 'parsed_resume' && (
          <ParsedResumeTab resume={resume} />
        )}
      </div>
    </div>
  )
}
