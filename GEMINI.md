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
