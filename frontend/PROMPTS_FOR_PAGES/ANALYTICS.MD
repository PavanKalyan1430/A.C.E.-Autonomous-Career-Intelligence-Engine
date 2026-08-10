A.C.E. — CAREER ANALYTICS

==========================



INHERIT the ACE design system.



This is NOT a generic business intelligence dashboard.



It is a career-performance analytics workspace.



============================================================

WIREFRAME

============================================================



┌──────────────────────────────────────────────────────────────────────┐

│ Career Analytics                              \[Last 30 Days ▾]       │

│ Understand how your career preparation is progressing.              │

│                                                                      │

│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐ │

│ │ 23         │ │ 9          │ │ 4          │ │ 82%                │ │

│ │ Applied    │ │ Responses  │ │ Interviews │ │ Avg Match          │ │

│ └────────────┘ └────────────┘ └────────────┘ └────────────────────┘ │

│                                                                      │

│ ┌──────────────────────────────────────────────────────────────────┐ │

│ │ APPLICATION FUNNEL                                                │ │

│ │                                                                  │ │

│ │ Applied       ███████████████████████ 23                         │ │

│ │ Screening     █████████              9                           │ │

│ │ Interview     ████                   4                           │ │

│ │ Offer         █                      1                           │ │

│ └──────────────────────────────────────────────────────────────────┘ │

│                                                                      │

│ ┌───────────────────────────────┐ ┌────────────────────────────────┐ │

│ │ INTERVIEW SCORE TREND         │ │ APPLICATION ACTIVITY           │ │

│ │                               │ │                                │ │

│ │       ╭──────╮                │ │       ▂ ▅ ▆ █ ▆                │ │

│ │  ─────╯      ╰──              │ │                                │ │

│ └───────────────────────────────┘ └────────────────────────────────┘ │

│                                                                      │

│ ┌──────────────────────────────────────────────────────────────────┐ │

│ │ CAREER INSIGHT                                                   │ │

│ │                                                                  │ │

│ │ Your interview performance has improved consistently over the    │ │

│ │ last 30 days. System Design remains your highest-impact area.    │ │

│ └──────────────────────────────────────────────────────────────────┘ │

└──────────────────────────────────────────────────────────────────────┘



============================================================

METRICS

============================================================



Use actual available backend metrics.



Examples:



Applications

Responses

Interviews

Offers

Average semantic match

Interview score trend



Do not fabricate metrics.



============================================================

CHART DESIGN

============================================================



Use restrained blue-family visualization.



Primary:

Electric Blue



Secondary:

Deep Blue



AI/insight:

Cyan



Do not use rainbow charts.



Charts should have:



minimal gridlines

clear labels

good whitespace

accessible tooltips

responsive behavior



============================================================

DATE FILTER

============================================================



Provide:



7 days

30 days

90 days

All time



Only enable ranges supported by backend.



============================================================

API

============================================================



Use:



GET /api/v1/analytics/dashboard



Inspect actual response structure.



============================================================

QUALITY

============================================================



The page should answer:



Am I improving?



What is working?



Where am I losing opportunities?



What should I improve next?



It should feel like career intelligence, not business reporting.



Generate → critique → iterate → implement → verify.

