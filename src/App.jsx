import { useRef, useState } from 'react'
import CsvUploader from './components/CsvUploader.jsx'
import DataTable from './components/DataTable.jsx'
import ErrorBanner from './components/ErrorBanner.jsx'
import { parseCartCSV, parseRulesCSV } from './engine/csvParser.js'
import { processCart } from './engine/discountEngine.js'
import { parseNLRule } from './engine/nlRuleParser.js'
import { parseWithGemini } from './engine/geminiParser.js'
import { parsePDFCart } from './engine/pdfParser.js'

const RULES_COLUMNS = [
  { key: 'ruleId', label: 'Rule ID' },
  { key: 'scope', label: 'Scope', render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'appliesTo', label: 'Applies To', render: (v) => v || '-' },
  { key: 'type', label: 'Type', render: (v) => v.charAt(0).toUpperCase() + v.slice(1) },
  { key: 'value', label: 'Value', render: (v, row) => row.type === 'percentage' ? `${v}% off` : `Rs.${v} off` },
  { key: 'stackable', label: 'Stackable', render: (v) => (v ? 'Yes' : 'No') },
  { key: 'minCartValue', label: 'Min Cart Value', render: (v) => v ? `Rs.${v.toLocaleString('en-IN')}` : '-' },
]

const CART_COLUMNS = [
  { key: 'itemId', label: 'Item' },
  { key: 'product', label: 'Product' },
  { key: 'brand', label: 'Brand' },
  { key: 'platform', label: 'Platform' },
  { key: 'basePrice', label: 'Base Price', render: (v) => `Rs.${v.toLocaleString('en-IN')}` },
]

