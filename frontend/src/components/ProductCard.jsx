import { Plus, Minus } from 'lucide-react'

const ProductCard = ({ product, quantity, onAdd, onRemove }) => {
  return (
    <div className="card group">
      <div className="aspect-square bg-gray-100 relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {quantity > 0 && (
          <div className="absolute top-3 right-3 bg-black text-white w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium">
            {quantity}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-1">{product.name}</h3>
        <p className="text-gray-600 text-sm mb-3">{product.description}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold">${product.price.toFixed(2)}</span>
          
          {quantity === 0 ? (
            <button
              onClick={onAdd}
              className="btn btn-primary text-sm py-2 px-4"
            >
              Add to Cart
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onRemove}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
              >
                <Minus size={16} />
              </button>
              <span className="font-medium min-w-[24px] text-center">{quantity}</span>
              <button
                onClick={onAdd}
                className="w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800 flex items-center justify-center transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProductCard
