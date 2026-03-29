-- Migration: Add Stripe product linking to offers for robust conversion attribution
-- This enables automatic attribution when customers purchase linked Stripe products

-- ============================================
-- 1. Add Stripe product/price columns to offers
-- ============================================

ALTER TABLE offers ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

-- Index for webhook lookups by product ID (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_offers_stripe_product ON offers(stripe_product_id) WHERE stripe_product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_offers_stripe_price ON offers(stripe_price_id) WHERE stripe_price_id IS NOT NULL;

-- Composite index for user + product lookups in webhook handler
CREATE INDEX IF NOT EXISTS idx_offers_user_stripe_product ON offers(user_id, stripe_product_id) WHERE stripe_product_id IS NOT NULL;

COMMENT ON COLUMN offers.stripe_product_id IS 'Linked Stripe product ID from connected account for automatic attribution';
COMMENT ON COLUMN offers.stripe_price_id IS 'Linked Stripe price ID from connected account (optional, for specific price tracking)';

-- ============================================
-- 2. Add attribution tracking to conversions
-- ============================================

ALTER TABLE conversions ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS attribution_method TEXT
  CHECK (attribution_method IN ('product', 'visitor_id', 'email', 'manual'))
  DEFAULT 'visitor_id';
ALTER TABLE conversions ADD COLUMN IF NOT EXISTS external_transaction_id TEXT;

-- Unique index on external_transaction_id to prevent duplicate conversions from custom checkouts
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversions_external_tx ON conversions(external_transaction_id)
  WHERE external_transaction_id IS NOT NULL;

-- Index for lookups by Stripe product
CREATE INDEX IF NOT EXISTS idx_conversions_stripe_product ON conversions(stripe_product_id) WHERE stripe_product_id IS NOT NULL;

COMMENT ON COLUMN conversions.stripe_product_id IS 'Stripe product ID from the checkout session for audit trail';
COMMENT ON COLUMN conversions.attribution_method IS 'How conversion was attributed: product (Stripe product match), visitor_id, email, or manual';
COMMENT ON COLUMN conversions.external_transaction_id IS 'External transaction ID from custom checkouts for deduplication';
