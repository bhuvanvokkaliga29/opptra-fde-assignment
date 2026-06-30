export function ruleMatchesItem(item, rule) {
  if (rule.scope === 'cart') return false
  const normalise = (value) => String(value).trim().toLowerCase()

  if (rule.scope === 'brand') {
    return normalise(item.brand) === normalise(rule.appliesTo)
  }

  if (rule.scope === 'platform') {
    return normalise(item.platform) === normalise(rule.appliesTo)
  }

  return false
}

export function calculateDiscountAmount(price, rule) {
  if (rule.type === 'percentage') {
    return Math.round(price * rule.value / 100)
  }

  if (rule.type === 'flat') {
    return Math.min(rule.value, price)
  }

  return 0
}

function ruleToReasoning(rule) {
  if (rule.scope === 'cart') return `Cart offer: ${rule.value}% off`

  const scopeLabel = rule.scope === 'brand' ? 'Brand' : 'Platform'
  if (rule.type === 'percentage') return `${scopeLabel} offer: ${rule.value}% off`
  if (rule.type === 'flat') return `${scopeLabel} offer: Rs.${rule.value} off`
  return `${scopeLabel} offer applied`
}

export function applyDiscounts(item, rules) {
  const matchingRules = rules.filter((rule) => ruleMatchesItem(item, rule))

  if (matchingRules.length === 0) {
    return {
      itemId: item.itemId,
      product: item.product,
      brand: item.brand,
      platform: item.platform,
      basePrice: item.basePrice,
      finalPrice: item.basePrice,
      totalDiscount: 0,
      appliedRules: [],
      skippedRules: [],
      reasoning: 'No offers available',
    }
  }

  const nonStackable = matchingRules.filter((rule) => !rule.stackable)
  const stackable = matchingRules.filter((rule) => rule.stackable)
  let winner = null
  let skipped = []

  if (nonStackable.length > 0) {
    const sorted = [...nonStackable].sort(
      (a, b) => calculateDiscountAmount(item.basePrice, b) - calculateDiscountAmount(item.basePrice, a)
    )
    winner = sorted[0]
    skipped = sorted.slice(1)
  }

  let price = item.basePrice
  const appliedRules = []
  const reasoningParts = []

  if (winner) {
    price -= calculateDiscountAmount(price, winner)
    appliedRules.push(winner.ruleId)
    reasoningParts.push(ruleToReasoning(winner))
  }

  for (const rule of stackable) {
    price -= calculateDiscountAmount(price, rule)
    appliedRules.push(rule.ruleId)
    reasoningParts.push(`${ruleToReasoning(rule)} (stacked)`)
  }

  const finalPrice = Math.max(0, Math.round(price))

  return {
    itemId: item.itemId,
    product: item.product,
    brand: item.brand,
    platform: item.platform,
    basePrice: item.basePrice,
    finalPrice,
    totalDiscount: item.basePrice - finalPrice,
    appliedRules,
    skippedRules: skipped.map((rule) => rule.ruleId),
    reasoning: reasoningParts.join(' + '),
  }
}

export function processCart(cartItems, rules) {
  const itemResults = cartItems.map((item) => applyDiscounts(item, rules))
  const itemTotal = itemResults.reduce((sum, result) => sum + result.finalPrice, 0)
  const cartRules = rules.filter((rule) => rule.scope === 'cart')
  let cartOffer = null
  let finalTotal = itemTotal

  const qualifyingRules = cartRules.filter(
    (rule) => rule.minCartValue == null || itemTotal >= rule.minCartValue
  )

  if (qualifyingRules.length > 0) {
    const bestCartRule = qualifyingRules.reduce((best, rule) => {
      const saving = calculateDiscountAmount(itemTotal, rule)
      const bestSaving = calculateDiscountAmount(itemTotal, best)
      return saving > bestSaving ? rule : best
    })

    const saving = calculateDiscountAmount(itemTotal, bestCartRule)
    finalTotal = itemTotal - saving
    cartOffer = {
      ruleId: bestCartRule.ruleId,
      saving,
      discountPct: bestCartRule.value,
      label: `Cart offer: ${bestCartRule.value}% off - Rs.${saving.toLocaleString('en-IN')} saved`,
    }
  }

  return { itemResults, itemTotal, cartOffer, finalTotal }
}

export function cartTotal(results) {
  if (Array.isArray(results)) {
    return results.reduce((sum, result) => sum + result.finalPrice, 0)
  }

  return results.finalTotal
}
