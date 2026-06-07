import React, { useState } from 'react';
import axios from 'axios';
import { Link2, Sparkles, Key, Calendar, Copy, Check, QrCode, FileText, Upload, Plus, AlertTriangle, Download, Trash2 } from 'lucide-react';

function LinkCreator({ user, token, showToast, onAuthRedirect, onShortenSuccess }) {
  const [mode, setMode] = useState('single'); // 'single' or 'bulk'
  
  // Single Link States
  const [longUrl, setLongUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Bulk States
  const [bulkUrls, setBulkUrls] = useState([]);
  const [bulkProgress, setBulkProgress] = useState([]); // Array tracking { url, status, shortUrl, error }
  const [bulkRunning, setBulkRunning] = useState(false);
  const [downloadingQr, setDownloadingQr] = useState(false);

  // Single Link Submit Handler
  const handleSingleShorten = async (e) => {
    e.preventDefault();
    if (!longUrl) return;

    setLoading(true);
    setResult(null);
    setCopied(false);

    try {
      const payload = {
        longUrl,
        customAlias: customAlias ? customAlias.trim() : undefined,
        password: password ? password.trim() : undefined,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined
      };

      const response = await axios.post('/api/links/shorten', payload);
      setResult(response.data);
      showToast('Short URL generated successfully!');
      
      // Clear inputs
      setLongUrl('');
      setCustomAlias('');
      setPassword('');
      setExpiresAt('');
      setShowAdvanced(false);

      if (onShortenSuccess) onShortenSuccess();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to shorten link.';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // CSV/Text File Upload Handler
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      // Split by commas, semicolons or newlines to find URLs
      const lines = text.split(/\r?\n/);
      const parsed = [];
      
      lines.forEach(line => {
        const trimmed = line.trim();
        if (trimmed.length > 0) {
          // If comma-separated, split and grab the first URL
          if (trimmed.includes(',')) {
            const cols = trimmed.split(',');
            const possibleUrl = cols.find(c => c.trim().startsWith('http://') || c.trim().startsWith('https://'));
            if (possibleUrl) parsed.push(possibleUrl.trim());
          } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            parsed.push(trimmed);
          }
        }
      });

      if (parsed.length === 0) {
        showToast('No valid URLs starting with http:// or https:// found.', 'error');
      } else {
        setBulkUrls(parsed);
        setBulkProgress(parsed.map(url => ({ url, status: 'pending', shortUrl: '', error: '' })));
        showToast(`Parsed ${parsed.length} URLs from file.`);
      }
    };
    reader.readAsText(file);
  };

  // Run Parallel Bulk Shortening
  const startBulkShortening = async () => {
    if (bulkUrls.length === 0 || bulkRunning) return;
    setBulkRunning(true);

    const updatedProgress = [...bulkProgress];
    
    // Process requests
    const shortenRequests = bulkUrls.map(async (url, idx) => {
      updatedProgress[idx] = { ...updatedProgress[idx], status: 'running' };
      setBulkProgress([...updatedProgress]);

      try {
        const response = await axios.post('/api/links/shorten', { longUrl: url });
        updatedProgress[idx] = {
          url,
          status: 'success',
          shortUrl: response.data.shortUrl,
          error: ''
        };
      } catch (err) {
        const errorMsg = err.response?.data?.error || 'Failed';
        updatedProgress[idx] = {
          url,
          status: 'error',
          shortUrl: '',
          error: errorMsg
        };
      }
      // Re-trigger visual updates
      setBulkProgress([...updatedProgress]);
    });

    await Promise.all(shortenRequests);
    setBulkRunning(false);
    showToast('Bulk shortening complete!');
    if (onShortenSuccess) onShortenSuccess();
  };

  const handleDownloadBulkCsv = () => {
    let csvContent = 'data:text/csv;charset=utf-8,Original URL,Short URL,Status,Error\n';
    bulkProgress.forEach(row => {
      csvContent += `"${row.url.replace(/"/g, '""')}","${row.shortUrl}","${row.status}","${row.error}"\n`;
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'shortened_links.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadQr = async (qrUrl) => {
    if (downloadingQr) return;
    setDownloadingQr(true);
    try {
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `qr_${result?.code || 'code'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast('QR Code downloaded successfully!');
    } catch (err) {
      console.error('Failed to download QR code:', err);
      // Fallback: open in new tab
      window.open(qrUrl, '_blank');
      showToast('Opened QR Code in a new window.');
    } finally {
      setDownloadingQr(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Visual Title / Hero banner */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }} className="float-animation">
        <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Shorten. Secure. <span className="gradient-text">Scale.</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          The enterprise-ready URL redirection engine featuring sub-10ms Redis resolutions, dynamic QR tags, password keys, and detailed IP traffic trackers.
        </p>
      </div>

      {/* Swappable creation tab console */}
      <div className="tabs-container" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
        <button 
          className={`tab-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => setMode('single')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} /> Single Link
          </div>
        </button>
        <button 
          className={`tab-btn ${mode === 'bulk' ? 'active' : ''}`}
          onClick={() => setMode('bulk')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <FileText size={16} /> Bulk Upload (CSV)
          </div>
        </button>
      </div>

      {/* Mode Single */}
      {mode === 'single' && (
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          <form onSubmit={handleSingleShorten}>
            
            {/* Target URL */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Destination Long URL</label>
              <div style={{ position: 'relative' }}>
                <Link2 size={20} style={{
                  position: 'absolute',
                  left: '1.1rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }} />
                <input 
                  type="url" 
                  className="input-field" 
                  placeholder="https://extremely-long-destination-url.com/some/deep/page?utm=123"
                  value={longUrl}
                  onChange={(e) => setLongUrl(e.target.value)}
                  required
                  style={{ paddingLeft: '2.8rem' }}
                />
              </div>
            </div>

            {/* Custom Alias */}
            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label>Custom Alias <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>(Optional)</span></label>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRight: 'none',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px 0 0 12px',
                  color: 'var(--text-muted)',
                  fontSize: '0.95rem'
                }}>
                  short.xyz/
                </span>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="custom-name"
                  value={customAlias}
                  onChange={(e) => setCustomAlias(e.target.value)}
                  style={{ borderRadius: '0 12px 12px 0' }}
                />
              </div>
            </div>

            {/* Advanced Toggle Option */}
            <div style={{ marginBottom: '2rem' }}>
              <button 
                type="button" 
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--secondary)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  outline: 'none'
                }}
              >
                <Plus size={14} style={{ transform: showAdvanced ? 'rotate(45deg)' : 'none', transition: 'transform 0.2s ease' }} /> 
                {showAdvanced ? 'Hide Advanced Options' : 'Configure Expiration & Passwords'}
              </button>

              {showAdvanced && (
                <div style={{
                  marginTop: '1.25rem',
                  padding: '1.5rem',
                  background: 'rgba(3,7,18,0.25)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem'
                }}>
                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={14} /> Expiration Date</label>
                    <input 
                      type="datetime-local" 
                      className="input-field"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                    />
                  </div>

                  <div className="form-group">
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Key size={14} /> Redirection Password</label>
                    <input 
                      type="password" 
                      className="input-field" 
                      placeholder="Encrypt redirect"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '1rem' }} disabled={loading}>
              {loading ? 'Processing redirection mapping...' : 'Shorten Link'}
              {!loading && <Sparkles size={16} />}
            </button>
          </form>
        </div>
      )}

      {/* Mode Bulk CSV */}
      {mode === 'bulk' && (
        <div className="glass-card" style={{ padding: '2.5rem' }}>
          
          {/* Info Warning */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            display: 'flex',
            gap: '0.75rem',
            color: 'var(--warning)',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            marginBottom: '1.75rem'
          }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div>
              <strong>Bulk Redirection Scopes:</strong> Guests can shorten batch lists, but to export spreadsheets or access click-analytics dashboards, registering is recommended. Upload a `.csv` or `.txt` file containing a URL on each line.
            </div>
          </div>

          <div style={{
            border: '2px dashed var(--border)',
            borderRadius: '16px',
            padding: '3rem 2rem',
            textAlign: 'center',
            background: 'rgba(3,7,18,0.2)',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            position: 'relative'
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <input 
              type="file" 
              accept=".csv,.txt"
              onChange={handleFileUpload}
              style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                opacity: 0, cursor: 'pointer'
              }}
            />
            <Upload size={38} className="text-secondary" style={{ margin: '0 auto 1rem', filter: 'drop-shadow(0 0 10px rgba(6,182,212,0.3))' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>Drag & Drop CSV</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>or click to browse local storage (.csv, .txt formats)</p>
          </div>

          {bulkUrls.length > 0 && (
            <div style={{ marginTop: '2.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '1rem', fontWeight: 600 }}>{bulkUrls.length} links queued</span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={() => { setBulkUrls([]); setBulkProgress([]); }} disabled={bulkRunning}>
                    <Trash2 size={14} /> Clear
                  </button>
                  <button className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }} onClick={startBulkShortening} disabled={bulkRunning}>
                    {bulkRunning ? 'Shortening batch...' : 'Start Shortening'}
                  </button>
                </div>
              </div>

              {/* Progress Console */}
              <div style={{
                maxHeight: '300px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                background: 'rgba(3,7,18,0.4)'
              }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Original Destination</th>
                      <th style={{ width: '150px' }}>Status</th>
                      <th>Shortened Mapped</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkProgress.map((row, idx) => (
                      <tr key={idx}>
                        <td style={{
                          maxWidth: '250px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '0.85rem'
                        }}>
                          {row.url}
                        </td>
                        <td>
                          {row.status === 'pending' && <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>⏳ Queued</span>}
                          {row.status === 'running' && <span style={{ color: 'var(--secondary)', fontSize: '0.85rem' }}>⚡ Processing</span>}
                          {row.status === 'success' && <span style={{ color: 'var(--success)', fontSize: '0.85rem' }}>✅ Ready</span>}
                          {row.status === 'error' && <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>❌ {row.error}</span>}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {row.shortUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <a href={row.shortUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary)', textDecoration: 'none' }}>{row.shortUrl}</a>
                              <button onClick={() => handleCopy(row.shortUrl)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}><Copy size={12} /></button>
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {bulkProgress.some(r => r.status === 'success') && !bulkRunning && (
                <button className="btn-secondary" style={{ width: '100%', marginTop: '1.25rem' }} onClick={handleDownloadBulkCsv}>
                  <Download size={16} /> Download Mapped Spreadsheets (CSV)
                </button>
              )}
            </div>
          )}

        </div>
      )}

      {/* Result Card Modal for single shorten */}
      {result && (
        <div style={{
          marginTop: '2.5rem',
          animation: 'float 6s ease-in-out infinite'
        }} className="glass-card">
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '3fr 1.5fr',
            gap: '2.5rem'
          }}>
            
            {/* Left Content Column */}
            <div>
              <div style={{
                background: 'linear-gradient(135deg, rgba(6,182,212,0.1), rgba(168,85,247,0.1))',
                borderRadius: '12px',
                padding: '0.4rem 0.8rem',
                border: '1px solid rgba(6,182,212,0.2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: 'var(--secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '1.25rem'
              }}>
                <Sparkles size={12} /> Mapping Complete
              </div>

              <h2 style={{ fontSize: '1.6rem', color: '#ffffff', marginBottom: '0.75rem' }}>Your shortened URL is ready!</h2>
              
              {/* Output String Container */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(3,7,18,0.7)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                padding: '0.8rem 1rem',
                gap: '1rem',
                marginBottom: '1.75rem'
              }}>
                <a 
                  href={result.shortUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    color: 'var(--secondary)',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    textDecoration: 'none',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {result.shortUrl}
                </a>
                <button 
                  onClick={() => handleCopy(result.shortUrl)}
                  className="btn-primary"
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    boxShadow: 'none'
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Crawled Destination Metadata Preview */}
              {result.metadata && (
                <div style={{
                  padding: '1.25rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border)',
                  borderRadius: '14px',
                  display: 'flex',
                  gap: '1rem'
                }}>
                  <img 
                    src={result.metadata.iconUrl} 
                    alt="site icon"
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '8px',
                      background: 'rgba(3,7,18,0.5)',
                      padding: '4px',
                      flexShrink: 0,
                      alignSelf: 'flex-start'
                    }}
                    onError={(e) => { e.currentTarget.src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>🌐</text></svg>'; }}
                  />
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.2rem' }}>
                      {result.metadata.title}
                    </h4>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {result.metadata.description}
                    </p>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.5rem', wordBreak: 'break-all' }}>
                      Original: {result.longUrl}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right QR Column */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              borderLeft: '1px solid var(--border)',
              paddingLeft: '2rem'
            }}>
              <div style={{
                background: '#ffffff',
                padding: '0.75rem',
                borderRadius: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5), 0 0 20px rgba(99, 102, 241, 0.15)',
                marginBottom: '1rem',
                width: '150px',
                height: '150px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(result.shortUrl)}`} 
                  alt="QR Code"
                  style={{ width: '130px', height: '130px' }}
                />
              </div>
              <button 
                onClick={() => handleDownloadQr(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(result.shortUrl)}`)}
                className="btn-secondary"
                disabled={downloadingQr}
                style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', width: '100%' }}
              >
                <QrCode size={14} /> {downloadingQr ? 'Downloading...' : 'Download QR Code'}
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default LinkCreator;
