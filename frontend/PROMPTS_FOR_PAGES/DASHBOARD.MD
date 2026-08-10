You are the lead product designer, senior UI/UX engineer, frontend architect, and design-system engineer for this project.



You have access to the repository and a connected Google Stitch MCP server.



Your responsibility is NOT to create a generic AI dashboard.



Your responsibility is to transform the existing A.C.E. project into a premium, production-quality career intelligence product with a coherent design system, exceptional UX, responsive behavior, accessibility, smooth interactions, and frontend architecture that can scale across the entire application.



============================================================

1\. PRODUCT CONTEXT

============================================================



Project:



A.C.E.

Autonomous Career Intelligence Engine



A.C.E. is a career intelligence platform designed for software engineers and job seekers.



The existing backend provides:



\- Autonomous LangGraph ReAct career agent

\- Resume parsing and resume intelligence

\- Semantic resume-to-job matching

\- Skill-gap analysis

\- Prerequisite skill learning paths using a NetworkX DAG

\- Live company intelligence through Tavily

\- AI-generated interview questions

\- Voice mock interviews using Groq Whisper

\- Interview evaluation

\- Candidate memory

\- Application tracking

\- Career analytics

\- PostgreSQL persistence



The backend architecture and APIs already exist.



Do NOT redesign the backend.



Do NOT invent backend architecture.



Do NOT replace existing backend functionality with fake frontend-only logic.



The frontend must be designed around the existing product capabilities and APIs.



============================================================

2\. PRIMARY OBJECTIVE

============================================================



Build a frontend that feels like a serious venture-backed SaaS product.



The user should feel:



"This is a professional career operating system powered by intelligence."



NOT:



"This is a college AI project."



The visual quality should be comparable in DESIGN PRINCIPLES to premium products such as:



\- Linear

\- Vercel

\- Notion

\- Stripe

\- modern enterprise SaaS

\- modern professional analytics platforms



Do NOT copy their UI.



Use only their principles:



\- excellent hierarchy

\- strong typography

\- generous whitespace

\- restrained color

\- precise alignment

\- subtle borders

\- sophisticated interaction design

\- minimal visual noise

\- strong information architecture



============================================================

3\. NON-NEGOTIABLE DESIGN PHILOSOPHY

============================================================



A.C.E. must look:



\- premium

\- professional

\- intelligent

\- calm

\- modern

\- trustworthy

\- technically sophisticated

\- minimal

\- highly usable



Avoid:



\- generic AI SaaS templates

\- excessive gradients

\- excessive glassmorphism

\- neon cyberpunk UI

\- glowing cards everywhere

\- excessive rounded cards

\- excessive illustrations

\- rainbow dashboards

\- random colors

\- giant chatbot widgets

\- excessive animations

\- unnecessary charts

\- academic/student-project aesthetics

\- cluttered dashboards

\- oversized typography

\- excessive blue backgrounds



The interface must communicate confidence and maturity.



============================================================

4\. ACE BRAND IDENTITY

============================================================



The supplied A.C.E. logo is the source of truth for the visual identity.



The logo has a luminous transition between:



\- deep blue

\- electric blue

\- cyan



Do NOT redesign the logo.



Do NOT replace it with another AI icon.



Use the actual A.C.E. logo wherever possible.



If the repository already contains the logo asset, use that asset.



If the repository does not contain it, locate the provided logo asset/reference before implementing the final brand treatment.



The logo should remain recognizable and visually dominant in branding areas.



============================================================

5\. COLOR SYSTEM

============================================================



IMPORTANT:



White and black are the PRIMARY SURFACE COLORS.



Blue and cyan are BRAND / INTERACTION COLORS.



Do NOT make the whole application blue.



The application must support:



LIGHT MODE

and

DARK MODE



Theme choice must be user-controlled and persistent.



\------------------------------

LIGHT MODE

\------------------------------



Primary background:

\#FFFFFF



Secondary background:

\#F8FAFC



Surface:

\#FFFFFF



Elevated surface:

