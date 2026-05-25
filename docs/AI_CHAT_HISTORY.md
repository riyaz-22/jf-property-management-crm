# AI Chat History and Co-Pilot Documentation

This document records how AI-assisted work shaped the project and how AI-related UI exists in the current implementation.

## Implementation History

The project was expanded inside the existing repository rather than rebuilt. Work focused on:

- NestJS modules for auth, users, dashboard, properties, tenants, leases, payments, maintenance, notifications.
- PostgreSQL persistence through Prisma.
- JWT auth, refresh-token rotation, RBAC guards, admin-only user management.
- React/Vite frontend with protected routes, app shell, dashboard, contact intelligence pages, and reusable CRUD entity pages.
- Removal of public registration and hardening of system seed/startup validation.
- Role cleanup so `MANAGER` is the current manager-level CRM role.
- User Management query fixes so role filtering/sorting sends valid user parameters only.

## Current AI Co-Pilot Features

The implemented AI feature is a frontend AI Co-Pilot presentation layer in `frontend/src/modules/contacts/ContactPages.tsx`.

Visible AI-related UI:
- `AI Co-Pilot Insights` panel on contact detail and sell-intent workspace.
- `Curator AI insights` section in the contact drawer.
- Insight cards such as probability, recommended action, valuation urgency, and conversation guidance.
- Floating `AI assistant` action button in the app shell.

## AI Insight Rendering Flow

Current flow:

1. Contact pages load local contact records from `frontend/src/constants/demoData.ts`.
2. `ContactDirectoryPage` displays selectable contacts.
3. `ContactDrawer`, `ContactDetailPage`, and `SellIntentWorkspacePage` render insight panels.
4. Insight content is static/rule-style UI text embedded in React components.
5. No backend AI endpoint is called at runtime.

This means AI recommendations currently appear as deterministic UI content rather than live LLM-generated output.

## AI Recommendations

Recommendations appear as:
- Compact insight cards in dark panels.
- Suggested next actions in the sell-intent workspace.
- Contextual labels around urgency, probability, and communication strategy.

Examples of represented recommendation types:
- Follow-up timing.
- Valuation priority.
- Seller intent signal.
- Suggested CRM action.

## Data Source

AI/contact intelligence data is currently mocked/local:

- Contacts come from `demoData.ts`.
- Insight card text is component-defined.
- No AI recommendations are stored in PostgreSQL.
- No prompt, model output, vector store, or external LLM provider is currently wired.

Operational CRM modules such as properties, users, leases, payments, and maintenance are database-driven. Contact intelligence/AI panels are frontend demo modules.

## History Persistence Strategy

Current implementation:
- AI chat history is not persisted.
- No `AiMessage`, `AiConversation`, or `AiInsight` database model exists.
- No backend AI conversation API exists.

Recommended future persistence model:
- `AiConversation`: user, module context, entity id, title, timestamps.
- `AiMessage`: conversation id, role, content, metadata, token usage.
- `AiInsight`: entity context, recommendation type, confidence, source data snapshot.
- Audit fields for model/provider, prompt version, and generated-at timestamp.

## Future AI Extensibility Assumptions

A production LLM integration would add:

- Backend AI module with authenticated endpoints.
- Provider abstraction for OpenAI or another LLM API.
- Prompt templates per CRM workflow.
- Server-side retrieval of relevant CRM records.
- Persisted conversation and recommendation history.
- Guardrails for role-based access to entity data.
- Rate limiting and audit logs.
- UI state for streaming messages, retries, and feedback.

## Current Limitations

- AI content is not generated live.
- AI history is not stored.
- Floating assistant button is a UI affordance, not a connected chat surface.
- No external AI API key/config is required for the current app.
- Contact AI screens are realistic demo workflows, not full backend-backed intelligence modules.
