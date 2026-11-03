import type { Part, PartPage, PartReceiveLine, PartReceiveOptions, PartVendorOption } from '../../types/parts'

// Shaped like a real GetAllParts row (BRK-1001 from Great Lakes Auto Parts)
export const part: Part = {
  id: '1',
  partNumber: 'BRK-1001',
  name: 'Front Brake Pad Set',
  category: 'Brakes',
  vendorId: '2',
  costPrice: 38.5,
  sellPrice: 69.99,
  quantity: 40,
  reorderLevel: 10,
  warehouse: 'Warehouse A',
  inventoryValue: 1540,
  isLowStock: false,
}

// A second part from the same vendor, so the Receive Parts part list has more than one option per vendor
export const rotorPart: Part = {
  id: '3',
  partNumber: 'BRK-1003',
  name: 'Brake Rotor',
  category: 'Brakes',
  vendorId: '2',
  costPrice: 72,
  sellPrice: 129.99,
  quantity: 12,
  reorderLevel: 4,
  warehouse: 'Warehouse A',
  inventoryValue: 864,
  isLowStock: false,
}

// Below its reorder level, from the other parts vendor: the red quantity and the Low Stock badge
export const lowStockPart: Part = {
  id: '7',
  partNumber: 'OIL-2002',
  name: 'Oil Filter',
  category: 'Filters',
  vendorId: '4',
  costPrice: 6.25,
  sellPrice: 14.99,
  quantity: 3,
  reorderLevel: 12,
  warehouse: 'Warehouse B',
  inventoryValue: 18.75,
  isLowStock: true,
}

// Optional fields empty and no id: exercises the '—' fallbacks and the disabled links
export const sparsePart: Part = {
  id: '',
  partNumber: '',
  name: '',
  category: '',
  vendorId: '',
  costPrice: 0,
  sellPrice: 0,
  quantity: 0,
  reorderLevel: 0,
  warehouse: '',
  inventoryValue: 0,
  isLowStock: false,
}

export const partPage: PartPage = {
  items: [part, sparsePart],
  hasNext: true,
}

// Two parts vendors and one vehicles vendor, which the Receive Parts dropdown leaves out
export const partVendorOptions: PartVendorOption[] = [
  { id: '2', name: 'Great Lakes Auto Parts', type: 'parts' },
  { id: '4', name: 'Lakeshore Tire & Wheel', type: 'parts' },
  { id: '1', name: 'Motor City Wholesale Autos', type: 'vehicles' },
]

export const partReceiveOptions: PartReceiveOptions = {
  parts: [part, rotorPart, lowStockPart],
  bankAccounts: [
    { id: '1', name: 'Operating Checking', accountNumber: '********0001' },
    { id: '112', name: 'Parts Reserve', accountNumber: '********0002' },
  ],
}

// 5 brake pad sets and 2 rotors, as the Receive Parts form sends them
export const padsReceiveLine: PartReceiveLine = { partId: '1', quantity: 5 }
export const rotorsReceiveLine: PartReceiveLine = { partId: '3', quantity: 2 }
export const partReceiveLines: PartReceiveLine[] = [padsReceiveLine, rotorsReceiveLine]
