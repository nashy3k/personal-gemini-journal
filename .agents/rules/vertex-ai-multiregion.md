---
description: Mandatory Decoupled Multi-Region Architecture for Vertex AI & Cloud Run
always_on: true
---

# The Decoupled Multi-Region Vertex AI Standard (Mandatory)

Objective: Prevent regional 404 regressions and ensure low-latency compute hosting when deploying Gemini 3+ on Google Cloud.

1. DECOUPLED ARCHITECTURE: Never conflate the Cloud Run compute hosting region with the Vertex AI model location.
   - Cloud Run Compute Region: Deploy to ANY desired regional location (`us-central1`, `asia-southeast1`, `europe-west1`, etc.) for cost, compliance, or local client latency.
   - Vertex AI Model Location: For the Gemini 3+ family (`gemini-3.7-flash`, `gemini-3-flash`), always set `location: 'global'`.

2. BASEURL INJECTION FOR GLOBAL ENDPOINT: When using `@google/genai` with `vertexai: true` and `location: 'global'`, you MUST explicitly inject the global base URL to prevent the SDK from generating invalid `global-aiplatform.googleapis.com` hostnames:
   ```typescript
   new GoogleGenAI({
     vertexai: true,
     project: process.env.GOOGLE_CLOUD_PROJECT,
     location: 'global',
     httpOptions: { baseUrl: 'https://aiplatform.googleapis.com' }
   });
   ```

3. SEPARATED ENVIRONMENT VARIABLES: Always define distinct environment variables in deployment scripts:
   - `CLOUD_RUN_REGION`: The regional compute container location (e.g. `us-central1` or `asia-southeast1`).
   - `VERTEX_AI_LOCATION`: The model inference endpoint (`global`).

# The Model Stability Protocol (Updated)
1. NO BLIND EDITS: Before changing ANY model ID (`model=`), region (`location`), or provider, you MUST run a diagnostic discovery script (`client.models.list()` or minimal ping) in the current project context.
2. GLOBAL MULTI-REGION AWARENESS: For Gemini 3+ models, verify endpoint connectivity against `https://aiplatform.googleapis.com` (`global`) before falling back to legacy versions.
3. ENDPOINT PING: Execute a minimal 1-token generation test (max_output_tokens=1) to verify the chosen model exists and is reachable before executing a production code change or a `gcloud deploy`.
