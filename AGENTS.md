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
