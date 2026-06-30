import * as pdfjsLib from 'pdfjs-dist'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export async function parsePDFCart(file) {
  const arrayBuffer = await file.arrayBuffer()

  let pdf
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  } catch (err) {
    return { data: [], errors: [`Could not read PDF: ${err.message}`] }
  }

  const allItems = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()

    for (const item of content.items) {
      if (item.str.trim()) {
        allItems.push({
          text: item.str.trim(),
          x: Math.round(item.transform[4]),
          y: Math.round(item.transform[5]),
        })
      }
    }
  }

  if (allItems.length === 0) {
    return { data: [], errors: ['No text found in PDF. Is it a scanned image?'] }
  }

  const rows = groupIntoRows(allItems, 6)
  rows.sort((a, b) => b[0].y - a[0].y)
  rows.forEach((row) => row.sort((a, b) => a.x - b.x))

  const headerIdx = rows.findIndex((row) => {
    const texts = row.map((cell) => cell.text.toLowerCase())
    return texts.some((text) => text.includes('product')) && texts.some((text) => text.includes('price'))
  })

  if (headerIdx === -1) {
    return {
      data: [],
      errors: [
        'Could not find a header row with "Product" and "Base Price" columns. Check that the PDF matches the expected format.',
      ],
    }
  }

  const colMap = buildColMap(rows[headerIdx])
  const data = []
  const errors = []
  let autoId = 1

  for (let rowIndex = headerIdx + 1; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]
    const rowText = row.map((cell) => cell.text).join(' ')
    const lowerRowText = rowText.toLowerCase()

    if (rowText.replace(/[-|]/g, '').trim() === '') continue
    if (lowerRowText.startsWith('order') || lowerRowText.startsWith('date')) continue

    const product = colValue(row, colMap.product)
    const brand = colValue(row, colMap.brand)
    const platform = colValue(row, colMap.platform)
    const priceRaw = colValue(row, colMap.basePrice)

    if (!product && !brand && !platform && !priceRaw) continue

    const missing = []
    if (!product) missing.push('Product')
    if (!brand) missing.push('Brand')
    if (!platform) missing.push('Platform')
    if (!priceRaw) missing.push('Base Price')

    if (missing.length > 0) {
      errors.push(`Row ${rowIndex + 1}: missing - ${missing.join(', ')} (row text: "${rowText.slice(0, 60)}")`)
      continue
    }

    const priceClean = priceRaw.replace(/Rs\.?|,|\s/gi, '').trim()
    const basePrice = parseFloat(priceClean)

    if (Number.isNaN(basePrice) || basePrice <= 0) {
      errors.push(`Row ${rowIndex + 1}: invalid Base Price "${priceRaw}" - skipping`)
      continue
    }

    data.push({
      itemId: `PDF-${String(autoId).padStart(2, '0')}`,
      product,
      brand,
      platform,
      basePrice: Math.round(basePrice),
    })
    autoId++
  }

  if (data.length === 0 && errors.length === 0) {
    errors.push('No cart items could be extracted from the PDF.')
  }

  return { data, errors }
}

function groupIntoRows(items, tolerance) {
  const rows = []

  for (const item of items) {
    const existing = rows.find((row) => Math.abs(row[0].y - item.y) <= tolerance)
    if (existing) {
      existing.push(item)
    } else {
      rows.push([item])
    }
  }

  return rows
}

function buildColMap(headerRow) {
  const known = {
    product: ['product'],
    brand: ['brand'],
    platform: ['platform'],
    basePrice: ['base price', 'base_price', 'price'],
  }

  const found = {}
  for (const cell of headerRow) {
    const lower = cell.text.toLowerCase()
    for (const [key, aliases] of Object.entries(known)) {
      if (aliases.some((alias) => lower.includes(alias)) && !found[key]) {
        found[key] = cell.x
      }
    }
  }

  const positions = Object.entries(found)
    .map(([key, x]) => ({ key, x }))
    .sort((a, b) => a.x - b.x)

  const ranges = {}
  for (let index = 0; index < positions.length; index++) {
    const { key, x } = positions[index]
    const nextX = positions[index + 1]?.x ?? Infinity
    ranges[key] = { min: x - 20, max: nextX - 1 }
  }

  return ranges
}

function colValue(row, range) {
  if (!range) return ''

  return row
    .filter((cell) => cell.x >= range.min && cell.x <= range.max)
    .map((cell) => cell.text)
    .join(' ')
    .trim()
}
