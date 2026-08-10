A.C.E. — AI CAREER AGENT PAGE

================================



You are continuing the implementation of the A.C.E. Autonomous Career Intelligence Engine.



IMPORTANT:

The ACE global design system, color tokens, typography, AppShell, sidebar, top navigation, spacing, radius, accessibility rules, light/dark themes and component language have already been established in the previous dashboard task.



DO NOT create a new visual language.



INHERIT the existing ACE design system exactly.



Use the connected Stitch MCP to design and iterate this page before implementing it.



This task is ONLY for the AI CAREER AGENT page.



============================================================

PRODUCT PURPOSE

============================================================



The AI Career Agent is the central intelligence interface of ACE.



It is not a generic ChatGPT clone.



The existing ACE backend contains a LangGraph ReAct agent that:



\- receives open-ended candidate requests

\- loads candidate conversation history

\- retrieves candidate memory

\- dynamically decides which deterministic tools to execute

\- performs resume semantic matching

\- performs skill-gap analysis

\- performs company intelligence research

\- generates interview questions

\- persists conversations



The UI must make this intelligence understandable without exposing private chain-of-thought or internal reasoning.



The user should feel:



"ACE is actively working on my career problem."



============================================================

PAGE WIREFRAME

============================================================



Desktop:



┌─────────────────────────────────────────────────────────────────────────┐

│ SIDEBAR │ AI CAREER AGENT                         Search  Bell  Profile │

│         ├───────────────────────────────────────────────────────────────┤

│         │                                                               │

│         │  AI Career Agent                                              │

│         │  Your autonomous career intelligence copilot                  │

│         │                                                               │

│         │ ┌─────────────────────────────────────────────┐ ┌───────────┐ │

│         │ │                                             │ │ ACE       │ │

│         │ │             CONVERSATION                    │ │ CONTEXT   │ │

│         │ │                                             │ │           │ │

│         │ │ You                                         │ │ Target    │ │

│         │ │ "Am I ready for backend roles at Google?"  │ │ Backend   │ │

│         │ │                                             │ │ Engineer  │ │

│         │ │                                             │ │           │ │

│         │ │ ACE                                         │ │ Career    │ │

│         │ │ "I've analyzed your profile..."             │ │ Score 85  │ │

│         │ │                                             │ │           │ │

│         │ │ ┌─────────────────────────────────────────┐ │ │           │ │

│         │ │ │ Resume Analysis                 ✓       │ │ │ Goals 3   │ │

│         │ │ │ Semantic Match                 82%     │ │ │           │ │

│         │ │ └─────────────────────────────────────────┘ │ │ Memory    │ │

│         │ │                                             │ │ Active    │ │

│         │ │ ┌─────────────────────────────────────────┐ │ │           │ │

│         │ │ │ Skill Gap Analysis              ✓       │ │ │           │ │

│         │ │ │ Kubernetes · gRPC                        │ │ │           │ │

│         │ │ └─────────────────────────────────────────┘ │ │           │ │

│         │ │                                             │ │           │ │

│         │ │                                             │ │           │ │

│         │ │                                             │ │           │ │

│         │ └─────────────────────────────────────────────┘ └───────────┘ │

│         │                                                               │

│         │ ┌───────────────────────────────────────────────────────────┐ │

│         │ │ Ask ACE anything...                              🎙   ↑   │ │

│         │ └───────────────────────────────────────────────────────────┘ │

│         │                                                               │

│         │ Suggested actions:                                           │

│         │ \[Analyze my resume] \[Find skill gaps] \[Prepare for interview]│

│         │                                                               │

└─────────────────────────────────────────────────────────────────────────┘



============================================================

VISUAL DESIGN

============================================================



Keep the page predominantly neutral.



Light:

white background

very light blue-gray secondary surfaces



Dark:

black / near-black background

subtle elevated dark surfaces



ACE blue:

primary interactive elements



ACE cyan:

AI processing / intelligence states



Do NOT create a giant glowing AI orb.



Do NOT use excessive gradients.



