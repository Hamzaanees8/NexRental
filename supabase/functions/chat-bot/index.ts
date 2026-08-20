import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RETELL_API_KEY = Deno.env.get('RETELL_API_KEY') || 'key_3869109a7f0a784327527e6fdd84'; // Fallback to known key if not in env
const RETELL_LLM_ID = 'llm_97dbbfeaecd273bfda754af86bba';

// We reuse the exact same logic from retell-llm-webhook for tool execution
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const TENANT_ID = 'tgpmimpzlunsjtxdjikw';

async function fetchRetellConfig() {
  const res = await fetch(`https://api.retellai.com/get-retell-llm/${RETELL_LLM_ID}`, {
    headers: { 'Authorization': `Bearer ${RETELL_API_KEY}` }
  });
  if (!res.ok) throw new Error('Failed to fetch Retell LLM config');
  return await res.json();
}

async function executeTool(name: string, args: any) {
  if (name === 'check_availability') {
    const { start_date, end_date, vehicle_type } = args;
    let query = supabase.from('vehicles').select('id, make_model, license_plate, type, rental_rate').eq('status', 'Active').eq('tenant_id', TENANT_ID);
    if (vehicle_type) {
      query = query.or(`type.ilike.%${vehicle_type}%,make_model.ilike.%${vehicle_type}%`);
    }
    const { data: vehicles, error: vError } = await query;
    if (vError) throw vError;

    const { data: rentals, error: rError } = await supabase.from('rentals')
      .select('vehicle_id')
      .eq('tenant_id', TENANT_ID)
      .neq('status', 'Cancelled')
      .neq('status', 'Completed')
      .neq('status', 'Settled')
      .lte('start_time', end_date)
      .gte('end_time', start_date);
    if (rError) throw rError;

    const bookedVehicleIds = new Set(rentals.map((r: any) => r.vehicle_id));
    const availableVehicles = vehicles.filter((v: any) => !bookedVehicleIds.has(v.id));
    return { available_vehicles: availableVehicles };
  } else if (name === 'get_or_create_customer') {
    const { name: customerName, phone_number } = args;
    const { data: existing, error: eError } = await supabase.from('customers')
      .select('id, name')
      .eq('tenant_id', TENANT_ID)
      .eq('phone', phone_number)
      .maybeSingle();
    if (eError) throw eError;

    if (existing) return { customer_id: existing.id, status: 'existing' };

    const { data: newCustomer, error: cError } = await supabase.from('customers')
      .insert([{ tenant_id: TENANT_ID, name: customerName, phone: phone_number, source: 'Direct' }])
      .select('id')
      .single();
    if (cError) throw cError;
    return { customer_id: newCustomer.id, status: 'created' };
  } else if (name === 'book_rental') {
    const { vehicle_id, customer_id, start_date, end_date, rental_type, rent_amount, pickup_location, destination } = args;
    if (!customer_id) {
      throw new Error("Missing customer_id. You MUST call get_or_create_customer first to obtain a valid customer_id before calling book_rental.");
    }

    let assignedDriverId = null;
    let driverDetails = null;

    if (rental_type && rental_type.toLowerCase().includes('driver')) {
        const { data: drivers } = await supabase.from('drivers').select('*').eq('status', 'Available').limit(1);
        if (drivers && drivers.length > 0) {
            assignedDriverId = drivers[0].id;
            driverDetails = drivers[0];
        } else {
            throw new Error("No drivers are currently available. Please inform the user and ask if they want to proceed with Self Drive instead.");
        }
    }

    const newRental = {
      tenant_id: TENANT_ID,
      vehicle_id,
      customer_id,
      driver_id: assignedDriverId,
      start_time: start_date,
      end_time: end_date,
      rental_type: rental_type || 'Self Drive',
      rent_amount: parseFloat(rent_amount) || 0,
      pickup_location: pickup_location || '',
      destination: destination || '',
      status: 'Reserved',
    };
    const { data, error } = await supabase.from('rentals').insert([newRental]).select('id').single();
    if (error) throw error;
    
    return { 
        success: true, 
        booking_id: data.id, 
        message: 'Booking confirmed as Reserved.',
        ...(driverDetails ? { driver_assigned: `${driverDetails.name} (Phone: ${driverDetails.phone})` } : {})
    };
  } else if (name === 'end_call') {
    return { success: true, message: 'Call ended successfully.' };
  }
  return { error: 'Unknown tool' };
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const providers = [];
    if (Deno.env.get('GROQ_API_KEY')) {
      providers.push({ url: 'https://api.groq.com/openai/v1/chat/completions', key: Deno.env.get('GROQ_API_KEY'), model: 'openai/gpt-oss-20b' });
    }
    if (Deno.env.get('OPENROUTER_API_KEY')) {
      providers.push({ url: 'https://openrouter.ai/api/v1/chat/completions', key: Deno.env.get('OPENROUTER_API_KEY'), model: 'meta-llama/llama-3.3-70b-instruct' });
    }
    if (Deno.env.get('GEMINI_API_KEY')) {
      providers.push({ url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key: Deno.env.get('GEMINI_API_KEY'), model: 'gemini-1.5-flash' });
    }
    if (Deno.env.get('OPENAI_API_KEY')) {
      providers.push({ url: 'https://api.openai.com/v1/chat/completions', key: Deno.env.get('OPENAI_API_KEY'), model: 'gpt-4o-mini' });
    }
    
    if (providers.length === 0) {
      throw new Error('No AI Provider API key found. Please configure GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY in your Supabase secrets.');
    }

    // Helper to fetch with automatic fallback
    const fetchWithFallback = async (bodyPayload: any) => {
      let lastError = null;
      for (const provider of providers) {
        try {
          console.log(`Trying AI Provider: ${provider.model}`);
          const res = await fetch(provider.url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${provider.key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...bodyPayload, model: provider.model })
          });
          const data = await res.json();
          if (!data.choices || !data.choices[0]) {
            throw new Error(`AI Provider Error: ${JSON.stringify(data)}`);
          }
          return data.choices[0].message;
        } catch (err: any) {
          console.warn(`Provider ${provider.model} failed: ${err.message}`);
          lastError = err;
        }
      }
      throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
    };

    const { messages } = await req.json();

    // 1. Fetch live Retell Config so the Text Bot matches the Voice Bot exactly
    const retellConfig = await fetchRetellConfig();
    
    // Map Retell tools to OpenAI schema format
    const tools = retellConfig.general_tools.map((t: any) => ({
      type: 'function',
      function: {
        name: t.name,
        description: t.description,
        parameters: t.parameters
      }
    }));

    const CRITICAL_INSTRUCTIONS = `
\nCRITICAL INSTRUCTIONS TO FOLLOW STRICTLY:
1. DO NOT ever call the book_rental tool without FIRST asking the user for their Full Name and Phone Number, and then successfully calling the get_or_create_customer tool to obtain a customer_id.
2. If you receive an error from any tool (like missing customer_id), DO NOT tell the user the booking was successful. Instead, apologize and ask for the missing information.
3. If the user explicitly asks for a rental "With Driver", DO NOT mention anything about self-drive rules or CNIC at the office. Only mention self-drive if they chose self-drive.
4. When confirming a booking that is "With Driver", you MUST provide the assigned driver's Name and Phone Number to the user if the tool returns it.
5. If the book_rental tool returns an error saying "No drivers are currently available", inform the user and ask if they prefer Self Drive.
`;
    const systemMessage = { role: 'system', content: retellConfig.general_prompt + CRITICAL_INSTRUCTIONS };
    const apiMessages = [systemMessage, ...messages];

    // 2. Call AI Provider directly using Retell's configuration (with fallback logic)
    let responseMessage = await fetchWithFallback({
      messages: apiMessages,
      tools: tools,
      tool_choice: 'auto'
    });

    // 3. Handle Tool Calls if the LLM decided to invoke one
    while (responseMessage.tool_calls) {
      apiMessages.push(responseMessage); // append assistant's tool call

      for (const toolCall of responseMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`Executing tool: ${functionName}`, functionArgs);
        
        try {
          const toolResult = await executeTool(functionName, functionArgs);
          apiMessages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify(toolResult)
          });
        } catch (e: any) {
          apiMessages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: JSON.stringify({ error: e.message })
          });
        }
      }

      // 4. Send the tool results back to the AI provider for the next natural language response or tool call
      responseMessage = await fetchWithFallback({
        messages: apiMessages,
        tools: tools
      });
    }

    // No more tool calls, just return the final text response
    return new Response(JSON.stringify(responseMessage), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Chatbot error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
