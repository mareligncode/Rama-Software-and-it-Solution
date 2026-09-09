import { useEffect, useState } from "react"
import { motion, AnimatePresence, useScroll, useSpring } from "framer-motion"
import { Menu, X, Moon, Sun, ArrowUpRight } from "lucide-react"
import logo from "@/assets/logo.png"
import { cn } from "@/lib/utils"

export const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Why Rama", href: "#why" },
  { label: "Services", href: "#services" },
  { label: "Solutions", href: "#erp" },
  { label: "Security", href: "#security" },
  { label: "Industries", href: "#industries" },
  { label: "Process", href: "#process" },
  { label: "Portfolio", href: "#portfolio" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Team", href: "#team" },
  { label: "Insights", href: "#insights" },
  { label: "Contact", href: "#contact" },
]

export const PAGE_LINKS = [
  { label: "Careers", to: "/#/careers" },
  { label: "Internships", to: "/#/internships" },
  { label: "News", to: "/#/news" },
  { label: "Events", to: "/#/events" },
  { label: "Privacy Policy", to: "/#/privacy-policy" },
  { label: "Terms of Service", to: "/#/terms-of-service" },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark'
    }
    return false
  })
  const [active, setActive] = useState("#home")
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.4 })
  const overlay = !scrolled

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1))
    const els = ids
      .map((id) => document.getElementById(id))
      .filter((el) => Boolean(el))
    if (!els.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(`#${visible.target.id}`)
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: [0, 0.25, 0.5, 1] },
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem('theme', 'light')
    }
  }, [dark])

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={cn(
          "transition-all duration-500",
          scrolled
            ? "border-b border-border/70 bg-background/85 backdrop-blur-xl shadow-soft"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <nav className="container-x flex h-20 items-center justify-between gap-4">
          <a href="#home" className="flex items-center gap-3">
            <img src={logo} alt="Rama Software & IT Solutions logo" className="h-11 w-auto" width={140} height={72} />
            <span className="hidden leading-tight sm:block 2xl:hidden">
              <span
                className={cn(
                  "block font-display text-sm font-bold tracking-tight transition-colors",
                  overlay ? "text-white" : "text-foreground",
                )}
              >
                RAMA SOFTWARE
              </span>
              <span
                className={cn(
                  "block text-[10px] font-semibold uppercase tracking-[0.28em] transition-colors",
                  overlay ? "text-white/70" : "text-muted-foreground",
                )}
              >
                &amp; IT Solutions
              </span>
            </span>
          </a>

          <ul
            className={cn(
              "hidden items-center gap-1 rounded-full px-2 py-1.5 transition-colors 2xl:flex",
              overlay ? "border border-white/15 bg-white/5 backdrop-blur-md" : "border border-border/70 bg-muted/50",
            )}
          >
            {NAV_LINKS.map((l) => (
              <li key={l.label} className="relative">
                <a
                  href={l.href}
                  className={cn(
                    "relative z-10 block whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                    overlay
                      ? active === l.href
                        ? "text-white"
                        : "text-white/65 hover:text-white"
                      : active === l.href
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                </a>
                {active === l.href ? (
                  <motion.span
                    layoutId="nav-pill"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    className={cn(
                      "absolute inset-0 rounded-full",
                      overlay ? "bg-white/15" : "bg-card shadow-soft",
                    )}
                  />
                ) : null}
              </li>
            ))}
            {PAGE_LINKS.map((l) => (
              <li key={l.label}>
                <a
                  href={l.to}
                  className={cn(
                    "block whitespace-nowrap rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors",
                    overlay ? "text-white/65 hover:text-white" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Toggle color theme"
              onClick={() => setDark((d) => !d)}
              className={cn(
                "grid size-10 place-items-center rounded-full border transition-colors",
                overlay
                  ? "border-white/20 text-white/80 hover:text-white"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
              style={{ width: "40px", height: "40px" }}
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <a
              href="#contact"
              className={cn(
                "group hidden items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold shadow-soft transition-all hover:-translate-y-0.5 sm:inline-flex",
                overlay ? "bg-white text-[oklch(0.24_0.07_263)] hover:shadow-glow" : "brand-gradient text-white hover:shadow-glow",
              )}
            >
              Book Consultation
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setOpen((o) => !o)}
              className={cn(
                "grid size-10 place-items-center rounded-full border 2xl:hidden",
                overlay ? "border-white/20 text-white" : "border-border text-foreground",
              )}
            >
              {open ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </nav>
        <motion.div
          style={{ scaleX: progress }}
          className="h-[2px] w-full origin-left brand-gradient opacity-90"
        />
      </div>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="container-x 2xl:hidden"
          >
            <ul className="mt-3 grid grid-cols-2 gap-1 rounded-3xl border border-border bg-background/95 p-4 shadow-float backdrop-blur-xl sm:grid-cols-3">
              {NAV_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
              {PAGE_LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.to}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-muted"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  )
}
