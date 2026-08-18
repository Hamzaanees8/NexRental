import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tgpmimpzlunsjtxdjikw.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRncG1pbXB6bHVuc2p0eGRqaWt3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTEwMTk3NiwiZXhwIjoyMDg0Njc3OTc2fQ.SVA--EGSYgOOsizZWpnp5WH6XQagKi6ed90Ot5pjF24';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runRealTest() {
  console.log('--- FETCHING REAL ACTIVE VEHICLE FROM DATABASE ---');
  let { data: vehicles } = await supabase.from('vehicles').select('*').eq('status', 'Active').limit(1);
  
  if (!vehicles || vehicles.length === 0) {
    console.log('No active vehicles found! Creating a test SUV...');
    const { data: newVehicle } = await supabase.from('vehicles').insert({
      make_model: 'Toyota Fortuner Test SUV',
      license_plate: 'TEST-1234',
      type: 'SUV',
      status: 'Active',
      tenant_id: 'default'
    }).select();
    vehicles = newVehicle;
  }
  
  const vehicle = vehicles[0];
  console.log('Selected Vehicle:', vehicle.make_model, '(', vehicle.type, ')');
  
  // Real future dates
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 5);
  const startStr = startDate.toISOString().split('T')[0] + ' 10:00:00';
  
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 7);
  const endStr = endDate.toISOString().split('T')[0] + ' 18:00:00';

  console.log(`\n--- TESTING check_availability FOR ${startStr} TO ${endStr} ---`);
  const WEBHOOK_URL = 'https://tgpmimpzlunsjtxdjikw.supabase.co/functions/v1/retell-llm-webhook';
  
  const res1 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      args: {
        start_date: startStr,
        end_date: endStr,
        vehicle_type: vehicle.type
      },
      call: { call_id: 'test_real_1' }
    })
  });
  const data1 = await res1.json();
  console.log('check_availability result:', data1);
  
  if (data1.result && data1.result.available_vehicles.length > 0) {
    console.log('\n--- TESTING get_or_create_customer ---');
    const res2 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        args: {
          name: 'Real Booking Test',
          phone_number: '03009998811'
        },
        call: { call_id: 'test_real_2' }
      })
    });
    const customerResult = await res2.json();
    console.log('customer result:', customerResult);
    
    console.log('\n--- TESTING book_rental (INSERTING REAL BOOKING) ---');
    const res3 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        args: {
          customer_id: customerResult.result.customer_id,
          vehicle_id: data1.result.available_vehicles[0].id,
          start_date: startStr,
          end_date: endStr,
          rental_type: 'With Driver',
          rent_amount: 25000,
          pickup_location: 'Lahore Airport',
          destination: 'Serena Hotel Islamabad'
        },
        call: { call_id: 'test_real_3' }
      })
    });
    const bookingResult = await res3.json();
    console.log('book_rental result:', bookingResult);
    
    // Let's verify it's actually in the database!
    console.log('\n--- VERIFYING BOOKING IN DATABASE ---');
    const { data: bookingCheck } = await supabase.from('rentals')
      .select('*, customers!rentals_customer_id_fkey(name), vehicles(make_model)')
      .eq('customer_id', customerResult.result.customer_id)
      .order('created_at', { ascending: false })
      .limit(1);
      
    console.log('Database Check:', JSON.stringify(bookingCheck[0], null, 2));

    // Cleanup so we don't spam their DB
    console.log('\n--- CLEANING UP TEST DATA ---');
    await supabase.from('rentals').delete().eq('id', bookingCheck[0].id);
    await supabase.from('customers').delete().eq('id', customerResult.result.customer_id);
    console.log('Test data cleaned up successfully.');
  } else {
    console.log('Could not find available vehicle for those dates.');
  }
}

runRealTest();
