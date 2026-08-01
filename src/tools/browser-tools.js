/**
 * MCP Tools for AINative Browser Agent
 *
 * 8 tools for AI-powered browser automation:
 * 1. browser_act                - Perform an action on a web page (50 credits)
 * 2. browser_extract            - Extract structured data from a page (75 credits)
 * 3. browser_validate           - Validate content or state on a page (25 credits)
 * 4. browser_task               - Run a multi-step automation task (200 credits)
 * 5. browser_extract_to_table   - Extract data and store in ZeroDB table (100 credits)
 * 6. browser_enrich_memory      - Extract content and store in agent memory (100 credits)
 * 7. browser_batch_extract      - Extract from up to 10 URLs in one call (75 credits/URL)
 * 8. browser_enrich_memory_async - Queue async memory enrichment (100 credits)
 */

export const BROWSER_TOOLS = [
  {
    name: 'browser_act',
    description: 'Perform an action on a web page using AI-powered browser automation. Use when you need to click, type, navigate, or otherwise interact with a page. (50 credits)',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the web page to act on'
        },
        instruction: {
          type: 'string',
          description: 'Natural language instruction describing the action to perform (e.g. "Click the sign in button")'
        },
        max_steps: {
          type: 'integer',
          description: 'Maximum number of steps to attempt (default: 10, range: 1-50)',
          default: 10,
          minimum: 1,
          maximum: 50
        }
      },
      required: ['url', 'instruction']
    }
  },

  {
    name: 'browser_extract',
    description: 'Extract structured data from a web page. Use when you need to scrape, parse, or retrieve specific information from a URL. Returns data in structured JSON format. (75 credits)',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the web page to extract data from'
        },
        extract_goal: {
          type: 'string',
          description: 'Description of what data to extract (e.g. "Extract all product names and prices")'
        }
      },
      required: ['url', 'extract_goal']
    }
  },

  {
    name: 'browser_validate',
    description: 'Validate content or state on a web page. Use when you need to assert that specific content exists, a form was submitted, or a page reached an expected state. (25 credits)',
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the web page to validate'
        },
        assertion: {
          type: 'string',
          description: 'Natural language assertion to validate (e.g. "The page contains a success message")'
        }
      },
      required: ['url', 'assertion']
    }
  },

  {
    name: 'browser_task',
    description: 'Run a multi-step browser automation task. Use when you need to perform a complex, multi-step workflow on a web page (e.g. login and fill out a form). More capable than browser_act for complex flows. (200 credits)',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The starting URL for the task'
        },
        task_description: {
          type: 'string',
          description: 'Full description of the multi-step task to complete'
        },
        max_steps: {
          type: 'integer',
          description: 'Maximum number of steps to attempt (default: 15, range: 1-50)',
          default: 15,
          minimum: 1,
          maximum: 50
        }
      },
      required: ['url', 'task_description']
    }
  },

  {
    name: 'browser_extract_to_table',
    description: 'Extract structured data from a web page and store it directly in a ZeroDB NoSQL table. Use when you need to scrape data and persist it for later querying or analysis. (100 credits)',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the web page to extract data from'
        },
        table_name: {
          type: 'string',
          description: 'The ZeroDB table name to store extracted data into'
        },
        extract_goal: {
          type: 'string',
          description: 'Description of what data to extract and store'
        },
        project_id: {
          type: 'string',
          description: 'ZeroDB project ID for the target table'
        }
      },
      required: ['url', 'table_name', 'extract_goal', 'project_id']
    }
  },

  {
    name: 'browser_enrich_memory',
    description: 'Extract content from a web page and store it in agent memory (ZeroDB). Use when you want an agent to "remember" information from a URL for future recall. (100 credits)',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL of the web page to extract content from'
        },
        memory_type: {
          type: 'string',
          enum: ['episodic', 'semantic', 'procedural'],
          description: 'Type of memory to store: episodic (events), semantic (facts), procedural (how-to). Default: semantic',
          default: 'semantic'
        },
        extract_goal: {
          type: 'string',
          description: 'What to extract from the page for memory enrichment',
          default: 'Extract key facts'
        },
        project_id: {
          type: 'string',
          description: 'ZeroDB project ID for the memory store'
        }
      },
      required: ['url', 'project_id']
    }
  },

  {
    name: 'browser_batch_extract',
    description: 'Extract structured data from up to 10 URLs in a single call and store rows in a ZeroDB table. Use when you need to scrape multiple pages at once. (75 credits per URL)',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object',
      properties: {
        urls: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          maxItems: 10,
          description: 'List of URLs to extract data from (max 10)'
        },
        table_name: {
          type: 'string',
          description: 'ZeroDB table name to store extracted rows into'
        },
        extract_goal: {
          type: 'string',
          description: 'What data to extract from each page'
        },
        project_id: {
          type: 'string',
          description: 'ZeroDB project ID for the target table'
        }
      },
      required: ['urls', 'table_name', 'extract_goal', 'project_id']
    }
  },

  {
    name: 'browser_enrich_memory_async',
    description: 'Queue an async browser memory enrichment task. Returns a task_id immediately — the browser visits the URL and stores content in ZeroMemory in the background. (100 credits)',
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true
    },
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to visit and extract content from'
        },
        project_id: {
          type: 'string',
          description: 'ZeroDB project ID for the memory store'
        },
        memory_type: {
          type: 'string',
          enum: ['episodic', 'semantic', 'procedural'],
          description: 'Type of memory to store. Default: semantic',
          default: 'semantic'
        },
        extract_goal: {
          type: 'string',
          description: 'What to extract and remember from the page',
          default: 'Extract key facts and information'
        }
      },
      required: ['url', 'project_id']
    }
  }
];

/**
 * Execute browser tool
 */
export async function executeBrowserTool(toolName, args, client) {
  switch (toolName) {
    case 'browser_act':
      return await client.act({
        url: args.url,
        instruction: args.instruction,
        max_steps: args.max_steps
      });

    case 'browser_extract':
      return await client.extract({
        url: args.url,
        extract_goal: args.extract_goal
      });

    case 'browser_validate':
      return await client.validate({
        url: args.url,
        assertion: args.assertion
      });

    case 'browser_task':
      return await client.task({
        url: args.url,
        task_description: args.task_description,
        max_steps: args.max_steps
      });

    case 'browser_extract_to_table':
      return await client.extractToTable({
        url: args.url,
        table_name: args.table_name,
        extract_goal: args.extract_goal,
        project_id: args.project_id
      });

    case 'browser_enrich_memory':
      return await client.enrichMemory({
        url: args.url,
        memory_type: args.memory_type,
        extract_goal: args.extract_goal,
        project_id: args.project_id
      });

    case 'browser_batch_extract':
      return await client.batchExtract({
        urls: args.urls,
        table_name: args.table_name,
        extract_goal: args.extract_goal,
        project_id: args.project_id
      });

    case 'browser_enrich_memory_async':
      return await client.enrichMemoryAsync({
        url: args.url,
        project_id: args.project_id,
        memory_type: args.memory_type,
        extract_goal: args.extract_goal
      });

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}
