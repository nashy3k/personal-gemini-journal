#!/usr/bin/env node

/**
 * Server-Sent Events (SSE) Stream Simulator & Verifier
 * 
 * Simulates, verifies, and inspects SSE streaming responses for the Personal Gemini Journal
 * without needing a live frontend application or consuming API quota.
 * 
 * Usage:
 *   node scripts/simulate-stream.js               # Run local terminal stream simulation
 *   node scripts/simulate-stream.js --server      # Start mock local SSE HTTP server on port 8088
 *   node scripts/simulate-stream.js --url=<url>   # Test and stream live backend endpoint
 */

const http = require('http');
const readline = require('readline');

// Simulated AI Journal Reflection text chunks
const MOCK_JOURNAL_PROMPT = "Today was an intense day. I spent 4 hours debugging Firebase security rules and GCP IAM permissions. Finally got the multi-tenant user isolation working seamlessly. Feeling accomplished but tired.";

const MOCK_STREAM_CHUNKS = [
  "### 🌿 Daily Journal Reflection\n\n",
  "**Emotional Tone:** *Determined, Analytical, Relieved*\n\n",
  "It sounds like you tackled a monumental technical challenge today! ",
  "Working with cloud infrastructure and security boundaries—like **Firestore Security Rules** and **GCP IAM**—often demands deep focus and patience. ",
  "Overcoming those hurdles and achieving strict user isolation is a major milestone for your application's architecture.\n\n",
  "#### 💡 Key Takeaways & Action Items:\n",
  "- **Resilience:** You persisted through complex configuration cycles.\n",
  "- **Security-First:** Strict tenant isolation is verified and locked down.\n",
  "- **Rest & Recovery:** High cognitive loads require adequate rest tonight.\n\n",
  "Take pride in today's breakthroughs, and give your mind the rest it has earned!"
];

/**
 * Format a data payload into standard SSE specification
 * Format:
 *   event: <event_name>\n
 *   data: <json_string>\n\n
 */
function formatSSE(event, data) {
  let sseString = '';
  if (event) {
    sseString += `event: ${event}\n`;
  }
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  sseString += `data: ${payload}\n\n`;
  return sseString;
}

// 1. Terminal Stream Simulator Mode (Default)
async function runTerminalSimulation() {
  console.log('='.repeat(70));
  console.log('📡 PERSONAL GEMINI JOURNAL - SSE STREAM SIMULATOR');
  console.log('='.repeat(70));
  console.log(`[USER PROMPT]: "${MOCK_JOURNAL_PROMPT}"\n`);
  console.log('[SSE STREAM STARTING] - Listening to incoming event stream...');
  console.log('-'.repeat(70));

  let totalTokens = 0;
  const startTime = Date.now();

  for (let i = 0; i < MOCK_STREAM_CHUNKS.length; i++) {
    const chunk = MOCK_STREAM_CHUNKS[i];
    const sseEvent = formatSSE('message', {
      id: `chunk_${i + 1}`,
      text: chunk,
      done: false,
      timestamp: new Date().toISOString()
    });

    // Simulate network packet latency (50-100ms per token chunk)
    await new Promise(resolve => setTimeout(resolve, 75));

    // Print raw or decoded stream
    process.stdout.write(chunk);
    totalTokens += chunk.split(/\s+/).length;
  }

  // End of stream event
  const doneEvent = formatSSE('done', {
    done: true,
    finishReason: 'STOP',
    totalTokens
  });

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n' + '-'.repeat(70));
  console.log(`[SSE STREAM COMPLETE]`);
  console.log(`[METRICS] Chunks: ${MOCK_STREAM_CHUNKS.length} | Est. Words: ${totalTokens} | Duration: ${totalTime}s`);
  console.log('='.repeat(70) + '\n');
}

// 2. Mock SSE HTTP Server Mode (--server)
function runMockServer(port = 8088) {
  const server = http.createServer((req, res) => {
    // Enable CORS for frontend development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    console.log(`[HTTP ${req.method}] ${req.url} connection received.`);

    if (req.url === '/api/journal/stream' || req.url === '/api/chat/stream' || req.url === '/') {
      // Set mandatory SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Disables proxy buffering (e.g. NGINX/Cloud Run)
      });

      // Send initial connection ACK
      res.write(formatSSE('connected', { status: 'ok', timestamp: new Date().toISOString() }));

      let index = 0;
      const interval = setInterval(() => {
        if (index < MOCK_STREAM_CHUNKS.length) {
          const chunk = MOCK_STREAM_CHUNKS[index];
          res.write(formatSSE('message', {
            id: `chunk_${index + 1}`,
            text: chunk,
            done: false
          }));
          index++;
        } else {
          // Send terminal completion signal
          res.write(formatSSE('done', { done: true }));
          res.write('data: [DONE]\n\n');
          clearInterval(interval);
          res.end();
          console.log('[SSE] Stream completed and connection closed.');
        }
      }, 100);

      req.on('close', () => {
        clearInterval(interval);
        console.log('[SSE] Client disconnected.');
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Endpoint not found. Use /api/journal/stream' }));
    }
  });

  server.listen(port, () => {
    console.log('='.repeat(70));
    console.log(`🚀 Mock SSE Server running at: http://localhost:${port}/api/journal/stream`);
    console.log(`   Use this endpoint in your frontend to test streaming UI components!`);
    console.log(`   Press Ctrl+C to stop.`);
    console.log('='.repeat(70));
  });
}

// 3. Connect and Stream Live Backend Endpoint (--url=<url>)
async function connectToLiveStream(targetUrl) {
  console.log(`[CLIENT] Connecting to live SSE endpoint: ${targetUrl}...`);
  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({ prompt: MOCK_JOURNAL_PROMPT })
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');

    console.log('[CLIENT] Connected! Receiving live stream:\n' + '-'.repeat(70));

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const textChunk = decoder.decode(value, { stream: true });
      process.stdout.write(textChunk);
    }
    console.log('\n' + '-'.repeat(70) + '\n[CLIENT] Stream closed.');
  } catch (err) {
    console.error(`[CLIENT ERROR] Failed to connect: ${err.message}`);
  }
}

// CLI Arg Routing
const args = process.argv.slice(2);
const urlArg = args.find(a => a.startsWith('--url='));

if (args.includes('--server')) {
  const portArg = args.find(a => a.startsWith('--port='));
  const port = portArg ? parseInt(portArg.split('=')[1], 10) : 8088;
  runMockServer(port);
} else if (urlArg) {
  const targetUrl = urlArg.split('=')[1];
  connectToLiveStream(targetUrl);
} else {
  runTerminalSimulation();
}
