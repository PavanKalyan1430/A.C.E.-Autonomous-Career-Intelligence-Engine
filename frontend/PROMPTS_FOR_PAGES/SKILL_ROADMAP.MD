A.C.E. — SKILL ROADMAP PAGE

============================



INHERIT the ACE global design system.



Create a premium visual career skill-roadmap experience.



This page should NOT look like an online course platform.



It should feel like:



"An intelligent map of my path from current skills to my target role."



============================================================

WIREFRAME

============================================================



┌──────────────────────────────────────────────────────────────────────┐

│ Skill Roadmap                                  \[Target Role ▾]       │

│ Your path from current skills to your target career.                │

│                                                                      │

│ ┌──────────────────────────────────────────────────────────────────┐ │

│ │ TARGET ROLE                                                       │ │

│ │ Backend Engineer                                                  │ │

│ │                                                                  │ │

│ │ Career readiness                                  72%            │ │

│ └──────────────────────────────────────────────────────────────────┘ │

│                                                                      │

│ ┌──────────────────────────────────────────────────────────────────┐ │

│ │                                                                  │ │

│ │                         SKILL GRAPH                               │ │

│ │                                                                  │ │

│ │       ✓ Python                                                    │ │

│ │            │                                                     │ │

│ │            ▼                                                     │ │

│ │       ✓ REST APIs                                                 │ │

│ │            │                                                     │ │

│ │            ▼                                                     │ │

│ │       ◉ System Design ────────────┐                              │ │

│ │            │                      │                              │ │

│ │            ▼                      ▼                              │ │

│ │       ◉ Docker              ◯ Kubernetes                         │ │

│ │                                   │                              │ │

│ │                                   ▼                              │ │

│ │                               ◯ gRPC                              │ │

│ │                                                                  │ │

│ └──────────────────────────────────────────────────────────────────┘ │

│                                                                      │

│ ┌──────────────────────────────┐ ┌────────────────────────────────┐ │

│ │ NEXT BEST SKILL              │ │ PATH SUMMARY                   │ │

│ │                              │ │                                │ │

│ │ Kubernetes                   │ │ 3 skills remaining             │ │

│ │ High impact                  │ │ 2 prerequisites complete       │ │

│ │                              │ │ Estimated effort: —            │ │

│ │ \[Start Learning Path]        │ │                                │ │

│ └──────────────────────────────┘ └────────────────────────────────┘ │

└──────────────────────────────────────────────────────────────────────┘



============================================================

GRAPH

============================================================



The graph is the hero visual.



Nodes:



Completed:

subtle blue/neutral



Current focus:

electric blue



Recommended:

cyan accent



Blocked:

muted



Target:

deep blue emphasis



Edges:

subtle blue-gray



Do not use rainbow colors.



Allow:



zoom

pan

node selection



But keep interaction restrained.



============================================================

NODE DETAIL

============================================================



Clicking a skill opens a detail panel.



Example:



Kubernetes



Status:

Recommended



Impact:

High



Prerequisites:

Docker ✓



Why ACE recommends it:



"Frequently required across your target backend roles."



Actions:



\[Start Learning Path]

\[Ask ACE]



============================================================

PATH LOGIC

============================================================



The frontend must visualize the backend's computed prerequisite path.



Do not manually hardcode a fake graph if the backend already provides graph data.



Inspect the existing skill DAG implementation and API contracts.



If the frontend currently lacks an endpoint, isolate temporary visualization data in a typed adapter.



============================================================

LEGEND

============================================================



Show a tiny legend:



✓ Completed

● Current focus

○ Recommended

— Dependency



============================================================

RESPONSIVE

============================================================



Desktop:

large interactive graph



Tablet:

graph with collapsible details



Mobile:

graph becomes horizontally scrollable/zoomable

with selected skill details below



Do not make the graph unusable on mobile.



============================================================

QUALITY

============================================================



This should be one of ACE's signature screens.



Minimal UI surrounding a visually sophisticated skill graph.



Do not fill the page with cards.



The graph should be the hero.



Generate → critique → iterate → implement → verify.

