const PLATFORM_NAMES = ['Amazon India', 'Flipkart', 'Noon']
const BRAND_NAMES = ['Natura Casa', 'LivSpace Pro', 'Nordic Basics']

function moneyToNumber(value) {
  if (!value) return null
  const parsed = Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function toTitleCase(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function knownNameFrom(text, names) {
  const lower = text.toLowerCase()
  return names.find((name) => lower.includes(name.toLowerCase())) || ''
}

function extractNamedTarget(text, scope) {
  const names = scope === 'brand' ? BRAND_NAMES : PLATFORM_NAMES
  const known = knownNameFrom(text, names)
  if (known) return known

  const patterns = scope === 'brand'
    ? [
        /(?:for|on)\s+(.+?)\s+brand\b/i,
        /\bbrand\s+(.+?)(?:\s|$)/i,
      ]
    : [
        /(?:for|on|all)\s+(.+?)\s+(?:items|platform)\b/i,
        /\bplatform\s+(.+?)(?:\s|$)/i,
      ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match?.[1]) return toTitleCase(match[1].replace(/\ball\b/i, ''))
  }

  return ''
}

function extractDiscountValue(text) {
  const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/)
  if (percentMatch) {
    return { type: 'percentage', value: Number(percentMatch[1]) }
  }

  const flatMatch = text.match(/(?:rs\.?|inr|rupees?)\s*([0-9,]+(?:\.\d+)?)\s*(?:flat|off|discount)?/i)
  if (flatMatch && /\b(flat|off|discount)\b/i.test(text)) {
    return { type: 'flat', value: moneyToNumber(flatMatch[1]) }
  }

  return { type: null, value: null }
}

function extractMinCartValue(text) {
  const threshold = text.match(/(?:cart|order|total)[^0-9]*(?:more than|above|over|at least|>=|greater than|minimum|min)?[^0-9]*(?:rs\.?|inr|rupees?)?\s*([0-9,]+(?:\.\d+)?)/i)
  return moneyToNumber(threshold?.[1])
}

export function parseNLRule(text) {
  const normalised = text.trim().replace(/\s+/g, ' ')
  const lower = normalised.toLowerCase()
  const { type, value } = extractDiscountValue(normalised)

  if (!type || !value) {
    return {
      ambiguous: true,
      ambiguityReason: 'No discount value was found',
    }
  }

  let scope = ''
  if (/\b(cart|order|total)\b/.test(lower)) {
    scope = 'cart'
  } else if (/\bbrand\b/.test(lower) || knownNameFrom(normalised, BRAND_NAMES)) {
    scope = 'brand'
  } else if (/\b(platform|items)\b/.test(lower) || knownNameFrom(normalised, PLATFORM_NAMES)) {
    scope = 'platform'
  }

  if (!scope) {
    return {
      ambiguous: true,
      ambiguityReason: 'Could not tell whether the rule applies to a brand, platform, or cart',
    }
  }

  const minCartValue = scope === 'cart' ? extractMinCartValue(normalised) : null
  if (scope === 'cart' && minCartValue == null && /\b(more than|above|over|at least|minimum|min|threshold)\b/i.test(normalised)) {
    return {
      ambiguous: true,
      ambiguityReason: 'Cart rule mentions a threshold but no minimum cart value was found',
    }
  }

  const appliesTo = scope === 'cart' ? '' : extractNamedTarget(normalised, scope)
  if (scope !== 'cart' && !appliesTo) {
    return {
      ambiguous: true,
      ambiguityReason: `Could not identify the ${scope} name`,
    }
  }

  return {
    ruleId: '',
    scope,
    appliesTo,
    type,
    value,
    stackable: scope === 'cart' ? false : /\b(stackable|stack|with other offers)\b/i.test(normalised),
    minCartValue,
    ambiguous: false,
    ambiguityReason: '',
  }
}
