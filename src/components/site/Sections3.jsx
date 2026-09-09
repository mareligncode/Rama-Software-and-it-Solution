import { ArrowUpRight, Mail, MapPin, Phone, Globe, Linkedin, Twitter, Facebook, Youtube } from "lucide-react"
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion"
import logo from "@/assets/logo.png"
import { Reveal, SectionHeading, GlowOrb } from "./primitives"
import { ContactForm } from "./ContactForm"
import { Link } from "react-router-dom"

const TEAM = [
  { name: "Chief Executive Officer", role: "Strategy & Client Partnership", initials: "CE" },
  { name: "Head of Engineering", role: "Software & ERP Delivery", initials: "HE" },
  { name: "Network Architect", role: "Infrastructure & Data Centres", initials: "NA" },
  { name: "Security Lead", role: "Cyber Defence & Compliance", initials: "SL" },
  { name: "Design Director", role: "UI/UX & Product Experience", initials: "DD" },
]

export function Team() {
  return (
    <section id="team" className="section-pad">
      <div className="container-x">
        <SectionHeading
          eyebrow="Our People"
          title={<>Senior specialists, <span className="gradient-text">one accountable team</span></>}
          description="Architects, engineers and designers who have delivered mission-critical systems in demanding environments. We are always hiring exceptional talent."
        />
        <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 0.07}>
              <div className="card-lux group h-full overflow-hidden rounded-3xl border border-border bg-card text-center transition-all hover:-translate-y-2 hover:shadow-float">
                <div className="relative grid h-36 place-items-center brand-gradient">
                  <div aria-hidden className="absolute inset-0 grid-lines opacity-15" />
                  <span className="relative grid size-16 place-items-center rounded-full bg-white/15 font-display text-lg font-bold text-white backdrop-blur">
                    {m.initials}
                  </span>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-sm font-bold">{m.name}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{m.role}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const POSTS = [
  { tag: "Cybersecurity", title: "Zero-trust is an operating model, not a product", read: "6 min read" },
  { tag: "ERP", title: "Why ERP programmes fail, and how to de-risk yours", read: "8 min read" },
  { tag: "Cloud", title: "A pragmatic path from data centre to hybrid cloud", read: "5 min read" },
  { tag: "AI", title: "Where automation actually pays back in the enterprise", read: "7 min read" },
  { tag: "Networking", title: "Designing campus networks for the next decade", read: "6 min read" },
  { tag: "Governance", title: "Building an IT roadmap your board will approve", read: "4 min read" },
]

