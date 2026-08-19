import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, FileText, Briefcase, Map, Building2,
  Bot, Mic, ChevronRight, CheckCircle,
  Brain, Shield, Zap, TrendingUp, Sparkles, Activity
} from 'lucide-react'


// ─── Utilities ─────────────────────────────────────────────────────────────
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function useScrollReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

// ─── All Responsive CSS & Utility Styles ───────────────────────────────────
const STYLES = `
  .lp {
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #2d3748;
    background: #faf9f6;
    height: 100vh;
    overflow-y: auto;
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
  }
  .lp *, .lp *::before, .lp *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* Every <section> snaps cleanly at 100vh */
  .lp > section {
    scroll-snap-align: start;
    scroll-snap-stop: always;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .lp > footer {
    scroll-snap-align: start;
  }

  /* Container */
  .lp-wrap { max-width: 1280px; margin: 0 auto; padding: 0 40px; }
  @media (max-width: 640px) { .lp-wrap { padding: 0 20px; } }

  /* Nav */
  .lp-nav-links { display: flex; align-items: center; gap: 12px; }
  .lp-nav-mob { display: none; }
  @media (max-width: 767px) { .lp-nav-links { display: none; } .lp-nav-mob { display: flex; } }

  /* Capabilities 6-card grid — tighter gap for compact fit */
  .lp-cap-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
  @media (min-width: 600px) { .lp-cap-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 960px) { .lp-cap-grid { grid-template-columns: repeat(3, 1fr); } }

  /* Two-column section layout */
  .lp-two { display: grid; grid-template-columns: 1fr; gap: 40px; align-items: center; }
  @media (min-width: 960px) { .lp-two { grid-template-columns: 1fr 1fr; } }

  /* Journey Horizontal Timeline */
  .lp-journey { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; position: relative; }
  @media (min-width: 768px)  { .lp-journey { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1024px) { .lp-journey { grid-template-columns: repeat(6, 1fr); gap: 10px; } }

  /* Footer */
  .lp-footer-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 32px 20px; }
  @media (min-width: 768px) { .lp-footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr 1fr; } }

  /* Hero headline */
  .lp-h1 {
    font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
    font-size: clamp(32px, 5vw, 64px);
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.025em;
    color: white;
    text-align: center;
    margin-bottom: 14px;
  }

  /* Section headings */
  .lp-h2 {
    font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
    font-size: clamp(22px, 3vw, 40px);
    font-weight: 800;
    line-height: 1.12;
    letter-spacing: -0.02em;
  }

  /* Loop nodes row */
  .lp-loop-branches { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  @media (max-width: 480px) { .lp-loop-branches { gap: 6px; } }

  /* Wave bars animation */
  @keyframes waveBar {
    0%, 100% { transform: scaleY(0.3); }
    50%       { transform: scaleY(1); }
  }

  /* ── Glassmorphism Cards ─────────────────────────────────── */
  .glass-card {
    background: rgba(255, 255, 255, 0.55);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.35);
    box-shadow: 0 4px 24px rgba(51, 102, 89, 0.06);
    transition: background 0.3s ease-in-out, border-color 0.3s ease-in-out,
                box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out;
  }
  .glass-card:hover {
    background: rgba(255, 255, 255, 0.8);
    border-color: rgba(52, 179, 111, 0.45);
    box-shadow: 0 8px 36px rgba(52, 179, 111, 0.16);
    transform: translateY(-4px);
  }
  .glass-card-dark {
    background: rgba(9, 32, 21, 0.5);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(107, 143, 113, 0.18);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
    transition: background 0.3s ease-in-out, border-color 0.3s ease-in-out,
                box-shadow 0.3s ease-in-out, transform 0.3s ease-in-out;
  }
  .glass-card-dark:hover {
    background: rgba(24, 41, 30, 0.75);
    border-color: rgba(52, 179, 111, 0.45);
    box-shadow: 0 8px 36px rgba(52, 179, 111, 0.18);
    transform: translateY(-4px);
  }

  /* Scroll reveal */
  .lp-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease, transform 0.55s ease; }
  .lp-reveal.is-visible { opacity: 1; transform: none; }

  @media (prefers-reduced-motion: reduce) {
    .lp *, .lp *::before, .lp *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
    .lp-reveal { opacity: 1; transform: none; }
  }
`