Do NOT make the chat area look like a generic ChatGPT clone.



The visual identity should feel like a premium AI workspace.



============================================================

LEFT CONVERSATION AREA

============================================================



Header:



AI Career Agent



Subtitle:



"Your autonomous career intelligence copilot"



Show a subtle live state:



● ACE Intelligence Online



Conversation area should support:



\- user messages

\- ACE responses

\- rich result cards

\- inline actions

\- citations/source indicators where applicable

\- tool execution status

\- loading state

\- errors



Do not show chain-of-thought.



Instead show high-level execution states such as:



Analyzing resume

Checking skill alignment

Researching company

Building recommendation

Completed



These should be represented as compact expandable activity cards.



============================================================

ACE RESPONSE CARDS

============================================================



When ACE uses a capability, show a polished result card.



Example:



┌────────────────────────────────────┐

│ Resume Analysis              ✓     │

│ Semantic Match                    │

│                                    │

│ 82%                                │

│                                    │

│ Strong alignment with backend      │

│ engineering requirements.          │

│                                    │

│ \[View Resume Analysis →]           │

└────────────────────────────────────┘



Another:



┌────────────────────────────────────┐

│ Skill Gap Analysis           ✓     │

│                                    │

│ Missing skills                     │

│ Kubernetes · gRPC                  │

│                                    │

│ \[View Skill Roadmap →]             │

└────────────────────────────────────┘



These cards should be reusable components.



============================================================

COMPOSER

============================================================



At the bottom create a premium message composer.



Placeholder:



"Ask ACE anything about your career..."



Features:



\- text input

\- send button

\- optional microphone button

\- attachment capability only if supported by backend

\- keyboard shortcut indication



Primary send action uses ACE blue.



When ACE is processing:



show:



● ACE is analyzing...



with subtle cyan animation.



============================================================

SUGGESTED PROMPTS

============================================================



Show contextual suggestions below the composer.



Examples:



Analyze my resume for backend roles



What skills am I missing?



Prepare me for my next interview



Research this company



Why is my match score low?



These should disappear or become secondary after conversation starts.



============================================================

RIGHT CONTEXT PANEL

============================================================



Create a compact "ACE Context" panel.



Display:



TARGET ROLE

Backend Engineer



CAREER SCORE

85 / 100



ACTIVE GOALS

3



CURRENT FOCUS

System Design



RECENT MEMORY

Interview weakness: System Design



The context panel should communicate that ACE understands the candidate over time.



Do not make it visually dominant.



On tablet/mobile:

collapse it into a drawer or contextual sheet.



============================================================

CONVERSATION HISTORY

============================================================



Provide a session/history drawer.



Show:



Today

"Backend role readiness"



Yesterday

"Resume improvement"



May 16

"Google interview preparation"



Use the existing session APIs.



Do not invent a separate persistence system.



============================================================

STATES

============================================================



Design:



Empty state:



"Start a conversation with ACE."



Loading:



"ACE is analyzing your profile..."



Tool execution:



"Analyzing resume"

"Checking skill alignment"

"Researching company"



Completed:



"Analysis complete"



Error:



"ACE couldn't complete this analysis."

\[Try again]



Network failure must not destroy conversation history.



============================================================

RESPONSIVE

============================================================



Desktop:

conversation + context panel



Tablet:

conversation + collapsible context



Mobile:

conversation full width

context accessible through button/drawer



Composer remains fixed near bottom without covering messages.



============================================================

API

============================================================



Use the existing:



POST /api/v1/agent/query



GET /api/v1/agent/sessions



GET /api/v1/agent/sessions/{id}



Use existing authentication.



Inspect actual request/response schemas before implementation.



Do not invent API contracts.



============================================================

FINAL QUALITY BAR

============================================================



The page should feel like:



"Perplexity-style intelligence workspace + professional career platform"



but should remain unmistakably ACE.



Minimal.

Premium.

Focused.

Intelligent.



Do not settle for the first Stitch result.



Generate → critique → iterate → implement → run → visually verify → polish.

