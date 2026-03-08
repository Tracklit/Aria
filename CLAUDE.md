# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Aria is an AI-powered running coaching app for sprint athletes. The monorepo has three services:

- **`aria-api/`** — Python/FastAPI AI backend (chat, analytics, video analysis, social features)
- **`mobile-backend/`** — Node.js/Express backend for the mobile app (auth, workouts, training plans)
- **`mobile-app/`** — Expo/React Native mobile client (iOS/Android)

The mobile app talks to both backends: mobile-backend handles CRUD/auth, aria-api handles AI chat and analytics. The mobile-backend proxies chat requests to aria-api via `server/aria-ai.ts`.

### Production URLs

| Service | URL |
|---------|-----|
| **aria-api (prod)** | `https://ca-aria-api-prod.bravepond-d57ce243.westus.azurecontainerapps.io` |
| **mobile-backend (prod)** | `https://ca-aria-mobile-prod.bravepond-d57ce243.westus.azurecontainerapps.io` |
| **aria-api (dev, often down)** | `https://aria-dev-api.azurewebsites.net` |

**Always use the prod aria-api URL** for AI generation (nutrition plans, programs, chat). The dev API is frequently down.

### Manual Deployment (Docker + ACR)

**Never use GitHub Actions for deployment.** Always deploy manually:

```bash
# 1. Switch to dev subscription (where ACR + container apps live)
az account set --subscription "ME-MngEnvMCAP568620-anrugama-dev"
az acr login --name tracklitdevkvnx2h

# 2. Build for linux/amd64 and push to ACR
docker buildx build --platform linux/amd64 -f mobile-backend/Dockerfile mobile-backend \
  -t tracklitdevkvnx2h.azurecr.io/aria-mobile-app:latest --push

# 3. Deploy to Container App
az containerapp update --name ca-aria-mobile-prod --resource-group rg-aria-prod \
  --image tracklitdevkvnx2h.azurecr.io/aria-mobile-app:latest
```

Key details:
- ACR and container apps are both in `ME-MngEnvMCAP568620-anrugama-dev` subscription
- Resource group: `rg-aria-prod` (despite being in dev subscription)
- Must build with `--platform linux/amd64` (macOS builds ARM by default)
- ACR registry: `tracklitdevkvnx2h.azurecr.io`
- Mobile backend image: `aria-mobile-app`, AI API image: `aria-api`

## Development Commands

### aria-api

```bash
cd aria-api
pip install -r requirements.txt
python run.py                              # Dev server on :8000
docker-compose up -d                       # Full stack: API + Postgres + Redis + Celery

# Testing
pytest tests/                              # All tests
pytest tests/ -k test_name                 # Single test
pytest tests/ -m database                  # By marker (unit, integration, database, auth, api, cache, observability)

# Linting (non-blocking in CI)
black --check src/ tests/ scripts/
flake8 src/ tests/ --max-line-length=120
```

### mobile-backend

```bash
cd mobile-backend
npm install
npm run server                             # Dev server with hot reload on :3000

# Database (Drizzle ORM)
npm run db:generate                        # Generate migration SQL from schema changes
npm run db:migrate                         # Apply migrations
npm run db:studio                          # DB browser UI

# Testing
npm test                                   # All tests (Jest, --runInBand)
npm run test:integration                   # Auth integration tests only
npm run test:coverage                      # With coverage
```

### mobile-app

```bash
cd mobile-app
npm install
npm start                                  # Expo dev server
npm run ios                                # iOS simulator
npm run android                            # Android emulator

# Testing
npm test                                   # Unit tests (tsx runner, not Jest)
npm run test:types                         # TypeScript type check (tsc --noEmit)
npm run test:integration                   # E2E integration harness (hits live endpoints)
npm run test:e2e:maestro                   # Maestro UI E2E flows
npm run test:all                           # Unit + types + integration
```

### Docker builds (from repo root)

```bash
docker build -f aria-api/Dockerfile aria-api
docker build -f mobile-backend/Dockerfile mobile-backend
```

## Architecture

### AI Chat Flow
1. Mobile app sends message to mobile-backend `POST /api/chat`
2. mobile-backend builds user context (profile + recent workouts + active plan) in `server/aria-ai.ts`
3. mobile-backend proxies to aria-api `/ask` with context
4. aria-api calls Azure OpenAI GPT-4o and streams response via SSE

### Tech Stack
- **aria-api**: FastAPI, PostgreSQL (psycopg2, raw SQL), Redis, Celery, Azure OpenAI, scikit-learn
- **mobile-backend**: Express 5, TypeScript, Drizzle ORM, PostgreSQL, JWT auth (bcrypt, 20min access + 30d refresh tokens)
- **mobile-app**: Expo SDK 54, React Native 0.81, React 19, Expo Router v6, Gluestack UI, TanStack Query v5, React Context (no Redux)

### Database
- **mobile-backend**: Drizzle ORM — schema defined in `shared/schema.ts`. Edit schema, run `db:generate`, then `db:migrate`.
- **aria-api**: Raw psycopg2 with custom migration scripts (`scripts/migrate_database.py`). 45+ tables.

### Key Files
| File | Purpose |
|------|---------|
| `aria-api/src/main.py` | FastAPI app with all routes (~2000 lines) |
| `aria-api/src/database.py` | PostgreSQL connection pool + CRUD operations |
| `mobile-backend/shared/schema.ts` | Drizzle schema (source of truth for mobile DB) |
| `mobile-backend/server/routes.ts` | All Express API routes |
| `mobile-backend/server/aria-ai.ts` | AI system prompt + context builder + OpenAI proxy |
| `mobile-backend/server/auth.ts` | JWT auth, Apple Sign-In, rate limiting |
| `mobile-app/src/config/env.ts` | API URL resolution with hostname allowlist |
| `mobile-app/src/lib/contextAggregator.ts` | Dashboard context aggregation with caching |
| `mobile-app/mocks/` | HTML/CSS design mocks (source of truth for UI design) |

