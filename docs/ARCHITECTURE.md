# 🏛 Technical Architecture & Engineering Standards

> **Project**: Personal Gemini Journal (v2.0)  
> **Platform**: Google Cloud Platform (Cloud Run, Vertex AI, Model Armor, Firestore)

---

## 1. Decoupled Multi-Region Vertex AI Standard

To avoid regional 404/429 model deployment failures on Google Cloud, this project adheres strictly to the **Decoupled Multi-Region Architecture**:

* **Compute Hosting Region (`us-central1`)**:
  - Google Cloud Run container is deployed in `us-central1` where serverless container resources, min/max instances, and egress are tightly provisioned.
* **Model Inference Endpoint (`global`)**:
  - For Gemini 3+ models (`gemini-3.8-flash`), Vertex AI inference is targeted at `global` with explicit `httpOptions: { baseUrl: 'https://aiplatform.googleapis.com' }` using the official `@google/genai` SDK.
* **Separation of Concerns**:
  - Compute region (`CLOUD_RUN_REGION`) is never conflated with the model inference endpoint (`VERTEX_AI_LOCATION`), ensuring zero endpoint resolution failures.

---

## 2. Google Cloud Model Armor Guardrail Pipeline

Before any prompt is transmitted to Vertex AI, it must pass through **Google Cloud Model Armor**:

```
[ Incoming User Prompt ]
           │
           ▼
┌────────────────────────────────────────────────────────┐
│  src/lib/gemini/modelArmor.ts                          │
│  Endpoint: modelarmor.us-central1.rep.googleapis.com   │
│  Template: personal-journal-sanctuary-guard            │
└────────────────────────────────────────────────────────┘
           │
     ┌─────┴─────────────────────────┐
     │ filterMatchState?             │
     ▼                               ▼
[ MATCH_FOUND ]               [ NO_MATCH_FOUND ]
     │                               │
     ▼                               ▼
Intercept & Stream Mindful     Forward to Vertex AI
Refusal (Zero LLM Tokens)     (Gemini 3.8 Flash Streaming)
```

### Active Filters:
1. **Prompt Injection & Jailbreak Filter**: `ENABLED` (`MEDIUM_AND_ABOVE`). Blocks attempts to override persona instructions or elicit unauthorized behavior.
2. **Sensitive Data Protection (SDP)**: `ENABLED`. Detects and flags sensitive PII before model exposure.
3. **Graceful Fail-Open Resilience**: If Model Armor encounters network latency spikes, the wrapper safely fails open with a warning log so user reflections are never dropped.

---

## 3. Somatic & Environmental Grounding Pipeline

```
[ User Clicks 'Ground Atmosphere' ]
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│  EnvironmentModal.tsx (Leaflet + OpenStreetMap)        │
│  • Pinned GPS or Drag-to-Pinpoint Location             │
└────────────────────────────────────────────────────────┘
                 │
     ┌───────────┴───────────────────────────┐
     ▼                                       ▼
[ AQICN Ground Station API ]       [ Open-Meteo Forecast API ]
• Official DOE Station Sensors      • Temperature (°C) & Humidity (%)
• Real-time AQI & PM2.5            • Astronomical Local Time & Timezone
     │                                       │
     └───────────────────┬───────────────────┘
                         ▼
           [ User Confirmation Dialog ]
           • Human-in-the-Loop Validation
                         │ (Confirmed)
                         ▼
           [ System Prompt Injection in /api/chat ]
           • Informs Gemini 3.8 Flash of atmospheric strain
```

---

## 4. Multi-Tenant Cloud Firestore Isolation

User reflection threads and habits are cryptographically partitioned in Cloud Firestore:

* **Collection Schema**:
  ```
  /users/{userId}/journals/{journalId}
  /users/{userId}/journals/{journalId}/messages/{messageId}
  /users/{userId}/habits/{habitId}
  ```
