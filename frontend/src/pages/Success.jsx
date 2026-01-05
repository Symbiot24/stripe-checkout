import { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Package, Loader2, XCircle } from 'lucide-react'
import { getSessionStatus } from '../config/api'

const Success = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = searchParams.get('session_id')
  const [orderData, setOrderData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchOrderDetails = async () => {
      if (!sessionId) {
        setError('No session ID found')
        setLoading(false)
        return
      }

      try {
        const data = await getSessionStatus(sessionId)
        setOrderData(data)
        
        if (data.order?.paymentStatus === 'failed') {
          setError('Payment failed')
        }
      } catch (err) {
        console.error('Error fetching order:', err)
        setError('Failed to load order details')
      } finally {
        setLoading(false)
      }
    }

    fetchOrderDetails()

    const interval = setInterval(async () => {
      if (orderData?.order?.paymentStatus === 'pending') {
        try {
          const data = await getSessionStatus(sessionId)
          setOrderData(data)
          
          if (data.order?.paymentStatus !== 'pending') {
            clearInterval(interval)
            
            if (data.order?.paymentStatus === 'failed') {
              setError('Payment failed')
            }
          }
        } catch (err) {
          console.error('Error polling order status:', err)
        }
      }
    }, 3000)

    return () => clearInterval(interval)
  }, [sessionId, orderData?.order?.paymentStatus])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !orderData) {
    if (orderData?.order?.paymentStatus === 'failed') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="bg-red-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="text-red-600" size={48} />
            </div>
            <h1 className="text-2xl font-bold mb-4">Payment Failed</h1>
            <p className="text-gray-600 mb-4">
              {orderData.order?.metadata?.failureReason || 'Your payment could not be processed.'}
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm text-yellow-800">
                <strong>Order ID:</strong> {orderData.order?._id}
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                <strong>Status:</strong> Failed
              </p>
            </div>
            <div className="space-y-3">
              <Link to="/" className="btn btn-primary inline-block w-full">
                Return to Store
              </Link>
              <p className="text-sm text-gray-500">
                Your cart items are still saved. You can try again.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link to="/" className="btn btn-primary inline-block">
            Back to Store
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
            <CheckCircle className="text-green-600" size={48} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Thank you for your purchase</p>
        </div>


        <div className="card p-6 sm:p-8 mb-6">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b">
            <Package className="text-gray-400" size={24} />
            <div>
              <p className="text-sm text-gray-500">Order ID</p>
              <p className="font-mono text-sm">{orderData.order?._id}</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex justify-between">
              <span className="text-gray-600">Email</span>
              <span className="font-medium">{orderData.customerEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                orderData.order?.paymentStatus === 'paid' 
                  ? 'bg-green-100 text-green-800' 
                  : orderData.order?.paymentStatus === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {orderData.order?.paymentStatus || orderData.paymentStatus}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Amount Paid</span>
              <span className="font-bold text-xl">
                ${(orderData.amountTotal / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {orderData.order?.items && orderData.order.items.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-4">Order Items</h3>
              <div className="space-y-3">
                {orderData.order.items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                    </div>
                    <p className="font-medium">${item.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            📧 A confirmation email has been sent to <strong>{orderData.customerEmail}</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link to="/" className="btn btn-primary flex-1 text-center">
            Continue Shopping
          </Link>
          <Link to="/orders" className="btn btn-secondary flex-1 text-center">
            View All Orders
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Success
