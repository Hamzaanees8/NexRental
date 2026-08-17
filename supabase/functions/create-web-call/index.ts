import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RETELL_API_KEY = Deno.env.get('RETELL_API_KEY') || 'key_3869109a7f0a784327527e6fdd84';
    const RETELL_AGENT_ID = Deno.env.get('RETELL_AGENT_ID') || 'agent_025a04b9a228fb38983c53bb39';

    if (!RETELL_API_KEY || !RETELL_AGENT_ID) {
      throw new Error('Retell API credentials are not set in environment variables');
    }

    // Call Retell API to create a web call
    const response = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RETELL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: RETELL_AGENT_ID,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Retell API Error:', errorData);
      throw new Error('Failed to create web call with Retell API');
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data), // Returns access_token and call_id
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
