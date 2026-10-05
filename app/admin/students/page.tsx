'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { protectNexusPage } from '@/lib/nexus-access';
import {
  NEXUS_KEYS,
  type CentralStudent,
} from '@/lib/nexus-data';

interface AdminStudent {
  id?: string;
  studentId?: string;
  name: string;
  faculty?: string;
  department?: string;
  province?: string;
  program?: string;
  ethnicity?: string;
}

interface PortalSession {
  username?: string;
  role?: string;
}

interface WorkspaceUser {
  name: string;
  role: string;
}

interface AcademicDepartment {
  id: string;
  name: string;
  code: string;
  head: string;
  programmes: string[];
}

interface AcademicFaculty {
  id: string;
  name: string;
  code: string;
  dean: string;
  departments: AcademicDepartment[];
}

const DEFAULT_FACULTIES = [
  'Faculty of Science & Technology',
  'Faculty of Medicine',
  'Faculty of Business',
];

const DEFAULT_DEPARTMENTS = [
  'Software Engineering',
  'Clinical Medicine',
  'Accounting',
];

const DEFAULT_PROVINCES = [
  'Central',
  'Chimbu',
  'East New Britain',
  'East Sepik',
  'Eastern Highlands',
  'Enga',
  'Gulf',
  'Hela',
  'Jiwaka',
  'Madang',
  'Manus',
  'Milne Bay',
  'Morobe',
  'New Ireland',
  'Northern',
  'Port Moresby',
  'Simbu',
  'Southern Highlands',
  'West New Britain',
  'Western',
  'Western Highlands',
];

const SAMPLE_STUDENTS: AdminStudent[] = [
  {
    id: '2026/S1/BCS/001',
    name: 'Ian McShane Wadidika',
    faculty: 'Faculty of Science & Technology',
    department: 'Software Engineering',
    province: 'Jiwaka',
  },
  {
    id: '2026/S1/BCS/014',
    name: 'Samantha Paska',
    faculty: 'Faculty of Science & Technology',
    department: 'Software Engineering',
    province: 'Western Highlands',
  },
  {
    id: '2026/S1/BCS/022',
    name: 'Thomas Kuma',
    faculty: 'Faculty of Science & Technology',
    department: 'Software Engineering',
    province: 'Madang',
  },
  {
    id: '2026/S1/MED/005',
    name: 'Brenda Wari',
    faculty: 'Faculty of Medicine',
    department: 'Clinical Medicine',
    province: 'Chimbu',
  },
  {
    id: '2026/S1/BUS/008',
    name: 'David Maima',
    faculty: 'Faculty of Business',
    department: 'Accounting',
    province: 'Morobe',
  },
];


function centralStudentToAdminStudent(
  student: CentralStudent,
): AdminStudent {
  return {
    id: student.id,
    studentId: student.studentId,
    name: student.fullName,
    faculty:
      student.facultyName ||
      student.facultyId ||
      '',
    department:
      student.departmentName ||
      student.departmentId ||
      '',
    province:
      student.province ||
      '',
    program:
      student.programmeName ||
      student.programmeId ||
      '',
    ethnicity:
      student.ethnicity ||
      '',
  };
}

function readCentralStudents(): CentralStudent[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = localStorage.getItem(
      NEXUS_KEYS.students,
    );

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed)
      ? (parsed as CentralStudent[])
      : [];
  } catch (error) {
    console.error(
      'Failed to parse central student records:',
      error,
    );

    return [];
  }
}

function saveCentralStudents(
  students: CentralStudent[],
) {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(
    NEXUS_KEYS.students,
    JSON.stringify(students),
  );

  window.dispatchEvent(
    new Event(
      'nexusSIS_central_students_updated',
    ),
  );
}

const getStudentId = (student: AdminStudent): string => {
  return String(student.id || student.studentId || '').trim();
};

const csvEscape = (value: unknown): string => {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
};

