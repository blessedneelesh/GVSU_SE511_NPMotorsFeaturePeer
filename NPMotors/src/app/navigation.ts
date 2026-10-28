import {
  ArrowDownload20Regular,
  ArrowUpload20Regular,
  BuildingBank20Regular,
  BuildingFactory20Regular,
  DataBarVertical20Regular,
  DataTrending20Regular,
  Diagram20Regular,
  DocumentText20Regular,
  Grid20Regular,
  Money20Regular,
  MoneyHand20Regular,
  People20Regular,
  Receipt20Regular,
  Scales20Regular,
  VehicleCar20Regular,
  VehicleCarProfileLtr20Regular,
  Wrench20Regular,
} from '@fluentui/react-icons'

export interface NavigationItem {
  label: string
  path: string
  icon: typeof Grid20Regular
}

export interface NavigationGroup {
  section: string
  items: NavigationItem[]
}

// Mirrors the sidebar sections in the Figma Make design
export const navigationGroups: NavigationGroup[] = [
  {
    section: 'Main',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: Grid20Regular }],
  },
  {
    section: 'Sales',
    items: [
      { label: 'Sales Invoices', path: '/sales-invoices', icon: Receipt20Regular },
      { label: 'Customers', path: '/customers', icon: People20Regular },
      { label: 'Accounts Receivable', path: '/accounts-receivable', icon: MoneyHand20Regular },
    ],
  },
  {
    section: 'Purchases',
    items: [
      { label: 'Purchase Vehicle', path: '/purchase-vehicle', icon: VehicleCar20Regular },
      { label: 'Vendors', path: '/vendors', icon: BuildingFactory20Regular },
      { label: 'Accounts Payable', path: '/accounts-payable', icon: Money20Regular },
    ],
  },
  {
    section: 'Inventory',
    items: [
      { label: 'Vehicles', path: '/vehicle-inventory', icon: VehicleCarProfileLtr20Regular },
      { label: 'Parts & Service', path: '/parts-inventory', icon: Wrench20Regular },
    ],
  },
  {
    section: 'Banking',
    items: [
      { label: 'Banks & Accounts', path: '/banks', icon: BuildingBank20Regular },
      { label: 'Bank Statement', path: '/bank-statement', icon: DocumentText20Regular },
      { label: 'Bank Receipts', path: '/bank-receipt', icon: ArrowDownload20Regular },
      { label: 'Bank Payments', path: '/bank-payment', icon: ArrowUpload20Regular },
      { label: 'Bank Reconciliation', path: '/bank-reconciliation', icon: Scales20Regular },
    ],
  },
  {
    section: 'Reports',
    items: [
      { label: 'Profit & Loss', path: '/profit-loss', icon: DataBarVertical20Regular },
      { label: 'Vehicle Profitability', path: '/vehicle-profitability', icon: DataTrending20Regular },
      { label: 'ER Diagram', path: '/er-diagram', icon: Diagram20Regular },
    ],
  },
]

export const navigationItems = navigationGroups.flatMap((group) => group.items)
