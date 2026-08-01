#!/usr/bin/env node

/**
 * AINative Browser Agent MCP Server
 *
 * AI-powered browser automation tools for agents:
 * - 6 tools: act, extract, validate, task, extract-to-table, enrich-memory
 * - Auto-detects ZeroLocal (localhost:8000) or AINative Cloud
 * - Supports API key and username/password authentication
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';

import { BrowserClient } from './src/client/browser-client.js';
import { BROWSER_TOOLS, executeBrowserTool } from './src/tools/browser-tools.js';

// Load environment variables
dotenv.config();

// Configuration
const config = {
  apiUrl: process.env.AINATIVE_API_URL,
  apiKey: process.env.AINATIVE_API_KEY,
  username: process.env.AINATIVE_USERNAME,
  password: process.env.AINATIVE_PASSWORD,
};

// Global client instance
let client = null;

/**
 * Initialize browser client
 */
async function initialize() {
  console.error('\n===========================================');
  console.error('  AINative Browser Agent MCP Server v1.1.0');
  console.error('  AI-Powered Browser Automation for Agents');
  console.error('===========================================\n');

  client = new BrowserClient(config);
  await client.initialize();

  console.error('\n✅ 6 browser tools loaded');
  console.error('✅ Ready for agent connections!\n');
}

/**
 * Create and configure MCP server
 */
function createServer() {
  const server = new Server(
    {
      name: 'ainative-browser-mcp',
      version: '1.1.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: BROWSER_TOOLS
    };
  });

  // Execute tool
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      const result = await executeBrowserTool(name, args || {}, client);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }
        ]
      };
    } catch (e) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${e.message}`
          }
        ],
        isError: true
      };
    }
  });

  return server;
}

/**
 * Main entry point
 */
async function main() {
  try {
    await initialize();

    const server = createServer();

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('📡 MCP Server connected and ready\n');
  } catch (error) {
    console.error('\n❌ Failed to start server:', error.message);
    console.error('\nPlease check:');
    console.error('  • AINATIVE_API_KEY is set (get one at https://ainative.studio/dashboard)');
    console.error('  • OR AINATIVE_USERNAME and AINATIVE_PASSWORD are set');
    console.error('  • ZeroLocal is running (if using localhost)');
    console.error('  • Network connection (if using cloud)\n');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.error('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
