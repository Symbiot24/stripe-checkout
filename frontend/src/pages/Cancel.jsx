import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { XCircle, Loader2 } from 'lucide-react'
import { confirmPayment } from '../config/api'

const Cancel = () => {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(false)
  const [orderData, setOrderData] = useState(null)

  useEffect(() => {
    // If we have a session ID, mark the order as failed
    const markOrderAsFailed = async () => {
      if (!sessionId) return

      setLoading(true)
      try {
        const result = await confirmPayment(sessionId)
        setOrderData(result.order)
        console.log('Order marked as failed/canceled:', result)
      } catch (error) {
        console.error('Error marking order as failed:', error)
      } finally {
        setLoading(false)
      }
    }

    markOrderAsFailed()
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-gray-600">Processing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Cancel Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-100 rounded-full mb-6">
          <XCircle className="text-yellow-600" size={48} />
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold mb-4">Payment Cancelled</h1>
        <p className="text-gray-600 mb-8">
          Your payment was cancelled. No charges were made to your account.
          You can return to the store and try again when you're ready.
        </p>

        {/* Order ID if available */}
        {orderData && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-600">
              <strong>Order ID:</strong> <span className="font-mono">{orderData._id}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              <strong>Status:</strong> <span className="capitalize">{orderData.paymentStatus}</span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Link to="/" className="btn btn-primary w-full block">
            Return to Store
          </Link>
          <p className="text-sm text-gray-500">
            Need help? Contact our support team
          </p>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg text-left">
          <h3 className="font-semibold mb-2 text-sm">What happens next?</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Your cart items are still saved</li>
            <li>• No payment was processed</li>
            <li>• You can checkout anytime</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Cancel
