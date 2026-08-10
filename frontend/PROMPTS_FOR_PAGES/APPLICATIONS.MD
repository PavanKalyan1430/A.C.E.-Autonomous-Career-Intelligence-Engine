A.C.E. — APPLICATION TRACKER

=============================



INHERIT the ACE design system.



Create a premium application-management workspace.



This should feel like a professional recruiting CRM, not a spreadsheet.



============================================================

WIREFRAME

============================================================



┌──────────────────────────────────────────────────────────────────────┐

│ Applications                                  \[+ Add Application]   │

│ Track your career pipeline in one place.                            │

│                                                                      │

│ All 23    Applied 14    Interview 4    Offer 1    Rejected 4        │

│                                                                      │

│ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌──────────────────┐  │

│ │ APPLIED    │ │ INTERVIEW  │ │ OFFER      │ │ REJECTED         │  │

│ │            │ │            │ │            │ │                  │  │

│ │ Razorpay   │ │ Swiggy     │ │ Atlassian  │ │ Google           │  │

│ │ Backend    │ │ Backend    │ │ SWE        │ │ SWE              │  │

│ │ 92% Match  │ │ 87% Match  │ │ 84% Match  │ │ 81% Match        │  │

│ │            │ │            │ │            │ │                  │  │

│ │ ...        │ │ ...        │ │ ...        │ │ ...              │  │

│ └────────────┘ └────────────┘ └────────────┘ └──────────────────┘  │

└──────────────────────────────────────────────────────────────────────┘



============================================================

KANBAN

============================================================



Columns:



Applied

Interviewing

Offer

Rejected



Use the existing ApplicationStatus enum.



Cards:



Company

Role

Match score

Date

Next action



Do not overload cards.



============================================================

APPLICATION DETAIL

============================================================



Clicking an application opens a side drawer.



Show:



Company

Role

Application date

Current status

Semantic match

Skill gaps

Interview history

Notes

Next action



Actions:



Move status

Edit

Delete

Prepare with ACE



============================================================

ADD APPLICATION

============================================================



Create a polished modal.



Fields:



Company

Role

Job description

Application date

Status



If job description exists, trigger the existing semantic match capability where supported.



============================================================

EMPTY STATE

============================================================



"No applications yet."



"Start tracking your applications to build your career pipeline."



\[Add Application]



============================================================

API

============================================================



Use:



POST /api/v1/applications/

GET /api/v1/applications/

PATCH /api/v1/applications/{id}

DELETE /api/v1/applications/{id}



Use actual backend schemas.



============================================================

RESPONSIVE

============================================================



Desktop:

Kanban



Tablet:

horizontal scroll with clear columns



Mobile:

status tabs + stacked application cards



Do not allow the entire page to overflow horizontally.



============================================================

QUALITY

============================================================



Professional.

Compact.

Workflow-focused.



Generate → critique → iterate → implement → verify.

