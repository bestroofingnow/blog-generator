-- Migration: Add Credit-Based Pricing, Teams, and Subscription System
-- Run this in your Neon Database SQL Editor
-- Date: January 2026

-- ============================================================
-- STEP 1: Add new columns to users table
-- ============================================================

ALTER TABLE users
ADD COLUMN IF NOT EXISTS organization_id UUID,
ADD COLUMN IF NOT EXISTS member_role TEXT, -- owner | editor | viewer
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- active | pending | inactive

-- ============================================================
-- STEP 2: Create organizations table
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Subscription info
    subscription_tier TEXT DEFAULT 'starter', -- free | starter | pro | agency
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'trialing', -- active | trialing | past_due | canceled | unpaid

    -- Credit tracking
    monthly_credits INTEGER DEFAULT 200,
    credits_used INTEGER DEFAULT 0,
    rollover_credits INTEGER DEFAULT 0,
    overage_credits INTEGER DEFAULT 0,
    billing_cycle_start TIMESTAMP DEFAULT NOW(),

    -- Team limits
    max_team_members INTEGER DEFAULT 3, -- -1 for unlimited (agency)

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_organizations_owner ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer ON organizations(stripe_customer_id);

-- ============================================================
-- STEP 3: Create credit_transactions table
-- ============================================================

CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    amount INTEGER NOT NULL, -- Positive = added, negative = used
    type TEXT NOT NULL, -- generation | purchase | refund | expiration | monthly_allocation | rollover | admin_adjustment
    description TEXT,

    -- Balance tracking
    balance_before INTEGER,
    balance_after INTEGER,

    -- For overage credits
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_org ON credit_transactions(organization_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created ON credit_transactions(created_at);

-- ============================================================
-- STEP 4: Create overage_purchases table
-- ============================================================

CREATE TABLE IF NOT EXISTS overage_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Purchase details
    credits_purchased INTEGER NOT NULL,
    credits_remaining INTEGER NOT NULL,
    price_paid INTEGER NOT NULL, -- In cents
    stripe_payment_intent_id TEXT,

    -- Expiration
    expires_at TIMESTAMP NOT NULL,
    status TEXT DEFAULT 'active', -- active | expired | depleted

    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_overage_purchases_org ON overage_purchases(organization_id);
CREATE INDEX IF NOT EXISTS idx_overage_purchases_status ON overage_purchases(status);

-- ============================================================
-- STEP 5: Create team_invitations table
-- ============================================================

CREATE TABLE IF NOT EXISTS team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    email TEXT NOT NULL,
    role TEXT NOT NULL, -- editor | viewer
    token TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'pending', -- pending | accepted | expired | revoked

    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_invitations_org ON team_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_token ON team_invitations(token);
CREATE INDEX IF NOT EXISTS idx_team_invitations_email ON team_invitations(email);

-- ============================================================
-- STEP 6: Create audit_logs table
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Who performed the action
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email TEXT,
    actor_role TEXT,

    -- What was affected
    target_type TEXT NOT NULL, -- user | organization | subscription | credits
    target_id UUID,
    target_email TEXT,

    -- Action details
    action TEXT NOT NULL, -- create | update | delete | login | password_reset | credit_adjustment | tier_change | invitation_sent
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ============================================================
-- STEP 7: Add foreign key constraint for users.organization_id
-- ============================================================

-- Add foreign key (do this after organizations table exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'users_organization_id_fkey'
    ) THEN
        ALTER TABLE users
        ADD CONSTRAINT users_organization_id_fkey
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================
-- VERIFICATION: Check all tables exist
-- ============================================================

-- Run this to verify:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('organizations', 'credit_transactions', 'overage_purchases', 'team_invitations', 'audit_logs');

-- ============================================================
-- NOTES
-- ============================================================
--
-- After running this migration:
--
-- 1. Set up Stripe products and prices in your Stripe Dashboard:
--    - Create "Starter" product: $39/month (price_xxxxx)
--    - Create "Pro" product: $99/month (price_xxxxx)
--    - Create "Agency" product: $299/month (price_xxxxx)
--    - Create "Overage Small" product: $10 one-time (price_xxxxx)
--    - Create "Overage Large" product: $20 one-time (price_xxxxx)
--
-- 2. Add these environment variables to Vercel:
--    - STRIPE_SECRET_KEY=sk_live_xxxxx
--    - STRIPE_WEBHOOK_SECRET=whsec_xxxxx
--    - STRIPE_STARTER_PRICE_ID=price_xxxxx
--    - STRIPE_PRO_PRICE_ID=price_xxxxx
--    - STRIPE_AGENCY_PRICE_ID=price_xxxxx
--    - STRIPE_OVERAGE_SMALL_PRICE_ID=price_xxxxx
--    - STRIPE_OVERAGE_LARGE_PRICE_ID=price_xxxxx
--
-- 3. Set up Stripe webhook endpoint:
--    URL: https://your-domain.com/api/billing/webhook
--    Events to listen for:
--    - checkout.session.completed
--    - customer.subscription.created
--    - customer.subscription.updated
--    - customer.subscription.deleted
--    - invoice.payment_succeeded
--    - invoice.payment_failed
--    - payment_intent.succeeded
--
