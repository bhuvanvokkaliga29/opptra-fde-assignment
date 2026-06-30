import Papa from 'papaparse'

export function parseRulesCSV(csvText) {
  const { data: rows, errors: parseErrors } = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
  })

  if (parseErrors.length > 0) {
    return { data: [], errors: parseErrors.map((error) => error.message) }
  }

  const data = []
  const errors = []

  rows.forEach((row, index) => {
    const rowNum = index + 2
    const scope = row.scope?.trim().toLowerCase()

    if (scope === 'cart') {
      const missing = []
      if (!row.rule_id) missing.push('rule_id')
      if (!row.type) missing.push('type')
      if (row.value === undefined || row.value === '') missing.push('value')

      if (missing.length > 0) {
        errors.push(`Row ${rowNum}: missing fields - ${missing.join(', ')}`)
        return
      }

      const type = row.type.trim().toLowerCase()
      if (type !== 'percentage' && type !== 'flat') {
        errors.push(`Row ${rowNum}: type must be "percentage" or "flat", got "${row.type}"`)
        return
      }

      const value = parseFloat(row.value)
      if (Number.isNaN(value) || value <= 0) {
        errors.push(`Row ${rowNum}: value must be a positive number, got "${row.value}"`)
        return
      }

      const minCartValue = row.min_cart_value ? parseFloat(row.min_cart_value) : null

      data.push({
        ruleId: row.rule_id.trim(),
        scope: 'cart',
        appliesTo: '',
        type,
        value,
        stackable: false,
        minCartValue: Number.isNaN(minCartValue) ? null : minCartValue,
      })
      return
    }

    const missing = []
    if (!row.rule_id) missing.push('rule_id')
    if (!row.scope) missing.push('scope')
    if (!row.applies_to) missing.push('applies_to')
    if (!row.type) missing.push('type')
    if (row.value === undefined || row.value === '') missing.push('value')
    if (row.stackable === undefined || row.stackable === '') missing.push('stackable')

    if (missing.length > 0) {
      errors.push(`Row ${rowNum}: missing fields - ${missing.join(', ')}`)
      return
    }

    if (scope !== 'brand' && scope !== 'platform') {
      errors.push(`Row ${rowNum}: scope must be "brand", "platform", or "cart", got "${row.scope}"`)
      return
    }

    const type = row.type.trim().toLowerCase()
    if (type !== 'percentage' && type !== 'flat') {
      errors.push(`Row ${rowNum}: type must be "percentage" or "flat", got "${row.type}"`)
      return
    }

    const value = parseFloat(row.value)
    if (Number.isNaN(value) || value <= 0) {
      errors.push(`Row ${rowNum}: value must be a positive number, got "${row.value}"`)
      return
    }

    const stackableStr = row.stackable.trim().toLowerCase()
    const stackable = stackableStr === 'true' || stackableStr === '1' || stackableStr === 'yes'

    data.push({
      ruleId: row.rule_id.trim(),
      scope,
      appliesTo: row.applies_to.trim(),
      type,
      value,
      stackable,
      minCartValue: null,
    })
  })

  return { data, errors }
}

export function parseCartCSV(csvText) {
  const { data: rows, errors: parseErrors } = Papa.parse(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
  })

  if (parseErrors.length > 0) {
    return { data: [], errors: parseErrors.map((error) => error.message) }
  }

  const data = []
  const errors = []

  rows.forEach((row, index) => {
    const rowNum = index + 2
    const missing = []
    if (!row.item_id) missing.push('item_id')
    if (!row.product) missing.push('product')
    if (!row.brand) missing.push('brand')
    if (!row.platform) missing.push('platform')
    if (row.base_price === undefined || row.base_price === '') missing.push('base_price')

    if (missing.length > 0) {
      errors.push(`Row ${rowNum}: missing fields - ${missing.join(', ')}`)
      return
    }

    const basePrice = parseFloat(row.base_price)
    if (Number.isNaN(basePrice) || basePrice <= 0) {
      errors.push(`Row ${rowNum}: base_price must be a positive number, got "${row.base_price}"`)
      return
    }

    data.push({
      itemId: row.item_id.trim(),
      product: row.product.trim(),
      brand: row.brand.trim(),
      platform: row.platform.trim(),
      basePrice: Math.round(basePrice),
    })
  })

  return { data, errors }
}
