/**
 * Canva MCP Integration Service
 * 
 * Handles presentation generation via Civic.ai MCP Hub.
 * Uses Civic Auth tokens to invoke Canva MCP tools.
 * 
 * Architecture:
 * - Civic Auth provides OAuth tokens that are directly valid for Civic MCP Hub
 * - Civic MCP Hub orchestrates Canva MCP server execution
 * - No token exchange needed (Civic Auth tokens work directly)
 * 
 * Reference: https://docs.civic.com/labs/projects/mcp-hub
 */

const CIVIC_MCP_HUB_URL = process.env.CIVIC_MCP_HUB_URL || 'https://hub.mcp.civic.com';
const CIVIC_MCP_API_KEY = process.env.CIVIC_MCP_API_KEY;

/**
 * Call a Canva MCP tool via Civic Hub
 * @param {string} toolName - Name of the Canva MCP tool to call
 * @param {Object} arguments - Tool arguments
 * @param {string} civicAuthToken - Civic Auth token (directly valid for MCP Hub)
 * @returns {Promise<Object>} Tool execution result
 */
async function callCanvaTool(toolName, toolArguments, civicAuthToken) {
  if (!CIVIC_MCP_API_KEY) {
    throw new Error('CIVIC_MCP_API_KEY not configured');
  }

  if (!civicAuthToken) {
    throw new Error('Civic Auth token required');
  }

  try {
    const response = await fetch(`${CIVIC_MCP_HUB_URL}/api/tools/call/canva`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${civicAuthToken}`,
        'X-API-Key': CIVIC_MCP_API_KEY,
      },
      body: JSON.stringify({
        toolName,
        arguments: toolArguments,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Canva MCP tool error: ${error.message || response.statusText}`);
    }

    return await response.json();
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
 * @returns {Promise<{designId: string, editUrl: string}>}
 */
async function generatePresentation(topic, civicAuthToken, flashcardId = null) {
  try {
    // Call Canva MCP tool to create a design
    // Tool: create_design (from Canva MCP)
    const result = await callCanvaTool(
      'create_design',
      {
        title: `Explanation: ${topic}`,
        description: flashcardId ? `Generated explanation for flashcard ${flashcardId}` : `Generated explanation for ${topic}`,
        width: 1200,
        height: 675, // 16:9 aspect ratio for presentations
      },
      civicAuthToken
    );

    return {
      designId: result.designId,
      editUrl: result.editUrl,
      viewUrl: result.viewUrl,
    };
  } catch (error) {
    console.error('Error generating presentation:', error);
    throw error;
  }
}

/**
 * Get design details and links
 * @param {string} designId - The design ID
 * @param {string} civicAuthToken - Civic Auth token
 * @returns {Promise<{designId: string, editUrl: string, viewUrl: string}>}
 */
async function getDesignDetails(designId, civicAuthToken) {
  try {
    // Call Canva MCP tool to get design details
    // Tool: get_design (from Canva MCP)
    const result = await callCanvaTool(
      'get_design',
      {
        designId,
      },
      civicAuthToken
    );

    return {
      designId: result.designId,
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
    // Call Canva MCP tool to export design
    // Tool: export_design (from Canva MCP)
    const result = await callCanvaTool(
      'export_design',
      {
        designId,
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
};
