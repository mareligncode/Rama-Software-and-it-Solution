import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'
import AdminPage from './routes/Admin.jsx'
import EmployeeDashboard from './routes/Employee.jsx'
import Plan from './routes/Plan.jsx'
import Notes from './routes/Notes.jsx'
import Careers from './routes/Careers.jsx'
import Internships from './routes/Internships.jsx'
import News from './routes/News.jsx'
import Events from './routes/Events.jsx'
import PostDetail from './routes/PostDetail.jsx'
import PrivacyPolicy from './routes/PrivacyPolicy.jsx'
import TermsOfService from './routes/TermsOfService.jsx'
import VerifyDocument from './routes/VerifyDocument.jsx'

// Auto-redirect path-based verification URLs to HashRouter format
if (typeof window !== "undefined" && window.location.pathname) {
  const p = window.location.pathname
  if (p.includes("/verify") || p.includes("/payment-letter")) {
    const search = window.location.search || ""
    const hash = window.location.hash || ""
    if (!hash.includes("verify") && !hash.includes("payment-letter")) {
      const parts = p.split("/").filter(Boolean)
      const lastPart = parts[parts.length - 1]
      const idFromPath = lastPart && lastPart !== "verify" && lastPart !== "payment-letter" ? lastPart : ""
      const query = search ? search : idFromPath ? `?id=${idFromPath}` : ""
      window.location.replace(`${window.location.origin}/#/verify${query}`)
    }
  }
}

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/verify" element={<VerifyDocument />} />
          <Route path="/verify/:id" element={<VerifyDocument />} />
          <Route path="/payment-letter/:id" element={<VerifyDocument />} />
          <Route path="/verify-letter/:id" element={<VerifyDocument />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/careers" element={<Careers />} />
          <Route path="/internships" element={<Internships />} />
          <Route path="/news" element={<News />} />
          <Route path="/events" element={<Events />} />
          <Route path="/updates/:slug" element={<PostDetail />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/" element={<App />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
)