\#FFFFFF



Primary text:

\#0A0A0A



Secondary text:

\#475569



Muted text:

\#64748B



Border:

\#E2E8F0



Subtle border:

\#F1F5F9



\------------------------------

DARK MODE

\------------------------------



Primary background:

\#000000



Secondary background:

\#080B12



Surface:

\#0D1117



Elevated surface:

\#111827



Primary text:

\#FFFFFF



Secondary text:

\#CBD5E1



Muted text:

\#94A3B8



Border:

\#1E293B



Subtle border:

\#172033



\------------------------------

ACE BRAND COLORS

\------------------------------



Deep Blue:

\#123BBA



Electric Blue:

\#1769FF



Cyan:

\#22D3EE



Use these as the visual identity.



Recommended semantic usage:



Deep Blue:

\- branding

\- selected navigation

\- structural emphasis

\- dark-mode accent surfaces



Electric Blue:

\- primary CTA

\- active states

\- links

\- progress indicators

\- important interactive elements

\- primary charts



Cyan:

\- AI intelligence

\- live processing

\- voice activity

\- autonomous-agent indicators

\- subtle highlights

\- skill intelligence

\- special AI states



IMPORTANT:



Approximately 85-90% of the interface should remain neutral.



Approximately 10-15% should use ACE brand colors.



Do not turn every card blue.



Do not use cyan for ordinary UI.



Cyan means intelligence.



Blue means action.



Neutral means information.



============================================================

6\. COLOR RULE

============================================================



Every color must have a purpose.



Do not introduce random colors.



Green:

success only



Amber:

warning only



Red:

error/destructive only



Blue:

primary product interaction



Cyan:

AI/intelligence/live state



Everything else:

neutral or blue-gray.



Charts must use a restrained blue-family palette.



Do not create rainbow charts.



============================================================

7\. DESIGN SYSTEM FIRST

============================================================



Before implementing the dashboard, establish the ACE design system.



Use the connected Stitch MCP server to create/iterate the design.



Create or update a DESIGN.md / design-system specification that defines:



\- color tokens

\- typography

\- spacing

\- border radius

\- borders

\- shadows

\- elevation

\- button variants

\- input variants

\- cards

\- badges

\- tabs

\- navigation

\- tooltips

\- modals

\- dropdowns

\- tables

\- charts

\- progress bars

\- avatars

\- empty states

\- loading states

\- skeletons

\- error states

\- AI states

\- voice states

\- responsive breakpoints

\- accessibility rules



This design system will become the source of truth for every subsequent ACE page.



Do not allow each page to invent its own visual style.



============================================================

8\. TYPOGRAPHY

============================================================



Use a modern professional sans-serif such as Inter.



Use a restrained hierarchy.



Recommended:



Page title:

28-32px



Section heading:

18-22px



Card heading:

14-16px semibold



Body:

14-15px



Secondary:

12-13px



Metric:

28-36px depending on importance



Do not use oversized marketing typography inside the application.



Typography should feel like a professional productivity platform.



============================================================

9\. SPACING

============================================================



Use an 8px spacing system.



Prioritize whitespace.



Do not pack every available area with information.



Use consistent:



8

12

16

20

24

32

40

48



spacing increments.



Cards should have enough breathing room.



============================================================

10\. CORNER RADIUS

============================================================



Avoid excessive pill-shaped UI.



Use restrained radii.



Suggested:



Inputs:

8-10px



Buttons:

8-10px



Cards:

12-16px



Large containers:

16-20px



Pills:

Only when semantically appropriate.



The product should feel refined, not toy-like.



============================================================

11\. SHADOWS

============================================================



Use extremely subtle shadows.



Light mode:

soft neutral shadow



Dark mode:

prefer borders and tonal contrast over large shadows



Avoid floating everything.



Most hierarchy should come from:



\- spacing

\- typography

\- contrast

\- borders

\- surface elevation



============================================================

12\. APPLICATION SHELL

============================================================



Build a reusable application shell.



Desktop:



