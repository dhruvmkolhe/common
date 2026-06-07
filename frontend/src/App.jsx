import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link2, LayoutDashboard, Database, LogIn, LogOut, User, AlertCircle, CheckCircle2, Infinity } from 'lucide-react';
import LinkCreator from './components/LinkCreator';
import LinkList from './components/LinkList';
import AnalyticsView from './components/AnalyticsView';
import AuthModal from './components/AuthModal';

// Setup global axios defaults
axios.defaults.baseURL = import.meta.env.DEV ? 'http://localhost:5000' : '';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [activeTab, setActiveTab] = useState('create');
  const [selectedLinkId, setSelectedLinkId] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [links, setLinks] = useState([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Set Auth Header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('token', token);
      fetchUser();
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
      setUser(null);
      setLinks([]);
    }
  }, [token]);

  // Auto load links if user shifts to dashboard
  useEffect(() => {
    if (user && activeTab === 'dashboard') {
      fetchLinks();
    }
  }, [user, activeTab]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      setUser(response.data.user);
    } catch (err) {
      console.warn('Auto login failed. Token might be expired.');
      handleLogout();
    }
  };

  const fetchLinks = async () => {
    setLinksLoading(true);
    try {
      const response = await axios.get('/api/links');
      setLinks(response.data.links);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to fetch links.';
      showToast(errorMsg, 'error');
    } finally {
      setLinksLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setActiveTab('create');
    setSelectedLinkId(null);
    showToast('Logged out successfully.');
  };

  const openAuth = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      
      {/* Dynamic Background Glowing Blobs */}
      <div style={{
        position: 'absolute',
        top: '15%',
        left: '20%',
        width: '350px',
        height: '350px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
        filter: 'blur(50px)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '20%',
        right: '15%',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)',
        filter: 'blur(50px)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />

      {/* Navigation bar */}
      <nav style={{
        background: 'rgba(5, 7, 15, 0.65)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '1rem 2rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => { setActiveTab('create'); setSelectedLinkId(null); }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
            }}>
              <Infinity size={22} color="white" />
            </div>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, background: 'linear-gradient(to right, #ffffff, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1px' }}>
              COMMON
            </span>
          </div>

          {/* Center Column: Balanced Navigation Tabs */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div className="tabs-container" style={{ margin: 0, padding: 0, border: 'none', gap: '0.5rem' }}>
              <button 
                className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => { setActiveTab('create'); setSelectedLinkId(null); }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Link2 size={16} /> Shorten URL
                </div>
              </button>
              
              <button 
                className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => {
                  if (user) {
                    setActiveTab('dashboard');
                    setSelectedLinkId(null);
                  } else {
                    openAuth('login');
                    showToast('Sign in required to view link management.', 'error');
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <LayoutDashboard size={16} /> Dashboard
                </div>
              </button>
            </div>
          </div>

          {/* Right Column: User Auth / Identity Controls */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(255,255,255,0.03)', padding: '0.4rem 0.8rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                  <User size={14} className="text-secondary" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user.email}</span>
                </div>
                <button className="btn-secondary" style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }} onClick={handleLogout}>
                  <LogOut size={14} /> Log Out
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button className="tab-btn" style={{ fontSize: '0.9rem' }} onClick={() => openAuth('login')}>
                  Sign In
                </button>
                <button className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }} onClick={() => openAuth('signup')}>
                  Get Started <LogIn size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content Workspace */}
      <main style={{
        flex: 1,
        maxWidth: '1200px',
        width: '100%',
        margin: '0 auto',
        padding: '3rem 2rem 5rem'
      }}>
        
        {/* Analytics Mode Split-Off overlay */}
        {selectedLinkId ? (
          <AnalyticsView 
            linkId={selectedLinkId} 
            onClose={() => setSelectedLinkId(null)} 
            showToast={showToast} 
          />
        ) : (
          <>
            {activeTab === 'create' && (
              <LinkCreator 
                user={user} 
                token={token} 
                showToast={showToast} 
                onAuthRedirect={() => openAuth('signup')} 
                onShortenSuccess={() => { if (user) fetchLinks(); }}
              />
            )}

            {activeTab === 'dashboard' && user && (
              <LinkList 
                links={links} 
                loading={linksLoading} 
                onRefresh={fetchLinks}
                onSelectStats={setSelectedLinkId}
                showToast={showToast}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Toast Notification Banner */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 100,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${toast.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
          boxShadow: `0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px ${toast.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'}`,
          borderRadius: '16px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          animation: 'float 4s ease-in-out infinite',
          maxWidth: '400px'
        }}>
          {toast.type === 'error' ? (
            <AlertCircle size={20} style={{ color: 'var(--danger)' }} />
          ) : (
            <CheckCircle2 size={20} style={{ color: 'var(--success)' }} />
          )}
          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>
            {toast.message}
          </span>
        </div>
      )}

      {/* Authentication Gateway Overlay */}
      {authModalOpen && (
        <AuthModal 
          isOpen={authModalOpen} 
          onClose={() => setAuthModalOpen(false)} 
          mode={authMode} 
          setMode={setAuthMode}
          setToken={setToken}
          showToast={showToast} 
        />
      )}

      {/* Sticky Footer */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        background: 'rgba(5, 7, 15, 0.4)',
        padding: '1.5rem 2rem',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        © 2026 Common Systems. Engineered for sub-100ms redirection with Redis & Postgres.
      </footer>
    </div>
  );
}

export default App;
