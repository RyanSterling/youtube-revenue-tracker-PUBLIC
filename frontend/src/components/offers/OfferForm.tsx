import { useState, useEffect } from 'react'
import { Offer } from '@/types'
import { Button } from '@/components/ui/Button'
import { StripeProductPicker } from '@/components/offers/StripeProductPicker'
import { generateSlug } from '@/lib/utils'

interface OfferFormData {
  name: string
  slug: string
  destination_url: string
  price: number
  offer_type: 'paid' | 'freebie'
  stripe_product_id: string | null
  stripe_price_id: string | null
}

interface OfferFormProps {
  initialData?: Offer
  defaultType?: 'paid' | 'freebie'
  onSubmit: (data: OfferFormData) => Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function OfferForm({ initialData, defaultType, onSubmit, onCancel, isSubmitting }: OfferFormProps) {
  const [formData, setFormData] = useState<OfferFormData>({
    name: initialData?.name ?? '',
    slug: initialData?.slug ?? '',
    destination_url: initialData?.destination_url ?? '',
    price: initialData?.price ?? 0,
    offer_type: initialData?.offer_type ?? defaultType ?? 'paid',
    stripe_product_id: initialData?.stripe_product_id ?? null,
    stripe_price_id: initialData?.stripe_price_id ?? null,
  })

  const [autoSlug, setAutoSlug] = useState(!initialData)

  useEffect(() => {
    if (autoSlug && formData.name) {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(formData.name),
      }))
    }
  }, [formData.name, autoSlug])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(formData)
  }

  function updateField<K extends keyof OfferFormData>(key: K, value: OfferFormData[K]) {
    setFormData(prev => ({ ...prev, [key]: value }))
    if (key === 'slug') {
      setAutoSlug(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Offer Type - only show if no defaultType is locked */}
      {!defaultType && (
        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-2">
            Offer Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="offer_type"
                value="paid"
                checked={formData.offer_type === 'paid'}
                onChange={() => updateField('offer_type', 'paid')}
                className="text-accent-primary"
              />
              <span className="text-foreground-primary">Paid Product</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="offer_type"
                value="freebie"
                checked={formData.offer_type === 'freebie'}
                onChange={() => updateField('offer_type', 'freebie')}
                className="text-accent-primary"
              />
              <span className="text-foreground-primary">Lead Magnet (Free)</span>
            </label>
          </div>
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-foreground-secondary mb-2">
          Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Course Bundle Launch"
          required
          className="w-full px-3 py-2 bg-background-tertiary border border-border-primary rounded-lg text-foreground-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
      </div>

      {/* Slug */}
      <div>
        <label className="block text-sm font-medium text-foreground-secondary mb-2">
          URL Slug
        </label>
        <input
          type="text"
          value={formData.slug}
          onChange={(e) => updateField('slug', e.target.value)}
          placeholder="course-bundle-launch"
          required
          className="w-full px-3 py-2 bg-background-tertiary border border-border-primary rounded-lg text-foreground-primary font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
        <p className="mt-1.5 text-xs text-foreground-tertiary">
          Tracking URL: <span className="font-mono">yourdomain.com/go/{formData.slug || 'your-slug'}</span>
        </p>
      </div>

      {/* Destination URL */}
      <div>
        <label className="block text-sm font-medium text-foreground-secondary mb-2">
          Destination URL
        </label>
        <input
          type="url"
          value={formData.destination_url}
          onChange={(e) => updateField('destination_url', e.target.value)}
          placeholder="https://checkout.example.com/product"
          required
          className="w-full px-3 py-2 bg-background-tertiary border border-border-primary rounded-lg text-foreground-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
      </div>

      {/* Price (only for paid) */}
      {formData.offer_type === 'paid' && (
        <div>
          <label className="block text-sm font-medium text-foreground-secondary mb-2">
            Price (USD)
          </label>
          <input
            type="number"
            value={formData.price}
            onChange={(e) => updateField('price', parseFloat(e.target.value) || 0)}
            min="0"
            step="0.01"
            className="w-full px-3 py-2 bg-background-tertiary border border-border-primary rounded-lg text-foreground-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
        </div>
      )}

      {/* Stripe Product Link (only for paid) */}
      {formData.offer_type === 'paid' && (
        <StripeProductPicker
          value={{
            productId: formData.stripe_product_id,
            priceId: formData.stripe_price_id,
          }}
          onChange={(value) => {
            setFormData(prev => ({
              ...prev,
              stripe_product_id: value.productId,
              stripe_price_id: value.priceId,
            }))
          }}
          disabled={isSubmitting}
        />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border-primary">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Create Offer'}
        </Button>
      </div>
    </form>
  )
}
