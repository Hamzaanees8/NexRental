import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Ensure these environment variables are set in Supabase Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
const TENANT_ID = 'demo-tenant'; // Ideally passed in context or resolved from auth

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json();

    if (payload.event === 'call_started') {
      console.log('Call Started event received:', payload);
    } else if (payload.event === 'call_ended') {
      console.log('Call Ended event received:', payload);
    } else if (payload.event === 'update') {
      console.log('Transcript update:', payload);
    } else if (payload.event === 'tool_call' || payload.function_name || payload.args) { 
       console.log('Tool call received:', payload);
       
       // Handle standard webhook (payload.tool_call) or direct custom tool payload (payload.args)
       let name = payload.event === 'tool_call' ? payload.tool_call.name : payload.function_name;
       let args = payload.event === 'tool_call' ? payload.tool_call.arguments : payload.args;
       
       if (typeof args === 'string') {
          try { args = JSON.parse(args); } catch (e) {}
       }
       
       // Fallback: If Retell didn't send a function name in the payload, infer it from the unique arguments
       if (!name && args) {
           if (args.customer_id !== undefined) {
               name = 'book_rental';
           } else if (args.phone_number !== undefined) {
               name = 'get_or_create_customer';
           } else if (args.start_date !== undefined) {
               name = 'check_availability';
           }
       }

       let result: any = null;

       if (name === 'check_availability') {
          const { start_date, end_date, vehicle_type } = args;
          
          // Basic logic: Fetch all active vehicles of type, check if they overlap with rentals
          let query = supabase.from('vehicles').select('id, make_model, license_plate, type').eq('status', 'Active').eq('tenant_id', TENANT_ID);
          if (vehicle_type) {
              query = query.ilike('type', `%${vehicle_type}%`);
          }
          const { data: vehicles, error: vError } = await query;

          if (vError) throw vError;

          // Fetch overlapping rentals
          const { data: rentals, error: rError } = await supabase.from('rentals')
            .select('vehicle_id')
            .eq('tenant_id', TENANT_ID)
            .neq('status', 'Cancelled')
            .neq('status', 'Completed')
            .neq('status', 'Settled')
            .lte('start_time', end_date)
            .gte('end_time', start_date);

          if (rError) throw rError;

          const bookedVehicleIds = new Set(rentals.map(r => r.vehicle_id));
          const availableVehicles = vehicles.filter(v => !bookedVehicleIds.has(v.id));

          result = { available_vehicles: availableVehicles };

       } else if (name === 'get_or_create_customer') {
          const { name: customerName, phone_number } = args;
          
          // Check if customer exists
          const { data: existing, error: eError } = await supabase.from('customers')
            .select('id, name')
            .eq('tenant_id', TENANT_ID)
            .eq('phone', phone_number)
            .maybeSingle();
            
          if (eError) throw eError;

          if (existing) {
              result = { customer_id: existing.id, status: 'existing' };
          } else {
              // Create new
              const { data: newCustomer, error: cError } = await supabase.from('customers')
                .insert([{ tenant_id: TENANT_ID, name: customerName, phone: phone_number, source: 'Direct' }])
                .select('id')
                .single();
              if (cError) throw cError;
              result = { customer_id: newCustomer.id, status: 'created' };
          }
       } else if (name === 'book_rental') {
          const { vehicle_id, customer_id, start_date, end_date, rental_type, rent_amount, pickup_location, destination } = args;
          
          const newRental = {
              tenant_id: TENANT_ID,
              vehicle_id,
              customer_id,
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
          
          result = { success: true, booking_id: data.id, message: 'Booking confirmed as Reserved.' };
       }

       return new Response(JSON.stringify({ result }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
         status: 200,
       })
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
