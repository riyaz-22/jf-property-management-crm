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
- CRM workspace refactor so contact detail and sell-mandate flows open inline without disruptive route transitions.
- PostgreSQL-backed calendar and lightweight AI assistant persistence.

### 2026-05-26 Workspace, Calendar, and AI Assistant Update

User request summary:
- Refactor CRM navigation to behave like a single-page enterprise workspace.
- Keep Contact Directory, contact detail, sell mandate, and valuation scheduling inside stable layouts.
- Add a real calendar with month/week/day views, appointments, agents, references, status badges, reminders, CRUD, rescheduling, overlap prevention, and PostgreSQL persistence.
- Fix User Management data flow and remove mock-only behavior where backend data exists.
- Turn the floating AI button into a simple persisted assistant panel.

Implemented changes:
- Contact row clicks now open in-page contact detail/drawer behavior instead of navigating to a separate route.
- `View Sell Mandate` opens the sell intent workspace inline inside `ContactDirectoryPage`.
- `Schedule Valuation` remains inside the workspace and writes appointment data into persisted scheduling tables.
- Added frontend calendar module at `frontend/src/modules/calendar/CalendarPage.tsx`.
- Added calendar service at `frontend/src/services/calendar.ts`.
- Added backend calendar module under `backend/src/modules/calendar`.
- Added AI chat frontend service at `frontend/src/services/aiChat.ts`.
- Added backend AI chat module under `backend/src/modules/ai-chat`.
- Added migration `backend/prisma/migrations/20260526152000_calendar_ai_workspace/migration.sql`.
- Updated `AppShell` so the floating AI button opens an assistant widget with stored message history.
- Updated navigation so Calendar points to `/calendar`.

Verification performed:
- `npm run build` in `backend` passed.
- `npm run build` in `frontend` passed.
- `npx prisma validate` passed.

## Current AI Co-Pilot Features

The implemented AI experience has two layers:

1. Contact intelligence presentation UI in `frontend/src/modules/contacts/ContactPages.tsx`.
2. A lightweight persisted assistant chat in `frontend/src/layouts/AppShell.tsx`, backed by `/ai-chat` APIs and PostgreSQL.

Visible AI-related UI:
- `AI Co-Pilot Insights` panel on contact detail and sell-intent workspace.
- `Curator AI insights` section in the contact drawer.
- Insight cards such as probability, recommended action, valuation urgency, and conversation guidance.
- Floating `AI assistant` action button in the app shell.
- Expandable chat panel with starter prompts, message history, and simple rule-based responses.

## AI Insight Rendering Flow

Current flow:

1. Contact pages load local contact records from `frontend/src/constants/demoData.ts`.
2. `ContactDirectoryPage` displays selectable contacts.
3. `ContactDrawer`, `ContactDetailPage`, and `SellIntentWorkspacePage` render insight panels.
4. Insight content is static/rule-style UI text embedded in React components.
5. The floating assistant calls backend `/ai-chat` endpoints for chat sessions/messages.

This means contact insight cards remain deterministic UI content, while assistant chat history is now persisted. Assistant responses are simple rule-based replies, not live LLM-generated output.

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

AI/contact intelligence data is mixed:

- Contact list/detail data is loaded from the backend when available, with local demo fallback in the frontend.
- Insight card text is component-defined.
- AI assistant sessions and messages are stored in PostgreSQL.
- No external LLM provider, vector store, or model prompt pipeline is currently wired.

Operational CRM modules such as properties, users, leases, payments, and maintenance are database-driven. Contact intelligence/AI panels are frontend demo modules.

## History Persistence Strategy

Current implementation:
- AI chat history is persisted in PostgreSQL.
- `AiChatSession` stores the assistant session.
- `AiChatMessage` stores role, content, timestamps, and session ownership.
- Backend endpoints live under `/ai-chat`.

Recommended future persistence model:
- Extend `AiChatSession` with module context, entity id, summary, and archive state.
- Extend `AiChatMessage` with metadata, token usage, provider, and prompt version if a live LLM is added.
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
- Contact insight cards are not generated live.
- Floating assistant responses are intentionally simple and rule-based.
- No external AI API key/config is required for the current app.
- Contact AI screens are realistic workflow UI, while assistant history is backend-backed.
