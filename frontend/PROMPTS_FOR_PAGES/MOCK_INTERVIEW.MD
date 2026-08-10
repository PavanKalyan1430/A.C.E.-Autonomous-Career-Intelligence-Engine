A.C.E. — MOCK INTERVIEW STUDIO

===============================



INHERIT the ACE design system.



Create an immersive, premium mock-interview experience.



This is NOT a video conferencing UI.



It should feel like a private professional interview studio.



============================================================

FLOW

============================================================



Create three states:



1\. Interview Setup

2\. Live Interview

3\. Interview Results



============================================================

STATE 1 — SETUP

============================================================



┌──────────────────────────────────────────────────────────────────────┐

│ Mock Interview                                                       │

│ Practice for your next interview with ACE.                          │

│                                                                      │

│ ┌──────────────────────────────────────────────────────────────────┐ │

│ │ ROLE                                                               │ │

│ │ Backend Engineer                                                   │ │

│ │                                                                  │ │

│ │ COMPANY                                                            │ │

│ │ Google                                                             │ │

│ │                                                                  │ │

│ │ INTERVIEW TYPE                                                     │ │

│ │ Technical + Behavioral                                             │ │

│ │                                                                  │ │

│ │ DIFFICULTY                                                         │ │

│ │ Medium                                                             │ │

│ │                                                                  │ │

│ │                 \[Start Interview]                                 │ │

│ └──────────────────────────────────────────────────────────────────┘ │

└──────────────────────────────────────────────────────────────────────┘



============================================================

STATE 2 — LIVE INTERVIEW

============================================================



┌──────────────────────────────────────────────────────────────────────┐

│ Backend Engineer                         Question 3 of 8             │

│                                                                      │

│                    INTERVIEW SESSION                                 │

│                                                                      │

│ "Explain how you would design a distributed caching system."        │

│                                                                      │

│                         ┌─────────┐                                  │

│                         │         │                                  │

│                         │   🎙    │                                  │

│                         │         │                                  │

│                         └─────────┘                                  │

│                                                                      │

│                       ● Listening                                    │

│                                                                      │

│                 ━━━━━━━━━━━━━━━━━━━                                  │

│                                                                      │

│                          02:14                                      │

│                                                                      │

│              \[Pause]                 \[Finish Answer]                 │

│                                                                      │

│ ┌──────────────────────────────────────────────────────────────────┐ │

│ │ LIVE FEEDBACK                                                     │ │

│ │                                                                  │ │

│ │ Speaking Pace        142 WPM                                     │ │

│ │ Filler Words         Low                                         │ │

│ │ Structure            Strong                                      │ │

│ └──────────────────────────────────────────────────────────────────┘ │

└──────────────────────────────────────────────────────────────────────┘



============================================================

VOICE STATE DESIGN

============================================================



Create distinct states:



Idle

Preparing

Listening

Transcribing

Analyzing

Feedback

Complete

Error



Use cyan as the primary live voice state.



Do not use constant glow.



A subtle animated waveform is acceptable while listening.



============================================================

QUESTION

============================================================



Question must be visually dominant.



Show:



Question 3 of 8



Category:

System Design



Difficulty:

Medium



Do not overload the screen.



============================================================

LIVE METRICS

============================================================



When actual backend data is available:



WPM

Filler words

STAR structure

Response quality



Do not show fabricated metrics.



============================================================

STATE 3 — RESULTS

============================================================



Create a premium interview report:



Overall Score

78 / 100



Communication

82



Technical Depth

76



Structure

80



Confidence

74



Then:



Strengths



Improvement Areas



Recommended Next Practice



CTA:



\[Practice Weak Area]



\[Ask ACE for Feedback]



============================================================

AUDIO PRIVACY

============================================================



The backend is designed around in-memory audio processing.



Do not display misleading language such as:



"Your recording is saved."



Do not create a frontend audio-recording library that unnecessarily persists files.



============================================================

API

============================================================



Use:



POST /api/v1/interview/start

POST /api/v1/interview/submit-answer

POST /api/v1/interview/audio-answer

POST /api/v1/interview/finish



Inspect actual backend schemas.



============================================================

RESPONSIVE

============================================================



Desktop:

centered interview studio



Mobile:

question + voice control + feedback stacked



Controls must remain touch-friendly.



============================================================

QUALITY

============================================================



This should feel calm and focused.



The user should forget they are using a dashboard and feel like they are actually inside an interview.



Generate → critique → iterate → implement → verify.

