---
name: apex_provisioning_master
description: Manages the complex provisioning flow and tenant lifecycle for Apex v2.
---

# ⚡ Apex Provisioning Master

This skill is the guardian of the **"1-Minute Provisioning" Engine**. It ensures tenants are onboarded, isolated, and managed with surgical precision.

## 🚀 Provisioning Flow Management

The core sequence must complete in **< 60 seconds** (Rule 3.1):

1. **Schema Creation**: Create `tenant_{id}` schema in PostgreSQL.
2. **Search Path**: Configure `SET search_path` for the new tenant.
3. **Data Seeding**: Apply the "Onboarding Blueprint" from Super Admin to seed starter products/pages.
4. **Routing**: Trigger Traefik to create the subdomain route and ACME SSL.
5. **Branding**: Ensure `tenant-config` is ready for the Mobile SDUI and Storefront headers.

## 🛡️ Tenant Lifecycle & Governance

- **Kill Switch**: Logic to update `tenants.status` and ensure Middleware/Traefik blocks access (Rule 3.2).
- **Resource Quotas**: Monitor and enforce limits on products, storage, and users per plan.
- **Feature Gating**: Enable/Disable modules based on the tenant's current plan.
- **Backups**: Trigger `pg_dump` snapshots for specific tenant schemas.

## 📊 Monitoring & Alerts

- **Audit Logs**: Every provisioning step must be logged (S4).
- **Time Audit**: Monitor the time taken for each stage of provisioning.
- **Failures**: Redirect failed provisioning attempts to a "Manual Review" queue and alert developers.

## 🌐 Infrastructure & Deployment

- **GitHub Repository**: `https://github.com/adelfree2023-dev/55`
- **Production Server IP**: `34.102.116.215`
- **SSH Access**: `ssh -i ~/.ssh/id_ed25519_apex apex-v2-dev@34.102.116.215`
- **Execution Rule**: Windows is for **file management only**. The server is the **final interface**.

### 🗄️ Database & Services (Production Context)

| Service | Host | Port | Credentials |
| :--- | :--- | :--- | :--- |
| **PostgreSQL** | `localhost` | `5432` | User: `apex` \| Pass: `apex` \| DB: `apex` |
| **Redis** | `localhost` | `6379` | No Password (Internal Network) |
| **MinIO API** | `localhost` | `9000` | Access Key: `apex` \| Secret Key: `apex-secret` |
| **MinIO Console** | `localhost` | `9001` | (Admin Browser Access) |
| **Traefik Dashboard**| `localhost` | `8080` | (Insecure/Development mode) |

## 🛠️ Provisioning & Deployment Commands
- `deploy:sync`: Pushes local changes to GitHub and pulls on the server:
  `git push origin master && ssh [server] "cd ~/apex-v2 && git pull origin master"`
- `provision:tenant [subdomain]`: Executes `bun scripts/provision-tenant.ts` on the server.
- `infra:logs`: `ssh [server] "cd ~/apex-v2/infra && docker-compose logs -f"`
- `tenant:suspend [id]`: Activates the kill switch for a tenant.
- `tenant:restore [id] [snapshot]`: Restores a tenant schema from a MinIO backup.
- `tenant:quota-check [id]`: Audits current resource usage against limits.

## ⚖️ Rules of Management
- **Idempotency**: All management operations must be idempotent (Rule 3.2).
- **Isolation First**: No operation should ever affect more than one tenant unless it's a platform-wide maintenance.
- **Audit Everything**: No manual database edits. Use the Super Admin API or these audited scripts.
