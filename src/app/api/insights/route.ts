import { NextRequest, NextResponse } from 'next/server';
import { Type } from '@google/genai';
import { getGeminiClient, withExponentialBackoff } from '@/lib/gemini/client';
import { JournalInsights, Message } from '@/lib/types/journal';
import { verifyFirebaseIdToken } from '@/lib/firebase/admin';
import { getClientIp, insightsLimiter } from '@/lib/security/rateLimit';

export const runtime = 'nodejs';

const SYSTEM_INSTRUCTION = `You are an empathetic, insightful cognitive AI journaling companion specializing in holistic emotional intelligence, self-reflection synthesis, and actionable wellness insights.
Your task is to analyze the provided journal conversation / messages and extract deeply structured insights.
Evaluate the emotional tone, cognitive clarity, stress indicators, and joy signals on a scale of 0 to 100.
Identify meaningful action items and core reflection themes.
Ensure every output conforms precisely to the requested JSON schema.`;

const insightsSchema = {
  type: Type.OBJECT,
  properties: {
    moodScores: {
      type: Type.OBJECT,
      properties: {
        clarity: {
          type: Type.INTEGER,
          description: 'Clarity score from 0 to 100',
        },
        energy: {
          type: Type.INTEGER,
          description: 'Energy score from 0 to 100',
        },
        stress: {
          type: Type.INTEGER,
          description: 'Stress score from 0 to 100',
        },
        joy: {
          type: Type.INTEGER,
          description: 'Joy score from 0 to 100',
        },
      },
      required: ['clarity', 'energy', 'stress', 'joy'],
    },
    sentimentSummary: {
      type: Type.STRING,
      description: 'A thoughtful, empathetic 1-2 sentence summary of the emotional and cognitive sentiment of the journal entry.',
    },
    dominantEmotion: {
      type: Type.STRING,
      description: 'The single dominant emotional state (e.g., "Reflective Serenity", "Quiet Ambition", "Anxious Overwhelm", "Grounded Hope").',
    },
    actionItems: {
      type: Type.ARRAY,
      description: 'List of practical action items, habits, or next steps extracted from or recommended for this journal entry.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'Unique identifier for the action item' },
          title: { type: Type.STRING, description: 'Clear, actionable title of the item' },
          completed: { type: Type.BOOLEAN, description: 'Whether the item has already been completed' },
          category: { type: Type.STRING, description: 'Category such as "mindfulness", "productivity", "wellness", "growth", or "personal"' },
          dueDate: { type: Type.STRING, description: 'Optional suggested target date or timeframe (e.g. "Today", "Tomorrow", "This Week")' },
        },
        required: ['id', 'title', 'completed', 'category'],
      },
    },
    reflectionTopics: {
      type: Type.ARRAY,
      description: '2 to 5 key themes, core values, or philosophical questions explored in this journal entry.',
      items: {
        type: Type.STRING,
      },
    },
  },
  required: [
    'moodScores',
    'sentimentSummary',
    'dominantEmotion',
    'actionItems',
    'reflectionTopics',
  ],
};

