import { motion } from "framer-motion"
import {
  Banknote, Users2, Wallet, Boxes, Warehouse, ShoppingCart, Contact2, TrendingUp, Store, FolderKanban,
  Truck, Fingerprint, FileBarChart, BarChart3, ArrowUpRight, Check, Quote,
  Cable, Wifi, Server, ShieldCheck, Flame, KeyRound, Radio, Split, Route, Globe2,
  Lock, Eye, HardDriveDownload, Activity, Radar, ScanFace,
} from "lucide-react"
import networkImg from "@/assets/network-infra.jpg"
import securityImg from "@/assets/security-shield.jpg"
import { Reveal, SectionHeading, Counter, GlowOrb, Eyebrow } from "./primitives"

const MODULES = [
  { icon: Banknote, label: "Finance" }, { icon: Users2, label: "HR" }, { icon: Wallet, label: "Payroll" },
  { icon: Boxes, label: "Inventory" }, { icon: Warehouse, label: "Store" }, { icon: ShoppingCart, label: "Procurement" },
  { icon: Contact2, label: "CRM" }, { icon: TrendingUp, label: "Sales" }, { icon: Store, label: "POS" },
  { icon: FolderKanban, label: "Projects" }, { icon: Truck, label: "Fleet" }, { icon: Fingerprint, label: "Attendance" },
  { icon: FileBarChart, label: "Reports" }, { icon: BarChart3, label: "Analytics" },
]

