A.C.E. — JOB INTELLIGENCE PAGE

==============================



INHERIT the existing ACE design system.



This page is the user's opportunity discovery and job-fit workspace.



It must NOT look like LinkedIn or a generic job board.



The core ACE differentiator is understanding:



"Why does this opportunity fit me?"



============================================================

WIREFRAME

============================================================



┌──────────────────────────────────────────────────────────────────────┐

│ Job Intelligence                              \[Search Jobs]          │

│ Discover opportunities aligned with your career profile.             │

│                                                                      │

│ ┌──────────────────────────────────────────────────────────────────┐ │

│ │ Search jobs...                                    🔍              │ │

│ └──────────────────────────────────────────────────────────────────┘ │

│                                                                      │

│ \[Role ▾] \[Location ▾] \[Remote ▾] \[Experience ▾] \[Match >80% ▾]     │

│                                                                      │

│ ┌──────────────────────────────────────────────────────────────────┐ │

│ │ Razorpay                                            92% MATCH    │ │

│ │ Senior Backend Engineer                                            │ │

│ │ Remote · Full-time                                                 │ │

│ │                                                                  │ │

│ │ Strong semantic alignment                                         │ │

│ │ ████████████████████                                             │ │

│ │                                                                  │ │

│ │ Python ✓   Distributed Systems ✓   Kubernetes ⚠                 │ │

│ │                                                                  │ │

│ │ \[View Match Analysis]                             \[Apply]        │ │

│ └──────────────────────────────────────────────────────────────────┘ │

│                                                                      │

│ ┌──────────────────────────────────────────────────────────────────┐ │

│ │ Swiggy                                              87% MATCH    │ │

│ │ Backend Engineer                                                  │ │

│ │ Bangalore · Full-time                                             │ │

│ │                                                                  │ │

│ │ \[View Match Analysis]                             \[Apply]        │ │

│ └──────────────────────────────────────────────────────────────────┘ │

└──────────────────────────────────────────────────────────────────────┘



============================================================

JOB ROW

============================================================



Each job must show:



Company

Role

Location

Work mode

Employment type

Semantic match score

Matched skills

Missing skills

Primary action



Use restrained visual hierarchy.



============================================================

MATCH ANALYSIS DRAWER

============================================================



When "View Match Analysis" is clicked, open a side drawer.



Show:



MATCH SCORE

92%



WHY YOU MATCH

Python

FastAPI

Distributed Systems



SKILL GAPS

Kubernetes

gRPC



RECOMMENDED NEXT STEP

Strengthen Kubernetes before applying.



Actions:



\[View Skill Roadmap]

\[Ask ACE]



This drawer should be one of the strongest UX moments on the page.



============================================================

IMPORTANT DATA RULE

============================================================



Inspect the existing backend.



The current README does not document a dedicated job-search endpoint.



DO NOT invent:



/jobs

/search/jobs

/job-discovery



unless the repository actually contains them.



If job discovery is not yet implemented:



create a typed frontend adapter with clearly isolated temporary mock data.



Do not mix mock data into production API services.



============================================================

DESIGN

============================================================



The page should feel:



professional

information-dense but breathable

analytical

trustworthy



Avoid giant job cards.



Use compact rows with strong alignment.



============================================================

RESPONSIVE

============================================================



Desktop:

filter bar + list



Tablet:

stack filters



Mobile:

filter drawer

stack job cards



============================================================

FINAL QUALITY

============================================================



This must feel like:



"career opportunity intelligence"



not:



"job listing website."



Generate → critique → iterate → implement → verify.

