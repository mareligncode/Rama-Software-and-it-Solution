import { motion, useInView } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'

export function Counter({ value, suffix = '', decimals = 0 }) {
  const [display, setDisplay] = useState(0)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })

  useEffect(() => {
    if (inView) {
      let start = 0
      const end = value
      const duration = 2000
      const startTime = performance.now()

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime
        const progress = Math.min(elapsed / duration, 1)
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const current = start + (end - start) * easeOut
        setDisplay(current)

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }

      requestAnimationFrame(animate)
    }
  }, [inView, value])

  return (
    <span ref={ref}>
      {display.toFixed(decimals)}{suffix}
    </span>
  )
}

export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function SectionHeading({ eyebrow, title, description, align = 'center', tone = 'light' }) {
  return (
    <div className={`max-w-3xl ${align === 'left' ? 'text-left' : 'text-center mx-auto'}`}>
      {eyebrow && (
        <p className={`text-xs font-bold uppercase tracking-[0.2em] ${
          tone === 'dark' ? 'text-accent' : 'text-secondary'
        }`}>
          {eyebrow}
        </p>
      )}
      <h2 className={`mt-4 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl ${
        tone === 'dark' ? 'text-white' : 'text-foreground'
      }`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-4 text-base leading-relaxed ${
          tone === 'dark' ? 'text-white/60' : 'text-muted-foreground'
        }`}>
          {description}
        </p>
      )}
    </div>
  )
}

export function GlowOrb({ className }) {
  return <div className={`absolute rounded-full blur-3xl pointer-events-none ${className}`} />
}

export function Eyebrow({ children }) {
  return (
    <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary">
      {children}
    </p>
  )
}