* **Enforced Security Rules (`firestore.rules`)**:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{userId}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
  ```
* No user can query, read, or overwrite documents outside their authenticated `userId` path.

---

## 5. Defense-in-Depth Security Matrix

| Threat Vector | Mitigation Strategy | Implementation Location |
| :--- | :--- | :--- |
| **Denial-of-Wallet / API Flooding** | Sliding-window in-memory rate limiting (30 req/min auth, 5 req/10min guest). | `src/lib/security/rateLimit.ts` |
| **Server-Side Request Forgery (SSRF)** | Strict domain whitelist (`discord.com`, `hooks.slack.com`); private IP & metadata blocks. | `src/app/api/export/webhook/route.ts` |
| **Adversarial Jailbreaks** | Pre-flight prompt inspection via Google Cloud Model Armor. | `src/lib/gemini/modelArmor.ts` |
| **Clickjacking & MIME-Sniffing** | Hardened headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`). | `next.config.mjs` |
| **Container Resource Exhaustion** | Cloud Run concurrency limits (`max-instances: 2`, `cpu: 1`, `memory: 512Mi`). | `deploy.ps1` / `deploy.sh` |

---

## 6. Principle of Least Privilege: Dedicated User-Managed Service Account

In strict accordance with Google Cloud security best practices taught in the Generative AI & Cloud Run cohort, the service **does not run on the default Compute Engine service account**.

* **Dedicated Identity**: `personal-gemini-journal-sa@gai-aca-coh3.iam.gserviceaccount.com`
* **Strict Least-Privilege IAM Scope**:
  - `roles/aiplatform.user`: Explicitly authorizes Vertex AI model inference (`gemini-3.8-flash`).
  - `roles/modelarmor.user` & `roles/modelarmor.admin`: Authorizes prompt inspection and sanitization against the `personal-journal-sanctuary-guard` template.
  - **Zero Broad Roles**: No `roles/editor`, no `roles/owner`, and zero access to other cloud infrastructure.
* **Dual-Mode BYOK Fallback**: Open-source contributors outside the GCP organization can clone the repo and run locally via Google AI Studio (`GEMINI_API_KEY`) without needing IAM credentials.

---

## 7. Compound AI System & Agentic Workflow Architecture

In modern AI engineering, monolithic LLM calls are replaced by **Compound AI Systems**—modular architectures where independent components orchestrate reasoning, tool execution, safety boundaries, and persistence. 

While the application does not depend on heavy autonomous multi-agent runtimes (such as ADK or LangGraph), it embodies a deterministic **Agentic Reflective Workflow**:

```
                         [ User Reflection Input ]
                                     │
                                     ▼
                      ┌──────────────────────────────┐
                      │  Perception & Tool Grounding │
                      │  • AQICN Ground Station API  │
                      │  • Open-Meteo Weather API    │
                      │  • Astronomical Local Time   │
                      └──────────────┬───────────────┘
                                     │ (Empirical Environmental Context)
                                     ▼
                      ┌──────────────────────────────┐
                      │   Autonomous Guardrail Layer │
                      │   • Google Cloud Model Armor │
                      │   • Prompt Injection Defense │
                      └──────────────┬───────────────┘
                                     │ (Clean Prompt & Atmospheric Grounding)
                                     ▼
                      ┌──────────────────────────────┐
                      │    Cognitive Persona Agent   │
                      │    • Specialized Mental Mode │
                      │    • Vertex AI Gemini 3.8    │
                      └──────────────┬───────────────┘
                                     │ (Reflective Dialogue Stream)
                                     ▼
                      ┌──────────────────────────────┐
                      │   Action Planning Engine     │
                      │   • /api/insights Extractor  │
                      │   • Gemini JSON Schema       │
                      │   • Micro-Habits Synthesis   │
                      └──────────────┬───────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    [ Cryptographic Storage ]               [ Outbound Action Dispatcher ]
    • Cloud Firestore (/users/{uid})        • SSRF-Safe Webhook Dispatch
    • User Security Sandbox                 • Discord & Slack Embeds
```

### Key Agentic Dimensions:
1. **Tool-Augmented Perception**: Rather than hallucinating conditions, the agent perceives external reality via real-time sensory ground station APIs.
2. **Deterministic Multi-Stage Reasoning**: Separates empathetic reflection (chat stream) from analytical extraction (JSON schema insights).
3. **Action-Oriented Synthesis**: Bridges thoughts to tangible actions by generating micro-habits and exporting them to user productivity environments.

