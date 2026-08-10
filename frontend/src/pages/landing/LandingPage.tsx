import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, FileText, Briefcase, Map, Building2,
  Bot, Mic, Menu, X, ChevronRight, CheckCircle,
  Brain, Shield, Zap, TrendingUp
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

// ─── All Responsive CSS (no Tailwind prefixes needed) ──────────────────────
const STYLES = `
  .lp { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #3d3d3d; }
  .lp *, .lp *::before, .lp *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* Scroll Snapping */
  html { scroll-snap-type: y mandatory; scroll-behavior: smooth; }
  .lp section, .lp footer { scroll-snap-align: start; scroll-snap-stop: always; }

  /* Container */
  .lp-wrap { max-width: 1280px; margin: 0 auto; padding: 0 40px; }
  @media (max-width: 640px) { .lp-wrap { padding: 0 20px; } }

  /* Nav */
  .lp-nav-links { display: none; align-items: center; gap: 8px; }
  .lp-nav-mob { display: block; }
  @media (min-width: 768px) { .lp-nav-links { display: flex; } .lp-nav-mob { display: none; } }

  /* Capabilities 6-card grid */
  .lp-cap-grid { display: grid; grid-template-columns: 1fr; gap: 20px; }
  @media (min-width: 600px) { .lp-cap-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (min-width: 960px) { .lp-cap-grid { grid-template-columns: repeat(3, 1fr); } }

  /* Two-column section layout */
  .lp-two { display: grid; grid-template-columns: 1fr; gap: 56px; align-items: center; }
  @media (min-width: 960px) { .lp-two { grid-template-columns: 1fr 1fr; } }

  /* Journey */
  .lp-journey { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
  @media (min-width: 768px)  { .lp-journey { grid-template-columns: repeat(3, 1fr); } }
  @media (min-width: 1024px) { .lp-journey { grid-template-columns: repeat(6, 1fr); gap: 0; } }

  /* Footer */
  .lp-footer-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px 24px; }
  @media (min-width: 768px) { .lp-footer-grid { grid-template-columns: 2fr 1fr 1fr 1fr; } }

  /* Hero headline */
  .lp-h1 {
    font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
    font-size: clamp(44px, 7.5vw, 86px);
    font-weight: 800;
    line-height: 0.95;
    letter-spacing: -0.025em;
    color: white;
    text-align: center;
    margin-bottom: 24px;
  }

  /* Section headings */
  .lp-h2 {
    font-family: 'Plus Jakarta Sans', 'Inter', system-ui, sans-serif;
    font-size: clamp(28px, 4vw, 48px);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
  }

  /* Loop nodes row */
  .lp-loop-branches { display: flex; gap: 16px; justify-content: center; flex-wrap: nowrap; }
  @media (max-width: 480px) { .lp-loop-branches { gap: 8px; } }

  /* Wave bars */
  @keyframes waveBar {
    0%, 100% { transform: scaleY(0.3); }
    50%       { transform: scaleY(1); }
  }

  /* Scroll reveal */
  .lp-reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease, transform 0.55s ease; }
  .lp-reveal.is-visible { opacity: 1; transform: none; }

  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .lp *, .lp *::before, .lp *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
    .lp-reveal { opacity: 1; transform: none; }
  }
`

