import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion"
import { ArrowRight, PlayCircle, ShieldCheck, Activity, Sparkles, ChevronRight } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import React from "react"
import heroDashboard from "@/assets/hero-dashboard.jpg"
import logo from "@/assets/logo.png"
import { Counter, GlowOrb } from "./primitives"

const STATS = [
  { value: 10, suffix: "+", label: "Years Vision" },
  { value: 150, suffix: "+", label: "Projects Delivered" },
  { value: 98, suffix: "%", label: "Client Satisfaction" },
  { value: 24, suffix: "/7", label: "Managed Support" },
]

// Particle Network Background Component
function ParticleNetwork() {
  const canvasRef = useRef(null)
  const [isReducedMotion, setIsReducedMotion] = useState(false)

  useEffect(() => {
    setIsReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    
    if (isReducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId
    let particles = []
    let mouse = { x: null, y: null, radius: 150 }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      initParticles()
    }

    const initParticles = () => {
      particles = []
      const numberOfParticles = Math.min(Math.floor((canvas.width * canvas.height) / 15000), 150)
      
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: Math.random() * 2 + 1,
          opacity: Math.random() * 0.5 + 0.2,
          color: Math.random() > 0.5 ? 'oklch(0.51 0.211 263)' : 'oklch(0.77 0.153 226)'
        })
      }
    }

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      particles.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        // Mouse interaction
        if (mouse.x !== null && mouse.y !== null) {
          const dx = mouse.x - particle.x
          const dy = mouse.y - particle.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < mouse.radius) {
            const force = (mouse.radius - distance) / mouse.radius
            particle.x -= dx * force * 0.02
            particle.y -= dy * force * 0.02
          }
        }

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.globalAlpha = particle.opacity
        ctx.fill()

        // Draw connections
        particles.slice(i + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x
          const dy = particle.y - otherParticle.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 120) {
            ctx.beginPath()
            ctx.strokeStyle = particle.color
            ctx.globalAlpha = (1 - distance / 120) * 0.3
            ctx.lineWidth = 0.5
            ctx.moveTo(particle.x, particle.y)
            ctx.lineTo(otherParticle.x, otherParticle.y)
            ctx.stroke()
          }
        })
      })

      animationFrameId = requestAnimationFrame(drawParticles)
    }

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
    }

    const handleMouseLeave = () => {
      mouse.x = null
      mouse.y = null
    }

    window.addEventListener('resize', resizeCanvas)
    canvas.addEventListener('mousemove', handleMouseMove)
    canvas.addEventListener('mouseleave', handleMouseLeave)
    
    resizeCanvas()
    drawParticles()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      canvas.removeEventListener('mousemove', handleMouseMove)
      canvas.removeEventListener('mouseleave', handleMouseLeave)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isReducedMotion])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: isReducedMotion ? 0.3 : 0.6 }}
    />
  )
}

// Multi-layer Background Component
class MultiLayerBackground extends React.Component {
  constructor(props) {
    super(props)
    this.canvasRef = React.createRef()
    this.animationFrameId = null
    this.particles = []
    this.mouse = { x: null, y: null, radius: 150 }
    this.isReducedMotion = false
  }

