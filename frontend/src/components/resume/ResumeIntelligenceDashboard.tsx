import React from 'react'
import { useNavigate } from 'react-router-dom'
import { normalizePercentage } from '@/utils/error'
import { ResumeHeroSection } from './ResumeHeroSection'
import { OpportunitiesSection } from './OpportunitiesSection'
import { ResumeBreakdownSection } from './ResumeBreakdownSection'
import { EvidenceMatrixSection } from './EvidenceMatrixSection'
import { RecommendationCards } from './RecommendationCards'
import { DetailTabsSection } from './DetailTabsSection'
import { ArrowRight, MapPin } from 'lucide-react'

type TabId = 'ats_categories' | 'evidence' | 'experience' | 'projects' | 'education' | 'parsed_resume'

interface ResumeIntelligenceDashboardProps {
  atsAnalysis: any
  resume: any
  careerIntel: any
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

/**
 * Top-level orchestrator for the Resume Intelligence dashboard.
 * Architectural separation strictly enforced:
 * - Resume Intelligence: Diagnose, Explain, Recommend
 * - Skill Roadmap (/skills): Plan, Sequence, Track learning
 */
export const ResumeIntelligenceDashboard: React.FC<ResumeIntelligenceDashboardProps> = ({
  atsAnalysis,
  resume,
  careerIntel,
  activeTab,
  onTabChange,
}) => {
  const navigate = useNavigate()

  const overallScore = atsAnalysis ? normalizePercentage(atsAnalysis.overall_ats_score) : 0
  const scoreLevel = atsAnalysis?.score_level || 'Moderate'
  const targetRole = atsAnalysis?.target_role || ''
  const executiveSummary = atsAnalysis?.executive_summary || ''
  const categories = atsAnalysis?.categories || []
  const evidenceMatrix = atsAnalysis?.evidence_matrix || []
  const actionableImprovements = atsAnalysis?.actionable_improvements || []
  const missingKeywords = atsAnalysis?.missing_keywords || []
  const learningRoadmap = careerIntel?.learning_roadmap || []

  const handleSeeHow = () => {
    onTabChange('evidence')
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

      {/* 5. Actionable Improvement Details */}
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

      {/* 6. Detail Tabs: ATS | Evidence | Experience | Projects | Education | Parsed Resume */}
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

      {/* 7. Compact CTA to the dedicated Skill Roadmap page */}
      <div className="p-5 bg-gradient-to-r from-brand-light via-brand-sage/20 to-brand-light dark:from-brand-primary/10 dark:to-brand-primary/5 rounded-2xl border border-brand-primary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center flex-shrink-0">
            <MapPin size={18} />
          </div>
          <div>
            <h4 className="text-[13px] font-bold text-neutral-800 dark:text-white">
              Ready to sequence your learning & skill building?
            </h4>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              Track your step-by-step career learning plan on the dedicated Skill Roadmap page.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/skills')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-[12px] font-semibold hover:bg-brand-hover transition-colors flex-shrink-0 group"
        >
          <span>View Full Skill Roadmap</span>
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>

    </div>
  )
}
