import { useState, useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import { StripeProduct, StripePrice } from '@/types'

interface StripeProductPickerProps {
  value: {
    productId: string | null
    priceId: string | null
  }
  onChange: (value: { productId: string | null; priceId: string | null }) => void
  disabled?: boolean
}

export function StripeProductPicker({ value, onChange, disabled }: StripeProductPickerProps) {
  const { fetchApi } = useApi()
  const [products, setProducts] = useState<StripeProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetchApi<{ products?: StripeProduct[]; error?: string }>('/stripe/products')

      if (response.error) {
        if (response.error === 'Stripe not connected') {
          setIsConnected(false)
        } else {
          setError(response.error)
        }
        setProducts([])
      } else {
        setIsConnected(true)
        setProducts(response.products || [])
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Stripe not connected')) {
        setIsConnected(false)
      } else {
        setError('Failed to load products')
      }
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = products.find(p => p.id === value.productId)
  const selectedPrice = selectedProduct?.prices.find(p => p.id === value.priceId)

  function handleProductChange(productId: string) {
    if (productId === '') {
      onChange({ productId: null, priceId: null })
    } else {
      const product = products.find(p => p.id === productId)
      // Auto-select first price if only one
      const defaultPriceId = product?.prices.length === 1 ? product.prices[0].id : null
      onChange({ productId, priceId: defaultPriceId })
    }
  }

  function handlePriceChange(priceId: string) {
    onChange({
      productId: value.productId,
      priceId: priceId === '' ? null : priceId,
    })
  }

  function formatPrice(price: StripePrice): string {
    if (price.amount === null || price.amount === 0) return 'Free'
    return `${(price.amount / 100).toFixed(2)} ${price.currency.toUpperCase()}`
  }

  if (!isConnected) {
    return (
      <div className="p-4 bg-background-tertiary rounded-lg border border-border-primary">
        <p className="text-foreground-secondary text-sm mb-2">
          Connect your Stripe account to link products for automatic conversion attribution.
        </p>
        <a
          href="/dashboard/settings"
          className="text-accent-primary hover:underline text-sm"
        >
          Connect Stripe in Settings
        </a>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 bg-background-tertiary rounded-lg animate-pulse">
        <div className="h-4 bg-border-primary rounded w-1/3"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={loadProducts}
          className="text-accent-primary hover:underline text-sm mt-2"
        >
          Retry
        </button>
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="p-4 bg-background-tertiary rounded-lg border border-border-primary">
        <p className="text-foreground-secondary text-sm">
          No products found in your Stripe account. Create products in Stripe to link them here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Product Select */}
      <div>
        <label className="block text-sm font-medium text-foreground-secondary mb-2">
          Stripe Product (Optional)
        </label>
        <select
          value={value.productId || ''}
          onChange={(e) => handleProductChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-background-tertiary border border-border-primary rounded-lg text-foreground-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        >
          <option value="">No product linked</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-foreground-tertiary">
          Link a Stripe product for automatic attribution when customers purchase
        </p>
      </div>

      {/* Price Select (only if product selected and multiple prices) */}
      {value.productId && selectedProduct && selectedProduct.prices.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-2">
            Price
          </label>
          <select
            value={value.priceId || ''}
            onChange={(e) => handlePriceChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 bg-background-tertiary border border-border-primary rounded-lg text-foreground-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          >
            <option value="">Any price</option>
            {selectedProduct.prices.map(price => (
              <option key={price.id} value={price.id}>
                {formatPrice(price)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Show linked product info */}
      {value.productId && selectedProduct && (
        <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <p className="text-green-400 text-sm">
            Linked to: <strong>{selectedProduct.name}</strong>
            {selectedPrice && ` - ${formatPrice(selectedPrice)}`}
          </p>
        </div>
      )}
    </div>
  )
}
