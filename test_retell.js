async function test() {
  const RETELL_API_KEY = 'key_e76765b605558d4865e28593050be';
  const RETELL_AGENT_ID = 'agent_025a04b9a228fb38983c53bb39';

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

  const data = await response.json();
  console.log('Status:', response.status);
  console.log('Response:', data);
}

test();
