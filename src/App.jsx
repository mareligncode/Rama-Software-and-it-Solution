import { Nav } from './components/site/Nav'
import { Hero } from './components/site/Hero'
import { TrustedBy, About, WhyRama, Services, Industries } from './components/site/Sections1'
import { Erp, NetworkSection, Security, Process, Projects, Stats, Testimonials, TechStack } from './components/site/Sections2'
import { Team, Insights, Faq, CallToAction, Footer } from './components/site/Sections3'

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main>
        <Hero />
        <TrustedBy />
        <About />
        <WhyRama />
        <Services />
        <Erp />
        <NetworkSection />
        <Security />
        <Industries />
        <Process />
        <Projects />
        <Stats />
        <Testimonials />
        <TechStack />
        <Team />
        <Insights />
        <Faq />
        <CallToAction />
      </main>
      <Footer />
    </div>
  )
}

export default App
