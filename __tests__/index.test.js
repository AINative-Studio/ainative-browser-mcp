'use strict'

jest.mock('node-fetch')

const fetch = require('node-fetch')
const BrowserMCPServer = require('../index')

// Helper to build a mock Response
function mockResponse (status, body) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return {
    ok: status >= 200 && status < 300,
    status,
    text: jest.fn().mockResolvedValue(text)
  }
}

describe('BrowserMCPServer', () => {
  let server

  beforeEach(() => {
    // Reset env and mocks before each test
    jest.clearAllMocks()
    process.env.AINATIVE_API_KEY = 'test-api-key'
    process.env.AINATIVE_API_BASE = 'https://api.ainative.studio'
    server = new BrowserMCPServer()
  })

  afterEach(() => {
    delete process.env.AINATIVE_API_KEY
    delete process.env.AINATIVE_API_BASE
  })

  // ==================== tools/list tests ====================

  describe('tools/list — all 6 tools present', () => {
    let tools

    beforeAll(async () => {
      process.env.AINATIVE_API_KEY = 'test-api-key'
      const s = new BrowserMCPServer()
      // Reach into the registered handler by simulating ListToolsRequestSchema
      // The SDK wraps handlers and validates; call the raw stored handler directly
      const handler = s.server._requestHandlers.get('tools/list')
      const result = await handler({ method: 'tools/list', params: {} })
      tools = result.tools
    })

    const expectedTools = [
      'browser_act',
      'browser_extract',
      'browser_validate',
      'browser_task',
      'browser_extract_to_table',
      'browser_enrich_memory'
    ]

    test('returns exactly 6 tools', () => {
      expect(tools).toHaveLength(6)
    })

    expectedTools.forEach((toolName) => {
      test(`includes tool "${toolName}"`, () => {
        const tool = tools.find(t => t.name === toolName)
        expect(tool).toBeDefined()
      })

      test(`"${toolName}" has name, description, and inputSchema`, () => {
        const tool = tools.find(t => t.name === toolName)
        expect(tool.name).toBe(toolName)
        expect(typeof tool.description).toBe('string')
        expect(tool.description.length).toBeGreaterThan(0)
        expect(tool.inputSchema).toBeDefined()
        expect(tool.inputSchema.type).toBe('object')
        expect(tool.inputSchema.properties).toBeDefined()
        expect(Array.isArray(tool.inputSchema.required)).toBe(true)
      })
    })

    test('browser_act requires url and instruction', () => {
      const tool = tools.find(t => t.name === 'browser_act')
      expect(tool.inputSchema.required).toContain('url')
      expect(tool.inputSchema.required).toContain('instruction')
    })

    test('browser_extract requires url and extract_goal', () => {
      const tool = tools.find(t => t.name === 'browser_extract')
      expect(tool.inputSchema.required).toContain('url')
      expect(tool.inputSchema.required).toContain('extract_goal')
    })

    test('browser_validate requires url and assertion', () => {
      const tool = tools.find(t => t.name === 'browser_validate')
      expect(tool.inputSchema.required).toContain('url')
      expect(tool.inputSchema.required).toContain('assertion')
    })

    test('browser_task requires url and task_description', () => {
      const tool = tools.find(t => t.name === 'browser_task')
      expect(tool.inputSchema.required).toContain('url')
      expect(tool.inputSchema.required).toContain('task_description')
    })

    test('browser_extract_to_table requires url, table_name, extract_goal, project_id', () => {
      const tool = tools.find(t => t.name === 'browser_extract_to_table')
      expect(tool.inputSchema.required).toContain('url')
      expect(tool.inputSchema.required).toContain('table_name')
      expect(tool.inputSchema.required).toContain('extract_goal')
      expect(tool.inputSchema.required).toContain('project_id')
    })

    test('browser_enrich_memory requires url and project_id', () => {
      const tool = tools.find(t => t.name === 'browser_enrich_memory')
      expect(tool.inputSchema.required).toContain('url')
      expect(tool.inputSchema.required).toContain('project_id')
    })

    test('all tools have annotations', () => {
      tools.forEach(tool => {
        expect(tool.annotations).toBeDefined()
        expect(typeof tool.annotations.readOnlyHint).toBe('boolean')
        expect(typeof tool.annotations.destructiveHint).toBe('boolean')
        expect(typeof tool.annotations.idempotentHint).toBe('boolean')
        expect(typeof tool.annotations.openWorldHint).toBe('boolean')
      })
    })

    test('browser_extract is readOnly', () => {
      const tool = tools.find(t => t.name === 'browser_extract')
      expect(tool.annotations.readOnlyHint).toBe(true)
    })

    test('browser_validate is readOnly', () => {
      const tool = tools.find(t => t.name === 'browser_validate')
      expect(tool.annotations.readOnlyHint).toBe(true)
    })

    test('browser_act is not readOnly', () => {
      const tool = tools.find(t => t.name === 'browser_act')
      expect(tool.annotations.readOnlyHint).toBe(false)
    })

    test('all tools have openWorldHint: true', () => {
      tools.forEach(tool => {
        expect(tool.annotations.openWorldHint).toBe(true)
      })
    })
  })

  // ==================== tool call tests ====================

  describe('browser_extract — successful call', () => {
    test('returns JSON content from API', async () => {
      const mockData = { data: [{ title: 'Test Product', price: '$9.99' }] }
      fetch.mockResolvedValue(mockResponse(200, mockData))

      const result = await server.routeToolCall('browser_extract', {
        url: 'https://example.com/products',
        extract_goal: 'Extract all product names and prices'
      })

      expect(result.isError).toBeFalsy()
      expect(result.content).toHaveLength(1)
      expect(result.content[0].type).toBe('text')
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toEqual(mockData)
    })

    test('calls the correct endpoint with X-API-Key header', async () => {
      fetch.mockResolvedValue(mockResponse(200, { success: true }))

      await server.routeToolCall('browser_extract', {
        url: 'https://example.com',
        extract_goal: 'Get all headings'
      })

      expect(fetch).toHaveBeenCalledTimes(1)
      const [calledUrl, calledOptions] = fetch.mock.calls[0]
      expect(calledUrl).toBe('https://api.ainative.studio/api/v1/public/browser/extract')
      expect(calledOptions.headers['X-API-Key']).toBe('test-api-key')
      expect(calledOptions.method).toBe('POST')
    })
  })

  describe('browser_act — successful call', () => {
    test('returns JSON content from API', async () => {
      const mockData = { status: 'completed', steps_taken: 2 }
      fetch.mockResolvedValue(mockResponse(200, mockData))

      const result = await server.routeToolCall('browser_act', {
        url: 'https://example.com',
        instruction: 'Click the login button',
        max_steps: 5
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toEqual(mockData)
    })

    test('uses default max_steps of 10 when not provided', async () => {
      fetch.mockResolvedValue(mockResponse(200, { ok: true }))

      await server.routeToolCall('browser_act', {
        url: 'https://example.com',
        instruction: 'Click button'
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.max_steps).toBe(10)
    })

    test('calls the correct endpoint', async () => {
      fetch.mockResolvedValue(mockResponse(200, {}))

      await server.routeToolCall('browser_act', {
        url: 'https://example.com',
        instruction: 'Test action'
      })

      expect(fetch.mock.calls[0][0]).toBe('https://api.ainative.studio/api/v1/public/browser/act')
    })
  })

  describe('browser_validate — successful call', () => {
    test('returns result from API', async () => {
      const mockData = { valid: true, details: 'Success message found' }
      fetch.mockResolvedValue(mockResponse(200, mockData))

      const result = await server.routeToolCall('browser_validate', {
        url: 'https://example.com/success',
        assertion: 'Page shows a success message'
      })

      expect(result.isError).toBeFalsy()
      const parsed = JSON.parse(result.content[0].text)
      expect(parsed).toEqual(mockData)
    })
  })

  describe('browser_task — successful call', () => {
    test('returns result and uses default max_steps 15', async () => {
      fetch.mockResolvedValue(mockResponse(200, { completed: true }))

      await server.routeToolCall('browser_task', {
        url: 'https://example.com',
        task_description: 'Log in and submit the form'
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.max_steps).toBe(15)
    })
  })

  describe('browser_extract_to_table — successful call', () => {
    test('passes all required fields in request body', async () => {
      fetch.mockResolvedValue(mockResponse(200, { rows_inserted: 5 }))

      await server.routeToolCall('browser_extract_to_table', {
        url: 'https://example.com/data',
        table_name: 'products',
        extract_goal: 'Get all products',
        project_id: 'proj-123'
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.url).toBe('https://example.com/data')
      expect(body.table_name).toBe('products')
      expect(body.extract_goal).toBe('Get all products')
      expect(body.project_id).toBe('proj-123')
    })
  })

  describe('browser_enrich_memory — successful call', () => {
    test('uses default memory_type and extract_goal when not provided', async () => {
      fetch.mockResolvedValue(mockResponse(200, { memory_id: 'mem-abc' }))

      await server.routeToolCall('browser_enrich_memory', {
        url: 'https://example.com/article',
        project_id: 'proj-123'
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.memory_type).toBe('semantic')
      expect(body.extract_goal).toBe('Extract key facts')
    })

    test('respects provided memory_type', async () => {
      fetch.mockResolvedValue(mockResponse(200, {}))

      await server.routeToolCall('browser_enrich_memory', {
        url: 'https://example.com',
        memory_type: 'episodic',
        extract_goal: 'Get timeline of events',
        project_id: 'proj-456'
      })

      const body = JSON.parse(fetch.mock.calls[0][1].body)
      expect(body.memory_type).toBe('episodic')
    })
  })

  // ==================== error handling tests ====================

  describe('missing AINATIVE_API_KEY', () => {
    test('returns isError: true with helpful message', async () => {
      delete process.env.AINATIVE_API_KEY
      const s = new BrowserMCPServer()

      const result = await s.routeToolCall('browser_extract', {
        url: 'https://example.com',
        extract_goal: 'test'
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('AINATIVE_API_KEY')
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  describe('HTTP 402 from API', () => {
    test('returns isError: true with error message', async () => {
      fetch.mockResolvedValue(mockResponse(402, 'Insufficient credits'))

      const result = await server.routeToolCall('browser_act', {
        url: 'https://example.com',
        instruction: 'Click button'
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('402')
    })
  })

  describe('HTTP 401 from API', () => {
    test('returns isError: true with error message', async () => {
      fetch.mockResolvedValue(mockResponse(401, 'Unauthorized'))

      const result = await server.routeToolCall('browser_extract', {
        url: 'https://example.com',
        extract_goal: 'test'
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('401')
    })
  })

  describe('HTTP 500 from API', () => {
    test('returns isError: true', async () => {
      fetch.mockResolvedValue(mockResponse(500, 'Internal Server Error'))

      const result = await server.routeToolCall('browser_task', {
        url: 'https://example.com',
        task_description: 'Do something'
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('500')
    })
  })

  describe('unknown tool name', () => {
    test('returns isError: true', async () => {
      const result = await server.routeToolCall('browser_does_not_exist', {})

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('Unknown tool')
    })
  })

  describe('network error', () => {
    test('returns isError: true on fetch throw', async () => {
      fetch.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await server.routeToolCall('browser_extract', {
        url: 'https://example.com',
        extract_goal: 'test'
      })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('ECONNREFUSED')
    })
  })

  // ==================== non-JSON response body ====================

  describe('non-JSON response body', () => {
    test('returns plain text when API returns non-JSON 200', async () => {
      fetch.mockResolvedValue(mockResponse(200, 'plain text response'))

      const result = await server.routeToolCall('browser_validate', {
        url: 'https://example.com',
        assertion: 'page loaded'
      })

      expect(result.isError).toBeFalsy()
      // JSON.stringify on a string wraps it in quotes
      expect(result.content[0].text).toContain('plain text response')
    })
  })

  // ==================== setupHandlers route (via routeToolCall) ====================

  describe('setupHandlers — error propagation', () => {
    test('handler catches thrown error and returns isError', async () => {
      // Simulate a situation where routeToolCall throws (API key check throws internally)
      fetch.mockImplementation(() => { throw new Error('Unexpected sync throw') })

      // This goes through callBrowserEndpoint which catches fetch errors
      const result = await server.routeToolCall('browser_act', {
        url: 'https://example.com',
        instruction: 'test'
      })

      expect(result.isError).toBe(true)
    })
  })

  // ==================== start() method ====================

  describe('start()', () => {
    test('calls process.exit on connect failure', async () => {
      const s = new BrowserMCPServer()
      // Mock server.connect to throw
      s.server.connect = jest.fn().mockRejectedValue(new Error('connect failed'))
      const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {})
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      await s.start()

      expect(exitSpy).toHaveBeenCalledWith(1)

      exitSpy.mockRestore()
      errSpy.mockRestore()
    })
  })

  // ==================== module export ====================

  test('module exports BrowserMCPServer class', () => {
    const Cls = require('../index')
    expect(typeof Cls).toBe('function')
    expect(Cls.name).toBe('BrowserMCPServer')
  })
})
