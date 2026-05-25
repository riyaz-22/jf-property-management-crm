# JF CRM Frontend

React/Vite frontend for the JF Property Management CRM.

## Stack

- React + TypeScript
- React Router
- TanStack Query
- Zustand
- React Hook Form + Zod
- Tailwind CSS
- Axios
- Framer Motion

## Run

```bash
npm install
copy .env.example .env
npm run dev
```

Default API URL:

```env
VITE_API_URL="http://localhost:3000/api/v1"
```

## Build

```bash
npm run build
```

## Structure

```text
src/app          providers, router, auth store
src/components   reusable UI primitives
src/constants    reference data for contact-intelligence screen content
src/layouts      auth layout and app shell
src/modules      feature pages
src/services     Axios API clients
src/types        shared domain types
src/utils        helpers
```
