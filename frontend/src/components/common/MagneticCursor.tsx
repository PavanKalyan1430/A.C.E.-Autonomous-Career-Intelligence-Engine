/**
 * MagneticCursor — custom cursor with magnetic snap to interactive elements.
 * Uses requestAnimationFrame + lerp; no external deps required.
 * Hides automatically on touch-primary devices.
 */
import React, { useEffect, useRef } from 'react'

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

const MAGNETIC_SELECTORS = 'a, button, [data-magnetic], .glass-card'
const MAGNETIC_STRENGTH  = 0.3   // how far the element shifts toward cursor (0–1)
const CURSOR_EASE        = 0.12  // dot follows cursor speed
const RING_EASE          = 0.08  // ring lags slightly behind dot

export default function MagneticCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const rafRef  = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Bail on touch-first devices
    if (window.matchMedia('(hover: none)').matches) return

    const dot  = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    // Show cursors
    dot.style.opacity  = '1'
    ring.style.opacity = '1'

    let mx = window.innerWidth  / 2
    let my = window.innerHeight / 2
    let dx = mx, dy = my
    let rx = mx, ry = my
    let hovered = false

    const onMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY }
    const onEnter = () => { hovered = true }
    const onLeave = () => { hovered = false }

    // Delegate magnetic hover via event targets
    const attachMagnetic = (el: Element) => {
      el.addEventListener('mouseenter', onEnter)
      el.addEventListener('mouseleave', () => {
        onLeave()
        // Reset element transform when cursor leaves
        ;(el as HTMLElement).style.transform = ''
        ;(el as HTMLElement).style.transition = 'transform 0.4s cubic-bezier(0.23,1,0.32,1)'
      })
      el.addEventListener('mousemove', (ev) => {
        const rect = (el as HTMLElement).getBoundingClientRect()
        const cx = rect.left + rect.width  / 2
        const cy = rect.top  + rect.height / 2
        const ox = ((ev as MouseEvent).clientX - cx) * MAGNETIC_STRENGTH
        const oy = ((ev as MouseEvent).clientY - cy) * MAGNETIC_STRENGTH
        ;(el as HTMLElement).style.transform = `translate(${ox}px, ${oy}px)`
        ;(el as HTMLElement).style.transition = 'transform 0.15s ease'
      })
    }

    // Observe new elements added to DOM dynamically
    const attach = () => {
      document.querySelectorAll(MAGNETIC_SELECTORS).forEach(attachMagnetic)
    }
    attach()
    const mo = new MutationObserver(attach)
    mo.observe(document.body, { childList: true, subtree: true })

    const tick = () => {
      dx = lerp(dx, mx, CURSOR_EASE)
      dy = lerp(dy, my, CURSOR_EASE)
      rx = lerp(rx, mx, RING_EASE)
      ry = lerp(ry, my, RING_EASE)

      dot.style.transform  = `translate(${dx - 5}px,  ${dy - 5}px)`
      ring.style.transform = `translate(${rx - 18}px, ${ry - 18}px)`

      // Scale ring on hover
      ring.style.width  = hovered ? '52px' : '36px'
      ring.style.height = hovered ? '52px' : '36px'
      ring.style.borderColor = hovered ? 'rgba(52,179,111,0.7)' : 'rgba(107,143,113,0.5)'

      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    document.addEventListener('mousemove', onMove, { passive: true })

    return () => {
      document.removeEventListener('mousemove', onMove)
      mo.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <>
      {/* Dot */}
      <div
        ref={dotRef}
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '10px', height: '10px', borderRadius: '50%',
          background: 'rgba(52,179,111,0.9)',
          pointerEvents: 'none', zIndex: 99999,
          opacity: 0, transition: 'opacity 0.3s',
          willChange: 'transform',
          mixBlendMode: 'difference',
        }}
      />
      {/* Ring */}
      <div
        ref={ringRef}
        style={{
          position: 'fixed', top: 0, left: 0,
          width: '36px', height: '36px', borderRadius: '50%',
          border: '1.5px solid rgba(107,143,113,0.5)',
          background: 'transparent',
          pointerEvents: 'none', zIndex: 99998,
          opacity: 0, transition: 'opacity 0.3s, width 0.25s ease, height 0.25s ease, border-color 0.25s ease',
          willChange: 'transform',
        }}
      />
    </>
  )
}
