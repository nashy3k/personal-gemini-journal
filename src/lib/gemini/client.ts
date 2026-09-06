import { GoogleGenAI } from '@google/genai';
import { getGeminiApiKey } from './secrets';
import { getPersona } from './personas';

export const DEFAULT_MODEL = 'gemini-3.8-flash';
export const MAX_OUTPUT_TOKENS = 1024;
export const MAX_RETRIES = 3;
export const INITIAL_RETRY_DELAY_MS = 1000;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
}

export interface StreamChatOptions {
  messages: ChatMessage[];
  personaId?: string;
  model?: string;
  temperature?: number;
}

/**
 * Initializes and returns the GoogleGenAI client.
 * 
 * Supports two authentication paradigms:
 * 1. Vertex AI on GCP (Recommended for Cloud Run): Uses IAM Service Account / Application Default Credentials (ADC).
 *    Zero API keys required. Triggered when USE_VERTEX_AI=true or GOOGLE_GENAI_USE_VERTEXAI=true.
 *    For Gemini 3+ models, VERTEX_AI_LOCATION defaults to 'global' while Cloud Run hosts in 'us-central1'.
 * 2. Google AI Studio / Gemini API: Resolves API key via Secret Manager or process.env.GEMINI_API_KEY.
 */
export async function getGeminiClient(): Promise<GoogleGenAI> {
  const useVertex =
    process.env.USE_VERTEX_AI === 'true' ||
    process.env.GOOGLE_GENAI_USE_VERTEXAI === 'true';

  if (useVertex) {
    const project =
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCP_PROJECT ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const location =
      process.env.VERTEX_AI_LOCATION ||
      process.env.GOOGLE_CLOUD_LOCATION ||
      'global';

    return new GoogleGenAI({
      vertexai: true,
      project: project || undefined,
      location,
      httpOptions:
        location === 'global'
          ? { baseUrl: 'https://aiplatform.googleapis.com' }
          : undefined,
    });
  }

  // Fallback to API Key resolution (GCP Secret Manager or .env)
  const apiKey = await getGeminiApiKey();
  return new GoogleGenAI({ apiKey });
}

/**
 * Executes an async operation with exponential backoff retries for transient errors.
 */
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  retries: number = MAX_RETRIES,
  delayMs: number = INITIAL_RETRY_DELAY_MS
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: unknown) {
      attempt++;
      const isRateLimitOrServerErr =
        error instanceof Error &&
        (error.message.includes('429') ||
          error.message.includes('RESOURCE_EXHAUSTED') ||
          error.message.includes('503') ||
          error.message.includes('UNAVAILABLE') ||
          error.message.includes('overloaded') ||
          error.message.includes('fetch failed'));

      if (attempt > retries || !isRateLimitOrServerErr) {
        throw error;
      }

      const backoffTime = delayMs * Math.pow(2, attempt - 1) + Math.random() * 200;
      console.warn(
        `[Gemini Client] Retrying after error (attempt ${attempt}/${retries}) in ${Math.round(
          backoffTime
        )}ms:`,
        error instanceof Error ? error.message : error
      );
      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }
}

/**
 * Converts generic ChatMessage items into the structure expected by the GenAI SDK.
 */
export function formatMessagesForGenAI(messages: ChatMessage[]) {
  return messages
    .filter((msg) => msg.role !== 'system') // system instructions are passed via config
    .map((msg) => ({
      role: msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
}

/**
 * Initiates a streaming chat completion with Gemini 3.7 Flash using the GenAI SDK.
 */
export async function streamGeminiChat(options: StreamChatOptions) {
  const { messages, personaId, model, temperature = 0.7 } = options;
  const ai = await getGeminiClient();
  const persona = getPersona(personaId);
  const modelId = model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const formattedContents = formatMessagesForGenAI(messages);

  return await withExponentialBackoff(async () => {
    return await ai.models.generateContentStream({
      model: modelId,
      contents: formattedContents,
      config: {
        systemInstruction: persona.systemInstruction,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature,
      },
    });
  });
}
