import { useState, useEffect } from 'react'
import { useUser as useClerkUser } from '@clerk/clerk-react'
import { useSearchParams } from 'react-router-dom'
import { useApi } from '@/hooks/useApi'
import { useUser } from '@/hooks/useUser'

interface YouTubeStatus {
  connected: boolean
  channel?: {
    id: string
    title: string
    thumbnailUrl: string
    lastSyncedAt: string | null
  }
  videoCount?: number
}

export default function Settings() {
  const { user: clerkUser } = useClerkUser()
  const { user, setUsername, refetch: refetchUser } = useUser()
  const { fetchApi } = useApi()
  const [searchParams, setSearchParams] = useSearchParams()
  const [youtubeStatus, setYoutubeStatus] = useState<YouTubeStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Username state
  const [usernameInput, setUsernameInput] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  // Initialize username input from user data
  useEffect(() => {
    if (user?.username) {
      setUsernameInput(user.username)
    }
  }, [user?.username])

  useEffect(() => {
    // Handle query params from OAuth redirect
    const youtubeParam = searchParams.get('youtube')
    const errorParam = searchParams.get('error')

    if (youtubeParam === 'connected') {
      setMessage({ type: 'success', text: 'YouTube channel connected successfully!' })
      // Clear the query param
      searchParams.delete('youtube')
      setSearchParams(searchParams, { replace: true })
    } else if (errorParam) {
      const errorMessages: Record<string, string> = {
        missing_params: 'OAuth callback missing required parameters',
        no_channel: 'No YouTube channel found for this account',
        oauth_failed: 'YouTube authentication failed. Please try again.',
        save_failed: 'Failed to save channel data. Please try again.',
      }
      setMessage({ type: 'error', text: errorMessages[errorParam] || 'An error occurred' })
      searchParams.delete('error')
      setSearchParams(searchParams, { replace: true })
    }

    fetchYouTubeStatus()
  }, [searchParams, setSearchParams])

  const fetchYouTubeStatus = async () => {
    try {
      const status = await fetchApi('/youtube/status') as YouTubeStatus
      setYoutubeStatus(status)
    } catch (error) {
      console.error('Failed to fetch YouTube status:', error)
    }
  }

  const handleConnectYouTube = async () => {
    try {
      const response = await fetchApi('/youtube/connect') as { url: string }
      window.location.href = response.url
    } catch (error) {
      console.error('Failed to get YouTube connect URL:', error)
    }
  }

  const handleSyncVideos = async () => {
    setSyncing(true)
    try {
      await fetchApi('/youtube/sync', { method: 'POST' })
      await fetchYouTubeStatus()
    } catch (error) {
      console.error('Failed to sync videos:', error)
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnectYouTube = async () => {
    if (!confirm('Are you sure you want to disconnect your YouTube channel?')) return
    try {
      await fetchApi('/youtube/disconnect', { method: 'POST' })
      setYoutubeStatus({ connected: false })
    } catch (error) {
      console.error('Failed to disconnect YouTube:', error)
    }
  }

  const handleConnectStripe = async () => {
    try {
      const response = await fetchApi('/stripe/connect', { method: 'POST' }) as { url: string }
      window.location.href = response.url
    } catch (error) {
      console.error('Failed to initiate Stripe Connect:', error)
    }
  }

  const handleManageBilling = async () => {
    try {
      const response = await fetchApi('/billing/portal', { method: 'POST' }) as { url: string }
      window.location.href = response.url
    } catch (error) {
      console.error('Failed to open billing portal:', error)
    }
  }

  const handleSaveUsername = async () => {
    if (!usernameInput.trim()) return

    setSavingUsername(true)
    setUsernameError(null)

    const result = await setUsername(usernameInput.trim())

    if (result.success) {
      setMessage({ type: 'success', text: 'Username saved successfully!' })
      await refetchUser()
    } else {
      setUsernameError(result.error || 'Failed to save username')
    }

    setSavingUsername(false)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground-primary mb-6">Settings</h1>

      {/* Status message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/20 border border-green-500/50 text-green-400'
              : 'bg-red-500/20 border border-red-500/50 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Account */}
      <section className="bg-background-secondary rounded-card border border-border-primary p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground-primary mb-4">Account</h2>
        <div className="space-y-2">
          <p className="text-foreground-secondary">
            <span className="text-foreground-primary font-medium">Email:</span> {clerkUser?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </section>

      {/* Username / Tracking Links */}
      <section className="bg-background-secondary rounded-card border border-border-primary p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground-primary mb-4">Tracking Links</h2>
        <p className="text-foreground-secondary mb-4">
          Your username is used in tracking URLs. Choose something short and memorable.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground-secondary mb-2">
            Username
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => {
                setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                setUsernameError(null)
              }}
              placeholder="your-username"
              className="flex-1 max-w-xs px-3 py-2 bg-background-tertiary border border-border-primary rounded-soft text-foreground-primary focus:outline-none focus:ring-2 focus:ring-accent-primary"
            />
            <button
              onClick={handleSaveUsername}
              disabled={savingUsername || usernameInput === user?.username || !usernameInput.trim()}
              className="bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-soft"
            >
              {savingUsername ? 'Saving...' : 'Save'}
            </button>
          </div>
          {usernameError && (
            <p className="text-red-400 text-sm mt-2">{usernameError}</p>
          )}
        </div>

        {user?.username && (
          <div className="p-3 bg-background-tertiary rounded-soft">
            <p className="text-sm text-foreground-tertiary mb-1">Your tracking URLs will look like:</p>
            <code className="text-sm text-accent-primary font-mono">
              {window.location.origin}/u/{user.username}/l/your-link
            </code>
          </div>
        )}
      </section>

      {/* YouTube */}
      <section className="bg-background-secondary rounded-card border border-border-primary p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground-primary mb-4">YouTube Channel</h2>
        {youtubeStatus?.connected ? (
          <div>
            <div className="flex items-center gap-3 mb-4">
              {youtubeStatus.channel?.thumbnailUrl && (
                <img
                  src={youtubeStatus.channel.thumbnailUrl}
                  alt={youtubeStatus.channel.title}
                  className="w-12 h-12 rounded-full"
                />
              )}
              <div>
                <p className="text-foreground-primary font-medium">{youtubeStatus.channel?.title}</p>
                <p className="text-foreground-secondary text-sm">
                  {youtubeStatus.videoCount} videos synced
                  {youtubeStatus.channel?.lastSyncedAt && (
                    <> · Last synced {new Date(youtubeStatus.channel.lastSyncedAt).toLocaleDateString()}</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSyncVideos}
                disabled={syncing}
                className="bg-accent-primary hover:bg-accent-hover disabled:opacity-50 text-white px-4 py-2 rounded-soft"
              >
                {syncing ? 'Syncing...' : 'Sync Videos'}
              </button>
              <button
                onClick={handleDisconnectYouTube}
                className="bg-background-tertiary hover:bg-border-primary text-foreground-primary px-4 py-2 rounded-soft"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-foreground-secondary mb-4">
              Connect your YouTube channel to sync your videos and generate tracking links.
            </p>
            <button
              onClick={handleConnectYouTube}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-soft flex items-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              Connect YouTube
            </button>
          </div>
        )}
      </section>

      {/* Stripe Connect */}
      <section className="bg-background-secondary rounded-card border border-border-primary p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground-primary mb-4">Stripe Connect</h2>
        <p className="text-foreground-secondary mb-4">
          Connect your Stripe account to track revenue from your products.
        </p>
        <button
          onClick={handleConnectStripe}
          className="bg-accent-primary hover:bg-accent-hover text-white px-4 py-2 rounded-soft"
        >
          Connect Stripe
        </button>
      </section>

      {/* Billing */}
      <section className="bg-background-secondary rounded-card border border-border-primary p-6">
        <h2 className="text-lg font-semibold text-foreground-primary mb-4">Billing</h2>
        <p className="text-foreground-secondary mb-4">
          Manage your subscription and billing details.
        </p>
        <button
          onClick={handleManageBilling}
          className="bg-background-tertiary hover:bg-border-primary text-foreground-primary px-4 py-2 rounded-soft"
        >
          Manage Billing
        </button>
      </section>
    </div>
  )
}
