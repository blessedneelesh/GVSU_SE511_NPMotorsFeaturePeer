import type { UnknownAction } from 'redux'
import type { RequestStatus } from '../../types/common'
import type { Employee, EmployeeFieldErrors, EmployeeQuery } from '../../types/employees'
import type { EmployeesAction } from './employees.actions'
import { EMPLOYEE_ACTIONS } from './employees.constants'

export interface EmployeesState {
  items: Employee[]
  hasNext: boolean
  query: EmployeeQuery
  listStatus: RequestStatus
  listError: string | null
  selectedId: string | null
  selected: Employee | null
  detailStatus: RequestStatus
  detailError: string | null
  saveStatus: RequestStatus
  saveError: string | null
  fieldErrors: EmployeeFieldErrors
}

export const initialEmployeesState: EmployeesState = {
  items: [],
  hasNext: false,
  query: { pageNumber: 1, pageSize: 5, department: 'all', status: 'all', searchTerm: '' },
  listStatus: 'idle',
  listError: null,
  selectedId: null,
  selected: null,
  detailStatus: 'idle',
  detailError: null,
  saveStatus: 'idle',
  saveError: null,
  fieldErrors: {},
}

const employeeActionTypes: ReadonlySet<string> = new Set(Object.values(EMPLOYEE_ACTIONS))

// combineReducers requires reducers to accept UnknownAction; narrow to our own actions here
const isEmployeesAction = (action: UnknownAction): action is EmployeesAction => employeeActionTypes.has(action.type)

export default function employeesReducer(state: EmployeesState = initialEmployeesState, action: UnknownAction): EmployeesState {
  if (!isEmployeesAction(action)) return state

  switch (action.type) {
    case EMPLOYEE_ACTIONS.LOAD:
      return { ...state, listStatus: 'loading', listError: null }
    case EMPLOYEE_ACTIONS.LOAD_SUCCESS:
      return { ...state, items: action.payload.items, hasNext: action.payload.hasNext, listStatus: 'success' }
    case EMPLOYEE_ACTIONS.LOAD_FAILURE:
      return { ...state, listStatus: 'error', listError: action.payload }
    case EMPLOYEE_ACTIONS.SET_SEARCH:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, searchTerm: action.payload, pageNumber: 1 } }
    case EMPLOYEE_ACTIONS.SET_DEPARTMENT_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, department: action.payload, pageNumber: 1 } }
    case EMPLOYEE_ACTIONS.SET_STATUS_FILTER:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, status: action.payload, pageNumber: 1 } }
    case EMPLOYEE_ACTIONS.SET_PAGE_SIZE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageSize: action.payload, pageNumber: 1 } }
    case EMPLOYEE_ACTIONS.SET_PAGE:
      return { ...state, listStatus: 'loading', listError: null, query: { ...state.query, pageNumber: Math.max(1, action.payload) } }
    case EMPLOYEE_ACTIONS.SELECT:
      return { ...state, selectedId: action.payload, selected: null, detailStatus: 'loading', detailError: null }
    case EMPLOYEE_ACTIONS.CLEAR_SELECTION:
      return { ...state, selectedId: null, selected: null, detailStatus: 'idle', detailError: null }
    case EMPLOYEE_ACTIONS.LOAD_BY_ID_SUCCESS:
      return { ...state, selected: action.payload, detailStatus: 'success' }
    case EMPLOYEE_ACTIONS.LOAD_BY_ID_FAILURE:
      return { ...state, detailStatus: 'error', detailError: action.payload }
    case EMPLOYEE_ACTIONS.CREATE:
      return { ...state, saveStatus: 'loading', saveError: null, fieldErrors: {} }
    case EMPLOYEE_ACTIONS.CREATE_SUCCESS:
      return { ...state, saveStatus: 'success' }
    case EMPLOYEE_ACTIONS.CREATE_FAILURE:
      return { ...state, saveStatus: 'error', saveError: action.payload.message || null, fieldErrors: action.payload.fieldErrors }
    case EMPLOYEE_ACTIONS.RESET_SAVE:
      return { ...state, saveStatus: 'idle', saveError: null, fieldErrors: {} }
    default: {
      const unhandled: never = action
      void unhandled
      return state
    }
  }
}
