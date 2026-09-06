# Project Rules & Customizations: Personal Gemini Journal

## The Decoupled Multi-Region Vertex AI Standard (Mandatory)

1. **Decoupled Architecture**: Never conflate the Cloud Run compute hosting region with the Vertex AI model location.
   - **Compute Region**: Deploy Cloud Run to any target region (e.g. `us-central1`, `asia-southeast1`, `europe-west1`).
   - **Model Location**: For Gemini 3+ models (`gemini-3.7-flash`, `gemini-3-flash`), always set `location: 'global'`.
2. **BaseUrl Injection**: When using `@google/genai` with `vertexai: true` and `location: 'global'`, pass `httpOptions: { baseUrl: 'https://aiplatform.googleapis.com' }` to prevent invalid hostname resolution.
3. **Separated Environment Variables**:
   - `CLOUD_RUN_REGION`: Compute hosting container region.
   - `VERTEX_AI_LOCATION`: Model inference endpoint (`global`).

## The Model Stability Protocol (Mandatory)
1. **No Blind Edits**: Before changing ANY model ID, run diagnostic discovery and 1-token reachability pings (`scripts/test-gemini-endpoint.js`).
2. **Global Multi-Region Awareness**: For Gemini 3+ models, verify endpoint connectivity against `https://aiplatform.googleapis.com` (`global`) before falling back to older engines.

## The Next.js on Cloud Run Runtime Config Standard (Mandatory)
**Objective**: Prevent Next.js compile-time AST replacement from stripping Cloud Run container runtime environment variables (`NEXT_PUBLIC_*`).

1. **The Inlining Trap (Build vs. Runtime Separation)**:
   - Next.js Webpack/Turbopack compiler uses `DefinePlugin` to inline all `process.env.NEXT_PUBLIC_*` references at `next build` time.
   - When building Docker containers via Cloud Build / Cloud Run source deploy, runtime environment variables do not exist yet at compile time. Static replacement transforms them into literal empty strings `""` across both client and server bundles.
2. **The Bracket & Dual-Key Resolution Protocol**:
   - Next.js cannot statically inline bracket notation or non-prefixed environment variables.
   - Always supply runtime environment variables in Cloud Run `--set-env-vars` as standard server keys (e.g. `FIREBASE_API_KEY`) alongside their public aliases.
   - In server-side entry points, always extract variables via:
     ```ts
     const env = process.env;
     const apiKey = env.FIREBASE_API_KEY || env['NEXT_PUBLIC_FIREBASE_API_KEY'] || '';
     ```
3. **Dynamic Root Layout Protocol**:
   - In Next.js App Router, `src/app/layout.tsx` must explicitly declare:
     ```ts
     export const dynamic = 'force-dynamic';
     ```
   - This prevents Next.js from caching a static pre-rendered HTML shell at build time and guarantees `window.__RUNTIME_CONFIG__` receives the live container environment on every HTTP request.
4. **Client-Side Lazy Fallback & Reactive State**:
   - Client auth and database clients must never rely on static top-level booleans evaluated at JS bundle parse time.
   - Provide an asynchronous `ensureFirebaseInitialized()` function that inspects `window.__RUNTIME_CONFIG__` and gracefully falls back to `/api/env-config` before triggering auth popups or Firestore subscriptions.
   - Decouple demo/guest session reset from cloud auth so user sign-out cleanly resets both demo state and Firebase tokens.