// ─── 2. HERO ────────────────────────────────────────────────────────────────
function Hero() {
  const heroRef = useRef<HTMLElement>(null)
  const spotRef = useRef<HTMLDivElement>(null)
  const l1 = useRef<HTMLDivElement>(null)
  const l2 = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLAnchorElement>(null)
  const raf = useRef<number | undefined>(undefined)
  const tgt = useRef({ x: 0.5, y: 0.5 })
  const cur = useRef({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect()
      tgt.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
    }
    const onLeave = () => { tgt.current = { x: 0.5, y: 0.5 } }

    hero.addEventListener('mousemove', onMove)
    hero.addEventListener('mouseleave', onLeave)

    const tick = () => {
      cur.current.x = lerp(cur.current.x, tgt.current.x, 0.06)
      cur.current.y = lerp(cur.current.y, tgt.current.y, 0.06)
      const nx = cur.current.x - 0.5, ny = cur.current.y - 0.5

      if (spotRef.current)
        spotRef.current.style.background = `radial-gradient(700px circle at ${cur.current.x * 100}% ${cur.current.y * 100}%, rgba(51,102,89,0.25) 0%, transparent 65%)`
      if (l1.current) l1.current.style.transform = `translate(${nx * 12}px, ${ny * 9}px)`
      if (l2.current) l2.current.style.transform = `translate(${nx * 28}px, ${ny * 20}px)`

      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)

    return () => {
      hero.removeEventListener('mousemove', onMove)
      hero.removeEventListener('mouseleave', onLeave)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  return (
    <section ref={heroRef} style={{
      position: 'relative', height: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', overflow: 'hidden', userSelect: 'none',
      background: 'linear-gradient(135deg, #092015 0%, #0D2B1D 50%, #18291E 100%)',
    }}>
      <div style={{ position: 'absolute', inset: 0, opacity: 0.035,
        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
        backgroundSize: '64px 64px', pointerEvents: 'none' }} />
      <div ref={spotRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transition: 'none' }} />

      <div ref={l1} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', willChange: 'transform' }}>
        <div style={{ position: 'absolute', top: '28%', left: '6%', width: '1px', height: '120px', background: 'linear-gradient(to bottom, transparent, rgba(51,102,89,0.4), transparent)' }} />
        <div style={{ position: 'absolute', bottom: '30%', right: '8%', width: '1px', height: '80px', background: 'linear-gradient(to bottom, transparent, rgba(107,143,113,0.3), transparent)' }} />
      </div>

      <div ref={l2} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', willChange: 'transform' }}>
        <div style={{ position: 'absolute', top: '35%', right: '18%', width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(107,143,113,0.5)' }} />
        <div style={{ position: 'absolute', bottom: '38%', left: '16%', width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(51,102,89,0.6)' }} />
      </div>

      <div className="lp-wrap" style={{ position: 'relative', zIndex: 10, width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* ── Inline Hero Nav ── only visible on this section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 0', flexShrink: 0 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <img src="/logo.png" alt="A.C.E." style={{ height: '36px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.7)) drop-shadow(0 0 12px rgba(45,154,99,0.5))' }}
              onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontWeight: 900, color: 'white', fontSize: '16px', letterSpacing: '-0.01em' }}>A.C.E.</div>
              <div style={{ fontSize: '9px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Career OS</div>
            </div>
          </Link>
          <div className="lp-nav-links">
            <Link to="/login" style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 600, color: '#AEC3B0', textDecoration: 'none', borderRadius: '8px', transition: 'all 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#AEC3B0'; e.currentTarget.style.background = 'transparent' }}>Login</Link>
            <Link to="/signup" style={{ padding: '9px 22px', fontSize: '14px', fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #336659, #1f493d)', borderRadius: '10px', textDecoration: 'none', boxShadow: '0 2px 14px rgba(51,102,89,0.4)', transition: 'all 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(51,102,89,0.65)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 14px rgba(51,102,89,0.4)'; e.currentTarget.style.transform = 'none' }}>Get Started</Link>
          </div>
        </div>

        {/* ── Hero Content ── vertically centered in remaining space */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        {/* Logo — larger, prominent placement */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '28px' }}>
          <div style={{
            position: 'absolute', inset: '-28px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(51,102,89,0.45) 0%, transparent 70%)',
            filter: 'blur(20px)', pointerEvents: 'none'
          }} />
          <img
            src="/logo.png"
            alt="A.C.E. Logo"
            style={{
              position: 'relative', height: '96px', width: 'auto',
              maxHeight: '104px', objectFit: 'contain', margin: '0 auto', display: 'block',
              filter: 'drop-shadow(0 0 14px rgba(255,255,255,0.9)) drop-shadow(0 0 32px rgba(45,154,99,0.7))'
            }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>

        {/* Full form badge — larger, more prominent */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '10px',
          padding: '8px 20px', borderRadius: '999px',
          border: '1px solid rgba(51,102,89,0.55)', background: 'rgba(51,102,89,0.18)',
          marginBottom: '28px',
        }}>
          <span style={{
            display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#6B8F71', flexShrink: 0,
            animationName: 'waveBar', animationDuration: '2s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite'
          }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#AEC3B0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Autonomous Career Intelligence
          </span>
        </div>

        <h1 className="lp-h1">
          YOUR CAREER.<br />
          <span style={{ color: '#6B8F71' }}>INTELLIGENTLY</span> ENGINEERED.
        </h1>

        <p style={{ color: '#AEC3B0', fontSize: 'clamp(16px, 1.8vw, 19px)', lineHeight: 1.6, maxWidth: '620px', margin: '0 auto 32px', fontWeight: 500 }}>
          A.C.E. is an autonomous career engine that understands your skills, analyzes opportunities, maps your gaps, and prepares you for what's next.
        </p>

        {/* Balanced CTA Buttons */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
          <Link
            ref={btnRef}
            to="/signup"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '14px 30px', borderRadius: '12px', fontWeight: 700,
              fontSize: '15px', color: '#fff', textDecoration: 'none',
              background: 'linear-gradient(135deg, #336659, #1f493d)',
              boxShadow: '0 4px 24px rgba(51,102,89,0.45)',
              transition: 'all 0.25s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 36px rgba(51,102,89,0.65)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(51,102,89,0.45)' }}
          >
            Start with ACE <ArrowRight size={17} />
          </Link>
          <a href="#capabilities" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '14px 30px', borderRadius: '12px', fontWeight: 600,
            fontSize: '15px', color: '#FFFFFF', textDecoration: 'none',
            border: '1px solid rgba(107,143,113,0.45)', background: 'rgba(51,102,89,0.18)',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(107,143,113,0.8)'; e.currentTarget.style.background = 'rgba(51,102,89,0.3)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(107,143,113,0.45)'; e.currentTarget.style.background = 'rgba(51,102,89,0.18)' }}>
            Explore Capabilities
          </a>
        </div>
        </div>
      </div>
    </section>
  )
}

// ─── 3. CAPABILITIES ────────────────────────────────────────────────────────
const caps = [
  { Icon: FileText, title: 'Resume Intelligence', desc: 'Understand your career profile. ACE parses, scores, and semantically maps your resume to role requirements.', accent: '#336659' },
  { Icon: Briefcase, title: 'Job Intelligence', desc: 'Find roles that fit. Smart job discovery with deep semantic matching beyond keyword filtering.', accent: '#4E6243' },
  { Icon: Map, title: 'Skill Roadmap', desc: 'Know exactly what to learn next. Prerequisite-aware skill graphs, not random course lists.', accent: '#336659' },
  { Icon: Building2, title: 'Company Intelligence', desc: 'Research companies intelligently. Live signals, culture fit, growth trajectory and team data.', accent: '#4E6243' },
  { Icon: Bot, title: 'AI Career Agent', desc: 'Your autonomous career copilot. ACE coordinates across all modules to guide your next move.', accent: '#336659' },
  { Icon: Mic, title: 'Mock Interview', desc: "Practice like it's real. Voice-based interviews with real-time structure and feedback analysis.", accent: '#4E6243' },
]

function CapCard({ cap, i }: { cap: typeof caps[0], i: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className="glass-card"
      data-magnetic
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: '16px',
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : 'translateY(24px)',
        // Merge reveal transition with glass-card hover transition
        transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s,
                     background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease`,
        padding: '20px 20px',
      }}
    >
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px', marginBottom: '12px',
        background: 'rgba(51,102,89,0.12)', color: cap.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <cap.Icon size={18} color="#336659" />
      </div>
      <h3 style={{ fontWeight: 800, fontSize: '15px', color: '#1a202c', marginBottom: '6px' }}>{cap.title}</h3>
      <p style={{ fontSize: '13px', color: '#3B4A3E', lineHeight: 1.5, fontWeight: 500 }}>{cap.desc}</p>
    </div>
  )
}

function Capabilities() {
  const { ref, visible } = useScrollReveal()
  return (
    <section id="capabilities" style={{ padding: '56px 0', background: '#faf9f6' }}>
      <div className="lp-wrap">
        <div ref={ref} className="lp-reveal" style={{ textAlign: 'center', marginBottom: '32px', ...(visible ? { opacity: 1, transform: 'none' } : {}) }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#336659', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>What ACE Does</p>
          <h2 className="lp-h2" style={{ color: '#1a202c', marginBottom: '14px' }}>ONE INTELLIGENCE LAYER.<br />YOUR ENTIRE CAREER.</h2>
          <p style={{ fontSize: '17px', color: '#4a5568', maxWidth: '540px', margin: '0 auto', lineHeight: 1.6, fontWeight: 500 }}>Six interconnected capabilities working as one unified career system.</p>
        </div>
        <div className="lp-cap-grid">
          {caps.map((c, i) => <CapCard key={c.title} cap={c} i={i} />)}
        </div>
      </div>
    </section>
  )
}

// ─── 4. INTELLIGENCE LOOP ───────────────────────────────────────────────────
function IntelligenceLoop() {
  const { ref, visible } = useScrollReveal(0.2)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!visible) return
    let s = 0
    const iv = setInterval(() => { s++; setStep(s); if (s >= 8) clearInterval(iv) }, 380)
    return () => clearInterval(iv)
  }, [visible])

  const a = (n: number) => step > n
  const nodeStyle = (active: boolean, isHub?: boolean): React.CSSProperties => ({
    padding: '8px 18px', borderRadius: '12px', textAlign: 'center',
    background: active ? (isHub ? '#1B4A3A' : '#18291E') : '#0D2B1D',
    border: `1px solid ${active ? (isHub ? '#34B36F' : '#336659') : '#18291E'}`,
    boxShadow: active && isHub ? '0 0 28px rgba(52,179,111,0.45)' : 'none',
    opacity: active ? 1 : 0.3,
    transform: active ? 'scale(1)' : 'scale(0.95)',
    transition: 'all 0.45s ease',
    width: isHub ? '240px' : '220px',
  })

  const conn = (active: boolean): React.CSSProperties => ({
    width: '2px', height: '14px', margin: '0 auto',
    background: active ? 'linear-gradient(to bottom, #336659, #34B36F)' : '#18291E',
    transition: 'background 0.4s ease',
  })

  return (
    <section style={{ padding: '56px 0', background: '#0D2B1D' }}>
      <div className="lp-wrap">
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#34B36F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>The Intelligence Loop</p>
          <h2 className="lp-h2" style={{ color: 'white' }}>ACE DOESN'T JUST ANALYZE.<br /><span style={{ color: '#34B36F' }}>IT CONNECTS THE DOTS.</span></h2>
        </div>

        <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={nodeStyle(a(0))}>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '13px', letterSpacing: '0.06em' }}>YOUR RESUME</div>
            <div style={{ fontSize: '11px', color: a(0) ? '#AEC3B0' : '#4E6243', marginTop: '2px' }}>Career profile parsed</div>
          </div>
          <div style={conn(a(0))} />

          {/* Central Hub Accent */}
          <div style={nodeStyle(a(1), true)}>
            <div style={{ fontWeight: 900, color: '#FFFFFF', fontSize: '14px', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#34B36F" /> ACE ANALYSIS ENGINE
            </div>
            <div style={{ fontSize: '11px', color: '#AEC3B0', marginTop: '2px', fontWeight: 600 }}>Deep 384-Dim Semantic Vector Processing</div>
          </div>
          <div style={conn(a(1))} />

          <div className="lp-loop-branches">
            {[
              { label: 'JOBS', sub: 'Best-fit roles', active: a(2) },
              { label: 'SKILLS', sub: 'Gaps identified', active: a(3) },
              { label: 'COMPANIES', sub: 'Culture + signals', active: a(4) },
            ].map(n => (
              <div key={n.label} style={{ ...nodeStyle(n.active), width: '180px' }}>
                <div style={{ fontWeight: 800, color: 'white', fontSize: '12px', letterSpacing: '0.06em' }}>{n.label}</div>
                <div style={{ fontSize: '10px', color: n.active ? '#AEC3B0' : '#4E6243', marginTop: '2px' }}>{n.sub}</div>
              </div>
            ))}
          </div>
          <div style={conn(a(4))} />

          <div style={nodeStyle(a(5))}>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '13px', letterSpacing: '0.06em' }}>CAREER PLAN</div>
            <div style={{ fontSize: '11px', color: a(5) ? '#AEC3B0' : '#4E6243', marginTop: '2px' }}>Personalised strategy</div>
          </div>
          <div style={conn(a(5))} />

          <div style={nodeStyle(a(6))}>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '13px', letterSpacing: '0.06em' }}>MOCK INTERVIEW</div>
            <div style={{ fontSize: '11px', color: a(6) ? '#AEC3B0' : '#4E6243', marginTop: '2px' }}>Voice practice</div>
          </div>
          <div style={conn(a(6))} />

          <div style={{ ...nodeStyle(a(7), true), boxShadow: a(7) ? '0 0 32px rgba(52,179,111,0.5)' : 'none' }}>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '13px', letterSpacing: '0.06em' }}>APPLY BETTER</div>
            <div style={{ fontSize: '11px', color: '#AEC3B0', marginTop: '2px' }}>Full candidate preparation</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 5. ASK ACE DEMO ────────────────────────────────────────────────────────
function AskAce() {
  const { ref, visible } = useScrollReveal(0.25)
  const [phase, setPhase] = useState<'idle' | 'analyzing' | 'done'>('idle')
  const [rev, setRev] = useState(0)

  useEffect(() => {
    if (!visible || phase !== 'idle') return
    setPhase('analyzing')
    const ts = [
      setTimeout(() => setRev(1), 600),
      setTimeout(() => setRev(2), 1300),
      setTimeout(() => setRev(3), 2000),
      setTimeout(() => { setPhase('done'); setRev(4) }, 2800),
      setTimeout(() => setRev(5), 3400),
      setTimeout(() => setRev(6), 4000),
      setTimeout(() => setRev(7), 4600),
    ]
    return () => ts.forEach(clearTimeout)
  }, [visible, phase])

  const ri = (n: number): React.CSSProperties => ({
    opacity: rev >= n ? 1 : 0,
    transform: rev >= n ? 'none' : 'translateY(8px)',
    transition: 'all 0.45s ease',
  })

  return (
    <section style={{ padding: '56px 0', background: '#faf9f6' }}>
      <div className="lp-wrap">
        <div className="lp-two" style={{ alignItems: 'stretch' }}>
          {/* Left Copy */}
          <div ref={ref} className="lp-reveal" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', ...(visible ? { opacity: 1, transform: 'none' } : {}) }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#336659', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>LIVE INTERACTIVE DEMO</p>
            <h2 className="lp-h2" style={{ color: '#1a202c', marginBottom: '18px' }}>ASK ACE.</h2>
            <p style={{ fontSize: '17px', color: '#3B4A3E', lineHeight: 1.6, marginBottom: '28px', fontWeight: 500 }}>
              Your career questions become actionable intelligence. ACE coordinates semantic analysis, skill mapping, and market research in seconds.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {['Resume analysis & profile extraction', 'Semantic job description alignment', 'Prerequisite skill gap identification', 'Actionable learning roadmap recommendations'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 600, color: '#2D3748' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#E3EFD3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={13} color="#336659" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Right Demo Card */}
          <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2ddd3', background: '#ffffff', boxShadow: '0 8px 32px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', background: '#faf9f6', borderBottom: '1px solid #f0eae1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#336659' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1a202c', letterSpacing: '0.03em' }}>ACE Intelligence Assistant</span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#336659', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px', borderRadius: '99px', background: '#E3EFD3' }}>Interactive</span>
            </div>

            <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <div style={{ background: '#336659', color: '#fff', borderRadius: '16px 16px 4px 16px', padding: '12px 18px', fontSize: '14px', fontWeight: 600, maxWidth: '300px', lineHeight: 1.5 }}>
                  "Am I ready for backend engineering roles?"
                </div>
              </div>

              {phase !== 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {[{ l: 'Resume profile analyzed', n: 1 }, { l: 'Semantic role alignment computed', n: 2 }, { l: 'Skill gaps identified via DAG', n: 3 }].map(item => (
                    <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', opacity: rev >= item.n ? 1 : 0.4, transition: 'opacity 0.4s ease' }}>
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: rev >= item.n ? '#E3EFD3' : '#f0eae1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {rev >= item.n ? <CheckCircle size={11} color="#336659" /> : <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#336659' }} />}
                      </div>
                      <span style={{ color: rev >= item.n ? '#1a202c' : '#718096', fontWeight: 600 }}>{item.l}</span>
                    </div>
                  ))}
                </div>
              )}

              {phase === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={ri(4)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#1a202c', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Career Readiness Score</span>
                      <span style={{ fontSize: '22px', fontWeight: 900, color: '#336659' }}>82%</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '99px', background: '#E3EFD3', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '82%', background: 'linear-gradient(90deg, #336659, #34B36F)', borderRadius: '99px', transition: 'width 1s ease' }} />
                    </div>
                  </div>

                  <div style={ri(5)}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#1a202c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Strong Areas</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Python', 'FastAPI', 'PostgreSQL'].map(s => (
                        <span key={s} style={{ padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: '#E3EFD3', color: '#1F493D' }}>{s}</span>
                      ))}
                    </div>
                  </div>

                  <div style={ri(6)}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#1a202c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>High-Impact Gaps</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Kubernetes', 'System Design'].map(s => (
                        <span key={s} style={{ padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: '#FFF3E0', color: '#C05621' }}>{s}</span>
                      ))}
                    </div>
                  </div>

                  <div style={ri(7)}>
                    <div style={{ padding: '14px 16px', borderRadius: '12px', background: '#F7FAFC', borderLeft: '4px solid #336659' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#336659', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Recommended Next Step</p>
                      <p style={{ fontSize: '13px', color: '#2D3748', lineHeight: 1.55, fontWeight: 500 }}>Build your Kubernetes foundation before targeting senior backend roles.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 6. VOICE INTERVIEW ─────────────────────────────────────────────────────
function VoiceInterview() {
  const { ref, visible } = useScrollReveal(0.25)
  const [listening, setListening] = useState(false)
  useEffect(() => { if (visible) setTimeout(() => setListening(true), 500) }, [visible])

  return (
    <section style={{ padding: '56px 0', background: '#0D2B1D' }}>
      <div className="lp-wrap">
        <div className="lp-two">
          {/* Swapped Order: Headline Copy FIRST on Left */}
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateX(-20px)', transition: 'all 0.7s ease' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#34B36F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>Real-Time Voice Studio</p>
            <h2 className="lp-h2" style={{ color: 'white', marginBottom: '20px' }}>
              PRACTICE ISN'T ENOUGH.<br /><span style={{ color: '#34B36F' }}>PRACTICE INTELLIGENTLY.</span>
            </h2>
            <p style={{ fontSize: '17px', color: '#AEC3B0', lineHeight: 1.65, marginBottom: '32px' }}>
              Sub-200ms voice interview simulations with structured STAR feedback and verbal filler word analytics — zero audio disk storage.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {['Groq Cloud whisper-large-v3-turbo STT', 'SpaCy interjection & filler word tagger', 'STAR method structure evaluation'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 500, color: '#FFFFFF' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#336659', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={12} color="white" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Audio Card on Right */}
          <div ref={ref} style={{
            borderRadius: '20px', overflow: 'hidden', border: '1px solid #336659',
            background: '#18291E',
            boxShadow: listening ? '0 0 48px rgba(52,179,111,0.25)' : 'none',
            opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease, box-shadow 0.8s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #1f493d' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: listening ? '#34B36F' : '#4E6243', transition: 'background 0.6s' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mock Interview</span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#34B36F', letterSpacing: '0.1em', textTransform: 'uppercase' }}>System Design Round</span>
            </div>

            <div style={{ padding: '36px 28px', textAlign: 'center' }}>
              <p style={{ color: 'white', fontSize: '22px', fontWeight: 800, lineHeight: 1.4, marginBottom: '32px' }}>
                "Design a distributed caching system."
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{ position: 'relative' }}>
                  {listening && (
                    <>
                      <div style={{
                        position: 'absolute', inset: '-12px', borderRadius: '50%', background: '#336659', opacity: 0.2,
                        animationName: 'waveBar', animationDuration: '2s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite'
                      }} />
                      <div style={{
                        position: 'absolute', inset: '-24px', borderRadius: '50%', background: '#34B36F', opacity: 0.1,
                        animationName: 'waveBar', animationDuration: '2.5s', animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite', animationDelay: '0.5s'
                      }} />
                    </>
                  )}
                  <div style={{
                    position: 'relative', width: '64px', height: '64px', borderRadius: '50%',
                    background: listening ? '#336659' : '#092015', border: '2px solid #34B36F',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.6s ease',
                  }}>
                    <Mic size={26} color="white" />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', height: '32px' }}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} style={{
                      width: '4px', borderRadius: '99px', transformOrigin: 'center',
                      background: listening ? '#34B36F' : '#18291E',
                      height: '6px',
                      animationName: listening ? 'waveBar' : 'none',
                      animationDuration: `${0.4 + (i % 5) * 0.1}s`,
                      animationTimingFunction: 'ease-in-out',
                      animationIterationCount: 'infinite',
                      animationDirection: 'alternate',
                      animationDelay: `${i * 0.05}s`,
                      transition: 'background 0.6s ease',
                    }} />
                  ))}
                </div>

                <span style={{ fontSize: '12px', fontWeight: 700, color: '#34B36F', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {listening ? 'Listening (~150ms Groq STT)' : 'Ready'}
                </span>
              </div>

              {/* Muted Headers Upgraded for High Contrast */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '32px' }}>
                {[{ l: 'SPEAKING PACE', v: '142 WPM' }, { l: 'FILLER WORDS', v: 'Low (0 INTJ)' }, { l: 'STRUCTURE', v: 'Strong (STAR)' }].map((m, i) => (
                  <div key={m.l} style={{
                    background: '#092015', borderRadius: '12px', padding: '14px 10px',
                    border: '1px solid #18291E',
                    opacity: visible && listening ? 1 : 0,
                    transform: visible && listening ? 'none' : 'translateY(8px)',
                    transition: `all 0.4s ease ${1 + i * 0.15}s`,
                  }}>
                    <p style={{ fontSize: '9px', color: '#AEC3B0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{m.l}</p>
                    <p style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>{m.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 7. SKILL GRAPH ─────────────────────────────────────────────────────────
const skNodes = [
  { id: 'py', label: 'Python', x: 200, y: 50, st: 'done' },
  { id: 'sd', label: 'System Design', x: 200, y: 140, st: 'done' },
  { id: 'dk', label: 'Docker', x: 90, y: 230, st: 'done' },
  { id: 'kf', label: 'Kafka', x: 310, y: 230, st: 'next' },
  { id: 'k8', label: 'Kubernetes', x: 90, y: 320, st: 'focus' },
  { id: 'gr', label: 'gRPC', x: 90, y: 410, st: 'next' },
]
const skEdges = [
  { f: 'py', t: 'sd' }, { f: 'sd', t: 'dk' }, { f: 'sd', t: 'kf' },
  { f: 'dk', t: 'k8' }, { f: 'k8', t: 'gr' },
]
const skMap = Object.fromEntries(skNodes.map(n => [n.id, n]))

function SkillGraph() {
  const { ref, visible } = useScrollReveal(0.2)
  const [hov, setHov] = useState<string | null>(null)

  const sc = (s: string) => s === 'done' ? '#336659' : s === 'focus' ? '#1F6F47' : '#2D3748'
  const sl = (s: string) => s === 'done' ? '✓' : s === 'focus' ? '◉' : '○'

  return (
    <section style={{ padding: '56px 0', background: '#faf9f6' }}>
      <div className="lp-wrap">
        <div className="lp-two">
          <div ref={ref} className="lp-reveal" style={visible ? { opacity: 1, transform: 'none' } : {}}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#336659', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Skill Roadmap</p>
            <h2 className="lp-h2" style={{ color: '#1a202c', marginBottom: '18px' }}>
              DON'T JUST FIND<br />YOUR SKILL GAPS.<br /><span style={{ color: '#336659' }}>KNOW WHAT TO LEARN FIRST.</span>
            </h2>
            <p style={{ fontSize: '17px', color: '#3B4A3E', lineHeight: 1.6, marginBottom: '28px', fontWeight: 500 }}>
              ACE builds topological NetworkX prerequisite graphs so you learn skills in the optimal order.
            </p>
            {/* Centered Legend */}
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {[{ s: '✓', l: 'Completed', c: '#336659' }, { s: '◉', l: 'Current Focus', c: '#1F6F47' }, { s: '○', l: 'Recommended', c: '#2D3748' }].map(lg => (
                <div key={lg.l} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#1a202c' }}>
                  <span style={{ color: lg.c, fontWeight: 900 }}>{lg.s}</span> {lg.l}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg viewBox="0 0 400 460" style={{ width: '100%', maxWidth: '380px', overflow: 'visible' }}>
              {skEdges.map((e, i) => {
                const f = skMap[e.f], t = skMap[e.t]
                const isHov = hov === e.f || hov === e.t
                return (
                  <line key={i}
                    x1={f.x} y1={f.y + 16} x2={t.x} y2={t.y - 16}
                    stroke={isHov ? '#336659' : (visible ? '#336659' : '#cbd5e0')}
                    strokeWidth={isHov ? 3 : 2.5}
                    style={{ transition: `all 0.5s ease ${i * 0.1}s` }}
                  />
                )
              })}
              {skNodes.map((node, i) => {
                const isHov = hov === node.id
                const col = sc(node.st)
                return (
                  <g key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ cursor: 'pointer', opacity: visible ? 1 : 0, transition: `opacity 0.5s ease ${i * 0.1}s` }}
                    onMouseEnter={() => setHov(node.id)}
                    onMouseLeave={() => setHov(null)}
                  >
                    <rect x={-64} y={-18} width={128} height={36} rx={18}
                      fill={isHov ? col : '#fff'}
                      stroke={col} strokeWidth={isHov ? 2.5 : 2}
                      style={{ transition: 'all 0.2s ease' }}
                    />
                    <text x={0} y={6} textAnchor="middle" fontSize={12} fontWeight={800}
                      fill={isHov ? '#fff' : col}
                      style={{ fontFamily: 'Inter, sans-serif', userSelect: 'none' }}>
                      {sl(node.st)} {node.label}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 8. COMPARISON ──────────────────────────────────────────────────────────
const comps = [
  { t: 'Resume checker', a: 'Resume Intelligence' },
  { t: 'Job board', a: 'Job Intelligence' },
  { t: 'Google searches', a: 'Company Intelligence' },
  { t: 'Spreadsheet', a: 'Application Tracking' },
  { t: 'Course lists', a: 'Skill Roadmap' },
  { t: 'Interview platform', a: 'AI Mock Interview' },
  { t: 'Chatbot', a: 'Autonomous Career Agent' },
]

function Comparison() {
  const { ref, visible } = useScrollReveal()
  const [hov, setHov] = useState<number | null>(null)
  return (
    <section style={{ padding: '56px 0', background: '#0D2B1D' }}>
      <div className="lp-wrap">
        <div ref={ref} className="lp-reveal" style={{ textAlign: 'center', marginBottom: '52px', ...(visible ? { opacity: 1, transform: 'none' } : {}) }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#34B36F', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>Why ACE</p>
          <h2 className="lp-h2" style={{ color: 'white' }}>FROM FRAGMENTED<br /><span style={{ color: '#34B36F' }}>TO INTELLIGENT.</span></h2>
        </div>

        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '0 24px 16px', borderBottom: '1px solid #18291E', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Traditional</span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#34B36F', letterSpacing: '0.1em', textTransform: 'uppercase' }}>A.C.E. Engine</span>
          </div>

          {comps.map((row, i) => (
            <div key={i}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
                padding: '18px 24px', borderRadius: '12px', cursor: 'default',
                background: hov === i ? 'rgba(51,102,89,0.25)' : 'transparent',
                opacity: visible ? 1 : 0,
                transform: visible ? 'none' : 'translateX(-16px)',
                transition: `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s, background 0.2s ease`,
                marginBottom: '4px',
              }}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 500, color: '#94A3B8' }}>
                <div style={{ width: '4px', height: '14px', background: '#64748B', borderRadius: '99px' }} />
                {row.t}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 700, color: '#FFFFFF', padding: '4px 12px', borderRadius: '8px', background: 'rgba(51,102,89,0.18)', border: '1px solid rgba(51,102,89,0.3)' }}>
                <ChevronRight size={15} color="#34B36F" />
                {row.a}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 9. JOURNEY ─────────────────────────────────────────────────────────────
const journey = [
  { n: '1', stage: 'Discover', desc: 'Find your best-fit roles', cap: 'Job Intelligence' },
  { n: '2', stage: 'Understand', desc: 'Know where you stand', cap: 'Resume Intelligence' },
  { n: '3', stage: 'Prepare', desc: 'Build skill roadmap', cap: 'Skill Roadmap' },
  { n: '4', stage: 'Practice', desc: 'Voice mock interviews', cap: 'Mock Interview' },
  { n: '5', stage: 'Apply', desc: 'Research companies & apply', cap: 'Company Intel' },
  { n: '6', stage: 'Improve', desc: 'Track & optimize', cap: 'AI Career Agent' },
]

function Journey() {
  const { ref, visible } = useScrollReveal(0.1)
  return (
    <section id="the-career-journey" style={{ padding: '56px 0', background: '#faf9f6' }}>
      <div className="lp-wrap">
        <div ref={ref} className="lp-reveal" style={{ textAlign: 'center', marginBottom: '32px', ...(visible ? { opacity: 1, transform: 'none' } : {}) }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#336659', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '14px' }}>The Career Journey</p>
          <h2 className="lp-h2" style={{ color: '#1a202c' }}>ONE SYSTEM.<br /><span style={{ color: '#336659' }}>EVERY STEP OF THE JOURNEY.</span></h2>
        </div>

        <div className="lp-journey">
          {journey.map((s, i) => (
            <div key={s.stage} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '12px 8px',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(16px)',
              transition: `all 0.5s ease ${i * 0.1}s`,
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #336659, #1f493d)', boxShadow: '0 4px 16px rgba(51,102,89,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px', position: 'relative', zIndex: 1,
                cursor: 'default',
              }}>
                <span style={{ fontSize: '20px', fontWeight: 900, color: 'white' }}>{s.n}</span>
              </div>
              <h3 style={{ fontWeight: 800, fontSize: '15px', color: '#1a202c', marginBottom: '6px' }}>{s.stage}</h3>
              <p style={{ fontSize: '12px', color: '#3B4A3E', lineHeight: 1.5, marginBottom: '10px', fontWeight: 500 }}>{s.desc}</p>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#1F493D', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px', borderRadius: '99px', background: '#E3EFD3' }}>{s.cap}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 10. TRUST ──────────────────────────────────────────────────────────────
const trust = [
  { Icon: Brain, l: '384-Dim Semantic Vector Matching' },
  { Icon: Shield, l: 'Stateful Postgres Vector Memory' },
  { Icon: Zap, l: 'Tavily Live Web Search Research' },
  { Icon: Mic, l: 'Sub-200ms Groq Voice Processing' },
  { Icon: Map, l: 'NetworkX Topological Skill DAG' },
  { Icon: Activity, l: 'SpaCy Dependency & POS Analysis' },
]

function Trust() {
  const { ref, visible } = useScrollReveal()
  return (
    <section style={{ padding: '56px 0 64px', background: 'linear-gradient(to bottom, #faf9f6 0%, #092015 100%)' }}>
      <div className="lp-wrap">
        <div ref={ref} className="lp-reveal" style={{ textAlign: 'center', ...(visible ? { opacity: 1, transform: 'none' } : {}) }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#336659', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '20px' }}>Built for Intelligence</p>
          <h2 className="lp-h2" style={{ color: '#1a202c', fontSize: 'clamp(24px, 3vw, 36px)', marginBottom: '48px' }}>
            ENGINEERED WITH SOTA<br />AI ARCHITECTURE.
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '14px', maxWidth: '840px', margin: '0 auto' }}>
            {trust.map(({ Icon, l }, i) => (
              <div key={l} style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 24px', borderRadius: '99px',
                border: '1px solid #e2ddd3', background: '#ffffff', color: '#1a202c',
                fontSize: '14px', fontWeight: 700,
                boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                opacity: visible ? 1 : 0,
                transition: `opacity 0.4s ease ${i * 0.06}s, transform 0.3s ease`,
                cursor: 'default',
              }}>
                <Icon size={16} color="#336659" />
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 11. FINAL CTA ──────────────────────────────────────────────────────────
function FinalCTA() {
  const { ref, visible } = useScrollReveal(0.25)

  return (
    <section style={{ padding: '64px 0', background: 'linear-gradient(135deg, #092015, #0D2B1D)', textAlign: 'center' }}>
      <div className="lp-wrap">
        <div ref={ref} className="lp-reveal" style={visible ? { opacity: 1, transform: 'none' } : {}}>
          <img src="/logo.png" alt="A.C.E." style={{ height: '48px', width: 'auto', objectFit: 'contain', margin: '0 auto 36px', display: 'block', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.75)) drop-shadow(0 0 18px rgba(45,154,99,0.5))' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }} />

          <h2 className="lp-h2" style={{ color: 'white', fontSize: 'clamp(32px, 5vw, 56px)', marginBottom: '20px' }}>
            YOUR NEXT CAREER MOVE<br /><span style={{ color: '#34B36F' }}>SHOULDN'T BE A GUESS.</span>
          </h2>

          <p style={{ fontSize: '18px', color: '#AEC3B0', lineHeight: 1.6, maxWidth: '540px', margin: '0 auto 48px', fontWeight: 500 }}>
            Let ACE understand where you are, where you want to go, and what it takes to get there.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
            <Link to="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '16px 36px', borderRadius: '12px', fontWeight: 800, fontSize: '16px',
              color: '#fff', textDecoration: 'none',
              background: 'linear-gradient(135deg, #336659, #1f493d)',
              boxShadow: '0 4px 28px rgba(51,102,89,0.5)',
              transition: 'all 0.25s ease',
            }}>
              Create Free Account <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 12. FOOTER ─────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ padding: '48px 0 32px', background: '#092015', borderTop: '1px solid #18291E' }}>
      <div className="lp-wrap">
        <div className="lp-footer-grid">
          <div>
            <img src="/logo.png" alt="A.C.E." style={{ height: '36px', width: 'auto', objectFit: 'contain', marginBottom: '14px', display: 'block', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6)) drop-shadow(0 0 12px rgba(45,154,99,0.4))' }}
              onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <p style={{ fontSize: '14px', fontWeight: 800, color: 'white', letterSpacing: '-0.01em', marginBottom: '6px' }}>A.C.E.</p>
            <p style={{ fontSize: '13px', color: '#AEC3B0', lineHeight: 1.55 }}>Autonomous Career Intelligence Engine</p>
          </div>
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#34B36F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Product</h4>
            {['Resume Intelligence', 'Job Intelligence', 'Skill Roadmap', 'AI Career Agent', 'Mock Interview'].map(l => (
              <div key={l} style={{ marginBottom: '10px' }}>
                <Link to="/signup" style={{ fontSize: '13px', color: '#AEC3B0', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
                  onMouseLeave={e => e.currentTarget.style.color = '#AEC3B0'}>{l}</Link>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#34B36F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Platform</h4>
            {['LangGraph Orchestrator', 'Groq Speech Studio', 'SentenceTransformers', 'NetworkX Skill DAG'].map(l => (
              <div key={l} style={{ marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', color: '#AEC3B0' }}>{l}</span>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#34B36F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Company</h4>
            {['About A.C.E.', 'GitHub Repository', 'Architecture Docs'].map(l => (
              <div key={l} style={{ marginBottom: '10px' }}>
                <a href="#" style={{ fontSize: '13px', color: '#AEC3B0', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
                  onMouseLeave={e => e.currentTarget.style.color = '#AEC3B0'}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ fontSize: '11px', fontWeight: 700, color: '#34B36F', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Account</h4>
            <div style={{ marginBottom: '10px' }}>
              <Link to="/login" style={{ fontSize: '13px', color: '#AEC3B0', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#FFFFFF'}
                onMouseLeave={e => e.currentTarget.style.color = '#AEC3B0'}>Login</Link>
            </div>
            <div>
              <Link to="/signup" style={{ fontSize: '13px', color: '#34B36F', fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#34B36F'}>Get Started</Link>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '32px', borderTop: '1px solid #18291E', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '12px', color: '#AEC3B0' }}>© 2026 A.C.E. — Autonomous Career Intelligence Engine</p>
          <p style={{ fontSize: '12px', color: '#AEC3B0' }}>Built for intelligent career decisions.</p>
        </div>
      </div>
    </footer>
  )
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="lp">
      <style>{STYLES}</style>
      <Hero />
      <Capabilities />
      <IntelligenceLoop />
      <AskAce />
      <VoiceInterview />
      <SkillGraph />
      <Comparison />
      <Journey />
      <Trust />
      <FinalCTA />
      <Footer />
    </div>
  )
}