function generateFallbackInsights(messages: Message[], journalTitle?: string): JournalInsights {
  const combinedText = messages.map((m) => m.content).join(' ');
  const lower = combinedText.toLowerCase();

  let clarity = 75;
  let energy = 70;
  let stress = 35;
  let joy = 65;
  let dominantEmotion = 'Reflective Calm';

  if (
    lower.includes('stress') ||
    lower.includes('tired') ||
    lower.includes('overwhelm') ||
    lower.includes('anxious') ||
    lower.includes('hard') ||
    lower.includes('busy')
  ) {
    stress += 25;
    energy -= 20;
    clarity -= 15;
    dominantEmotion = 'Mindful Navigation of Overwhelm';
  }
  if (
    lower.includes('excited') ||
    lower.includes('happy') ||
    lower.includes('great') ||
    lower.includes('love') ||
    lower.includes('grateful') ||
    lower.includes('good')
  ) {
    joy += 25;
    energy += 20;
    stress -= 15;
    dominantEmotion = 'Grounded Optimism & Gratitude';
  }
  if (
    lower.includes('plan') ||
    lower.includes('goal') ||
    lower.includes('work') ||
    lower.includes('build') ||
    lower.includes('focus') ||
    lower.includes('create')
  ) {
    clarity += 20;
    energy += 10;
    dominantEmotion = 'Focused Intentionality';
  }

  clarity = Math.max(10, Math.min(95, clarity));
  energy = Math.max(10, Math.min(95, energy));
  stress = Math.max(5, Math.min(95, stress));
  joy = Math.max(10, Math.min(98, joy));

  const actionItems = [
    {
      id: `act-${Date.now()}-1`,
      title: 'Take 5 minutes of quiet breathwork to ground your thoughts',
      completed: false,
      category: 'mindfulness',
      dueDate: 'Today',
    },
    {
      id: `act-${Date.now()}-2`,
      title: 'Identify one core priority and execute it with calm focus',
      completed: false,
      category: 'productivity',
      dueDate: 'Tomorrow',
    },
  ];

  const reflectionTopics = [
    journalTitle ? `Reflections on "${journalTitle}"` : 'Cultivating intentional daily presence',
    'Navigating mental friction with self-compassion',
    'Aligning daily rhythm with long-term peace and growth',
  ];

  return {
    moodScores: { clarity, energy, stress, joy },
    sentimentSummary: `This reflection conveys a journey of ${dominantEmotion.toLowerCase()}, balancing cognitive clarity with purposeful self-awareness and emotional equilibrium.`,
    dominantEmotion,
    actionItems,
    reflectionTopics,
  };
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader) {
      try {
        const decoded = await verifyFirebaseIdToken(authHeader);
        userId = decoded.uid;
      } catch {
        // Continue with IP fallback
      }
    }

    const rateKey = userId ? `user:${userId}` : `ip:${clientIp}`;
    const rateResult = insightsLimiter.check(rateKey);

    if (!rateResult.success) {
      return NextResponse.json(
        {
          error: `Insights generation rate limit reached (max 10 requests / 5m). Please wait ${rateResult.resetInSeconds}s before generating more insights.`,
          rateLimit: {
            limit: rateResult.limit,
            remaining: 0,
            resetInSeconds: rateResult.resetInSeconds,
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

    const body = await req.json();
    const messages: Message[] = body.messages || [];
    const journalTitle: string = body.journalTitle || '';

    // If messages are empty but content is provided
    if (messages.length === 0 && body.content) {
      messages.push({
        id: `msg-${Date.now()}`,
        role: 'user',
        content: body.content,
        timestamp: Date.now(),
      });
    }

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No messages or content provided for insight extraction' },
        { status: 400 }
      );
    }

    if (messages.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 messages allowed for insight extraction.' },
        { status: 400 }
      );
    }

    let ai;
    try {
      ai = await getGeminiClient();
    } catch (clientErr: any) {
      console.warn(
        '[Insights API] Gemini client unavailable, falling back to offline demo insights:',
        clientErr?.message || clientErr
      );
    }

    if (!ai) {
      const fallback = generateFallbackInsights(messages, journalTitle);
      return NextResponse.json({
        success: true,
        insights: fallback,
        isFallback: true,
      });
    }

    const targetModel = process.env.GEMINI_MODEL || 'gemini-3.7-flash';

    const conversationText = messages
      .map((m) => `[${m.role.toUpperCase()}]: ${m.content}`)
      .join('\n\n');

    const prompt = `Journal Title: ${journalTitle || 'Personal Reflection'}\n\nJournal Conversation / Content:\n${conversationText}\n\nPlease analyze this journal entry and return structured cognitive insights matching the specified JSON schema.`;

    try {
      const response = await withExponentialBackoff(async () => {
        return await ai.models.generateContent({
          model: targetModel,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: 'application/json',
            responseSchema: insightsSchema,
            temperature: 0.2,
          },
        });
      });

      const responseText = response.text || '';
      if (!responseText) {
        throw new Error('Empty response received from Gemini');
      }

      const parsedInsights: JournalInsights = JSON.parse(responseText);

      return NextResponse.json({
        success: true,
        insights: parsedInsights,
        isFallback: false,
      });
    } catch (geminiErr: any) {
      console.warn(
        '[Insights API] Error generating insights with Gemini, using fallback:',
        geminiErr?.message || geminiErr
      );
      const fallback = generateFallbackInsights(messages, journalTitle);
      return NextResponse.json({
        success: true,
        insights: fallback,
        isFallback: true,
      });
    }
  } catch (err: any) {
    console.error('[Insights API Route Error]', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error while extracting insights' },
      { status: 500 }
    );
  }
}
