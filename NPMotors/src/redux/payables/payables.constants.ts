export const PAYABLE_ACTIONS = {
  LOAD: 'payables/load',
  LOAD_SUCCESS: 'payables/loadSuccess',
  LOAD_FAILURE: 'payables/loadFailure',
  SET_STATUS_FILTER: 'payables/setStatusFilter',
  SET_VENDOR_FILTER: 'payables/setVendorFilter',
  SET_AS_OF_DATE: 'payables/setAsOfDate',
  RESET_FILTERS: 'payables/resetFilters',
  SET_PAGE: 'payables/setPage',
  SET_PAGE_SIZE: 'payables/setPageSize',
  LOAD_VENDOR_OPTIONS: 'payables/loadVendorOptions',
  LOAD_VENDOR_OPTIONS_SUCCESS: 'payables/loadVendorOptionsSuccess',
  LOAD_VENDOR_OPTIONS_FAILURE: 'payables/loadVendorOptionsFailure',
} as const
