'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { protectNexusPage } from "@/lib/nexus-access"

type Student = {
  id?: string
  studentId?: string
  name: string
  email?: string
  phone?: string
  gender?: string
  dateOfBirth?: string
  province?: string
  faculty?: string
  department?: string
  programme?: string
  yearLevel?: string
  semester?: string
  academicYear?: string | number
  status?: string
  address?: string
  sponsor?: string
}

type Course = {
  id?: string
  code?: string
  title?: string
  description?: string
  department?: string
  faculty?: string
  programme?: string
  yearLevel?: string
  semester?: string | number
  creditHours?: number
  courseType?: string
  status?: string
}

type FinanceRecord = {
  id?: string
  studentId?: string
  studentName?: string
  academicYear?: string | number
  semester?: string | number
  tuitionFee?: number
  otherFees?: number
  scholarship?: number
  sponsorship?: number
  totalFees?: number
  amountPaid?: number
  balance?: number
  status?: string
}

type Payment = {
  id?: string
  studentId?: string
  studentName?: string
  amount?: number
  date?: string
  paymentDate?: string
  receiptNumber?: string
  method?: string
  reference?: string
  status?: string
}

type LibraryLoan = {
  id?: string
  studentId?: string
  studentName?: string
  bookId?: string
  bookTitle?: string
  issueDate?: string
  dueDate?: string
  returnDate?: string
  status?: string
  fine?: number
}

type LmsCourse = {
  id?: string
  courseId?: string
  courseCode?: string
  courseTitle?: string
  lecturerName?: string
  status?: string
}

type LmsMaterial = {
  id?: string
  courseId?: string
  title?: string
  type?: string
  description?: string
  url?: string
  createdAt?: string
}

type LmsAssignment = {
  id?: string
  courseId?: string
  title?: string
  description?: string
  dueDate?: string
  maxMarks?: number
  status?: string
}

type LmsSubmission = {
  id?: string
  assignmentId?: string
  courseId?: string
  studentId?: string
  studentName?: string
  submittedAt?: string
  marks?: number
  grade?: string
  feedback?: string
  status?: string
}

type CafeteriaMeal = {
  id?: string
  studentId?: string
  studentName?: string
  mealType?: string
  date?: string
  servedAt?: string
  status?: string
  servedBy?: string
}

type Clearance = {
  academic: boolean
  financial: boolean
  library: boolean
  accommodation: boolean
  cafeteria: boolean
}

type Tab =
  | 'overview'
  | 'profile'
  | 'courses'
  | 'finance'
  | 'lms'
  | 'library'
  | 'cafeteria'
  | 'clearance'

const STORAGE = {
  students: 'nexusSIS_registered_students',
  courses: 'nexusSIS_courses',
  finance: 'nexusSIS_finance_records',
  payments: 'nexusSIS_payments',
  loans: 'nexusSIS_library_loans',
  lmsCourses: 'nexusSIS_lms_courses',
  lmsMaterials: 'nexusSIS_lms_materials',
  lmsAssignments: 'nexusSIS_lms_assignments',
  lmsSubmissions: 'nexusSIS_lms_submissions',
  cafeteriaMeals: 'nexusSIS_cafeteria_meals',
}

const fallbackStudents: Student[] = [
  {
    id: 'student-1',
    studentId: 'NXS2600001',
    name: 'David Maima',
    email: 'david.maima@student.nexus.edu',
    phone: '70000001',
    gender: 'Male',
    province: 'National Capital District',
    faculty: 'Faculty of Science',
    department: 'Computer Science',
    programme: 'Bachelor of Computer Science',
    yearLevel: 'Year 1',
    semester: '1',
    academicYear: 2026,
    status: 'Registered',
  },
  {
    id: 'student-2',
    studentId: 'NXS2600002',
    name: 'Mary Kila',
    email: 'mary.kila@student.nexus.edu',
    phone: '70000002',
    gender: 'Female',
    province: 'Central',
    faculty: 'Faculty of Business',
    department: 'Business',
    programme: 'Bachelor of Business',
    yearLevel: 'Year 1',
    semester: '1',
    academicYear: 2026,
    status: 'Registered',
  },
]

const fallbackCourses: Course[] = [
  {
    id: 'course-1',
    code: 'CSC101',
    title: 'Introduction to Computer Science',
    faculty: 'Faculty of Science',
    department: 'Computer Science',
    programme: 'Bachelor of Computer Science',
    yearLevel: 'Year 1',
    semester: '1',
    creditHours: 3,
    courseType: 'Core',
    status: 'Active',
  },
  {
    id: 'course-2',
    code: 'MAT101',
    title: 'Foundation Mathematics',
    faculty: 'Faculty of Science',
    department: 'Mathematics',
    programme: 'Bachelor of Computer Science',
    yearLevel: 'Year 1',
    semester: '1',
    creditHours: 3,
    courseType: 'Core',
    status: 'Active',
  },
  {
    id: 'course-3',
    code: 'ENG101',
    title: 'Academic English',
    faculty: 'Faculty of Arts',
    department: 'English',
    programme: 'Bachelor of Computer Science',
    yearLevel: 'Year 1',
    semester: '1',
    creditHours: 3,
    courseType: 'General',
    status: 'Active',
  },
]

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)

    if (!raw) {
      return fallback
    }

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function getStudentId(student: Student) {
  return String(student.studentId ?? student.id ?? '')
}

function formatDate(value?: string) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString()
}

