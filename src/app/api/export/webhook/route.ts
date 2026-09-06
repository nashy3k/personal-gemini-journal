import { NextRequest, NextResponse } from 'next/server';
import { HabitItem } from '@/lib/types/journal';
import { getClientIp, webhookLimiter } from '@/lib/security/rateLimit';

interface ExportPayload {
  webhookUrl: string;
  platform?: 'discord' | 'slack' | 'custom' | 'auto';
  habits: HabitItem[];
  userDisplayName?: string;
  notes?: string;
}

// Strictly allowed webhook hostnames to prevent SSRF against internal services
const ALLOWED_WEBHOOK_HOSTS = [
  'discord.com',
  'discordapp.com',
  'canary.discord.com',
  'ptb.discord.com',
  'hooks.slack.com',
];

function isSafeWebhookUrl(urlString: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(urlString);

    if (parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Webhook URL must use secure HTTPS protocol.' };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Reject localhost, loopback, private IPs, and cloud metadata servers
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.local') ||
      hostname === 'metadata.google.internal' ||
      /^127\./.test(hostname) ||
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname) ||
      /^169\.254\./.test(hostname) ||
      hostname === '::1' ||
      hostname === '0.0.0.0'
    ) {
      return { safe: false, reason: 'Private or internal network addresses are strictly prohibited.' };
    }

    // Check against authorized platforms
    const isAllowedHost = ALLOWED_WEBHOOK_HOSTS.some(
      (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
    );

    if (!isAllowedHost) {
      return {
        safe: false,
        reason: `Webhook destination "${hostname}" is not permitted. Only verified Discord (discord.com) and Slack (hooks.slack.com) webhooks are supported.`,
      };
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Invalid URL format.' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rateResult = webhookLimiter.check(`ip:${clientIp}`);

    if (!rateResult.success) {
      return NextResponse.json(
        {
          error: `Export webhook rate limit exceeded. Please wait ${rateResult.resetInSeconds}s before retrying.`,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateResult.resetInSeconds) },
        }
      );
    }

    const body: ExportPayload = await req.json();
    const { webhookUrl, platform = 'auto', habits, userDisplayName = 'Journaler', notes } = body;

    if (!webhookUrl || typeof webhookUrl !== 'string') {
      return NextResponse.json(
        { error: 'A valid webhook URL is required' },
        { status: 400 }
      );
    }

    const urlCheck = isSafeWebhookUrl(webhookUrl);
    if (!urlCheck.safe) {
      return NextResponse.json(
        { error: urlCheck.reason || 'Untrusted webhook target.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(habits)) {
      return NextResponse.json(
        { error: 'Habits array is required' },
        { status: 400 }
      );
    }

    const totalHabits = habits.length;
    const completedCount = habits.filter((h) => h.completed).length;
    const completionPercent = totalHabits > 0 ? Math.round((completedCount / totalHabits) * 100) : 0;
    const maxStreak = habits.reduce((max, h) => Math.max(max, h.streakDays || 0), 0);

    const isDiscord =
      platform === 'discord' ||
      (platform === 'auto' && webhookUrl.includes('discord.com/api/webhooks'));
    const isSlack =
      platform === 'slack' ||
      (platform === 'auto' && (webhookUrl.includes('slack.com') || webhookUrl.includes('hooks.slack.com')));

    let outgoingBody: any;
    let headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (isDiscord) {
      const habitLines = habits
        .map(
          (h) =>
            `${h.completed ? '✅' : '⬜'} **${h.title}** ${
              h.streakDays > 0 ? `*(🔥 ${h.streakDays}d streak)*` : ''
            }`
        )
        .slice(0, 25)
        .join('\n');

      outgoingBody = {
        username: 'Gemini Journal AI',
        avatar_url: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002_d4735304ff6292a690345.svg',
        embeds: [
          {
            title: `🌱 Action Items & Micro-Habits Tracker`,
            description: notes || `Reflection progress report for **${userDisplayName}**.`,
            color: completionPercent >= 75 ? 0x10b981 : completionPercent >= 50 ? 0x6366f1 : 0xf59e0b,
            fields: [
              {
                name: '📊 Daily Progress',
                value: `${completedCount}/${totalHabits} Completed (${completionPercent}%)`,
                inline: true,
              },
              {
                name: '🔥 Top Momentum',
                value: `${maxStreak} Days Streak`,
                inline: true,
              },
              {
                name: '🎯 Action Items & Focus',
                value: habitLines || 'No active habits logged yet.',
                inline: false,
              },
            ],
            footer: {
              text: 'Gemini AI Sanctuary • Continuous Growth & Mindfulness',
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };
    } else if (isSlack) {
      const habitLines = habits
        .map(
          (h) =>
            `• ${h.completed ? ':white_check_mark:' : ':white_square:'} *${h.title}* ${
              h.streakDays > 0 ? `_(🔥 ${h.streakDays}d streak)_` : ''
            }`
        )
        .join('\n');

      outgoingBody = {
        text: `🌱 *Gemini AI Journal — Action Items & Habit Momentum* (${completedCount}/${totalHabits} completed)`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '🌱 Gemini Journal — Daily Action Items',
              emoji: true,
            },
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Reflection Report for:* ${userDisplayName}\n*Progress:* ${completedCount}/${totalHabits} completed (*${completionPercent}%*)\n*Highest Streak:* 🔥 ${maxStreak} days\n\n${notes ? `_${notes}_\n\n` : ''}*Checklist:*\n${habitLines || 'No active habits logged yet.'}`,
            },
          },
        ],
      };
    } else {
      // Standard webhook JSON
      outgoingBody = {
        event: 'gemini_journal_habits_export',
        timestamp: Date.now(),
        userDisplayName,
        notes,
        summary: {
          total: totalHabits,
          completed: completedCount,
          completionPercent,
          maxStreak,
        },
        habits,
      };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(outgoingBody),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      return NextResponse.json(
        {
          error: `Webhook target responded with status ${response.status}: ${errText.slice(0, 200)}`,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      platform: isDiscord ? 'discord' : isSlack ? 'slack' : 'custom',
      itemsCount: totalHabits,
      completedCount,
    });
  } catch (error: any) {
    console.error('[API /api/export/webhook Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to dispatch webhook export' },
      { status: 500 }
    );
  }
}
