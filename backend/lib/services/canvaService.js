/**
 * Canva MCP Integration Service
 * 
 * Handles presentation generation via Civic MCP Hub.
 * Uses Civic Auth tokens to invoke Canva MCP tools via the Civic Hub.
 * 
 * Based on Civic docs: https://docs.civic.com/labs/projects/mcp-hub
 * The Civic Hub endpoint is: https://app.civic.com/hub/mcp
 * Civic Auth tokens are directly valid for the MCP Hub.
 */

const CIVIC_HUB_MCP_URL = process.env.CIVIC_HUB_MCP_URL || 'https://app.civic.com/hub/mcp';

/**
 * Call a Canva MCP tool via Civic Hub using the MCP protocol
 * @param {string} toolName - Name of the Canva MCP tool to call
 * @param {Object} toolArguments - Tool arguments
 * @param {string} civicAuthToken - Civic Auth token (directly valid for MCP Hub)
 * @returns {Promise<Object>} Tool execution result
 */
async function callCanvaTool(toolName, toolArguments, civicAuthToken) {
  if (!civicAuthToken) {
    throw new Error('Civic Auth token required');
  }

  try {
    // Use the MCP protocol to call tools via Civic Hub
    // The Civic Hub exposes an MCP endpoint that accepts JSON-RPC requests
    const requestId = Date.now();
    
    const response = await fetch(CIVIC_HUB_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${civicAuthToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: toolArguments,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Civic Hub error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (result.error) {
      throw new Error(`MCP tool error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    // The result is in result.result.content for MCP responses
    return result.result;
  } catch (error) {
    console.error(`Error calling Canva tool ${toolName}:`, error);
    throw error;
  }
}

/**
 * Generate a presentation for a topic or flashcard
 * @param {string} topic - The topic to generate presentation for
 * @param {string} civicAuthToken - Civic Auth token
 * @param {string} [flashcardId] - Optional flashcard ID for context
 * @returns {Promise<{designId: string, editUrl: string, viewUrl: string}>}
 */
async function generatePresentation(topic, civicAuthToken, flashcardId = null) {
  try {
    // Call Canva MCP tool to create a presentation
    // Canva MCP tools: create_presentation, add_slide, etc.
    const result = await callCanvaTool(
      'create_presentation',
      {
        title: `Understanding: ${topic}`,
        description: flashcardId 
          ? `Auto-generated presentation to help understand ${topic}` 
          : `Auto-generated presentation to help understand ${topic}`,
      },
      civicAuthToken
    );

    // Parse the MCP response - content is typically an array
    let designId, editUrl, viewUrl;
    
    if (result.content && Array.isArray(result.content)) {
      // Look for text content with the design info
      const textContent = result.content.find(c => c.type === 'text');
      if (textContent) {
        try {
          const parsed = JSON.parse(textContent.text);
          designId = parsed.designId || parsed.id;
          editUrl = parsed.editUrl || parsed.urls?.edit_url;
          viewUrl = parsed.viewUrl || parsed.urls?.view_url;
        } catch {
          // If not JSON, try to extract URLs from text
          const urlMatch = textContent.text.match(/https?:\/\/[^\s]+/);
          editUrl = urlMatch ? urlMatch[0] : null;
        }
      }
    } else if (result.content && typeof result.content === 'object') {
      designId = result.content.designId || result.content.id;
      editUrl = result.content.editUrl || result.content.urls?.edit_url;
      viewUrl = result.content.viewUrl || result.content.urls?.view_url;
    }

    if (!designId && !editUrl) {
      throw new Error('Failed to get presentation details from Canva');
    }

    return {
      designId: designId || `presentation-${Date.now()}`,
      editUrl: editUrl || `https://www.canva.com/design/new`,
      viewUrl: viewUrl || editUrl,
    };
  } catch (error) {
    console.error('Error generating presentation:', error);
    throw error;
  }
}

/**
 * Get available Canva MCP tools from the Civic Hub
 * @param {string} civicAuthToken - Civic Auth token
 * @returns {Promise<Array>} List of available tools
 */
async function listCanvaTools(civicAuthToken) {
  if (!civicAuthToken) {
    throw new Error('Civic Auth token required');
  }

  try {
    const requestId = Date.now();
    
    const response = await fetch(CIVIC_HUB_MCP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${civicAuthToken}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: requestId,
        method: 'tools/list',
        params: {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Civic Hub error: ${response.status}`);
    }

    const result = await response.json();
    return result.result?.tools || [];
  } catch (error) {
    console.error('Error listing Canva tools:', error);
    throw error;
  }
}

/**
 * Get design details and links
 * @param {string} designId - The design ID
 * @param {string} civicAuthToken - Civic Auth token
 * @returns {Promise<{designId: string, editUrl: string, viewUrl: string, title: string}>}
 */
async function getDesignDetails(designId, civicAuthToken) {
  try {
    const result = await callCanvaTool(
      'get_design',
      {
        design_id: designId,
      },
      civicAuthToken
    );

    return {
      designId: result.designId || designId,
      editUrl: result.editUrl,
      viewUrl: result.viewUrl,
      title: result.title,
    };
  } catch (error) {
    console.error('Error fetching design details:', error);
    throw error;
  }
}

/**
 * Export a design to PDF
 * @param {string} designId - The design ID
 * @param {string} civicAuthToken - Civic Auth token
 * @returns {Promise<{downloadUrl: string, expiresAt: string}>}
 */
async function exportDesignToPdf(designId, civicAuthToken) {
  try {
    const result = await callCanvaTool(
      'export_design',
      {
        design_id: designId,
        format: 'pdf',
      },
      civicAuthToken
    );

    return {
      downloadUrl: result.downloadUrl,
      expiresAt: result.expiresAt,
    };
  } catch (error) {
    console.error('Error exporting design to PDF:', error);
    throw error;
  }
}

export {
  callCanvaTool,
  generatePresentation,
  getDesignDetails,
  exportDesignToPdf,
  listCanvaTools,
};