\------------------------------------------------------------

| Sidebar | Top Header                                   |

|         |-----------------------------------------------|

|         |                                               |

|         |              Main Content                      |

|         |                                               |

|         |                                               |

\------------------------------------------------------------



Sidebar:



A.C.E. logo



Navigation:



OVERVIEW

&#x20; Dashboard



CAREER INTELLIGENCE

&#x20; AI Career Agent

&#x20; Resume Intelligence

&#x20; Job Intelligence

&#x20; Skill Roadmap

&#x20; Company Intelligence



INTERVIEW

&#x20; Mock Interview



TRACKING

&#x20; Applications

&#x20; Analytics



Bottom:



Profile \& Settings



User profile



Theme control



The sidebar should be compact and professional.



Do NOT make the sidebar a giant blue block.



Light mode:

white / subtle neutral surface



Dark mode:

black / near-black surface



Active navigation:

subtle blue accent



============================================================

13\. TOP HEADER

============================================================



Create a clean top header.



Left:



Current page title



Right:



Search



Notifications



Theme toggle



Profile/avatar



Do not overcrowd the header.



Keep it visually quiet.



============================================================

14\. DASHBOARD OBJECTIVE

============================================================



The dashboard must answer five questions immediately:



1\. Where do I currently stand?

2\. What should I do next?

3\. Which opportunities fit me?

4\. Which skills should I improve?

5\. What interviews/applications need attention?



The dashboard is NOT a collection of every feature.



It is the user's career command center.



============================================================

15\. DASHBOARD INFORMATION ARCHITECTURE

============================================================



Use this hierarchy:



\------------------------------------------------------------



SIDEBAR

&#x20; |

&#x20; +------------------------------------------------------+

&#x20; | TOP HEADER                                           |

&#x20; | Search | Notifications | Theme | Profile            |

&#x20; +------------------------------------------------------+

&#x20; |

&#x20; | Good morning, Pavan

&#x20; | Here's your career intelligence overview.

&#x20; |

&#x20; |                         \[Ask ACE]

&#x20; |

&#x20; +------------------------------------------------------+

&#x20; | CAREER OVERVIEW                                      |

&#x20; |                                                      |

&#x20; | \[Career Score] \[Job Match] \[Interview] \[Applications]|

&#x20; +------------------------------------------------------+

&#x20; |

&#x20; +-------------------------------+----------------------+

&#x20; |                               |                      |

&#x20; |        ACE INTELLIGENCE       | Upcoming Interview  |

&#x20; |                               |                      |

&#x20; |  Next best action             | Company              |

&#x20; |  AI recommendation            | Role                 |

&#x20; |  Skill gaps                   | Date / time          |

&#x20; |  Why this matters             | Readiness            |

&#x20; |                               | Prepare with ACE     |

&#x20; |  \[View Skill Roadmap]         |                      |

&#x20; |                               |                      |

&#x20; +-------------------------------+----------------------+

&#x20; |

&#x20; +-------------------------------+----------------------+

&#x20; |                               |                      |

&#x20; |       TOP JOB MATCHES         |   SKILL PROGRESS     |

&#x20; |                               |                      |

&#x20; | Job                            | System Design 80%   |

&#x20; | Company        92% Match      | Python       90%     |

&#x20; | Job                            | AWS          75%     |

&#x20; | Company        87% Match      | Kubernetes   60%     |

&#x20; |                               | Go           45%     |

&#x20; | \[View All Jobs]               | \[View Roadmap]      |

&#x20; |                               |                      |

&#x20; +-------------------------------+----------------------+

&#x20; |

&#x20; +-------------------------------+----------------------+

&#x20; |                               |                      |

&#x20; |      CAREER INSIGHTS          |   RECENT ACTIVITY    |

&#x20; |                               |                      |

&#x20; | AI insight                    | Resume updated      |

&#x20; | AI insight                    | Interview completed |

&#x20; | AI insight                    | Application added   |

&#x20; |                               | Skill added         |

&#x20; |                               |                      |

