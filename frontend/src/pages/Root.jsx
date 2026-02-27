import { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function formatTimestamp(isoString) {
  if (!isoString) return '—'
  const d = new Date(isoString)
  return d.toLocaleString()
}

const HIGH_AMOUNT_THRESHOLD = 10_000

export default function Root() {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [clearingId, setClearingId] = useState(null)
  const [isSuper, setIsSuper] = useState(false)
  const [selectedIds, setSelectedIds] = useState(() => new Set())
  const [isBulkClearing, setIsBulkClearing] = useState(false)
  const hoveringCriticalRef = useRef(false)
  const clearCriticalTimeoutRef = useRef(null)
  const clearingIdRef = useRef(null)
  const isBulkClearingRef = useRef(false)

  const setHoveringCritical = (value) => {
    if (clearCriticalTimeoutRef.current) {
      clearTimeout(clearCriticalTimeoutRef.current)
      clearCriticalTimeoutRef.current = null
    }
    if (value) {
      hoveringCriticalRef.current = true
    } else {
      clearCriticalTimeoutRef.current = setTimeout(() => {
        hoveringCriticalRef.current = false
        clearCriticalTimeoutRef.current = null
      }, 200)
    }
  }

  const handleClearFunds = async (transactionId) => {
    setClearingId(transactionId)
    clearingIdRef.current = transactionId
    try {
      const res = await fetch(`${API_BASE}/transactions/${transactionId}/clear-funds`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error(await res.text())
      const updated = await res.json()
      setTransactions((prev) =>
        prev.map((t) => (t.id === updated.id ? { ...t, status: updated.status } : t))
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setClearingId(null)
      clearingIdRef.current = null
    }
  }

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleClearSelected = async () => {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    setIsBulkClearing(true)
    isBulkClearingRef.current = true
    await Promise.allSettled(
      ids.map((id) =>
        fetch(`${API_BASE}/transactions/${id}/clear-funds`, { method: 'POST' }).then((res) =>
          res.ok ? res.json() : Promise.reject(new Error(res.status))
        )
      )
    )
    setSelectedIds(new Set())
    setIsBulkClearing(false)
    isBulkClearingRef.current = false
  }

  useEffect(() => {
    return () => {
      if (clearCriticalTimeoutRef.current) clearTimeout(clearCriticalTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetch(`${API_BASE}/transactions`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data) => {
        if (!cancelled) setTransactions(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (hoveringCriticalRef.current || clearingIdRef.current !== null || isBulkClearingRef.current) return // don't refresh while hovering checkbox/clear button or clearing
      fetch(`${API_BASE}/transactions`)
        .then((res) => res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`)))
        .then((data) => setTransactions(data))
        .catch(() => {}) // keep previous data on poll error
    }, 2000)
    return () => clearInterval(intervalId)
  }, [])

  if (loading) return <div className="root-page"><p className="root-message">Loading transactions…</p></div>
  if (error) return <div className="root-page"><p className="root-message root-error">Error: {error}</p></div>

  return (
    <div className="root-page">
      <h1>Transactions</h1>
      <div className="top-actions">
        <div className="super-toggle">
          <label htmlFor="super-toggle">Super admin</label>
          <input
            id="super-toggle"
            type="checkbox"
            checked={isSuper}
            onChange={(e) => setIsSuper(e.target.checked)}
          />
        </div>
        <button
          type="button"
          className="clear-selected-btn"
          disabled={selectedIds.size === 0 || isBulkClearing}
          onClick={handleClearSelected}
        >
          {isBulkClearing ? 'Clearing...' : `Clear Selected${selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}`}
        </button>
      </div>
      <div className="table-wrap">
        <table className="transactions-table">
          <thead>
            <tr>
              <th className="col-select"><span className="visually-hidden">Select</span></th>
              <th>ID</th>
              <th>Client name</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Timestamp</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-cell">No transactions yet</td>
              </tr>
            ) : (
              transactions.map((t) => {
                const isHighAmount = t.amount > HIGH_AMOUNT_THRESHOLD
                const canClear = t.status === 'pending' && (!isHighAmount || isSuper)
                const isSelected = selectedIds.has(t.id)
                return (
                  <tr key={t.id} className={isHighAmount ? 'row-high-amount' : ''}>
                    <td className="col-select">
                      {canClear ? (
                        <input
                          type="checkbox"
                          className="select-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(t.id)}
                          onMouseEnter={() => setHoveringCritical(true)}
                          onMouseLeave={() => setHoveringCritical(false)}
                          aria-label={`Select transaction ${t.id}`}
                        />
                      ) : null}
                    </td>
                    <td>{t.id}</td>
                    <td>{t.client_name}</td>
                    <td>{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td><span className={`status status-${t.status}`}>{t.status}</span></td>
                    <td>{formatTimestamp(t.timestamp)}</td>
                    <td>
                      {canClear && (
                        <button
                          type="button"
                          className="clear-funds-btn"
                          disabled={clearingId === t.id}
                          onMouseEnter={() => setHoveringCritical(true)}
                          onMouseLeave={() => setHoveringCritical(false)}
                          onClick={() => handleClearFunds(t.id)}
                        >
                          {clearingId === t.id ? 'Processing...' : 'Clear Funds'}
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
