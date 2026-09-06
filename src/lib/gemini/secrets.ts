import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

let cachedApiKey: string | null = null;
let secretClient: SecretManagerServiceClient | null = null;

/**
 * Resolves the GEMINI_API_KEY.
 * 1. Checks in-memory cache.
 * 2. Checks process.env.GEMINI_API_KEY (primary for local dev).
 * 3. Attempts to fetch from GCP Secret Manager if running in Cloud Run / GCP.
 */
export async function getGeminiApiKey(): Promise<string> {
  if (cachedApiKey) {
    return cachedApiKey;
  }

  // Fallback / local development environment variable
  const envKey = process.env.GEMINI_API_KEY;
  if (envKey && envKey.trim().length > 0) {
    cachedApiKey = envKey.trim();
    return cachedApiKey;
  }

  // Attempt Google Cloud Secret Manager resolution
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCP_PROJECT ||
    process.env.GCLOUD_PROJECT;
  const secretName = process.env.GEMINI_SECRET_NAME || 'GEMINI_API_KEY';
  const secretVersion = process.env.GEMINI_SECRET_VERSION || 'latest';

  try {
    if (!secretClient) {
      secretClient = new SecretManagerServiceClient();
    }

    // If projectId is known, use full resource name; otherwise attempt project from ADC / secretClient
    const formattedName = projectId
      ? `projects/${projectId}/secrets/${secretName}/versions/${secretVersion}`
      : `projects/default/secrets/${secretName}/versions/${secretVersion}`;

    const [version] = await secretClient.accessSecretVersion({
      name: formattedName,
    });

    const payload = version.payload?.data?.toString();
    if (payload && payload.trim().length > 0) {
      cachedApiKey = payload.trim();
      return cachedApiKey;
    }
  } catch (error) {
    console.warn(
      '[Secrets] Failed to fetch GEMINI_API_KEY from Google Cloud Secret Manager:',
      error instanceof Error ? error.message : error
    );
  }

  throw new Error(
    'GEMINI_API_KEY could not be resolved. Please set GEMINI_API_KEY environment variable or configure Secret Manager in Google Cloud.'
  );
}
