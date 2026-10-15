import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Onboarding from './pages/Onboarding'
import AppLayout from './pages/app/Layout'
import Pipelines from './pages/app/Pipelines'
import PipelineDetail from './pages/app/PipelineDetail'
import Repairs from './pages/app/Repairs'
import RepairDetail from './pages/app/RepairDetail'
import Knowledge from './pages/app/Knowledge'
import Analytics from './pages/app/Analytics'
import Settings from './pages/app/Settings'
import LiveRun from './pages/app/LiveRun'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const authed = localStorage.getItem('kintsugi_authed') === 'true'
  return authed ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="pipelines" replace />} />
          <Route path="pipelines" element={<Pipelines />} />
          <Route path="pipelines/:id" element={<PipelineDetail />} />
          <Route path="run" element={<LiveRun />} />
          <Route path="repairs" element={<Repairs />} />
          <Route path="repairs/:id" element={<RepairDetail />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