// ─── 1. NAVIGATION ──────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(9,32,21,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(16px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(107,143,113,0.25)' : '1px solid transparent',
      transition: 'all 0.3s ease',
    }}>
      <div className="lp-wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img
            src="/logo.png" alt="A.C.E." height={36}
            style={{ height: '36px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.7)) drop-shadow(0 0 12px rgba(45,154,99,0.5))' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontWeight: 900, color: 'white', fontSize: '16px', letterSpacing: '-0.01em' }}>A.C.E.</div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Career OS</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="lp-nav-links">
          <Link to="/login" style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 600, color: '#AEC3B0', textDecoration: 'none', borderRadius: '8px', transition: 'color 0.2s, background 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#AEC3B0'; e.currentTarget.style.background = 'transparent' }}>
            Login
          </Link>
          <Link to="/signup" style={{
            marginLeft: '8px', padding: '9px 22px', fontSize: '14px', fontWeight: 700,
            color: '#fff', background: '#336659', borderRadius: '10px', textDecoration: 'none',
            boxShadow: '0 2px 12px rgba(51,102,89,0.4)', transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1f493d'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(51,102,89,0.6)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#336659'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(51,102,89,0.4)'; e.currentTarget.style.transform = 'none' }}>
            Get Started
          </Link>
        </div>

        {/* Mobile menu button */}
        <button className="lp-nav-mob" onClick={() => setOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#AEC3B0', padding: '8px', display: 'flex', alignItems: 'center' }}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      <div style={{
        overflow: 'hidden', maxHeight: open ? '120px' : '0',
        background: 'rgba(9,32,21,0.97)', transition: 'max-height 0.3s ease',
        borderBottom: open ? '1px solid rgba(107,143,113,0.2)' : 'none',
      }}>
        <div className="lp-wrap" style={{ paddingTop: '16px', paddingBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link to="/login" onClick={() => setOpen(false)}
            style={{ fontSize: '15px', fontWeight: 600, color: '#AEC3B0', textDecoration: 'none' }}>Login</Link>
          <Link to="/signup" onClick={() => setOpen(false)}
            style={{ fontSize: '15px', fontWeight: 700, color: '#fff', background: '#336659', padding: '10px 20px', borderRadius: '10px', textDecoration: 'none', textAlign: 'center' }}>
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}

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
  const btnTgt = useRef({ x: 0, y: 0 })
  const btnCur = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const hero = heroRef.current
    if (!hero) return

    const onMove = (e: MouseEvent) => {
      const r = hero.getBoundingClientRect()
      tgt.current = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }
      const btn = btnRef.current
      if (btn) {
        const br = btn.getBoundingClientRect()
        const dx = e.clientX - (br.left + br.width / 2)
        const dy = e.clientY - (br.top + br.height / 2)
        const d = Math.sqrt(dx * dx + dy * dy)
        btnTgt.current = d < 100 ? { x: dx * (1 - d / 100) * 0.22, y: dy * (1 - d / 100) * 0.22 } : { x: 0, y: 0 }
      }
    }
    const onLeave = () => { tgt.current = { x: 0.5, y: 0.5 }; btnTgt.current = { x: 0, y: 0 } }

    hero.addEventListener('mousemove', onMove)
    hero.addEventListener('mouseleave', onLeave)

    const tick = () => {
      cur.current.x = lerp(cur.current.x, tgt.current.x, 0.06)
      cur.current.y = lerp(cur.current.y, tgt.current.y, 0.06)
      btnCur.current.x = lerp(btnCur.current.x, btnTgt.current.x, 0.1)
      btnCur.current.y = lerp(btnCur.current.y, btnTgt.current.y, 0.1)

      const nx = cur.current.x - 0.5, ny = cur.current.y - 0.5

      if (spotRef.current)
        spotRef.current.style.background = `radial-gradient(700px circle at ${cur.current.x * 100}% ${cur.current.y * 100}%, rgba(51,102,89,0.2) 0%, transparent 65%)`
      if (l1.current) l1.current.style.transform = `translate(${nx * 12}px, ${ny * 9}px)`
      if (l2.current) l2.current.style.transform = `translate(${nx * 28}px, ${ny * 20}px)`
      if (btnRef.current) btnRef.current.style.transform = `translate(${btnCur.current.x}px, ${btnCur.current.y}px)`

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
      position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', overflow: 'hidden', userSelect: 'none',
      background: 'linear-gradient(135deg, #092015 0%, #0D2B1D 50%, #18291E 100%)',
    }}>
      {/* Grid */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.035,
        backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
        backgroundSize: '64px 64px', pointerEvents: 'none' }} />

      {/* Spotlight */}
      <div ref={spotRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transition: 'none' }} />

      {/* Parallax layer 1 */}
      <div ref={l1} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', willChange: 'transform' }}>
        <div style={{ position: 'absolute', top: '28%', left: '6%', width: '1px', height: '120px', background: 'linear-gradient(to bottom, transparent, rgba(51,102,89,0.4), transparent)' }} />
        <div style={{ position: 'absolute', bottom: '30%', right: '8%', width: '1px', height: '80px', background: 'linear-gradient(to bottom, transparent, rgba(107,143,113,0.3), transparent)' }} />
        <div style={{ position: 'absolute', top: '48%', left: '5%', width: '80px', height: '1px', background: 'linear-gradient(to right, transparent, rgba(51,102,89,0.3), transparent)' }} />
      </div>

      {/* Parallax layer 2 — foreground dots */}
      <div ref={l2} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', willChange: 'transform' }}>
        <div style={{ position: 'absolute', top: '35%', right: '18%', width: '7px', height: '7px', borderRadius: '50%', background: 'rgba(107,143,113,0.5)' }} />
        <div style={{ position: 'absolute', bottom: '38%', left: '16%', width: '5px', height: '5px', borderRadius: '50%', background: 'rgba(51,102,89,0.6)' }} />
        <div style={{ position: 'absolute', top: '22%', left: '30%', width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(174,195,176,0.4)' }} />
      </div>

      {/* Content */}
      <div className="lp-wrap" style={{ position: 'relative', zIndex: 10, textAlign: 'center', paddingTop: '96px', paddingBottom: '80px', width: '100%' }}>
        {/* Prominent ACE Brand Logo */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '28px' }}>
          <div style={{
            position: 'absolute', inset: '-20px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(51,102,89,0.35) 0%, transparent 70%)',
            filter: 'blur(16px)', pointerEvents: 'none'
          }} />
          <img
            src="/logo.png"
            alt="A.C.E. Logo"
            style={{
              position: 'relative', height: '64px', width: 'auto',
              maxHeight: '72px', objectFit: 'contain', margin: '0 auto',
              filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8)) drop-shadow(0 0 24px rgba(45,154,99,0.6))'
            }}
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>

        {/* Eyebrow */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: '999px',
          border: '1px solid rgba(51,102,89,0.45)', background: 'rgba(51,102,89,0.1)',
          marginBottom: '32px',
        }}>
          <span style={{ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: '#6B8F71', animation: 'waveBar 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Autonomous Career Intelligence
          </span>
        </div>

        {/* Headline */}
        <h1 className="lp-h1">
          YOUR CAREER.<br />
          <span style={{ color: '#6B8F71' }}>INTELLIGENTLY</span><br />
          ENGINEERED.
        </h1>

        {/* Subheadline */}
        <p style={{ color: '#AEC3B0', fontSize: 'clamp(16px, 2vw, 19px)', lineHeight: 1.65, maxWidth: '600px', margin: '0 auto 44px', fontWeight: 500 }}>
          A.C.E. is an autonomous career intelligence engine that understands your skills, analyzes opportunities, identifies what you're missing, and helps you prepare for what's next.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
          <Link
            ref={btnRef}
            to="/signup"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '14px 28px', borderRadius: '12px', fontWeight: 700,
              fontSize: '15px', color: '#fff', textDecoration: 'none',
              background: 'linear-gradient(135deg, #336659, #1f493d)',
              boxShadow: '0 4px 24px rgba(51,102,89,0.4)',
              willChange: 'transform', transition: 'box-shadow 0.25s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 36px rgba(51,102,89,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(51,102,89,0.4)' }}
          >
            Start with ACE <ArrowRight size={17} />
          </Link>
          <a href="#capabilities" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '14px 28px', borderRadius: '12px', fontWeight: 600,
            fontSize: '15px', color: '#AEC3B0', textDecoration: 'none',
            border: '1px solid rgba(51,102,89,0.35)', background: 'transparent',
            transition: 'all 0.2s ease',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(51,102,89,0.7)'; e.currentTarget.style.background = 'rgba(51,102,89,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.color = '#AEC3B0'; e.currentTarget.style.borderColor = 'rgba(51,102,89,0.35)'; e.currentTarget.style.background = 'transparent' }}>
            Explore how it works
          </a>
        </div>

        {/* Scroll hint */}
        <div style={{ marginTop: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', opacity: 0.4 }}>
          <div style={{ width: '1px', height: '36px', background: 'linear-gradient(to bottom, #6B8F71, transparent)' }} />
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Scroll</span>
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
  const hl = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } }, { threshold: 0.1 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || !hl.current) return
    const r = ref.current.getBoundingClientRect()
    hl.current.style.background = `radial-gradient(220px circle at ${e.clientX - r.left}px ${e.clientY - r.top}px, rgba(51,102,89,0.1) 0%, transparent 70%)`
  }, [])

  const onLeave = useCallback(() => { if (hl.current) hl.current.style.background = 'transparent' }, [])

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      style={{
        position: 'relative', overflow: 'hidden', borderRadius: '16px',
        background: '#fff', border: '1px solid #e8e4db',
        boxShadow: '0 2px 8px rgba(61,61,61,0.05)',
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : 'translateY(24px)',
        transition: `opacity 0.5s ease ${i * 0.08}s, transform 0.5s ease ${i * 0.08}s, box-shadow 0.25s ease, border-color 0.25s ease`,
        cursor: 'default',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 28px rgba(51,102,89,0.12)'
        e.currentTarget.style.borderColor = 'rgba(51,102,89,0.4)'
        e.currentTarget.style.transform = 'translateY(-3px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(61,61,61,0.05)'
        e.currentTarget.style.borderColor = '#e8e4db'
        e.currentTarget.style.transform = vis ? 'none' : 'translateY(24px)'
        onLeave()
      }}
    >
      {/* Cursor radial highlight */}
      <div ref={hl} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', borderRadius: '16px', transition: 'none' }} />

      {/* Top accent border */}
      <div style={{ height: '3px', background: cap.accent, borderRadius: '16px 16px 0 0' }} />

      <div style={{ padding: '28px 28px 32px' }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '12px', marginBottom: '20px',
          background: `${cap.accent}18`, color: cap.accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.25s ease',
        }}>
          <cap.Icon size={20} />
        </div>
        <h3 style={{ fontWeight: 800, fontSize: '15px', color: '#3d3d3d', marginBottom: '8px' }}>{cap.title}</h3>
        <p style={{ fontSize: '14px', color: '#6B8F71', lineHeight: 1.65 }}>{cap.desc}</p>
      </div>
    </div>
  )
}

