import React from 'react'
import { ATSCategoriesTab } from './tabs/ATSCategoriesTab'
import { ProjectsTab } from './tabs/ProjectsTab'
import { ExperienceTab } from './tabs/ExperienceTab'
import { EducationTab } from './tabs/EducationTab'
import { ParsedResumeTab } from './tabs/ParsedResumeTab'
import { EvidenceMatrixSection } from './EvidenceMatrixSection'

type TabId = 'ats_categories' | 'evidence' | 'experience' | 'projects' | 'education' | 'parsed_resume'

const TAB_LABELS: Record<TabId, string> = {
  ats_categories: 'ATS Categories',
  evidence:       'Evidence Matrix',
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
 * Tabbed detail section.
 * Removed duplicate Learning Roadmap tab (handled strictly on the dedicated Skill Roadmap page).
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
                  ? 'border-brand-primary text-brand-primary dark:text-brand-primary font-bold'
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
