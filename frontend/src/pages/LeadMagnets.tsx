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

type SortBy = 'name' | 'created_at' | 'clicks' | 'conversions'

export default function LeadMagnets() {
  const { fetchApi } = useApi()
  const { user } = useUser()

  // Data state
  const [offers, setOffers] = useState<Offer[]>([])
  const [stats, setStats] = useState<Record<string, OfferStats>>({})
  const [loading, setLoading] = useState(true)

  // UI state
  const [sortBy, setSortBy] = useState<SortBy>('created_at')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedOfferId, setExpandedOfferId] = useState<string | null>(null)

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Load data - filter to only freebies
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [offersRes, statsRes] = await Promise.all([
          fetchApi<{ offers: Offer[] }>('/offers'),
          fetchApi<OfferStats[]>('/offers/stats?period=30d'),
        ])

        // Filter to only freebies
        const freebies = offersRes.offers.filter(o => o.offer_type === 'freebie')
        setOffers(freebies)

        const statsMap: Record<string, OfferStats> = {}
        statsRes.forEach(stat => {
          statsMap[stat.id] = stat
        })
        setStats(statsMap)
      } catch (error) {
        console.error('Failed to fetch lead magnets:', error)
      }
      setLoading(false)
    }
    loadData()
  }, [fetchApi])

  // Filter and sort offers
  const filteredOffers = useMemo(() => {
    let result = [...offers]

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
        default:
          return 0
      }
    })

    return result
  }, [offers, stats, sortBy, searchQuery])

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
        body: JSON.stringify({ ...data, offer_type: 'freebie', price: 0 }),
      })
      setOffers(prev => [result.offer, ...prev])
      setIsModalOpen(false)
    } catch (error) {
      console.error('Failed to create lead magnet:', error)
      alert('Failed to create lead magnet. Please try again.')
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
        body: JSON.stringify({ ...data, offer_type: 'freebie', price: 0 }),
      })
      setOffers(prev => prev.map(o => o.id === editingOffer.id ? result.offer : o))
      setIsModalOpen(false)
      setEditingOffer(null)
    } catch (error) {
      console.error('Failed to update lead magnet:', error)
      alert('Failed to update lead magnet. Please try again.')
    }
    setIsSubmitting(false)
  }

  async function handleDeleteOffer(id: string) {
    try {
      await fetchApi(`/offers/${id}`, { method: 'DELETE' })
      setOffers(prev => prev.filter(o => o.id !== id))
      if (expandedOfferId === id) setExpandedOfferId(null)
    } catch (error) {
      console.error('Failed to delete lead magnet:', error)
      alert('Failed to delete lead magnet. Please try again.')
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
          <div className="h-8 w-40 bg-background-secondary rounded animate-pulse" />
          <div className="h-9 w-36 bg-background-secondary rounded animate-pulse" />
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
        <h1 className="text-2xl font-bold text-foreground-primary">Lead Magnets</h1>
        <Button onClick={openCreateModal}>
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Lead Magnet
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="px-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
        >
          <option value="created_at">Newest First</option>
          <option value="name">Name</option>
          <option value="clicks">Most Clicks</option>
          <option value="conversions">Most Signups</option>
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
            placeholder="Search lead magnets..."
            className="w-full pl-10 pr-3 py-2 bg-background-secondary border border-border-primary rounded-lg text-foreground-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary"
          />
        </div>
      </div>

      {/* Lead Magnets list */}
      {filteredOffers.length === 0 ? (
        <div className="text-center py-12 bg-background-secondary rounded-lg border border-border-primary">
          <svg
            className="w-12 h-12 mx-auto text-foreground-tertiary mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-foreground-secondary">
            {offers.length === 0
              ? 'No lead magnets yet. Create your first one to start collecting signups!'
              : 'No lead magnets match your search.'}
          </p>
          {offers.length === 0 && (
            <Button className="mt-4" onClick={openCreateModal}>
              Create Your First Lead Magnet
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

      {/* Modal - defaults to freebie type */}
      <OfferModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingOffer(null)
        }}
        offer={editingOffer}
        defaultType="freebie"
        onSubmit={editingOffer ? handleUpdateOffer : handleCreateOffer}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
