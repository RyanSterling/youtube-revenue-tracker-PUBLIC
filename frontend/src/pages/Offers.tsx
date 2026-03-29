import { useState, useEffect, useMemo } from 'react'
import { Offer } from '@/types'
import { useApi } from '@/hooks/useApi'
import { useUser } from '@/hooks/useUser'
import { Button } from '@/components/ui/Button'
import { OfferCard } from '@/components/offers/OfferCard'
import { OfferModal } from '@/components/offers/OfferModal'

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

type FilterType = 'all' | 'paid' | 'freebie'
type SortBy = 'name' | 'created_at' | 'clicks' | 'conversions' | 'revenue'

export default function Offers() {
  const { fetchApi } = useApi()
  const { user } = useUser()

  // Data state
  const [offers, setOffers] = useState<Offer[]>([])
  const [stats, setStats] = useState<Record<string, OfferStats>>({})
  const [loading, setLoading] = useState(true)

  // UI state
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [sortBy, setSortBy] = useState<SortBy>('created_at')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [offersRes, statsRes] = await Promise.all([
          fetchApi<{ offers: Offer[] }>('/offers'),
          fetchApi<OfferStats[]>('/offers/stats?period=30d'),
        ])

        setOffers(offersRes.offers)

        const statsMap: Record<string, OfferStats> = {}
        statsRes.forEach(stat => {
          statsMap[stat.id] = stat
        })
        setStats(statsMap)
      } catch (error) {
        console.error('Failed to fetch offers:', error)
      }
      setLoading(false)
    }
    loadData()
  }, [fetchApi])

  // Filter and sort offers
  const filteredOffers = useMemo(() => {
    let result = [...offers]

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter(o => o.offer_type === filterType)
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(o =>
        o.name.toLowerCase().includes(query) ||
        o.slug.toLowerCase().includes(query)
      )
    }

    // Sort
    result.sort((a, b) => {
      const statsA = stats[a.id]
      const statsB = stats[b.id]

      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'created_at':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'clicks':
          return (statsB?.totalClicks ?? 0) - (statsA?.totalClicks ?? 0)
        case 'conversions':
          return (statsB?.totalConversions ?? 0) - (statsA?.totalConversions ?? 0)
        case 'revenue':
          return (statsB?.totalRevenue ?? 0) - (statsA?.totalRevenue ?? 0)
        default:
          return 0
      }
    })

    return result
  }, [offers, stats, filterType, sortBy, searchQuery])

  // CRUD operations
  async function handleCreateOffer(data: {
    name: string
    slug: string
    destination_url: string
    price: number
    offer_type: 'paid' | 'freebie'
  }) {
    setIsSubmitting(true)
    try {
      const result = await fetchApi<{ offer: Offer }>('/offers', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      setOffers(prev => [result.offer, ...prev])
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to create offer:', error)
      alert('Failed to create offer. Please try again.')
    }
    setIsSubmitting(false)
  }

  async function handleUpdateOffer(data: {
    name: string
    slug: string
    destination_url: string
    price: number
    offer_type: 'paid' | 'freebie'
  }) {
    if (!editingOffer) return
    setIsSubmitting(true)
    try {
      const result = await fetchApi<{ offer: Offer }>(`/offers/${editingOffer.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      setOffers(prev => prev.map(o => o.id === editingOffer.id ? result.offer : o))
      setIsModalOpen(false)
      setEditingOffer(null)
    } catch (error) {
      console.error('Failed to update offer:', error)
      alert('Failed to update offer. Please try again.')
    }
    setIsSubmitting(false)
  }

  async function handleDeleteOffer(id: string) {
    try {
      await fetchApi(`/offers/${id}`, { method: 'DELETE' })
      setOffers(prev => prev.filter(o => o.id !== id))
      if (expandedOfferId === id) setExpandedOfferId(null)
    } catch (error) {
      console.error('Failed to delete offer:', error)
      alert('Failed to delete offer. Please try again.')
    }
  }

  function openCreateModal() {
    setEditingOffer(null)
    setIsModalOpen(true)
  }

  function openEditModal(offer: Offer) {
    setEditingOffer(offer)
    setIsModalOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-background-secondary rounded animate-pulse" />
          <div className="h-9 w-28 bg-background-secondary rounded animate-pulse" />
        </div>
        <div className="h-12 bg-background-secondary rounded animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-36 bg-background-secondary rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground-primary">Offers</h1>
        <Button onClick={openCreateModal}>
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Offer
        </Button>
      </div>

      {/* Username Warning */}
      {user && !user.username && (
        <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm">
            <strong>Set up your username</strong> to generate tracking links.{' '}
            <a href="/dashboard/settings" className="underline hover:text-yellow-300">
              Go to Settings →
            </a>
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Type filter */}
        <div className="flex items-center gap-1 p-1 bg-background-secondary rounded-lg">
          {(['all', 'paid', 'freebie'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filterType === type
                  ? 'bg-background-tertiary text-foreground-primary'
                  : 'text-foreground-secondary hover:text-foreground-primary'
              }`}
            >
              {type === 'all' ? 'All' : type === 'paid' ? 'Paid' : 'Lead Magnets'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="px-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
        >
          <option value="created_at">Newest First</option>
          <option value="name">Name</option>
          <option value="clicks">Most Clicks</option>
          <option value="conversions">Most Conversions</option>
          <option value="revenue">Highest Revenue</option>
        </select>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-tertiary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search offers..."
            className="w-full pl-10 pr-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
        </div>
      </div>

      {/* Offers list */}
      {filteredOffers.length === 0 ? (
        <div className="text-center py-12 bg-background-secondary rounded-lg border border-border-primary">
          <svg
            className="w-12 h-12 mx-auto text-foreground-tertiary mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <p className="text-foreground-secondary">
            {offers.length === 0
              ? 'No offers yet. Create your first offer to start tracking!'
              : 'No offers match your filters.'}
          </p>
          {offers.length === 0 && (
            <Button className="mt-4" onClick={openCreateModal}>
              Create Your First Offer
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOffers.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              stats={stats[offer.id]}
              username={user?.username || ''}
              isExpanded={expandedOfferId === offer.id}
              onToggleExpand={() => setExpandedOfferId(
                expandedOfferId === offer.id ? null : offer.id
              )}
              onEdit={() => openEditModal(offer)}
              onDelete={() => handleDeleteOffer(offer.id)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      <OfferModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingOffer(null)
        }}
        offer={editingOffer}
        onSubmit={editingOffer ? handleUpdateOffer : handleCreateOffer}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
