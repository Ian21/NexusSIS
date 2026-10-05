'use client';
import React, { useEffect, useState } from 'react';
import { clearNexusSession, protectNexusPage } from '@/lib/nexus-access';

export default function LecturerPortalPage() {
  const handleLogout = () => {
    clearNexusSession();
    window.location.href = '/dashboard';
  };


  useEffect(() => {
    protectNexusPage([
      'Lecturer',
      'Super Administrator',
      'ICT Administrator',
    ]);
  }, []);

  const [activeTab, setActiveTab] = useState('timetable');
  const [selectedCourse, setSelectedCourse] = useState('SE301');
  const [gradingStatus, setGradingStatus] = useState('');

  // Lecturer details
  const lecturer = {
    name: 'Dr. John Kalu',
    department: 'Software Engineering',
    faculty: 'Faculty of Science & Technology',
    email: 'john.kalu@university.ac.pg'
  };

  // Lecturer's teaching timetable
  const lecturerTimetable = [
    { day: 'Monday', time: '09:00 AM - 11:00 AM', course: 'SE301: Advanced Software Architecture', venue: 'Lab 3B', targetDept: 'Software Engineering' },
    { day: 'Wednesday', time: '09:00 AM - 11:00 AM', course: 'SE301: Advanced Software Architecture', venue: 'Lab 3B', targetDept: 'Software Engineering' },
    { day: 'Thursday', time: '02:00 PM - 04:00 PM', course: 'SE303: Object-Oriented Design', venue: 'Lab 2A', targetDept: 'Software Engineering' },
  ];

  // Students viewing/enrolled in Software Engineering department who check timetables
  const departmentViewers = [
    { id: '2026/S1/BCS/001', name: 'Ian McShane Kunumb Wadidika', department: 'Software Engineering', lastActive: 'Today, 03:45 PM', status: 'Enrolled' },
    { id: '2026/S1/BCS/014', name: 'Samantha Paska', department: 'Software Engineering', lastActive: 'Today, 02:15 PM', status: 'Enrolled' },
    { id: '2026/S1/BCS/028', name: 'Kano Tari', department: 'Software Engineering', lastActive: 'Yesterday, 11:30 AM', status: 'Enrolled' },
    { id: '2026/S1/BCS/035', name: 'Rachel Mandi', department: 'Software Engineering', lastActive: 'Today, 01:10 PM', status: 'Enrolled' }
  ];

  // Student list for grade recording
  const [studentsGrades, setStudentsGrades] = useState([
    { id: '2026/S1/BCS/001', name: 'Ian McShane Kunumb Wadidika', assignment: '88', midterm: '92', exam: '85', finalGrade: '87.5 (A)' },
    { id: '2026/S1/BCS/014', name: 'Samantha Paska', assignment: '75', midterm: '80', exam: '78', finalGrade: '77.7 (B)' },
    { id: '2026/S1/BCS/028', name: 'Kano Tari', assignment: '60', midterm: '65', exam: '62', finalGrade: '62.3 (C)' },
    { id: '2026/S1/BCS/035', name: 'Rachel Mandi', assignment: '90', midterm: '88', exam: '94', finalGrade: '90.8 (A+)' },
  ]);

  const handleGradeChange = (index: number, field: string, value: string) => {
    const updated = [...studentsGrades];
    (updated[index] as any)[field] = value;
    setStudentsGrades(updated);
  };

  const handleSaveGrades = (e: React.FormEvent) => {
    e.preventDefault();
    setGradingStatus('Grades successfully recorded and submitted to Academic Registry!');
    setTimeout(() => setGradingStatus(''), 4000);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* TOP NAVBAR */}
      <nav style={{ backgroundColor: '#0f172a', color: '#fff', padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <span style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.5px' }}>University Faculty Portal</span>
          <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#cbd5e1' }}>
            <span style={{ color: '#fff', fontWeight: '700' }}>Lecturer Workspace</span>
            <button type="button" onClick={handleLogout} style={{ color: 'inherit', textDecoration: 'none' }}>Sign Out</button>
          </div>
        </div>
        <div style={{ fontSize: '13px', color: '#34d399', backgroundColor: '#1e293b', padding: '5px 12px', borderRadius: '20px', border: '1px solid #334155', fontWeight: '600' }}>
          Logged in as Lecturer: {lecturer.name} ({lecturer.department})
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <div style={{ maxWidth: '1200px', margin: '30px auto', padding: '0 20px' }}>
        
        {/* LECTURER INFO BANNER */}
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #cbd5e1', marginBottom: '25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '800' }}>
              Faculty Instructor
            </span>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0f172a', margin: '8px 0 4px 0' }}>{lecturer.name}</h1>
            <p style={{ fontSize: '14px', color: '#334155', fontWeight: '600', margin: 0 }}>
              Department: <span style={{ color: '#2563eb' }}>{lecturer.department}</span> | {lecturer.faculty} | Email: {lecturer.email}
            </p>
          </div>
          <div style={{ textAlign: 'right', backgroundColor: '#f1f5f9', padding: '12px 20px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '700', display: 'block' }}>Active Semester</span>
            <span style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>Semester 1, 2026</span>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #cbd5e1', paddingBottom: '10px' }}>
          <button 
            onClick={() => setActiveTab('timetable')}
            style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: activeTab === 'timetable' ? '#2563eb' : '#ffffff', color: activeTab === 'timetable' ? '#fff' : '#1e293b', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: activeTab === 'timetable' ? '0 2px 8px rgba(37,99,235,0.2)' : 'none', border: activeTab === 'timetable' ? 'none' : '1px solid #cbd5e1' }}
          >
            My Teaching Timetable & Viewers
          </button>
          <button 
            onClick={() => setActiveTab('grading')}
            style={{ padding: '10px 20px', borderRadius: '6px', backgroundColor: activeTab === 'grading' ? '#2563eb' : '#ffffff', color: activeTab === 'grading' ? '#fff' : '#1e293b', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: activeTab === 'grading' ? '0 2px 8px rgba(37,99,235,0.2)' : 'none', border: activeTab === 'grading' ? 'none' : '1px solid #cbd5e1' }}
          >
            Record Student Marks & Grades
          </button>
        </div>

        {/* TAB CONTENT: TIMETABLE & DEPARTMENT VIEWERS */}
        {activeTab === 'timetable' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            {/* TIMETABLE TABLE */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #cbd5e1' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 15px 0' }}>Lecturer Teaching Timetable</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e2e8f0', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Day</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Time</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Course Unit</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Venue</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Target Department</th>
                  </tr>
                </thead>
                <tbody>
                  {lecturerTimetable.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#2563eb' }}>{item.day}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>{item.time}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a' }}>{item.course}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#334155' }}>{item.venue}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '700', color: '#047857' }}>{item.targetDept}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* DEPARTMENT TIMETABLE VIEWERS MONITOR */}
            <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                  Department Timetable Viewers & Activity Monitor ({lecturer.department})
                </h3>
                <span style={{ fontSize: '12px', backgroundColor: '#d1fae5', color: '#047857', padding: '4px 10px', borderRadius: '12px', fontWeight: '800' }}>
                  Live Tracking Active
                </span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 15px 0' }}>
                The following students from your department have accessed and viewed the semester timetable schedule:
              </p>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e2e8f0', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Student ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Full Name</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Department</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Last Timetable Access</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Enrollment Status</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentViewers.map((viewer, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '700', color: '#1d4ed8' }}>{viewer.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a' }}>{viewer.name}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#1e293b' }}>{viewer.department}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '600', color: '#334155' }}>{viewer.lastActive}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ backgroundColor: '#d1fae5', color: '#047857', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: '800' }}>
                          {viewer.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* TAB CONTENT: RECORD GRADES */}
        {activeTab === 'grading' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: '10px', padding: '25px', boxShadow: '0 4px 12px rgba(0,0,0,0.04)', border: '1px solid #cbd5e1' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 4px 0' }}>Record Student Marks & Assessment Grades</h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>Input assignment, midterm, and final exam scores for enrolled students.</p>
              </div>
              <div>
                <select 
                  value={selectedCourse} 
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #94a3b8', fontSize: '13px', fontWeight: '700', backgroundColor: '#fff', color: '#0f172a' }}
                >
                  <option value="SE301">SE301: Advanced Software Architecture</option>
                  <option value="SE303">SE303: Object-Oriented Design</option>
                </select>
              </div>
            </div>

            {gradingStatus && (
              <div style={{ backgroundColor: '#d1fae5', color: '#047857', padding: '12px', borderRadius: '6px', fontSize: '13px', marginBottom: '20px', fontWeight: '700', textAlign: 'center' }}>
                {gradingStatus}
              </div>
            )}

            <form onSubmit={handleSaveGrades}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e2e8f0', color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Student ID</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Full Name</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Assignment (20%)</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Midterm (30%)</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Final Exam (50%)</th>
                    <th style={{ padding: '12px 16px', fontWeight: '800' }}>Computed Final Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsGrades.map((student, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: '700', color: '#1d4ed8' }}>{student.id}</td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#0f172a' }}>{student.name}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <input 
                          type="number" 
                          value={student.assignment}
                          onChange={(e) => handleGradeChange(idx, 'assignment', e.target.value)}
                          style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: '700', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <input 
                          type="number" 
                          value={student.midterm}
                          onChange={(e) => handleGradeChange(idx, 'midterm', e.target.value)}
                          style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: '700', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <input 
                          type="number" 
                          value={student.exam}
                          onChange={(e) => handleGradeChange(idx, 'exam', e.target.value)}
                          style={{ width: '70px', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1', fontWeight: '700', textAlign: 'center' }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: '800', color: '#047857' }}>
                        {student.finalGrade}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button 
                type="submit"
                style={{ backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: '6px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.2)' }}
              >
                Submit & Save Grades to Registry
              </button>
            </form>

          </div>
        )}

      </div>

    </div>
  );
}