  componentDidMount() {
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!this.isReducedMotion) {
      this.initCanvas()
    }
  }

  componentWillUnmount() {
    this.cleanup()
  }

  initCanvas = () => {
    const canvas = this.canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    this.resizeCanvas()
    this.initParticles()
    this.animate()

    window.addEventListener('resize', this.resizeCanvas)
    canvas.addEventListener('mousemove', this.handleMouseMove)
    canvas.addEventListener('mouseleave', this.handleMouseLeave)
  }

  cleanup = () => {
    window.removeEventListener('resize', this.resizeCanvas)
    const canvas = this.canvasRef.current
    if (canvas) {
      canvas.removeEventListener('mousemove', this.handleMouseMove)
      canvas.removeEventListener('mouseleave', this.handleMouseLeave)
    }
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId)
    }
  }

  resizeCanvas = () => {
    const canvas = this.canvasRef.current
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
    this.initParticles()
  }

  initParticles = () => {
    const canvas = this.canvasRef.current
    if (!canvas) return
    this.particles = []
    const numberOfParticles = Math.min(Math.floor((canvas.width * canvas.height) / 12000), 200)
    
    for (let i = 0; i < numberOfParticles; i++) {
      const layer = Math.floor(Math.random() * 3)
      this.particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * (0.2 + layer * 0.15),
        vy: (Math.random() - 0.5) * (0.2 + layer * 0.15),
        radius: Math.random() * 2.5 + 0.5 + layer * 0.5,
        opacity: Math.random() * 0.4 + 0.1 + layer * 0.1,
        color: Math.random() > 0.5 ? 'oklch(0.51 0.211 263)' : 'oklch(0.77 0.153 226)',
        layer,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2
      })
    }
  }

  animate = () => {
    const canvas = this.canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const time = Date.now() * 0.001

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    
    // Draw layers from back to front
    for (let layer = 0; layer < 3; layer++) {
      const layerParticles = this.particles.filter(p => p.layer === layer)
      
      layerParticles.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1

        // Mouse interaction
        if (this.mouse.x !== null && this.mouse.y !== null) {
          const dx = this.mouse.x - particle.x
          const dy = this.mouse.y - particle.y
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < this.mouse.radius) {
            const force = (this.mouse.radius - distance) / this.mouse.radius
            particle.x -= dx * force * 0.015
            particle.y -= dy * force * 0.015
          }
        }

        // Pulse effect
        const pulse = Math.sin(time * particle.pulseSpeed + particle.pulsePhase) * 0.3 + 0.7
        const currentRadius = particle.radius * pulse
        const currentOpacity = particle.opacity * pulse

        // Draw particle
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, currentRadius, 0, Math.PI * 2)
        ctx.fillStyle = particle.color
        ctx.globalAlpha = currentOpacity
        ctx.fill()

        // Draw connections for foreground layer
        if (layer === 2) {
          layerParticles.slice(i + 1).forEach(otherParticle => {
            const dx = particle.x - otherParticle.x
            const dy = particle.y - otherParticle.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < 100) {
              ctx.beginPath()
              ctx.strokeStyle = particle.color
              ctx.globalAlpha = (1 - distance / 100) * 0.2 * pulse
              ctx.lineWidth = 0.3
              ctx.moveTo(particle.x, particle.y)
              ctx.lineTo(otherParticle.x, otherParticle.y)
              ctx.stroke()
            }
          })
        }
      })
    }

    this.animationFrameId = requestAnimationFrame(this.animate)
  }

  handleMouseMove = (e) => {
    const canvas = this.canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    this.mouse.x = e.clientX - rect.left
    this.mouse.y = e.clientY - rect.top
  }

  handleMouseLeave = () => {
    this.mouse.x = null
    this.mouse.y = null
  }

  render() {
    return (
      <canvas
        ref={this.canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ opacity: this.isReducedMotion ? 0.3 : 0.5 }}
      />
    )
  }
}

