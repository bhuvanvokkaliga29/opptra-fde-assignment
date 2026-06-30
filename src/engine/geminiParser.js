const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

const SYSTEM_PROMPT = `You are a discount rule parser for an e-commerce platform. Parse the user's plain-English description into a structured discount rule.

Return ONLY valid JSON with these exact fields:
{
  "scope": "brand" | "platform" | "cart",
  "appliesTo": "<brand or platform name, empty string for cart rules>",
  "type": "percentage" | "flat",
  "value": <number>,
  "stackable": true | false,
  "minCartValue": <number or null>
}

Rules:
- scope "brand": applies to all items of a specific brand (e.g. "Natura Casa", "LivSpace Pro", "Nordic Basics")
- scope "platform": applies to all items on a platform (e.g. "Amazon India", "Flipkart", "Noon")
- scope "cart": applies to the entire cart total, usually with a minimum threshold
- type "percentage": a percent-off discount (value is the percentage number, e.g. 15 for 15%)
- type "flat": a fixed rupee amount off (value is the rupee amount, e.g. 150)
- stackable: true if the rule can combine with other rules, false otherwise. Default is false unless explicitly stated.
- minCartValue: only for cart rules — the minimum cart total required. null if not specified.

If the input is ambiguous (missing discount value, unclear scope, no identifiable target), return:
{ "ambiguous": true, "ambiguityReason": "<brief explanation>" }

Examples:
- "20% off for Natura Casa brand, stackable" → {"scope":"brand","appliesTo":"Natura Casa","type":"percentage","value":20,"stackable":true,"minCartValue":null}
- "Rs.100 flat discount on all Flipkart items" → {"scope":"platform","appliesTo":"Flipkart","type":"flat","value":100,"stackable":false,"minCartValue":null}
- "10% off if cart value is more than Rs.5,000" → {"scope":"cart","appliesTo":"","type":"percentage","value":10,"stackable":false,"minCartValue":5000}
- "Give a discount for big orders" → {"ambiguous":true,"ambiguityReason":"No discount value or threshold specified"}`

function validateParsedRule(parsed) {
  if (parsed.ambiguous) {
    return {
      ambiguous: true,
      ambiguityReason: parsed.ambiguityReason || 'The LLM flagged this input as ambiguous',
    }
  }

  const validScopes = ['brand', 'platform', 'cart']
  const validTypes = ['percentage', 'flat']

  if (!validScopes.includes(parsed.scope)) {
    return { ambiguous: true, ambiguityReason: `LLM returned invalid scope: "${parsed.scope}"` }
  }

  if (!validTypes.includes(parsed.type)) {
    return { ambiguous: true, ambiguityReason: `LLM returned invalid type: "${parsed.type}"` }
  }

  if (typeof parsed.value !== 'number' || parsed.value <= 0) {
    return { ambiguous: true, ambiguityReason: `LLM returned invalid value: "${parsed.value}"` }
  }

  if (parsed.scope !== 'cart' && !parsed.appliesTo?.trim()) {
    return { ambiguous: true, ambiguityReason: `LLM could not identify the ${parsed.scope} name` }
  }

  return {
    ruleId: '',
    scope: parsed.scope,
    appliesTo: parsed.scope === 'cart' ? '' : String(parsed.appliesTo).trim(),
    type: parsed.type,
    value: parsed.value,
    stackable: parsed.scope === 'cart' ? false : Boolean(parsed.stackable),
    minCartValue: parsed.scope === 'cart' && typeof parsed.minCartValue === 'number' ? parsed.minCartValue : null,
    ambiguous: false,
    ambiguityReason: '',
  }
}

export async function parseWithGemini(text, apiKey) {
  const url = `${GEMINI_API_URL}?key=${apiKey}`

  const body = {
    system_instruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: `Parse this discount rule:\n"${text}"` }],
      },
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  }

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    throw new Error(`Network error calling Gemini API: ${err.message}`)
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    if (response.status === 400) {
      throw new Error('Invalid API key. Check your Gemini API key and try again.')
    }
    throw new Error(`Gemini API error (${response.status}): ${errorText}`)
  }

  const data = await response.json()
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text

  if (!rawText) {
    throw new Error('Gemini returned an empty response')
  }

  let parsed
  try {
    parsed = JSON.parse(rawText)
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${rawText.slice(0, 200)}`)
  }

  return validateParsedRule(parsed)
}
