/**
 * Tests for Canva Service
 */

describe('Canva Service', () => {
  let canvaService;

  beforeEach(() => {
    // Mock environment variables
    process.env.CIVIC_MCP_HUB_URL = 'https://hub.mcp.civic.com';
    process.env.CIVIC_MCP_API_KEY = 'test-api-key';

    // Clear module cache and reimport
    jest.resetModules();
    canvaService = require('./canvaService');
  });

  describe('callCanvaTool', () => {
    it('should call a Canva MCP tool via Civic Hub', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              designId: 'design-123',
              editUrl: 'https://canva.com/edit/design-123',
              viewUrl: 'https://canva.com/view/design-123',
            }),
        })
      );

      const result = await canvaService.callCanvaTool(
        'create_design',
        { title: 'Test Design' },
        'civic-auth-token'
      );

      expect(result).toEqual({
        designId: 'design-123',
        editUrl: 'https://canva.com/edit/design-123',
        viewUrl: 'https://canva.com/view/design-123',
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://hub.mcp.civic.com/api/tools/call/canva',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer civic-auth-token',
            'X-API-Key': 'test-api-key',
          }),
        })
      );
    });

    it('should throw error if API key not configured', async () => {
      delete process.env.CIVIC_MCP_API_KEY;
      jest.resetModules();
      canvaService = require('./canvaService');

      await expect(
        canvaService.callCanvaTool('create_design', {}, 'token')
      ).rejects.toThrow('CIVIC_MCP_API_KEY not configured');
    });

    it('should throw error if auth token not provided', async () => {
      await expect(
        canvaService.callCanvaTool('create_design', {}, null)
      ).rejects.toThrow('Civic Auth token required');
    });

    it('should throw error on API failure', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              message: 'Invalid tool',
            }),
        })
      );

      await expect(
        canvaService.callCanvaTool('invalid_tool', {}, 'token')
      ).rejects.toThrow('Canva MCP tool error');
    });
  });

  describe('generatePresentation', () => {
    it('should generate a presentation with topic', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              designId: 'design-123',
              editUrl: 'https://canva.com/edit/design-123',
              viewUrl: 'https://canva.com/view/design-123',
            }),
        })
      );

      const result = await canvaService.generatePresentation(
        'Photosynthesis',
        'civic-auth-token'
      );

      expect(result).toEqual({
        designId: 'design-123',
        editUrl: 'https://canva.com/edit/design-123',
        viewUrl: 'https://canva.com/view/design-123',
      });

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.toolName).toBe('create_design');
      expect(callBody.arguments.title).toContain('Photosynthesis');
    });

    it('should include flashcardId in title if provided', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              designId: 'design-123',
            }),
        })
      );

      await canvaService.generatePresentation(
        'Photosynthesis',
        'civic-auth-token',
        'card-456'
      );

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.arguments.description).toContain('card-456');
    });
  });

  describe('getDesignDetails', () => {
    it('should fetch design details', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              designId: 'design-123',
              title: 'Photosynthesis Explanation',
              editUrl: 'https://canva.com/edit/design-123',
              viewUrl: 'https://canva.com/view/design-123',
            }),
        })
      );

      const result = await canvaService.getDesignDetails('design-123', 'civic-auth-token');

      expect(result).toEqual({
        designId: 'design-123',
        title: 'Photosynthesis Explanation',
        editUrl: 'https://canva.com/edit/design-123',
        viewUrl: 'https://canva.com/view/design-123',
      });

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.toolName).toBe('get_design');
      expect(callBody.arguments.designId).toBe('design-123');
    });
  });

  describe('exportDesignToPdf', () => {
    it('should export design to PDF', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              downloadUrl: 'https://cdn.canva.com/exports/design-123.pdf',
              expiresAt: '2025-03-27T12:00:00Z',
            }),
        })
      );

      const result = await canvaService.exportDesignToPdf('design-123', 'civic-auth-token');

      expect(result).toEqual({
        downloadUrl: 'https://cdn.canva.com/exports/design-123.pdf',
        expiresAt: '2025-03-27T12:00:00Z',
      });

      const callBody = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(callBody.toolName).toBe('export_design');
      expect(callBody.arguments.format).toBe('pdf');
    });
  });
});

