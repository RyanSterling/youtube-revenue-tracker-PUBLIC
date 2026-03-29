// Database types
export interface Channel {
  id: string;
  youtube_channel_id: string;
  channel_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: string;
  channel_id: string;
  youtube_id: string;
  title: string;
  thumbnail_url: string | null;
  view_count: number;
  description: string | null;
  published_at: string | null;
  views_updated_at: string | null;
  created_at: string;
  sync_status?: 'success' | 'failed' | 'stale';
  sync_error?: string | null;
}

export interface Offer {
  id: string;
  slug: string;
  name: string;
  destination_url: string;
  original_url: string | null;
  price: number;
  offer_type: 'paid' | 'freebie';
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  created_at: string;
}

// Stripe Connect types
export interface StripePrice {
  id: string;
  amount: number | null;
  currency: string;
}

export interface StripeProduct {
  id: string;
  name: string;
  description: string | null;
  prices: StripePrice[];
}

export interface Source {
  id: string;
  offer_id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Click {
  id: string;
  video_id: string | null;
  offer_id: string;
  visitor_id: string;
  email: string | null;
  clicked_at: string;
  ip_address: string | null;
  user_agent: string | null;
  source: 'youtube' | 'tiktok' | 'instagram' | 'email' | 'direct' | 'other';
  source_id: string | null;
}

export interface Conversion {
  id: string;
  click_id: string | null;
  offer_id: string;
  visitor_id: string | null;
  email: string | null;
  revenue: number;
  stripe_payment_id: string | null;
  converted_at: string;
  freebie_conversion_id: string | null;
}

export interface FreebieConversion {
  id: string;
  offer_id: string;
  click_id: string | null;
  visitor_id: string | null;
  email: string;
  source: string | null;
  campaign: string | null;
  metadata: Record<string, unknown> | null;
  converted_at: string;
}

export interface VideoOfferLink {
  id: string;
  video_id: string;
  offer_id: string;
  status: 'tracked' | 'untracked' | 'none';
  detected_url: string | null;
  updated_at: string;
}

// API Response types
export interface VideoWithStats extends Video {
  clicks: number;
  sales: number;
  revenue: number;
  click_rate: number;
  conversion_rate: number;
  revenue_per_view: number;
}

export interface OfferWithStats extends Offer {
  videos_linked: number;
  total_videos: number;
  total_clicks: number;
  total_conversions: number;
  total_revenue: number;
  conversion_rate: number;
}

// Link detection
export interface LinkStatus {
  status: 'tracked' | 'untracked' | 'none';
  detectedUrl?: string;
}

// Dashboard analytics types
export type TimePeriod = '7d' | '30d' | '90d' | 'all';

export interface DashboardKPIs {
  totalRevenue: number;
  totalConversions: number;
  avgOrderValue: number;
  conversionRate: number;
  totalClicks: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  conversions: number;
}

export interface SourceRevenueData {
  source: string;
  revenue: number;
  conversions: number;
  clicks: number;
}

export interface TopVideoData {
  id: string;
  title: string;
  thumbnail_url: string | null;
  youtube_id: string;
  revenue: number;
  conversions: number;
  clicks: number;
  conversionRate: number;
}

export interface RecentConversionData {
  id: string;
  revenue: number;
  converted_at: string;
  email: string | null;
  source: string;
  offer_name: string | null;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  revenueOverTime: RevenueDataPoint[];
  revenueBySource: SourceRevenueData[];
  topVideos: TopVideoData[];
  recentConversions: RecentConversionData[];
}

// Freebie tracking types
export interface FreebieKPIs {
  totalSignups: number;
  totalClicks: number;
  conversionRate: number;
  signupsToday: number;
}

export interface FreebieSignupData {
  date: string;
  signups: number;
}

export interface FreebieSourceData {
  source: string;
  signups: number;
  clicks: number;
  conversionRate: number;
}

export interface FreebieOfferData {
  id: string;
  name: string;
  slug: string;
  signups: number;
  clicks: number;
  conversionRate: number;
}

export interface FreebieWithStats extends Offer {
  signups: number;
  clicks: number;
  conversionRate: number;
}

// Journey analytics types
export interface JourneyKPIs {
  freebieToSaleRate: number;
  avgTimeToConversion: number;  // in days
  medianTimeToConversion: number;  // in days
  totalJourneyRevenue: number;
}

export interface TimeDistributionBucket {
  label: string;
  count: number;
  percentage: number;
}

export interface FreebiePerformanceData {
  freebieId: string;
  freebieName: string;
  signups: number;
  purchases: number;
  conversionRate: number;
  revenue: number;
  avgDaysToConvert: number;
}

export interface JourneyData {
  id: string;
  email: string;
  freebieConvertedAt: string;
  freebieName: string;
  freebieSource: string | null;
  purchaseConvertedAt: string;
  purchaseRevenue: number;
  purchaseOfferName: string;
  daysToConvert: number;
}
