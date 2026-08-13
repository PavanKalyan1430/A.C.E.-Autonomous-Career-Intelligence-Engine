A.C.E. — RESUME INTELLIGENCE PAGE
==================================

INHERIT the existing ACE design system and AppShell.

Do NOT redesign the global navigation, colors or typography.

Use Stitch MCP to generate and iterate this page.

This page must feel like a professional resume intelligence workspace, not an ATS checker.

============================================================
PAGE WIREFRAME
============================================================

┌──────────────────────────────────────────────────────────────────────┐
│ Resume Intelligence                              [Upload Resume]    │
│ Analyze your resume and understand where you stand.                 │
│                                                                      │
│ ┌────────────────────────────┐ ┌─────────────────────────────────┐ │
│ │                            │ │ RESUME HEALTH                    │ │
│ │                            │ │                                 │ │
│ │      RESUME PREVIEW        │ │ Overall Score        84 / 100  │ │
│ │                            │ │                                 │ │
│ │      PDF DOCUMENT          │ │ Structure             Strong    │ │
│ │                            │ │ Impact                Strong    │ │
│ │                            │ │ Skills                88%      │ │
│ │                            │ │                                 │ │
│ │                            │ │ [View Detailed Analysis]       │ │
│ └────────────────────────────┘ └─────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ SEMANTIC JOB MATCH                                               │ │
│ │                                                                  │ │
│ │ Backend Engineer · Razorpay                         92%          │ │
│ │ Senior SWE · Swiggy                                  87%          │ │
│ │ Backend Engineer · Atlassian                         84%          │ │
│ │                                                                  │ │
│ │ [Compare with a Job Description]                                 │ │
│ └──────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ ┌─────────────────────────────┐ ┌─────────────────────────────────┐ │
│ │ STRENGTHS                   │ │ IMPROVEMENT AREAS               │ │
│ │                             │ │                                 │ │
│ │ ✓ Distributed Systems       │ │ ! Kubernetes                    │ │
│ │ ✓ Python                    │ │ ! System Design                 │ │
│ │ ✓ FastAPI                   │ │ ! gRPC                          │ │
│ └─────────────────────────────┘ └─────────────────────────────────┘ │
│                                                                      │
│ ┌──────────────────────────────────────────────────────────────────┐ │
│ │ RESUME DETAILS                                                   │ │
│ │ Experience · Projects · Skills · Education · Achievements        │ │
│ └──────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘

============================================================
CORE FEATURES
============================================================

Resume upload:

Supported:
PDF
DOCX
TXT

Create an elegant drag-and-drop upload area.

Do not make it oversized.

Show:

Upload resume
or
Drag & drop

After upload:
show parsing progress.

Stages:

Uploading
Extracting text
Analyzing structure
Building semantic profile
Complete

============================================================
RESUME PREVIEW
============================================================

Provide a clean document preview panel.

Desktop:
document preview beside analysis

Mobile:
analysis first, preview accessible through tab/drawer.

============================================================
RESUME HEALTH
============================================================

Display:

Overall Score

84 / 100

Supporting dimensions:

Structure
Content impact
Skill coverage
Role alignment

Do not invent metrics if backend does not provide them.

Use available data only.

============================================================
SEMANTIC MATCH
============================================================

The key product differentiator is semantic matching.

Communicate:

"Semantic match"

rather than:

"Keyword ATS score"

Show match percentage with a subtle blue progress indicator.

Provide explanation:

"Your experience aligns semantically with the requirements of this role."

Avoid exaggerated AI claims.

============================================================
STRENGTHS
============================================================

Show extracted strengths.

Examples:

Distributed Systems
Python
FastAPI
PostgreSQL

Use compact tags/cards.

============================================================
IMPROVEMENT AREAS
============================================================

Show missing/weak areas.

Examples:

Kubernetes
System Design
gRPC

Each should have:

impact
optional explanation
CTA to Skill Roadmap

============================================================
COMPARE MODE
============================================================

Create a polished flow:

Resume → Select Job Description → Compare

Show:

Semantic Match
Matched Skills
Missing Skills
Strong Evidence
Potential Weaknesses

Do not create fake backend calls.

Inspect existing endpoints/services.

============================================================
EMPTY STATE
============================================================

If no resume:

"Upload your resume to unlock personalized career intelligence."

CTA:
Upload Resume

============================================================
API
============================================================

Use existing resume APIs:

POST /api/v1/resume/upload
GET /api/v1/resume/me

Use existing backend contracts.

============================================================
UX
============================================================

Make the experience feel analytical and trustworthy.

Do not use giant gauges.

Do not use excessive colors.

Use blue for scores and interaction.

Use cyan only for AI analysis/live processing.

============================================================
QUALITY
============================================================

Premium.
Precise.
Professional.
Document-centric.

Generate with Stitch, critique, iterate, implement and visually verify.