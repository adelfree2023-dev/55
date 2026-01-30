---
name: apex_protocol_enforcer
description: Ensures code compliance with Apex v2 S1-S8 security protocols and Engineering Constitution.
---

# 🛡️ Apex Protocol Enforcer

This skill is responsible for auditing and enforcing the **S1-S8 Security Protocols** and the **Engineering Constitution** of Apex v2.

## 🏁 Handover Verification (Phase 1)
When delivering Phase 1 to a Tech Lead, ensure:
1. `bun run scripts/test-s1.ts` returns success.
2. The provisioning script execution time is logged and is `< 55s`.
3. The server `docker ps` reflects all 4 core containers.

## 📋 Security Protocols (S1-S8)

### 🏗️ S0: The Zero-Tolerance Testing Rule (Mandatory)
> [!IMPORTANT]
> **Strict Constitutional Rule**: It is strictly forbidden to create any new implementation file (.ts, .js, .tsx) without an accompanying `.spec.ts` (unit/security test) file. 
> - Every new logic file MUST have a test coverage of **at least 90%**.
> - Failure to provide a test file or meet the 90% coverage threshold is a **Protocol Violation**.

### S1: Environment Verification
- **Requirement**: Use Zod with `@nestjs/config`.
- **Enforcement**: Check `packages/config` or main app entry points for Zod validation logic. The app must crash if env vars are missing.

### S2: Tenant Isolation
- **Requirement**: Schema-based isolation using Drizzle.
- **Enforcement**: 
    - Verify middleware extracts `X-Tenant-ID`.
    - Ensure `SET search_path = tenant_{id}` is called before queries.
    - Check for `TenantScopedGuard` on controllers.

### S3: Input Validation
- **Requirement**: Global `ZodValidationPipe` + Zod schemas for all DTOs.
- **Enforcement**: Verify that every controller method uses a Zod-backed DTO. Manual DTOs are forbidden.

### S4: Audit Logging
- **Requirement**: NestJS Interceptor + `AsyncLocalStorage`.
- **Enforcement**: Ensure all write operations (POST/PUT/DELETE) are intercepted and logged to the `audit_logs` table.

### S5: Exception Handling
- **Requirement**: Global Exception Filter + GlitchTip reporting.
- **Enforcement**: Standardized error responses (no stack traces). 500 errors must be sent to GlitchTip.

### S6: Rate Limiting
- **Requirement**: Redis + `@nestjs/throttler`.
- **Enforcement**: Check for throttler guards and Redis connection. Dynamic limits per tenant tier must be applied.

### S7: Encryption
- **Requirement**: AES-256-GCM for PII/API keys. TLS forced.
- **Enforcement**: Verify sensitive data is encrypted at rest in the database.

### S8: Web Security
- **Requirement**: Helmet + Strict CSP + CORS.
- **Enforcement**: Verify Helmet configuration and dynamic CORS per tenant domain.

## 📜 Engineering Constitution Audit

- **Monorepo Strategy**: `apps/*` must never import from another `apps/*`. Cross-app communication via `packages/events`.
- **Lego Philosophy**: Strict folder structure for NestJS modules: `domain/`, `application/`, `infrastructure/`, `interfaces/`.
- **Naming Conventions**: `kebab-case.ts` for files, `PascalCase` for classes, `snake_case` for DB tables.
- **Zod as Truth**: All types/interfaces must derive from Zod schemas using `z.infer`.

## 🛠️ Audit Commands
- `audit:security`: Runs a scan across the codebase to check for S1-S8 compliance.
- `audit:constitution`: Checks folder structures and imports.

## 🛑 Deployment & Environment Guardrails

- **Windows Environment**: Strictly for development, editing, and file preparation. **NO** execution of production-critical processes or downloads unless essential for file prep.
- **Server Environment**: The **only** source of truth for runtime, testing, and final verification.
- **Git Protocol**: Direct pushes to server are discouraged; workflow must be `Local -> GitHub -> Server`.
- Using `// biome-ignore` without justification.
- Manual DTOs or TypeScript interfaces for API contracts (must use Zod).
- Direct cross-module database access.
- Hardcoded secrets or missing S1 validation.
