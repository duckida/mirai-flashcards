/**
 * Canva MCP Integration Service
 * 
 * Uses Civic MCP Hub to call Canva tools.
 * Tools available:
 * - canva-generate-design: Generate designs with AI
 * - canva-create-design-from-candidate: Create design from generation candidate
 * - canva-get-design: Get design details
 * - canva-export-design: Export design to PDF/PNG/JPG
 */

const CIVIC_HUB_MCP_URL = 'https://app.civic.com/hub/mcp';

/**
 * Call a Canva MCP tool via Civic Hub
 */
async function callCanvaTool(toolName, toolArguments, civicAuthToken) {
  const response = await fetch(CIVIC_HUB_MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${civicAuthToken}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
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
    throw new Error(`MCP error: ${result.error.message || JSON.stringify(result.error)}`);
  }

  return result.result;
}

/**
 * Generate a presentation for a topic using Canva AI
 */
async function generatePresentation(topic, civicAuthToken, contextId = null) {
  // Step 1: Generate a design with AI
  const generateResult = await callCanvaTool(
    'canva-generate-design',
    {
      query: `Create a presentation to help understand the topic: ${topic}`,
    },
    civicAuthToken
  );

  // Parse the result to get candidate ID
  let candidateId = null;
  if (generateResult?.content && Array.isArray(generateResult.content)) {
    for (const item of generateResult.content) {
      if (item.type === 'text') {
        try {
          const parsed = JSON.parse(item.text);
          candidateId = parsed.candidate_id || parsed.id;
        } catch {
          // Try to extract from text
          const match = item.text.match(/candidate[_-]?id['":\s]+([a-zA-Z0-9_-]+)/i);
          if (match) candidateId = match[1];
        }
      }
    }
  } else if (generateResult?.candidate_id) {
    candidateId = generateResult.candidate_id;
  }

  if (!candidateId) {
    throw new Error('Failed to get design candidate from AI generation');
  }

  // Step 2: Create actual design from candidate
  const createResult = await callCanvaTool(
    'canva-create-design-from-candidate',
    {
      candidate_id: candidateId,
    },
    civicAuthToken
  );

  // Parse create result
  let designId, editUrl;
  if (createResult?.content && Array.isArray(createResult.content)) {
    for (const item of createResult.content) {
      if (item.type === 'text') {
        try {
          const parsed = JSON.parse(item.text);
          designId = parsed.design_id || parsed.id;
          editUrl = parsed.urls?.edit_url || parsed.edit_url || parsed.editUrl;
        } catch {
          const urlMatch = item.text.match(/(https:\/\/www\.canva\.com\/design\/[^\s]+)/);
          if (urlMatch) editUrl = urlMatch[1];
        }
      }
    }
  } else if (createResult?.design_id || createResult?.id) {
    designId = createResult.design_id || createResult.id;
    editUrl = createResult.urls?.edit_url || createResult.edit_url;
  }

  return {
    designId: designId || `canva-${Date.now()}`,
    editUrl: editUrl || `https://www.canva.com/designs`,
    viewUrl: createResult?.urls?.view_url || editUrl,
  };
}

/**
 * Get design details
 */
async function getDesignDetails(designId, civicAuthToken) {
  const result = await callCanvaTool(
    'canva-get-design',
    { design_id: designId },
    civicAuthToken
  );

  return {
    designId,
    editUrl: result?.urls?.edit_url,
    viewUrl: result?.urls?.view_url,
    title: result?.title,
  };
}

/**
 * Export design to PDF
 */
async function exportDesignToPdf(designId, civicAuthToken) {
  const result = await callCanvaTool(
    'canva-export-design',
    { design_id: designId, format: 'pdf' },
    civicAuthToken
  );

  return {
    downloadUrl: result?.url,
    expiresAt: result?.expires_at,
  };
}

export {
  callCanvaTool,
  generatePresentation,
  getDesignDetails,
  exportDesignToPdf,
};
