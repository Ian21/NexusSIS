'use client';
import React, { useEffect } from 'react';
import { clearNexusSession, protectNexusPage } from '@/lib/nexus-access';

export default function LibraryPortal() {
  useEffect(() => {
    protectNexusPage([
      'Librarian',
      'Super Administrator',
      'ICT Administrator',
    ]);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', padding: '40px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Library Management Portal</h1>
      <p style={{ color: '#94a3b8' }}>Welcome, Librarian. Staff directory and book circulation controls are loaded.</p>
    </div>
  );
}
