import { motion } from "framer-motion"
import {
  Landmark, Building2, Factory, HeartPulse, GraduationCap, HandHeart, Truck, ShoppingBag, Hotel, HardHat,
  Target, Eye, Gem, ShieldCheck, Headphones, Lock, Lightbulb, Layers, Wallet, Users, Handshake,
  Boxes, Code2, Globe, MonitorSmartphone, Smartphone, Network, Cloud, Router, KeyRound, Database,
  Workflow, Compass, Puzzle, LifeBuoy, BookOpen,
} from "lucide-react"
import aboutTeam from "@/assets/about-team.jpg"
import { Reveal, SectionHeading, Counter } from "./primitives"

const TRUSTED = [
  { icon: Landmark, label: "Banking Group" },
  { icon: Building2, label: "Federal Agency" },
  { icon: Factory, label: "Industrial Works" },
  { icon: HeartPulse, label: "Medical Network" },
  { icon: GraduationCap, label: "University" },
  { icon: HandHeart, label: "Global NGO" },
  { icon: Truck, label: "Logistics Co." },
]

export function TrustedBy() {
  const items = [...TRUSTED, ...TRUSTED]
  return (
    <section className="border-y border-border bg-card py-12">
      <div className="container-x">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          Trusted across regulated and mission-critical sectors
        </p>
      </div>
      <div className="mt-8 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_12%,black_88%,transparent)]">
        <div className="flex w-max animate-marquee items-center gap-14 pr-14">
          {items.map((item, i) => (
            <div key={i} className="flex shrink-0 items-center gap-3 opacity-60 transition-opacity hover:opacity-100">
              <item.icon className="size-6 text-secondary" />
              <span className="font-display text-base font-bold tracking-tight text-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const PILLARS = [
  { icon: Target, title: "Mission", body: "Deliver dependable enterprise software and infrastructure that make organisations faster, safer and measurably more efficient." },
  { icon: Eye, title: "Vision", body: "To be the reference technology partner for institutions that cannot afford to fail, regionally recognised, globally benchmarked." },
  { icon: Gem, title: "Values", body: "Engineering integrity, absolute confidentiality, transparent delivery and partnerships measured in decades, not projects." },
]

const TIMELINE = [
  { year: "2015", title: "Foundation", body: "Established as a specialist software and networking practice." },
  { year: "2018", title: "ERP Platform", body: "Launched our modular enterprise resource planning suite." },
  { year: "2021", title: "Security Division", body: "Added managed cybersecurity, SOC monitoring and compliance." },
  { year: "2024", title: "Cloud & AI", body: "Cloud-native modernisation and intelligent automation services." },
  { year: "2026", title: "Global Standard", body: "Serving enterprise clients across finance, health and government." },
]

export function About() {
  return (
    <section id="about" className="section-pad">
      <div className="container-x grid items-center gap-16 lg:grid-cols-2">
        <Reveal className="relative">
          <div className="overflow-hidden rounded-[2rem] shadow-float">
            <img src={aboutTeam} alt="Rama consultants reviewing an enterprise delivery plan" loading="lazy" width={1200} height={900} className="w-full object-cover" />
          </div>
          <div className="absolute -bottom-8 -right-4 hidden w-64 rounded-3xl surface-glass p-6 md:block">
            <p className="font-display text-4xl font-bold text-secondary">
              <Counter value={40} suffix="+" />
            </p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">Engineers, architects and security specialists</p>
          </div>
        </Reveal>

        <div>
          <SectionHeading
            align="left"
            eyebrow="About Rama"
            title={<>A technology partner built for <span className="gradient-text">institutional trust</span></>}
            description="Rama Software & IT Solutions designs, deploys and operates the systems that keep enterprises running, from ERP platforms and custom applications to structured networks, data centres and continuous security."
          />
          <div className="mt-10 grid gap-4">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <div className="card-lux group flex gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-soft">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl brand-gradient text-white">
                    <p.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold">{p.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      <div className="container-x mt-24">
        <Reveal>
          <ol className="relative grid gap-10 md:grid-cols-5">
            <div aria-hidden className="absolute left-0 right-0 top-[14px] hidden h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent md:block" />
            {TIMELINE.map((t, i) => (
              <motion.li
                key={t.year}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className="relative"
              >
                <span className="relative grid size-7 place-items-center rounded-full border border-secondary/30 bg-background">
                  <span className="size-2.5 rounded-full bg-secondary" />
                  <span className="absolute inset-0 rounded-full bg-secondary/30 animate-pulse-ring" />
                </span>
                <p className="mt-5 font-display text-xl font-bold text-secondary">{t.year}</p>
                <p className="mt-1 font-semibold">{t.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.body}</p>
              </motion.li>
            ))}
          </ol>
        </Reveal>
      </div>
    </section>
  )
}

const WHY = [
  { icon: ShieldCheck, title: "Enterprise Quality", body: "Documented architecture, code review and QA gates on every release." },
  { icon: Headphones, title: "Reliable Support", body: "Named engineers, defined SLAs and 24/7 escalation paths." },
  { icon: Lock, title: "Secure Systems", body: "Security designed in from day one, not bolted on afterwards." },
  { icon: Lightbulb, title: "Innovation", body: "Modern stacks, automation and AI applied where they create value." },
  { icon: Layers, title: "Scalable Architecture", body: "Systems that grow from one branch to a national network." },
  { icon: Wallet, title: "Affordable Excellence", body: "Enterprise capability delivered with disciplined commercial sense." },
  { icon: Users, title: "Professional Team", body: "Certified developers, network and security engineers in one house." },
  { icon: Handshake, title: "Long-term Partnership", body: "Roadmaps, training and evolution long after go-live." },
]

export function WhyRama() {
  return (
    <section id="why" className="section-pad bg-card">
      <div className="container-x">
        <SectionHeading
          eyebrow="Why Rama"
          title={<>Chosen where reliability is <span className="gradient-text">non-negotiable</span></>}
          description="Eight commitments that define how we engineer, deliver and support every engagement."
        />
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w, i) => (
            <Reveal key={w.title} delay={(i % 4) * 0.07}>
              <div className="card-lux group relative h-full overflow-hidden rounded-2xl border border-border bg-background p-6 transition-all duration-500 hover:-translate-y-1.5 hover:border-secondary/30 hover:shadow-float">
                <div aria-hidden className="absolute inset-x-0 -top-24 h-24 brand-gradient opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40" />
                <w.icon className="size-6 text-secondary" />
                <h3 className="mt-5 font-display text-base font-bold">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{w.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const SERVICES = [
  { icon: Boxes, title: "Enterprise ERP Development", body: "Modular ERP tailored to your operating model." },
  { icon: Code2, title: "Custom Software Development", body: "Bespoke platforms engineered around real workflows." },
  { icon: Globe, title: "Web Applications", body: "Secure, high-performance portals and dashboards." },
  { icon: MonitorSmartphone, title: "Desktop Applications", body: "Native and cross-platform business tools." },
  { icon: Smartphone, title: "Mobile Apps", body: "iOS and Android apps for field and customer teams." },
  { icon: Network, title: "Network Infrastructure", body: "LAN, WAN, fibre and data-centre build-outs." },
  { icon: ShieldCheck, title: "Cyber Security", body: "Assessment, hardening, monitoring and response." },
  { icon: Cloud, title: "Cloud Solutions", body: "Migration, cloud-native design and cost control." },
  { icon: Router, title: "Office Networking", body: "Wired and wireless networks that simply work." },
  { icon: KeyRound, title: "VPN Solutions", body: "Encrypted site-to-site and remote access." },
  { icon: Database, title: "Database Design", body: "Modelling, tuning, replication and recovery." },
  { icon: Workflow, title: "Business Automation", body: "Workflow digitisation that removes manual effort." },
  { icon: Compass, title: "IT Consulting", body: "Strategy, audits and technology roadmaps." },
  { icon: Puzzle, title: "System Integration", body: "Connecting legacy and modern systems cleanly." },
  { icon: LifeBuoy, title: "Maintenance & SLA", body: "Proactive maintenance with guaranteed response." },
  { icon: BookOpen, title: "Training", body: "Structured enablement for teams and administrators." },
]

export function Services() {
  return (
    <section id="services" className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Our Services"
          title={<>One partner across the <span className="gradient-text">entire technology stack</span></>}
          description="Software, infrastructure and security capabilities delivered by a single accountable team."
        />
        <div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 8) * 0.04, duration: 0.5 }}
              className="group relative bg-card p-7 transition-colors duration-500 hover:bg-background"
            >
              <div className="grid size-12 place-items-center rounded-2xl bg-secondary/8 text-secondary transition-all duration-500 group-hover:brand-gradient group-hover:text-white">
                <s.icon className="size-5" />
              </div>
              <h3 className="mt-6 font-display text-[15px] font-bold leading-snug">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 brand-gradient transition-transform duration-500 group-hover:scale-x-100" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

const INDUSTRIES = [
  { icon: Landmark, label: "Banking & Finance" },
  { icon: Building2, label: "Government" },
  { icon: HeartPulse, label: "Healthcare" },
  { icon: GraduationCap, label: "Education" },
  { icon: Factory, label: "Manufacturing" },
  { icon: HardHat, label: "Construction" },
  { icon: Truck, label: "Logistics" },
  { icon: HandHeart, label: "NGOs" },
  { icon: ShoppingBag, label: "Retail" },
  { icon: Hotel, label: "Hospitality" },
]

export function Industries() {
  return (
    <section id="industries" className="section-pad bg-card">
      <div className="container-x">
        <SectionHeading
          eyebrow="Industries"
          title={<>Domain depth across <span className="gradient-text">ten regulated sectors</span></>}
          description="We speak the operational language of each industry we serve, and build to its compliance requirements."
        />
        <div className="mt-16 grid grid-cols-2 gap-4 md:grid-cols-5">
          {INDUSTRIES.map((ind, i) => (
            <Reveal key={ind.label} delay={(i % 5) * 0.06}>
              <div className="card-lux group relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border border-border bg-background px-4 py-9 text-center transition-all duration-500 hover:-translate-y-1.5 hover:shadow-float">
                <div aria-hidden className="absolute inset-0 brand-gradient opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <ind.icon className="relative size-7 text-secondary transition-colors duration-500 group-hover:text-white" />
                <span className="relative text-sm font-semibold transition-colors duration-500 group-hover:text-white">{ind.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
