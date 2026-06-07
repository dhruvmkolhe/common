import React, { useState } from 'react';
import axios from 'axios';
import { Search, RotateCw, BarChart2, Edit2, Trash2, Copy, Check, ExternalLink, Calendar, Key, AlertCircle, X, ShieldAlert } from 'lucide-react';

function LinkList({ links, loading, onRefresh, onSelectStats, showToast }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'disabled', 'expired'
  const [copiedId, setCopiedId] = useState(null);

  // Edit Link Modal States
  const [editingLink, setEditingLink] = useState(null);
  const [editUrl, setEditUrl] = useState('');
  const [editExpires, setEditExpires] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Copy helper
  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Link copied!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Switch Toggle Handler (Enable/Disable redirect link)
  const handleStatusToggle = async (id, currentVal) => {
    try {
      await axios.put(`/api/links/${id}`, { isEnabled: !currentVal });
      showToast(`Link ${!currentVal ? 'enabled' : 'disabled'} successfully.`);
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update link status.', 'error');
    }
  };

  // Delete Handler
  const handleDelete = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this short link? All click analytics will be permanently destroyed.')) return;
    
    try {
      await axios.delete(`/api/links/${id}`);
      showToast('Short link deleted.');
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to delete link.', 'error');
    }
  };

  // Edit Submit Handler
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);

    try {
      const payload = {
        longUrl: editUrl,
        expiresAt: editExpires ? new Date(editExpires).toISOString() : null,
        password: editPassword === 'antigravity-keep-existing-pwd' ? undefined : (editPassword.trim() || null)
      };

      await axios.put(`/api/links/${editingLink.id}`, payload);
      showToast('Link configurations updated successfully.');
      setEditingLink(null);
      onRefresh();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update link settings.', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const openEditModal = (link) => {
    setEditingLink(link);
    setEditUrl(link.longUrl);
    setEditExpires(link.expiresAt ? link.expiresAt.slice(0, 16) : '');
    // If password-protected, place a placeholder indicating an existing pwd exists
    setEditPassword(link.passwordProtected ? 'antigravity-keep-existing-pwd' : '');
  };

  // Filter links on Client Side
  const filteredLinks = links.filter(link => {
    // Search filter
    const matchesSearch = link.longUrl.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          link.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // Status filter
    const isExpired = link.expiresAt && new Date(link.expiresAt) <= new Date();
    
    if (statusFilter === 'active') {
      return link.isEnabled && !isExpired;
    } else if (statusFilter === 'disabled') {
      return !link.isEnabled;
    } else if (statusFilter === 'expired') {
      return isExpired;
    }
    
    return true;
  });

  return (
    <div style={{ position: 'relative' }}>
      
      {/* Table Action Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        
        {/* Left: Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['all', 'active', 'disabled', 'expired'].map(status => (
            <button
              key={status}
              className={`btn-secondary ${statusFilter === status ? 'active' : ''}`}
              style={{
                padding: '0.45rem 1rem',
                fontSize: '0.85rem',
                background: statusFilter === status ? 'rgba(99,102,241,0.1)' : 'transparent',
                borderColor: statusFilter === status ? 'var(--primary)' : 'var(--border)',
                textTransform: 'capitalize'
              }}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Right: Search + Refresh */}
        <div style={{ display: 'flex', gap: '0.75rem', width: '100%', maxWidth: '400px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{
              position: 'absolute',
              left: '0.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)'
            }} />
            <input 
              type="text"
              className="input-field"
              placeholder="Search by URL or short code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', paddingTop: '0.55rem', paddingBottom: '0.55rem', fontSize: '0.9rem' }}
            />
          </div>
          <button className="btn-secondary" style={{ padding: '0.55rem' }} onClick={onRefresh} title="Sync links">
            <RotateCw size={16} className={loading ? 'spin' : ''} />
          </button>
        </div>

      </div>

      {/* Main Table view */}
      <div className="glass-card" style={{ padding: '1.5rem 1.25rem' }}>
        {loading && links.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>
            <RotateCw size={36} className="spin" style={{ margin: '0 auto 1rem', color: 'var(--primary)' }} />
            Retrieving link assets...
          </div>
        ) : filteredLinks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-muted)' }}>
            <AlertCircle size={40} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
            <h4>No shortened links found matching filters.</h4>
            <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Start by creating custom codes in the shortener tab!</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>State</th>
                  <th>Destination URL</th>
                  <th>Short link mapping</th>
                  <th style={{ width: '110px' }}>Clicks</th>
                  <th style={{ width: '150px' }}>Expires</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredLinks.map(link => {
                  const isExpired = link.expiresAt && new Date(link.expiresAt) <= new Date();
                  
                  return (
                    <tr key={link.id}>
                      {/* Active switch */}
                      <td>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={link.isEnabled} 
                            onChange={() => handleStatusToggle(link.id, link.isEnabled)}
                          />
                          <span className="slider"></span>
                        </label>
                      </td>

                      {/* Destination URL */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          <span 
                            style={{
                              maxWidth: '280px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              fontWeight: 600,
                              fontSize: '0.95rem'
                            }}
                            title={link.longUrl}
                          >
                            {link.longUrl}
                          </span>
                          
                          {/* Indicators: password protected */}
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {link.passwordProtected && (
                              <span style={{ fontSize: '0.7rem', color: 'var(--neon-purple)', display: 'inline-flex', alignItems: 'center', gap: '2px', background: 'rgba(168,85,247,0.1)', padding: '2px 6px', borderRadius: '4px', border: '1px solid rgba(168,85,247,0.2)' }}>
                                <Key size={10} /> Password Encrypted
                              </span>
                            )}
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Added {new Date(link.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Shortened URL */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <a 
                            href={link.shortUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            style={{ color: 'var(--secondary)', textDecoration: 'none', fontWeight: 700 }}
                          >
                            {link.code}
                          </a>
                          
                          <div style={{ display: 'flex', gap: '2px' }}>
                            <button 
                              onClick={() => handleCopy(link.id, link.shortUrl)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                              title="Copy URL"
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              {copiedId === link.id ? <Check size={13} style={{ color: 'var(--success)' }} /> : <Copy size={13} />}
                            </button>
                            <a 
                              href={link.shortUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              style={{ color: 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center' }}
                              title="Open link"
                              onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                            >
                              <ExternalLink size={13} />
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Clicks */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span className="badge badge-active" style={{ fontSize: '0.85rem', padding: '0.2rem 0.6rem' }}>
                            {link.clicks}
                          </span>
                        </div>
                      </td>

                      {/* Expiration date */}
                      <td>
                        {link.expiresAt ? (
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.85rem' }}>
                              {new Date(link.expiresAt).toLocaleDateString()}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: isExpired ? 'var(--danger)' : 'var(--text-secondary)' }}>
                              {isExpired ? 'Expired' : new Date(link.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Permanent</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.45rem', borderRadius: '8px' }} 
                            onClick={() => onSelectStats(link.id)}
                            title="Analytics Graph"
                          >
                            <BarChart2 size={14} style={{ color: 'var(--secondary)' }} />
                          </button>
                          
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.45rem', borderRadius: '8px' }} 
                            onClick={() => openEditModal(link)}
                            title="Edit settings"
                          >
                            <Edit2 size={14} style={{ color: 'var(--warning)' }} />
                          </button>
                          
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.45rem', borderRadius: '8px' }} 
                            onClick={() => handleDelete(link.id)}
                            title="Delete link"
                          >
                            <Trash2 size={14} style={{ color: 'var(--danger)' }} />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Drawer Overlay */}
      {editingLink && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(3,5,10,0.7)',
          backdropFilter: 'blur(8px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem'
        }}>
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', padding: '2.25rem 2rem', position: 'relative' }}>
            
            <button 
              onClick={() => setEditingLink(null)}
              style={{
                position: 'absolute',
                top: '1.25rem', right: '1.25rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border)',
                borderRadius: '50%',
                width: '30px', height: '30px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-secondary)'
              }}
            >
              <X size={14} />
            </button>

            <h3 style={{ fontSize: '1.35rem', color: '#ffffff', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Edit2 size={18} className="text-secondary" /> Modify Short URL Mappings
            </h3>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="form-group">
                <label>Destination Long URL</label>
                <input 
                  type="url"
                  className="input-field"
                  required
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Calendar size={14} /> Update Expiry Date <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>(Clear to make Permanent)</span></label>
                <input 
                  type="datetime-local"
                  className="input-field"
                  value={editExpires}
                  onChange={(e) => setEditExpires(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Key size={14} /> Reset Passwords <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>(Clear to remove password lock)</span></label>
                <input 
                  type="password"
                  className="input-field"
                  placeholder={editingLink.passwordProtected ? "•••••••• (Password Saved)" : "Assign a new redirect password"}
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                />
                {editingLink.passwordProtected && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <ShieldAlert size={12} /> Typing in password will overwrite existing password hash. Leaving it empty will clear the password block completely!
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingLink(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={editLoading}>
                  {editLoading ? 'Updating config...' : 'Save Settings'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Spinner keyframe inject */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin {
          animation: spin 1s linear infinite;
        }
      `}</style>

    </div>
  );
}

export default LinkList;
