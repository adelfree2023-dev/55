-- Initial database setup
CREATE EXTENSION IF NOT EXISTS vector;

-- Shared public schema for tenants list
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(255) UNIQUE NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    plan_id VARCHAR(50) DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
VALUES ('Standard E-commerce', '{"products": [], "pages": [{"title": "Home", "content": "Welcome"}]}', true)
ON CONFLICT (name) DO NOTHING;

-- Audit logs table in public schema
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255),
    action VARCHAR(255),
    tenant_id VARCHAR(255),
    ip_address VARCHAR(45),
    payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
