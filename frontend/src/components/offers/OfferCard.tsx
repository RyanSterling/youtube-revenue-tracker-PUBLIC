import { useState } from 'react'
import { Offer } from '@/types'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { SourceManager } from '@/components/SourceManager'
import { formatCurrency, formatNumber } from '@/lib/utils'

interface OfferStats {
  id: string
  name: string
  slug: string
  offerType: string
  totalClicks: number
  totalConversions: number
  totalRevenue: number
  conversionRate: number
}

interface OfferCardProps {
  offer: Offer
  stats?: OfferStats
  username: string
  isExpanded: boolean
  onToggleExpand: () => void
  onEdit: () => void
  onDelete: () => void
}

export function OfferCard({
  offer,
  stats,
  username,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
}: OfferCardProps) {
  const [copied, setCopied] = useState(false)

  // Generate offer URL with username for multi-tenant support
  const offerUrl = `/u/${username}/go/${offer.slug}`

  function copyUrl() {
    const trackingUrl = `${window.location.origin}${offerUrl}`
    navigator.clipboard.writeText(trackingUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDelete() {
    if (confirm(`Delete "${offer.name}"? This cannot be undone.`)) {
      onDelete()
    }
  }

  const isFreebie = offer.offer_type === 'freebie'

  return (
    <Card className="overflow-hidden">
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          {/* Left: Expand toggle + Name */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <button
              onClick={onToggleExpand}
              className="mt-0.5 p-1 text-foreground-tertiary hover:text-foreground-primary transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground-primary truncate">
                  {offer.name}
                </h3>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    isFreebie
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-green-500/20 text-green-400'
                  }`}
                >
                  {isFreebie ? 'Lead Magnet' : 'Paid'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-foreground-tertiary font-mono truncate">
                  {offerUrl}
                </span>
                <button
                  onClick={copyUrl}
                  className="text-foreground-tertiary hover:text-foreground-primary transition-colors"
                  title="Copy tracking URL"
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </Button>
            <Button size="sm" variant="danger" onClick={handleDelete}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-4 ml-8">
          <div>
            <span className="text-xs text-foreground-tertiary block">Clicks</span>
            <span className="text-lg font-bold text-foreground-primary">
              {formatNumber(stats?.totalClicks ?? 0)}
            </span>
          </div>
          <div>
            <span className="text-xs text-foreground-tertiary block">
              {isFreebie ? 'Signups' : 'Sales'}
            </span>
            <span className="text-lg font-bold text-foreground-primary">
              {formatNumber(stats?.totalConversions ?? 0)}
            </span>
          </div>
          {!isFreebie && (
            <div>
              <span className="text-xs text-foreground-tertiary block">Revenue</span>
              <span className="text-lg font-bold text-green-400">
                {formatCurrency(stats?.totalRevenue ?? 0)}
              </span>
            </div>
          )}
          <div>
            <span className="text-xs text-foreground-tertiary block">Conv. Rate</span>
            <span className="text-lg font-bold text-foreground-primary">
              {(stats?.conversionRate ?? 0).toFixed(1)}%
            </span>
          </div>
          {!isFreebie && offer.price > 0 && (
            <div>
              <span className="text-xs text-foreground-tertiary block">Price</span>
              <span className="text-lg font-bold text-foreground-secondary">
                {formatCurrency(offer.price)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded: SourceManager for tracking links */}
      {isExpanded && (
        <div className="px-4 pb-4 ml-8">
          <SourceManager offerId={offer.id} username={username} />
        </div>
      )}
    </Card>
  )
}
