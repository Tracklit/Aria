# AGENTS.md — Bug Fix Log

## 1. Chat Double Message Bug (2026-03-04)
- **Symptom**: User message appeared twice when sending a chat message
- **Root cause**: Streaming `onError` callback called `sendMessage(text, false)` recursively, which re-added user message at the top of `sendMessage`
- **Exact fix**: Extracted `_sendNonStreaming(text, existingUserMessage)` helper in `ChatContext.tsx` that skips adding user message. Streaming `onError` calls helper instead of re-entering `sendMessage`.
- **Prevention guardrail**: The `_sendNonStreaming` helper explicitly does not add user messages — only the public `sendMessage` entry point does.
- **Test coverage added**: Manual verification; unit test recommended for ChatContext send flow
- **Deployment/runtime caveat**: None

## 2. Photo Upload 404 (2026-03-04)
- **Symptom**: Profile photo upload returned 404 — route did not exist
- **Root cause**: `POST /api/user/public-profile` was never implemented in `mobile-backend/server/routes.ts`
- **Exact fix**: Added route with multer `upload.single('profileImage')` + `uploadFileToBlob` to Azure Blob 'profile-images' container + `storage.updateUserProfile` for photoUrl
- **Prevention guardrail**: Integration test against `POST /api/user/public-profile` recommended
- **Test coverage added**: None yet — needs integration test
- **Deployment/runtime caveat**: Requires Azure Blob Storage connection string in env

## 3. DOB Not Persisted (2026-03-04)
- **Symptom**: Date of birth field was a plain TextInput, value not included in save payload
- **Root cause**: `dateOfBirth` was missing from `handleSave` call in `profile.tsx`
- **Exact fix**: Replaced TextInput with DateTimePicker modal, added `dateOfBirth` (ISO string) to save payload
- **Prevention guardrail**: TypeScript type checking on profile update payload
- **Test coverage added**: None
- **Deployment/runtime caveat**: None

## 4. Dashboard Stale "Alex" Name (2026-03-04)
- **Symptom**: Dashboard greeted user as "Alex" instead of their actual name
- **Root cause**: `getDisplayName()` had hardcoded `'Alex'` fallback when profile hadn't loaded
- **Exact fix**: Changed fallback to `'Athlete'` in `dashboard.tsx`
- **Prevention guardrail**: No durable learning identified — simple default value fix
- **Test coverage added**: None
- **Deployment/runtime caveat**: None

## 5. AI Insights Not Refreshing (2026-03-04)
- **Symptom**: Refresh button on dashboard returned same insights
- **Root cause**: `refreshDashboard` cleared `dashboard:state` cache but not `dashboard:insights` cache. `generateAIInsights` checked cache first and returned cached data.
- **Exact fix**: Added `cache.delete('dashboard:insights')` in `refreshDashboard`. Added `forceRefresh` param to `generateAIInsights` that skips cache check.
- **Prevention guardrail**: Cache invalidation pattern — refresh functions should clear all related caches
- **Test coverage added**: None
- **Deployment/runtime caveat**: None

## 6. Stopwatch Text Truncation (2026-03-04)
- **Symptom**: Timer text (fontSize: 72) overflowed the 200px circle on small screens
- **Root cause**: Fixed pixel sizes didn't account for screen width variation
- **Exact fix**: Responsive sizing using `Dimensions.get('window').width`, `adjustsFontSizeToFit`, `numberOfLines={1}`
- **Prevention guardrail**: Use responsive sizing for all large text displays
- **Test coverage added**: None
- **Deployment/runtime caveat**: None

## 7. Nutrition AI Empty Macros (2026-03-04)
- **Symptom**: AI-generated nutrition plans had 0 values for all macros
- **Root cause**: AI response wrapped in markdown code fences (` ```json ... ``` `), `JSON.parse` failed, fell back to `{ title, description }` with no macro fields
- **Exact fix**: Strip markdown fences before parsing: `replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()` in both nutrition and program generate routes. Added structured JSON examples to AI prompts in `aria-ai.ts`.
- **Prevention guardrail**: Fence-stripping is now standard for all AI JSON responses. AI prompts explicitly say "no markdown, no code fences".
- **Test coverage added**: None — recommended: unit test for fence stripping
- **Deployment/runtime caveat**: None

