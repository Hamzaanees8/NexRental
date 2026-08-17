const fs = require('fs');

async function updateRetellLLM() {
  const API_KEY = 'key_3869109a7f0a784327527e6fdd84';
  const LLM_ID = 'llm_97dbbfeaecd273bfda754af86bba';
  const url = 'https://api.retellai.com/get-retell-llm/' + LLM_ID;

  const res = await fetch(url, { headers: { 'Authorization': 'Bearer ' + API_KEY } });
  const config = await res.json();

  let newPrompt = config.general_prompt;
  newPrompt = newPrompt.replace(
    '- Ask if they have a specific vehicle type in mind (e.g., Car, SUV, Van, Minibus). ',
    '- Ask if they have a specific vehicle type in mind (e.g., Car, SUV, Van, Minibus). \\n- **CRUCIAL:** Ask for their exact **Pickup Location** (Start Location) and their **Destination**. You MUST collect these before quoting a price or checking availability.'
  );
  
  newPrompt = newPrompt.replace(
    '- With the Customer ID (from Step 4), the Vehicle ID (from Step 2), the calculated `rent_amount`, and the dates, **CALL THE TOOL: `book_rental`**.',
    '- With the Customer ID (from Step 4), the Vehicle ID (from Step 2), the calculated `rent_amount`, the dates, the `pickup_location`, and the `destination`, **CALL THE TOOL: `book_rental`**.'
  );

  const tools = config.general_tools;
  const bookRentalTool = tools.find(t => t.name === 'book_rental');
  
  if (bookRentalTool) {
    bookRentalTool.parameters.properties.pickup_location = {
      type: 'string',
      description: 'The exact location where the customer will pick up the car or start the ride.'
    };
    bookRentalTool.parameters.properties.destination = {
      type: 'string',
      description: 'The customers destination or where the ride will end.'
    };
    if (!bookRentalTool.parameters.required.includes('pickup_location')) {
      bookRentalTool.parameters.required.push('pickup_location');
    }
    if (!bookRentalTool.parameters.required.includes('destination')) {
      bookRentalTool.parameters.required.push('destination');
    }
  }

  const patchRes = await fetch('https://api.retellai.com/update-retell-llm/' + LLM_ID, {
    method: 'PATCH',
    headers: {
      'Authorization': 'Bearer ' + API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      general_prompt: newPrompt,
      general_tools: tools
    })
  });

  const patchData = await patchRes.json();
  console.log(patchData.llm_id ? 'Successfully updated LLM config via API!' : patchData);
}

updateRetellLLM();
