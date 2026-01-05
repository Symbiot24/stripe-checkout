import { ShoppingCart, X, Loader2 } from 'lucide-react'
import { useState } from 'react'

const Cart = ({ items, products, onUpdateQuantity, onCheckout, isLoading }) => {
  const [email, setEmail] = useState('')
  const [showCart, setShowCart] = useState(false)

  const cartItems = items.filter(item => item.quantity > 0)
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = cartItems.reduce((sum, item) => {
    const product = products.find(p => p.id === item.productId)
    return sum + (product?.price || 0) * item.quantity
  }, 0)

  const handleCheckout = (e) => {
    e.preventDefault()
    if (email && totalItems > 0) {
      onCheckout(email)
    }
  }

  return (
    <>
      {/* Cart Button */}
      <button
        onClick={() => setShowCart(true)}
        className="fixed bottom-6 right-6 bg-black text-white w-16 h-16 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center z-40"
      >
        <ShoppingCart size={24} />
        {totalItems > 0 && (
          <div className="absolute -top-2 -right-2 bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold">
            {totalItems}
          </div>
        )}
      </button>

      {/* Cart Sidebar */}
      {showCart && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowCart(false)}
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Cart</h2>
              <button
                onClick={() => setShowCart(false)}
                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {cartItems.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <ShoppingCart size={64} className="mx-auto mb-4 opacity-20" />
                    <p>Your cart is empty</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map(item => {
                    const product = products.find(p => p.id === item.productId)
                    if (!product) return null
                    
                    return (
                      <div key={item.productId} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <div className="flex-1">
                          <h3 className="font-medium mb-1">{product.name}</h3>
                          <p className="text-sm text-gray-600 mb-2">
                            ${product.price.toFixed(2)} × {item.quantity}
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                              className="px-3 py-1 bg-white border rounded hover:bg-gray-100 transition-colors text-sm"
                            >
                              -
                            </button>
                            <span className="font-medium">{item.quantity}</span>
                            <button
                              onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                              className="px-3 py-1 bg-white border rounded hover:bg-gray-100 transition-colors text-sm"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div className="font-bold">
                          ${(product.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Checkout Form */}
            {cartItems.length > 0 && (
              <div className="border-t p-6 space-y-4">
                <div className="flex justify-between text-lg">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-2xl">${totalPrice.toFixed(2)}</span>
                </div>
                
                <form onSubmit={handleCheckout} className="space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    required
                    disabled={isLoading}
                  />
                  
                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="btn btn-primary w-full"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="animate-spin" size={20} />
                        Processing...
                      </span>
                    ) : (
                      'Proceed to Checkout'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </>
      )}
    </>
  )
}

export default Cart
