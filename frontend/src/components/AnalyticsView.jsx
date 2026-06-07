import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { ArrowLeft, RotateCw, Globe, Smartphone, Compass, Link2, Calendar, Eye } from 'lucide-react';

// Register ChartJS plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function AnalyticsView({ linkId, onClose, showToast }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/links/${linkId}/stats`);
      setData(response.data);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to fetch link stats.', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [linkId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '10% 0', color: 'var(--text-secondary)' }}>
        <RotateCw size={44} className="spin" style={{ margin: '0 auto 1.5rem', color: 'var(--primary)' }} />
        <h3>Compiling Redirection Telemetry...</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Aggregating geographical details, user-agents, and referrer databases.</p>
      </div>
    );
  }

  if (!data) return null;

  // Chart Global Options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#e5e7eb',
          font: { family: 'Outfit', size: 12 }
        }
      },
      tooltip: {
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: 'Outfit', size: 13, weight: 'bold' },
        bodyFont: { family: 'Outfit', size: 12 },
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#9ca3af', font: { family: 'Outfit' } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.04)' },
        ticks: { color: '#9ca3af', font: { family: 'Outfit' }, stepSize: 1 },
        beginAtZero: true
      }
    }
  };

  // 1. Timeline Chart Data (Clicks over time)
  const timelineDates = data.analytics.clicksOverTime.map(d => d.date);
  const timelineClicks = data.analytics.clicksOverTime.map(d => d.clicks);
  
  const timelineData = {
    labels: timelineDates.length > 0 ? timelineDates : [new Date().toLocaleDateString()],
    datasets: [
      {
        label: 'Redirect Clicks',
        data: timelineClicks.length > 0 ? timelineClicks : [0],
        borderColor: '#a855f7',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointBackgroundColor: '#d946ef',
        pointBorderColor: '#ffffff',
        pointHoverRadius: 6
      }
    ]
  };

  // 2. Devices Doughnut Data
  const deviceLabels = Object.keys(data.analytics.devices);
  const deviceCounts = Object.values(data.analytics.devices);
  
  const devicesData = {
    labels: deviceLabels,
    datasets: [
      {
        data: deviceCounts,
        backgroundColor: ['#3b82f6', '#06b6d4', '#ec4899'],
        borderColor: 'rgba(15, 23, 42, 0.8)',
        borderWidth: 2,
        hoverOffset: 6
      }
    ]
  };

  // 3. Browsers Horizontal Bar Data
  const browserLabels = data.analytics.browsers.map(b => b.name).slice(0, 5);
  const browserCounts = data.analytics.browsers.map(b => b.value).slice(0, 5);
  
  const browsersData = {
    labels: browserLabels.length > 0 ? browserLabels : ['No Data'],
    datasets: [
      {
        label: 'Clicks',
        data: browserCounts.length > 0 ? browserCounts : [0],
        backgroundColor: 'rgba(6, 182, 212, 0.75)',
        borderColor: '#06b6d4',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  // 4. Referrers Vertical Bar Data
  const referrerLabels = data.analytics.referrers.map(r => r.name).slice(0, 5);
  const referrerCounts = data.analytics.referrers.map(r => r.value).slice(0, 5);

  const referrersData = {
    labels: referrerLabels.length > 0 ? referrerLabels : ['No Data'],
    datasets: [
      {
        label: 'Referrals',
        data: referrerCounts.length > 0 ? referrerCounts : [0],
        backgroundColor: 'rgba(168, 85, 247, 0.7)',
        borderColor: '#a855f7',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  // Find Top Country / Device / Referrer for Summary Tiles
  const topCountry = data.analytics.countries.length > 0 
    ? data.analytics.countries.reduce((max, c) => c.value > max.value ? c : max, data.analytics.countries[0]).name 
    : '-';
    
  const topReferrer = data.analytics.referrers.length > 0 
    ? data.analytics.referrers.reduce((max, r) => r.value > max.value ? r : max, data.analytics.referrers[0]).name 
    : '-';

  const deviceMax = Math.max(...deviceCounts);
  const topDeviceIdx = deviceCounts.indexOf(deviceMax);
  const topDevice = deviceMax > 0 ? deviceLabels[topDeviceIdx] : '-';

  return (
    <div style={{ position: 'relative' }}>
      
      {/* Navigation Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            className="btn-secondary" 
            style={{ padding: '0.55rem', borderRadius: '50%', width: '40px', height: '40px' }} 
            onClick={onClose}
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 style={{ fontSize: '1.6rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Redirection Analytics <span className="gradient-text">/{data.code}</span>
            </h2>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'block', wordBreak: 'break-all' }}>
              Target: {data.longUrl}
            </span>
          </div>
        </div>

        <button className="btn-secondary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem' }} onClick={fetchStats}>
          <RotateCw size={14} style={{ marginRight: '4px' }} /> Refresh Stats
        </button>
      </div>

      {/* 4 Summary Cards Grid */}
      <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '2.5rem' }}>
        
        {/* Total Clicks */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '12px', border: '1px solid rgba(168, 85, 247, 0.2)', color: 'var(--neon-purple)' }}>
            <Eye size={20} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Total Clicks</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff' }}>{data.totalClicks}</span>
          </div>
        </div>

        {/* Top Country */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(6, 182, 212, 0.1)', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.2)', color: 'var(--secondary)' }}>
            <Globe size={20} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Top Country</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', display: 'block' }} title={topCountry}>
              {topCountry}
            </span>
          </div>
        </div>

        {/* Top Device */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
            <Smartphone size={20} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Top Device</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff' }}>{topDevice}</span>
          </div>
        </div>

        {/* Top Referrer */}
        <div className="glass-card" style={{ padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '0.6rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)' }}>
            <Compass size={20} />
          </div>
          <div>
            <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.5px' }}>Top Referrer</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px', display: 'block' }} title={topReferrer}>
              {topReferrer}
            </span>
          </div>
        </div>

      </div>

      {/* Main Charts Grid Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* Timeline (Full Width) */}
        <div className="glass-card" style={{ height: '350px' }}>
          <h4 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#ffffff' }}>Redirection Traffic (Clicks Over Time)</h4>
          <div style={{ height: '260px' }}>
            <Line data={timelineData} options={chartOptions} />
          </div>
        </div>

        {/* Double charts splits */}
        <div className="grid-2">
          
          {/* Left: Devices split */}
          <div className="glass-card" style={{ height: '320px', display: 'flex', flexDirection: 'column' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#ffffff' }}>Device Ratio Distribution</h4>
            <div style={{ flex: 1, position: 'relative', height: '200px' }}>
              {data.totalClicks > 0 ? (
                <Doughnut 
                  data={devicesData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'right', labels: { color: '#e5e7eb', font: { family: 'Outfit' } } }
                    }
                  }} 
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No telemetry logged yet.</div>
              )}
            </div>
          </div>

          {/* Right: Referrers split */}
          <div className="glass-card" style={{ height: '320px' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: '#ffffff' }}>Top Referrer Platforms</h4>
            <div style={{ height: '220px' }}>
              <Bar 
                data={referrersData} 
                options={{
                  ...chartOptions,
                  scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit' } } },
                    y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit' } } }
                  }
                }} 
              />
            </div>
          </div>

        </div>

        {/* Table Geo & Browser Split */}
        <div className="grid-2" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
          
          {/* Geo tables */}
          <div className="glass-card">
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Globe size={18} className="text-secondary" /> Geographical Traffic Rankings
            </h4>
            
            {data.analytics.countries.length === 0 ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No geographical data resolved. (Test from external IPs or run multiple queries to map mock databases)</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                
                {/* Countries list */}
                <div>
                  <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>Top Countries</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {data.analytics.countries.sort((a,b) => b.value - a.value).slice(0, 5).map((country, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 500 }}>{idx+1}. {country.name}</span>
                        <span className="badge badge-active" style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}>{country.value} clicks</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cities list */}
                <div>
                  <h5 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.4rem' }}>Top Cities</h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {data.analytics.cities.sort((a,b) => b.value - a.value).slice(0, 5).map((city, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem' }}>
                        <span style={{ fontWeight: 500 }}>{idx+1}. {city.name}</span>
                        <span className="badge badge-active" style={{ fontSize: '0.75rem', padding: '0.1rem 0.4rem' }}>{city.value} clicks</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Browser bars */}
          <div className="glass-card" style={{ height: '100%' }}>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#ffffff' }}>Browsers Used</h4>
            <div style={{ height: '180px' }}>
              <Bar 
                data={browsersData} 
                options={{
                  indexAxis: 'y',
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit' }, stepSize: 1 }, beginAtZero: true },
                    y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#9ca3af', font: { family: 'Outfit' } } }
                  }
                }} 
              />
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

export default AnalyticsView;