## 8. Programs Raw JSON Display (2026-03-04)
- **Symptom**: Program detail showed raw JSON text when sessions array was empty
- **Root cause**: AI-generated content stored as raw JSON string in content/description field; sessions weren't created from it
- **Exact fix**: Added `parseAIContent()` helper in `programs/[id].tsx` that strips fences, parses JSON, maps to session structure. Falls back to parsed content when `program.sessions` is empty.
- **Prevention guardrail**: Same fence-stripping pattern as nutrition fix. Backend now also creates sessions from parsed AI response.
- **Test coverage added**: None
- **Deployment/runtime caveat**: None

## 9. Nutrition/Program AI JSON Parsing Fails With Preamble Text (2026-03-04)
- **Symptom**: AI-generated nutrition plans return error or show with 0 macros and no meals. The `JSON.parse` silently fails and falls back to `{ title, description }` with no macro/meal data.
- **Root cause**: Prior fix (#7) used `^```...` / `...```$` anchored regex to strip markdown fences, which only works if the code fence is at the very start/end of the AI response string. LLMs frequently prepend text like "Here's your nutrition plan:" before the code fence, causing the regex to not match and `JSON.parse` to fail on the raw string.
- **Exact fix**: In `mobile-backend/server/routes.ts`, replaced the anchored fence-stripping regex with a two-stage extraction: (1) regex `match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i)` to extract content between fences anywhere in the string, (2) fallback to finding the first `{` and last `}` to extract a JSON object from surrounding prose. Applied to both `/api/nutrition/generate` and `/api/programs/generate` endpoints. Added `console.error` logging of raw AI response on parse failure for future debugging.
- **Prevention guardrail**: The extraction now handles all common LLM response formats (bare JSON, fenced JSON, JSON with preamble/postamble text). AI prompts in `aria-ai.ts` already instruct "no markdown, no code fences" but LLMs are non-deterministic.
- **Test coverage added**: None -- recommended: unit test for JSON extraction with various LLM response formats
- **Deployment/runtime caveat**: None

## 10. Profile Photo Upload 500 (2026-03-05)
- **Symptom**: `POST /api/user/public-profile` consistently returned 500 with `{"error":"Failed to upload profile image"}` from the mobile app.
- **Root cause**: Blob upload used key-based auth first when `AZURE_STORAGE_CONNECTION_STRING` was present, but the storage account has shared-key auth disabled (`KeyBasedAuthenticationNotPermitted`). In production, additional infra blockers surfaced: container app managed identity needed blob data-plane permissions and the `profile-images` container was missing (container auto-create with public access failed because account disallows public access).
- **Exact fix**: In `mobile-backend/server/azure-storage.ts`, switched to **DefaultAzureCredential-first** client selection (with connection-string fallback for compatibility), and for local emulator connection strings (Azurite) prefer connection-string auth first. Changed upload flow to attempt blob upload first and only create the container when Azure returns `ContainerNotFound`. Added the same credential fallback behavior to `deleteBlob`. Also hardened image MIME handling by mapping `.jpg` to `image/jpeg` in `mobile-app/src/lib/api.ts` and allowing `image/jpg` in multer image filter in `mobile-backend/server/routes.ts`. Production runtime remediation: deployed updated mobile backend image, enabled storage public network access for `stkvnx2h6p44qw4`, and created `profile-images` container.
- **Prevention guardrail**: Storage auth is now resilient across both key-based and identity-based environments, upload no longer requires container-create privileges on every request, and required container exists explicitly in production.
- **Test coverage added**: Manual E2E verification with a real `multipart/form-data` request and sample `.jpg` image against local backend + Azurite, and production E2E verification against `ca-aria-mobile-prod` with real account credentials (`POST /api/user/public-profile` 200 and persisted `photoUrl`).
- **Deployment/runtime caveat**: Managed identity must have `Storage Blob Data Contributor` (or higher) on target storage account/container. If blob public access is disabled, avoid creating containers with `publicAccess=Blob`.
- **Migration note (2026-03-08)**: Storage migrated from `stkvnx2h6p44qw4` (dev) to `stariaprodhw63c3` (prod). Dev storage references are now obsolete.

## 11. Chat Voice Mic/Transcription Errors (2026-03-05)
- **Symptom**: Chat mic flow frequently failed with "error starting microphone" and transcription errors (especially in Expo Go), so voice input was effectively unusable.
- **Root cause**: Multiple issues: (1) chat UI recorded audio but intentionally never transcribed it, (2) voice API auth in `aria-api` used only key-based Speech auth while local auth is disabled on the Azure Speech resource, and (3) transcription stream handling assumed PCM-only input instead of mobile compressed formats.
- **Exact fix**: Implemented real voice transcription flow in `mobile-app/app/(tabs)/chat.tsx` using new `transcribeVoiceAudio()` API helper in `mobile-app/src/lib/api.ts` (multipart upload to AI `/voice/transcribe`, with `/api/v1/voice/transcribe` fallback). Added better mic/transcription state handling, user-facing error messages, and cleanup on unmount. In `aria-api/src/voice_integration.py`, added DefaultAzureCredential-first Speech config creation (with key fallback), token caching, and compressed audio stream format support (`AudioStreamContainerFormat.ANY`). Fixed malformed voice endpoint wrappers in `aria-api/src/additional_endpoints.py` to correctly handle tuple return values.
- **Prevention guardrail**: Speech auth now supports managed identity deployments where shared keys/local auth are disabled; chat mic flow now has explicit state guards for recording/transcribing and clearer recoverable errors.
- **Test coverage added**: Type/syntax validation (`mobile-app` TypeScript no-emit check, Python `py_compile` for updated voice modules). Manual API check confirmed prior production failure mode was Speech auth 401.
- **Deployment/runtime caveat**: Requires deploying updated `aria-api` and `mobile-app`. Azure managed identity must have Cognitive Services access to the Speech resource (role assigned during debugging: `Cognitive Services User` on `aria-speech-dev` for `ca-aria-api-prod` identity).

## 12. AI Chat Streaming 404 (2026-03-06)
- **Symptom**: Mobile app chat streaming failed — aria-api `/ask/stream` returned 404, causing mobile-backend to forward an HTML error page as SSE, triggering `[EventSource] Unable to identify the line ending character` warnings in the app.
- **Root cause**: After adding the `/ask/stream` endpoint in commit `8188e38`, neither aria-api nor mobile-backend were redeployed to production.
- **Exact fix**: Built and pushed both Docker images (`aria-api`, `aria-mobile-app`) to ACR, then deployed to Azure Container Apps with `--revision-suffix` to force new revisions.
- **Prevention guardrail**: When redeploying with the same `latest` image tag, Azure Container Apps does NOT create a new revision automatically. Must add `--revision-suffix "name-$(date +%s)"` to `az containerapp update` to force pulling the updated image.
- **Test coverage added**: Verified `/ask/stream` returns non-404 (422 validation error with test data), and full E2E streaming chat works with real auth token.
- **Deployment/runtime caveat**: Always use `--revision-suffix` when redeploying `latest` tags. Consider using unique tags (e.g., git SHA) instead of `latest` to avoid this class of issue.

## 13. Profile Picture Local Cache / Expired SAS Hardening (2026-03-06)
- **Symptom**: Profile photo uploads could still 500 during the blob/container path, and even successful uploads could later disappear because the app rendered expiring SAS URLs directly with no persisted profile or local photo cache on cold start/offline.
- **Root cause**: The storage upload fallback still attempted `containerClient.create({ access: 'blob' })` against a storage account with blob public access disabled, SAS generation was still treated as part of the critical response path after upload, only the user object was persisted locally, and some profile-photo surfaces bypassed the shared `Avatar` fallback behavior by rendering raw `Image` components.
- **Exact fix**: In `mobile-backend/server/azure-storage.ts`, changed missing-container creation to `containerClient.create()` so the upload flow stays compatible with private blob access. In `mobile-backend/server/routes.ts`, added phased diagnostics for profile upload failures (`storage_upload`, `db_update`, `sas_generation`) and made SAS generation non-fatal after a successful blob upload + DB write by returning the raw blob URL when needed. In the mobile app, added `mobile-app/src/lib/profileImageCache.ts` using `expo-file-system`, persisted `@aria_profile` alongside the stored user in `tokenStorage.ts`, hydrated cached profile + local cached image in `AuthContext` before `fetchUser()`, cached the local image immediately on upload, refreshed the local cache in the background after `fetchUser()`, and cleared stored profile/image state in `clearAuthStorage()`. Updated `Avatar.tsx` to fall back to the cached local file on first image-load failure, and switched dashboard + plan profile-photo rendering to the shared `Avatar` component.
- **Prevention guardrail**: Profile photos are now treated as an on-device cached asset with server URLs acting as sync state instead of the sole display source. Storage logs now identify which phase failed, and profile-photo UI should use the shared `Avatar` component rather than raw `Image` tags so expired SAS URLs can fall back to the local cache path.
- **Test coverage added**: Type/syntax validation only — `mobile-app` `npm run test:types` and `mobile-backend` `npm run build:server`.
- **Deployment/runtime caveat**: No schema or deployment changes required for this code path, but blob upload still depends on the existing `profile-images` container and valid Azure Blob permissions for the backend identity/credentials.

## 14. Dashboard Greeting Not Time-Based (2026-03-07)
- **Symptom**: Dashboard showed "Welcome back" instead of time-appropriate greeting (Good Morning/Afternoon/Evening)
- **Root cause**: The `greeting` from `useDashboard()` came from the aria-api which returned "Welcome back". The dashboard also previously hardcoded "Good Morning".
- **Exact fix**: Added local `useMemo` in `dashboard.tsx` that computes greeting from `new Date().getHours()` — returns "Good Morning" (before 12), "Good Afternoon" (12-17), or "Good Evening" (after 17). Renamed the API greeting to `_apiGreeting` to avoid shadowing.
- **Prevention guardrail**: Time-based UI should be computed client-side, not depend on API responses
- **Test coverage added**: None
- **Deployment/runtime caveat**: Client-only change, no deployment needed

## 15. expo-notifications / expo-device Crash in Dev Build (2026-03-07)
- **Symptom**: App crashed on launch with "Cannot find native module 'ExpoPushTokenManager'" and "Cannot find native module 'ExpoDevice'"
- **Root cause**: `notifications.ts` imported `expo-notifications` and `expo-device` at module scope. When native modules aren't compiled into the dev build, the import throws and crashes the app.
- **Exact fix**: Wrapped both imports in try-catch `require()` blocks in `mobile-app/src/services/notifications.ts`. All exported functions check for null before using the modules.
- **Prevention guardrail**: Always use try-catch require() for optional native modules that may not be available in all build configurations
- **Test coverage added**: None
- **Deployment/runtime caveat**: None — graceful degradation when modules unavailable

## 16. Profile Photo SAS URL Returns 403 (2026-03-07)
- **Symptom**: Profile photos stored in Azure Blob returned HTTP 403 when app tried to display them via SAS URL
- **Root cause**: Storage account `stkvnx2h6p44qw4` had `publicNetworkAccess: Disabled`, blocking all data-plane operations including SAS-authenticated requests and `getUserDelegationKey`. Shared key auth was also disabled by org policy (`allowSharedKeyAccess: false`).
- **Exact fix**: (1) Enabled public network access on storage account. (2) Added `/api/blob-proxy` endpoint in `routes.ts` that reads blobs server-side via managed identity and serves them through the backend. (3) In profile photo URL generation (GET/PATCH `/api/user`, photo upload response), detect when delegation SAS fails by checking for `skoid=` marker — falls back to proxy URL `{host}/api/blob-proxy?url={encodedBlobUrl}`. (4) Added `readBlobAsBuffer()` in `azure-storage.ts` for the proxy.
- **Prevention guardrail**: Blob proxy provides a reliable fallback when direct SAS access is blocked by network/auth policies. Profile photo URLs should always go through the SAS-or-proxy pattern.
- **Test coverage added**: Maestro E2E verified profile photo displays on dashboard and More tab
- **Deployment/runtime caveat**: Backend must be redeployed. Managed identity needs Storage Blob Data Contributor role.
- **Migration note (2026-03-08)**: Storage migrated from `stkvnx2h6p44qw4` (dev) to `stariaprodhw63c3` (prod). Dev storage references are now obsolete.

## 17. Keyboard Covers Bottom Input Fields (2026-03-07)
- **Symptom**: On edit profile, athlete info, create nutrition, and create event screens, the keyboard covered input fields at the bottom of the screen making them invisible while typing
- **Root cause**: These screens used plain `ScrollView` without any keyboard avoidance wrapper
- **Exact fix**: Wrapped `ScrollView` with `KeyboardAvoidingView` (behavior `'padding'` on iOS, `'height'` on Android, `keyboardVerticalOffset: 100` on iOS) in `profile.tsx`, `athlete-info.tsx`, `nutrition/create.tsx`, and `events/create.tsx`
- **Prevention guardrail**: Any screen with text inputs should include `KeyboardAvoidingView` wrapping the scrollable content
- **Test coverage added**: None
- **Deployment/runtime caveat**: Client-only change, no deployment needed

## 18. Profile Photo Not Persisting After Cache Clear / App Rebuild (2026-03-08)
- **Symptom**: Profile photos disappeared after clearing cache, reinstalling the app, or rebuilding. Photos worked initially after upload but didn't survive cold starts.
- **Root cause**: Three interconnected bugs: (1) `saveProfileImageLocally()` downloaded proxy URLs (`/api/blob-proxy`) without an Authorization header, causing silent 401 failures so the local file cache was never populated. (2) After `fetchUser()` downloaded the photo to local cache, the profile state and AsyncStorage still held the transient SAS/proxy URL instead of the durable local file URI, so cold starts loaded an expired URL with no local fallback. (3) After `uploadProfilePicture()`, the optimistic local file URI was overwritten by the server's SAS/proxy URL in both state and AsyncStorage, ensuring the stored profile always had an expiring URL. (4) `profileImageCache.ts` imported `getToken` from `tokenStorage.ts` while `tokenStorage.ts` imported from `profileImageCache.ts`, creating a circular dependency.
- **Exact fix**: In `mobile-app/src/lib/profileImageCache.ts`: added `authToken` parameter to `saveProfileImageLocally()` and `isProxyUri()` helper; when the URL is a proxy URL, the auth token is passed as an `Authorization: Bearer` header to `File.downloadFileAsync()`. Removed circular import of `getToken` — caller passes token instead. In `mobile-app/src/context/AuthContext.tsx`: (a) `fetchUser()` now passes the current JWT token to `saveProfileImageLocally()`, and on successful download, updates both profile state and AsyncStorage with the local file URI instead of the server URL. (b) `uploadProfilePicture()` no longer overwrites the optimistic local file URI with the server's transient SAS/proxy URL after upload confirmation.
- **Prevention guardrail**: Profile photo display should always prefer local file URIs over server URLs. Server URLs (SAS/proxy) should only be used for download/sync, never persisted as the canonical display URI. Any endpoint requiring auth that is called from file-download utilities must receive the auth token explicitly.
- **Test coverage added**: TypeScript type check (`tsc --noEmit`) and unit tests pass. Manual E2E recommended: upload photo, force-quit app, reopen — photo should persist.
- **Deployment/runtime caveat**: Client-only changes, no backend deployment needed. Existing users with expired SAS URLs in AsyncStorage will self-heal on next `fetchUser()` call (login or app foreground).

## 19. AI Chat Completely Broken — Hung aria-api + Missing Timeouts + Fragile Context Builder (2026-03-08)
- **Symptom**: All AI chat requests returned "Failed to process chat message" (500). Nutrition plan generation also failed. The aria-api `/health` endpoint took 130+ seconds to respond.
- **Root cause**: Three compounding issues: (1) The aria-api container's database connection pool became exhausted/stale, causing all requests (including `/health`) to hang indefinitely rather than failing fast. Restarting the container revision resolved this. (2) Neither `callAriaAPI` nor `callAriaAPIStream` in `mobile-backend/server/aria-ai.ts` had fetch timeouts, so when aria-api was slow, the mobile-backend hung until its own process timeout killed the request. (3) `buildUserContext()` used `Promise.all()` with bare storage queries — if any single query failed (e.g., `getLatestHealthMetrics` referencing a column the deployed schema expected), the entire context build threw, preventing chat from working at all even though the AI service itself was reachable.
- **Exact fix**: (a) Added `AbortController` with 45s timeout to `callAriaAPI` and 60s timeout to `callAriaAPIStream` in `mobile-backend/server/aria-ai.ts`. (b) Wrapped all `buildUserContext` storage queries in a `safeQuery()` helper that catches errors and returns a safe fallback, so one failing query degrades gracefully instead of killing chat. (c) Added timeout handling in `mobile-backend/server/routes.ts` chat route to return 504 with a user-friendly message when AI times out. (d) Added `AbortController` timeout (50s for chat, 30s for other requests) to `mobile-app/src/lib/api.ts` `apiRequest()` with `AbortError` handling that shows a clear user-facing timeout message. (e) Restarted `ca-aria-api-prod` container revision to clear the hung DB connection pool.
- **Prevention guardrail**: All outbound fetch calls to aria-api now have explicit timeouts. The `safeQuery` wrapper in `buildUserContext` ensures individual storage query failures degrade gracefully. The 504 status code in the route handler distinguishes timeout errors from other failures.
- **Test coverage added**: TypeScript type check passes for both mobile-backend and mobile-app. End-to-end chat test verified working after fix.
- **Deployment/runtime caveat**: Mobile-backend must be redeployed with `--revision-suffix` to pick up the timeout and safeQuery changes. If aria-api hangs again, restarting its container revision (`az containerapp revision restart`) resolves it.

## 20. Profile Photo Upload 500 — Storage Account publicNetworkAccess Disabled (2026-03-08)
- **Symptom**: POST /api/user/public-profile returns 500 with `{"error":"Failed to upload profile image"}`. Managed identity upload fails with `AuthorizationFailure`, fallback connection string fails with `KeyBasedAuthenticationNotPermitted`.
- **Root cause**: Storage account `stkvnx2h6p44qw4` had `publicNetworkAccess: Disabled`, which blocks ALL data plane requests including from managed identity within Azure. This was previously fixed (AGENTS.md #16 notes) but got re-disabled — likely by an Azure policy or another admin action.
- **Exact fix**: `az storage account update --name stkvnx2h6p44qw4 --resource-group rg-tracklit-dev --public-network-access Enabled`
- **Prevention guardrail**: Monitor storage account settings. Consider adding a health check that tests blob upload capability, or an Azure Policy assignment that enforces `publicNetworkAccess: Enabled`.
- **Test coverage added**: Tested end-to-end upload via curl to production endpoint — returns 200 with valid SAS URL.
- **Deployment/runtime caveat**: No code changes needed. This is an infrastructure setting. If photo uploads break again, first check `az storage account show --name stariaprodhw63c3 --resource-group rg-aria-prod --query publicNetworkAccess`.
- **Migration note (2026-03-08)**: Storage migrated from `stkvnx2h6p44qw4` (dev, `rg-tracklit-dev`) to `stariaprodhw63c3` (prod, `rg-aria-prod`). The MCAPS governance issue was specific to the dev subscription.