function Capabilities() {
  const { ref, visible } = useScrollReveal()
  return (
    <section id="capabilities" style={{ padding: '112px 0', background: '#faf9f6' }}>
      <div className="lp-wrap">
        <div ref={ref} className="lp-reveal" style={{ textAlign: 'center', marginBottom: '64px', ...(visible ? { opacity: 1, transform: 'none' } : {}) }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>What ACE Does</p>
          <h2 className="lp-h2" style={{ color: '#3d3d3d', marginBottom: '16px' }}>ONE INTELLIGENCE LAYER.<br />YOUR ENTIRE CAREER.</h2>
          <p style={{ fontSize: '17px', color: '#6B8F71', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>Six interconnected capabilities, working as one unified system.</p>
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
  const nodeStyle = (active: boolean, accent?: boolean): React.CSSProperties => ({
    padding: '10px 24px', borderRadius: '12px', textAlign: 'center',
    background: active ? (accent ? '#336659' : '#18291E') : '#0D2B1D',
    border: `1px solid ${active ? (accent ? '#6B8F71' : '#336659') : '#18291E'}`,
    boxShadow: active && accent ? '0 0 24px rgba(51,102,89,0.3)' : 'none',
    opacity: active ? 1 : 0.2,
    transform: active ? 'scale(1)' : 'scale(0.93)',
    transition: 'all 0.45s ease',
    minWidth: '120px',
  })

  const conn = (active: boolean): React.CSSProperties => ({
    width: '1px', height: '28px', margin: '0 auto',
    background: active ? 'linear-gradient(to bottom, #336659, #6B8F71)' : '#18291E',
    transition: 'background 0.4s ease',
  })

  return (
    <section style={{ padding: '112px 0', background: '#0D2B1D' }}>
      <div className="lp-wrap">
        <div style={{ textAlign: 'center', marginBottom: '72px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>The Intelligence Loop</p>
          <h2 className="lp-h2" style={{ color: 'white' }}>ACE DOESN'T JUST ANALYZE.<br /><span style={{ color: '#6B8F71' }}>IT CONNECTS THE DOTS.</span></h2>
        </div>

        <div ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {/* Resume */}
          <div style={nodeStyle(a(0))}>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '12px', letterSpacing: '0.08em' }}>YOUR RESUME</div>
            <div style={{ fontSize: '11px', color: a(0) ? '#AEC3B0' : '#4E6243', marginTop: '2px' }}>Career profile parsed</div>
          </div>
          <div style={conn(a(0))} />

          {/* ACE Analysis */}
          <div style={nodeStyle(a(1), true)}>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '12px', letterSpacing: '0.08em' }}>ACE ANALYSIS</div>
            <div style={{ fontSize: '11px', color: a(1) ? '#AEC3B0' : '#4E6243', marginTop: '2px' }}>Deep semantic processing</div>
          </div>
          <div style={conn(a(1))} />

          {/* Three branches */}
          <div className="lp-loop-branches">
            {[
              { label: 'JOBS', sub: 'Best-fit roles', active: a(2) },
              { label: 'SKILLS', sub: 'Gaps identified', active: a(3) },
              { label: 'COMPANIES', sub: 'Culture + signals', active: a(4) },
            ].map(n => (
              <div key={n.label} style={nodeStyle(n.active)}>
                <div style={{ fontWeight: 800, color: 'white', fontSize: '11px', letterSpacing: '0.08em' }}>{n.label}</div>
                <div style={{ fontSize: '10px', color: n.active ? '#AEC3B0' : '#4E6243', marginTop: '2px' }}>{n.sub}</div>
              </div>
            ))}
          </div>
          <div style={conn(a(4))} />

          {/* Career Plan */}
          <div style={nodeStyle(a(5), true)}>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '12px', letterSpacing: '0.08em' }}>CAREER PLAN</div>
            <div style={{ fontSize: '11px', color: a(5) ? '#AEC3B0' : '#4E6243', marginTop: '2px' }}>Your personalised strategy</div>
          </div>
          <div style={conn(a(5))} />

          {/* Mock Interview */}
          <div style={nodeStyle(a(6))}>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '12px', letterSpacing: '0.08em' }}>MOCK INTERVIEW</div>
            <div style={{ fontSize: '11px', color: a(6) ? '#AEC3B0' : '#4E6243', marginTop: '2px' }}>Practice intelligently</div>
          </div>
          <div style={conn(a(6))} />

          {/* Apply Better */}
          <div style={{ ...nodeStyle(a(7), true), boxShadow: a(7) ? '0 0 32px rgba(51,102,89,0.4)' : 'none' }}>
            <div style={{ fontWeight: 800, color: 'white', fontSize: '12px', letterSpacing: '0.08em' }}>APPLY BETTER</div>
            <div style={{ fontSize: '11px', color: a(7) ? '#AEC3B0' : '#4E6243', marginTop: '2px' }}>With full preparation</div>
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
    <section style={{ padding: '112px 0', background: '#faf9f6' }}>
      <div className="lp-wrap">
        <div className="lp-two">
          {/* Left */}
          <div ref={ref} className="lp-reveal" style={visible ? { opacity: 1, transform: 'none' } : {}}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>Interactive Demo</p>
            <h2 className="lp-h2" style={{ color: '#3d3d3d', marginBottom: '20px' }}>ASK ACE.</h2>
            <p style={{ fontSize: '17px', color: '#6B8F71', lineHeight: 1.65, marginBottom: '32px' }}>
              Your career questions become actionable intelligence. ACE coordinates semantic analysis, skill mapping, and market research in seconds.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {['Resume analysis', 'Semantic job alignment', 'Skill gap identification', 'Actionable recommendations'].map((f, i) => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '14px', fontWeight: 600, color: '#4E6243' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#E3EFD3', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={11} color="#336659" />
                  </div>
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* Right — Demo UI */}
          <div style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid #e8e4db', background: '#fff', boxShadow: '0 4px 24px rgba(61,61,61,0.08)' }}>
            {/* Header bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: '#faf9f6', borderBottom: '1px solid #f3efe8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#336659' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#3d3d3d', letterSpacing: '0.03em' }}>ACE Intelligence</span>
              </div>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Demo</span>
            </div>

            <div style={{ padding: '24px', minHeight: '420px' }}>
              {/* User */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
                <div style={{ background: '#336659', color: '#fff', borderRadius: '16px 16px 4px 16px', padding: '12px 16px', fontSize: '14px', fontWeight: 500, maxWidth: '280px', lineHeight: 1.5 }}>
                  "Am I ready for backend engineering roles?"
                </div>
              </div>

              {/* Processing checks */}
              {phase !== 'idle' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                  {[{ l: 'Resume analyzed', n: 1 }, { l: 'Semantic role alignment', n: 2 }, { l: 'Skill gaps identified', n: 3 }].map(item => (
                    <div key={item.l} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', opacity: rev >= item.n ? 1 : 0.3, transition: 'opacity 0.4s ease' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: rev >= item.n ? '#E3EFD3' : '#f3efe8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {rev >= item.n ? <CheckCircle size={9} color="#336659" /> : <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#AEC3B0' }} />}
                      </div>
                      <span style={{ color: rev >= item.n ? '#3d3d3d' : '#AEC3B0' }}>{item.l}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Results */}
              {phase === 'done' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Readiness */}
                  <div style={ri(4)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#3d3d3d', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Career Readiness</span>
                      <span style={{ fontSize: '20px', fontWeight: 900, color: '#336659' }}>82%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '99px', background: '#E3EFD3', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '82%', background: 'linear-gradient(90deg, #336659, #6B8F71)', borderRadius: '99px', transition: 'width 1s ease' }} />
                    </div>
                  </div>

                  {/* Strong areas */}
                  <div style={ri(5)}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#3d3d3d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Strong Areas</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Python', 'FastAPI', 'PostgreSQL'].map(s => (
                        <span key={s} style={{ padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: '#E3EFD3', color: '#336659' }}>{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Gaps */}
                  <div style={ri(6)}>
                    <p style={{ fontSize: '11px', fontWeight: 700, color: '#3d3d3d', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>High-Impact Gaps</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {['Kubernetes', 'System Design'].map(s => (
                        <span key={s} style={{ padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, background: '#fff3e0', color: '#d97706' }}>{s}</span>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div style={ri(7)}>
                    <div style={{ padding: '14px 16px', borderRadius: '12px', background: '#f3efe8', borderLeft: '4px solid #336659' }}>
                      <p style={{ fontSize: '10px', fontWeight: 700, color: '#336659', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Recommended Next Step</p>
                      <p style={{ fontSize: '13px', color: '#3d3d3d', lineHeight: 1.55 }}>Build your Kubernetes foundation before targeting senior backend roles.</p>
                    </div>
                    <Link to="/signup" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '12px', fontSize: '13px', fontWeight: 700, color: '#336659', textDecoration: 'none' }}>
                      View your roadmap <ArrowRight size={13} />
                    </Link>
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
    <section style={{ padding: '112px 0', background: '#0D2B1D' }}>
      <div className="lp-wrap">
        <div className="lp-two">
          {/* Interview card */}
          <div ref={ref} style={{
            borderRadius: '20px', overflow: 'hidden', border: '1px solid #336659',
            background: '#18291E',
            boxShadow: listening ? '0 0 48px rgba(51,102,89,0.2)' : 'none',
            opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(20px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease, box-shadow 0.8s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #1f493d' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: listening ? '#6B8F71' : '#4E6243', transition: 'background 0.6s' }} />
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'white', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Mock Interview</span>
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.1em', textTransform: 'uppercase' }}>System Design Round</span>
            </div>

            <div style={{ padding: '40px 32px', textAlign: 'center' }}>
              <p style={{ color: 'white', fontSize: '18px', fontWeight: 700, lineHeight: 1.5, marginBottom: '36px' }}>
                "Design a distributed caching system."
              </p>

              {/* Mic */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <div style={{ position: 'relative' }}>
                  {listening && (
                    <>
                      <div style={{ position: 'absolute', inset: '-12px', borderRadius: '50%', background: '#336659', opacity: 0.15, animation: 'waveBar 2s ease-in-out infinite' }} />
                      <div style={{ position: 'absolute', inset: '-24px', borderRadius: '50%', background: '#6B8F71', opacity: 0.08, animation: 'waveBar 2.5s ease-in-out infinite 0.5s' }} />
                    </>
                  )}
                  <div style={{
                    position: 'relative', width: '64px', height: '64px', borderRadius: '50%',
                    background: listening ? '#336659' : '#092015', border: '2px solid #336659',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.6s ease',
                  }}>
                    <Mic size={24} color="white" />
                  </div>
                </div>

                {/* Waveform */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', height: '32px' }}>
                  {Array.from({ length: 18 }).map((_, i) => (
                    <div key={i} style={{
                      width: '3px', borderRadius: '99px', transformOrigin: 'center',
                      background: listening ? '#6B8F71' : '#18291E',
                      height: '4px',
                      animation: listening ? `waveBar ${0.4 + (i % 5) * 0.1}s ease-in-out infinite alternate` : 'none',
                      animationDelay: `${i * 0.05}s`,
                      transition: 'background 0.6s ease, height 0.4s ease',
                    }} />
                  ))}
                </div>

                <span style={{ fontSize: '12px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                  {listening ? 'Listening' : 'Ready'}
                </span>
              </div>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginTop: '32px' }}>
                {[{ l: 'Speaking Pace', v: '142 WPM' }, { l: 'Filler Words', v: 'Low' }, { l: 'Structure', v: 'Strong' }].map((m, i) => (
                  <div key={m.l} style={{
                    background: '#092015', borderRadius: '12px', padding: '14px 12px',
                    opacity: visible && listening ? 1 : 0,
                    transform: visible && listening ? 'none' : 'translateY(8px)',
                    transition: `all 0.4s ease ${1 + i * 0.15}s`,
                  }}>
                    <p style={{ fontSize: '9px', color: '#6B8F71', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>{m.l}</p>
                    <p style={{ fontSize: '14px', fontWeight: 800, color: 'white' }}>{m.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Copy */}
          <div style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateX(20px)', transition: 'all 0.7s ease 0.2s' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>Mock Interview</p>
            <h2 className="lp-h2" style={{ color: 'white', marginBottom: '20px' }}>
              PRACTICE ISN'T ENOUGH.<br /><span style={{ color: '#6B8F71' }}>PRACTICE INTELLIGENTLY.</span>
            </h2>
            <p style={{ fontSize: '17px', color: '#AEC3B0', lineHeight: 1.65, marginBottom: '32px' }}>
              Real-time voice interviews with structured feedback and measurable improvement — not generic question banks.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {['Real-time voice processing', 'Structure and clarity scoring', 'Personalised feedback after each session'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '15px', fontWeight: 500, color: '#AEC3B0' }}>
                  <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#336659', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <CheckCircle size={11} color="white" />
                  </div>
                  {f}
                </div>
              ))}
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

  const sc = (s: string) => s === 'done' ? '#336659' : s === 'focus' ? '#6B8F71' : '#AEC3B0'
  const sl = (s: string) => s === 'done' ? '✓' : s === 'focus' ? '◉' : '○'

  return (
    <section style={{ padding: '112px 0', background: '#faf9f6' }}>
      <div className="lp-wrap">
        <div className="lp-two">
          {/* Left copy */}
          <div ref={ref} className="lp-reveal" style={visible ? { opacity: 1, transform: 'none' } : {}}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>Skill Roadmap</p>
            <h2 className="lp-h2" style={{ color: '#3d3d3d', marginBottom: '20px' }}>
              DON'T JUST FIND<br />YOUR SKILL GAPS.<br /><span style={{ color: '#336659' }}>KNOW WHAT TO LEARN FIRST.</span>
            </h2>
            <p style={{ fontSize: '17px', color: '#6B8F71', lineHeight: 1.65, marginBottom: '32px' }}>
              ACE builds prerequisite-aware skill graphs so you always know which skill to unlock next — not just what you're missing.
            </p>
            <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
              {[{ s: '✓', l: 'Completed', c: '#336659' }, { s: '◉', l: 'Current Focus', c: '#6B8F71' }, { s: '○', l: 'Recommended', c: '#AEC3B0' }].map(lg => (
                <div key={lg.l} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600, color: '#3d3d3d' }}>
                  <span style={{ color: lg.c, fontWeight: 900 }}>{lg.s}</span> {lg.l}
                </div>
              ))}
            </div>
          </div>

          {/* Right SVG graph */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg viewBox="0 0 400 460" style={{ width: '100%', maxWidth: '380px', overflow: 'visible' }}>
              {skEdges.map((e, i) => {
                const f = skMap[e.f], t = skMap[e.t]
                const isHov = hov === e.f || hov === e.t
                return (
                  <line key={i}
                    x1={f.x} y1={f.y + 16} x2={t.x} y2={t.y - 16}
                    stroke={isHov ? '#336659' : (visible ? '#AEC3B0' : '#e8e4db')}
                    strokeWidth={isHov ? 2.5 : 1.5}
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
                    <rect x={-62} y={-18} width={124} height={36} rx={18}
                      fill={isHov ? col : '#fff'}
                      stroke={col} strokeWidth={isHov ? 2 : 1.5}
                      style={{ transition: 'all 0.2s ease' }}
                    />
                    <text x={0} y={6} textAnchor="middle" fontSize={12} fontWeight={700}
                      fill={isHov ? '#fff' : col}
                      style={{ fontFamily: '"Arial MT", Arial, sans-serif', userSelect: 'none' }}>
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
    <section style={{ padding: '112px 0', background: '#0D2B1D' }}>
      <div className="lp-wrap">
        <div ref={ref} className="lp-reveal" style={{ textAlign: 'center', marginBottom: '64px', ...(visible ? { opacity: 1, transform: 'none' } : {}) }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>Why ACE</p>
          <h2 className="lp-h2" style={{ color: 'white' }}>FROM FRAGMENTED<br /><span style={{ color: '#6B8F71' }}>TO INTELLIGENT.</span></h2>
        </div>

        <div style={{ maxWidth: '780px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '0 20px 16px', borderBottom: '1px solid #18291E', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#4E6243', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Traditional</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.1em', textTransform: 'uppercase' }}>A.C.E.</span>
          </div>

          {comps.map((row, i) => (
            <div key={i}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px',
                padding: '14px 20px', borderRadius: '10px', cursor: 'default',
                background: hov === i ? '#18291E' : 'transparent',
                opacity: visible ? 1 : 0,
                transform: visible ? 'none' : 'translateX(-16px)',
                transition: `opacity 0.5s ease ${i * 0.06}s, transform 0.5s ease ${i * 0.06}s, background 0.2s ease`,
              }}
              onMouseEnter={() => setHov(i)}
              onMouseLeave={() => setHov(null)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: hov === i ? '#6B8F71' : '#4E6243' }}>
                <div style={{ width: '3px', height: '14px', background: 'currentColor', opacity: 0.3, borderRadius: '99px' }} />
                {row.t}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: hov === i ? '#E3EFD3' : '#AEC3B0' }}>
                <ChevronRight size={14} color="#336659" />
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
  { n: '3', stage: 'Prepare', desc: 'Build your skill roadmap', cap: 'Skill Roadmap' },
  { n: '4', stage: 'Practice', desc: 'Voice interview simulations', cap: 'Mock Interview' },
  { n: '5', stage: 'Apply', desc: 'Apply to the right roles', cap: 'Company Intelligence' },
  { n: '6', stage: 'Improve', desc: 'Refine based on outcomes', cap: 'AI Career Agent' },
]

function Journey() {
  const { ref, visible } = useScrollReveal(0.1)
  return (
    <section style={{ padding: '112px 0', background: '#faf9f6' }}>
      <div className="lp-wrap">
        <div ref={ref} className="lp-reveal" style={{ textAlign: 'center', marginBottom: '64px', ...(visible ? { opacity: 1, transform: 'none' } : {}) }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>The Career Journey</p>
          <h2 className="lp-h2" style={{ color: '#3d3d3d' }}>ONE SYSTEM.<br /><span style={{ color: '#336659' }}>EVERY STEP OF THE JOURNEY.</span></h2>
        </div>

        <div className="lp-journey">
          {journey.map((s, i) => (
            <div key={s.stage} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '8px',
              opacity: visible ? 1 : 0,
              transform: visible ? 'none' : 'translateY(16px)',
              transition: `all 0.5s ease ${i * 0.1}s`,
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: '#336659', boxShadow: '0 4px 16px rgba(51,102,89,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '14px', position: 'relative', zIndex: 1,
                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(51,102,89,0.45)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(51,102,89,0.3)' }}
              >
                <span style={{ fontSize: '20px', fontWeight: 900, color: 'white' }}>{s.n}</span>
              </div>
              <h3 style={{ fontWeight: 800, fontSize: '14px', color: '#3d3d3d', marginBottom: '4px' }}>{s.stage}</h3>
              <p style={{ fontSize: '12px', color: '#6B8F71', lineHeight: 1.5, marginBottom: '8px' }}>{s.desc}</p>
              <span style={{ fontSize: '9px', fontWeight: 700, color: '#336659', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 10px', borderRadius: '99px', background: '#E3EFD3' }}>{s.cap}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 10. TRUST ──────────────────────────────────────────────────────────────
const trust = [
  { Icon: Brain, l: 'Semantic matching' }, { Icon: Shield, l: 'Stateful AI memory' },
  { Icon: Zap, l: 'Live company research' }, { Icon: Mic, l: 'Real-time voice processing' },
  { Icon: Map, l: 'Prerequisite skill graphs' }, { Icon: Shield, l: 'Secure authentication' },
  { Icon: TrendingUp, l: 'Persistent career history' },
]

function Trust() {
  const { ref, visible } = useScrollReveal()
  return (
    <section style={{ padding: '96px 0', background: '#faf9f6' }}>
      <div className="lp-wrap">
        <div ref={ref} className="lp-reveal" style={{ textAlign: 'center', ...(visible ? { opacity: 1, transform: 'none' } : {}) }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '16px' }}>Built for Intelligence</p>
          <h2 className="lp-h2" style={{ color: '#3d3d3d', fontSize: 'clamp(22px, 3vw, 34px)', marginBottom: '48px' }}>
            BUILT FOR INTELLIGENT<br />CAREER DECISIONS.
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px' }}>
            {trust.map(({ Icon, l }, i) => (
              <div key={l} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', borderRadius: '99px',
                border: '1px solid #e8e4db', background: '#fff', color: '#3d3d3d',
                fontSize: '13px', fontWeight: 600,
                opacity: visible ? 1 : 0,
                transition: `opacity 0.4s ease ${i * 0.06}s, transform 0.3s ease, box-shadow 0.3s ease`,
                cursor: 'default',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(51,102,89,0.1)'; e.currentTarget.style.borderColor = 'rgba(51,102,89,0.4)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#e8e4db' }}>
                <Icon size={14} color="#336659" />
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
  const btnRef = useRef<HTMLAnchorElement>(null)
  const raf = useRef<number | undefined>(undefined)
  const tgt = useRef({ x: 0, y: 0 })
  const cur = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const btn = btnRef.current
      if (!btn) return
      const br = btn.getBoundingClientRect()
      const dx = e.clientX - (br.left + br.width / 2)
      const dy = e.clientY - (br.top + br.height / 2)
      const d = Math.sqrt(dx * dx + dy * dy)
      tgt.current = d < 90 ? { x: dx * (1 - d / 90) * 0.2, y: dy * (1 - d / 90) * 0.2 } : { x: 0, y: 0 }
    }
    const tick = () => {
      cur.current.x = lerp(cur.current.x, tgt.current.x, 0.1)
      cur.current.y = lerp(cur.current.y, tgt.current.y, 0.1)
      if (btnRef.current) btnRef.current.style.transform = `translate(${cur.current.x}px, ${cur.current.y}px)`
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    window.addEventListener('mousemove', onMove)
    return () => { window.removeEventListener('mousemove', onMove); if (raf.current) cancelAnimationFrame(raf.current) }
  }, [])

  return (
    <section style={{ padding: '120px 0', background: 'linear-gradient(135deg, #092015, #0D2B1D)', textAlign: 'center' }}>
      <div className="lp-wrap">
        <div ref={ref} className="lp-reveal" style={visible ? { opacity: 1, transform: 'none' } : {}}>
          <img src="/logo.png" alt="A.C.E." style={{ height: '48px', width: 'auto', objectFit: 'contain', margin: '0 auto 40px', display: 'block', filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.75)) drop-shadow(0 0 18px rgba(45,154,99,0.5))' }}
            onError={(e) => { e.currentTarget.style.display = 'none' }} />

          <h2 className="lp-h2" style={{ color: 'white', fontSize: 'clamp(32px, 5.5vw, 58px)', marginBottom: '20px' }}>
            YOUR NEXT CAREER MOVE<br /><span style={{ color: '#6B8F71' }}>SHOULDN'T BE A GUESS.</span>
          </h2>

          <p style={{ fontSize: '18px', color: '#AEC3B0', lineHeight: 1.65, maxWidth: '520px', margin: '0 auto 52px' }}>
            Let ACE understand where you are, where you want to go, and what it will take to get there.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '16px' }}>
            <Link ref={btnRef} to="/signup" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '15px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '16px',
              color: '#fff', textDecoration: 'none',
              background: 'linear-gradient(135deg, #336659, #1f493d)',
              boxShadow: '0 4px 24px rgba(51,102,89,0.45)',
              willChange: 'transform', transition: 'box-shadow 0.25s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 40px rgba(51,102,89,0.65)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(51,102,89,0.45)' }}>
              Start with ACE <ArrowRight size={18} />
            </Link>
            <Link to="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '15px 32px', borderRadius: '12px', fontWeight: 600, fontSize: '16px',
              color: '#AEC3B0', textDecoration: 'none',
              border: '1px solid rgba(51,102,89,0.35)',
              transition: 'all 0.2s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'rgba(51,102,89,0.7)' }}
              onMouseLeave={e => { e.currentTarget.style.color = '#AEC3B0'; e.currentTarget.style.borderColor = 'rgba(51,102,89,0.35)' }}>
              Explore ACE
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
    <footer style={{ padding: '64px 0 40px', background: '#092015', borderTop: '1px solid #18291E' }}>
      <div className="lp-wrap">
        <div className="lp-footer-grid">
          <div>
            <img src="/logo.png" alt="A.C.E." style={{ height: '36px', width: 'auto', objectFit: 'contain', marginBottom: '12px', display: 'block', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.6)) drop-shadow(0 0 12px rgba(45,154,99,0.4))' }}
              onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <p style={{ fontSize: '12px', fontWeight: 700, color: 'white', letterSpacing: '-0.01em', marginBottom: '4px' }}>A.C.E.</p>
            <p style={{ fontSize: '13px', color: '#4E6243', lineHeight: 1.55 }}>Autonomous Career Intelligence Engine</p>
          </div>
          <div>
            <h4 style={{ fontSize: '10px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Product</h4>
            {['Resume Intelligence', 'Job Intelligence', 'Skill Roadmap', 'AI Career Agent', 'Mock Interview'].map(l => (
              <div key={l} style={{ marginBottom: '10px' }}>
                <Link to="/signup" style={{ fontSize: '13px', color: '#4E6243', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#AEC3B0'}
                  onMouseLeave={e => e.currentTarget.style.color = '#4E6243'}>{l}</Link>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ fontSize: '10px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Company</h4>
            {['About', 'GitHub', 'Documentation'].map(l => (
              <div key={l} style={{ marginBottom: '10px' }}>
                <a href="#" style={{ fontSize: '13px', color: '#4E6243', textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#AEC3B0'}
                  onMouseLeave={e => e.currentTarget.style.color = '#4E6243'}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <h4 style={{ fontSize: '10px', fontWeight: 700, color: '#6B8F71', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px' }}>Account</h4>
            <div style={{ marginBottom: '10px' }}>
              <Link to="/login" style={{ fontSize: '13px', color: '#4E6243', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#AEC3B0'}
                onMouseLeave={e => e.currentTarget.style.color = '#4E6243'}>Login</Link>
            </div>
            <div>
              <Link to="/signup" style={{ fontSize: '13px', color: '#6B8F71', fontWeight: 700, textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = '#6B8F71'}>Get Started</Link>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: '32px', borderTop: '1px solid #18291E', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <p style={{ fontSize: '12px', color: '#4E6243' }}>© 2026 A.C.E. — Autonomous Career Intelligence Engine</p>
          <p style={{ fontSize: '12px', color: '#4E6243' }}>Built for intelligent career decisions.</p>
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
      <Nav />
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
