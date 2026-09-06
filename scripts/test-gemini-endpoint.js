#!/usr/bin/env node

/**
 * Model Stability Protocol - Diagnostic Discovery & Reachability Ping
 */

const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const equalsIdx = trimmed.indexOf('=');
      if (equalsIdx > 0) {
        const key = trimmed.substring(0, equalsIdx).trim();
        let value = trimmed.substring(equalsIdx + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
    return true;
  } catch (err) {
    console.warn(`[WARN] Could not parse env file ${filePath}: ${err.message}`);
    return false;
  }
}

const projectRoot = path.resolve(__dirname, '..');
loadEnvFile(path.join(projectRoot, '.env.local'));
loadEnvFile(path.join(projectRoot, '.env'));

const TARGET_MODEL = process.env.GEMINI_MODEL || 'gemini-3.7-flash';
const USE_VERTEX = process.env.USE_VERTEX_AI === 'true';
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'gai-aca-coh3';
const REGION = process.env.GCP_REGION || process.env.GOOGLE_CLOUD_LOCATION || 'global';
const API_KEY = process.env.GEMINI_API_KEY;

console.log('='.repeat(70));
console.log('🤖 GEMINI MODEL STABILITY PROTOCOL DIAGNOSTIC');
console.log('='.repeat(70));
console.log(`[INFO] Timestamp        : ${new Date().toISOString()}`);
console.log(`[INFO] Mode             : ${USE_VERTEX ? 'Google Cloud Vertex AI (IAM ADC)' : 'Google AI Studio (API Key)'}`);
console.log(`[INFO] Target Model     : ${TARGET_MODEL}`);
if (USE_VERTEX) {
  console.log(`[INFO] GCP Project      : ${PROJECT_ID}`);
  console.log(`[INFO] GCP Region       : ${REGION}`);
}
console.log('-'.repeat(70));

async function main() {
  let ai;
  if (USE_VERTEX) {
    ai = new GoogleGenAI({
      vertexai: true,
      project: PROJECT_ID,
      location: REGION,
      httpOptions:
        REGION === 'global'
          ? { baseUrl: 'https://aiplatform.googleapis.com' }
          : undefined,
    });
  } else {
    ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  // Model Discovery
  console.log('\n[STEP 1/2] 🔍 Discovering available models via SDK...');
  try {
    const listResult = await ai.models.list();
    const available = [];
    for await (const m of listResult) {
      available.push(m.name);
    }
    console.log(`[DISCOVERY] Found ${available.length} models:`);
    available.slice(0, 15).forEach(m => console.log(`  - ${m}`));
  } catch (listErr) {
    console.warn(`[DISCOVERY NOTE] ai.models.list() notice: ${listErr.message}`);
  }

  // 1-Token Ping
  console.log(`\n[STEP 2/2] ⚡ Running 1-Token Ping for '${TARGET_MODEL}' in region '${REGION}'...`);
  try {
    const startTime = Date.now();
    const response = await ai.models.generateContent({
      model: TARGET_MODEL,
      contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
      config: {
        maxOutputTokens: 1,
        temperature: 0.0,
      },
    });

    const elapsed = Date.now() - startTime;
    const textOutput = response.text ? response.text.trim() : '';
    console.log(`[SUCCESS] Received 1-token response in ${elapsed}ms! Token: "${textOutput}"`);
    console.log('\n' + '='.repeat(70));
    console.log('✅ MODEL STABILITY PROTOCOL STATUS: SUCCESS');
    console.log('='.repeat(70) + '\n');
  } catch (pingErr) {
    console.error(`[FAIL] Ping failed: ${pingErr.message}`);
    console.log('\n' + '='.repeat(70));
    console.log('❌ MODEL STABILITY PROTOCOL STATUS: FAILURE');
    console.log('='.repeat(70) + '\n');
  }
}

main();
