-- ==============================================================================
-- Schema SQL for Dynamic NFC Tag Manager (Supabase / PostgreSQL)
-- ==============================================================================

-- 1. NFC Cards Table
CREATE TABLE IF NOT EXISTS public.nfc_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    action_type VARCHAR(20) DEFAULT 'direct' CHECK (action_type IN ('direct', 'profile')),
    destination_url TEXT,
    is_active BOOLEAN DEFAULT true,
    scan_count INTEGER DEFAULT 0,
    last_scanned_at TIMESTAMPTZ,
    profile JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for ultra-fast slug lookups during NFC taps
CREATE INDEX IF NOT EXISTS idx_nfc_cards_slug ON public.nfc_cards (slug);

-- 2. Scans History / Analytics Table
CREATE TABLE IF NOT EXISTS public.nfc_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID REFERENCES public.nfc_cards(id) ON DELETE CASCADE,
    slug VARCHAR(100) NOT NULL,
    device_type VARCHAR(50),
    browser VARCHAR(50),
    referrer TEXT,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for scan lookups by card
CREATE INDEX IF NOT EXISTS idx_nfc_scans_card_id ON public.nfc_scans (card_id);
CREATE INDEX IF NOT EXISTS idx_nfc_scans_created_at ON public.nfc_scans (created_at DESC);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.nfc_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfc_scans ENABLE ROW LEVEL SECURITY;

-- Allow public read of active cards by slug for redirect engine
CREATE POLICY "Public can view active cards for redirect" 
ON public.nfc_cards FOR SELECT 
USING (is_active = true);

-- Allow system to insert scan analytics
CREATE POLICY "Public can insert scan events" 
ON public.nfc_scans FOR INSERT 
WITH CHECK (true);

-- Allow authenticated admins full access
CREATE POLICY "Admins have full access on cards" 
ON public.nfc_cards FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Admins have full access on scans" 
ON public.nfc_scans FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
