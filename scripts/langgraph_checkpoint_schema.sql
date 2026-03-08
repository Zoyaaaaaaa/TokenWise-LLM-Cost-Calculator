-- ============================================================
--  LangGraph Checkpoint Tables for Supabase
--  Run this in your Supabase SQL editor (dashboard.supabase.com)
--  This creates the required tables for PostgreSQL persistence
-- ============================================================

-- 1. Checkpoints table (main storage for graph state)
CREATE TABLE IF NOT EXISTS public.checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    parent_id TEXT,
    checkpoint BYTEA NOT NULL,
    metadata BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id)
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_thread_id 
    ON public.checkpoints(thread_id, checkpoint_ns);

-- 2. Checkpoint writes (for multi-writer support)
CREATE TABLE IF NOT EXISTS public.checkpoint_writes (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checkpoint_id TEXT NOT NULL,
    task_id TEXT NOT NULL,
    idx INTEGER NOT NULL,
    channel TEXT NOT NULL,
    value BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (thread_id, checkpoint_ns, checkpoint_id, task_id, idx)
);

-- 3. Checkpoint blobs (for large checkpoints)
CREATE TABLE IF NOT EXISTS public.checkpoint_blobs (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT '',
    checksum TEXT NOT NULL,
    blob BYTEA,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (thread_id, checkpoint_ns, checksum)
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE public.checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_writes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkpoint_blobs ENABLE ROW LEVEL SECURITY;

-- For development: allow all authenticated users to access
-- For production: add more restrictive policies based on user_id
CREATE POLICY "Allow authenticated users to read checkpoints"
    ON public.checkpoints FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert checkpoints"
    ON public.checkpoints FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update checkpoints"
    ON public.checkpoints FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to delete checkpoints"
    ON public.checkpoints FOR DELETE
    TO authenticated
    USING (true);

-- Same for checkpoint_writes
CREATE POLICY "Allow authenticated users to manage checkpoint_writes"
    ON public.checkpoint_writes FOR ALL
    TO authenticated
    USING (true);

-- Same for checkpoint_blobs
CREATE POLICY "Allow authenticated users to manage checkpoint_blobs"
    ON public.checkpoint_blobs FOR ALL
    TO authenticated
    USING (true);

-- Grant permissions to service role (for backend)
GRANT ALL ON public.checkpoints TO service_role;
GRANT ALL ON public.checkpoint_writes TO service_role;
GRANT ALL ON public.checkpoint_blobs TO service_role;

-- Grant usage to postgres role
GRANT ALL ON public.checkpoints TO postgres;
GRANT ALL ON public.checkpoint_writes TO postgres;
GRANT ALL ON public.checkpoint_blobs TO postgres;