&#x20; +-------------------------------+----------------------+



\------------------------------------------------------------



This structure is mandatory unless Stitch discovers a clearly superior UX arrangement while preserving the information hierarchy.



============================================================

16\. DASHBOARD HEADER

============================================================



Display:



"Good morning, Pavan."



Supporting text:



"Here's your career intelligence overview."



Primary CTA:



"Ask ACE"



This CTA should connect to:



/api/v1/agent/query



Do not create a fake chatbot interaction.



============================================================

17\. CAREER OVERVIEW CARDS

============================================================



Create four compact KPI cards.



CARD 1:



Career Score



85 / 100



Supporting:

"↑ 8% this month"



CARD 2:



Job Match



82%



Supporting:

"Strong match for your target roles"



CARD 3:



Interview Score



78 / 100



Supporting:

"↑ 6 points this month"



CARD 4:



Applications



23



Supporting:

"4 active interviews"



These should be compact information modules.



Do NOT use giant circular gauges.



Use small elegant visual indicators.



============================================================

18\. ACE INTELLIGENCE — HERO SECTION

============================================================



This is the most important section of the dashboard.



Title:



ACE Intelligence



Status:



● Intelligence updated recently



Main message:



"Your strongest next move"



Example:



"Strengthen System Design and Kubernetes to improve your match for Senior Backend Engineer roles."



Show:



System Design

High Impact



Kubernetes

High Impact



Distributed Systems

Medium Impact



Supporting explanation:



"Based on your resume, target roles, interview history and recent career signals."



Actions:



\[View Skill Roadmap →]



\[Ask ACE why]



The design should communicate:



AI is actively reasoning about my career.



Use subtle ACE blue/cyan accents.



Do NOT use a giant glowing AI orb.



Do NOT make the section look like a chatbot.



============================================================

19\. UPCOMING INTERVIEW

============================================================



Create:



Upcoming Interview



Company:

Swiggy



Role:

Senior Backend Engineer



Date:

22 May



Time:

10:00 AM



Readiness:

78%



CTA:



"Prepare with ACE →"



Use a compact countdown only if real interview date/time data exists.



Do not hardcode a fake countdown into production logic.



============================================================

20\. TOP JOB MATCHES

============================================================



Create:



Top Job Matches



Rows:



Senior Backend Engineer

Razorpay

Remote · Full-time

92% Match



Staff Software Engineer

Swiggy

Bangalore · Full-time

87% Match



Backend Engineer

Atlassian

Hybrid · Full-time

84% Match



Use semantic match visualization.



The percentage should visually communicate:



resume-to-role semantic fit



not a generic decorative percentage.



CTA:



"View all jobs →"



IMPORTANT:



Do not invent a new backend endpoint.



Inspect the existing backend.



If a dedicated jobs endpoint does not exist yet, create a clean frontend data adapter/mock layer so the UI can be implemented without coupling it to fake API behavior.



Clearly separate mock data from real API data.



============================================================

21\. SKILL PROGRESS

============================================================



Title:



Skill Progress



Show:



System Design       80%

Python              90%

AWS                 75%

Kubernetes          60%

Go                  45%



Use thin elegant progress bars.



Recommended skill:

cyan accent



Normal progress:

blue



CTA:



"View full roadmap →"



This section should lead into the existing skill DAG functionality.



============================================================

22\. CAREER INSIGHTS

============================================================



Create:



Career Insights



Examples:



"Your resume match for backend roles improved by 12%."



"Kubernetes appears frequently across your target roles."



"System Design is currently your highest-impact interview improvement area."



Each insight should have a subtle icon.



Avoid making this look like a generic notification feed.



============================================================

23\. RECENT ACTIVITY

============================================================



Create:



Recent Activity



Examples:



Resume updated

2 hours ago



Interview completed

Yesterday



Applied for Senior Backend Engineer

2 days ago



New skill added: System Design

3 days ago



Mock interview completed

3 days ago



Use a subtle timeline.



No excessive colored dots.



============================================================

