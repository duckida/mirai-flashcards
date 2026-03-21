import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    
    if (!apiKey || !agentId) {
      return NextResponse.json(
        { error: 'ElevenLabs configuration missing' },
        { status: 500 }
      );
    }

    // Call ElevenLabs API to get signed URL
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: `Failed to get signed URL: ${errorData.detail || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    return NextResponse.json({ signedUrl: data.signed_url });
  } catch (error) {
    console.error('Error in speech-token endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}