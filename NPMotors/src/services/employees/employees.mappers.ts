import type { Employee, EmployeeFormValues, EmployeeStatus } from '../../types/employees'

// Accepted spellings per field: ASP.NET camelCase (first_Name) first, then camelCase, PascalCase and snake_case
const DTO_FIELDS = {
  id: ['id', 'Id', 'employeeId', 'EmployeeId', 'employee_id'],
  firstName: ['first_Name', 'firstName', 'FirstName', 'First_Name', 'first_name'],
  lastName: ['last_Name', 'lastName', 'LastName', 'Last_Name', 'last_name'],
  department: ['department', 'Department'],
  job: ['job', 'Job', 'jobTitle', 'JobTitle'],
  salary: ['salary', 'Salary'],
  bonus: ['bonus', 'Bonus'],
  commissionRate: ['commission_Rate', 'commissionRate', 'CommissionRate', 'Commission_Rate', 'commission_rate'],
  isSalesperson: ['is_Salesperson', 'isSalesperson', 'IsSalesperson', 'Is_Salesperson', 'is_salesperson'],
  status: ['status', 'Status'],
} as const

type DtoField = keyof typeof DTO_FIELDS
type EmployeeDtoKey = (typeof DTO_FIELDS)[DtoField][number]
export type EmployeeDto = Partial<Record<EmployeeDtoKey, unknown>>

const COLLECTION_KEYS = ['data', 'items', 'employees', '$values'] as const

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function readField(dto: EmployeeDto, field: DtoField): unknown {
  const keys: readonly EmployeeDtoKey[] = DTO_FIELDS[field]
  for (const key of keys) {
    const value = dto[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

function readString(dto: EmployeeDto, field: DtoField): string {
  const value = readField(dto, field)
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number') return String(value)
  return ''
}

function readNumber(dto: EmployeeDto, field: DtoField): number {
  const value = readField(dto, field)
  const parsed = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : 0
}

function readBoolean(dto: EmployeeDto, field: DtoField): boolean {
  const value = readField(dto, field)
  return value === true || (typeof value === 'string' && value.trim().toLowerCase() === 'true')
}

export function normalizeStatus(value: unknown): EmployeeStatus {
  return typeof value === 'string' && value.trim().toLowerCase() === 'inactive' ? 'Inactive' : 'Active'
}

export function mapEmployee(raw: unknown): Employee {
  const dto: EmployeeDto = isRecord(raw) ? raw : {}
  const firstName = readString(dto, 'firstName')
  const lastName = readString(dto, 'lastName')

  return {
    id: readString(dto, 'id'),
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim() || 'Unnamed employee',
    department: readString(dto, 'department'),
    job: readString(dto, 'job'),
    salary: readNumber(dto, 'salary'),
    bonus: readNumber(dto, 'bonus'),
    commissionRate: readNumber(dto, 'commissionRate'),
    isSalesperson: readBoolean(dto, 'isSalesperson'),
    status: normalizeStatus(readField(dto, 'status')),
  }
}

function unwrapCollection(body: unknown): unknown[] {
  if (Array.isArray(body)) return body
  if (!isRecord(body)) return []
  for (const key of COLLECTION_KEYS) {
    const value = body[key]
    if (Array.isArray(value)) return value
    if (isRecord(value)) {
      const nested = unwrapCollection(value)
      if (nested.length) return nested
    }
  }
  return []
}

export function mapEmployeeCollection(body: unknown): Employee[] {
  return unwrapCollection(body).filter(isRecord).map(mapEmployee)
}

// Uses metaData.hasNext when the API sends it; null means "unknown, infer it"
export function readHasNext(body: unknown): boolean | null {
  if (!isRecord(body)) return null
  const metaData = body.metaData ?? body.MetaData
  if (!isRecord(metaData)) return null
  const hasNext = metaData.hasNext ?? metaData.HasNext
  return typeof hasNext === 'boolean' ? hasNext : null
}

// Body of POST Employee/AddEmployee (EmployeeCreateDto). Numbers must be JSON numbers: the API rejects "123".
export interface EmployeeCreateDto {
  first_Name: string
  last_Name: string
  department: string | null
  job: string | null
  salary: number | null
  bonus: number | null
  commission_Rate: number | null
  status: 'active' | 'inactive'
}

const orNull = (value: string) => value.trim() || null

const toNumberOrNull = (value: string) => {
  const trimmed = value.trim()
  const parsed = trimmed ? Number(trimmed) : NaN
  return Number.isFinite(parsed) ? parsed : null
}

export function toEmployeeCreateDto(values: EmployeeFormValues): EmployeeCreateDto {
  return {
    first_Name: values.firstName.trim(),
    last_Name: values.lastName.trim(),
    department: orNull(values.department),
    job: orNull(values.job),
    salary: toNumberOrNull(values.salary),
    bonus: toNumberOrNull(values.bonus),
    commission_Rate: toNumberOrNull(values.commissionRate),
    status: values.status === 'Inactive' ? 'inactive' : 'active',
  }
}