24\. QUICK ACTIONS

============================================================



Create compact quick actions:



Upload Resume

Find Jobs

Start Mock Interview

Research Company



Use icon + label.



Do NOT create four giant cards.



============================================================

25\. AI VISUAL LANGUAGE

============================================================



ACE is an AI product.



However:



AI should feel integrated rather than decorative.



Use subtle AI indicators:



"ACE Intelligence"



"Analyzing"



"Reasoning"



"Live"



"Updated"



"Recommendation"



"AI-generated"



Use cyan selectively for these states.



For autonomous agent execution, design reusable states such as:



Idle

Thinking

Analyzing

Using Tool

Searching

Evaluating

Complete

Error



These states must be reusable later inside the AI Career Agent page.



============================================================

26\. MOTION

============================================================



Use motion sparingly.



Allowed:



\- 150-250ms transitions

\- subtle hover elevation

\- progress animation

\- navigation transition

\- skeleton shimmer

\- small status pulse for live AI states

\- smooth drawer/modal transitions



Avoid:



\- excessive bouncing

\- large zoom animations

\- spinning AI logos

\- constant glow

\- parallax

\- distracting background animation



Motion should communicate state, not decoration.



============================================================

27\. RESPONSIVE DESIGN

============================================================



Desktop:

1440px and above



Primary layout:

sidebar + main dashboard



Tablet:

1024px



Sidebar becomes collapsible.



Two-column sections may become single column.



Mobile:

below 768px



Use:



compact top navigation

drawer navigation

single-column cards

stacked content

touch-friendly controls



Never allow:



horizontal page overflow

tiny unreadable charts

tables wider than viewport

overlapping cards

clipped text



============================================================

28\. ACCESSIBILITY

============================================================



Use WCAG-conscious contrast.



Do not rely on color alone.



Interactive elements need:



\- visible focus states

\- keyboard navigation

\- semantic HTML

\- aria labels where required

\- accessible tooltips

\- readable contrast

\- minimum touch target sizes



The blue/cyan palette must remain accessible in both themes.



============================================================

29\. LOADING STATES

============================================================



Every asynchronous section needs a loading state.



Use skeletons rather than blank areas.



Examples:



Dashboard loading



Career score skeleton



Job match skeleton



ACE intelligence skeleton



Skill progress skeleton



Activity skeleton



Do not use full-page spinners unless absolutely necessary.



============================================================

30\. ERROR STATES

============================================================



Create graceful error states.



Examples:



"Unable to load career insights."



"ACE couldn't retrieve your latest intelligence."



"Try again"



Errors should not destroy the page layout.



============================================================

31\. EMPTY STATES

============================================================



Design premium empty states.



Example:



No resume:



"Upload your resume to unlock personalized career intelligence."



CTA:



"Upload Resume"



No applications:



"Start tracking your applications to see your career pipeline here."



No interview history:



"Complete your first mock interview to start building your interview profile."



============================================================

32\. FRONTEND ARCHITECTURE

============================================================



Before modifying code:



INSPECT THE EXISTING FRONTEND.



Do not blindly replace the project.



Determine:



\- framework

\- Vite setup

\- routing

\- component structure

\- CSS strategy

\- Tailwind usage if present

\- state management

\- API layer

\- existing assets

\- existing pages

\- reusable components



Reuse good existing architecture.



Refactor only when necessary.



Recommended structure:



frontend/

&#x20; src/

&#x20;   components/

&#x20;     ui/

&#x20;     layout/

&#x20;     dashboard/

&#x20;     ai/

&#x20;     career/

&#x20;     jobs/

&#x20;     interview/

&#x20;     skills/

&#x20;   pages/

&#x20;   layouts/

&#x20;   hooks/

&#x20;   services/

&#x20;     api/

&#x20;   stores/

&#x20;   types/

&#x20;   utils/

&#x20;   lib/



Use reusable components.



Do NOT build the dashboard as one enormous component.



============================================================

33\. API INTEGRATION

============================================================



