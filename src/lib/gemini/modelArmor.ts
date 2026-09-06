import { GoogleAuth } from 'google-auth-library';

export interface ModelArmorSanitizeResult {
  allowed: boolean;
  matchFound: boolean;
  reason?: 'jailbreak' | 'sensitive_data' | 'harmful_content' | 'policy_violation';
  userGuidanceMessage?: string;
  details?: any;
}

let authClient: any = null;

async function getAuthClient() {
  if (!authClient) {
    const auth = new GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    authClient = await auth.getClient();
  }
  return authClient;
}

/**
 * Sanitizes user prompts using Google Cloud Model Armor before LLM inference.
 * Screens for jailbreak attempts, prompt injection, and sensitive data (SDP).
 * Gracefully falls back to allow requests if Model Armor is unconfigured or unreachable.
 */
export async function sanitizeWithModelArmor(
  text: string
): Promise<ModelArmorSanitizeResult> {
  const isEnabled =
    process.env.ENABLE_MODEL_ARMOR === 'true' ||
    process.env.NEXT_PUBLIC_ENABLE_MODEL_ARMOR === 'true';

  if (!isEnabled) {
    return { allowed: true, matchFound: false };
  }

  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    'gai-aca-coh3';
  const location = process.env.MODEL_ARMOR_LOCATION || 'us-central1';
  const templateId =
    process.env.MODEL_ARMOR_TEMPLATE || 'personal-journal-sanctuary-guard';

  const endpoint = `https://modelarmor.${location}.rep.googleapis.com/v1/projects/${projectId}/locations/${location}/templates/${templateId}:sanitizeUserPrompt`;

  try {
    const client = await getAuthClient();

    // Call Model Armor with a 3-second timeout to prevent stalling streaming
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response: any = await client.request({
      url: endpoint,
      method: 'POST',
      data: {
        userPromptData: {
          text,
        },
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const sanitizationResult = response?.data?.sanitizationResult;
    const filterMatchState = sanitizationResult?.filterMatchState;

    if (filterMatchState === 'MATCH_FOUND') {
      const filterResults = sanitizationResult?.filterResults || {};
      const jailbreakResult =
        filterResults?.pi_and_jailbreak?.piAndJailbreakFilterResult;
      const sdpResult = filterResults?.sdp?.sdpFilterResult?.inspectResult;

      // Case 1: Prompt injection / Jailbreak attack detected
      if (jailbreakResult?.matchState === 'MATCH_FOUND') {
        console.warn(
          '[Model Armor] Prompt injection / jailbreak attempt detected (Confidence: %s)',
          jailbreakResult?.confidenceLevel
        );

        return {
          allowed: false,
          matchFound: true,
          reason: 'jailbreak',
          userGuidanceMessage:
            "I am your dedicated reflective journaling companion. I cannot fulfill requests that attempt to override my system instructions or act outside our mindful sanctuary. Let's redirect our focus toward your inner thoughts and personal growth.",
          details: jailbreakResult,
        };
      }

      // Case 2: Sensitive Data Protection policy violation
      if (sdpResult?.matchState === 'MATCH_FOUND') {
        console.warn('[Model Armor] Sensitive personal data detected in prompt');
        return {
          allowed: false,
          matchFound: true,
          reason: 'sensitive_data',
          userGuidanceMessage:
            'For your security and privacy, this prompt triggered our Sensitive Data Protection guardrail. Please avoid entering sensitive personal identifiers, account credentials, or restricted data in journal entries.',
          details: sdpResult,
        };
      }

      // Other generic matches
      return {
        allowed: false,
        matchFound: true,
        reason: 'policy_violation',
        userGuidanceMessage:
          'This reflection touched on topics flagged by our safety and well-being guardrails. Take a deep breath, and feel free to rephrase your reflection with gentle focus.',
        details: filterResults,
      };
    }

    // Clean prompt passed all safety and security checks
    return {
      allowed: true,
      matchFound: false,
    };
  } catch (error: any) {
    // Graceful fallback: Never crash the journaling flow if Model Armor is temporarily unavailable
    console.warn(
      '[Model Armor Warning] Inspection check bypassed due to error:',
      error?.message || error
    );
    return {
      allowed: true,
      matchFound: false,
    };
  }
}
