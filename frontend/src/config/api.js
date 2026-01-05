import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const createCheckoutSession = async (items, customerEmail) => {
  const response = await api.post('/payments/create-checkout-session', {
    items,
    customerEmail,
    successUrl: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${window.location.origin}/cancel?session_id={CHECKOUT_SESSION_ID}`,
  })
  return response.data
}

export const getSessionStatus = async (sessionId) => {
  const response = await api.get(`/payments/session/${sessionId}`)
  return response.data
}

export const confirmPayment = async (sessionId) => {
  const response = await api.post('/payments/confirm-payment', { sessionId })
  return response.data
}

export const getOrder = async (orderId) => {
  const response = await api.get(`/payments/order/${orderId}`)
  return response.data
}

export const getAllOrders = async (page = 1, limit = 10) => {
  const response = await api.get(`/payments/orders?page=${page}&limit=${limit}`)
  return response.data
}

export default api
