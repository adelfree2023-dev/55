CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Shared public schema for tenants list
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(255) UNIQUE NOT NULL CONSTRAINT valid_subdomain CHECK (subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'),
    owner_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    plan_id VARCHAR(50) DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for subdomain lookups in TenantMiddleware
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON public.tenants (subdomain);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants (status);

-- Onboarding blueprints for tenant seeding
CREATE TABLE IF NOT EXISTS public.onboarding_blueprints (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    config JSONB NOT NULL, -- Contains starter products, pages, settings
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed a default blueprint
INSERT INTO public.onboarding_blueprints (name, config, is_default)
VALUES ('standard', '{"products": [], "pages": [{"title": "Home", "content": "Welcome"}]}', true)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255),
    user_id VARCHAR(255),
    action VARCHAR(255),
    status VARCHAR(50),
    duration INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    payload TEXT,
    response TEXT,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ARCH-S7: DB-level encryption trigger REMOVED per security audit.
-- All PII encryption handled exclusively in @apex/encryption service.
