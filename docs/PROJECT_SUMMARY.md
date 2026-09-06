# 🧘 Personal Gemini Journal: Somatic AI Sanctuary

> **Google Cloud Run AI Challenge / Ideathon 2026 Submission**  
> **Live Production Deployment**: `<REDACTED_CLOUD_RUN_URL>` *(Provided in official contest submission)*  
> **Mandatory Verification Label**: `dev-tutorial=cloud-run-ai-challenge`  
> **Core Technologies**: Google Cloud Run, Vertex AI (Gemini 3.8 Flash), Google Cloud Model Armor, Cloud Firestore, Firebase Authentication, OpenStreetMap (Leaflet), AQICN Ground Station API, Open-Meteo.

---

## 🎯 Executive Summary & Problem Statement

Most AI journaling applications operate in an emotional and physiological vacuum. They treat mental distress as purely cognitive, giving generic advice without understanding that human psychology is deeply somatic. Cognitive fatigue, irritability, and restlessness are frequently driven by environmental stressors: high atmospheric humidity, late night circadian disruption, or toxic particulate matter (PM2.5 / high AQI).

**Personal Gemini Journal** is an intelligent, privacy-first reflective sanctuary that bridges the gap between **mind, body, and atmosphere**. By pairing **Google Cloud Vertex AI (Gemini 3.8 Flash)** with **Google Cloud Model Armor**, **Cloud Firestore**, and **real-time atmospheric telemetry (AQICN ground stations + Open-Meteo)**, the journal grounds user reflections in their verified physical reality.

When a user writes *"I feel drained and irritable,"* Gemini does not just prompt them to work harder—it recognizes that at 1:00 AM, in 83% humidity with an AQI of 169 (Unhealthy), their nervous system is responding naturally to environmental strain, helping them decouple bodily tiredness from self-criticism.

---

## 🏆 How It Extends Beyond the Hackathon Brief

The contest organizers emphasized that scoring rewards projects that push beyond the basic tutorial. Personal Gemini Journal extends the base specification into a production-grade enterprise application:

| Feature Dimension | Base Tutorial Brief | Personal Gemini Journal (v2.0) |
| :--- | :--- | :--- |
| **Generative AI Engine** | Basic text generation | **Gemini 3.8 Flash** via keyless Vertex AI IAM (ADC), streaming multi-turn reflections via Server-Sent Events (SSE). |
| **AI Security Layer** | Unprotected / raw prompt pass-through | **Google Cloud Model Armor** (`personal-journal-sanctuary-guard`) screening prompt injections, jailbreaks, and sensitive data protection (SDP) before LLM invocation. |
| **Somatic & Atmospheric Telemetry** | None (pure chat) | **Real-time Government Ground Sensors (AQICN / DOE)**, Open-Meteo temperature, humidity, and true astronomical local time. |
| **Location Interface** | None | **Interactive OpenStreetMap & Leaflet Map** with draggable pin marker and human-in-the-loop confirmation (zero API key/billing risk). |
| **Database & Privacy** | Generic database | **Google Cloud Firestore (`gemini-journal`)** with strict cryptographic user-isolation rules (`/users/{uid}/*`). |
| **Cognitive Analytics** | Simple history list | **Interactive Emotional Wellness Radar** (Clarity, Energy, Stress, Joy) and 7-day consistency streak heatmaps. |
| **Actionable Growth** | Unstructured chat text | **Automated Habit Extractor** using Gemini JSON Schema to turn reflections into micro-habits with streak momentum. |
| **Public Safety & Guardrails** | Open endpoints | **Sliding-window IP/user rate limiting**, payload size caps, and strict SSRF domain protection. |
| **IAM & Service Identity** | Default Compute SA (Broad roles) | **Dedicated User-Managed Service Account** (`personal-gemini-journal-sa`) strictly scoped to `roles/aiplatform.user` and `roles/modelarmor.*`. |
| **API Key & Secret Security** | Plain environment variables | **Dual-Mode Secret Management**: Keyless Vertex AI IAM in production with automated Google Cloud Secret Manager fallback (`@google-cloud/secret-manager` in `src/lib/gemini/secrets.ts`). |
| **AI System Architecture** | Monolithic LLM Chatbot | **Compound AI System with Agentic Workflow**: Multi-source sensor perception, pre-flight safety boundaries, and structured action synthesis. |

---

## 🏛 High-Level Architecture

```
                                 [ Browser / Mobile Client ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       ▼                                           ▼
             [ Firebase Authentication ]                 [ Interactive Leaflet Map ]
             (Google One-Tap / JWT)                      (OpenStreetMap + Telemetry)
                       │                                           │
                       │ Bearer Token                              │ Confirmed Context
                       ▼                                           ▼
             ══════════════════════════════════════════════════════════════════════
                                Google Cloud Run Container
                              (Next.js Standalone Runtime)
             ══════════════════════════════════════════════════════════════════════
                       │
         ┌─────────────┴─────────────────────────────┐
         ▼                                           ▼
[ Pre-Flight Guardrail ]                    [ In-Memory Rate Limiter ]
 Google Cloud Model Armor                     (Sliding Window Token Bucket)
 (Jailbreak & PII Filter)                            │
         │ (Clean Prompt)                            ▼
         ▼                                  [ Cloud Firestore ]
[ Inference Engine ]                         (/users/{uid}/journals)
 Vertex AI (Gemini 3.8 Flash)
 (Streaming SSE / JSON Schema)
```

---

## 🛡️ Enterprise Security & Privacy Focus

1. **Zero Hardcoded Secrets**: Container runs with Native IAM Application Default Credentials (ADC), completely eliminating exposed API keys.
2. **Model Armor Pre-Flight Defense**: Prompts are intercepted by Google Cloud Model Armor. Adversarial injections (e.g. DAN prompts) are neutralized with empathetic refusals before invoking Vertex AI.
3. **SSRF Lockdown**: Outbound webhook integrations strictly whitelist legitimate providers (`discord.com`, `hooks.slack.com`), blocking loopback, internal networks, and GCP metadata servers (`metadata.google.internal`).
4. **Data Isolation**: User reflections are cryptographically sandboxed in Cloud Firestore. No user can read or modify another user's journal entries.

---

## 🚀 Live Demonstration & Links

- **Production Cloud Run URL**: `<REDACTED_CLOUD_RUN_URL>` *(Provided in official contest submission)*
- **GCP Region**: `us-central1` (Serverless compute hosting)
- **Vertex AI Location**: `global` (High-throughput inference endpoint)
- **Status**: Live, 100% traffic, verified with automated end-to-end test suite (`scripts/test-full-workflow.js`).