Inspect the existing backend before wiring the UI.



Existing API surface includes:



POST /api/v1/auth/register

POST /api/v1/auth/login

GET  /api/v1/auth/me



POST /api/v1/resume/upload

GET  /api/v1/resume/me



GET /api/v1/company/insights/{company}



POST /api/v1/agent/query

GET /api/v1/agent/sessions

GET /api/v1/agent/sessions/{id}



POST /api/v1/memory/

GET /api/v1/memory/



POST /api/v1/interview/start

POST /api/v1/interview/submit-answer

POST /api/v1/interview/audio-answer

POST /api/v1/interview/finish



POST /api/v1/applications/

GET /api/v1/applications/

PATCH /api/v1/applications/{id}

DELETE /api/v1/applications/{id}



GET /api/v1/analytics/dashboard



These APIs are documented in the existing project README.



Use the actual backend contracts.



Do not invent request/response shapes without inspecting the code.



If a dashboard data point is not currently exposed by the backend:



1\. Do not fake an API endpoint.

2\. Create a typed frontend adapter.

3\. Use temporary mock data only where necessary.

4\. Keep the adapter isolated so it can be replaced with a real endpoint later.



============================================================

34\. DATA STATES

============================================================



The dashboard must support:



\- authenticated user

\- first-time user

\- incomplete profile

\- resume uploaded

\- resume missing

\- no applications

\- active applications

\- no interviews

\- upcoming interview

\- AI intelligence unavailable

\- API error

\- loading

\- populated state



Do not design only for the perfect populated state.



============================================================

35\. PERFORMANCE

============================================================



The dashboard should feel fast.



Requirements:



\- lazy-load heavy sections when appropriate

\- avoid unnecessary re-renders

\- memoize expensive visualizations

\- use skeletons

\- optimize images

\- do not load unnecessary libraries

\- keep charts lightweight

\- avoid giant DOM trees

\- do not introduce a large UI framework unnecessarily if the project already has one



============================================================

36\. STITCH WORKFLOW

============================================================



Use the connected Stitch MCP server.



Do NOT simply write code based on this prompt without using Stitch.



Workflow:



PHASE 1:

Inspect the existing repository.



PHASE 2:

Inspect the existing logo/assets.



PHASE 3:

Inspect backend API contracts.



PHASE 4:

Create the ACE design system in Stitch.



PHASE 5:

Generate the dashboard design in Stitch.



PHASE 6:

Review the generated design critically.



PHASE 7:

Iterate in Stitch if necessary.



Do not accept the first generated result automatically.



Critique:



\- spacing

\- hierarchy

\- visual noise

\- alignment

\- color balance

\- typography

\- responsive behavior

\- accessibility

\- startup-quality appearance



PHASE 8:

Implement the approved design in React.



PHASE 9:

Wire the existing APIs.



PHASE 10:

Run the application.



PHASE 11:

Use browser inspection/testing to visually verify the implementation.



PHASE 12:

Fix visual mismatches.



============================================================

37\. STITCH ITERATION RULE

============================================================



The first Stitch generation is a starting point.



If the result looks like:



\- generic SaaS

\- AI template

\- student dashboard

\- overly colorful

\- too blue

\- too rounded

\- too dense

\- too decorative



ITERATE.



Do not settle.



The final result must look intentional.



============================================================

38\. VISUAL QUALITY CHECK

============================================================



Before considering the dashboard complete, evaluate:



BRAND:

Does it unmistakably feel like ACE?



HIERARCHY:

Can the user understand the page within 5 seconds?



COLOR:

Are blue/cyan accents restrained?



LIGHT MODE:

Does it feel premium and clean?



DARK MODE:

Does it feel premium and sophisticated rather than simply inverted?



SPACING:

Does the interface breathe?



TYPOGRAPHY:

Does it feel professional?



AI:

Does ACE feel intelligent without looking gimmicky?



DATA:

Can the user understand the metrics quickly?



UX:

Are primary actions obvious?



RESPONSIVENESS:

