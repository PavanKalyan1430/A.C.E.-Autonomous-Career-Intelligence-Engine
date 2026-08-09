# PROJECT_ANALYSIS.md

# 1. Project Overview

* **Project Name**: A.C.E. (Autonomous Career Intelligence Engine)
* **Purpose**: A.C.E. is an AI-powered career co-pilot designed to streamline job search, resume optimization, company research, career roadmap planning, and mock interview preparation through an orchestrated multi-agent framework.
* **Problem Statement**: Job seekers face disjointed tools for resume building, skill gap analysis, company research, and mock interviews. Traditional platforms do not preserve user context or tailor feedback using specialized AI agents.
* **Target Users**: Software engineers, tech professionals, job seekers, and career switchers looking for personalized career insights and automated intelligence.
* **Main Features**:
  1. **Resume Intelligence & Parsing**: Automated parsing of PDF/DOCX resumes into structured schema, ATS scoring, and job description skill-gap matching.
  2. **Multi-Agent Assistant & Orchestration**: Stateful query routing powered by LangGraph to orchestrate domain-specific agents (Resume, Company, Career, Interview).
  3. **Company Intelligence Service**: Live research integration (via Tavily web search) extracting engineering tech stacks, interview processes, and hiring trends.
  4. **Career Roadmap Generation**: Dynamic phase-by-phase learning path generation matching current user skills against target roles.
  5. **Mock Interview Coaching**: Technical question generation, STAR-method answer evaluation, and quantitative scoring.
  6. **User Memory Store**: Persistent preference and context tracking across sessions.
  7. **Analytics & Funnel Tracking**: Career application funnel tracking (Applied, Interview, Offer, Rejected) and average mock interview scores.
  8. **Model Context Protocol (MCP) Integration**: Native MCP tool definitions for external model interoperability.
* **Current Development Status**: MVP (Minimum Viable Product) complete with full backend FastAPI service, database models, LangGraph orchestrator, React/Vite frontend UI, and Tavily/Gemini fallbacks.
* **Short Product Vision**: Transform into a fully autonomous job-seeking agent capable of auto-applying to tailored jobs, managing recruiter interactions via email, and providing live real-time voice interview coaching.

---

# 2. Folder Structure

```text
ACE/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── specialized/
│   │   │   │   ├── career_planner.py
│   │   │   │   ├── company_agent.py
│   │   │   │   ├── interview_coach.py
│   │   │   │   └── resume_agent.py
│   │   │   ├── orchestrator.py
│   │   │   └── state.py
│   │   ├── api/
│   │   │   ├── agent.py
│   │   │   ├── analytics.py
│   │   │   ├── auth.py
│   │   │   ├── company.py
│   │   │   ├── deps.py
│   │   │   ├── mcp.py
│   │   │   ├── memory.py
│   │   │   └── resume.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── mcp/
│   │   │   └── server.py
│   │   ├── models/
│   │   │   └── user.py
│   │   ├── schemas/
│   │   │   ├── resume.py
│   │   │   └── user.py
│   │   ├── services/
│   │   │   ├── company_intelligence.py
│   │   │   ├── memory_service.py
│   │   │   └── resume_parser.py
│   │   └── main.py
│   ├── .env
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── index.ts
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── AppLayout.tsx
│   │   │       └── Sidebar.tsx
│   │   ├── pages/
│   │   │   ├── analytics/
│   │   │   │   └── AnalyticsPage.tsx
│   │   │   ├── applications/
│   │   │   │   └── ApplicationsPage.tsx
│   │   │   ├── assistant/
│   │   │   │   └── AssistantPage.tsx
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── SignupPage.tsx
│   │   │   ├── career/
│   │   │   │   └── CareerPage.tsx
│   │   │   ├── companies/
│   │   │   │   └── CompaniesPage.tsx
│   │   │   ├── dashboard/
│   │   │   │   └── DashboardPage.tsx
│   │   │   ├── interviews/
│   │   │   │   └── InterviewsPage.tsx
│   │   │   ├── resume/
│   │   │   │   └── ResumePage.tsx
│   │   │   └── settings/
│   │   │       └── SettingsPage.tsx
│   │   ├── store/
│   │   │   └── authStore.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── App.css
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.ts
│   └── vite.config.ts
└── docker-compose.yml
```

