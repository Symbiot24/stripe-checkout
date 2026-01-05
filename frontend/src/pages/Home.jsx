import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import ProductCard from '../components/ProductCard'
import Cart from '../components/Cart'
import { createCheckoutSession } from '../config/api'

// Sample products - replace with your actual products
const PRODUCTS = [
  {
    id: 1,
    name: 'Minimalist Watch',
    description: 'Clean design, timeless elegance',
    price: 299.99,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop',
  },
  {
    id: 2,
    name: 'Leather Wallet',
    description: 'Premium quality, handcrafted',
    price: 89.99,
    image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&auto=format&fit=crop',
  },
  {
    id: 3,
    name: 'Wireless Earbuds',
    description: 'Crystal clear sound, all day comfort',
    price: 149.99,
    image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800&auto=format&fit=crop',
  },
  {
    id: 4,
    name: 'Backpack',
    description: 'Perfect for daily commute',
    price: 119.99,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&auto=format&fit=crop',
  },
  {
    id: 5,
    name: 'Sunglasses',
    description: 'UV protection, stylish design',
    price: 179.99,
    image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800&auto=format&fit=crop',
  },
  {
    id: 6,
    name: 'Notebook Set',
    description: 'Premium paper, perfect for notes',
    price: 24.99,
    image: 'https://images.unsplash.com/photo-1517971071642-34a2d3ecc9cd?w=800&auto=format&fit=crop',
  },
]

const Home = () => {
  const [cart, setCart] = useState(
    PRODUCTS.map(p => ({ productId: p.id, quantity: 0 }))
  )
  const [isLoading, setIsLoading] = useState(false)

  const updateQuantity = (productId, newQuantity) => {
    setCart(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, quantity: Math.max(0, newQuantity) }
          : item
      )
    )
  }

  const handleCheckout = async (email) => {
    setIsLoading(true)
    try {
      const cartItems = cart
        .filter(item => item.quantity > 0)
        .map(item => {
          const product = PRODUCTS.find(p => p.id === item.productId)
          return {
            name: product.name,
            description: product.description,
            price: product.price,
            quantity: item.quantity,
            image: product.image,
          }
        })

      console.log('Creating checkout session with:', { 
        itemsCount: cartItems.length, 
        email 
      })

      const result = await createCheckoutSession(cartItems, email)
      
      console.log('Checkout session created:', result)
      
      if (!result.url) {
        throw new Error('No checkout URL received from server')
      }
      
      // Redirect to Stripe Checkout
      window.location.href = result.url
    } catch (error) {
      console.error('Checkout error:', error)
      console.error('Error response:', error.response?.data)
      
      const errorMessage = error.response?.data?.error 
        || error.message 
        || 'Failed to create checkout session'
      
      alert(`Checkout failed: ${errorMessage}. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Minimalist Store</h1>
            <Link
              to="/orders"
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors"
            >
              <Package size={20} />
              <span className="hidden sm:inline">Orders</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-gray-100 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            Less is More
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Curated collection of essential products designed for modern living
          </p>
        </div>
      </section>

      {/* Products Grid */}
      <section className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRODUCTS.map(product => {
            const cartItem = cart.find(item => item.productId === product.id)
            return (
              <ProductCard
                key={product.id}
                product={product}
                quantity={cartItem?.quantity || 0}
                onAdd={() => updateQuantity(product.id, (cartItem?.quantity || 0) + 1)}
                onRemove={() => updateQuantity(product.id, (cartItem?.quantity || 0) - 1)}
              />
            )
          })}
        </div>
      </section>

      {/* Cart */}
      <Cart
        items={cart}
        products={PRODUCTS}
        onUpdateQuantity={updateQuantity}
        onCheckout={handleCheckout}
        isLoading={isLoading}
      />
    </div>
  )
}

export default Home
