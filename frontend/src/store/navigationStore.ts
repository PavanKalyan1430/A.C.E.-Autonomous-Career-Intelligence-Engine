import { create } from 'zustand'

export interface JobSearchParams {
  keyword: string
  location: string
  role: string
  job_type: string
  experience: string
  remote_onsite: string
  skills: string
  salary_min: string
  sort_by?: string
  page: number
}

interface NavigationState {
  // Job Intelligence state
  jobInputs: {
    keyword: string
    location: string
    role: string
    job_type: string
    experience: string
    remote_onsite: string
    skills: string
    salary_min: string
  }
  jobSearchParams: JobSearchParams
  hasSearchedJobs: boolean
  selectedJobId: string | number | null

  setJobInputs: (inputs: Partial<NavigationState['jobInputs']>) => void
  setJobSearchParams: (params: Partial<JobSearchParams>) => void
  setHasSearchedJobs: (searched: boolean) => void
  setSelectedJobId: (id: string | number | null) => void
  resetJobsState: () => void

  // Company Intelligence state
  companySearchInput: string
  activeSearchCompany: string

  setCompanySearchInput: (input: string) => void
  setActiveSearchCompany: (company: string) => void
  resetCompanyState: () => void

  // Skill Roadmap state
  selectedSkillNodeId: string | null

  setSelectedSkillNodeId: (nodeId: string | null) => void
  resetSkillRoadmapState: () => void
}

const defaultJobInputs = {
  keyword: '',
  location: '',
  role: '',
  job_type: '',
  experience: '',
  remote_onsite: '',
  skills: '',
  salary_min: ''
}

const defaultJobSearchParams: JobSearchParams = {
  keyword: '',
  location: '',
  role: '',
  job_type: '',
  experience: '',
  remote_onsite: '',
  skills: '',
  salary_min: '',
  page: 1
}

export const useNavigationStore = create<NavigationState>((set) => ({
  // Job Intelligence initial state
  jobInputs: defaultJobInputs,
  jobSearchParams: defaultJobSearchParams,
  hasSearchedJobs: false,
  selectedJobId: null,

  setJobInputs: (inputs) =>
    set((state) => ({ jobInputs: { ...state.jobInputs, ...inputs } })),
  setJobSearchParams: (params) =>
    set((state) => ({ jobSearchParams: { ...state.jobSearchParams, ...params } })),
  setHasSearchedJobs: (searched) => set({ hasSearchedJobs: searched }),
  setSelectedJobId: (id) => set({ selectedJobId: id }),
  resetJobsState: () =>
    set({
      jobInputs: defaultJobInputs,
      jobSearchParams: defaultJobSearchParams,
      hasSearchedJobs: false,
      selectedJobId: null
    }),

  // Company Intelligence initial state
  companySearchInput: '',
  activeSearchCompany: '',

  setCompanySearchInput: (input) => set({ companySearchInput: input }),
  setActiveSearchCompany: (company) => set({ activeSearchCompany: company }),
  resetCompanyState: () => set({ companySearchInput: '', activeSearchCompany: '' }),

  // Skill Roadmap initial state
  selectedSkillNodeId: null,

  setSelectedSkillNodeId: (nodeId) => set({ selectedSkillNodeId: nodeId }),
  resetSkillRoadmapState: () => set({ selectedSkillNodeId: null })
}))