export function Erp() {
  return (
    <section id="erp" className="relative overflow-hidden section-pad">
      <GlowOrb className="-right-40 top-24 size-[30rem] bg-secondary/10" />
      <div className="container-x relative grid gap-16 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div>
          <SectionHeading
            align="left"
            eyebrow="ERP Solutions"
            title={<>One platform for <span className="gradient-text">every business function</span></>}
            description="A modular ERP suite that unifies finance, people, supply chain and customers under a single source of truth, deployed on your cloud or ours."
          />
          <ul className="mt-8 space-y-3">
            {["Role-based access with full audit trails", "Real-time consolidated reporting", "Multi-branch, multi-currency ready", "Open APIs for seamless integration"].map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm font-medium text-muted-foreground">
                <span className="grid size-5 place-items-center rounded-full bg-success/15 text-success">
                  <Check className="size-3" />
                </span>
                {f}
              </li>
            ))}
          </ul>
          <a href="#contact" className="mt-9 inline-flex items-center gap-2 rounded-full brand-gradient px-6 py-3.5 text-sm font-semibold text-white shadow-soft transition-transform hover:-translate-y-0.5">
            Request an ERP demo <ArrowUpRight className="size-4" />
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MODULES.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 6) * 0.05, duration: 0.5 }}
              className="card-lux group flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4 transition-all hover:-translate-y-1 hover:border-secondary/30 hover:shadow-soft"
            >
              <m.icon className="size-4.5 text-secondary" />
              <span className="text-sm font-semibold">{m.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const NETWORK_ITEMS = [
  { icon: Cable, label: "Structured Cabling" }, { icon: Split, label: "LAN Design" }, { icon: Globe2, label: "WAN & SD-WAN" },
  { icon: Route, label: "Fiber Backbone" }, { icon: Server, label: "Server Rooms" }, { icon: Flame, label: "Firewalls" },
  { icon: KeyRound, label: "VPN Tunnels" }, { icon: Radio, label: "Cisco Stacks" }, { icon: ShieldCheck, label: "Fortinet" },
  { icon: Wifi, label: "Enterprise Wireless" },
]

export function NetworkSection() {
  return (
    <section className="section-pad bg-card">
      <div className="container-x grid gap-16 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <div className="overflow-hidden rounded-[2rem] border border-border shadow-float">
            <img src={networkImg} alt="Isometric illustration of enterprise server and network infrastructure" loading="lazy" width={1200} height={900} className="w-full object-cover" />
          </div>
        </Reveal>
        <div>
          <SectionHeading
            align="left"
            eyebrow="Network & Infrastructure"
            title={<>Infrastructure engineered for <span className="gradient-text">uninterrupted operations</span></>}
            description="From structured cabling to redundant core switching and secure remote access, we design networks that stay up under real enterprise load."
          />
          <div className="mt-10 grid grid-cols-2 gap-3">
            {NETWORK_ITEMS.map((n, i) => (
              <Reveal key={n.label} delay={(i % 4) * 0.05}>
                <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3.5 transition-colors hover:border-secondary/30">
                  <n.icon className="size-4 text-secondary" />
                  <span className="text-sm font-semibold">{n.label}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const SECURITY = [
  { icon: Flame, title: "Next-Gen Firewall", body: "Segmented perimeters with deep packet inspection." },
  { icon: KeyRound, title: "VPN & Remote Access", body: "Encrypted tunnels with MFA for every session." },
  { icon: ScanFace, title: "Access Control", body: "Identity-first policies and least-privilege roles." },
  { icon: Lock, title: "Encryption", body: "Data protected at rest, in transit and in backups." },
  { icon: HardDriveDownload, title: "Backup & Recovery", body: "Tested restore paths with defined RPO and RTO." },
  { icon: Eye, title: "24/7 Monitoring", body: "Continuous log correlation and alerting." },
  { icon: Radar, title: "Threat Detection", body: "Behavioural analytics and rapid containment." },
  { icon: Activity, title: "Compliance Reporting", body: "Audit-ready evidence for regulators and boards." },
]

export function Security() {
  return (
    <section id="security" className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Cyber Security"
          title={<>Defence engineered into <span className="gradient-text">every layer</span></>}
          description="A managed security practice covering prevention, detection and response, so your board, regulators and customers stay confident."
        />
        <div className="mt-16 grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <Reveal className="relative mx-auto max-w-sm">
            <div className="relative overflow-hidden rounded-[2rem] shadow-float">
              <img src={securityImg} alt="Digital security shield protecting enterprise data" loading="lazy" width={1000} height={1000} className="w-full object-cover" />
            </div>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {SECURITY.map((s, i) => (
              <Reveal key={s.title} delay={(i % 4) * 0.07}>
                <div className="card-lux group relative h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1.5 hover:shadow-float">
                  <s.icon className="size-5 text-secondary/15 transition-colors group-hover:text-secondary/35" />
                  <h3 className="mt-4 font-display text-sm font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

const PROCESS = [
  { step: "01", title: "Discover", body: "Stakeholder workshops and operational audit." },
  { step: "02", title: "Planning", body: "Scope, architecture and delivery roadmap." },
  { step: "03", title: "Design", body: "UX, data models and system blueprints." },
  { step: "04", title: "Development", body: "Iterative builds with weekly demos." },
  { step: "05", title: "Testing", body: "Functional, load and penetration testing." },
  { step: "06", title: "Deployment", body: "Controlled cutover with rollback plans." },
  { step: "07", title: "Training", body: "Role-based enablement and documentation." },
  { step: "08", title: "Support", body: "SLA-backed operations and continuous improvement." },
]

export function Process() {
  return (
    <section id="process" className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Our Process"
          title={<>A delivery method that removes <span className="gradient-text">surprises</span></>}
          description="Eight disciplined stages, transparent governance and a fixed point of accountability from first workshop to long-term support."
        />
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROCESS.map((p, i) => (
            <Reveal key={p.step} delay={(i % 4) * 0.08}>
              <div className="card-lux group relative h-full rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1.5 hover:shadow-float">
                <span className="font-display text-4xl font-bold text-secondary/15 transition-colors group-hover:text-secondary/35">{p.step}</span>
                <h3 className="mt-3 font-display text-base font-bold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const PROJECTS = [
  { tag: "ERP", title: "Group-wide ERP consolidation", body: "Unified finance, procurement and inventory across 14 branches.", metric: "-38% closing time" },
  { tag: "Healthcare", title: "Hospital information system", body: "Patient records, pharmacy and billing on a single secure platform.", metric: "120k patients" },
  { tag: "Education", title: "University management suite", body: "Admissions, academics and finance for a multi-campus institution.", metric: "22k students" },
  { tag: "Banking", title: "Core banking integration", body: "Secure middleware connecting legacy core to digital channels.", metric: "99.99% uptime" },
  { tag: "Manufacturing", title: "Production & MRP control", body: "Shop-floor tracking with live yield and wastage analytics.", metric: "+21% throughput" },
  { tag: "Retail", title: "Inventory & POS network", body: "Real-time stock visibility across warehouses and outlets.", metric: "60 outlets" },
  { tag: "HR", title: "Payroll & attendance platform", body: "Biometric attendance with automated statutory payroll.", metric: "8k employees" },
  { tag: "Infrastructure", title: "Campus network build", body: "Fibre backbone, core switching and enterprise wireless.", metric: "1,400 nodes" },
  { tag: "ERP", title: "Vector Advert & Manufacturing ERP", body: "Complete ERP system with HR, Store, Purchase, Frontdesk, Creative Product, Machine Operator, Marketing, Finishing, Finance, and Design modules.", metric: "Full ERP Suite", link: "https://vectoradvert.com/erp/" },
]

export function Projects() {
  return (
    <section id="portfolio" className="section-pad bg-card">
      <div className="container-x">
        <SectionHeading
          eyebrow="Featured Projects"
          title={<>Systems in production, <span className="gradient-text">outcomes on record</span></>}
          description="A selection of enterprise engagements across software, data and infrastructure."
        />
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PROJECTS.map((p, i) => (
            <Reveal key={p.title} delay={(i % 4) * 0.07}>
              <article className="card-lux group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-background transition-all duration-500 hover:-translate-y-2 hover:shadow-float">
                {p.link ? (
                  <a href={p.link} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10">
                    <span className="sr-only">View {p.title}</span>
                  </a>
                ) : null}
                <div className="relative h-32 overflow-hidden brand-gradient">
                  <div aria-hidden className="absolute inset-0 grid-lines opacity-15" />
                  <div className="absolute inset-x-5 bottom-4 space-y-1.5">
                    <div className="h-1.5 w-2/3 rounded-full bg-white/70" />
                    <div className="h-1.5 w-1/2 rounded-full bg-white/40" />
                    <div className="h-1.5 w-3/4 rounded-full bg-white/25" />
                  </div>
                  <span className="absolute left-5 top-4 rounded-full bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur">
                    {p.tag}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-[15px] font-bold leading-snug">{p.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                  <p className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-secondary">
                    {p.metric} <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const COUNTERS = [
  { value: 150, suffix: "+", label: "Projects Delivered" },
  { value: 80, suffix: "+", label: "Enterprise Clients" },
  { value: 6, suffix: "", label: "Countries Served" },
  { value: 120, suffix: "k+", label: "Support Hours" },
  { value: 40, suffix: "+", label: "Team Members" },
  { value: 98, suffix: "%", label: "Success Rate" },
]

export function Stats() {
  return (
    <section className="relative isolate overflow-hidden brand-gradient py-20">
      <div aria-hidden className="absolute inset-0 grid-lines opacity-[0.08]" />
      <div className="container-x relative grid grid-cols-2 gap-10 md:grid-cols-6">
        {COUNTERS.map((c, i) => (
          <Reveal key={c.label} delay={i * 0.06} className="text-center">
            <p className="font-display text-3xl font-bold text-white sm:text-4xl">
              <Counter value={c.value} suffix={c.suffix} />
            </p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">{c.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

const TESTIMONIALS = [
  { quote: "Rama replaced five disconnected systems with one ERP. Month-end close went from three weeks to nine days.", name: "A. Mehari", role: "Group CFO, Regional Bank" },
  { quote: "Their security team found and closed gaps two audits had missed. We now sleep at night.", name: "S. Bekele", role: "CIO, National Health Network" },
  { quote: "The campus network they engineered has run without a single unplanned outage since handover.", name: "D. Alemu", role: "Director of IT, University" },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Testimonials"
          title={<>What executive teams <span className="gradient-text">tell us</span></>}
        />
        <div className="mt-16 grid gap-5 lg:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.name} delay={i * 0.1}>
              <figure className="card-lux h-full rounded-3xl border border-border bg-card p-8 transition-all hover:-translate-y-1.5 hover:shadow-float">
                <Quote className="size-7 text-secondary/30" />
                <blockquote className="mt-5 text-pretty text-[15px] leading-relaxed text-foreground">"{t.quote}"</blockquote>
                <figcaption className="mt-7 flex items-center gap-3 border-t border-border pt-5">
                  <span className="grid size-10 place-items-center rounded-full brand-gradient font-display text-sm font-bold text-white">
                    {t.name.slice(0, 1)}
                  </span>
                  <span>
                    <span className="block text-sm font-bold">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">{t.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const TECH = ["React", "Next.js", "Go", "Node.js", "TypeScript", "PostgreSQL", "Docker", "Kubernetes", "AWS", "Azure", "Supabase", "Electron", "Flutter", "Cisco", "Fortinet", "Linux"]

export function TechStack() {
  return (
    <section className="section-pad bg-card">
      <div className="container-x">
        <SectionHeading
          eyebrow="Technology Stack"
          title={<>Proven tools, <span className="gradient-text">deliberately chosen</span></>}
          description="We standardise on technologies with long-term support, strong security posture and deep talent pools."
        />
        <div className="mt-14 flex flex-wrap justify-center gap-3">
          {TECH.map((t, i) => (
            <Reveal key={t} delay={(i % 8) * 0.04}>
              <span className="card-lux inline-flex items-center rounded-full border border-border bg-background px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-all hover:-translate-y-1 hover:border-secondary/40 hover:text-foreground hover:shadow-soft">
                {t}
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

export { Eyebrow }
