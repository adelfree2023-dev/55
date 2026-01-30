---
name: apex_lego_builder
description: Scaffolds modules and components following the Apex v2 "LEGO" philosophy.
---

# 🧱 Apex LEGO Builder

This skill accelerates development by generating boilerplate and components that "snap together" according to the project's modular architecture.

## 🏗️ Module Scaffolding

Generate a new domain module in `apps/admin` or `apps/storefront` with the following structure:
```bash
modules/[name]/
├── src/
│   ├── domain/        # Entities, Value Objects
│   ├── application/   # Use Cases (Command Handlers)
│   ├── infrastructure/ # Repositories, API Clients
│   ├── interfaces/    # Controllers, DTOs (Zod)
│   └── [name].module.ts
├── tests/             # Vitest unit/integration tests
└── events/            # Zod-defined events
```

## 🎨 UI Component Generation

Generate components using **Radix UI**, **TailwindCSS**, and **NativeWind** for cross-platform compatibility.

- **Tokens**: Use the shared design tokens from `packages/ui`.
- **Responsive**: Components must be mobile-first and responsive.
- **Server-Driven**: Support for dynamic branding (loading colors/logos from tenant config).

## 📝 Zod-First Workflow

1. **Define Schema**: Start with a Zod schema in `events/` or `interfaces/`.
2. **Generate DTOs**: Use `z.infer<typeof Schema>` to create types.
3. **Generate Mocks**: Use `zod-mock` or similar to generate test data.
4. **Generate Documentation**: Ensure Zod schemas are linked to Scalar API docs.

## 🛠️ Builder Commands
- `scaffold:module [name]`: Creates a full DDD-structured NestJS module.
- `scaffold:component [name]`: Creates a shared UI component for Web/Mobile.
- `scaffold:crud [entity]`: Generates a full CRUD flow (Zod -> Entity -> Service -> Controller).

## 📏 LEGO Rules
- **No Glue Code**: Modules must be self-contained.
- **Strict Typing**: No `any`. Everything must be typed via Zod or TypeScript.
- **Tests First**: Every generated module must include base Vitest suites.
