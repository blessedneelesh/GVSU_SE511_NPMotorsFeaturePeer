import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './AppShell'
import { navigationItems } from './navigation'
import { AccountsReceivablePage } from '../pages/AccountsReceivablePage/AccountsReceivablePage'
import { BankAccountsPage } from '../pages/BankAccountsPage/BankAccountsPage'
import { ComingSoonPage } from '../pages/ComingSoonPage/ComingSoonPage'
import { CustomersPage } from '../pages/CustomersPage/CustomersPage'
import { DashboardPage } from '../pages/DashboardPage/DashboardPage'
import { EmployeesPage } from '../pages/EmployeesPage/EmployeesPage'
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage'
import { PartsPage } from '../pages/PartsPage/PartsPage'
import { PurchaseVehiclePage } from '../pages/PurchaseVehiclePage/PurchaseVehiclePage'
import { TransactionsPage } from '../pages/TransactionsPage/TransactionsPage'
import { StatementLinesPage } from '../pages/StatementLinesPage/StatementLinesPage'
import { TransfersPage } from '../pages/TransfersPage/TransfersPage'
import { SalesInvoicesPage } from '../pages/SalesInvoicesPage/SalesInvoicesPage'
import { VehiclesPage } from '../pages/VehiclesPage/VehiclesPage'
import { VendorsPage } from '../pages/VendorsPage/VendorsPage'

const builtPaths = new Set(['/dashboard', '/customers', '/vendors', '/employees', '/vehicle-inventory', '/parts-inventory', '/sales-invoices', '/banks', '/transactions', '/bank-statement', '/bank-transfer', '/accounts-receivable', '/purchase-vehicle'])

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/vendors" element={<VendorsPage />} />
        <Route path="/employees" element={<EmployeesPage />} />
        <Route path="/vehicle-inventory" element={<VehiclesPage />} />
        <Route path="/parts-inventory" element={<PartsPage />} />
        <Route path="/sales-invoices" element={<SalesInvoicesPage />} />
        <Route path="/banks" element={<BankAccountsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/bank-statement" element={<StatementLinesPage />} />
        <Route path="/bank-transfer" element={<TransfersPage />} />
        <Route path="/accounts-receivable" element={<AccountsReceivablePage />} />
        <Route path="/purchase-vehicle" element={<PurchaseVehiclePage />} />
        {navigationItems
          .filter((item) => !builtPaths.has(item.path))
          .map((item) => <Route key={item.path} path={item.path} element={<ComingSoonPage title={item.label} />} />)}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
