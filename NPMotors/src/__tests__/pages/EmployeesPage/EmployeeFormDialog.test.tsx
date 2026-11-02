import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmployeeFormDialog } from '../../../pages/EmployeesPage/EmployeeFormDialog'
import { createEmployee } from '../../../redux/employees/employees.actions'
import type { EmployeesState } from '../../../redux/employees/employees.reducer'
import { employeeFormValues } from '../../../test/fixtures/employees'
import { makeEmployeeState, renderWithProviders } from '../../../test/test-utils'

// The dialog renders in a portal, so every query goes through screen
function renderDialog(overrides: Partial<EmployeesState> = {}) {
  const onClose = vi.fn()
  const result = renderWithProviders(<EmployeeFormDialog onClose={onClose} />, { preloadedState: makeEmployeeState(overrides) })
  return { ...result, onClose }
}

const textbox = (label: RegExp) => screen.getByRole('textbox', { name: label })
// type="number" inputs have the spinbutton role
const numberField = (label: RegExp) => screen.getByRole('spinbutton', { name: label })

async function replace(user: UserEvent, input: HTMLElement, value: string) {
  await user.clear(input)
  if (value) await user.type(input, value)
}

async function fillValidForm(user: UserEvent) {
  await user.type(textbox(/First Name/), employeeFormValues.firstName)
  await user.type(textbox(/Last Name/), employeeFormValues.lastName)
  await user.type(textbox(/Job Title/), employeeFormValues.job)
  await user.type(numberField(/Salary/), employeeFormValues.salary)
  await replace(user, numberField(/Bonus/), employeeFormValues.bonus)
  await replace(user, numberField(/Commission/), employeeFormValues.commissionRate)
}

const submit = () => screen.getByRole('button', { name: 'Add Employee' })

const REQUIRED_MESSAGES = [
  'First name is required',
  'Last name is required',
  'Job title is required',
  'Enter a salary greater than zero',
]

describe('EmployeeFormDialog', () => {
  it('renders the title, both sections and the defaults', () => {
    renderDialog()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Add Employee' })).toBeInTheDocument()
    expect(screen.getByText('Create a new NPMotors employee record')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Personal Information' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Employment Details' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Department/ })).toHaveTextContent('Sales')
    expect(screen.getByRole('combobox', { name: /Status/ })).toHaveTextContent('Active')
    expect(numberField(/Salary/)).toHaveValue(null)
    expect(numberField(/Bonus/)).toHaveValue(0)
    expect(numberField(/Commission/)).toHaveValue(0)
    expect(submit()).toBeEnabled()
  })

  it('shows every required message for an empty form and does not save', async () => {
    const { actions, user } = renderDialog()
    await user.click(submit())

    for (const message of REQUIRED_MESSAGES) expect(screen.getByText(message)).toBeInTheDocument()
    expect(actions).toHaveLength(0)
  })

  it('rejects a zero salary', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await replace(user, numberField(/Salary/), '0')
    await user.click(submit())

    expect(screen.getByText('Enter a salary greater than zero')).toBeInTheDocument()
    expect(actions).toHaveLength(0)
  })

  it('rejects a negative bonus', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await replace(user, numberField(/Bonus/), '-5')
    await user.click(submit())

    expect(screen.getByText('Bonus cannot be negative')).toBeInTheDocument()
    expect(actions).toHaveLength(0)
  })

  it('rejects a commission above 100', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await replace(user, numberField(/Commission/), '150')
    await user.click(submit())

    expect(screen.getByText('Commission must be between 0 and 100')).toBeInTheDocument()
    expect(actions).toHaveLength(0)
  })

  it('clears a field error as soon as the field is edited', async () => {
    const { user } = renderDialog()
    await user.click(submit())
    expect(screen.getByText('First name is required')).toBeInTheDocument()

    await user.type(textbox(/First Name/), 'A')
    expect(screen.queryByText('First name is required')).not.toBeInTheDocument()
    expect(screen.getByText('Last name is required')).toBeInTheDocument()
  })

  it('dispatches createEmployee with the typed values', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.click(submit())
    expect(actions).toEqual([createEmployee(employeeFormValues)])
  })

  it('accepts a blank bonus and commission, which are optional', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await replace(user, numberField(/Bonus/), '')
    await replace(user, numberField(/Commission/), '')
    await user.click(submit())
    expect(actions).toEqual([createEmployee({ ...employeeFormValues, bonus: '', commissionRate: '' })])
  })

  it('sends the chosen department and status', async () => {
    const { actions, user } = renderDialog()
    await fillValidForm(user)
    await user.click(screen.getByRole('combobox', { name: /Department/ }))
    expect(screen.getAllByRole('option').map((option) => option.textContent))
      .toEqual(['Accounting', 'Administration', 'Management', 'Sales', 'Service'])
    await user.click(screen.getByRole('option', { name: 'Accounting' }))
    await user.click(screen.getByRole('combobox', { name: /Status/ }))
    await user.click(screen.getByRole('option', { name: 'Inactive' }))
    await user.click(submit())
    expect(actions).toEqual([createEmployee({ ...employeeFormValues, department: 'Accounting', status: 'Inactive' })])
  })

  it('locks the form while saving', async () => {
    const { onClose, user } = renderDialog({ saveStatus: 'loading' })

    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Close add employee form' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Personal Information' })).toBeDisabled()
    expect(screen.getByRole('group', { name: 'Employment Details' })).toBeDisabled()

    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows server errors and hides a field error once that field is edited', async () => {
    const { user } = renderDialog({
      saveStatus: 'error',
      saveError: 'Something went wrong while saving.',
      fieldErrors: { firstName: 'The First_Name field is required.', salary: 'Salary must be a number' },
    })

    expect(screen.getByText('Something went wrong while saving.')).toBeInTheDocument()
    expect(screen.getByText('The First_Name field is required.')).toBeInTheDocument()

    await user.type(textbox(/First Name/), 'x')
    expect(screen.queryByText('The First_Name field is required.')).not.toBeInTheDocument()
    expect(screen.getByText('Salary must be a number')).toBeInTheDocument()
  })

  it('shows server errors on the dropdowns and hides them once a new option is chosen', async () => {
    const { user } = renderDialog({ saveStatus: 'error', fieldErrors: { department: 'Bad department', status: 'Bad status' } })
    expect(screen.getByText('Bad department')).toBeInTheDocument()
    expect(screen.getByText('Bad status')).toBeInTheDocument()

    await user.click(screen.getByRole('combobox', { name: /Department/ }))
    await user.click(screen.getByRole('option', { name: 'Service' }))
    expect(screen.queryByText('Bad department')).not.toBeInTheDocument()
    expect(screen.getByText('Bad status')).toBeInTheDocument()
  })

  it.each([
    ['Cancel', 'Cancel'],
    ['the close button', 'Close add employee form'],
  ])('calls onClose from %s', async (_, name) => {
    const { onClose, user } = renderDialog()
    await user.click(screen.getByRole('button', { name }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape when not saving', async () => {
    const { onClose, user } = renderDialog()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
