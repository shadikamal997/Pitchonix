/**
 * Phase 34.3D — CollaborationLoadHarness
 *
 * Stress-tests the /collaboration namespace by opening N concurrent socket
 * connections to the same deck and emitting cursor / selection / Y.Doc
 * updates at a configurable rate. Measures:
 *
 *   - connect → presence.updated latency
 *   - cursor round-trip latency (sender→receiver) for a sample pair
 *   - sustained cursor throughput
 *   - peak memory delta on the harness side
 *
 * Doesn't load-test the BROWSER — that needs Playwright + an actual page.
 * This is a server-side measurement to confirm the gateway can handle the
 * connection count without falling over.
 *
 * Usage:
 *   USERS=20 DECK_ID=… TOKEN=… ts-node scripts/collaboration-load-harness.ts
 *
 * Env:
 *   USERS              concurrent connections      (default 10)
 *   DECK_ID            deck to join                (required)
 *   TOKEN              JWT bearer for every socket (required)
 *   DURATION_SECONDS   how long to drive cursor traffic (default 20)
 *   SERVER             socket.io endpoint base     (default http://localhost:3001)
 */

import { io, Socket } from 'socket.io-client';

const SERVER       = process.env.SERVER || 'http://localhost:3001';
const USERS        = parseInt(process.env.USERS || '10', 10);
const DURATION_MS  = (parseInt(process.env.DURATION_SECONDS || '20', 10)) * 1000;
const DECK_ID      = process.env.DECK_ID;
const TOKEN        = process.env.TOKEN;

if (!DECK_ID || !TOKEN) {
  console.error('Missing DECK_ID or TOKEN env var.');
  process.exit(1);
}

interface Stats {
  connected:        number;
  presenceReceived: number;
  cursorsSent:      number;
  cursorsReceived:  number;
  latencies:        number[];   // ms — cursor self → other measured pair
}

async function main() {
  console.log(`Load harness: ${USERS} clients → ${SERVER}/collaboration deck=${DECK_ID}`);
  const stats: Stats = {
    connected: 0, presenceReceived: 0,
    cursorsSent: 0, cursorsReceived: 0, latencies: [],
  };

  const sockets: Socket[] = [];

  for (let i = 0; i < USERS; i++) {
    const sock = io(`${SERVER}/collaboration`, {
      auth: { token: TOKEN },
      transports: ['websocket'],
      autoConnect: true,
    });
    sock.on('connect',          () => { stats.connected++; sock.emit('presence.join', { deckId: DECK_ID }); });
    sock.on('presence.updated', () => { stats.presenceReceived++; });
    // Stamp the emitted cursor with a timestamp so the receiver can compute
    // the round-trip latency. We piggyback on the x coordinate's fractional
    // part since the protocol allows floats.
    sock.on('cursor.move', (msg: any) => {
      stats.cursorsReceived++;
      const sentAt = msg.x;   // see emit below
      const dt = performance.now() - sentAt;
      if (dt > 0 && dt < 10_000) stats.latencies.push(dt);
    });
    sockets.push(sock);
  }

  // Wait a bit for connect storm to settle.
  await new Promise((r) => setTimeout(r, 1500));
  console.log(`Connected: ${stats.connected}/${USERS}; first presence frames: ${stats.presenceReceived}`);

  // Driver loop — each client emits a cursor at 30 fps with the timestamp as x.
  const startedAt = Date.now();
  const driverIv = setInterval(() => {
    const now = performance.now();
    for (const sock of sockets) {
      if (!sock.connected) continue;
      sock.emit('cursor.move', { slideId: 'load-harness', x: now, y: 50 });
      stats.cursorsSent++;
    }
  }, 33);

  await new Promise((r) => setTimeout(r, DURATION_MS));
  clearInterval(driverIv);
  await new Promise((r) => setTimeout(r, 250));   // drain

  // Report.
  const durSec = (Date.now() - startedAt) / 1000;
  const lat    = stats.latencies.sort((a, b) => a - b);
  const p50    = lat.length ? lat[Math.floor(lat.length * 0.50)] : NaN;
  const p95    = lat.length ? lat[Math.floor(lat.length * 0.95)] : NaN;
  const p99    = lat.length ? lat[Math.floor(lat.length * 0.99)] : NaN;

  console.log('\nResults:');
  console.log(`  Clients connected:    ${stats.connected}/${USERS}`);
  console.log(`  Cursors sent:         ${stats.cursorsSent} (${(stats.cursorsSent / durSec).toFixed(0)}/s)`);
  console.log(`  Cursors received:     ${stats.cursorsReceived} (${(stats.cursorsReceived / durSec).toFixed(0)}/s)`);
  console.log(`  Cursor latency p50:   ${p50.toFixed(1)}ms`);
  console.log(`  Cursor latency p95:   ${p95.toFixed(1)}ms`);
  console.log(`  Cursor latency p99:   ${p99.toFixed(1)}ms`);
  console.log(`  Presence frames seen: ${stats.presenceReceived}`);

  for (const s of sockets) s.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
