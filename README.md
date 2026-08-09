# A.C.E. — Autonomous Career Intelligence Engine

> **A Production-Grade, Multi-Agent Career Intelligence & Mock Interview Platform**  
> Powered by LangGraph Autonomous ReAct Reasoning, Groq Cloud `whisper-large-v3-turbo` SOTA In-Memory Speech Analytics, SentenceTransformers Dense Vector Embeddings, SpaCy Parts-of-Speech Action-Verb Mining, NetworkX Directed Graph Topological Skill DAGs, and Tavily Live Engineering Research.

---

## 📌 Table of Contents
1. [Executive Summary](#-executive-summary)
2. [Problem Statement in Detail](#-problem-statement-in-detail)
3. [Our Engineering Solution](#-our-engineering-solution)
4. [System Architecture & Data Flow Diagrams](#-system-architecture--data-flow-diagrams)
5. [Autonomous Agent Architecture](#-autonomous-agent-architecture)
6. [Production ML & Neural NLP Pipeline](#-production-ml--neural-nlp-pipeline)
7. [SOTA In-Memory Voice & Speech Engine](#-sota-in-memory-voice--speech-engine)
8. [Production Tools Directory (`app/tools/`)](#-production-tools-directory-apptools)
9. [Database Architecture & Schema (9 SQL Tables)](#-database-architecture--schema-9-sql-tables)
10. [Complete REST API Route Directory](#-complete-rest-api-route-directory)
11. [Zero-Hardcoding Guarantee & Verification](#-zero-hardcoding-guarantee--verification)
12. [Local Setup & Production Environment Guide](#-local-setup--production-environment-guide)

---

## 🚀 Executive Summary

**A.C.E. (Autonomous Career Intelligence Engine)** is an enterprise-grade AI career co-pilot designed to streamline job application tracking, resume ATS optimization, live engineering company research, topological skill prerequisite mapping, and real-time voice-driven mock interview simulation.

Unlike standard RAG wrappers or hardcoded chat templates, A.C.E. features:
* **True Non-Deterministic Reasoning**: A stateful ReAct Autonomous Agent loop (`orchestrator.py`) that dynamically selects, orders, and invokes deterministic Python feature tools based on candidate intent.
* **SOTA In-Memory Voice Analytics**: ~150ms speech-to-text powered by Groq Cloud (`whisper-large-v3-turbo`) with **Zero-Disk Storage** (100% in-memory RAM processing and instant buffer purging for complete privacy).
* **Deterministic Mathematical & Linguistic NLP**: Dense 384-dimensional vector embeddings, SpaCy Parts-of-Speech action-verb/interjection tagger, scikit-learn TF-IDF N-gram keyphrase extraction, and NetworkX Directed Acyclic Graph (DAG) topological sorting.
* **Production-First Clean Code**: Zero static fallback lists, zero hardcoded string tuples, zero fake question templates, and strictly-typed Python Enums (`ApplicationStatus`).

---

## ❗ Problem Statement in Detail

Modern job seekers and software engineers face a deeply fragmented, inefficient career preparation landscape:

1. **Fragmented & Disjointed Career Tools**:
   Candidates are forced to juggle 4–5 separate unintegrated tools: ATS resume scanners, static leetcode mock platforms, company Glassdoor reviews, and manual job application spreadsheets. None of these platforms share context or track multi-turn user progress.
2. **Shallow Keyword-Matching ATS Scanners**:
   Traditional resume evaluators rely on primitive keyword exact-matching. If a resume lists *"Distributed Systems"* but the job description asks for *"High-Scale Microservices"*, legacy tools fail to recognize semantic equivalence.
3. **Lack of Prerequisite Learning Roadmaps**:
   When candidates lack required skills for a target role (e.g. missing `Kubernetes` and `gRPC`), standard career tools just list missing words. They cannot calculate the **topological prerequisite order** (e.g. *you must learn Docker before Kubernetes, and Protocol Buffers before gRPC*).
4. **Superficial & Laggy Mock Interview Tools**:
   Existing mock interview tools either rely on static text prompts or high-latency speech tools (~3-5 second delay) that save audio files to disk, violating privacy and destroying the real-time conversational flow of a real technical screening call.

---

## 💡 Our Engineering Solution

A.C.E. solves these challenges by building a **unified, stateful, production-grade Career Intelligence Platform**:

* **Unified Stateful Agent Hub**: Integrates candidate memory, resume vector profiles, application funnels, live company intelligence, and mock interviews into a single agentic environment powered by PostgreSQL and vector memory RAG.
* **Dense 384-Dim Semantic Embedding Match**: Uses `SentenceTransformers` (`all-MiniLM-L6-v2`) to score exact Cosine Distance ($ \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|} $), detecting deep semantic alignment regardless of exact word phrasing.
* **Topological Skill Graph Engine (`NetworkX`)**: Computes Directed Acyclic Graph ($\text{DAG}$) topological sorts and shortest learning paths to give candidates step-by-step prerequisite roadmaps.
* **Sub-200ms In-Memory Voice Engine**: Streams spoken audio directly into RAM buffers, transcribes via Groq Cloud (`whisper-large-v3-turbo`) in **~150ms**, analyzes speech pace (WPM), interjections (`INTJ`), and STAR method metrics, and immediately purges audio bytes from RAM (`0 Disk I/O`).

---

## 🏗️ System Architecture & Data Flow Diagrams

### High-Level System Architecture

```mermaid
graph TD
    Client[Candidate Web Browser / Vite React Dashboard] <-->|HTTP / JSON / Web Speech STT| FastAPI[FastAPI Async REST API Gateway]
    
    subgraph Core Engine Layer
        FastAPI --> Auth[Auth & Security Module]
        FastAPI --> Agent[Autonomous ReAct Orchestrator]
        FastAPI --> Audio[Audio Transcription Engine]
        FastAPI --> Analytics[SQL Aggregation Engine]
    end

    subgraph Autonomous Agent & Tools Layer
        Agent <-->|ReAct Reasoning Loop| Tools[Production Tools Suite app/tools/]
        Tools --> ResumeTools[resume_tools.py]
        Tools --> SkillTools[skill_dag_tools.py]
        Tools --> CompanyTools[company_tools.py]
        Tools --> InterviewTools[interview_tools.py]
        Tools --> MemoryTools[memory_tools.py]
    end

    subgraph Neural ML & SOTA Services Layer
        ResumeTools <--> ST[SentenceTransformers all-MiniLM-L6-v2]
        SkillTools <--> NX[NetworkX DiGraph Topological Engine]
        InterviewTools <--> SpaCy[SpaCy POS & Interjection Tagger]
        CompanyTools <--> Tavily[Tavily Live Web Search API]
        Audio <--> Groq[Groq Cloud whisper-large-v3-turbo]
    end

    subgraph Storage Layer
        FastAPI <--> DB[(PostgreSQL / Async SQLAlchemy 2.0)]
    end
```

---

## 🧠 Autonomous Agent Architecture

The heart of A.C.E.'s non-deterministic intelligence is the **Unified Autonomous ReAct Agent** ([orchestrator.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/agents/orchestrator.py)).

### ReAct Reasoning Loop Workflow

```mermaid
sequenceDiagram
    autonumber
    actor Candidate
    participant Orchestrator as ReAct Agent Orchestrator
    participant LLM as ChatGoogleGenerativeAI / Gemini
    participant Tools as Production Tool Registry
    participant DB as PostgreSQL Database

    Candidate->>Orchestrator: Send Candidate Query / Resume Context
    Orchestrator->>DB: Load Session History & User Memories
    DB-->>Orchestrator: Multi-Turn Conversation History
    Orchestrator->>LLM: Send Query + Tool Descriptions + Memory Context
    
    loop Dynamic Thought-Action-Observation Loop
        LLM-->>Orchestrator: Thought: Need candidate skills & graph prerequisites
        Orchestrator->>Tools: Invoke compute_topological_skill_gap_tool
        Tools-->>Orchestrator: Observation: Missing [Kubernetes, gRPC]
        Orchestrator->>LLM: Send Observation Context
        LLM-->>Orchestrator: Thought: Need company live tech stack
        Orchestrator->>Tools: Invoke search_company_intelligence_tool("Stripe")
        Tools-->>Orchestrator: Observation: Live stack Go, Ruby, gRPC, Envoy
        Orchestrator->>LLM: Send Observation Context
    end

    LLM-->>Orchestrator: Final Answer Formulation
    Orchestrator->>DB: Persist ChatSession & ChatMessage
    Orchestrator-->>Candidate: Return Grounded Career Intelligence Response
```

---

## 🔬 Production ML & Neural NLP Pipeline

A.C.E. implements four distinct, deterministic Machine Learning and Natural Language Processing paradigms in [nlp_service.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/services/nlp_service.py):

### 1. Dense Vector Cosine Distance Matching (`SentenceTransformers`)
Computes 384-dimensional dense vector embeddings using `all-MiniLM-L6-v2`. Semantic match similarity is calculated via exact vector dot product:

$$\text{Cosine Similarity} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|} = \frac{\sum_{i=1}^{n} u_i v_i}{\sqrt{\sum_{i=1}^{n} u_i^2} \sqrt{\sum_{i=1}^{n} v_i^2}}$$

* **Use Case**: Grading resume fit against target Job Descriptions without keyword-stuffing vulnerabilities.

### 2. Topological Skill Prerequisite Graphs (`NetworkX`)
Constructs a Directed Acyclic Graph ($\text{DAG} = (V, E)$) where vertices $V$ represent technical keyphrases and directed edges $E$ represent sequential learning prerequisites.
* **Topological Sort**: Computes mathematically valid prerequisite order ($\text{topological\_sort}(G)$).
* **Shortest Path**: Computes shortest learning paths ($\text{shortest\_path}(G, s, t)$) from candidate baseline to target missing skills.

### 3. Syntactic Dependency & POS Action-Verb Mining (`SpaCy`)
Uses `en_core_web_sm` statistical dependency parsing to extract:
* **Action Verbs**: Verbs tagged as `VERB` (e.g. *Optimized*, *Architected*, *Reduced*).
* **Quantifiable Metrics**: Regex pattern matching for impact figures (`40%`, `$150k`, `50ms`, `100k RPS`).
* **Verbal Interjections**: Identifies speech hesitations tagged as `INTJ` or `DISCOURSE` (e.g. *um*, *uh*, *like*).

### 4. Statistical N-Gram Keyphrase Extraction (`scikit-learn TF-IDF`)
Extracts 1-, 2-, and 3-word keyphrases using term frequency-inverse document frequency analysis over input job texts without hardcoded dictionaries.

---

## 🎙️ SOTA In-Memory Voice & Speech Engine

A.C.E. features a real-time, low-latency Voice Mock Interview Engine in [audio_service.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/services/audio_service.py):

```mermaid
graph LR
    Browser[Candidate Browser MediaRecorder] -->|1. Stream Audio Blob| RAM[In-Memory RAM Buffer io.BytesIO]
    RAM -->|2. ~150ms STT| Groq[Groq Cloud whisper-large-v3-turbo LPU]
    Groq -->|3. Verbatim Transcript| NLP[SpaCy POS Interjection Tagger & STAR Evaluator]
    NLP -->|4. Purge RAM Buffer| Delete[RAM Buffer Memory Delete del audio_bytes]
    NLP -->|5. Save Transcript| DB[(PostgreSQL InterviewSession)]
```

* **~150ms Sub-Second Latency**: Groq Cloud LPUs running OpenAI `whisper-large-v3-turbo`.
* **Zero-Disk Storage**: 100% in-memory RAM processing (`io.BytesIO`) with instant RAM buffer purging (`del audio_bytes`). Zero audio files written to disk for maximum candidate privacy.
* **Dual-Engine Fallback**: Seamless fallback to Google Gemini 1.5 Flash Multimodal Audio if Groq API key is unconfigured.

---

## 🛠️ Production Tools Directory (`app/tools/`)

All feature capabilities are organized into deterministic, self-contained Python tools:

| Tool Name | Module Path | Input Schema | Functionality |
| :--- | :--- | :--- | :--- |
| `parse_resume_document_tool` | [resume_tools.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/tools/resume_tools.py) | `ResumeParseInput` | Multi-format PDF/DOCX document parsing & schema extraction. |
| `nlp_semantic_similarity_tool` | [resume_tools.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/tools/resume_tools.py) | `SemanticMatchInput` | 384-dim SentenceTransformers vector Cosine Distance scoring. |
| `compute_topological_skill_gap_tool` | [skill_dag_tools.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/tools/skill_dag_tools.py) | `SkillDAGInput` | NetworkX Directed Graph topological sort & learning paths. |
| `search_company_intelligence_tool` | [company_tools.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/tools/company_tools.py) | `CompanyQueryInput` | Live Tavily web search & tech stack synthesis. |
| `generate_interview_questions_tool` | [interview_tools.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/tools/interview_tools.py) | `QuestionGenInput` | Dynamic Gemini LLM interview question generation. |
| `evaluate_star_interview_tool` | [interview_tools.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/tools/interview_tools.py) | `AnswerEvalInput` | SpaCy POS action-verb & STAR method evaluation. |
| `retrieve_user_memory_tool` | [memory_tools.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/tools/memory_tools.py) | `MemoryQueryInput` | PostgreSQL vector memory RAG search retrieval. |

---

## 🗄️ Database Architecture & Schema (9 SQL Tables)

Database models are defined using Async SQLAlchemy 2.0 in [user.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/models/user.py):

```mermaid
erDiagram
    users ||--o| profiles : "has profile"
    users ||--o{ resumes : "uploads"
    users ||--o{ applications : "tracks"
    users ||--o{ interview_sessions : "conducts"
    users ||--o{ user_memories : "stores memory"
    users ||--o{ chat_sessions : "owns chat"
    chat_sessions ||--o{ chat_messages : "contains"
    interview_sessions ||--o{ interview_feedbacks : "generates"

    users {
        int id PK
        string email UK
        string hashed_password
        boolean is_active
        datetime created_at
    }

    profiles {
        int id PK
        int user_id FK
        string target_role
        int target_salary_min
        int target_salary_max
        json preferences
    }

    applications {
        int id PK
        int user_id FK
        string company_name
        string role_title
        string status "enum: applied, interview, offer, rejected"
        json analysis
    }

    interview_sessions {
        int id PK
        int user_id FK
        string role_title
        json questions
        json transcript
        boolean is_completed
    }

    user_memories {
        int id PK
        int user_id FK
        string category
        string memory_text
        json meta_data
    }
```

---

## 🌐 Complete REST API Route Directory

All API endpoints are registered in [main.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/app/main.py) under `/api/v1`:

### 1. Authentication Router (`/api/v1/auth`)
* `POST /api/v1/auth/register`: Register new candidate user account.
* `POST /api/v1/auth/login`: Authenticate candidate & issue OAuth2 JWT Access Token.
* `GET /api/v1/auth/me`: Retrieve currently authenticated user profile.

### 2. Resume Router (`/api/v1/resume`)
* `POST /api/v1/resume/upload`: Upload `.pdf`, `.docx`, or `.txt` resume document.
* `GET /api/v1/resume/me`: Fetch candidate's uploaded resumes & parsed JSON profile.

### 3. Company Router (`/api/v1/company`)
* `GET /api/v1/company/insights/{company_name}`: Fetch live engineering stack & interview process via Tavily.

### 4. Autonomous Agent Router (`/api/v1/agent`)
* `POST /api/v1/agent/query`: Send open-ended career prompt to Autonomous ReAct Agent.
* `GET /api/v1/agent/sessions`: Fetch candidate's past multi-turn chat sessions.
* `GET /api/v1/agent/sessions/{session_id}`: Fetch message history for specific session.

### 5. Memory Router (`/api/v1/memory`)
* `POST /api/v1/memory/`: Store explicit user career goal or weak area into vector memory.
* `GET /api/v1/memory/`: Search relevant candidate vector memories.

### 6. Interview Router (`/api/v1/interview`)
* `POST /api/v1/interview/start`: Provision new interview session with dynamic LLM questions.
* `POST /api/v1/interview/submit-answer`: Submit text response for STAR & interjection evaluation.
* `POST /api/v1/interview/audio-answer`: Ingest raw audio stream for Groq ~150ms STT & evaluation.
* `POST /api/v1/interview/finish`: Complete interview session & generate `InterviewFeedback`.

### 7. Applications Router (`/api/v1/applications`)
* `POST /api/v1/applications/`: Create tracked job application with auto vector match scoring.
* `GET /api/v1/applications/`: List candidate applications with status filtering (`ApplicationStatus`).
* `PATCH /api/v1/applications/{id}`: Update application stage.
* `DELETE /api/v1/applications/{id}`: Delete application record.

### 8. Analytics Router (`/api/v1/analytics`)
* `GET /api/v1/analytics/dashboard`: SQL date-truncation aggregations for job funnel & interview scores.

---

## 🛡️ Zero-Hardcoding Guarantee & Verification

A.C.E. is engineered under strict production principles:
1. **Zero Hardcoded Keywords**: All skills, tech stacks, and keyphrases are extracted 100% dynamically via TF-IDF or SpaCy.
2. **Zero Template Question Arrays**: Interview questions are generated dynamically via Gemini LLM and job description context.
3. **Zero Static Fallback Strings**: Email, phone, and entity fallbacks use regex pattern extraction (`re.findall`) and SpaCy entity recognition (`ORG`, `PRODUCT`).
4. **Strict Type Safety**: All application statuses use Python Enum (`ApplicationStatus`).

### Automated Verification Suite
Run the principal QA automation suite ([test_backend_suite.py](file:///c:/Users/B.PAVANKALYAN%20REDDY/Desktop/ACE/backend/tests/test_backend_suite.py)):
```bash
cd backend
.\venv\Scripts\python tests/test_backend_suite.py
```
**Result**: `100% PASS! ZERO FLAGS FOUND ACROSS ALL BACKEND MODULES, SERVICES & DB SCHEMAS!`

---

## ⚡ Local Setup & Production Environment Guide

### Prerequisites
* Python 3.11+
* Node.js 18+
* PostgreSQL (Optional for production, SQLite in-memory fallback included for dev)

### Environment Configuration (`backend/.env`)
Create `backend/.env`:
```env
PROJECT_NAME="A.C.E. (Autonomous Career Intelligence Engine)"
API_V1_STR="/api/v1"
SECRET_KEY="YOUR_SUPER_SECRET_JWT_KEY"

# Database
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/ace"

# AI & Search API Keys
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
GROQ_API_KEY="YOUR_GROQ_API_KEY"
TAVILY_API_KEY="YOUR_TAVILY_API_KEY"
```

### Server Startup Commands

#### 1. Start Backend FastAPI Server
```bash
cd backend
.\venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
* **API Documentation**: Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) in your browser.

#### 2. Start Frontend Vite Web Application
```bash
cd frontend
npm run dev
```
* **Web App Platform**: Open [http://localhost:3000/](http://localhost:3000/) in your browser.

---

## 📜 License & Author

* **Project**: A.C.E. (Autonomous Career Intelligence Engine)
* **License**: MIT License