### Folder Explanations & Purpose:
* **backend/app/agents/**: Contains the LangGraph multi-agent implementation. `orchestrator.py` defines state routing nodes, while `specialized/` holds domain tools for resume matching, company research, career roadmap building, and interview coaching.
* **backend/app/api/**: API layer containing FastAPI APIRouters. `deps.py` handles authorization dependency injection (`get_current_user`), and sub-routers expose authentication, resumes, agent queries, memory, MCP, and analytics.
* **backend/app/core/**: Core infrastructure modules. `config.py` uses Pydantic BaseSettings, `database.py` establishes SQLAlchemy async engines/sessions, and `security.py` manages JWT encoding/decoding and bcrypt password hashing.
* **backend/app/models/**: SQLAlchemy ORM models (`user.py`) defining relational tables (`users`, `profiles`, `resumes`, `companies`, `jobs`, `applications`, `interview_sessions`, `user_memories`, `agent_executions`).
* **backend/app/services/**: External integration and business logic layer (Google Gemini via `google-generativeai` in `resume_parser.py`, web scraping via Tavily in `company_intelligence.py`, and database state updates in `memory_service.py`).
* **backend/app/mcp/**: Exposes `ACEMCPServer` for Model Context Protocol compliance.
* **frontend/src/api/**: Axios API client wrapper with JWT token interceptors (`api/index.ts`).
* **frontend/src/pages/**: Route views for authentication, dashboard, resume analysis, company search, career planner, applications tracker, mock interviews, AI assistant chat, and settings.
* **frontend/src/store/**: Zustand state store (`authStore.ts`) with persistent storage middleware for user auth state.

---

# 3. Complete Technology Stack

### Frontend Stack:
* **Framework**: React 19 (`react`, `react-dom`) with TypeScript.
* **Build Tool**: Vite 8 (`vite`, `@vitejs/plugin-react`).
* **Routing**: React Router DOM v7 (`react-router-dom`).
* **State Management**: Zustand (`zustand`) with `persist` middleware for local storage session management.
* **Data Fetching / Caching**: TanStack React Query v5 (`@tanstack/react-query`) for server-state caching and asynchronous query state management.
* **UI Components & Icons**: Lucide React (`lucide-react`) for consistent icon sets; Framer Motion (`framer-motion`) for UI animations.
* **Charts & Visualizations**: Recharts (`recharts`) for rendering application funnels (BarChart), activity trends (LineChart), and skill radars (RadarChart).
* **Styling**: Tailwind CSS (`tailwind.config.ts`, `postcss.config.js`) with custom dark mode glassmorphism theme tokens (`#0a0a0f`, `#6366f1`, `#10b981`).
* **Form Handling & Validation**: React Hook Form (`react-hook-form`), Zod (`zod`), `@hookform/resolvers`.
* **HTTP Client**: Axios (`axios`).

### Backend Stack:
* **Framework**: FastAPI (`fastapi`, `uvicorn`) async ASGI web server.
* **Database & ORM**: SQLAlchemy 2.0 (`sqlalchemy`) using async engine (`asyncpg`, `aiosqlite`), Alembic (`alembic`) for migrations.
* **Security & Auth**: Python-JOSE (`python-jose`) for JWT creation/verification, Passlib (`passlib[bcrypt]`) for password hashing.
* **Validation & Settings**: Pydantic v2 (`pydantic`, `pydantic-settings`).
* **Asynchronous HTTP Client**: HTTPX (`httpx`).

### AI Stack:
* **Orchestration Framework**: LangGraph (`langgraph`) and LangChain Core (`langchain`, `langchain-core`).
* **LLM Provider**: Google Generative AI (`google-generativeai`), utilizing Gemini models (`gemini-1.5-flash`) for structured JSON schema extraction.
* **Web Search Tool**: Tavily API (`tavily-python`) for real-time web search enrichment of tech company insights.
* **Protocols**: Custom Model Context Protocol (MCP) server definition.

### Why Each Technology Exists:
* **FastAPI + AsyncPG**: Enables non-blocking asynchronous execution during long-running LLM generation calls and API searches.
* **LangGraph**: Replaces linear chain pipelines with cyclic, state-driven multi-agent routing.
* **Gemini 1.5 Flash**: Offers native structured JSON output binding (`response_mime_type="application/json"`), preventing parsing errors.
* **Tavily API**: Solves static LLM knowledge cutoff issues by retrieving fresh real-time web results for companies.
* **Recharts & Framer Motion**: Delivers an interactive, animated executive dashboard.

---

# 4. Frontend Architecture

### Page Breakdown:

#### 1. Dashboard Page (`DashboardPage.tsx`)
* **Purpose**: Overview of career metrics, application funnel, monthly activity, top skills, recent activities, and actionable AI insights.
* **Components Used**: Stat cards, `BarChart` (Application Funnel), `LineChart` (Monthly Activity), AI Insights card, Top Skills badges, Recent Activity feed.
* **State Management**: TanStack React Query (`useQuery` fetching `/analytics/dashboard` and `/resume/latest`), Zustand (`useAuthStore`).
* **API Calls**: `analyticsApi.getDashboard()`, `resumeApi.getLatest()`.
* **User Actions**: Click "Ask A.C.E." button (navigates to Assistant), view skill details, review AI recommendations.
* **Data Flow**: Page loads -> Queries `/analytics/dashboard` -> Populates stats, funnel bar chart, and trend line chart.
* **AI Features**: Displays dynamic AI insights generated from metric evaluations.
* **Complexity Notes**: Handles fallback states when resume or analytics metrics return empty datasets.

#### 2. Resume Page (`ResumePage.tsx`)
* **Purpose**: Upload resumes, view parsed structured profile data, evaluate ATS/Resume scores, view skill radar, and test match against Job Descriptions.
* **Components Used**: Drag-and-drop file upload container, score cards, Work Experience timeline, Projects list, Job Description text analyzer, Skill `RadarChart`, Extracted Skills list, Improvement Tips card.
* **State Management**: Local state (`dragging`, `jd`, `matchResult`), TanStack React Query (`useQuery`, `useMutation`, `useQueryClient`).
* **API Calls**: `resumeApi.upload(file)`, `resumeApi.getLatest()`.
* **User Actions**: Drag-and-drop resume PDF/TXT, paste Job Description text, click "Analyze Match".
* **Data Flow**: User uploads file -> `resumeApi.upload()` sends multipart form -> Backend executes Gemini parser -> UI invalidates cache and renders parsed response.
* **AI Features**: Automated resume text extraction and Job Description skill gap comparison.
* **Complexity Notes**: Features offline heuristic fallbacks for matching scores if API calls fail.

#### 3. Assistant Page (`AssistantPage.tsx`)
* **Purpose**: Conversational multi-agent assistant for career guidance, mock questions, and skill roadmap queries.
* **Components Used**: Chat header with online indicator, Message stream container, Message bubbles with agent indicator badges, Suggestion chips, Text input bar.
* **State Management**: Local message list state (`messages`), input state (`input`), loading state (`loading`).
* **API Calls**: `agentApi.query(message)`.
* **User Actions**: Type query or click suggested prompt chip, send message, scroll chat log.
* **Data Flow**: User sends text -> Message added to UI -> `agentApi.query()` posts to `/api/v1/agent/query` -> Orchestrator routes query -> Assistant response rendered with specific agent badge.
* **AI Features**: Full multi-agent stateful execution displaying current active agent badge (`orchestrator`, `resume_agent`, `company_agent`, `career_planner`, `interview_coach`).
* **Complexity Notes**: Handles automatic smooth auto-scrolling on stream update.

#### 4. Companies Page (`CompaniesPage.tsx`)
* **Purpose**: Search company intelligence and inspect tech stacks, interview processes, and hiring trends.
* **Components Used**: Search bar, Company summary card, Tech stack badge list, Interview process timeline.
* **State Management**: Search query local state.
* **API Calls**: `companyApi.getInsights(name)`.
* **User Actions**: Search company name, view retrieved intelligence.
* **Data Flow**: User submits company query -> `companyApi.getInsights` requests `/api/v1/company/{name}` -> Tavily web search extracts information -> Results returned to UI.
* **AI Features**: Automated web snippet synthesis and skill extraction heuristics.

#### 5. Career Page (`CareerPage.tsx`)
* **Purpose**: Interactively generate career step-by-step learning roadmaps.
* **Components Used**: Target role selector, Phase breakdown cards, Estimated timeline indicators.
* **State Management**: Selected target role state, roadmap state.
* **API Calls**: Invoked via `agentApi.query()` or backend MCP service.
* **User Actions**: Select target role, request roadmap generation.
* **Data Flow**: Role requested -> Career planner agent compares profile skills -> Phase breakdown rendered.

#### 6. Applications Page (`ApplicationsPage.tsx`)
* **Purpose**: Kanban board / list tracker for job applications across stages (Applied, Interview, Offer, Rejected).
* **Components Used**: Stage columns, Application cards, Status selectors.
* **State Management**: Local state / React Query.
* **API Calls**: Analytics and application data endpoints.
* **User Actions**: Move applications between stages, view JD analysis.

#### 7. Interviews Page (`InterviewsPage.tsx`)
* **Purpose**: Interactive mock technical interview environment.
* **Components Used**: Question prompt display, Text answer input area, STAR-method evaluation feedback card.
* **State Management**: Current session index, answers state, evaluation results state.
* **API Calls**: Agent query endpoint for interview coach.
* **User Actions**: Request questions, submit answer text, view score and feedback.

#### 8. Settings Page (`SettingsPage.tsx`)
* **Purpose**: Manage user account preferences, API keys, and system configuration.
* **Components Used**: Profile form, API key input fields, theme toggles.
* **State Management**: Zustand authStore and form state.
* **API Calls**: User update endpoints.

---

# 5. Backend Architecture

### Services Overview

#### 1. Resume Parser Service (`ResumeParserService` in `resume_parser.py`)
* **Responsibility**: Extract structured information (personal info, experience, education, projects, skills) from raw text.
* **Dependencies**: `google-generativeai`, `ResumeSchema` (Pydantic).
* **Internal Workflow**: Configures Gemini model (`gemini-1.5-flash`) -> Submits prompt with schema constraint -> Parses JSON output -> Falls back to `_mock_parse` if API key is absent or call fails.
* **Inputs**: `raw_text` (str).
* **Outputs**: `ResumeSchema` object.

#### 2. Company Intelligence Service (`CompanyIntelligenceService` in `company_intelligence.py`)
* **Responsibility**: Search real-time web sources for company engineering details.
* **Dependencies**: `tavily-python` (`TavilyClient`).
* **Internal Workflow**: Issues Tavily search query -> Aggregates top search snippets -> Runs heuristic skill regex parser -> Returns structured insights -> Falls back to `_mock_company_insights` if key missing.
* **Inputs**: `company_name` (str).
* **Outputs**: Dictionary containing `company_name`, `tech_stack`, `interview_process`, `hiring_trends`, `sources`, `raw_summary`.

#### 3. Memory Service (`MemoryService` in `memory_service.py`)
* **Responsibility**: Persistent storage and retrieval of user-specific memory items.
* **Dependencies**: SQLAlchemy `AsyncSession`, `UserMemory` model.
* **Internal Workflow**: Executes SQL select/insert statements filtered by `user_id` and `category`.
* **Inputs**: `user_id` (int), `category` (str), `memory_text` (str), `meta_data` (dict).
* **Outputs**: `UserMemory` record(s).

#### 4. Model Context Protocol Server (`ACEMCPServer` in `mcp/server.py`)
* **Responsibility**: Expose tool definitions and execution functions for external MCP client integration.
* **Dependencies**: Internal services (`CompanyIntelligenceService`, `generate_roadmap`).
* **Inputs**: Tool name (str), argument dictionary.
* **Outputs**: JSON string output.

### Service Interaction Diagram:

```text
[Frontend React App]
       │
       ▼ (HTTP REST APIs)
[FastAPI API Layer]
       │
       ├──► [Auth / Security Middleware]
       │
       ├──► [Resume API] ───► [ResumeParserService] ───► [Google Gemini API / Mock]
       │                            │
       │                            ▼
       │                     [PostgreSQL Database]
       │
       ├──► [Company API] ──► [CompanyIntelligenceService] ──► [Tavily Search API / Mock]
       │
       ├──► [Agent API] ────► [LangGraph Orchestrator]
       │                            │
       │                            ├──► [Resume Agent Node]
       │                            ├──► [Company Agent Node]
       │                            ├──► [Career Planner Node]
       │                            └──► [Interview Coach Node]
       │
       └──► [Memory API] ───► [MemoryService] ─────────► [PostgreSQL Database]
```

---

# 6. API Documentation

### 1. Register User
* **METHOD**: POST
* **PATH**: `/api/v1/auth/register`
* **PURPOSE**: Register a new user account.
* **REQUEST**: JSON Body `{"email": "user@example.com", "password": "securepassword"}`
* **RESPONSE**: `{"id": 1, "email": "user@example.com", "is_active": true, "created_at": "timestamp"}`
* **SERVICES INVOLVED**: `auth.py`, `security.py` (password hashing).
* **DATABASE QUERIES**: `SELECT users WHERE email = ?`, `INSERT INTO users`.
* **AI COMPONENTS**: None.

### 2. Login User
* **METHOD**: POST
* **PATH**: `/api/v1/auth/login`
* **PURPOSE**: Authenticate user and issue JWT token.
* **REQUEST**: Form Data `username=user@example.com&password=securepassword`
* **RESPONSE**: `{"access_token": "<jwt_string>", "token_type": "bearer"}`
* **SERVICES INVOLVED**: `auth.py`, `security.py` (password verification).
* **DATABASE QUERIES**: `SELECT users WHERE email = ?`.
* **AI COMPONENTS**: None.

### 3. Get Current User Profile
* **METHOD**: GET
* **PATH**: `/api/v1/auth/me`
* **PURPOSE**: Retrieve authenticated user details.
* **REQUEST**: Bearer Token in `Authorization` header.
* **RESPONSE**: User json object.
* **SERVICES INVOLVED**: `deps.py` (`get_current_user`).
* **DATABASE QUERIES**: `SELECT users WHERE id = ?`.
* **AI COMPONENTS**: None.

### 4. Upload Resume
* **METHOD**: POST
* **PATH**: `/api/v1/resume/upload`
* **PURPOSE**: Upload resume file (PDF/DOCX/TXT), parse structured content via Gemini, save to DB.
* **REQUEST**: Multipart file upload (`UploadFile`).
* **RESPONSE**: Structured `ResumeSchema` JSON object.
* **SERVICES INVOLVED**: `resume.py`, `ResumeParserService`.
* **DATABASE QUERIES**: `INSERT INTO resumes`.
* **AI COMPONENTS**: Google Gemini 1.5 Flash LLM.

### 5. Get Latest Resume
* **METHOD**: GET
* **PATH**: `/api/v1/resume/latest`
* **PURPOSE**: Retrieve the most recently uploaded and parsed resume for current user.
* **REQUEST**: Bearer Token.
* **RESPONSE**: `ResumeSchema` JSON object.
* **SERVICES INVOLVED**: `resume.py`.
* **DATABASE QUERIES**: `SELECT resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`.
* **AI COMPONENTS**: None.

### 6. Get Company Insights
* **METHOD**: GET
* **PATH**: `/api/v1/company/{company_name}`
* **PURPOSE**: Retrieve company tech stack, interview loop details, and hiring trends.
* **REQUEST**: Path parameter `company_name`.
* **RESPONSE**: JSON object with tech stack and process details.
* **SERVICES INVOLVED**: `company.py`, `CompanyIntelligenceService`.
* **DATABASE QUERIES**: None.
* **AI COMPONENTS**: Tavily Web Search API / Heuristic NLP.

### 7. Post Agent Query
* **METHOD**: POST
* **PATH**: `/api/v1/agent/query`
* **PURPOSE**: Execute conversational multi-agent workflow on user query.
* **REQUEST**: `{"message": "What skills am I missing for a Backend Engineer role?"}`
* **RESPONSE**: `{"response": "<formatted_text>", "current_agent": "career_planner"}`
* **SERVICES INVOLVED**: `agent.py`, `orchestrator.py` (LangGraph).
* **DATABASE QUERIES**: `SELECT resumes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`.
* **AI COMPONENTS**: LangGraph orchestrator, specialized agent nodes.

### 8. Create User Memory
* **METHOD**: POST
* **PATH**: `/api/v1/memory/`
* **PURPOSE**: Add user preference or context memory.
* **REQUEST**: `{"category": "goal", "memory_text": "Targeting senior roles in SF", "meta_data": {}}`
* **RESPONSE**: Created memory object.
* **SERVICES INVOLVED**: `memory.py`, `MemoryService`.
* **DATABASE QUERIES**: `INSERT INTO user_memories`.
* **AI COMPONENTS**: None.

### 9. Get User Memories
* **METHOD**: GET
* **PATH**: `/api/v1/memory/`
* **PURPOSE**: List all memories for current user.
* **REQUEST**: Bearer token.
* **RESPONSE**: List of memory objects.
* **SERVICES INVOLVED**: `memory.py`, `MemoryService`.
* **DATABASE QUERIES**: `SELECT user_memories WHERE user_id = ?`.
* **AI COMPONENTS**: None.

### 10. List MCP Tools
* **METHOD**: GET
* **PATH**: `/api/v1/mcp/tools`
* **PURPOSE**: Expose available MCP tools.
* **REQUEST**: Bearer token.
* **RESPONSE**: List of MCP tool schemas.
* **SERVICES INVOLVED**: `mcp.py`, `ACEMCPServer`.
* **DATABASE QUERIES**: None.
* **AI COMPONENTS**: None.

### 11. Execute MCP Tool
* **METHOD**: POST
* **PATH**: `/api/v1/mcp/execute`
* **PURPOSE**: Execute an MCP tool by name.
* **REQUEST**: `{"name": "get_company_info", "arguments": {"company_name": "Google"}}`
* **RESPONSE**: `{"result": {...}}`
* **SERVICES INVOLVED**: `mcp.py`, `ACEMCPServer`.
* **DATABASE QUERIES**: Indirect service queries.
* **AI COMPONENTS**: Dynamic agent tool calls.

### 12. Get Dashboard Analytics
* **METHOD**: GET
* **PATH**: `/api/v1/analytics/dashboard`
* **PURPOSE**: Aggregate metrics for application funnel, interview scores, and timelines.
* **REQUEST**: Bearer token.
* **RESPONSE**: `{"funnel": {...}, "average_interview_score": 75.0, "total_sessions": 2, "activity_timeline": [...]}`
* **SERVICES INVOLVED**: `analytics.py`.
* **DATABASE QUERIES**: `SELECT application.status, COUNT(...) GROUP BY status`, `SELECT AVG(...) FROM interview_sessions`.
* **AI COMPONENTS**: None.

---

# 7. Database Documentation

### Entity-Relationship Diagram (Textual Representation)

```text
  ┌──────────┐       1:1       ┌───────────┐
  │  users   ├────────────────►│  profiles │
  └────┬─────┘                 └───────────┘
       │
       │ 1:N
       ├──────────────────────►┌───────────┐
       │                       │  resumes  │
       │                       └───────────┘
       │ 1:N
       ├──────────────────────►┌──────────────┐
       │                       │ applications │
       │                       └──────────────┘
       │ 1:N
       ├──────────────────────►┌────────────────────┐       1:N       ┌────────────────────┐
       │                       │ interview_sessions ├────────────────►│ interview_feedbacks│
       │                       └────────────────────┘                 └────────────────────┘
       │ 1:N
       ├──────────────────────►┌─────────────────┐
       │                       │  user_memories  │
       │                       └─────────────────┘
       │ 1:N
       ├──────────────────────►┌─────────────────┐
       │                       │ agent_executions│
       │                       └─────────────────┘
       │ 1:N
       └──────────────────────►┌─────────────────┐
                               │ recommendations │
                               └─────────────────┘

  ┌───────────┐       1:N      ┌───────────┐
  │ companies ├───────────────►│   jobs    │
  └───────────┘                └───────────┘
```

### Table Definitions:

#### 1. `users`
* **Purpose**: Core authentication user table.
* **Fields**: `id` (INT, PK), `email` (STR, UNIQUE, INDEX), `hashed_password` (STR), `is_active` (BOOL), `is_superuser` (BOOL), `created_at` (DATETIME).
* **Relationships**: Has one `Profile`, has many `Resumes`, `Applications`, `InterviewSessions`, `UserMemories`, `AgentExecutions`, `Recommendations`.
* **Indexes**: Primary key `id`, unique index on `email`.
* **Lifecycle**: Created on signup, soft-disabled via `is_active=False`.

#### 2. `profiles`
* **Purpose**: User career preferences and aggregate score.
* **Fields**: `id` (INT, PK), `user_id` (INT, FK -> users.id), `bio` (STR), `target_role` (STR), `overall_score` (INT), `skills_json` (JSON), `updated_at` (DATETIME).
* **Relationships**: Belongs to `User`.
* **Lifecycle**: Created automatically upon first resume parse or onboarding.

#### 3. `resumes`
* **Purpose**: Stores uploaded raw resume text and parsed JSON output.
* **Fields**: `id` (INT, PK), `user_id` (INT, FK -> users.id), `file_name` (STR), `raw_text` (STR), `parsed_data` (JSON), `created_at` (DATETIME).
* **Relationships**: Belongs to `User`.
* **Indexes**: PK `id`, FK `user_id`.

#### 4. `companies`
* **Purpose**: Cache for fetched company intelligence.
* **Fields**: `id` (INT, PK), `name` (STR, UNIQUE, INDEX), `industry` (STR), `website` (STR), `tech_stack` (JSON), `interview_process` (STR), `hiring_trends` (STR), `salary_info` (JSON).
* **Relationships**: Has many `Jobs`.

#### 5. `jobs`
* **Purpose**: Target job postings for matching.
* **Fields**: `id` (INT, PK), `company_id` (INT, FK -> companies.id), `title` (STR, INDEX), `description` (STR), `requirements` (JSON), `salary_range` (STR), `created_at` (DATETIME).

#### 6. `applications`
* **Purpose**: User application status tracker.
* **Fields**: `id` (INT, PK), `user_id` (INT, FK -> users.id), `company_name` (STR), `role_title` (STR), `status` (STR), `jd_text` (STR), `analysis` (JSON), `created_at` (DATETIME).

#### 7. `interview_sessions`
* **Purpose**: Active and historical mock interview sessions.
* **Fields**: `id` (INT, PK), `user_id` (INT, FK -> users.id), `role_title` (STR), `company_name` (STR), `questions` (JSON), `current_question_index` (INT), `transcript` (JSON), `feedback` (JSON), `is_completed` (BOOL), `created_at` (DATETIME).

#### 8. `interview_feedbacks`
* **Purpose**: Per-question/session feedback log.
* **Fields**: `id` (INT, PK), `user_id` (INT, FK), `session_id` (INT, FK -> interview_sessions.id), `score` (INT), `strengths` (STR), `weakness_areas` (JSON), `improvements` (JSON), `created_at` (DATETIME).

#### 9. `user_memories`
* **Purpose**: Long-term memory storage for multi-agent reasoning.
* **Fields**: `id` (INT, PK), `user_id` (INT, FK), `category` (STR), `memory_text` (STR), `meta_data` (JSON), `created_at` (DATETIME).

#### 10. `agent_executions`
* **Purpose**: Observability log for agent node runs, latencies, and output status.
* **Fields**: `id` (INT, PK), `user_id` (INT, FK), `agent_name` (STR), `input_data` (JSON), `output_data` (JSON), `latency_ms` (INT), `status` (STR), `created_at` (DATETIME).

---

# 8. Storage Architecture

* **PostgreSQL (via AsyncPG / SQLAlchemy)**: Primary relational data store for all persistent entities (`users`, `resumes`, `applications`, `memories`). Stores both relational FK data and semi-structured documents in PostgreSQL JSON columns (`parsed_data`, `skills_json`, `transcript`).
* **SQLite (`aiosqlite`)**: Used as default local development database fallback (`DATABASE_URL = "postgresql+asyncpg://..."` or local SQLite connection).
* **Redis Usage**: Currently not active in code (listed in roadmap for agent session caching and rate-limiting).
* **Object Storage**: Currently stores raw text content directly in database `raw_text` columns. Large binary blob storage (AWS S3 or Google Cloud Storage) planned for production deployment.
* **Vector DB Usage**: Currently mocked / in memory; planned integration with Qdrant/Pinecone for semantic memory retrieval.

---

# 9. Workflow Documentation

## 1. Resume Upload Workflow

```text
User Action (Upload File on ResumePage)
  │
  ▼
Frontend Form Data (`resumeApi.upload`)
  │
  ▼
API Endpoint (`POST /api/v1/resume/upload`)
  │
  ▼
ResumeParserService (`parse_resume`)
  │
  ├─► [Google Gemini API] (Structured JSON Schema generation)
  │         OR
  └─► [_mock_parse] (Fallback regex/line parsing)
  │
  ▼
SQLAlchemy ORM (`Resume` model creation)
  │
  ▼
PostgreSQL Database (`INSERT INTO resumes`)
  │
  ▼
API Response (`ResumeSchema` JSON to Frontend)
```

* **Sequence Details**: Frontend submits file -> Backend decodes text -> Gemini extracts schema -> DB stores record -> Frontend renders scores and radar chart.

---

## 2. Multi-Agent Query Routing Workflow

```text
User Input ("Create a learning roadmap for Backend Engineer")
  │
  ▼
API Endpoint (`POST /api/v1/agent/query`)
  │
  ▼
Fetch Latest Resume (`SELECT resumes WHERE user_id = ?`)
  │
  ▼
Initialize AgentState (`messages`, `resume_data`, `current_agent`)
  │
  ▼
LangGraph StateGraph (`orchestrator_node`)
  │
  ├──► Query contains "roadmap"/"learn"? ──► `career_planner_node`
  ├──► Query contains "resume"/"match"?  ──► `resume_node`
  ├──► Query contains "company"/"hiring"?──► `company_node`
  └──► Query contains "mock"/"coach"?   ──► `interview_coach_node`
  │
  ▼
Execute Specialized Node Tool Function
  │
  ▼
Update AgentState & Set `next_step = END`
  │
  ▼
Return Response & Active Agent Name to Frontend UI
```

---

## 3. Company Intelligence Research Workflow

```text
User Request (`GET /api/v1/company/Google`)
  │
  ▼
CompanyIntelligenceService (`get_company_insights`)
  │
  ├─► [Tavily Client Search] ("Google engineering tech stack interview process")
  │         │
  │         ▼
  │    Extract Snippets & Web Sources
  │         │
  │         ▼
  │    Run Regex Skill Extraction Heuristics
  │
  └─► [Mock Fallback] (If TAVILY_API_KEY missing)
  │
  ▼
Return Consolidated JSON Insights to Frontend View
```

---

## 4. Authentication Workflow

```text
User Submits Login Credentials
  │
  ▼
API Endpoint (`POST /api/v1/auth/login`)
  │
  ▼
Query DB User (`SELECT users WHERE email = ?`)
  │
  ▼
Verify Password (`passlib.bcrypt.verify`)
  │
  ▼
Create JWT Token (`jose.jwt.encode` with 7-day expiration)
  │
  ▼
Return Token -> Frontend Stores in Zustand (`ace-auth` in localStorage)
  │
  ▼
Axios Interceptor attaches `Authorization: Bearer <token>` to future requests
```

---

# 10. AI Documentation

### 1. Resume Schema Extractor
* **Purpose**: Parse raw unstructured text into typed Pydantic models (`PersonalInfo`, `WorkExperience`, `Education`, `Project`).
* **Trigger Conditions**: Triggered on resume file upload on `/resume` page.
* **Inputs**: Plain text resume string.
* **Prompt Flow**: System instructs model to extract details and conform strictly to Pydantic JSON schema.
* **Models Used**: Google Gemini 1.5 Flash (`gemini-1.5-flash`).
* **Tools Used**: Gemini Native Structured Output (`response_mime_type="application/json"`).
* **Memory Used**: Stateless per file upload.
* **Why AI Was Introduced**: Traditional rule-based resume parsers fail on varying PDF layouts and diverse bullet point formats.

### 2. Company Research Agent
* **Purpose**: Aggregate live tech stack details and interview process stages for targeted companies.
* **Trigger Conditions**: Triggered on `/companies` search or natural language agent queries.
* **Inputs**: Company name string (e.g. "Observe.ai", "Google").
* **Prompt Flow**: Formulates search query strings -> Parses snippet text.
* **Tools Used**: Tavily Web Search API (`tavily-python`).
* **Why AI Was Introduced**: Company technology stacks and hiring processes change dynamically and cannot be maintained in static databases.

### 3. Career Planner Agent
* **Purpose**: Compare user current skills against target role requirements and build a 3-phase execution roadmap.
* **Trigger Conditions**: Chat queries containing "roadmap", "learn", "skills gap".
* **Inputs**: User skills array, target role string.
* **Tools Used**: Custom roadmap generator tool (`generate_roadmap`).
* **Why AI Was Introduced**: Provides personalized, skill-gap-aware timeline estimates rather than generic static articles.

### 4. Mock Interview Coach Agent
* **Purpose**: Generate tailored technical interview questions and grade user responses using the STAR method.
* **Trigger Conditions**: Chat queries containing "mock", "question", "coach", "answer".
* **Inputs**: Role title, tech stack list, user answer text.
* **Tools Used**: `generate_interview_questions`, `evaluate_interview_answer`.
* **Why AI Was Introduced**: Offers interactive feedback on qualitative textual interview answers.

---

# 11. Agent Documentation

### Orchestrator Agent (`orchestrator.py`)

* **Goal**: Inspect user query intent and route control flow to the relevant specialized agent.
* **Responsibilities**: Intent classification, state initialization, transition routing.
* **Inputs**: `AgentState` containing message list, user ID, latest resume data.
* **Outputs**: Updated `AgentState` with selected `current_agent` and `next_step`.
* **Internal Workflow**:
  1. Inspects last user message text.
  2. Evaluates keyword match sets (`["resume", "cv"]`, `["company", "hiring"]`, `["roadmap", "skill"]`, `["mock", "question"]`).
  3. Returns target node name (`resume_agent`, `company_agent`, `career_planner`, `interview_coach`).
* **Tools Used**: LangGraph `StateGraph`.
* **Memory Used**: Ephemeral graph state (`AgentState`).
* **Planning Steps**: Keyword intent classification -> Conditional edge transition -> Node execution -> Termination (`END`).
* **LangGraph Nodes**:
  - `orchestrator` (entry point)
  - `resume_agent`
  - `company_agent`
  - `career_planner`
  - `interview_coach`
* **State Objects** (`AgentState` in `state.py`):
  ```python
  class AgentState(TypedDict):
      messages: List[Dict[str, Any]]
      user_id: int
      resume_data: Dict[str, Any]
      company_data: Dict[str, Any]
      roadmap_data: Dict[str, Any]
      interview_data: Dict[str, Any]
      current_agent: str
      next_step: str
  ```
* **Why Classified as an Agent**: Uses dynamic conditional graph edges to decide execution paths based on runtime user state and message inputs rather than static sequential code execution.

```text
               ┌─────────────────┐
               │  Entry Point    │
               │  (orchestrator) │
               └────────┬────────┘
                        │
             ┌──────────┴──────────┐ (Conditional Edge Routing)
             │                     │
   ┌─────────▼────────┐  ┌─────────▼────────┐  ┌─────────────────┐  ┌─────────────────┐
   │   resume_agent   │  │  company_agent   │  │ career_planner  │  │ interview_coach │
   └─────────┬────────┘  └─────────┬────────┘  └────────┬────────┘  └────────┬────────┘
             │                     │                    │                    │
             └─────────────────────┴──────────┬─────────┴────────────────────┘
                                              │
                                              ▼
                                           [ END ]
```

---

# 12. Complexity Analysis

### 1. Areas Using AI
* Structured resume parsing (`ResumeParserService` via Gemini 1.5 Flash).
* Question scoring and STAR feedback generation (`interview_coach.py`).

### 2. Areas Using Deterministic Logic
* Authentication (JWT encoding/decoding, bcrypt password hashing in `security.py`).
* Keyword-based router fallback in Orchestrator (`orchestrator_node`).
* Database query filters and analytics aggregation (`analytics.py`).

### 3. Areas Using Agents
* LangGraph stateful graph router executing specialized domain nodes (`orchestrator.py`).

### 4. Areas Using Workflows
* Multi-stage resume upload -> parse -> save database transaction flow (`resume.py`).

### 5. Areas Using Caching
* React Query (`@tanstack/react-query`) frontend client-side stale-time caching (30s default).

### 6. Areas Using Background Processing
* FastAPI lifespan event startup initialization for database schema creation.

---

# 13. Deployment Architecture

* **Local Setup**:
  - Backend: `cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000`
  - Frontend: `cd frontend && npm run dev` (Vite dev server running on port 5173).
* **Docker Setup**:
  - `docker-compose.yml` orchestrates backend FastAPI container (built via `backend/Dockerfile`) and PostgreSQL container.
* **Environment Variables (`.env`)**:
  - `API_V1_STR`: `/api/v1`
  - `PROJECT_NAME`: `A.C.E. (Autonomous Career Intelligence Engine)`
  - `SECRET_KEY`: Security signing key.
  - `DATABASE_URL`: `postgresql+asyncpg://postgres:postgres@localhost:5432/ace`
  - `GEMINI_API_KEY`: API Key for Google Gemini LLM.
  - `TAVILY_API_KEY`: API Key for Tavily web search.

---

# 14. Security Architecture

* **Authentication**: OAuth2 Password bearer token authentication via JWT (`python-jose`). Tokens expire in 7 days.
* **Authorization**: FastAPI dependency injection (`get_current_user` in `deps.py`) decodes JWT headers, validates expiration, and injects DB `User` model into protected route parameters.
* **Password Hashing**: Bcrypt algorithm via Passlib (`pwd_context = CryptContext(schemes=["bcrypt"])`).
* **CORS Middleware**: Explicit origin authorization whitelist configured in `config.py` (`http://localhost:3000`, `http://localhost:5173`).
* **Frontend Guard Rails**: `authApi` automatically clears local storage session state on 401 Unauthorized responses.

---

# 15. Observability

* **Logging**: Standard Python `logging` module configured across services (`logger = logging.getLogger(__name__)`).
* **Agent Executions Table**: DB entity `AgentExecution` records execution latency (`latency_ms`), status (`success`/`failure`), and input/output JSON payloads for agent operations.
* **Monitoring**: Not Implemented
* **Tracing**: Not Implemented
* **Analytics**: Basic SQL group-by funnel metrics exposed at `/analytics/dashboard`.

---

# 16. Current Problems & Limitations

1. **Orchestrator Keyword Matching**: The MVP orchestrator node relies on basic keyword matching (`if "resume" in message: ...`) rather than LLM-driven zero-shot function calling for node selection.
2. **Resume Binary Parsing**: Binary PDF files are decoded using loose string decoders (`latin-1`) in `resume.py` rather than explicit PDF layout parsing libraries (`pdfplumber` or `pypdf`).
3. **Database Fallback**: Default SQLite configuration in local environment lacks true vector similarity search capability.
4. **Bypass Token in Frontend Store**: `authStore.ts` initializes with a dummy token default (`token: "dummy-bypass-token"`) for UI preview convenience, which must be sanitized before production launch.

---

# 17. Future Roadmap

1. **LLM-Based Intent Classifier**: Upgrade orchestrator node to use structured tool calling via Gemini 1.5 for complex multi-intent queries.
2. **Vector DB Integration**: Integrate Qdrant / PgVector for semantic search across stored user memories and past interview answers.
3. **Real-time Voice Mock Interviews**: WebRTC / WebSockets integration for real-time vocal mock interview coaching.
4. **Auto-Application Agent**: Autonomous browser agent (via Playwright / Puppeteer) to fill job application forms automatically.

---

# FINAL REQUIREMENT ANALYSIS

# Potential Overengineering Areas
* **Model Context Protocol (MCP) Server for Simple Local APIs**: `ACEMCPServer` in `app/mcp/server.py` wraps simple Python service functions into MCP tool schemas when standard FastAPI endpoint functions already expose the same functionality.

# Potential Redundant Components
* **Dual Keyword Matching Logic**: Keyword parsing is performed in `orchestrator.py` as well as inside individual agent nodes (e.g. `resume_node` checking `"match" in query`), creating duplicated conditional parsing logic.
* **Separate `InterviewFeedback` Table**: `interview_feedbacks` table duplicates fields already present in `interview_sessions.feedback` JSON columns.

# Components That Might Be Agents
* **Resume Matcher (`match_resume_to_job`)**: Currently implemented as a heuristic tool function inside `resume_agent.py`; could be transformed into an autonomous iterative agent that rewrites bullet points to maximize ATS score.

# Components That Might Only Be Services
* **Current `career_planner` Node**: Uses a static dictionary mapping (`all_role_skills`) inside a tool function; currently functions as a deterministic lookup service rather than a reasoning agent.

# Components That Might Be Simple Workflows
* **`company_agent` Node**: Executes a single Tavily API search and formats string output; currently acts as a linear single-step workflow rather than an agent with cyclic decision loops.
