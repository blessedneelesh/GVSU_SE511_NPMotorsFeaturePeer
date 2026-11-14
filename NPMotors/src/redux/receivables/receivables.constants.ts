export const RECEIVABLE_ACTIONS = {
  LOAD: 'receivables/load',
  LOAD_SUCCESS: 'receivables/loadSuccess',
  LOAD_FAILURE: 'receivables/loadFailure',
  SET_STATUS_FILTER: 'receivables/setStatusFilter',
  SET_CUSTOMER_FILTER: 'receivables/setCustomerFilter',
  SET_AS_OF_DATE: 'receivables/setAsOfDate',
  RESET_FILTERS: 'receivables/resetFilters',
  SET_PAGE: 'receivables/setPage',
  SET_PAGE_SIZE: 'receivables/setPageSize',
  LOAD_CUSTOMER_OPTIONS: 'receivables/loadCustomerOptions',
  LOAD_CUSTOMER_OPTIONS_SUCCESS: 'receivables/loadCustomerOptionsSuccess',
  LOAD_CUSTOMER_OPTIONS_FAILURE: 'receivables/loadCustomerOptionsFailure',
} as const
