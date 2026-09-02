/**
 * BrowserClient auth fallback tests
 *
 * Regression coverage for: a configured AINATIVE_API_KEY that the server
 * rejects (401) must not be retried forever — the client should fall back
 * to AINATIVE_USERNAME/AINATIVE_PASSWORD login when available, and raise a
 * clear error when it isn't.
 */

import { describe, it, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { BrowserClient } from '../src/client/browser-client.js';

// Minimal fake API server: /api/v1/auth/login always succeeds; every other
// route requires header X-API-Key: valid-key or Authorization: Bearer <a
// token minted by our own /login>, else 401.
function startFakeServer() {
  const validSessionTokens = new Set();
  let loginCount = 0;
  let protectedRequests = [];

  const server = http.createServer((req, res) => {
    res.setHeader('Connection', 'close');
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      if (req.url === '/api/v1/auth/login' && req.method === 'POST') {
        loginCount += 1;
        const token = `session-token-${loginCount}`;
        validSessionTokens.add(token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ access_token: token }));
        return;
      }

      const apiKeyHeader = req.headers['x-api-key'];
      const authHeader = req.headers['authorization'];
      const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

      protectedRequests.push({ apiKeyHeader, bearer });

      const authorized = apiKeyHeader === 'valid-key' || (bearer && validSessionTokens.has(bearer));
      if (!authorized) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ detail: 'Unauthorized' }));
        return;
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    });
  });
  server.keepAliveTimeout = 1;
  server.unref();

  const sockets = new Set();
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
        getLoginCount: () => loginCount,
        getProtectedRequests: () => protectedRequests,
        close: () =>
          new Promise((r) => {
            for (const socket of sockets) socket.destroy();
            server.close(r);
          }),
      });
    });
  });
}

describe('BrowserClient auth fallback', () => {
  let fake;

  beforeEach(async () => {
    fake = await startFakeServer();
  });

  after(async () => {
    if (fake) await fake.close();
  });

  it('a rejected static API key falls back to username/password login and completes the request', async () => {
    const client = new BrowserClient({
      apiUrl: fake.url,
      apiKey: 'stale-dead-key',
      username: 'admin@example.com',
      password: 'correct-password',
    });

    const result = await client.request('GET', '/api/v1/public/browser/extract');

    assert.deepStrictEqual(result, { success: true });
    assert.strictEqual(fake.getLoginCount(), 1, 'should have logged in exactly once as fallback');

    const reqs = fake.getProtectedRequests();
    assert.strictEqual(reqs[0].apiKeyHeader, 'stale-dead-key', 'first attempt should use the stale key');
    assert.strictEqual(reqs[1].bearer, 'session-token-1', 'retry should use the fresh session token');
  });

  it('a second call after fallback goes straight to username/password, skipping the dead key', async () => {
    const client = new BrowserClient({
      apiUrl: fake.url,
      apiKey: 'stale-dead-key',
      username: 'admin@example.com',
      password: 'correct-password',
    });

    await client.request('GET', '/api/v1/public/browser/extract');
    await client.request('GET', '/api/v1/public/browser/extract');

    assert.strictEqual(fake.getLoginCount(), 1, 'token from first fallback login should be reused, not re-logged-in');

    const reqs = fake.getProtectedRequests();
    // First call: [stale key attempt, bearer retry]. Second call: [bearer only].
    assert.strictEqual(reqs.length, 3);
    assert.strictEqual(reqs[2].bearer, 'session-token-1');
    assert.strictEqual(reqs[2].apiKeyHeader, undefined);
  });

  it('a rejected API key with no username/password configured throws a clear, actionable error', async () => {
    const client = new BrowserClient({
      apiUrl: fake.url,
      apiKey: 'stale-dead-key',
    });

    await assert.rejects(
      () => client.request('GET', '/api/v1/public/browser/extract'),
      (err) => {
        assert.match(err.message, /rejected/i);
        assert.match(err.message, /AINATIVE_USERNAME/);
        return true;
      }
    );
  });

  it('a valid static API key never triggers a fallback login', async () => {
    const client = new BrowserClient({
      apiUrl: fake.url,
      apiKey: 'valid-key',
      username: 'admin@example.com',
      password: 'correct-password',
    });

    const result = await client.request('GET', '/api/v1/public/browser/extract');

    assert.deepStrictEqual(result, { success: true });
    assert.strictEqual(fake.getLoginCount(), 0, 'a working API key should never need the password fallback');
  });
});
