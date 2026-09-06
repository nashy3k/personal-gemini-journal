/**
 * Test script for Environmental Telemetry
 * Tests:
 * 1. AQICN API token live check (Kuala Lumpur: 3.139, 101.6869)
 * 2. Open-Meteo Weather & Timezone
 * 3. Reverse Geocoding
 */

const assert = require('assert');

const AQICN_TOKEN = process.env.AQICN_TOKEN || process.env.NEXT_PUBLIC_AQICN_TOKEN || 'demo_token';

async function testTelemetry() {
  console.log('🌍 [Telemetry Test Suite] Starting test run...');

  // Test 1: AQICN API
  console.log('🧪 [Test 1] Testing live AQICN API for Kuala Lumpur...');
  const lat = 3.139;
  const lng = 101.6869;
  const aqicnUrl = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${AQICN_TOKEN}`;
  
  const aqicnRes = await fetch(aqicnUrl);
  const aqicnData = await aqicnRes.json();
  
  assert.strictEqual(aqicnData.status, 'ok', 'AQICN response should be ok');
  assert.strictEqual(typeof aqicnData.data?.aqi, 'number', 'AQI should be a number');
  console.log(`  ✓ AQICN live station: ${aqicnData.data.attributions?.[0]?.name || aqicnData.data.city?.name}`);
  console.log(`  ✓ AQI: ${aqicnData.data.aqi} (Dominant pollutant: ${aqicnData.data.dominentpol})`);
  console.log('✅ [Test 1 Passed] AQICN ground station verified.\n');

  // Test 2: Open-Meteo Weather & Astronomical Time
  console.log('🧪 [Test 2] Testing Open-Meteo Weather & Timezone...');
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`;
  const weatherRes = await fetch(weatherUrl);
  const weatherData = await weatherRes.json();

  assert.strictEqual(typeof weatherData.current?.temperature_2m, 'number', 'Temperature should be a number');
  assert.strictEqual(typeof weatherData.current?.relative_humidity_2m, 'number', 'Humidity should be a number');
  assert.strictEqual(typeof weatherData.timezone, 'string', 'Timezone should be string');
  console.log(`  ✓ Temperature: ${weatherData.current.temperature_2m}°C`);
  console.log(`  ✓ Humidity: ${weatherData.current.relative_humidity_2m}%`);
  console.log(`  ✓ Timezone: ${weatherData.timezone}`);
  console.log(`  ✓ Astronomical Local Time: ${weatherData.current.time}`);
  console.log('✅ [Test 2 Passed] Open-Meteo weather & time verified.\n');

  // Test 3: BigDataCloud Reverse Geocoding
  console.log('🧪 [Test 3] Testing Reverse Geocoding...');
  const geoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
  const geoRes = await fetch(geoUrl);
  const geoData = await geoRes.json();

  assert.ok(geoData.city || geoData.principalSubdivision, 'City or subdivision must be present');
  console.log(`  ✓ Resolved: ${geoData.city || geoData.locality}, ${geoData.principalSubdivision}, ${geoData.countryName}`);
  console.log('✅ [Test 3 Passed] Reverse geocoding verified.\n');

  console.log('🎉 All Environmental Telemetry checks PASSED successfully!');
}

testTelemetry().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
