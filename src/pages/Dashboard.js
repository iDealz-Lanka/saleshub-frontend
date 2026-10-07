import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const BRANCHES = ['Prime', 'Liberty', 'Marino'];
const BRANCH_BADGE = { Prime: 'badge-prime', Liberty: 'badge-liberty', Marino: 'badge-marino' };

const ExtraInfo = ({ s }) => (
  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: '1px solid #E0E7FF' }}>
    {s.inv_no && (
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>INV No.</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.inv_no}</div>
      </div>
    )}
    {s.acc_inv_no && (
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>ACC INV No.</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.acc_inv_no}</div>
      </div>
    )}
    {s.cashier && (
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Cashier</div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{s.cashier}</div>
      </div>
    )}
    {s.google_review && (
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase' }}>Google Review</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: s.google_review === 'YES' ? '#10B981' : '#EF4444' }}>
          {s.google_review}
        </div>
      </div>
    )}
    {s.remarks && (
      <div style={{ flexBasis: '100%' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 }}>Remarks</div>
        <div style={{ fontSize: 13, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '6px 10px', color: '#92400E' }}>
          📝 {s.remarks}
        </div>
      </div>
    )}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(today);
  const [branch, setBranch] = useState(user?.role === 'admin' ? '' : user?.branch);
  const [imeiQuery, setImeiQuery] = useState('');
  const [imeiResult, setImeiResult] = useState(null);
  const [imeiSearched, setImeiSearched] = useState(false);
  const [imeiLoading, setImeiLoading] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  const [showExportPanel, setShowExportPanel] = useState(false);
  const [exportFrom, setExportFrom] = useState(today);
  const [exportTo, setExportTo] = useState(today);
  const [exportBranch, setExportBranch] = useState(user?.role === 'admin' ? '' : user?.branch);
  const [exporting, setExporting] = useState(false);

  // Lock managers to today and their own branch
  useEffect(() => {
    if (user?.role !== 'admin') {
      setDate(today);
      setBranch(user?.branch);
      setExportBranch(user?.branch);
    }
  }, [user, today]);

  const fetchSales = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (date) params.date = date;
      if (branch) params.branch = branch;
      const { data } = await api.get('/sales', { params });
      setSales(data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [date, branch]);

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const handleIMEISearch = async () => {
    if (!imeiQuery.trim()) return;
    setImeiLoading(true);
    setImeiSearched(false);
    setImeiResult(null);
    try {
      const { data } = await api.get('/sales', { params: { imei: imeiQuery.trim() } });
      setImeiResult(data.length > 0 ? data : []);
    } catch { setImeiResult([]); }
    finally { setImeiLoading(false); setImeiSearched(true); }
  };

  const handleExport = async (type) => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (exportFrom) params.set('from', exportFrom);
      if (exportTo) params.set('to', exportTo);
      if (exportBranch) params.set('branch', exportBranch);
      const token = localStorage.getItem('token');
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/sales/export/${type}?${params}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sales_${exportFrom}_to_${exportTo}_${exportBranch || 'all'}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      link.click();
    } catch (err) { alert('Export failed. Please try again.'); }
    finally { setExporting(false); }
  };

  const totalValue = sales.reduce((s, r) => s + parseFloat(r.invoice_value || 0), 0);
  const totalCost = sales.reduce((s, r) => s + parseFloat(r.cost || 0), 0);

  const quickRanges = [
    { label: 'Today', from: today, to: today },
    { label: 'This Week', from: format(new Date(new Date().setDate(new Date().getDate() - new Date().getDay())), 'yyyy-MM-dd'), to: today },
    { label: 'This Month', from: format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd'), to: today },
    { label: 'Last Month', from: format(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), 'yyyy-MM-dd'), to: format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), 'yyyy-MM-dd') },
    { label: 'Last 7 Days', from: format(new Date(new Date().setDate(new Date().getDate() - 7)), 'yyyy-MM-dd'), to: today },
    { label: 'Last 30 Days', from: format(new Date(new Date().setDate(new Date().getDate() - 30)), 'yyyy-MM-dd'), to: today },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3" style={{ marginBottom: 24 }}>
        <div>
          <h2>📊 Sales Dashboard</h2>
          <p className="text-muted text-sm" style={{ marginTop: 2 }}>
            {user?.role === 'admin' ? 'All branches' : `${user?.branch} branch`}
          </p>
        </div>
        {/* Export only for admin */}
        {user?.role === 'admin' && (
          <button className="btn btn-primary ml-auto" onClick={() => setShowExportPanel(!showExportPanel)}>
            ⬇ Export
          </button>
        )}
      </div>

      {/* Export Panel — Admin Only */}
      {showExportPanel && user?.role === 'admin' && (
        <div className="card" style={{ marginBottom: 20, border: '1.5px solid #10B981' }}>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#065F46', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              📥 Export Sales Report
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>From Date</label>
                <input type="date" className="form-control" style={{ width: 160 }}
                  value={exportFrom} onChange={e => setExportFrom(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>To Date</label>
                <input type="date" className="form-control" style={{ width: 160 }}
                  value={exportTo} onChange={e => setExportTo(e.target.value)} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Branch</label>
                <select className="form-control" style={{ width: 140 }}
                  value={exportBranch} onChange={e => setExportBranch(e.target.value)}>
                  <option value="">All Branches</option>
                  {BRANCHES.map(b => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-success" onClick={() => handleExport('excel')} disabled={exporting}>
                  {exporting ? '...' : '⬇ Excel'}
                </button>
                <button className="btn btn-outline" onClick={() => handleExport('pdf')} disabled={exporting}>
                  {exporting ? '...' : '⬇ PDF'}
                </button>
              </div>
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', alignSelf: 'center' }}>QUICK:</span>
              {quickRanges.map(r => (
                <button key={r.label} onClick={() => { setExportFrom(r.from); setExportTo(r.to); }}
                  style={{
                    background: exportFrom === r.from && exportTo === r.to ? 'var(--primary)' : '#F3F4F6',
                    color: exportFrom === r.from && exportTo === r.to ? 'white' : 'var(--text)',
                    border: 'none', padding: '5px 12px', borderRadius: 20,
                    fontSize: 12, fontWeight: 500, cursor: 'pointer'
                  }}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* IMEI Search */}
      <div className="card" style={{ marginBottom: 20, border: '1.5px solid #818CF8' }}>
        <div className="card-body" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🔍 Search by IMEI / Serial Number
          </div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <input className="form-control" style={{ maxWidth: 340, fontFamily: 'monospace' }}
              placeholder="Enter IMEI or Serial Number..."
              value={imeiQuery}
              onChange={e => { setImeiQuery(e.target.value); setImeiSearched(false); setImeiResult(null); }}
              onKeyDown={e => e.key === 'Enter' && handleIMEISearch()} />
            <button className="btn btn-primary" onClick={handleIMEISearch} disabled={imeiLoading}>
              {imeiLoading ? 'Searching...' : '🔍 Search'}
            </button>
            {imeiSearched && (
              <button className="btn btn-ghost" onClick={() => { setImeiQuery(''); setImeiResult(null); setImeiSearched(false); }}>
                ✕ Clear
              </button>
            )}
          </div>

          {imeiSearched && imeiResult !== null && (
            <div