export function Insights() {
  return (
    <section id="insights" className="section-pad bg-card">
      <div className="container-x">
        <SectionHeading
          eyebrow="Insights"
          title={<>Perspectives from our <span className="gradient-text">practice leads</span></>}
        />
        <div className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {POSTS.map((p, i) => (
            <Reveal key={p.title} delay={(i % 3) * 0.08}>
              <article className="card-lux group flex h-full flex-col rounded-3xl border border-border bg-background p-7 transition-all hover:-translate-y-1.5 hover:border-secondary/30 hover:shadow-float">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">{p.tag}</span>
                <h3 className="mt-4 flex-1 font-display text-lg font-bold leading-snug">{p.title}</h3>
                <div className="mt-6 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  {p.read}
                  <ArrowUpRight className="size-4 text-secondary transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const FAQS = [
  { q: "How do you price enterprise engagements?", a: "We scope in phases. Discovery is fixed-price, delivery is milestone-based, and support runs on an annual SLA, so budgets stay predictable." },
  { q: "Can your ERP integrate with our existing systems?", a: "Yes. Every module exposes documented APIs, and our integration team routinely connects legacy core systems, banking rails and third-party platforms." },
  { q: "Do you provide on-site support?", a: "We offer on-site, remote and hybrid support models with defined response times, named engineers and 24/7 escalation." },
  { q: "How do you handle data security and confidentiality?", a: "Signed NDAs, least-privilege access, encrypted environments, audited change control and independent penetration testing before every go-live." },
  { q: "Do you train our internal teams?", a: "Role-based training, administrator certification and full documentation are included in every delivery, with refresher sessions available annually." },
  { q: "What happens after deployment?", a: "You move into a managed lifecycle: monitoring, patching, quarterly reviews and a shared roadmap for future enhancements." },
]

export function Faq() {
  return (
    <section className="section-pad">
      <div className="container-x grid gap-14 lg:grid-cols-[0.85fr_1.15fr]">
        <SectionHeading
          align="left"
          eyebrow="FAQ"
          title={<>Answers before you <span className="gradient-text">ask</span></>}
          description="The questions procurement, IT and finance teams raise most often."
        />
        <Reveal>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f) => (
              <AccordionItem key={f.q} value={f.q} className="border-border">
                <AccordionTrigger className="text-left font-display text-base font-bold hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  )
}

export function CallToAction() {
  return (
    <section id="contact" className="section-pad">
      <div className="container-x">
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-[2.5rem] brand-gradient px-8 py-20 text-center sm:px-16">
            <div aria-hidden className="absolute inset-0 grid-lines opacity-[0.08] pointer-events-none" />
            <GlowOrb className="-left-20 -top-20 size-96 bg-[oklch(0.77_0.153_226)]/25" />
            <div className="relative">
              <h2 className="mx-auto max-w-3xl text-balance text-3xl font-bold leading-tight text-white sm:text-5xl">
                Ready to Transform Your Business?
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-white/70">
                Speak with our solution architects about your ERP, infrastructure or security roadmap. No obligation, just a clear, expert assessment.
              </p>
              <ContactForm />
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

const FOOTER_COLS = [
  { title: "Company", links: ["About", "Why Rama", "Our Process", "Careers", "Insights"], routes: [null, null, null, "/careers", null] },
  { title: "Services", links: ["ERP Development", "Custom Software", "Cyber Security", "Cloud Solutions", "IT Consulting"], routes: [null, null, null, null, null] },
  { title: "Solutions", links: ["Finance Suite", "HR & Payroll", "Inventory & POS", "CRM & Sales", "Analytics"], routes: [null, null, null, null, null] },
  { title: "Industries", links: ["Banking", "Government", "Healthcare", "Education", "Manufacturing"], routes: [null, null, null, null, null] },
  { title: "Resources", links: ["Case Studies", "Documentation", "Support Portal", "Privacy Policy", "Terms of Service"], routes: [null, null, null, "/privacy-policy", "/terms-of-service"] },
]

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden bg-[oklch(0.19_0.045_263)] pt-20 pb-10 text-white/70">
      <div aria-hidden className="absolute inset-0 grid-lines opacity-[0.05]" />
      <div className="container-x relative">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_2.7fr]">
          <div>
            <div className="flex items-center gap-3">
              <img src={logo} alt="Rama Software & IT Solutions logo" loading="lazy" width={140} height={72} className="h-11 w-auto" />
              <span className="leading-tight">
                <span className="block font-display text-sm font-bold text-white">RAMA SOFTWARE</span>
                <span className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-white/50">&amp; IT Solutions</span>
              </span>
            </div>
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/55">
              Enterprise software, network infrastructure and cybersecurity for organisations that cannot afford downtime.
            </p>
            <form className="mt-7 flex max-w-sm gap-2" onSubmit={(e) => e.preventDefault()}>
              <label htmlFor="newsletter" className="sr-only">Email address</label>
              <input
                id="newsletter"
                type="email"
                required
                placeholder="Work email"
                className="w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm text-white placeholder:text-white/40 focus:border-accent/60 focus:outline-none"
              />
              <button type="submit" className="shrink-0 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[oklch(0.26_0.072_263)] transition-transform hover:-translate-y-0.5">
                Subscribe
              </button>
            </form>
            <div className="mt-7 flex gap-3">
              {[Linkedin, Twitter, Facebook, Youtube].map((Icon, i) => (
                <a key={i} href="#home" aria-label="Social profile" className="grid size-10 place-items-center rounded-full border border-white/15 transition-colors hover:bg-white/10 hover:text-white">
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <h3 className="font-display text-xs font-bold uppercase tracking-[0.16em] text-white">{col.title}</h3>
                <ul className="mt-5 space-y-3">
                  {col.links.map((l, i) => {
                    const route = col.routes?.[i];
                    if (route) {
                      return (
                        <li key={l}>
                          <Link to={route} className="text-sm text-white/55 transition-colors hover:text-accent">{l}</Link>
                        </li>
                      );
                    }
                    return (
                      <li key={l}>
                        <a href="#home" className="text-sm text-white/55 transition-colors hover:text-accent">{l}</a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-6 border-t border-white/10 pt-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: MapPin, label: "Head Office", value: "Bole Road, Addis Ababa, Ethiopia" },
            { icon: Mail, label: "Email", value: "girmawibelay@gmail.com" },
            { icon: Phone, label: "Phone", value: "0914554432" },
            { icon: Globe, label: "Website", value: "www.ramaitsolution.com" },
          ].map((c) => (
            <div key={c.label} className="flex items-start gap-3">
              <c.icon className="mt-0.5 size-4 shrink-0 text-accent" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">{c.label}</p>
                <p className="mt-1 text-sm text-white/75">{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-white/45 sm:flex-row">
          <p>© {new Date().getFullYear()} Rama Software &amp; IT Solutions. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="transition-colors hover:text-white">Privacy Policy</Link>
            <Link to="/terms-of-service" className="transition-colors hover:text-white">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
