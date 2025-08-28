import React, { useMemo, useState, useEffect } from 'react'

const SUPPLIERS = ['Bidfood', 'Booker', 'Adams']
const CATEGORIES = ['Meats', 'Drinks', 'Frozen', 'Ambient', 'Veg', 'Sauces']

const API = '' // same host

async function api(path, opts = {}) {
  const res = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...opts })
  if (!res.ok) throw new Error('Request failed')
  return res.json()
}

export default function App() {
  const [items, setItems] = useState([])
  const [tab, setTab] = useState('Home')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (tab !== 'Home' && tab !== 'Overview') params.set('supplier', tab)
      const data = await api('/api/items?' + params.toString())
      setItems(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { if (tab !== 'Home') refresh() }, [tab])

  const submit = async (e) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body = Object.fromEntries(fd.entries())
    body.quantity = Number(body.quantity || 0)
    body.price = Number(body.price || 0)
    await api('/api/items', { method: 'POST', body: JSON.stringify(body) })
    e.currentTarget.reset()
    setTab('Overview')
    await refresh()
  }

  const removeItem = async (id) => {
    await api('/api/items/' + id, { method: 'DELETE' })
    await refresh()
  }

  const adjustQty = async (item, delta) => {
    const newQty = Math.max(0, (item.quantity || 0) + delta)
    await api('/api/items/' + item.id, { method: 'PATCH', body: JSON.stringify({ quantity: newQty }) })
    await refresh()
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter((i) => {
      const matchesQuery = !q || i.item.toLowerCase().includes(q)
      const matchesCat = categoryFilter === 'All' ? true : i.category === categoryFilter
      return matchesQuery && matchesCat
    })
  }, [items, search, categoryFilter])

  const totals = useMemo(() => {
    const bySupplier = SUPPLIERS.reduce((acc, s) => ({ ...acc, [s]: 0 }), {})
    let grand = 0
    for (const i of items) {
      const total = (i.quantity || 0) * (i.price || 0)
      grand += total
      if (bySupplier[i.supplier] !== undefined) bySupplier[i.supplier] += total
    }
    return { bySupplier, grand }
  }, [items])

  return (
    <div className="min-h-screen p-6 max-w-6xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Stock Management</h1>
        <p className="text-gray-600">Add items on Home. Use Overview or supplier tabs for stock take.</p>
      </header>

      <nav className="flex flex-wrap gap-2 mb-4">
        {['Home', 'Overview', ...SUPPLIERS].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl border ${tab === t ? 'bg-black text-white' : 'bg-white hover:bg-gray-50'}`}
          >
            {t}
          </button>
        ))}
        {tab !== 'Home' && (
          <button onClick={refresh} className="ml-auto px-3 py-2 rounded-xl border">Refresh</button>
        )}
      </nav>

      {tab === 'Home' && (
        <form onSubmit={submit} className="grid gap-3 bg-white p-4 rounded-2xl shadow mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Supplier</label>
              <select className="border rounded-lg p-2" name="supplier" defaultValue="Bidfood">
                {SUPPLIERS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium">Category</label>
              <select className="border rounded-lg p-2" name="category" defaultValue="Meats">
                {['Meats','Drinks','Frozen','Ambient','Veg','Sauces','Other'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium">Item</label>
              <input className="border rounded-lg p-2" name="item" placeholder="e.g. Chicken Breast 5kg" required />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="grid gap-1">
              <label className="text-sm font-medium">Quantity</label>
              <input type="number" min="0" className="border rounded-lg p-2" name="quantity" defaultValue="0" />
            </div>
            <div className="grid gap-1">
              <label className="text-sm font-medium">Unit Price (£)</label>
              <input type="number" min="0" step="0.01" className="border rounded-lg p-2" name="price" defaultValue="0" />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" className="w-full sm:w-auto px-4 py-2 rounded-xl bg-black text-white hover:opacity-90">
                Add Item
              </button>
            </div>
          </div>
        </form>
      )}

      {tab !== 'Home' && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <input
            className="border rounded-lg p-2 flex-1 min-w-[200px]"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="border rounded-lg p-2"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {['All', ...CATEGORIES].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="ml-auto text-sm text-gray-600">
            <span className="mr-4">Total: <strong>£{totals.grand.toFixed(2)}</strong></span>
          </div>
        </div>
      )}

      {tab !== 'Home' && (
        loading ? <p>Loading…</p> : (
          <div className="bg-white rounded-2xl shadow">
            <div className="grid grid-cols-12 gap-2 p-3 border-b text-xs font-semibold text-gray-600">
              <div className="col-span-3">Item</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-2">Total</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>
            {filtered.map((i) => (
              <div key={i.id} className="grid grid-cols-12 gap-2 items-center p-3 border-b last:border-0">
                <div className="col-span-3 font-medium">{i.item}</div>
                <div className="col-span-2"><span className="badge">{i.category}</span></div>
                <div className="col-span-2 flex items-center gap-2">
                  <button className="px-2 py-1 rounded-lg border" onClick={() => adjustQty(i, -1)}>-</button>
                  <span>{i.quantity}</span>
                  <button className="px-2 py-1 rounded-lg border" onClick={() => adjustQty(i, 1)}>+</button>
                </div>
                <div className="col-span-2">£{Number(i.price).toFixed(2)}</div>
                <div className="col-span-2 font-semibold">£{(Number(i.price) * Number(i.quantity)).toFixed(2)}</div>
                <div className="col-span-1 text-right">
                  <button className="px-3 py-1 rounded-lg border hover:bg-gray-50" onClick={() => removeItem(i.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <footer className="mt-10 text-xs text-gray-500">
        Served from one URL. Works on phones/tablets. No extra config needed.
      </footer>
    </div>
  )
}
