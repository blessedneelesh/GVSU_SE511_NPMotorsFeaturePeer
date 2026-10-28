import axios from 'axios'
import { CUSTOMER_API_BASE_URL } from './apiConstants'

export const customerClient = axios.create({
  baseURL: CUSTOMER_API_BASE_URL,
  timeout: 10000,
  headers: { Accept: 'application/json' },
})