function formatDateTime(value?: string) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function money(value: number) {
  return `PGK ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function StudentPortalPage() {
  useEffect(() => {
    protectNexusPage([
      "Student Affairs",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])


  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudentId, setSelectedStudentId] = useState('')

  const [courses, setCourses] = useState<Course[]>([])
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [loans, setLoans] = useState<LibraryLoan[]>([])
  const [lmsCourses, setLmsCourses] = useState<LmsCourse[]>([])
  const [lmsMaterials, setLmsMaterials] = useState<LmsMaterial[]>([])
  const [lmsAssignments, setLmsAssignments] = useState<LmsAssignment[]>([])
  const [lmsSubmissions, setLmsSubmissions] = useState<LmsSubmission[]>([])
  const [cafeteriaMeals, setCafeteriaMeals] = useState<CafeteriaMeal[]>([])

  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [search, setSearch] = useState('')

  const [sessionName, setSessionName] = useState('Student Portal')

  useEffect(() => {
    const loadedStudents = readStorage<Student[]>(
      STORAGE.students,
      fallbackStudents,
    )

    setStudents(loadedStudents)

    const session = readStorage<{
      studentId?: string
      username?: string
      name?: string
    } | null>('nexussis_session', null)

    const storedUsername =
      localStorage.getItem('nexus_username') || ''

    const possibleStudentId =
      session?.studentId ||
      (storedUsername.startsWith('NXS')
        ? storedUsername
        : '')

    const firstStudentId =
      loadedStudents.length > 0
        ? getStudentId(loadedStudents[0])
        : ''

    const matchingStudent = loadedStudents.find(
      (student) =>
        getStudentId(student) === possibleStudentId ||
        String(student.name || '').toLowerCase() ===
          String(session?.name || storedUsername || '').toLowerCase(),
    )

    const initialStudentId = matchingStudent
      ? getStudentId(matchingStudent)
      : firstStudentId

    setSelectedStudentId(initialStudentId)

    if (matchingStudent?.name) {
      setSessionName(matchingStudent.name)
    } else if (session?.name) {
      setSessionName(session.name)
    } else if (storedUsername) {
      setSessionName(storedUsername)
    }

    setCourses(
      readStorage<Course[]>(
        STORAGE.courses,
        fallbackCourses,
      ),
    )

    setFinanceRecords(
      readStorage<FinanceRecord[]>(
        STORAGE.finance,
        [],
      ),
    )

    setPayments(
      readStorage<Payment[]>(
        STORAGE.payments,
        [],
      ),
    )

    setLoans(
      readStorage<LibraryLoan[]>(
        STORAGE.loans,
        [],
      ),
    )

    setLmsCourses(
      readStorage<LmsCourse[]>(
        STORAGE.lmsCourses,
        [],
      ),
    )

    setLmsMaterials(
      readStorage<LmsMaterial[]>(
        STORAGE.lmsMaterials,
        [],
      ),
    )

    setLmsAssignments(
      readStorage<LmsAssignment[]>(
        STORAGE.lmsAssignments,
        [],
      ),
    )

    setLmsSubmissions(
      readStorage<LmsSubmission[]>(
        STORAGE.lmsSubmissions,
        [],
      ),
    )

    setCafeteriaMeals(
      readStorage<CafeteriaMeal[]>(
        STORAGE.cafeteriaMeals,
        [],
      ),
    )
  }, [])

  const selectedStudent = useMemo(
    () =>
      students.find(
        (student) =>
          getStudentId(student) === selectedStudentId,
      ) ?? students[0],
    [students, selectedStudentId],
  )

  const studentId = selectedStudent
    ? getStudentId(selectedStudent)
    : ''

  const studentFinance = useMemo(
    () =>
      financeRecords.filter(
        (record) => String(record.studentId) === studentId,
      ),
    [financeRecords, studentId],
  )

  const studentPayments = useMemo(
    () =>
      payments.filter(
        (payment) => String(payment.studentId) === studentId,
      ),
    [payments, studentId],
  )

  const studentLoans = useMemo(
    () =>
      loans.filter(
        (loan) => String(loan.studentId) === studentId,
      ),
    [loans, studentId],
  )

  const studentMeals = useMemo(
    () =>
      cafeteriaMeals.filter(
        (meal) => String(meal.studentId) === studentId,
      ),
    [cafeteriaMeals, studentId],
  )

  const studentLmsCourses = useMemo(() => {
    const programme = String(
      selectedStudent?.programme ?? '',
    ).toLowerCase()

    const yearLevel = String(
      selectedStudent?.yearLevel ?? '',
    ).toLowerCase()

    const matchingCourses = courses.filter((course) => {
      const courseProgramme = String(
        course.programme ?? '',
      ).toLowerCase()

      const courseYear = String(
        course.yearLevel ?? '',
      ).toLowerCase()

      const programmeMatch =
        !courseProgramme ||
        !programme ||
        courseProgramme === programme

      const yearMatch =
        !courseYear ||
        !yearLevel ||
        courseYear === yearLevel

      return programmeMatch && yearMatch
    })

    if (matchingCourses.length > 0) {
      return matchingCourses
    }

    return courses.filter(
      (course) => course.status !== 'Inactive',
    )
  }, [
    courses,
    selectedStudent?.programme,
    selectedStudent?.yearLevel,
  ])

  const selectedLmsCourses = useMemo(() => {
    if (!studentLmsCourses.length) {
      return lmsCourses
    }

    const ids = new Set(
      studentLmsCourses.flatMap((course) => [
        String(course.id ?? ''),
        String(course.code ?? ''),
      ]),
    )

    const matching = lmsCourses.filter((course) =>
      ids.has(String(course.courseId ?? '')),
    )

    return matching.length > 0 ? matching : lmsCourses
  }, [lmsCourses, studentLmsCourses])

  const studentSubmissions = useMemo(
    () =>
      lmsSubmissions.filter(
        (submission) =>
          String(submission.studentId) === studentId,
      ),
    [lmsSubmissions, studentId],
  )

  const studentAssignments = useMemo(() => {
    if (!selectedLmsCourses.length) {
      return lmsAssignments
    }

    const ids = new Set(
      selectedLmsCourses.map((course) =>
        String(course.courseId ?? ''),
      ),
    )

    return lmsAssignments.filter((assignment) =>
      ids.has(String(assignment.courseId ?? '')),
    )
  }, [lmsAssignments, selectedLmsCourses])

  const latestFinance = studentFinance[0]

  const totalFees = studentFinance.reduce(
    (sum, record) =>
      sum +
      Number(
        record.totalFees ??
          Number(record.tuitionFee || 0) +
            Number(record.otherFees || 0),
      ),
    0,
  )

  const totalPaid = studentPayments.reduce(
    (sum, payment) =>
      sum + Number(payment.amount || 0),
    0,
  )

  const financeBalance =
    latestFinance?.balance !== undefined
      ? Number(latestFinance.balance)
      : Math.max(totalFees - totalPaid, 0)

  const libraryFines = studentLoans.reduce(
    (sum, loan) => sum + Number(loan.fine || 0),
    0,
  )

  const servedMeals = studentMeals.filter(
    (meal) => meal.status === 'Served',
  ).length

  const clearance = useMemo<Clearance>(() => {
    const academic =
      selectedStudent?.status === 'Registered' ||
      selectedStudent?.status === 'Active' ||
      selectedStudent?.status === 'Approved'

    const financial =
      financeBalance <= 0 ||
      studentFinance.length === 0

    const library =
      studentLoans.length === 0 ||
      studentLoans.every(
        (loan) =>
          loan.status === 'Returned' ||
          loan.status === 'Closed',
      )

    const accommodation = true

    const cafeteria = true

    return {
      academic,
      financial,
      library,
      accommodation,
      cafeteria,
    }
  }, [
    selectedStudent?.status,
    financeBalance,
    studentFinance.length,
    studentLoans,
  ])

  const clearanceCount = Object.values(clearance).filter(
    Boolean,
  ).length

  const overallClearance =
    clearanceCount === Object.keys(clearance).length

  function setTab(tab: Tab) {
    setActiveTab(tab)
    setSearch('')
  }

  function signOut() {
    localStorage.removeItem('nexussis_session')
    localStorage.removeItem('nexus_role')
    localStorage.removeItem('nexus_username')
    localStorage.removeItem('userSession')

    window.location.href = '/dashboard'
  }

  function downloadStatement() {
    if (!selectedStudent) return

    const rows = [
      ['NEXUS SIS STUDENT FINANCIAL STATEMENT'],
      [],
      ['Student ID', studentId],
      ['Student Name', selectedStudent.name],
      ['Programme', selectedStudent.programme || ''],
      [],
      [
        'Academic Year',
        'Semester',
        'Total Fees',
        'Scholarship',
        'Sponsorship',
        'Amount Paid',
        'Balance',
        'Status',
      ],
      ...studentFinance.map((record) => [
        record.academicYear || '',
        record.semester || '',
        record.totalFees || 0,
        record.scholarship || 0,
        record.sponsorship || 0,
        record.amountPaid || 0,
        record.balance || 0,
        record.status || '',
      ]),
      [],
      ['Total Fees', totalFees],
      ['Total Paid', totalPaid],
      ['Current Balance', financeBalance],
    ]

    downloadCsv(
      'nexus-student-financial-statement.csv',
      rows,
    )
  }

  function downloadAcademicSummary() {
    if (!selectedStudent) return

    const rows = [
      ['NEXUS SIS STUDENT ACADEMIC SUMMARY'],
      [],
      ['Student ID', studentId],
      ['Student Name', selectedStudent.name],
      ['Programme', selectedStudent.programme || ''],
      ['Year Level', selectedStudent.yearLevel || ''],
      ['Academic Year', selectedStudent.academicYear || ''],
      ['Semester', selectedStudent.semester || ''],
      [],
      ['Course Code', 'Course Title', 'Credits', 'Type', 'Status'],
      ...studentLmsCourses.map((course) => [
        course.code || '',
        course.title || '',
        course.creditHours || 0,
        course.courseType || '',
        course.status || '',
      ]),
    ]

    downloadCsv(
      'nexus-student-academic-summary.csv',
      rows,
    )
  }

  function downloadLibraryHistory() {
    const rows = [
      [
        'Student ID',
        'Book',
        'Issue Date',
        'Due Date',
        'Return Date',
        'Status',
        'Fine',
      ],
      ...studentLoans.map((loan) => [
        studentId,
        loan.bookTitle || '',
        loan.issueDate || '',
        loan.dueDate || '',
        loan.returnDate || '',
        loan.status || '',
        loan.fine || 0,
      ]),
    ]

    downloadCsv(
      'nexus-student-library-history.csv',
      rows,
    )
  }

  function downloadMealHistory() {
    const rows = [
      [
        'Date',
        'Meal',
        'Status',
        'Served At',
        'Served By',
      ],
      ...studentMeals.map((meal) => [
        meal.date || '',
        meal.mealType || '',
        meal.status || '',
        meal.servedAt || '',
        meal.servedBy || '',
      ]),
    ]

    downloadCsv(
      'nexus-student-meal-history.csv',
      rows,
    )
  }

  function downloadCsv(
    filename: string,
    rows: unknown[][],
  ) {
    const escape = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const csv = rows
      .map((row) =>
        row.map((cell) => escape(cell)).join(','),
      )
      .join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download = filename
    anchor.click()

    URL.revokeObjectURL(url)
  }

  if (!selectedStudent) {
    return (
      <main className="min-h-screen bg-slate-100">
        <header className="bg-[#071a3d] px-6 py-5 text-white">
          <div className="mx-auto max-w-7xl">
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">
              Nexus SIS
            </div>

            <h1 className="mt-1 text-2xl font-bold">
              Student Portal
            </h1>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-6 py-12">
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">
              No Student Record Available
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Register a student first through Student Registration.
            </p>

            <Link
              href="/admin/registration"
              className="mt-5 inline-flex rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Student Registration
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-[#071a3d] text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">
                Nexus SIS
              </div>

              <h1 className="mt-1 text-2xl font-bold">
                Student Portal
              </h1>

              <p className="mt-1 text-sm text-slate-300">
                Central student access to academic, finance, LMS, library and campus services.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/registration"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Registration
              </Link>

              <Link
                href="/admin/students"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Student Records
              </Link>

              <button
                onClick={signOut}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                {selectedStudent.name
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part.charAt(0))
                  .join('')
                  .toUpperCase()}
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Student Account
                </p>

                <h2 className="text-xl font-bold text-slate-900">
                  {selectedStudent.name}
                </h2>

                <p className="mt-1 font-mono text-xs font-semibold text-slate-500">
                  {studentId}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {students.length > 1 && (
                <select
                  value={studentId}
                  onChange={(event) =>
                    setSelectedStudentId(event.target.value)
                  }
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  {students.map((student) => (
                    <option
                      key={getStudentId(student)}
                      value={getStudentId(student)}
                    >
                      {getStudentId(student)} - {student.name}
                    </option>
                  ))}
                </select>
              )}

              <StatusBadge
                status={
                  selectedStudent.status || 'Registered'
                }
                active
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PortalStat
            label="Current Balance"
            value={money(financeBalance)}
            icon="💰"
          />

          <PortalStat
            label="Library Fines"
            value={money(libraryFines)}
            icon="📚"
          />

          <PortalStat
            label="Courses"
            value={studentLmsCourses.length}
            icon="🎓"
          />

          <PortalStat
            label="Meals Served"
            value={servedMeals}
            icon="🍽️"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
            <PortalTab
              active={activeTab === 'overview'}
              onClick={() => setTab('overview')}
            >
              Overview
            </PortalTab>

            <PortalTab
              active={activeTab === 'profile'}
              onClick={() => setTab('profile')}
            >
              My Profile
            </PortalTab>

            <PortalTab
              active={activeTab === 'courses'}
              onClick={() => setTab('courses')}
            >
              Academics
            </PortalTab>

            <PortalTab
              active={activeTab === 'finance'}
              onClick={() => setTab('finance')}
            >
              Finance
            </PortalTab>

            <PortalTab
              active={activeTab === 'lms'}
              onClick={() => setTab('lms')}
            >
              LMS
            </PortalTab>

            <PortalTab
              active={activeTab === 'library'}
              onClick={() => setTab('library')}
            >
              Library
            </PortalTab>

            <PortalTab
              active={activeTab === 'cafeteria'}
              onClick={() => setTab('cafeteria')}
            >
              Cafeteria
            </PortalTab>

            <PortalTab
              active={activeTab === 'clearance'}
              onClick={() => setTab('clearance')}
            >
              Clearance
            </PortalTab>
          </div>

          <div className="p-6">
            {activeTab !== 'overview' &&
              activeTab !== 'profile' && (
                <div className="mb-5">
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder={`Search ${activeTab}...`}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}

            {activeTab === 'overview' && (
              <OverviewView
                student={selectedStudent}
                studentFinance={studentFinance}
                studentPayments={studentPayments}
                studentLoans={studentLoans}
                studentMeals={studentMeals}
                courses={studentLmsCourses}
                assignments={studentAssignments}
                submissions={studentSubmissions}
                clearance={clearance}
                overallClearance={overallClearance}
                setTab={setTab}
              />
            )}

            {activeTab === 'profile' && (
              <ProfileView
                student={selectedStudent}
              />
            )}

            {activeTab === 'courses' && (
              <CoursesView
                courses={studentLmsCourses.filter((course) => {
                  const query = search.trim().toLowerCase()

                  return (
                    !query ||
                    String(course.code || '')
                      .toLowerCase()
                      .includes(query) ||
                    String(course.title || '')
                      .toLowerCase()
                      .includes(query) ||
                    String(course.department || '')
                      .toLowerCase()
                      .includes(query)
                  )
                })}
                onExport={downloadAcademicSummary}
              />
            )}

            {activeTab === 'finance' && (
              <FinanceView
                records={studentFinance}
                payments={studentPayments}
                totalFees={totalFees}
                totalPaid={totalPaid}
                balance={financeBalance}
                onExport={downloadStatement}
              />
            )}

            {activeTab === 'lms' && (
              <LmsView
                courses={selectedLmsCourses.filter(
                  (course) => {
                    const query = search.trim().toLowerCase()

                    return (
                      !query ||
                      String(course.courseCode || '')
                        .toLowerCase()
                        .includes(query) ||
                      String(course.courseTitle || '')
                        .toLowerCase()
                        .includes(query) ||
                      String(course.lecturerName || '')
                        .toLowerCase()
                        .includes(query)
                    )
                  },
                )}
                materials={lmsMaterials}
                assignments={studentAssignments}
                submissions={studentSubmissions}
              />
            )}

            {activeTab === 'library' && (
              <LibraryView
                loans={studentLoans.filter((loan) => {
                  const query = search.trim().toLowerCase()

                  return (
                    !query ||
                    String(loan.bookTitle || '')
                      .toLowerCase()
                      .includes(query) ||
                    String(loan.status || '')
                      .toLowerCase()
                      .includes(query)
                  )
                })}
                onExport={downloadLibraryHistory}
              />
            )}

            {activeTab === 'cafeteria' && (
              <CafeteriaView
                meals={studentMeals.filter((meal) => {
                  const query = search.trim().toLowerCase()

                  return (
                    !query ||
                    String(meal.mealType || '')
                      .toLowerCase()
                      .includes(query) ||
                    String(meal.status || '')
                      .toLowerCase()
                      .includes(query)
                  )
                })}
                onExport={downloadMealHistory}
              />
            )}

            {activeTab === 'clearance' && (
              <ClearanceView
                clearance={clearance}
                overallClearance={overallClearance}
              />
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="font-bold text-blue-900">
            Nexus SIS Central Student Record
          </h3>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            This portal uses the central Student ID as the common identifier
            across registration, academic records, finance, LMS, library,
            cafeteria and clearance services. The current prototype reads
            module data from localStorage; the final integration phase will
            connect these services to the central university database.
          </p>
        </div>
      </div>
    </main>
  )
}

function OverviewView({
  student,
  studentFinance,
  studentPayments,
  studentLoans,
  studentMeals,
  courses,
  assignments,
  submissions,
  clearance,
  overallClearance,
  setTab,
}: {
  student: Student
  studentFinance: FinanceRecord[]
  studentPayments: Payment[]
  studentLoans: LibraryLoan[]
  studentMeals: CafeteriaMeal[]
  courses: Course[]
  assignments: LmsAssignment[]
  submissions: LmsSubmission[]
  clearance: Clearance
  overallClearance: boolean
  setTab: (tab: Tab) => void
}) {
  const recentPayments = studentPayments.slice(0, 3)
  const recentLoans = studentLoans.slice(0, 3)
  const recentMeals = studentMeals.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Welcome, {student.name.split(' ')[0]}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Your central Nexus SIS student dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <QuickPortalCard
          title="Academics"
          description={`${courses.length} course records currently available.`}
          button="View Academics"
          onClick={() => setTab('courses')}
        />

        <QuickPortalCard
          title="Finance"
          description={`${studentFinance.length} financial record(s) and ${studentPayments.length} payment(s).`}
          button="View Finance"
          onClick={() => setTab('finance')}
        />

        <QuickPortalCard
          title="LMS"
          description={`${assignments.length} assignment(s) currently visible.`}
          button="Open LMS"
          onClick={() => setTab('lms')}
        />

        <QuickPortalCard
          title="Clearance"
          description={
            overallClearance
              ? 'All available clearance areas are currently clear.'
              : 'Some clearance areas require attention.'
          }
          button="View Clearance"
          onClick={() => setTab('clearance')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-bold text-slate-900">
              Academic Information
            </h3>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <InfoItem
              label="Student ID"
              value={student.studentId || student.id || '-'}
            />

            <InfoItem
              label="Status"
              value={student.status || 'Registered'}
            />

            <InfoItem
              label="Faculty"
              value={student.faculty || '-'}
            />

            <InfoItem
              label="Department"
              value={student.department || '-'}
            />

            <InfoItem
              label="Programme"
              value={student.programme || '-'}
            />

            <InfoItem
              label="Year Level"
              value={student.yearLevel || '-'}
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-bold text-slate-900">
              Clearance Status
            </h3>
          </div>

          <div className="space-y-3 p-5">
            <ClearanceMini
              label="Academic Clearance"
              cleared={clearance.academic}
            />

            <ClearanceMini
              label="Financial Clearance"
              cleared={clearance.financial}
            />

            <ClearanceMini
              label="Library Clearance"
              cleared={clearance.library}
            />

            <ClearanceMini
              label="Accommodation Clearance"
              cleared={clearance.accommodation}
            />

            <ClearanceMini
              label="Cafeteria Clearance"
              cleared={clearance.cafeteria}
            />
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <RecentPanel
          title="Recent Payments"
          empty="No payment records."
        >
          {recentPayments.map((payment, index) => (
            <div
              key={String(payment.id ?? index)}
              className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"
            >
              <div>
                <p className="text-sm font-semibold">
                  {payment.receiptNumber ||
                    payment.reference ||
                    'Payment'}
                </p>

                <p className="text-xs text-slate-500">
                  {formatDate(
                    payment.date ||
                      payment.paymentDate,
                  )}
                </p>
              </div>

              <span className="font-bold text-emerald-700">
                {money(Number(payment.amount || 0))}
              </span>
            </div>
          ))}
        </RecentPanel>

        <RecentPanel
          title="Library Activity"
          empty="No library records."
        >
          {recentLoans.map((loan, index) => (
            <div
              key={String(loan.id ?? index)}
              className="border-b border-slate-100 py-3 last:border-0"
            >
              <p className="text-sm font-semibold">
                {loan.bookTitle || 'Library Item'}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {loan.status || 'Issued'} · Due{' '}
                {formatDate(loan.dueDate)}
              </p>
            </div>
          ))}
        </RecentPanel>

        <RecentPanel
          title="Cafeteria Activity"
          empty="No meal records."
        >
          {recentMeals.map((meal, index) => (
            <div
              key={String(meal.id ?? index)}
              className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"
            >
              <div>
                <p className="text-sm font-semibold">
                  {meal.mealType || 'Meal'}
                </p>

                <p className="text-xs text-slate-500">
                  {formatDate(meal.date)}
                </p>
              </div>

              <span className="text-xs font-semibold text-emerald-700">
                {meal.status || '-'}
              </span>
            </div>
          ))}
        </RecentPanel>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm text-slate-600">
          LMS submissions recorded:{' '}
          <strong>{submissions.length}</strong>
        </p>
      </div>
    </div>
  )
}

function ProfileView({
  student,
}: {
  student: Student
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">
          My Profile
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Central student information currently stored in Nexus SIS.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ProfileSection title="Personal Information">
          <InfoItem
            label="Full Name"
            value={student.name}
          />

          <InfoItem
            label="Gender"
            value={student.gender || '-'}
          />

          <InfoItem
            label="Date of Birth"
            value={formatDate(student.dateOfBirth)}
          />

          <InfoItem
            label="Province"
            value={student.province || '-'}
          />
        </ProfileSection>

        <ProfileSection title="Contact Information">
          <InfoItem
            label="Email"
            value={student.email || '-'}
          />

          <InfoItem
            label="Phone"
            value={student.phone || '-'}
          />

          <InfoItem
            label="Address"
            value={student.address || '-'}
          />

          <InfoItem
            label="Sponsor"
            value={student.sponsor || '-'}
          />
        </ProfileSection>

        <ProfileSection title="Academic Placement">
          <InfoItem
            label="Student ID"
            value={student.studentId || student.id || '-'}
          />

          <InfoItem
            label="Faculty"
            value={student.faculty || '-'}
          />

          <InfoItem
            label="Department"
            value={student.department || '-'}
          />

          <InfoItem
            label="Programme"
            value={student.programme || '-'}
          />
        </ProfileSection>

        <ProfileSection title="Current Academic Session">
          <InfoItem
            label="Year Level"
            value={student.yearLevel || '-'}
          />

          <InfoItem
            label="Semester"
            value={student.semester || '-'}
          />

          <InfoItem
            label="Academic Year"
            value={String(student.academicYear || '-')}
          />

          <InfoItem
            label="Registration Status"
            value={student.status || 'Registered'}
          />
        </ProfileSection>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Profile editing is intentionally not enabled in this prototype.
        Final profile changes should be controlled through the appropriate
        Registrar, Student Affairs or ICT workflow.
      </div>
    </div>
  )
}

function CoursesView({
  courses,
  onExport,
}: {
  courses: Course[]
  onExport: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Academic Courses
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Courses associated with your programme and academic level.
          </p>
        </div>

        <button
          onClick={onExport}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          Export Summary
        </button>
      </div>

      {courses.length === 0 ? (
        <EmptyState message="No course records are currently available." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-5 py-3">Course</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Credits</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Semester</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {courses.map((course, index) => (
                <tr
                  key={String(course.id ?? course.code ?? index)}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4 font-mono text-xs font-bold text-blue-700">
                    {course.code || '-'}
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-semibold">
                      {course.title || '-'}
                    </p>

                    {course.description && (
                      <p className="mt-1 max-w-md text-xs text-slate-500">
                        {course.description}
                      </p>
                    )}
                  </td>

                  <td className="px-5 py-4 text-slate-600">
                    {course.department || '-'}
                  </td>

                  <td className="px-5 py-4 font-semibold">
                    {course.creditHours || 0}
                  </td>

                  <td className="px-5 py-4">
                    {course.courseType || '-'}
                  </td>

                  <td className="px-5 py-4">
                    {course.semester || '-'}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge
                      status={course.status || 'Active'}
                      active={
                        course.status !== 'Inactive'
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function FinanceView({
  records,
  payments,
  totalFees,
  totalPaid,
  balance,
  onExport,
}: {
  records: FinanceRecord[]
  payments: Payment[]
  totalFees: number
  totalPaid: number
  balance: number
  onExport: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Student Finance
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Fees, payments and current financial balance.
          </p>
        </div>

        <button
          onClick={onExport}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          Download Statement
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <FinanceStat
          label="Total Fees"
          value={money(totalFees)}
        />

        <FinanceStat
          label="Total Paid"
          value={money(totalPaid)}
        />

        <FinanceStat
          label="Current Balance"
          value={money(balance)}
          warning={balance > 0}
        />
      </div>

      <section>
        <h3 className="mb-3 font-bold">
          Fee Records
        </h3>

        {records.length === 0 ? (
          <EmptyState message="No fee assessment records are currently available." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Year</th>
                  <th className="px-5 py-3">Semester</th>
                  <th className="px-5 py-3">Fees</th>
                  <th className="px-5 py-3">Scholarship</th>
                  <th className="px-5 py-3">Sponsorship</th>
                  <th className="px-5 py-3">Paid</th>
                  <th className="px-5 py-3">Balance</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {records.map((record, index) => (
                  <tr key={String(record.id ?? index)}>
                    <td className="px-5 py-4">
                      {record.academicYear || '-'}
                    </td>

                    <td className="px-5 py-4">
                      {record.semester || '-'}
                    </td>

                    <td className="px-5 py-4 font-semibold">
                      {money(
                        Number(
                          record.totalFees ??
                            Number(record.tuitionFee || 0) +
                              Number(record.otherFees || 0),
                        ),
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {money(
                        Number(record.scholarship || 0),
                      )}
                    </td>

                    <td className="px-5 py-4">
                      {money(
                        Number(record.sponsorship || 0),
                      )}
                    </td>

                    <td className="px-5 py-4 text-emerald-700">
                      {money(
                        Number(record.amountPaid || 0),
                      )}
                    </td>

                    <td className="px-5 py-4 font-bold">
                      {money(
                        Number(record.balance || 0),
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={record.status || 'Pending'}
                        active={
                          String(record.status)
                            .toLowerCase() === 'paid'
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-3 font-bold">
          Payment History
        </h3>

        {payments.length === 0 ? (
          <EmptyState message="No payment records are currently available." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Receipt</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Status</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {payments.map((payment, index) => (
                  <tr key={String(payment.id ?? index)}>
                    <td className="px-5 py-4">
                      {formatDate(
                        payment.date ||
                          payment.paymentDate,
                      )}
                    </td>

                    <td className="px-5 py-4 font-mono text-xs">
                      {payment.receiptNumber || '-'}
                    </td>

                    <td className="px-5 py-4">
                      {payment.method || '-'}
                    </td>

                    <td className="px-5 py-4">
                      {payment.reference || '-'}
                    </td>

                    <td className="px-5 py-4 font-bold text-emerald-700">
                      {money(
                        Number(payment.amount || 0),
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={payment.status || 'Paid'}
                        active
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function LmsView({
  courses,
  materials,
  assignments,
  submissions,
}: {
  courses: LmsCourse[]
  materials: LmsMaterial[]
  assignments: LmsAssignment[]
  submissions: LmsSubmission[]
}) {
  function courseMaterials(courseId?: string) {
    return materials.filter(
      (material) =>
        String(material.courseId) === String(courseId),
    )
  }

  function courseAssignments(courseId?: string) {
    return assignments.filter(
      (assignment) =>
        String(assignment.courseId) ===
        String(courseId),
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">
          Learning Management System
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Course materials, assignments and submission status.
        </p>
      </div>

      {courses.length === 0 ? (
        <EmptyState message="No LMS courses are currently available." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {courses.map((course, index) => {
            const courseId =
              course.courseId ||
              course.id ||
              ''

            const courseMaterialsList =
              courseMaterials(courseId)

            const courseAssignmentsList =
              courseAssignments(courseId)

            return (
              <div
                key={String(course.id ?? course.courseId ?? index)}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-blue-700">
                      {course.courseCode || courseId}
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      {course.courseTitle || 'LMS Course'}
                    </h3>
                  </div>

                  <StatusBadge
                    status={course.status || 'Active'}
                    active
                  />
                </div>

                <p className="mt-2 text-sm text-slate-500">
                  Lecturer:{' '}
                  <span className="font-medium text-slate-700">
                    {course.lecturerName || 'Not assigned'}
                  </span>
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Materials
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {courseMaterialsList.length}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">
                      Assignments
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {courseAssignmentsList.length}
                    </p>
                  </div>
                </div>

                {courseMaterialsList.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-bold">
                      Recent Materials
                    </p>

                    <div className="space-y-2">
                      {courseMaterialsList
                        .slice(0, 4)
                        .map((material, materialIndex) => (
                          <div
                            key={String(
                              material.id ??
                                materialIndex,
                            )}
                            className="rounded-lg border border-slate-100 p-3"
                          >
                            <p className="text-sm font-semibold">
                              {material.title ||
                                'Course Material'}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {material.type || 'Material'}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {courseAssignmentsList.length > 0 && (
                  <div className="mt-5">
                    <p className="mb-2 text-sm font-bold">
                      Assignments
                    </p>

                    <div className="space-y-2">
                      {courseAssignmentsList
                        .slice(0, 4)
                        .map((assignment, assignmentIndex) => {
                          const submission =
                            submissions.find(
                              (item) =>
                                String(
                                  item.assignmentId,
                                ) ===
                                String(
                                  assignment.id,
                                ),
                            )

                          return (
                            <div
                              key={String(
                                assignment.id ??
                                  assignmentIndex,
                              )}
                              className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                            >
                              <div>
                                <p className="text-sm font-semibold">
                                  {assignment.title ||
                                    'Assignment'}
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                  Due:{' '}
                                  {formatDate(
                                    assignment.dueDate,
                                  )}
                                </p>
                              </div>

                              <span className="text-xs font-semibold">
                                {submission
                                  ? submission.grade ||
                                    `${submission.marks ?? 0} marks`
                                  : 'Not submitted'}
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function LibraryView({
  loans,
  onExport,
}: {
  loans: LibraryLoan[]
  onExport: () => void
}) {
  const outstandingFines = loans.reduce(
    (sum, loan) => sum + Number(loan.fine || 0),
    0,
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Library
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Current and historical library loans.
          </p>
        </div>

        <button
          onClick={onExport}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          Export History
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <PortalMiniStat
          label="Loans"
          value={loans.length}
        />

        <PortalMiniStat
          label="Outstanding"
          value={
            loans.filter(
              (loan) =>
                loan.status !== 'Returned' &&
                loan.status !== 'Closed',
            ).length
          }
        />

        <PortalMiniStat
          label="Fines"
          value={money(outstandingFines)}
        />
      </div>

      {loans.length === 0 ? (
        <EmptyState message="No library loan records are currently available." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Book</th>
                <th className="px-5 py-3">Issued</th>
                <th className="px-5 py-3">Due</th>
                <th className="px-5 py-3">Returned</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Fine</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loans.map((loan, index) => (
                <tr key={String(loan.id ?? index)}>
                  <td className="px-5 py-4 font-semibold">
                    {loan.bookTitle || loan.bookId || '-'}
                  </td>

                  <td className="px-5 py-4">
                    {formatDate(loan.issueDate)}
                  </td>

                  <td className="px-5 py-4">
                    {formatDate(loan.dueDate)}
                  </td>

                  <td className="px-5 py-4">
                    {formatDate(loan.returnDate)}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge
                      status={loan.status || 'Issued'}
                      active={
                        loan.status === 'Returned' ||
                        loan.status === 'Closed'
                      }
                    />
                  </td>

                  <td className="px-5 py-4 font-semibold">
                    {money(Number(loan.fine || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function CafeteriaView({
  meals,
  onExport,
}: {
  meals: CafeteriaMeal[]
  onExport: () => void
}) {
  const served = meals.filter(
    (meal) => meal.status === 'Served',
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Cafeteria & Mess
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Student meal attendance and history.
          </p>
        </div>

        <button
          onClick={onExport}
          className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
        >
          Export Meal History
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <PortalMiniStat
          label="Total Meals"
          value={meals.length}
        />

        <PortalMiniStat
          label="Meals Served"
          value={served.length}
        />

        <PortalMiniStat
          label="Missed / Cancelled"
          value={meals.length - served.length}
        />
      </div>

      {meals.length === 0 ? (
        <EmptyState message="No cafeteria meal records are currently available." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Meal</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Served At</th>
                <th className="px-5 py-3">Served By</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {meals.map((meal, index) => (
                <tr key={String(meal.id ?? index)}>
                  <td className="px-5 py-4">
                    {formatDate(meal.date)}
                  </td>

                  <td className="px-5 py-4 font-semibold">
                    {meal.mealType || '-'}
                  </td>

                  <td className="px-5 py-4">
                    <StatusBadge
                      status={meal.status || '-'}
                      active={meal.status === 'Served'}
                    />
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-500">
                    {formatDateTime(meal.servedAt)}
                  </td>

                  <td className="px-5 py-4">
                    {meal.servedBy || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function ClearanceView({
  clearance,
  overallClearance,
}: {
  clearance: Clearance
  overallClearance: boolean
}) {
  const items = [
    ['Academic Clearance', clearance.academic],
    ['Financial Clearance', clearance.financial],
    ['Library Clearance', clearance.library],
    ['Accommodation Clearance', clearance.accommodation],
    ['Cafeteria Clearance', clearance.cafeteria],
  ] as const

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">
          Student Clearance
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Current clearance status across major university services.
        </p>
      </div>

      <div
        className={`rounded-xl border p-5 ${
          overallClearance
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-amber-200 bg-amber-50'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">
            {overallClearance ? '✓' : '⚠'}
          </div>

          <div>
            <h3 className="font-bold">
              {overallClearance
                ? 'Clearance Complete'
                : 'Clearance Requires Attention'}
            </h3>

            <p className="mt-1 text-sm">
              {overallClearance
                ? 'All currently available clearance areas are clear.'
                : 'Review the outstanding clearance areas below.'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.map(([label, cleared]) => (
          <div
            key={label}
            className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5"
          >
            <div>
              <p className="font-semibold text-slate-900">
                {label}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                University service clearance
              </p>
            </div>

            <StatusBadge
              status={cleared ? 'Cleared' : 'Pending'}
              active={cleared}
            />
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-800">
        Graduation clearance will ultimately combine academic,
        financial, library, accommodation, department and Registrar
        approvals into the university graduation workflow.
      </div>
    </div>
  )
}

function PortalStat({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-xl">
          {icon}
        </div>
      </div>
    </div>
  )
}

function PortalMiniStat({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </div>
  )
}

function FinanceStat({
  label,
  value,
  warning,
}: {
  label: string
  value: string
  warning?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        warning
          ? 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-bold">
        {value}
      </p>
    </div>
  )
}

function QuickPortalCard({
  title,
  description,
  button,
  onClick,
}: {
  title: string
  description: string
  button: string
  onClick: () => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-bold">
        {title}
      </h3>

      <p className="mt-2 min-h-10 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <button
        onClick={onClick}
        className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm ring-1 ring-slate-200 hover:bg-blue-50"
      >
        {button}
      </button>
    </div>
  )
}

function PortalTab({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? 'bg-[#071a3d] text-white'
          : 'text-slate-600 hover:bg-white hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  )
}

function ProfileSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="border-b border-slate-100 pb-3 font-bold">
        {title}
      </h3>

      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {children}
      </div>
    </section>
  )
}

function ClearanceMini({
  label,
  cleared,
}: {
  label: string
  cleared: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-3">
      <span className="text-sm font-medium text-slate-700">
        {label}
      </span>

      <StatusBadge
        status={cleared ? 'Cleared' : 'Pending'}
        active={cleared}
      />
    </div>
  )
}

function RecentPanel({
  title,
  empty,
  children,
}: {
  title: string
  empty: string
  children: React.ReactNode
}) {
  const content = Array.isArray(children)
    ? children.filter(Boolean)
    : children

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="border-b border-slate-100 pb-3 font-bold">
        {title}
      </h3>

      <div className="mt-2">
        {content || (
          <p className="py-5 text-sm text-slate-500">
            {empty}
          </p>
        )}
      </div>
    </section>
  )
}

function StatusBadge({
  status,
  active,
}: {
  status: string
  active: boolean
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? 'bg-emerald-100 text-emerald-700'
          : 'bg-slate-100 text-slate-600'
      }`}
    >
      {status}
    </span>
  )
}

function EmptyState({
  message,
}: {
  message: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-500">
        {message}
      </p>
    </div>
  )
}
