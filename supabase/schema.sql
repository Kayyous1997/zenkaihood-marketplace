-- =============================================================================
-- Zenkaihood Supabase Schema & Migrations
-- Run this script in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query)
-- =============================================================================

-- 1. Create Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Allow public read access to categories
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
CREATE POLICY "Allow public read access to categories" 
    ON public.categories FOR SELECT 
    USING (true);

-- Allow authenticated admins to insert/update categories
DROP POLICY IF EXISTS "Allow authenticated insert on categories" ON public.categories;
CREATE POLICY "Allow authenticated insert on categories" 
    ON public.categories FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update on categories" ON public.categories;
CREATE POLICY "Allow authenticated update on categories" 
    ON public.categories FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- 2. Seed Standard Categories
INSERT INTO public.categories (id, name, slug, description, icon) VALUES
    ('art', 'Art', 'art', 'Digital illustrations, generative & fine art', 'Palette'),
    ('pfps', 'PFPs', 'pfps', 'Profile picture collections & character avatars', 'Crown'),
    ('gaming', 'Gaming', 'gaming', 'In-game characters, weapons, items, and passes', 'Gamepad2'),
    ('photography', 'Photography', 'photography', 'Exclusive visual captures & fine art photography', 'Camera'),
    ('memberships', 'Memberships', 'memberships', 'Community passes & token-gated access', 'ShieldCheck'),
    ('music', 'Music', 'music', 'Audio releases, tracks & soundscapes', 'Music'),
    ('collectibles', 'Collectibles', 'collectibles', 'Curated digital collectibles & trading cards', 'Boxes'),
    ('virtual', 'Virtual Worlds', 'virtual', 'Metaverse parcels, environments & 3D assets', 'Globe2'),
    ('sports', 'Sports', 'sports', 'Digital sports memorabilia & fan passes', 'Trophy'),
    ('utility', 'Utility', 'utility', 'Domain names, tickets & functional tokens', 'Wrench')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon;

-- 3. Ensure Collections Table exists with categories column
CREATE TABLE IF NOT EXISTS public.collections (
    contract_address TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    name TEXT,
    description TEXT,
    logo_url TEXT,
    banner_url TEXT,
    website_url TEXT,
    twitter_handle TEXT,
    discord_url TEXT,
    telegram_url TEXT,
    categories TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- In case collections table already exists without the categories column:
ALTER TABLE public.collections ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- Enable RLS for collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- Allow public read access to collections metadata
DROP POLICY IF EXISTS "Allow public read access to collections" ON public.collections;
CREATE POLICY "Allow public read access to collections" 
    ON public.collections FOR SELECT 
    USING (true);

-- Allow authenticated users to insert/update collection metadata
DROP POLICY IF EXISTS "Allow authenticated insert on collections" ON public.collections;
CREATE POLICY "Allow authenticated insert on collections" 
    ON public.collections FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Allow authenticated update on collections" ON public.collections;
CREATE POLICY "Allow authenticated update on collections" 
    ON public.collections FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- 4. Create collection-images Storage Bucket (if not already created)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('collection-images', 'collection-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Public Access to collection-images" ON storage.objects;
CREATE POLICY "Public Access to collection-images" 
    ON storage.objects FOR SELECT 
    USING (bucket_id = 'collection-images');

DROP POLICY IF EXISTS "Authenticated Upload to collection-images" ON storage.objects;
CREATE POLICY "Authenticated Upload to collection-images" 
    ON storage.objects FOR INSERT 
    WITH CHECK (bucket_id = 'collection-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated Update to collection-images" ON storage.objects;
CREATE POLICY "Authenticated Update to collection-images" 
    ON storage.objects FOR UPDATE 
    USING (bucket_id = 'collection-images' AND auth.role() = 'authenticated');
