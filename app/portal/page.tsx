'use client';
import React, { useState } from 'react';

export default function PortalPage() {
  const [lookupType, setLookupType] = useState('Student ID Number');
  const [identifier, setIdentifier] = useState('NSIS-2026-001');
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/schedule?type=${encodeURIComponent(lookupType)}&id=${encodeURIComponent(identifier)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch schedule');
      setSchedule(json.schedule || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: 'sans-serif' }}>
      
      {/* TOP NAVIGATION BAR */}
      <nav style={{ background: '#0f172a', color: '#ffffff', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.5px' }}>NexusSIS</span>
          <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#94a3b8' }}>
            <a href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</a>
            <span style={{ color: '#ffffff', fontWeight: '600', textDecoration: 'none' }}>Timetable</span>
            <a href="/lms" style={{ color: 'inherit', textDecoration: 'none' }}>Registration</a>
            <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Directory</a>
          </div>
        </div>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Institutional Portal</div>
      </nav>

      {/* HERO BANNER */}
      <section style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#ffffff', padding: '50px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 8px 0' }}>NexusSIS — Institutional Portal</h1>
        <p style={{ fontSize: '15px', color: '#93c5fd', margin: 0 }}>Live Timetable & Course Schedule Monitor</p>
      </section>

      {/* MAIN CONTAINER */}
      <div style={{ maxWidth: '950px', margin: '-30px auto 60px auto', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        
        {/* LOOKUP CARD */}
        <div style={{ background: '#ffffff', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
          
          <form onSubmit={fetchSchedule} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '15px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Lookup Type:</label>
              <select value={lookupType} onChange={(e) => setLookupType(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#1e293b' }}>
                <option value="Student ID Number">Student ID Number</option>
                <option value="Instructor">Instructor</option>
                <option value="Room">Room</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '6px' }}>Identifier (e.g., NSIS-2026-001):</label>
              <input type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#fff', color: '#1e293b' }} />
            </div>

            <div>
              <button type="submit" disabled={loading} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '11px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
                {loading ? 'Fetching...' : 'Fetch Schedule'}
              </button>
            </div>
          </form>

          {error && <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '8px', marginTop: '15px', fontSize: '13px', border: '1px solid #f87171' }}>{error}</div>}
        </div>

        {/* SCHEDULE TABLE RESULTS */}
        <div style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          
          <div style={{ background: '#1e40af', color: '#ffffff', padding: '15px 25px', display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1.5fr 1fr', fontSize: '13px', fontWeight: 'bold' }}>
            <span>Course Code</span>
            <span>Title</span>
            <span>Section</span>
            <span>Room</span>
            <span>Time</span>
            <span>Days</span>
          </div>

          {schedule.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
              No schedule records loaded. Click fetch to query.
            </div>
          ) : (
            schedule.map((item, idx) => (
              <div key={idx} style={{ padding: '15px 25px', display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 1fr 1.5fr 1fr', fontSize: '13px', borderTop: '1px solid #f1f5f9', color: '#1e293b', background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <span style={{ fontWeight: '600', color: '#2563eb' }}>{item.course_code}</span>
                <span>{item.title}</span>
                <span>{item.section}</span>
                <span>{item.room}</span>
                <span>{item.time}</span>
                <span>{item.days}</span>
              </div>
            ))
          )}

        </div>

      </div>

    </main>
  );
}