---

## 8. Context Engineering & The Agent Harness Stack

$$\mathbf{Agent} = \mathbf{Model} \; (\text{Gemini 3.8 Flash}) \;+\; \mathbf{Harness} \; (\text{Cloud Run Runtime})$$

Context management in Personal Gemini Journal is not treated as static prompt assembly, but as an active runtime data pipeline governed by the **Four Operational Primitives**:

* **WRITE (State Persistence)**: Prevents context window saturation by offloading user history, reflection arcs, and habits to external Cloud Firestore collections (`/users/{uid}/*`).
* **SELECT (Information Filtering)**: Curates high-signal sensory data from raw weather/sensor streams (AQI, PM2.5, Temperature, Humidity, Astronomical Time) via human-in-the-loop validation before token assembly.
* **COMPRESS (Token Reduction)**: Rather than querying raw chat histories repeatedly, `/api/insights` compresses conversational trajectories into compact JSON schemas for the SVG Emotional Wellness Radar and Habit tracker.
* **ISOLATE (Domain Separation)**: Google Cloud Model Armor acts as an isolated pre-flight security perimeter, while individual persona instructions and tenant data stores remain strictly sandboxed.

### The 7-Layer Context Anatomy Mapping:
1. **System Instructions / Persona**: Compartmentalized persona definitions (`personas.ts`).
2. **User Input / Task Query**: Immediate user reflection turn (text or voice dictation).
3. **Tools / Schemas**: External sensor endpoints (AQICN, Open-Meteo) and Webhook schemas.
4. **Retrieval / Grounding**: Confirmed atmospheric telemetry injected as empirical grounding.
5. **Short-Term Memory**: Multi-turn in-session conversation history array.
6. **Long-Term Memory**: Offloaded persistent state in Cloud Firestore.
7. **Output Formats & Execution State**: Server-Sent Events (SSE) streaming and Gemini JSON Schema validation.

---

## 9. Future Architectural Roadmap: Cloud Run Agentic Code Sandbox (`sandboxLauncher`)

Building upon Google Cloud Run's latest Beta runtime capabilities, the next major evolution of Personal Gemini Journal's agent harness incorporates **Cloud Run MicroVM Sandboxing** (`sandboxLauncher: true`).

```
[ User Reflection & Long-Term Biometric History ]
                         │
                         ▼
┌────────────────────────────────────────────────────────┐
│  Cloud Run Host Container (Next.js Application)        │
│  • Service Account: personal-gemini-journal-sa         │
└────────────────────────┬───────────────────────────────┘
                         │ Invokes /usr/local/gcp/bin/sandbox
                         ▼
┌────────────────────────────────────────────────────────┐
│  Disposable gVisor MicroVM Sandbox (sandboxLauncher)   │
│  • Isolated ephemeral execution environment            │
│  • Python/SciPy mathematical regression scripts        │
│  • Computes Circadian Dip & Sleep-Debt Projections    │
│  • Exports Encrypted SQLite / Markdown Vaults          │
└────────────────────────┬───────────────────────────────┘
                         │ Returns deterministic computed metrics
                         ▼
            [ Grounded Feedback in Gemini 3.8 ]
```

### Roadmap Capabilities:
1. **Somatic Circadian Code Interpreter**:
   - Allows Gemini to dynamically write and execute Python routines in an ephemeral micro-container to compute non-linear circadian rhythm dips, correlating ambient humidity and temperature data against user self-reported energy drops.
2. **Zero-Trust Private Vault Compilation**:
   - Generates client-requested Obsidian Markdown vaults or encrypted PDF summaries in a disposable, jailbroken-proof sandbox, ensuring zero runtime data remanence in container memory.
3. **Synergy with Google Agent Developer Kit (ADK)**:
   - Harmonizes our deterministic multi-turn Next.js harness with an ADK-powered Python companion worker for advanced multi-agent data analysis.