export function Hero() {
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const sx = useSpring(mx, { stiffness: 60, damping: 20 })
  const sy = useSpring(my, { stiffness: 60, damping: 20 })
  const rotateY = useTransform(sx, [-0.5, 0.5], [3, -3])
  const rotateX = useTransform(sy, [-0.5, 0.5], [-2, 2])

  const [isReducedMotion, setIsReducedMotion] = useState(false)

  useEffect(() => {
    setIsReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  return (
    <section
      id="home"
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        mx.set((e.clientX - r.left) / r.width - 0.5)
        my.set((e.clientY - r.top) / r.height - 0.5)
      }}
      className="relative isolate overflow-hidden bg-[oklch(0.19_0.045_263)] min-h-screen w-full"
    >
      {/* Multi-layer animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <MultiLayerBackground />
      </div>
      
      {/* Background Layer 1: Slow-moving gradients */}
      <motion.div
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0 opacity-20"
        style={{
          background: 'radial-gradient(ellipse at 30% 20%, oklch(0.51 0.211 263) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, oklch(0.77 0.153 226) 0%, transparent 50%)',
          backgroundSize: '200% 200%'
        }}
      />

      {/* Background Layer 2: Animated glow orbs */}
      <motion.div
        animate={{
          x: [0, 50, 0],
          y: [0, -30, 0],
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="absolute -left-32 top-20 size-[40rem] rounded-full bg-[oklch(0.51_0.211_263)]/30 blur-3xl"
      />
      
      <motion.div
        animate={{
          x: [0, -40, 0],
          y: [0, 40, 0],
          scale: [1, 1.15, 1],
          opacity: [0.2, 0.4, 0.2],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2
        }}
        className="absolute -right-24 bottom-20 size-[35rem] rounded-full bg-[oklch(0.77_0.153_226)]/25 blur-3xl"
      />

      {/* Background Layer 3: Grid lines */}
      <div aria-hidden className="absolute inset-0 grid-lines opacity-[0.05]" />
      
      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-[oklch(0.19_0.045_263)]/70 via-[oklch(0.19_0.045_263)]/50 to-[oklch(0.19_0.045_263)]/80" />

      {/* Main content container */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-20">
        
        {/* Continuous Cinematic Brand Group */}
        <motion.div
          animate={isReducedMotion ? {} : {
            scale: [0.01, 10, 0.01],
            y: [0, -30, 0],
            rotateX: [0, 5, 0],
            rotateY: [0, -5, 0],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: [0.25, 0.1, 0.25, 1], // Pyramid-style easing
            times: [0, 0.5, 1]
          }}
          style={{
            transformPerspective: 1000,
            rotateX: isReducedMotion ? 0 : rotateX,
            rotateY: isReducedMotion ? 0 : rotateY,
          }}
          className="relative mb-12 text-center"
        >
          {/* Animated glow behind brand */}
          <motion.div
            animate={isReducedMotion ? {} : {
              scale: [1, 2, 1],
              opacity: [0.3, 0.8, 0.3],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: [0.25, 0.1, 0.25, 1]
            }}
            className="absolute inset-0 -z-10 flex items-center justify-center"
          >
            <div className="w-[120%] h-[120%] rounded-full bg-gradient-to-r from-[oklch(0.51_0.211_263)]/40 via-[oklch(0.77_0.153_226)]/30 to-[oklch(0.51_0.211_263)]/40 blur-3xl" />
          </motion.div>

          {/* Company Logo */}
          <motion.div
            animate={isReducedMotion ? {} : {
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: [0.25, 0.1, 0.25, 1]
            }}
            className="mb-6 inline-flex items-center justify-center"
          >
            <motion.img
              src={logo}
              alt="Rama Software Logo"
              className="h-24 w-auto object-contain"
              animate={isReducedMotion ? {} : {
                filter: ["drop-shadow(0 0 10px oklch(0.77_0.153_226))", "drop-shadow(0 0 30px oklch(0.77_0.153_226))", "drop-shadow(0 0 10px oklch(0.77_0.153_226))"]
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: [0.25, 0.1, 0.25, 1]
              }}
            />
          </motion.div>

          {/* Company Name with continuous animation */}
          <motion.h1
            className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-bold leading-none tracking-tight"
          >
            <motion.span
              animate={isReducedMotion ? {} : {
                letterSpacing: ['0em', '0.05em', '0em'],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: [0.25, 0.1, 0.25, 1]
              }}
              className="block bg-gradient-to-r from-[oklch(0.51_0.211_263)] via-[oklch(0.77_0.153_226)] to-[oklch(0.51_0.211_263)] bg-clip-text text-transparent animate-shine drop-shadow-lg"
            >
              RAMA SOFTWARE
            </motion.span>
            <motion.span
              animate={isReducedMotion ? {} : {
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: [0.25, 0.1, 0.25, 1]
              }}
              className="block mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white/90 font-light tracking-wide"
            >
              AND IT SOLUTIONS
            </motion.span>
          </motion.h1>

          {/* Animated line divider */}
          <motion.div
            animate={isReducedMotion ? {} : {
              width: ['0%', '100%', '0%'],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: [0.25, 0.1, 0.25, 1]
            }}
            className="h-0.5 mx-auto mt-6 bg-gradient-to-r from-[oklch(0.51_0.211_263)] to-[oklch(0.77_0.153_226)] rounded-full"
          />
        </motion.div>

        {/* CTA Content with subtle animations */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl text-center"
        >
          <motion.div
            animate={isReducedMotion ? {} : {
              y: [0, -5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="mb-6 inline-flex items-center gap-2 rounded-full surface-glass-dark px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80"
          >
            <Sparkles className="size-3.5 text-accent" />
            Enterprise software · Networks · Security
          </motion.div>

          <motion.p
            animate={isReducedMotion ? {} : {
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: [0.25, 0.1, 0.25, 1]
            }}
            className="mb-8 text-lg leading-relaxed text-white/80 sm:text-xl font-light"
          >
            <span className="text-[oklch(0.77_0.153_226)] font-semibold">Innovative Digital Solutions</span> for a Smarter Future
          </motion.p>

          <motion.div
            animate={isReducedMotion ? {} : {
              y: [0, -3, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1
            }}
            className="flex flex-wrap items-center justify-center gap-4"
          >
            <motion.a
              href="#services"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[oklch(0.51_0.211_263)] to-[oklch(0.77_0.153_226)] px-8 py-4 text-sm font-semibold text-white shadow-glow overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[oklch(0.77_0.153_226)] to-[oklch(0.51_0.211_263)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative flex items-center gap-2">
                Explore Our Solutions
                <ChevronRight className="size-4 transition-transform group-hover:translate-x-1" />
              </span>
            </motion.a>
            
            <motion.a
              href="#contact"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="group relative inline-flex items-center gap-2 rounded-full surface-glass-dark px-8 py-4 text-sm font-semibold text-white border border-[oklch(0.77_0.153_226)]/30 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-[oklch(0.51_0.211_263)]/20 to-[oklch(0.77_0.153_226)]/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <span className="relative">Get Started</span>
            </motion.a>
          </motion.div>

          {/* Stats with subtle animation */}
          <motion.dl
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-3xl surface-glass-dark sm:grid-cols-4"
          >
            {STATS.map((s, index) => (
              <motion.div
                key={s.label}
                animate={isReducedMotion ? {} : {
                  y: [0, -2, 0],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: index * 0.2
                }}
                className="px-5 py-6"
              >
                <dt className="font-display text-2xl font-bold text-white sm:text-3xl">
                  <Counter value={s.value} suffix={s.suffix} />
                </dt>
                <dd className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">{s.label}</dd>
              </motion.div>
            ))}
          </motion.dl>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={isReducedMotion ? {} : {
            y: [0, 10, 0],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="flex flex-col items-center gap-2 text-white/60"
        >
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronRight className="size-4 rotate-90" />
        </motion.div>
      </motion.div>
    </section>
  )
}
