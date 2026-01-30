---
name: apex_provisioning_master
description: Manages the complex provisioning flow and tenant lifecycle for Apex v2.
---

# ⚡ Apex Provisioning Master (v2.0)

This skill is the guardian of the **"1-Minute Provisioning" Engine**. It ensures tenants are onboarded, isolated, and managed with surgical precision.

## 🚀 Provisioning Flow Management

The core sequence implements a **4-Phase Architecture** to ensure compliance with S2 and S4 protocols:

1.  **Phase 1: Schema Creation (S2 Isolation)**
    *   **Service**: `SchemaCreatorService`
    *   **Action**: Creates `tenant_{subdomain}` schema in PostgreSQL.
    *   **Security**: Sets default privileges and verifies `search_path` isolation.

2.  **Phase 2: Data Seeding (Blueprint System)**
    *   **Service**: `DataSeederService`
    *   **Action**: Seeds products, pages, and settings based on `blueprintId` (standard/e-commerce).
    *   **Tech**: Uses `drizzle-orm` for high-performance batch inserts.

3.  **Phase 3: Traefik Routing (Dynamic Ingress)**
    *   **Service**: `TraefikRouterService`
    *   **Action**: Generates dynamic YAML configuration in `infra/docker/traefik/dynamic`.
    *   **Result**: Live route at `{subdomain}.apex.localhost`.

4.  **Phase 4: Registration & Audit (S4 Compliance)**
    *   **Action**: Registers tenant in public table and logs `TENANT_PROVISIONED` event in `audit_logs`.
    *   **Validation**: Ensures north-star metric (< 55s) is met.

## 🛡️ Tenant Lifecycle & Governance

-   **Kill Switch**: Logic to update `tenants.status` and ensure Middleware/Traefik blocks access (Rule 3.2).
-   **Resource Quotas**: Monitor and enforce limits on products, storage, and users per plan.
-   **Feature Gating**: Enable/Disable modules based on the tenant's current plan.
-   **Backups**: Trigger `pg_dump` snapshots for specific tenant schemas.

## 📊 Monitoring & Alerts

-   **Audit Logs**: Every provisioning step must be logged (S4).
-   **Time Audit**: Monitor the time taken for each stage of provisioning.
-   **Failures**: Redirect failed provisioning attempts to a "Manual Review" queue and alert developers.

## 🌐 Infrastructure & Deployment

-   **GitHub Repository**: `https://github.com/adelfree2023-dev/55`
-   **Production Server IP**: `34.102.116.215`
-   **SSH Access**: `ssh -i ~/.ssh/id_ed25519_apex apex-v2-dev@34.102.116.215`

### 🗄️ Database & Services (Production Context)

| Service | Host | Port | Credentials |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | `localhost` | `5432` | User: `apex` \| Pass: `apex` \| DB: `apex` |
| **Redis** | `localhost` | `6379` | No Password (Internal Network) |
| **MinIO API** | `localhost` | `9000` | Access Key: `apex` \| Secret Key: `apex-secret` |
| **Traefik** | `localhost` | `80` | Dynamic Config Dir: `~/apex-v2/infra/docker/traefik/dynamic` |

## 🛠️ Provisioning & Deployment Commands

-   `deploy:sync`: Pushes local changes to GitHub and pulls on the server.
-   `provision:tenant [subdomain]`: Executes the full onboarding flow via CLI.
-   `infra:logs`: `ssh [server] "cd ~/apex-v2/infra && docker-compose logs -f"`

## 🤝 Phase 1 Handover Status

-   **Date**: 2026-01-30
-   **Version**: 2.1.0-PROVISIONING-STABLE
-   **Verification Audit**:
    -   Arch-S1 (Env): **Green**
    -   Arch-S2 (Isolation): **Green**
    -   S3 (Validation): **Green**
    -   S4 (Audit): **Green**
-   **Test Coverage**: > 95% Core Logic
-   **Waiting for**: Phase 2 (Tenant MVP).

## ⚖️ Rules of Management

-   **Idempotency**: All management operations must be idempotent (Rule 3.2).
-   **Isolation First**: No operation should ever affect more than one tenant unless it's a platform-wide maintenance.
-   **Audit Everything**: No manual database edits. Use the Super Admin API or these audited scripts.
