import { NextRequest, NextResponse } from 'next/server';
import { Message, PersonaId } from '@/lib/types/journal';
import { DEFAULT_PERSONAS } from '@/lib/constants/personas';
import { verifyFirebaseIdToken } from '@/lib/firebase/admin';
import { getGeminiClient, withExponentialBackoff } from '@/lib/gemini/client';
import { getClientIp, authChatLimiter, guestChatLimiter } from '@/lib/security/rateLimit';
import { sanitizeWithModelArmor } from '@/lib/gemini/modelArmor';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    // Verify Firebase Auth token if supplied
    if (authHeader) {
      try {
        const decoded = await verifyFirebaseIdToken(authHeader);
        userId = decoded.uid;
      } catch (authErr: any) {
        console.warn('[Chat API] Auth token verification warning:', authErr?.message || authErr);
      }
    }

    // Rate Limiting Enforcement
    const isAuth = Boolean(userId);
    const rateKey = isAuth ? `user:${userId}` : `ip:${clientIp}`;
    const rateResult = isAuth
      ? authChatLimiter.check(rateKey)
      : guestChatLimiter.check(rateKey);

    if (!rateResult.success) {
      const message = isAuth
        ? `Rate limit reached (${rateResult.limit} requests/min). Please pause for ${rateResult.resetInSeconds}s before your next reflection.`
        : `Guest reflection limit reached (5 free demo reflections per 10m). Please sign in with your Google account for continuous journaling!`;

      return NextResponse.json(
        {
          error: message,
          rateLimit: {
            limit: rateResult.limit,
            remaining: 0,
            resetInSeconds: rateResult.resetInSeconds,
            requiresAuth: !isAuth,
          },
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateResult.resetInSeconds),
          },
        }
      );
    }

    const { messages, personaId, location } = (await req.json()) as {
      messages: Message[];
      personaId: PersonaId;
      location?: any;
    };

    // Input Validation & Payload Caps
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and cannot be empty.' },
        { status: 400 }
      );
    }

    if (messages.length > 50) {
      return NextResponse.json(
        { error: 'Conversation history exceeds maximum limit (50 messages). Please start a new reflection.' },
        { status: 400 }
      );
    }

    let totalChars = 0;
    for (const msg of messages) {
      const content = msg?.content || '';
      if (content.length > 6000) {
        return NextResponse.json(
          { error: 'Single message length exceeds maximum limit (6,000 characters).' },
          { status: 400 }
        );
      }
      totalChars += content.length;
    }

    if (totalChars > 30000) {
      return NextResponse.json(
        { error: 'Total conversation payload exceeds size limit (30,000 characters).' },
        { status: 400 }
      );
    }

    // Step 1: Pre-flight Google Cloud Model Armor Guardrail Check
    const latestUserMsg = messages[messages.length - 1];
    const latestContent = latestUserMsg?.content || '';
    const armorCheck = await sanitizeWithModelArmor(latestContent);

    if (!armorCheck.allowed) {
      const refusalMessage =
        armorCheck.userGuidanceMessage ||
        "I am your dedicated reflective journaling companion. Let's redirect our focus toward your inner reflection and wellness.";

      const encoder = new TextEncoder();
      const mockStream = new ReadableStream({
        async start(controller) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                text: `🛡️ **Model Armor Guardrail Active**\n\n${refusalMessage}`,
              })}\n\n`
            )
          );
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        },
      });

      return new Response(mockStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const persona =
      DEFAULT_PERSONAS.find((p) => p.id === personaId) || DEFAULT_PERSONAS[0];

    let systemPrompt = `${persona.systemPrompt}\n\nYou are acting as "${persona.name}" in a private personal journaling sanctuary. Format your responses with markdown, gentle reflective cadence, and thoughtful pacing. Ensure your guidance is empowering and structured.`;

    if (location) {
      const locationText = typeof location === 'string' ? location : (location.locationName || location.city || location.formattedText);
      const env = typeof location === 'object' ? location.environment : null;

      if (env && env.userConfirmed) {
        systemPrompt += `\n\n[Somatic & Environmental Grounding (User-Verified)]:
- Location: ${locationText || 'Current Sanctuary'}
- True Astronomical Local Time: ${env.localTime || ''} (${env.timezone || 'Local'})
- Weather & Temperature: ${env.temperature !== undefined ? `${env.temperature}°C, ` : ''}${env.weatherCondition || 'Mild'}${env.humidity !== undefined ? ` (${env.humidity}% humidity)` : ''}
- Air Quality (AQI): ${env.aqi !== undefined ? `${env.aqi} - ${env.aqiCategory || 'Measured'}${env.dominantPollutant ? ` (dominant: ${env.dominantPollutant.toUpperCase()})` : ''}` : 'Normal'}
- Ground Station: ${env.stationName || 'Verified Station'}

Grounding Guidance: Subtly and mindfully weave this atmospheric reality into your reflection. Acknowledge how the physical environment (late night hour, heat, high humidity, or elevated particulate levels) may somatically contribute to physical fatigue, emotional vulnerability, or mental fog, helping the user separate bodily tiredness from personal self-judgment.`;
      } else if (locationText) {
        systemPrompt += `\n\n[Grounding Context - User Location: ${locationText}${location.timezone ? ` (Timezone: ${location.timezone})` : ''}]. You may subtly and contextually acknowledge the user's local context or time of day if helpful for their grounding and reflection.`;
      }
    }

    let ai;
    try {
      ai = await getGeminiClient();
    } catch (clientErr: any) {
      console.warn('[Chat API] Gemini client not configured for live streaming, using preview stream:', clientErr?.message);
    }

    if (!ai) {
      // Fallback simulated SSE stream for initial offline setup / preview
      const encoder = new TextEncoder();
      const mockStream = new ReadableStream({
        async start(controller) {
          const sampleThoughts = [
            `Thank you for sharing this reflection with me as your **${persona.name}**.\n\n`,
            `When you look at this situation, what stands out most is the clarity of your awareness. `,
            `Notice how even expressing these words creates space between the initial thought and your deeper understanding.\n\n`,
            `> *"${persona.sampleQuestions[0]}"*\n\n`,
            `Take a quiet breath and consider: what is the most gentle and grounded next step you can take today?`
          ];

          for (const chunk of sampleThoughts) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
            await new Promise((resolve) => setTimeout(resolve, 120));
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        },
      });

      return new Response(mockStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    const targetModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';

    const formattedContents = messages.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Stream generation with exponential backoff for rate limits
    const responseStream = await withExponentialBackoff(async () => {
      return await ai.models.generateContentStream({
        model: targetModel,
        contents: formattedContents,
        config: {
          systemInstruction: systemPrompt,
          maxOutputTokens: 1024,
          temperature: 0.7,
        },
      });
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of responseStream) {
            const chunkText = chunk.text || '';
            if (chunkText) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunkText })}\n\n`)
              );
            }
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
          );
          controller.close();
        } catch (err: any) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err.message || 'Stream error' })}\n\n`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error: any) {
    console.error('[Chat API Error]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
