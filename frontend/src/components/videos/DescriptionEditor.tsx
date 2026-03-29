import { useState } from 'react'
import { useApi } from '@/hooks/useApi'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface DescriptionEditorProps {
  videoId: string
  youtubeId: string
  initialDescription: string
  offers: Array<{
    id: string
    name: string
    slug: string
  }>
  onUpdate?: () => void
}

export function DescriptionEditor({
  videoId,
  youtubeId,
  initialDescription,
  offers,
  onUpdate,
}: DescriptionEditorProps) {
  const { fetchApi } = useApi()

  const [isEditing, setIsEditing] = useState(false)
  const [description, setDescription] = useState(initialDescription)
  const [originalDescription, setOriginalDescription] = useState(initialDescription)
  const [selectedOfferId, setSelectedOfferId] = useState(offers[0]?.id || '')
  const [linkText, setLinkText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleEdit = () => {
    setIsEditing(true)
    setOriginalDescription(description)
    setSuccess(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setDescription(originalDescription)
    setLinkText('')
    setError('')
  }

  const addLinkToTop = () => {
    if (!linkText.trim()) {
      setError('Enter text for the link')
      return
    }

    const selectedOffer = offers.find(o => o.id === selectedOfferId)
    if (!selectedOffer) return

    const link = `https://learn.maggiesterling.com/v/${youtubeId}/${selectedOffer.slug}`
    const newText = `${linkText} ${link}\n\n${description}`
    setDescription(newText)
    setLinkText('')
    setError('')
  }

  const addLinkToBottom = () => {
    if (!linkText.trim()) {
      setError('Enter text for the link')
      return
    }

    const selectedOffer = offers.find(o => o.id === selectedOfferId)
    if (!selectedOffer) return

    const link = `https://learn.maggiesterling.com/v/${youtubeId}/${selectedOffer.slug}`
    const newText = `${description}\n\n${linkText} ${link}`
    setDescription(newText)
    setLinkText('')
    setError('')
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetchApi<{ success?: boolean; error?: string }>(
        `/videos/${videoId}/description`,
        {
          method: 'POST',
          body: JSON.stringify({
            description,
            originalDescription,
          }),
        }
      )

      if (response.success) {
        setSuccess(true)
        setIsEditing(false)
        setOriginalDescription(description)
        onUpdate?.()
      } else {
        setError(response.error || 'Update failed')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground-primary">Video Description</h2>
          {!isEditing ? (
            <Button size="sm" variant="secondary" onClick={handleEdit}>
              Edit Description
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save to YouTube'}
              </Button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-500/20 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-500/20 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg">
            Description updated successfully on YouTube!
          </div>
        )}

        {isEditing && offers.length > 0 && (
          <div className="mb-4 space-y-3">
            <div className="p-4 bg-accent-primary/10 border border-accent-primary/30 rounded-lg">
              <h4 className="font-medium text-foreground-primary mb-3">Add Tracked Link</h4>
              <div className="space-y-3">
                <select
                  value={selectedOfferId}
                  onChange={(e) => setSelectedOfferId(e.target.value)}
                  className="w-full px-3 py-2 border border-border-primary bg-background-secondary text-foreground-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary transition-all"
                >
                  {offers.map(offer => (
                    <option key={offer.id} value={offer.id}>
                      {offer.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  className="w-full px-3 py-2 border border-border-primary bg-background-secondary text-foreground-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary transition-all"
                  placeholder="Get the course:"
                />

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={addLinkToTop} className="flex-1">
                    ↑ Add to Top
                  </Button>
                  <Button size="sm" variant="secondary" onClick={addLinkToBottom} className="flex-1">
                    ↓ Add to Bottom
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          readOnly={!isEditing}
          className={`w-full h-96 px-4 py-3 border border-border-primary bg-background-tertiary text-foreground-primary rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent-primary transition-all whitespace-pre-wrap ${
            !isEditing ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        />

        {isEditing && (
          <p className="mt-2 text-sm text-yellow-400">
            Changes will be published to YouTube when you click "Save to YouTube"
          </p>
        )}
      </div>
    </Card>
  )
}
