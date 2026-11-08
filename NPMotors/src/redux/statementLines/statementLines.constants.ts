export const STATEMENT_LINE_ACTIONS = {
  LOAD: 'statementLines/load',
  LOAD_SUCCESS: 'statementLines/loadSuccess',
  LOAD_FAILURE: 'statementLines/loadFailure',
  SET_BANK_ACCOUNT_FILTER: 'statementLines/setBankAccountFilter',
  SET_MONTH_FILTER: 'statementLines/setMonthFilter',
  SET_TYPE_FILTER: 'statementLines/setTypeFilter',
  RESET_FILTERS: 'statementLines/resetFilters',
  SET_PAGE: 'statementLines/setPage',
  SET_PAGE_SIZE: 'statementLines/setPageSize',
  LOAD_ACCOUNT_OPTIONS: 'statementLines/loadAccountOptions',
  LOAD_ACCOUNT_OPTIONS_SUCCESS: 'statementLines/loadAccountOptionsSuccess',
  LOAD_ACCOUNT_OPTIONS_FAILURE: 'statementLines/loadAccountOptionsFailure',
} as const
