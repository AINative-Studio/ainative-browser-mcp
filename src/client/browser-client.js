/**
 * AINative Browser Agent API Client
 * Supports both ZeroLocal (localhost:8000) and AINative Cloud (api.ainative.studio)
 * Auto-detects available endpoint
 */

import axios from 'axios';

export class BrowserClient {
  constructor(config = {}) {
    this.apiUrl = config.apiUrl || process.env.AINATIVE_API_URL || null;
    this.apiKey = config.apiKey || process.env.AINATIVE_API_KEY;
    this.username = config.username || process.env.AINATIVE_USERNAME;
    this.password = config.password || process.env.AINATIVE_PASSWORD;
    this.token = null;
    this.tokenExpiry = null;
    this.isLocal = false;
  }

  async initialize() {
    if (!this.apiUrl) {
      this.apiUrl = await this.autoDetectEndpoint();
    }
    this.isLocal = this.apiUrl.includes('localhost') || this.apiUrl.includes('127.0.0.1');
    console.error(this.isLocal
      ? '🏠 Using ZeroLocal (localhost:8000)'
      : '☁️  Using AINative Cloud (api.ainative.studio)'
    );
    await this.authenticate();
    return this;
  }

  async autoDetectEndpoint() {
    const localUrl = 'http://localhost:8000';
    const cloudUrl = 'https://api.ainative.studio';
    try {
      const response = await axios.get(`${localUrl}/health`, { timeout: 2000 });
      if (response.status === 200) {
        console.error('✅ ZeroLocal detected');
        return localUrl;
      }
    } catch (_) {}
    console.error('⚠️  ZeroLocal not available, using AINative Cloud');
    return cloudUrl;
  }

  /**
   * Log in with username/password and cache the resulting session token.
   * Split out from authenticate() so a 401-on-API-key retry can call this
   * directly without re-checking `this.apiKey` first (see authenticate()'s
   * own doc for why that check order matters).
   */
  async loginWithPassword() {
    const response = await axios.post(`${this.apiUrl}/api/v1/auth/login`, {
      email: this.username,
      password: this.password
    });
    this.token = response.data.access_token;
    this.tokenExpiry = Date.now() + (50 * 60 * 1000);
    // Once we've had to fall back to a real login, stop trusting the static
    // key for the rest of this process's lifetime — it's already proven
    // stale/invalid once; retrying it on every subsequent 401 would just
    // repeat the same failed request pointlessly. `usingFallbackAuth` also
    // tells request() to send Authorization: Bearer instead of X-API-Key.
    this.usingFallbackAuth = true;
    console.error('✅ Authenticated with username/password (fallback from a rejected API key)');
  }

  async authenticate() {
    if (this.apiKey && !this.usingFallbackAuth) {
      this.token = this.apiKey;
      this.tokenExpiry = null;
      console.error('✅ Using API key authentication');
      return;
    }
    if (this.username && this.password) {
      await this.loginWithPassword();
      return;
    }
    if (this.apiKey) {
      // usingFallbackAuth is true but there's no username/password to fall
      // back to — nothing left to try. Surface a clear, actionable error
      // rather than silently re-using the same key that already failed.
      throw new Error(
        'AINATIVE_API_KEY was rejected (401) and no AINATIVE_USERNAME/AINATIVE_PASSWORD ' +
        'is configured to fall back to. The API key is likely expired, revoked, or invalid ' +
        '— generate a fresh one, or set username/password credentials as a fallback.'
      );
    }
    throw new Error('Either AINATIVE_API_KEY or (AINATIVE_USERNAME + AINATIVE_PASSWORD) are required');
  }

  async ensureAuthenticated() {
    if (!this.token || (this.tokenExpiry && Date.now() >= this.tokenExpiry)) {
      await this.authenticate();
    }
  }

  async request(method, path, data = null) {
    await this.ensureAuthenticated();
    const headers = { 'Content-Type': 'application/json' };
    if (this.apiKey && !this.usingFallbackAuth) {
      headers['X-API-Key'] = this.token;
    } else {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const config = { method, url: `${this.apiUrl}${path}`, headers };
    if (data) config.data = data;
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401 && !config._retried) {
        this.token = null;
        this.tokenExpiry = null;
        // A rejected static API key can NEVER be fixed by re-authenticating
        // with itself — authenticate() would just re-assign the same dead
        // value to this.token and the retry would 401 again identically.
        // If real username/password credentials are ALSO configured, use
        // them for the retry instead of the API key that just failed.
        // Otherwise, surface authenticate()'s clear "no fallback available"
        // error immediately rather than burning a retry on the same key.
        if (this.apiKey && !this.usingFallbackAuth) {
          if (this.username && this.password) {
            console.error('⚠️  API key rejected (401) — falling back to username/password login');
            await this.loginWithPassword();
          } else {
            this.usingFallbackAuth = true; // force authenticate() past the dead-key branch
            await this.authenticate();
          }
        } else {
          await this.authenticate();
        }
        if (this.apiKey && !this.usingFallbackAuth) headers['X-API-Key'] = this.token;
        else headers['Authorization'] = `Bearer ${this.token}`;
        config._retried = true;
        const retry = await axios(config);
        return retry.data;
      }
      throw new Error(`API error: ${error.response?.data?.detail || error.message}`);
    }
  }

  // Browser tool methods
  async act({ url, instruction, max_steps = 10 }) {
    return this.request('POST', '/api/v1/public/browser/act', { url, instruction, max_steps });
  }
  async extract({ url, extract_goal }) {
    return this.request('POST', '/api/v1/public/browser/extract', { url, extract_goal });
  }
  async validate({ url, assertion }) {
    return this.request('POST', '/api/v1/public/browser/validate', { url, assertion });
  }
  async task({ url, task_description, max_steps = 15 }) {
    return this.request('POST', '/api/v1/public/browser/task', { url, task_description, max_steps });
  }
  async extractToTable({ url, table_name, extract_goal, project_id }) {
    return this.request('POST', '/api/v1/public/browser/extract-to-table', { url, table_name, extract_goal, project_id });
  }
  async enrichMemory({ url, memory_type = 'semantic', extract_goal = 'Extract key facts', project_id }) {
    return this.request('POST', '/api/v1/public/browser/enrich-memory', {
      url,
      prompt: extract_goal,
      memory_type,
      project_id,
    });
  }

  async batchExtract({ urls, table_name, extract_goal, project_id }) {
    return this.request('POST', '/api/v1/public/browser/batch-extract', {
      urls,
      table_name,
      extract_goal,
      project_id,
    });
  }

  async enrichMemoryAsync({ url, project_id, memory_type = 'semantic', extract_goal = 'Extract key facts and information' }) {
    return this.request('POST', '/api/v1/public/browser/enrich-memory-async', {
      url,
      project_id,
      memory_type,
      extract_goal,
    });
  }
}
