/**
 * Browser Tools Tests
 *
 * Tests for all 6 browser MCP tools:
 * - Tool definitions (BROWSER_TOOLS array)
 * - Tool execution via executeBrowserTool
 * - Mock client patterns
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { BROWSER_TOOLS, executeBrowserTool } from '../src/tools/browser-tools.js';

// Mock BrowserClient
class MockBrowserClient {
  constructor() {
    this.calls = [];
  }

  async act({ url, instruction, max_steps }) {
    this.calls.push({ method: 'act', url, instruction, max_steps });
    return { success: true, action: 'clicked', url, steps_taken: 1 };
  }

  async extract({ url, extract_goal }) {
    this.calls.push({ method: 'extract', url, extract_goal });
    return { success: true, data: [{ name: 'Product A', price: '$10' }], url };
  }

  async validate({ url, assertion }) {
    this.calls.push({ method: 'validate', url, assertion });
    return { passed: true, assertion, url };
  }

  async task({ url, task_description, max_steps }) {
    this.calls.push({ method: 'task', url, task_description, max_steps });
    return { success: true, steps_completed: 3, url };
  }

  async extractToTable({ url, table_name, extract_goal, project_id }) {
    this.calls.push({ method: 'extractToTable', url, table_name, extract_goal, project_id });
    return { rows_inserted: 5, table_name, url };
  }

  async enrichMemory({ url, memory_type, extract_goal, project_id }) {
    this.calls.push({ method: 'enrichMemory', url, memory_type, extract_goal, project_id });
    return { stored: true, memory_id: 'mem_123', url };
  }

  reset() {
    this.calls = [];
  }
}

describe('BROWSER_TOOLS array', () => {
  it('should contain all 8 tools', () => {
    assert.strictEqual(BROWSER_TOOLS.length, 8);
  });

  it('should include browser_act', () => {
    const tool = BROWSER_TOOLS.find(t => t.name === 'browser_act');
    assert.ok(tool, 'browser_act should exist');
  });

  it('should include browser_extract', () => {
    const tool = BROWSER_TOOLS.find(t => t.name === 'browser_extract');
    assert.ok(tool, 'browser_extract should exist');
  });

  it('should include browser_validate', () => {
    const tool = BROWSER_TOOLS.find(t => t.name === 'browser_validate');
    assert.ok(tool, 'browser_validate should exist');
  });

  it('should include browser_task', () => {
    const tool = BROWSER_TOOLS.find(t => t.name === 'browser_task');
    assert.ok(tool, 'browser_task should exist');
  });

  it('should include browser_extract_to_table', () => {
    const tool = BROWSER_TOOLS.find(t => t.name === 'browser_extract_to_table');
    assert.ok(tool, 'browser_extract_to_table should exist');
  });

  it('should include browser_enrich_memory', () => {
    const tool = BROWSER_TOOLS.find(t => t.name === 'browser_enrich_memory');
    assert.ok(tool, 'browser_enrich_memory should exist');
  });

  it('each tool should have name, description, and inputSchema', () => {
    for (const tool of BROWSER_TOOLS) {
      assert.ok(tool.name, `Tool should have name`);
      assert.ok(tool.description, `${tool.name} should have description`);
      assert.ok(tool.inputSchema, `${tool.name} should have inputSchema`);
      assert.strictEqual(tool.inputSchema.type, 'object', `${tool.name} inputSchema should be object type`);
    }
  });

  it('each tool should have MCP annotations', () => {
    for (const tool of BROWSER_TOOLS) {
      assert.ok(tool.annotations, `${tool.name} should have annotations`);
      assert.strictEqual(typeof tool.annotations.readOnlyHint, 'boolean', `${tool.name} should have readOnlyHint`);
      assert.strictEqual(typeof tool.annotations.destructiveHint, 'boolean', `${tool.name} should have destructiveHint`);
      assert.strictEqual(typeof tool.annotations.idempotentHint, 'boolean', `${tool.name} should have idempotentHint`);
      assert.strictEqual(typeof tool.annotations.openWorldHint, 'boolean', `${tool.name} should have openWorldHint`);
    }
  });

  it('browser_extract should be readOnly', () => {
    const tool = BROWSER_TOOLS.find(t => t.name === 'browser_extract');
    assert.strictEqual(tool.annotations.readOnlyHint, true);
  });

  it('browser_validate should be readOnly', () => {
    const tool = BROWSER_TOOLS.find(t => t.name === 'browser_validate');
    assert.strictEqual(tool.annotations.readOnlyHint, true);
  });

  it('browser_act should not be readOnly', () => {
    const tool = BROWSER_TOOLS.find(t => t.name === 'browser_act');
    assert.strictEqual(tool.annotations.readOnlyHint, false);
  });

  it('each tool description should mention credit cost', () => {
    for (const tool of BROWSER_TOOLS) {
      assert.ok(
        tool.description.includes('credits'),
        `${tool.name} description should mention credit cost`
      );
    }
  });
});

describe('executeBrowserTool', () => {
  let client;

  before(() => {
    client = new MockBrowserClient();
  });

  it('browser_extract called → mock client.extract() → returns data', async () => {
    client.reset();
    const result = await executeBrowserTool('browser_extract', {
      url: 'https://example.com',
      extract_goal: 'Extract product names and prices'
    }, client);

    assert.ok(result.success, 'Should return success');
    assert.ok(Array.isArray(result.data), 'Should return data array');
    assert.strictEqual(client.calls.length, 1);
    assert.strictEqual(client.calls[0].method, 'extract');
    assert.strictEqual(client.calls[0].url, 'https://example.com');
  });

  it('browser_act called → mock client.act() → returns formatted content', async () => {
    client.reset();
    const result = await executeBrowserTool('browser_act', {
      url: 'https://example.com',
      instruction: 'Click the sign in button'
    }, client);

    assert.ok(result.success, 'Should return success');
    assert.strictEqual(result.action, 'clicked');
    assert.strictEqual(client.calls.length, 1);
    assert.strictEqual(client.calls[0].method, 'act');
    assert.strictEqual(client.calls[0].instruction, 'Click the sign in button');
  });

  it('browser_validate with valid args → mock returns { passed: true }', async () => {
    client.reset();
    const result = await executeBrowserTool('browser_validate', {
      url: 'https://example.com',
      assertion: 'The page contains a success message'
    }, client);

    assert.strictEqual(result.passed, true);
    assert.strictEqual(client.calls[0].method, 'validate');
    assert.strictEqual(client.calls[0].assertion, 'The page contains a success message');
  });

  it('browser_task with max_steps → forwarded to client correctly', async () => {
    client.reset();
    const result = await executeBrowserTool('browser_task', {
      url: 'https://example.com',
      task_description: 'Login and fill out the contact form',
      max_steps: 20
    }, client);

    assert.ok(result.success, 'Should return success');
    assert.strictEqual(client.calls[0].method, 'task');
    assert.strictEqual(client.calls[0].max_steps, 20);
    assert.strictEqual(client.calls[0].task_description, 'Login and fill out the contact form');
  });

  it('browser_extract_to_table → mock returns { rows_inserted: 5 }', async () => {
    client.reset();
    const result = await executeBrowserTool('browser_extract_to_table', {
      url: 'https://example.com/products',
      table_name: 'products',
      extract_goal: 'Extract all products',
      project_id: 'proj_123'
    }, client);

    assert.strictEqual(result.rows_inserted, 5);
    assert.strictEqual(result.table_name, 'products');
    assert.strictEqual(client.calls[0].method, 'extractToTable');
    assert.strictEqual(client.calls[0].project_id, 'proj_123');
  });

  it('browser_enrich_memory → mock returns { stored: true, memory_id: "mem_123" }', async () => {
    client.reset();
    const result = await executeBrowserTool('browser_enrich_memory', {
      url: 'https://example.com/blog',
      memory_type: 'semantic',
      extract_goal: 'Extract key facts about the company',
      project_id: 'proj_456'
    }, client);

    assert.strictEqual(result.stored, true);
    assert.strictEqual(result.memory_id, 'mem_123');
    assert.strictEqual(client.calls[0].method, 'enrichMemory');
    assert.strictEqual(client.calls[0].memory_type, 'semantic');
  });

  it('unknown tool → executeBrowserTool throws an error', async () => {
    await assert.rejects(
      async () => {
        await executeBrowserTool('browser_unknown_tool', {}, client);
      },
      (err) => {
        assert.ok(err instanceof Error, 'Should throw Error');
        assert.ok(err.message.includes('Unknown tool'), 'Error message should mention Unknown tool');
        return true;
      }
    );
  });
});
