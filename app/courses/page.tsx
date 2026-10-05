'use client';
import React, { useState } from 'react';

export default function CoursesPage() {
  const [selectedFaculty, setSelectedFaculty] = useState('Science & Technology');

  const faculties = [
    {
      name: 'Science & Technology',
      departments: [
        {
          deptName: 'Computing & Mathematics',
          courses: [
            { code: 'COMP101', title: 'Introduction to Computer Science & Programming', credits: 4, level: 'Year 1' },
            { code: 'COMP201', title: 'Data Structures & Algorithms', credits: 4, level: 'Year 2' },
            { code: 'COMP301', title: 'Advanced Database Systems', credits: 4, level: 'Year 3' },
            { code: 'NETW202', title: 'Enterprise Network Infrastructure', credits: 3, level: 'Year 2' },
            { code: 'SE305', title: 'Software Engineering Methodologies', credits: 4, level: 'Year 3' }
          ]
        },
        {
          deptName: 'Natural & Physical Sciences',
          courses: [
            { code: 'PHYS101', title: 'General Physics I', credits: 4, level: 'Year 1' },
            { code: 'CHEM101', title: 'Principles of Chemistry', credits: 4, level: 'Year 1' },
            { code: 'MATH201', title: 'Calculus and Linear Algebra', credits: 4, level: 'Year 2' }
          ]
        }
      ]
    },
    {
      name: 'Business & Public Administration',
      departments: [
        {
          deptName: 'Business Management',
          courses: [
            { code: 'BUSA101', title: 'Principles of Financial Accounting', credits: 3, level: 'Year 1' },
            { code: 'BUSA202', title: 'Organizational Behavior & Leadership', credits: 3, level: 'Year 2' },
            { code: 'PADM301', title: 'Public Sector Governance & Policy', credits: 4, level: 'Year 3' }
          ]
        }
      ]
    },
    {
      name: 'Humanities & Social Sciences',
      departments: [
        {
          deptName: 'Social Studies',
          courses: [
            { code: 'SOCI101', title: 'Introduction to Sociology', credits: 3, level: 'Year 1' },
            { code: 'HIST201', title: 'Pacific Regional History', credits: 3, level: 'Year 2' }
          ]
        }
      ]
    }
  ];

  const currentFacultyData = faculties.find(f => f.name === selectedFaculty);

  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#1e293b', fontFamily: 'sans-serif' }}>
      
      {/* TOP NAVIGATION BAR */}
      <nav style={{ background: '#0f172a', color: '#ffffff', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <span style={{ fontSize: '20px', fontWeight: 'bold', letterSpacing: '0.5px' }}>NexusSIS</span>
          <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#94a3b8' }}>
            <a href="/dashboard" style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</a>
            <a href="/portal" style={{ color: 'inherit', textDecoration: 'none' }}>Timetable</a>
            <a href="/lms" style={{ color: 'inherit', textDecoration: 'none' }}>Registration</a>
            <span style={{ color: '#ffffff', fontWeight: '600', textDecoration: 'none' }}>Courses</span>
          </div>
        </div>
        <div style={{ fontSize: '14px', color: '#94a3b8' }}>Institutional Course Catalog</div>
      </nav>

      {/* HERO BANNER */}
      <section style={{ background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)', color: '#ffffff', padding: '50px 40px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 8px 0' }}>Academic Faculties & Course Directory</h1>
        <p style={{ fontSize: '15px', color: '#93c5fd', margin: 0 }}>Browse official curriculum offerings organized by college and department</p>
      </section>

      {/* MAIN CONTAINER */}
      <div style={{ maxWidth: '1100px', margin: '-30px auto 60px auto', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        
        {/* FACULTY SELECTOR TABS */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', justifyContent: 'center' }}>
          {faculties.map((fac) => (
            <button
              key={fac.name}
              onClick={() => setSelectedFaculty(fac.name)}
              style={{
                background: selectedFaculty === fac.name ? '#1e40af' : '#ffffff',
                color: selectedFaculty === fac.name ? '#ffffff' : '#1e293b',
                border: '1px solid #cbd5e1',
                padding: '12px 20px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                boxShadow: selectedFaculty === fac.name ? '0 4px 12px rgba(30, 64, 175, 0.3)' : '0 2px 5px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}
            >
              {fac.name}
            </button>
          ))}
        </div>

        {/* DEPARTMENTS & COURSES LIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {currentFacultyData?.departments.map((dept, idx) => (
            <div key={idx} style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              
              <div style={{ background: '#0f172a', color: '#ffffff', padding: '15px 25px', fontSize: '15px', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{dept.deptName}</span>
                <span style={{ fontSize: '12px', background: '#1e293b', color: '#34d399', padding: '4px 10px', borderRadius: '20px', border: '1px solid #334155' }}>
                  {dept.courses.length} Active Courses
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr 1fr 1fr', background: '#f1f5f9', padding: '12px 25px', fontSize: '12px', fontWeight: 'bold', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>
                <span>Course Code</span>
                <span>Course Title</span>
                <span>Credits</span>
                <span>Level</span>
              </div>

              {dept.courses.map((course, cIdx) => (
                <div key={cIdx} style={{ display: 'grid', gridTemplateColumns: '1fr 3fr 1fr 1fr', padding: '15px 25px', fontSize: '13px', borderTop: cIdx > 0 ? '1px solid #f1f5f9' : 'none', color: '#1e293b', alignItems: 'center', background: cIdx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                  <span style={{ fontWeight: 'bold', color: '#2563eb' }}>{course.code}</span>
                  <span style={{ fontWeight: '500' }}>{course.title}</span>
                  <span>{course.credits} Credits</span>
                  <span style={{ color: '#64748b' }}>{course.level}</span>
                </div>
              ))}

            </div>
          ))}
        </div>

      </div>

    </main>
  );
}
