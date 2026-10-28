import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { navigationItems } from './navigation'
import { ComingSoonPage } from '../pages/ComingSoonPage/ComingSoonPage'
import { CustomersPage } from '../pages/CustomersPage/CustomersPage'
import { DashboardPage } from '../pages/DashboardPage/DashboardPage'
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage'

const builtPaths = new Set(['/dashboard', '/customers'])

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        {navigationItems
          .filter((item) => !builtPaths.has(item.path))
          .map((item) => <Route key={item.path} path={item.path} element={<ComingSoonPage title={item.label} />} />)}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