const RESULTS_COLUMNS = [
  { key: 'itemId', label: 'Item' },
  { key: 'product', label: 'Product' },
  { key: 'basePrice', label: 'Base Price', render: (v) => `Rs.${v.toLocaleString('en-IN')}` },
  {
    key: 'finalPrice',
    label: 'Final Price',
    render: (v, row) => (
      <span style={{ fontWeight: 700, color: row.totalDiscount > 0 ? '#1e5c2c' : '#131A48' }}>
        Rs.{v.toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    key: 'totalDiscount',
    label: 'You Save',
    render: (v) => v > 0
      ? <span style={{ color: '#1e5c2c', fontWeight: 600 }}>Rs.{v.toLocaleString('en-IN')}</span>
      : <span style={{ color: '#888' }}>-</span>,
  },
  {
    key: 'reasoning',
    label: 'Offer Applied',
    render: (v) => (
      <span style={{ color: v === 'No offers available' ? '#888' : '#131A48', fontStyle: v === 'No offers available' ? 'italic' : 'normal' }}>
        {v}
      </span>
    ),
  },
]

const S = {
  page: { minHeight: '100vh', background: '#f7f7f9', fontFamily: 'Arial, sans-serif' },
  header: { background: '#131A48', padding: '0.85rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoTxt: { fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700, color: '#fff' },
  logoSpan: { color: '#FF5800' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.07em' },
  main: { maxWidth: 1080, margin: '0 auto', padding: '1.8rem 1.5rem' },
  section: { background: '#fff', border: '1px solid #CECECE', borderRadius: 6, padding: '1.2rem 1.4rem', marginBottom: '1.2rem' },
  sectionTitle: { fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 14, color: '#131A48', marginBottom: '0.7rem', paddingBottom: 6, borderBottom: '2px solid #FF5800', display: 'inline-block' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' },
  btn: { background: '#FF5800', color: '#fff', border: 'none', borderRadius: 4, padding: '0.65rem 1.4rem', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  btnDisabled: { background: '#CECECE', color: '#fff', border: 'none', borderRadius: 4, padding: '0.65rem 1.4rem', fontSize: 13, fontWeight: 700, cursor: 'not-allowed', letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap' },
  btnSm: (color = '#131A48') => ({ background: color, color: '#fff', border: 'none', borderRadius: 4, padding: '0.4rem 1rem', fontSize: 12, fontWeight: 700, cursor: 'pointer' }),
  btnOutline: { background: 'transparent', color: '#555', border: '1px solid #CECECE', borderRadius: 4, padding: '0.4rem 1rem', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  totalRow: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '2px solid #131A48' },
  totalLabel: { fontWeight: 700, fontSize: 14, color: '#131A48' },
  totalValue: { fontWeight: 700, fontSize: 16, color: '#131A48' },
  cartOfferRow: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #CECECE' },
  input: { width: '100%', border: '1px solid #CECECE', borderRadius: 4, padding: '0.55rem 0.8rem', fontSize: 13, outline: 'none' },
  pill: (color, bg) => ({ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: bg, color, textTransform: 'uppercase', letterSpacing: '0.04em' }),
  confirmBox: { background: '#f0f6ff', border: '1px solid #4a90d9', borderRadius: 6, padding: '1rem 1.2rem', marginTop: '0.75rem' },
  fieldGrid: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', fontSize: 12, marginTop: 8, marginBottom: 12 },
  fieldKey: { color: '#888', fontWeight: 700, textTransform: 'uppercase', fontSize: 10, paddingTop: 2 },
  fieldVal: { color: '#131A48', fontWeight: 600 },
  tab: (active) => ({ padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', borderRadius: '4px 4px 0 0', border: '1px solid #CECECE', borderBottom: active ? '1px solid #fff' : '1px solid #CECECE', background: active ? '#fff' : '#f7f7f9', color: active ? '#FF5800' : '#555', marginRight: 4 }),
  tabPane: { border: '1px solid #CECECE', borderRadius: '0 4px 4px 4px', padding: '1rem', background: '#fff' },
  uploadZone: (hover, hasData) => ({ border: `2px dashed ${hasData ? '#1e5c2c' : hover ? '#FF5800' : '#CECECE'}`, borderRadius: 6, padding: '1.2rem', background: hasData ? '#f0faf2' : '#fafafa', cursor: 'pointer', transition: 'border-color 0.15s', textAlign: 'center' }),
}

function scopeColor(scope) {
  if (scope === 'brand') return { color: '#7b3f00', bg: '#fde8cf' }
  if (scope === 'platform') return { color: '#1a3a6b', bg: '#d6eaff' }
  if (scope === 'cart') return { color: '#1e5c2c', bg: '#d4f4df' }
  return { color: '#555', bg: '#eee' }
}

export default function App() {
  const [rules, setRules] = useState([])
  const [rulesErrors, setRulesErr] = useState([])
  const [rulesFileName, setRulesFileName] = useState('')
  const [cartItems, setCartItems] = useState([])
  const [cartErrors, setCartErrors] = useState([])
  const [cartFileName, setCartFileName] = useState('')
  const [cartResult, setCartResult] = useState(null)
  const [nlText, setNlText] = useState('')
  const [nlLoading, setNlLoading] = useState(false)
  const [nlError, setNlError] = useState('')
  const [pendingRule, setPendingRule] = useState(null)
  const [nlRuleCount, setNlRuleCount] = useState(0)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfErrors, setPdfErrors] = useState([])
  const [pdfHover, setPdfHover] = useState(false)
  const [cartTab, setCartTab] = useState('csv')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const pdfInputRef = useRef(null)

  function rerunIfReady(nextCartItems = cartItems, nextRules = rules) {
    if (nextCartItems.length > 0 && nextRules.length > 0) {
      setCartResult(processCart(nextCartItems, nextRules))
    } else {
      setCartResult(null)
    }
  }

  function handleRulesLoad(csvText, fileName) {
    const { data, errors } = parseRulesCSV(csvText)
    setRules(data)
    setRulesErr(errors)
    setRulesFileName(fileName)
    rerunIfReady(cartItems, data)
  }

  function handleCartLoad(csvText, fileName) {
    const { data, errors } = parseCartCSV(csvText)
    setCartItems(data)
    setCartErrors(errors)
    setCartFileName(fileName)
    setPdfErrors([])
    rerunIfReady(data, rules)
  }

  async function handlePdfUpload(file) {
    if (!file) return
    setPdfLoading(true)
    setPdfErrors([])
    setCartResult(null)

    const { data, errors } = await parsePDFCart(file)
    setPdfLoading(false)
    setPdfErrors(errors)

    if (data.length > 0) {
      setCartItems(data)
      setCartFileName(file.name)
      setCartErrors([])
      rerunIfReady(data, rules)
    }
  }

  function handleCalculate() {
    setCartResult(processCart(cartItems, rules))
  }

  async function handleNLParse() {
    if (!nlText.trim()) return
    setNlLoading(true)
    setNlError('')
    setPendingRule(null)

    try {
      const useGemini = apiKey.trim().length > 0
      const parsed = useGemini
        ? await parseWithGemini(nlText.trim(), apiKey.trim())
        : parseNLRule(nlText.trim())
      const parsedVia = useGemini ? 'gemini' : 'local'

      if (parsed.ambiguous) {
        setNlError(`Ambiguous rule: ${parsed.ambiguityReason}. Please be more specific.`)
      } else {
        const count = nlRuleCount + 1
        setNlRuleCount(count)
        setPendingRule({ ...parsed, ruleId: `NL-${String(count).padStart(2, '0')}`, parsedVia })
      }
    } catch (err) {
      setNlError(`Error: ${err.message}`)
    } finally {
      setNlLoading(false)
    }
  }

  function handleConfirmRule() {
    if (!pendingRule) return
    const newRules = [...rules, pendingRule]
    setRules(newRules)
    setPendingRule(null)
    setNlText('')
    setNlError('')
    rerunIfReady(cartItems, newRules)
  }

  const canCalculate = rules.length > 0 && cartItems.length > 0

  return (
    <div style={S.page}>
      <div style={S.header}>
        <div style={S.logoTxt}>O<span style={S.logoSpan}>pp</span>tra</div>
        <div style={S.headerSub}>Discount Engine</div>
      </div>

      <div style={S.main}>
        <div style={S.grid2}>
          <div style={S.section}>
            <div style={S.sectionTitle}>Discount Rules</div>
            <CsvUploader label="rules.csv" description="Upload your discount rules CSV" onLoad={handleRulesLoad} hasData={rules.length > 0} fileName={rulesFileName} />
            <ErrorBanner errors={rulesErrors} />
            {rules.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{rules.length} rule{rules.length > 1 ? 's' : ''} loaded</div>
                <DataTable columns={RULES_COLUMNS} rows={rules} />
              </div>
            )}
          </div>

          <div style={S.section}>
            <div style={S.sectionTitle}>Cart Items</div>
            <div>
              <span style={S.tab(cartTab === 'csv')} onClick={() => setCartTab('csv')}>CSV</span>
              <span style={S.tab(cartTab === 'pdf')} onClick={() => setCartTab('pdf')}>PDF Upload</span>
            </div>

            <div style={S.tabPane}>
              {cartTab === 'csv' && (
                <CsvUploader label="cart.csv" description="Upload your cart CSV" onLoad={handleCartLoad} hasData={cartItems.length > 0 && !pdfLoading} fileName={cartFileName} />
              )}

              {cartTab === 'pdf' && (
                <>
                  <div
                    style={S.uploadZone(pdfHover, cartItems.length > 0 && cartFileName?.endsWith?.('.pdf'))}
                    onClick={() => pdfInputRef.current?.click()}
                    onMouseEnter={() => setPdfHover(true)}
                    onMouseLeave={() => setPdfHover(false)}
                    onDragOver={(e) => { e.preventDefault(); setPdfHover(true) }}
                    onDragLeave={() => setPdfHover(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setPdfHover(false)
                      const file = e.dataTransfer.files[0]
                      if (file?.type === 'application/pdf') handlePdfUpload(file)
                    }}
                  >
                    <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={(e) => handlePdfUpload(e.target.files[0])} />
                    <div style={{ fontSize: 18, marginBottom: 6 }}>{pdfLoading ? '...' : cartItems.length > 0 && cartFileName?.endsWith?.('.pdf') ? 'Loaded' : 'PDF'}</div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#131A48' }}>
                      {pdfLoading ? 'Extracting items from PDF...' : cartItems.length > 0 && cartFileName?.endsWith?.('.pdf') ? cartFileName : 'Drop a cart PDF here or click to browse'}
                    </div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Expected columns: Product / Brand / Platform / Base Price</div>
                  </div>
                  <ErrorBanner errors={pdfErrors} />
                </>
              )}
            </div>

            <ErrorBanner errors={cartErrors} />
            {cartItems.length > 0 && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{cartItems.length} item{cartItems.length > 1 ? 's' : ''} loaded</div>
                <DataTable columns={CART_COLUMNS} rows={cartItems} />
              </div>
            )}
          </div>
        </div>

        <div style={S.section}>
          <div style={S.sectionTitle}>Add Rule in Plain English</div>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>Describe a discount rule and review the parsed fields before adding it.</div>
          <div style={{ marginBottom: 10 }}>
            <span
              style={{ fontSize: 11, color: '#4a90d9', cursor: 'pointer', fontWeight: 600 }}
              onClick={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? '▾' : '▸'} Gemini API Key {apiKey.trim() ? '(set)' : '(optional)'}
            </span>
            {showApiKey && (
              <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  style={{ ...S.input, flex: '1 1 240px', fontSize: 12, fontFamily: 'monospace' }}
                  type="password"
                  placeholder="Paste Gemini API key to use LLM parsing"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <span style={{ fontSize: 10, color: '#888', whiteSpace: 'nowrap' }}>
                  {apiKey.trim() ? '✓ Will use Gemini' : 'No key → local regex parser'}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              style={{ ...S.input, flex: '1 1 320px' }}
              placeholder='e.g. "20% off for Natura Casa brand, stackable"'
              value={nlText}
              onChange={(e) => setNlText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleNLParse() }}
              disabled={nlLoading}
            />
            <button style={nlLoading || !nlText.trim() ? S.btnDisabled : S.btn} onClick={handleNLParse} disabled={nlLoading || !nlText.trim()}>
              {nlLoading ? 'Parsing...' : 'Parse'}
            </button>
          </div>

          {nlError && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#fce8e8', border: '1px solid #e57373', borderRadius: 4, fontSize: 12, color: '#8a1a1a' }}>{nlError}</div>
          )}

          {pendingRule && !pendingRule.ambiguous && (
            <div style={S.confirmBox}>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#1a3a6b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                Parsed rule - confirm before adding:
                <span style={S.pill(
                  pendingRule.parsedVia === 'gemini' ? '#1a5c3a' : '#555',
                  pendingRule.parsedVia === 'gemini' ? '#d4f4df' : '#eee'
                )}>
                  {pendingRule.parsedVia === 'gemini' ? '✦ Gemini' : '⚙ Local'}
                </span>
              </div>
              <div style={S.fieldGrid}>
                <span style={S.fieldKey}>Rule ID</span><span style={S.fieldVal}>{pendingRule.ruleId}</span>
                <span style={S.fieldKey}>Scope</span><span style={S.fieldVal}><span style={S.pill(scopeColor(pendingRule.scope).color, scopeColor(pendingRule.scope).bg)}>{pendingRule.scope}</span></span>
                {pendingRule.appliesTo && <><span style={S.fieldKey}>Applies To</span><span style={S.fieldVal}>{pendingRule.appliesTo}</span></>}
                <span style={S.fieldKey}>Type</span><span style={S.fieldVal}>{pendingRule.type}</span>
                <span style={S.fieldKey}>Value</span><span style={S.fieldVal}>{pendingRule.type === 'percentage' ? `${pendingRule.value}% off` : `Rs.${pendingRule.value} off`}</span>
                {pendingRule.scope !== 'cart' && <><span style={S.fieldKey}>Stackable</span><span style={S.fieldVal}>{pendingRule.stackable ? 'Yes' : 'No'}</span></>}
                {pendingRule.minCartValue != null && <><span style={S.fieldKey}>Min Cart Value</span><span style={S.fieldVal}>Rs.{pendingRule.minCartValue.toLocaleString('en-IN')}</span></>}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={S.btnSm('#1e5c2c')} onClick={handleConfirmRule}>Add Rule</button>
                <button style={S.btnOutline} onClick={() => { setPendingRule(null); setNlError('') }}>Discard</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
          <button style={canCalculate ? S.btn : S.btnDisabled} onClick={handleCalculate} disabled={!canCalculate}>Calculate Discounts</button>
          {!canCalculate && <div style={{ fontSize: 11, color: '#888', marginTop: 6 }}>Upload rules and cart items to calculate</div>}
        </div>

        {cartResult && (
          <div style={S.section}>
            <div style={S.sectionTitle}>Cart Summary</div>
            <DataTable columns={RESULTS_COLUMNS} rows={cartResult.itemResults} />
            <div style={{ ...S.totalRow, borderTop: '1px solid #e0e0e0', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
              <span style={{ ...S.totalLabel, fontWeight: 400, fontSize: 12, color: '#666' }}>Items subtotal</span>
              <span style={{ ...S.totalValue, fontWeight: 500, fontSize: 13, color: '#666' }}>Rs.{cartResult.itemTotal.toLocaleString('en-IN')}</span>
            </div>
            {cartResult.cartOffer && (
              <div style={S.cartOfferRow}>
                <span style={{ fontSize: 12, color: '#1e5c2c', background: '#d4f4df', padding: '3px 10px', borderRadius: 20, fontWeight: 700 }}>{cartResult.cartOffer.label}</span>
                <span style={{ color: '#1e5c2c', fontWeight: 700, fontSize: 14 }}>-Rs.{cartResult.cartOffer.saving.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div style={S.totalRow}>
              <span style={S.totalLabel}>Final Cart Total</span>
              <span style={{ ...S.totalValue, fontSize: 18, color: '#FF5800' }}>Rs.{cartResult.finalTotal.toLocaleString('en-IN')}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
