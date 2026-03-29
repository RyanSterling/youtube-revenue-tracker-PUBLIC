const BOT_PATTERNS = [
  // Search engines
  /googlebot/i,
  /bingbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /duckduckbot/i,
  /slurp/i,

  // Social media crawlers
  /facebookexternalhit/i,
  /facebot/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterestbot/i,
  /discordbot/i,
  /telegrambot/i,
  /whatsapp/i,
  /bytespider/i,

  // Generic bot patterns
  /bot\b/i,
  /crawl/i,
  /spider/i,
  /preview/i,
  /fetch/i,
  /scrape/i,

  // Headless browsers & tools
  /headlesschrome/i,
  /phantomjs/i,
  /puppeteer/i,
  /playwright/i,

  // HTTP libraries
  /python-urllib/i,
  /python-requests/i,
  /go-http-client/i,
  /java\//i,
  /okhttp/i,
  /axios/i,
  /node-fetch/i,
  /curl\//i,
  /wget\//i,

  // Monitoring & SEO tools
  /uptimerobot/i,
  /petalbot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
]

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true // No UA = likely a bot
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent))
}