Does it work at desktop, tablet and mobile widths?



ACCESSIBILITY:

Can the interface be navigated and understood without relying on color alone?



PERFORMANCE:

Does the dashboard feel fast?



============================================================

39\. FINAL DASHBOARD VISUAL TARGET

============================================================



Think of the visual composition as:



&#x20;                        ACE

&#x20;                         |

&#x20;               CAREER INTELLIGENCE

&#x20;                         |

&#x20;       -------------------------------------

&#x20;       | Career | Job | Interview | Apps |

&#x20;       -------------------------------------

&#x20;                         |

&#x20;       -------------------------------------

&#x20;       |                                   |

&#x20;       |         ACE INTELLIGENCE          |

&#x20;       |                                   |

&#x20;       |  "Your strongest next move"       |

&#x20;       |                                   |

&#x20;       |  Skill  Skill  Skill              |

&#x20;       |                                   |

&#x20;       |  \[View Skill Roadmap]             |

&#x20;       |                                   |

&#x20;       -------------------------------------

&#x20;                         |

&#x20;       -------------------------------------

&#x20;       |                  |                 |

&#x20;       | Top Job Matches  | Skill Progress |

&#x20;       |                  |                 |

&#x20;       -------------------------------------

&#x20;                         |

&#x20;       -------------------------------------

&#x20;       | Career Insights | Recent Activity |

&#x20;       -------------------------------------



The visual center of gravity must be ACE Intelligence.



The dashboard should tell a story:



CURRENT STATE

&#x20;     ↓

AI UNDERSTANDING

&#x20;     ↓

NEXT BEST ACTION

&#x20;     ↓

OPPORTUNITIES

&#x20;     ↓

SKILL IMPROVEMENT

&#x20;     ↓

PROGRESS



============================================================

40\. IMPORTANT IMPLEMENTATION RULE

============================================================



Do not build all ACE pages at once.



For THIS TASK:



Build and perfect the MAIN DASHBOARD first.



Do not prematurely implement:



\- full job page

\- full company page

\- full interview page

\- full skill roadmap page

\- full agent page



However, create reusable design-system components that will support those pages later.



The dashboard is the foundation for the entire product.



============================================================

41\. COMPONENT REUSABILITY

============================================================



Build reusable primitives:



Button

IconButton

Card

MetricCard

Badge

StatusBadge

ProgressBar

Avatar

Tooltip

Dropdown

Tabs

SearchInput

Skeleton

EmptyState

ErrorState

AIStatusIndicator

AIInsightCard

JobMatchRow

SkillProgressRow

ActivityItem



Do not duplicate styles across pages.



============================================================

42\. DO NOT FABRICATE PRODUCT FEATURES

============================================================



Use the existing ACE README and repository as the source of truth.



Do not invent:



\- unsupported backend capabilities

\- fake AI agents

\- fake data sources

\- fake integrations

\- fake analytics

\- fake job APIs

\- fake company APIs



The UI can visually prepare for future functionality, but it must clearly separate unavailable functionality from implemented functionality.



============================================================

43\. FINAL OUTPUT

============================================================



When complete, provide:



1\. What you changed

2\. Design-system decisions

3\. Stitch design/iteration result

4\. Frontend architecture changes

5\. API integrations

6\. Any mock adapters used

7\. Files created/modified

8\. How to run the frontend

9\. Any remaining backend dependencies

10\. Visual verification performed



Do not claim something is implemented unless it actually exists and works.



============================================================

FINAL INSTRUCTION

============================================================



Treat this as a real commercial product launch.



Do not optimize for "looks impressive in a screenshot."



Optimize for:



professionalism

clarity

trust

usability

consistency

performance

accessibility

maintainability

scalability



A.C.E. should feel like a premium career intelligence operating system built by a serious product team.



Start by inspecting the repository and existing frontend.



Then use the connected Stitch MCP to establish the design system and create the dashboard.



Do not start by blindly coding.



Design first.

Critique.

Iterate.

Then implement.

Verify.

Polish.