export default function AdminStudentsMasterList() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('All Faculties');
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [provinceFilter, setProvinceFilter] = useState('All Provinces');

  const [students, setStudents] = useState<AdminStudent[]>(SAMPLE_STUDENTS);

  const [academicFaculties, setAcademicFaculties] = useState<AcademicFaculty[]>([]);

  const [editingStudent, setEditingStudent] = useState<AdminStudent | null>(null);
  const [editName, setEditName] = useState('');
  const [editFaculty, setEditFaculty] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editProvince, setEditProvince] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [workspaceUser, setWorkspaceUser] = useState<WorkspaceUser>({
    name: 'Ian Wadidika',
    role: 'Registrar',
  });

  useEffect(() => {
    protectNexusPage([
      "Registrar",
      "Super Administrator",
      "ICT Administrator",
      "Student Affairs",
    ])
  }, [])

  useEffect(() => {
    const savedAcademicStructure = localStorage.getItem(
      'nexusSIS_academic_structure'
    );

    if (savedAcademicStructure) {
      try {
        const parsedAcademicStructure = JSON.parse(savedAcademicStructure);

        if (Array.isArray(parsedAcademicStructure)) {
          setAcademicFaculties(
            parsedAcademicStructure.filter(
              (faculty): faculty is AcademicFaculty =>
                faculty &&
                typeof faculty === 'object' &&
                typeof faculty.id === 'string' &&
                typeof faculty.name === 'string' &&
                Array.isArray(faculty.departments)
            )
          );
        }
      } catch (error) {
        console.error(
          'Failed to parse academic structure:',
          error
        );
      }
    }

    const centralStudents =
      readCentralStudents();

    if (centralStudents.length > 0) {
      const normalizedStudents =
        centralStudents
          .map(centralStudentToAdminStudent)
          .filter((student) => student.name);

      setStudents(normalizedStudents);
    }

    const savedSession = localStorage.getItem('nexussis_session');

    if (savedSession) {
      try {
        const session: PortalSession = JSON.parse(savedSession);

        if (session.username || session.role) {
          setWorkspaceUser({
            name: session.username || 'Portal User',
            role: session.role || 'User',
          });
        }
      } catch (error) {
        console.error('Failed to parse portal session:', error);
      }
    }
  }, []);

  const facultyOptions = useMemo(() => {
    const values = new Set<string>();

    academicFaculties.forEach((faculty) => {
      if (faculty.name.trim()) {
        values.add(faculty.name.trim());
      }
    });

    students.forEach((student) => {
      if (student.faculty?.trim()) {
        values.add(student.faculty.trim());
      }
    });

    return Array.from(values);
  }, [academicFaculties, students]);

  const departmentOptions = useMemo(() => {
    const values = new Set<string>();

    academicFaculties.forEach((faculty) => {
      faculty.departments.forEach((department) => {
        if (department.name.trim()) {
          values.add(department.name.trim());
        }
      });
    });

    students.forEach((student) => {
      const department =
        student.department?.trim() ||
        student.program?.trim();

      if (department) {
        values.add(department);
      }
    });

    return Array.from(values);
  }, [academicFaculties, students]);

  const provinceOptions = useMemo(() => {
    const values = new Set<string>(DEFAULT_PROVINCES);

    students.forEach((student) => {
      if (student.province?.trim()) {
        values.add(student.province.trim());
      }
    });

    return Array.from(values);
  }, [students]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return students.filter((student) => {
      const studentId = getStudentId(student);

      const matchesSearch =
        !query ||
        student.name.toLowerCase().includes(query) ||
        studentId.toLowerCase().includes(query);

      const matchesFaculty =
        facultyFilter === 'All Faculties' ||
        student.faculty === facultyFilter;

      const matchesDepartment =
        departmentFilter === 'All Departments' ||
        student.department === departmentFilter ||
        (!student.department &&
          student.program === departmentFilter);

      const matchesProvince =
        provinceFilter === 'All Provinces' ||
        student.province === provinceFilter;

      return (
        matchesSearch &&
        matchesFaculty &&
        matchesDepartment &&
        matchesProvince
      );
    });
  }, [
    students,
    searchQuery,
    facultyFilter,
    departmentFilter,
    provinceFilter,
  ]);

  const handleOpenEdit = (student: AdminStudent) => {
    setEditingStudent(student);
    setEditName(student.name || '');
    setEditFaculty(student.faculty || '');
    setEditDepartment(student.department || student.program || '');
    setEditProvince(student.province || '');
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleCloseEdit = () => {
    setEditingStudent(null);
    setEditName('');
    setEditFaculty('');
    setEditDepartment('');
    setEditProvince('');
    setStatusMessage('');
    setErrorMessage('');
  };

  const handleUpdateStudent = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingStudent) {
      return;
    }

    const cleanName = editName.trim();
    const cleanFaculty = editFaculty.trim();
    const cleanDepartment = editDepartment.trim();
    const cleanProvince = editProvince.trim();

    if (!cleanName) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (!cleanFaculty) {
      setErrorMessage('Faculty is required.');
      return;
    }

    if (!cleanDepartment) {
      setErrorMessage('Department is required.');
      return;
    }

    if (!cleanProvince) {
      setErrorMessage('Province is required.');
      return;
    }

    const editingId = getStudentId(editingStudent);

    const updatedStudents = students.map((student) => {
      const currentId = getStudentId(student);

      if (currentId === editingId) {
        return {
          ...student,
          name: cleanName,
          faculty: cleanFaculty,
          department: cleanDepartment,
          province: cleanProvince,
        };
      }

      return student;
    });

    setStudents(updatedStudents);

    /*
     * Student Master is now connected to the central
     * NEXUS SIS student record.
     *
     * Preserve every existing central field and update
     * only the information edited on this page.
     */
    const centralStudents =
      readCentralStudents();

    const updatedCentralStudents =
      centralStudents.map((centralStudent) => {
        const currentId =
          String(
            centralStudent.id ||
              centralStudent.studentId ||
              '',
          ).trim();

        if (currentId !== editingId) {
          return centralStudent;
        }

        const nameParts =
          cleanName
            .split(/\s+/)
            .filter(Boolean);

        const firstName =
          nameParts[0] ||
          centralStudent.firstName;

        const lastName =
          nameParts.length > 1
            ? nameParts[nameParts.length - 1]
            : centralStudent.lastName;

        const middleName =
          nameParts.length > 2
            ? nameParts.slice(1, -1).join(' ')
            : undefined;

        return {
          ...centralStudent,

          firstName,
          middleName,

          lastName,

          fullName:
            cleanName,

          facultyId:
            `FAC-${cleanFaculty
              .toUpperCase()
              .replace(/[^A-Z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'UNASSIGNED'}`,

          departmentId:
            `DEPT-${cleanDepartment
              .toUpperCase()
              .replace(/[^A-Z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '') || 'UNASSIGNED'}`,

          facultyName:
            cleanFaculty,

          departmentName:
            cleanDepartment,

          province:
            cleanProvince,

          updatedAt:
            new Date().toISOString(),
        };
      });

    saveCentralStudents(
      updatedCentralStudents,
    );

    setErrorMessage('');
    setStatusMessage(
      `Successfully updated student record for ${cleanName} (${editingId}).`
    );

    window.setTimeout(() => {
      setStatusMessage('');
      setEditingStudent(null);
    }, 3000);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const header = [
      'Student ID',
      'Full Name',
      'Faculty',
      'Department',
      'Province',
    ];

    const rows = filteredStudents.map((student) => [
      getStudentId(student),
      student.name,
      student.faculty || 'N/A',
      student.department || student.program || 'N/A',
      student.province || 'N/A',
    ]);

    const csvLines = [
      header.map(csvEscape).join(','),
      ...rows.map((row) => row.map(csvEscape).join(',')),
    ];

    const csvContent = `data:text/csv;charset=utf-8,${csvLines.join('\n')}`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');

    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'student_master_list.csv');

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLockSession = () => {
    localStorage.removeItem('nexussis_session');
    localStorage.removeItem('nexus_role');
    localStorage.removeItem('nexus_username');
    localStorage.removeItem('userSession');

    router.push('/dashboard');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          nav,
          button,
          .no-print {
            display: none !important;
          }

          table {
            width: 100% !important;
          }

          @page {
            size: landscape;
            margin: 12mm;
          }
        }
      `}</style>

      {/* NAVBAR */}
      <nav
        style={{
          backgroundColor: '#0f172a',
          color: 'white',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '0.2px',
            }}
          >
            University Portal
          </div>

          <div
            style={{
              fontSize: '12px',
              color: '#cbd5e1',
              marginTop: '3px',
            }}
          >
            Admin Workspace
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            fontSize: '14px',
          }}
        >
          <a
            href="/dashboard"
            style={{
              color: 'white',
              textDecoration: 'none',
            }}
          >
            Home
          </a>

          <a
            href="/admin/registration"
            style={{
              color: 'white',
              textDecoration: 'none',
            }}
          >
            Registration
          </a>

          <span
            style={{
              color: '#93c5fd',
              fontWeight: 600,
            }}
          >
            Admin Lookup & Master List
          </span>

          <button
            type="button"
            onClick={handleLockSession}
            className="no-print"
            style={{
              border: '1px solid #475569',
              backgroundColor: '#1e293b',
              color: 'white',
              padding: '8px 14px',
              borderRadius: '7px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Lock Session
          </button>
        </div>
      </nav>

      {/* PAGE HEADER */}
      <div
        style={{
          padding: '30px 32px 22px',
          backgroundColor: 'white',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '28px',
                  color: '#0f172a',
                  fontWeight: 750,
                }}
              >
                Student Master List
              </h1>

              <p
                style={{
                  margin: '7px 0 0',
                  color: '#64748b',
                  fontSize: '14px',
                }}
              >
                Central administrative lookup and student record management.
              </p>
            </div>

            <div
              style={{
                textAlign: 'right',
                fontSize: '13px',
                color: '#475569',
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  color: '#0f172a',
                }}
              >
                Authenticated Session Active
              </div>

              <div style={{ marginTop: '4px' }}>
                Role: {workspaceUser.role} ({workspaceUser.name})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <main
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '28px 32px 50px',
        }}
      >
        {/* FILTER CARD */}
        <div
          className="no-print"
          style={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '15px',
            }}
          >
            Search & Filters
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                'minmax(240px, 2fr) minmax(180px, 1fr) minmax(180px, 1fr) minmax(180px, 1fr)',
              gap: '12px',
            }}
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search student name or ID..."
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '11px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                fontSize: '14px',
                outline: 'none',
              }}
            />

            <select
              value={facultyFilter}
              onChange={(event) => setFacultyFilter(event.target.value)}
              style={{
                width: '100%',
                padding: '11px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                fontSize: '14px',
                backgroundColor: 'white',
              }}
            >
              <option>All Faculties</option>
              {facultyOptions.map((faculty) => (
                <option key={faculty} value={faculty}>
                  {faculty}
                </option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              style={{
                width: '100%',
                padding: '11px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                fontSize: '14px',
                backgroundColor: 'white',
              }}
            >
              <option>All Departments</option>
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

            <select
              value={provinceFilter}
              onChange={(event) => setProvinceFilter(event.target.value)}
              style={{
                width: '100%',
                padding: '11px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '7px',
                fontSize: '14px',
                backgroundColor: 'white',
              }}
            >
              <option>All Provinces</option>
              {provinceOptions.map((province) => (
                <option key={province} value={province}>
                  {province}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* EXPORT BAR */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '15px',
            marginBottom: '15px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              color: '#475569',
              fontSize: '14px',
            }}
          >
            Showing{' '}
            <strong style={{ color: '#0f172a' }}>
              {filteredStudents.length}
            </strong>{' '}
            of{' '}
            <strong style={{ color: '#0f172a' }}>
              {students.length}
            </strong>{' '}
            student records
          </div>

          <div
            style={{
              display: 'flex',
              gap: '9px',
            }}
          >
            <button
              type="button"
              onClick={handleExportPDF}
              style={{
                border: '1px solid #cbd5e1',
                backgroundColor: 'white',
                color: '#0f172a',
                padding: '9px 14px',
                borderRadius: '7px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Export PDF / Print
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              style={{
                border: 'none',
                backgroundColor: '#0f766e',
                color: 'white',
                padding: '9px 14px',
                borderRadius: '7px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              Export Excel (CSV)
            </button>
          </div>
        </div>

        {/* STATUS MESSAGE */}
        {statusMessage && (
          <div
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              color: '#065f46',
              padding: '12px 14px',
              borderRadius: '8px',
              marginBottom: '15px',
              fontSize: '14px',
            }}
          >
            {statusMessage}
          </div>
        )}

        {/* TABLE */}
        <div
          style={{
            backgroundColor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(15,23,42,0.04)',
          }}
        >
          <div
            style={{
              overflowX: 'auto',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: '950px',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#f1f5f9',
                    borderBottom: '1px solid #e2e8f0',
                  }}
                >
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '13px 15px',
                      fontSize: '12px',
                      color: '#475569',
                      fontWeight: 700,
                    }}
                  >
                    Student ID
                  </th>

                  <th
                    style={{
                      textAlign: 'left',
                      padding: '13px 15px',
                      fontSize: '12px',
                      color: '#475569',
                      fontWeight: 700,
                    }}
                  >
                    Full Name
                  </th>

                  <th
                    style={{
                      textAlign: 'left',
                      padding: '13px 15px',
                      fontSize: '12px',
                      color: '#475569',
                      fontWeight: 700,
                    }}
                  >
                    Faculty
                  </th>

                  <th
                    style={{
                      textAlign: 'left',
                      padding: '13px 15px',
                      fontSize: '12px',
                      color: '#475569',
                      fontWeight: 700,
                    }}
                  >
                    Department
                  </th>

                  <th
                    style={{
                      textAlign: 'left',
                      padding: '13px 15px',
                      fontSize: '12px',
                      color: '#475569',
                      fontWeight: 700,
                    }}
                  >
                    Province
                  </th>

                  <th
                    className="no-print"
                    style={{
                      textAlign: 'center',
                      padding: '13px 15px',
                      fontSize: '12px',
                      color: '#475569',
                      fontWeight: 700,
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      style={{
                        padding: '45px 20px',
                        textAlign: 'center',
                        color: '#64748b',
                        fontSize: '14px',
                      }}
                    >
                      No student records match the current search and filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((student) => {
                    const studentId = getStudentId(student);

                    return (
                      <tr
                        key={studentId || student.name}
                        style={{
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        <td
                          style={{
                            padding: '14px 15px',
                            fontSize: '13px',
                            color: '#0f172a',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {studentId || 'N/A'}
                        </td>

                        <td
                          style={{
                            padding: '14px 15px',
                            fontSize: '14px',
                            color: '#0f172a',
                            fontWeight: 600,
                          }}
                        >
                          {student.name}
                        </td>

                        <td
                          style={{
                            padding: '14px 15px',
                            fontSize: '13px',
                            color: '#475569',
                          }}
                        >
                          {student.faculty || 'N/A'}
                        </td>

                        <td
                          style={{
                            padding: '14px 15px',
                            fontSize: '13px',
                            color: '#475569',
                          }}
                        >
                          {student.department || student.program || 'N/A'}
                        </td>

                        <td
                          style={{
                            padding: '14px 15px',
                            fontSize: '13px',
                            color: '#475569',
                          }}
                        >
                          {student.province || 'N/A'}
                        </td>

                        <td
                          className="no-print"
                          style={{
                            padding: '14px 15px',
                            textAlign: 'center',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(student)}
                            style={{
                              border: '1px solid #cbd5e1',
                              backgroundColor: 'white',
                              color: '#1d4ed8',
                              padding: '7px 11px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            Update Info
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* EDIT MODAL */}
      {editingStudent && (
        <div
          className="no-print"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15,23,42,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '560px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '20px 22px',
                borderBottom: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '19px',
                    color: '#0f172a',
                  }}
                >
                  Update Student Information
                </h2>

                <div
                  style={{
                    marginTop: '5px',
                    color: '#64748b',
                    fontSize: '12px',
                  }}
                >
                  Student ID: {getStudentId(editingStudent) || 'N/A'}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseEdit}
                style={{
                  border: 'none',
                  background: 'transparent',
                  fontSize: '24px',
                  color: '#64748b',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleUpdateStudent}>
              <div
                style={{
                  padding: '22px',
                  display: 'grid',
                  gap: '16px',
                }}
              >
                {errorMessage && (
                  <div
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#991b1b',
                      padding: '11px 12px',
                      borderRadius: '7px',
                      fontSize: '13px',
                    }}
                  >
                    {errorMessage}
                  </div>
                )}

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: 650,
                      color: '#334155',
                    }}
                  >
                    Full Name
                  </label>

                  <input
                    type="text"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                    required
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '10px 11px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '7px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: 650,
                      color: '#334155',
                    }}
                  >
                    Faculty
                  </label>

                  <select
                    value={editFaculty}
                    onChange={(event) => setEditFaculty(event.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 11px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '7px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="" disabled>
                      Select Faculty
                    </option>

                    {Array.from(
                      new Set([
                        ...facultyOptions,
                        ...(editFaculty ? [editFaculty] : []),
                      ])
                    ).map((faculty) => (
                      <option key={faculty} value={faculty}>
                        {faculty}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: 650,
                      color: '#334155',
                    }}
                  >
                    Department
                  </label>

                  <select
                    value={editDepartment}
                    onChange={(event) =>
                      setEditDepartment(event.target.value)
                    }
                    required
                    style={{
                      width: '100%',
                      padding: '10px 11px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '7px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="" disabled>
                      Select Department
                    </option>

                    {Array.from(
                      new Set([
                        ...departmentOptions,
                        ...(editDepartment ? [editDepartment] : []),
                      ])
                    ).map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: 'block',
                      marginBottom: '6px',
                      fontSize: '13px',
                      fontWeight: 650,
                      color: '#334155',
                    }}
                  >
                    Province
                  </label>

                  <select
                    value={editProvince}
                    onChange={(event) => setEditProvince(event.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 11px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '7px',
                      fontSize: '14px',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="" disabled>
                      Select Province
                    </option>

                    {Array.from(
                      new Set([
                        ...provinceOptions,
                        ...(editProvince ? [editProvince] : []),
                      ])
                    ).map((province) => (
                      <option key={province} value={province}>
                        {province}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                style={{
                  padding: '16px 22px',
                  borderTop: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '9px',
                }}
              >
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  style={{
                    border: '1px solid #cbd5e1',
                    backgroundColor: 'white',
                    color: '#334155',
                    padding: '9px 15px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    border: 'none',
                    backgroundColor: '#1d4ed8',
                    color: 'white',
                    padding: '9px 16px',
                    borderRadius: '7px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
