import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'
import AdminPage from './routes/Admin.jsx'
import Careers from './routes/Careers.jsx'
import Internships from './routes/Internships.jsx'
import News from './routes/News.jsx'
import Events from './routes/Events.jsx'
import PostDetail from './routes/PostDetail.jsx'
import PrivacyPolicy from './routes/PrivacyPolicy.jsx'
import TermsOfService from './routes/TermsOfService.jsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
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
