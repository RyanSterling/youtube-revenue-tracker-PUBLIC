import { Hono } from 'hono'
import { google } from 'googleapis'
import { requireAuth } from '../middleware/auth.js'
import { createServiceClient, getUserId } from '../lib/supabase.js'

const app = new Hono()

// Lazy initialization to ensure env vars are loaded
let _oauth2Client: InstanceType<typeof google.auth.OAuth2> | null = null
function getOAuth2Client() {
  if (!_oauth2Client) {
    _oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )
  }
  return _oauth2Client
}

// Initiate YouTube OAuth - returns URL for frontend to redirect to
app.get('/connect', requireAuth, async (c) => {
  const clerkId = c.get('clerkId')

  const state = Buffer.from(JSON.stringify({ clerkId })).toString('base64')

  const url = getOAuth2Client().generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl', // Required for updating video descriptions
    ],
    state,
    prompt: 'consent', // Always show consent screen to get refresh token
  })

  return c.json({ url })
})

// Handle OAuth callback
app.get('/callback', async (c) => {
  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code || !state) {
    return c.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?error=missing_params`)
  }

  try {
    const { clerkId } = JSON.parse(Buffer.from(state, 'base64').toString())

    const { tokens } = await getOAuth2Client().getToken(code)
    getOAuth2Client().setCredentials(tokens)

    // Get channel info
    const youtube = google.youtube({ version: 'v3', auth: getOAuth2Client() })
    const channelResponse = await youtube.channels.list({
      part: ['snippet', 'contentDetails'],
      mine: true,
    })

    const channel = channelResponse.data.items?.[0]
    if (!channel) {
      return c.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?error=no_channel`)
    }

    const supabase = createServiceClient()
    const userId = await getUserId(supabase, clerkId)

    // Delete any existing channel for this user first
    await supabase.from('channels').delete().eq('user_id', userId)

    // Insert the new channel
    const { error: insertError } = await supabase.from('channels').insert({
      user_id: userId,
      youtube_channel_id: channel.id,
      title: channel.snippet?.title,
      thumbnail_url: channel.snippet?.thumbnails?.default?.url,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    })

    if (insertError) {
      console.error('Channel insert error:', insertError)
      return c.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?error=save_failed`)
    }

    return c.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?youtube=connected`)
  } catch (error) {
    console.error('YouTube OAuth error:', error)
    return c.redirect(`${process.env.FRONTEND_URL}/dashboard/settings?error=oauth_failed`)
  }
})

// Helper to refresh token if expired
async function refreshTokenIfNeeded(
  supabase: ReturnType<typeof createServiceClient>,
  channel: { id: string; access_token: string; refresh_token: string; token_expiry: string | null }
) {
  if (channel.token_expiry && new Date(channel.token_expiry) < new Date()) {
    if (!channel.refresh_token) {
      throw new Error('No refresh token available')
    }

    getOAuth2Client().setCredentials({ refresh_token: channel.refresh_token })
    const { credentials } = await getOAuth2Client().refreshAccessToken()

    // Update tokens in database
    await supabase
      .from('channels')
      .update({
        access_token: credentials.access_token,
        token_expiry: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : null,
      })
      .eq('id', channel.id)

    return credentials.access_token!
  }

  return channel.access_token
}

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')

  return hours * 3600 + minutes * 60 + seconds
}

// Sync videos from YouTube
app.post('/sync', requireAuth, async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  // Get user's channel
  const { data: channel } = await supabase
    .from('channels')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (!channel) {
    return c.json({ error: 'No YouTube channel connected' }, 400)
  }

  try {
    // Refresh token if needed
    const accessToken = await refreshTokenIfNeeded(supabase, channel)

    getOAuth2Client().setCredentials({
      access_token: accessToken,
      refresh_token: channel.refresh_token,
    })

    const youtube = google.youtube({ version: 'v3', auth: getOAuth2Client() })

    // Get uploads playlist ID
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      mine: true,
    })

    const uploadsPlaylistId =
      channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads

    if (!uploadsPlaylistId) {
      return c.json({ error: 'No uploads playlist found' }, 400)
    }

    // Fetch all videos from uploads playlist
    const videos: Array<{
      youtube_id: string
      title: string
      thumbnail_url: string | null
      published_at: string | null
      is_short: boolean
    }> = []

    let nextPageToken: string | undefined

    do {
      const playlistResponse = await youtube.playlistItems.list({
        part: ['contentDetails'],
        playlistId: uploadsPlaylistId,
        maxResults: 50,
        pageToken: nextPageToken,
      })

      const videoIds = (playlistResponse.data.items || [])
        .map((item) => item.contentDetails?.videoId)
        .filter((id): id is string => !!id)

      if (videoIds.length > 0) {
        // Fetch video details
        const videosResponse = await youtube.videos.list({
          part: ['snippet', 'statistics', 'contentDetails'],
          id: videoIds,
          maxResults: 50,
        })

        for (const video of videosResponse.data.items || []) {
          const duration = video.contentDetails?.duration || ''
          const totalSeconds = parseDuration(duration)

          videos.push({
            youtube_id: video.id!,
            title: video.snippet?.title || '',
            thumbnail_url:
              video.snippet?.thumbnails?.high?.url ||
              video.snippet?.thumbnails?.default?.url ||
              null,
            published_at: video.snippet?.publishedAt || null,
            is_short: totalSeconds <= 180,
          })
        }
      }

      nextPageToken = playlistResponse.data.nextPageToken || undefined
    } while (nextPageToken)

    // Delete existing videos for this user and insert fresh
    console.log('[YouTube Sync] Syncing', videos.length, 'videos for userId:', userId)

    // Delete existing videos
    await supabase.from('videos').delete().eq('user_id', userId)

    // Insert all videos
    const { error: insertError } = await supabase.from('videos').insert(
      videos.map(video => ({
        user_id: userId,
        ...video,
      }))
    )

    if (insertError) {
      console.error('[YouTube Sync] Insert error:', insertError)
    }
    console.log('[YouTube Sync] Done syncing videos')

    return c.json({
      synced: true,
      videoCount: videos.length,
    })
  } catch (error: unknown) {
    console.error('YouTube sync error:', error)
    const message = error instanceof Error ? error.message : 'Sync failed'
    return c.json({ error: message }, 500)
  }
})

// Get channel status
app.get('/status', requireAuth, async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  const { data: channel } = await supabase
    .from('channels')
    .select('youtube_channel_id, title, thumbnail_url')
    .eq('user_id', userId)
    .single()

  if (!channel) {
    return c.json({ connected: false })
  }

  // Count videos
  const { count } = await supabase
    .from('videos')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  return c.json({
    connected: true,
    channel: {
      id: channel.youtube_channel_id,
      title: channel.title,
      thumbnailUrl: channel.thumbnail_url,
      lastSyncedAt: null,
    },
    videoCount: count || 0,
  })
})

// Disconnect YouTube
app.post('/disconnect', requireAuth, async (c) => {
  const clerkId = c.get('clerkId')
  const supabase = createServiceClient()
  const userId = await getUserId(supabase, clerkId)

  await supabase.from('channels').delete().eq('user_id', userId)

  return c.json({ success: true })
})

export default app
