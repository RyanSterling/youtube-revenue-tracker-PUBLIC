import { useEffect } from 'react'
import { Offer } from '@/types'
import { OfferForm } from './OfferForm'

interface OfferModalProps {
  isOpen: boolean
  onClose: () => void
  offer?: Offer | null
  defaultType?: 'paid' | 'freebie'
  onSubmit: (data: {
    name: string
    slug: string
    destination_url: string
    price: number
    offer_type: 'paid' | 'freebie'
  }) => Promise<void>
  isSubmitting?: boolean
}

export function OfferModal({ isOpen, onClose, offer, defaultType, onSubmit, isSubmitting }: OfferModalProps) {
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const title = offer
    ? 'Edit Offer'
    : defaultType === 'freebie'
      ? 'Create Lead Magnet'
      : 'Create Offer'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-background-secondary border border-border-primary rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-primary">
          <h2 className="text-lg font-semibold text-foreground-primary">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-foreground-tertiary hover:text-foreground-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <OfferForm
            initialData={offer ?? undefined}
            defaultType={defaultType}
            onSubmit={onSubmit}
            onCancel={onClose}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  )
}
