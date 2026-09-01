import React from 'react'
import { normalizePercentage } from '@/utils/error'
import { ResumeHeroSection } from './ResumeHeroSection'
import { OpportunitiesSection } from './OpportunitiesSection'
import { ResumeBreakdownSection } from './ResumeBreakdownSection'
import { EvidenceMatrixSection } from './EvidenceMatrixSection'
import { RoadmapSection } from './RoadmapSection'
import { RecommendationCards } from './RecommendationCards'
import { DetailTabsSection } from './DetailTabsSection'

type TabId = 'ats_categories' | 'evidence' | 'roadmap' | 'experience' | 'projects' | 'education' | 'parsed_resume'

interface ResumeIntelligenceDashboardProps {
  atsAnalysis: any
  resume: any
  careerIntel: any
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

/**
 * Top-level orchestrator for the Resume Intelligence dashboard.
 * Receives all data as props from ResumePage (which owns all queries/mutations).
 * Renders the full premium section layout: hero → opportunities → breakdown →
 * evidence → roadmap → recommendations → detail tabs.
 *
 * No data fetching here — all props come from ResumePage.
 */
export const ResumeIntelligenceDashboard: React.FC<ResumeIntelligenceDashboardProps> = ({
  atsAnalysis,
  resume,
  careerIntel,
  activeTab,
  onTabChange,
}) => {
  const overallScore = atsAnalysis ? normalizePercentage(atsAnalysis.overall_ats_score) : 0
  const scoreLevel = atsAnalysis?.score_level || 'Moderate'
  const targetRole = atsAnalysis?.target_role || ''
  const executiveSummary = atsAnalysis?.executive_summary || ''
  const categories = atsAnalysis?.categories || []
  const evidenceMatrix = atsAnalysis?.evidence_matrix || []
  const actionableImprovements = atsAnalysis?.actionable_improvements || []
  const missingKeywords = atsAnalysis?.missing_keywords || []

  const careerRoadmap = atsAnalysis?.career_roadmap || {}
  const immediate = careerRoadmap.immediate_1_2_weeks || []
  const shortTerm = careerRoadmap.short_term_1_2_months || []
  const longTerm = careerRoadmap.long_term_3_6_months || []

  const learningRoadmap = careerIntel?.learning_roadmap || []

  const handleSeeHow = () => {
    onTabChange('roadmap')
    setTimeout(() => {
      const el = document.getElementById('ace-detail-tabs')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 100)
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in">

      {/* 1. Hero: Score + Summary + Score Breakdown Rings */}
      <ResumeHeroSection
        overallScore={overallScore}
        scoreLevel={scoreLevel}
        targetRole={targetRole}
        executiveSummary={executiveSummary}
        categories={categories}
        analyzedAt={atsAnalysis?.analyzed_at}
        actionableImprovements={actionableImprovements}
        onSeeHow={handleSeeHow}
      />

      {/* 2. Top Opportunities + AI Career Guidance */}
      <OpportunitiesSection
        actionableImprovements={actionableImprovements}
        missingKeywords={missingKeywords}
        targetRole={targetRole}
        learningRoadmap={learningRoadmap}
      />

      {/* 3. Resume Breakdown — 5 metric cards */}
      <ResumeBreakdownSection categories={categories} />

      {/* 4. Evidence Matrix — premium expandable table */}
      <EvidenceMatrixSection
        evidenceMatrix={evidenceMatrix}
        targetRole={targetRole}
        showLimit={5}
      />

      {/* 5. Action Plan & Roadmap */}
      <RoadmapSection
        immediate={immediate}
        shortTerm={shortTerm}
        longTerm={longTerm}
      />

      {/* 6. Actionable Improvement Details */}
      {actionableImprovements.length > 0 && (
        <div className="bg-white dark:bg-[#0D1117] rounded-2xl border border-neutral-200 dark:border-[#1E293B] shadow-card p-5 md:p-6">
          <div className="mb-5">
            <h3 className="text-[14px] font-bold text-neutral-800 dark:text-white mb-0.5">
              Actionable Improvement Details
            </h3>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Step-by-step guidance on each identified gap.
            </p>
          </div>
          <RecommendationCards improvements={actionableImprovements} />
        </div>
      )}

      {/* 7. Detail Tabs: ATS | Evidence | Roadmap | Experience | Projects | Education | Parsed Resume */}
      <div id="ace-detail-tabs">
        <DetailTabsSection
          activeTab={activeTab}
          onTabChange={onTabChange}
          atsAnalysis={atsAnalysis}
          resume={resume}
          careerIntel={careerIntel}
          targetRole={targetRole}
        />
      </div>

    </div>
  )
}
