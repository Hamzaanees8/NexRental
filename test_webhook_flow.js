async function testWebhook() {
  const WEBHOOK_URL = 'https://tgpmimpzlunsjtxdjikw.supabase.co/functions/v1/retell-llm-webhook';
  
  console.log('1. Testing check_availability...');
  const res1 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      args: {
        start_date: '2026-08-19 10:00:00',
        end_date: '2026-08-21 10:00:00',
        vehicle_type: 'SUV'
      },
      call: { call_id: 'test_call_1' }
    })
  });
  const data1 = await res1.json();
  console.log('Result 1:', data1);
  
  console.log('\n2. Testing get_or_create_customer...');
  const res2 = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      args: {
        name: 'John Doe Testing',
        phone_number: '03009998887'
      },
      call: { call_id: 'test_call_2' }
    })
  });
  const customerResult = await res2.json();
  console.log('Result 2:', customerResult);
  
  if (customerResult.customer_id && data1.available_vehicles && data1.available_vehicles.length > 0) {
    const vehicle = data1.available_vehicles[0];
    console.log('\n3. Testing book_rental with vehicle ID:', vehicle.id);
    const res3 = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        args: {
          customer_id: customerResult.customer_id,
          vehicle_id: vehicle.id,
          start_date: '2026-08-19 10:00:00',
          end_date: '2026-08-21 10:00:00',
          rental_type: 'With Driver',
          rent_amount: 15000
        },
        call: { call_id: 'test_call_3' }
      })
    });
    console.log('Result 3:', await res3.json());
  } else {
    console.log('\nSkipping book_rental test because no vehicles are available to book.');
  }
}

testWebhook();