## CI/CD

GitHub Actions (`.github/workflows/ci-cd.yml`) triggers on push/PR to `main` or `develop`:
1. **test** — Postgres 15 + Redis 7 services, Python 3.11, pytest with coverage
2. **build** — Docker images pushed to Azure ACR (`tracklitdevkvnx2h.azurecr.io`)
3. **deploy-staging** — `develop` branch → Azure staging
4. **deploy-production** — `main` branch → Azure production

CI image names: `aria-api` (API), `aria-mobile-app` (mobile backend).

## Critical Deployment Rules

Read `ARIA-DEV-API-OPS.md` before touching deployment. Key rules:

- **Pinned image tag**: aria-api uses `main-20f8ab7`, NOT `latest` (latest was overwritten by a mobile image)
- **B1 plan minimum**: Free tier causes 503 quota errors under normal usage
- **Production dependency**: TrackLit prod backend (`app-tracklit-prod-tnrusd`) calls aria-dev-api for Sprinthia AI chat — downtime breaks prod for all users
- **ACR password**: `DOCKER_REGISTRY_SERVER_PASSWORD` must be set or container pull fails

## Azure Blob Storage — DO NOT USE for new features

The storage account `stkvnx2h6p44qw4` has `publicNetworkAccess` periodically **disabled by `MCAPSGov-AutomationApp`** (Microsoft MCAPS governance automation). This blocks ALL data plane operations — uploads, downloads, SAS URLs, and even managed identity access — causing 500 errors.

**Rule: Store user-uploaded files in PostgreSQL (base64 in a `text` column), not Azure Blob Storage.** Serve via a dedicated backend endpoint (e.g. `/api/user/photo/:userId`). This pattern is already used for:
- Profile photos → `user_profiles.photoData` → `GET /api/user/photo/:userId`
- Chat attachments → `chat_attachments.data` → `GET /api/aria/chat/attachment/:id`
- Program files → `programs.programFileData` → `GET /api/programs/:id/file`

**Still on Blob Storage (legacy, will break when policy flips):**
- Legacy profile photo URLs (old blob URLs still in some user records)
- Legacy program file URLs (old blob URLs still in some program records)

### Blob→DB Migration Log (revert once MCAPS resolved)

| Feature | Date | Old (Blob) | New (DB) | Revert path |
|---------|------|-----------|----------|-------------|
| Profile photos | 2026-03-08 | `profile-images` container, SAS URLs | `user_profiles.photoData` (base64) + `photoMimeType`, served via `GET /api/user/photo/:userId` | Re-enable blob upload in `POST /api/user/public-profile`, restore SAS URL generation in `azure-storage.ts`, update `GET /api/user` to return blob URL |
| Chat attachments | 2026-03-08 | `chat-attachments` container | `chat_attachments` table (base64 `data` column), served via `GET /api/aria/chat/attachment/:id` | Re-enable blob upload in `POST /api/aria/chat/attachment`, restore blob URL in response |
| Program files | 2026-03-08 | `programs` container, blob URL in `programFileUrl` | `programs.programFileData` (base64), served via `GET /api/programs/:id/file` | Re-enable blob upload in `POST /api/programs/upload`, restore blob URL in `programFileUrl` |

**If a feature needs file storage**, use this pattern:
1. Add a `data text` (base64) + `mime_type varchar` column to the relevant table
2. Store `buffer.toString('base64')` on upload
3. Add a `GET /api/<resource>/:id` endpoint that decodes and serves with proper Content-Type
4. Return the endpoint URL (permanent, never expires) instead of a blob/SAS URL

## Gotchas

- **JWT secret must match** between aria-api and mobile-backend `.env` files
- **Azure OpenAI vs direct**: Production uses `AZURE_OPENAI_ENDPOINT` + managed identity (no API key). CI uses `OPENAI_API_KEY` (direct OpenAI). Never set both.
- **Drizzle migrations**: Always `db:generate` then `db:migrate` after editing `shared/schema.ts`. Never edit migration SQL manually.
- **Python path**: aria-api requires `aria-api/` in PYTHONPATH. `run.py`, `app.py`, and `startup.sh` handle this.
- **React 19 overrides**: `mobile-app/package.json` uses `overrides` to force React 19 across all deps.
- **URL allowlist**: `mobile-app/src/config/env.ts` validates backend URLs against hardcoded Azure hostnames. Unknown hosts silently fall back to production URLs.
- **Maestro E2E**: Requires `~/.maestro/bin` in PATH and iOS simulator running.

## Bug Fix Protocol

**Before fixing any bug**, check `AGENTS.md` for prior fixes — the issue may already be documented with a root cause and solution.

**After every bug fix**, update `AGENTS.md` in the same commit with the following fields:

- **Symptom**: What was observed / reported
- **Root cause**: Why it happened
- **Exact fix**: What was changed and where
- **Prevention guardrail**: What prevents recurrence (lint rule, type check, assertion, etc.)
- **Test coverage added**: Which tests were added or updated
- **Deployment/runtime caveat**: Any rollout or environment considerations

If the fix has no durable learning (e.g., a typo), document `No durable learning identified`.
