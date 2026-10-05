'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  migrateLegacyStaff,
  removeCentralStaff,
} from '@/lib/nexus-data'
import { protectNexusPage } from '@/lib/nexus-access'

type LecturerStatus = 'Active' | 'Inactive'

type Lecturer = {
  id: string
  staffId: string
  name: string
  email: string
  phone: string
  faculty: string
  department: string
  title: string
  specialization: string
  employmentType: 'Permanent' | 'Contract' | 'Part-Time'
  courses: string[]
  status: LecturerStatus
  joinedDate: string
}

type Course = {
  id: string
  code: string
  title: string
  department: string
  faculty: string
  programme: string
  yearLevel: string
  semester: string
  creditHours: number
  courseType: 'Core' | 'Elective' | 'General'
  status: 'Active' | 'Inactive'
}

type Programme = {
  id: string
  name: string
  code: string
}

type Department = {
  id: string
  name: string
  programmes: Programme[]
}

type Faculty = {
  id: string
  name: string
  departments: Department[]
}

type AcademicStructure = {
  faculties: Faculty[]
}

const LECTURER_KEY = 'nexusSIS_lecturers'
const COURSES_KEY = 'nexusSIS_courses'
const STRUCTURE_KEY = 'nexusSIS_academic_structure'

const defaultLecturers: Lecturer[] = [
  {
    id: 'LEC-001',
    staffId: 'STAFF-0001',
    name: 'Dr. John Wama',
    email: 'john.wama@nexus.edu',
    phone: '+675 7000 1001',
    faculty: 'Faculty of Science and Technology',
    department: 'Computer Science',
    title: 'Senior Lecturer',
    specialization: 'Software Engineering',
    employmentType: 'Permanent',
    courses: ['CSC101'],
    status: 'Active',
    joinedDate: '2024-02-01',
  },
  {
    id: 'LEC-002',
    staffId: 'STAFF-0002',
    name: 'Ms. Mary Kila',
    email: 'mary.kila@nexus.edu',
    phone: '+675 7000 1002',
    faculty: 'Faculty of Science and Technology',
    department: 'Mathematics',
    title: 'Lecturer',
    specialization: 'Applied Mathematics',
    employmentType: 'Permanent',
    courses: ['MAT101'],
    status: 'Active',
    joinedDate: '2025-01-15',
  },
]

const emptyForm = {
  staffId: '',
  name: '',
  email: '',
  phone: '',
  faculty: '',
  department: '',
  title: 'Lecturer',
  specialization: '',
  employmentType: 'Permanent' as Lecturer['employmentType'],
  courses: [] as string[],
  status: 'Active' as LecturerStatus,
  joinedDate: new Date().toISOString().slice(0, 10),
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export default function LecturerManagementPage() {
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [structure, setStructure] = useState<AcademicStructure>({ faculties: [] })

  const [search, setSearch] = useState('')
  const [facultyFilter, setFacultyFilter] = useState('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')

  const [showModal, setShowModal] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [editingLecturer, setEditingLecturer] = useState<Lecturer | null>(null)
  const [selectedLecturer, setSelectedLecturer] = useState<Lecturer | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')

  useEffect(() => {
    protectNexusPage([
      "Registrar",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    const savedLecturers = safeParse<Lecturer[]>(
      localStorage.getItem(LECTURER_KEY),
      defaultLecturers
    )

    const savedCourses = safeParse<Course[]>(
      localStorage.getItem(COURSES_KEY),
      []
    )

    const savedStructure = safeParse<AcademicStructure>(
      localStorage.getItem(STRUCTURE_KEY),
      { faculties: [] }
    )

    setLecturers(savedLecturers)
    setCourses(savedCourses)
    setStructure(savedStructure)
  }, [])

  function saveLecturers(next: Lecturer[]) {
    setLecturers(next)
    localStorage.setItem(LECTURER_KEY, JSON.stringify(next))

    // Synchronize central staff while retaining
    // the legacy lecturer store for compatibility.
    migrateLegacyStaff()
  }

  const facultyOptions = useMemo(() => {
    const names = [
      ...structure.faculties.map((faculty) => faculty.name),
      ...lecturers.map((lecturer) => lecturer.faculty),
      ...courses.map((course) => course.faculty),
    ]

    return ['All', ...Array.from(new Set(names.filter(Boolean)))]
  }, [structure, lecturers, courses])

  const departmentOptions = useMemo(() => {
    const names = [
      ...structure.faculties.flatMap((faculty) =>
        faculty.departments.map((department) => department.name)
      ),
      ...lecturers
        .filter(
          (lecturer) =>
            facultyFilter === 'All' || lecturer.faculty === facultyFilter
        )
        .map((lecturer) => lecturer.department),
      ...courses
        .filter(
          (course) =>
            facultyFilter === 'All' || course.faculty === facultyFilter
        )
        .map((course) => course.department),
    ]

    return ['All', ...Array.from(new Set(names.filter(Boolean)))]
  }, [structure, lecturers, courses, facultyFilter])

  const selectedFaculty = structure.faculties.find(
    (faculty) => faculty.name === form.faculty
  )

  const formDepartments = selectedFaculty?.departments ?? []

  const availableCourses = courses.filter((course) => {
    if (course.status !== 'Active') return false
    if (form.faculty && course.faculty !== form.faculty) return false
    if (form.department && course.department !== form.department) return false
    return true
  })

  const filteredLecturers = lecturers.filter((lecturer) => {
    const query = search.trim().toLowerCase()

    const matchesSearch =
      !query ||
      lecturer.name.toLowerCase().includes(query) ||
      lecturer.staffId.toLowerCase().includes(query) ||
      lecturer.email.toLowerCase().includes(query) ||
      lecturer.department.toLowerCase().includes(query) ||
      lecturer.specialization.toLowerCase().includes(query)

    const matchesFaculty =
      facultyFilter === 'All' || lecturer.faculty === facultyFilter

    const matchesDepartment =
      departmentFilter === 'All' || lecturer.department === departmentFilter

    const matchesStatus =
      statusFilter === 'All' || lecturer.status === statusFilter

    return (
      matchesSearch &&
      matchesFaculty &&
      matchesDepartment &&
      matchesStatus
    )
  })

  const activeCount = lecturers.filter(
    (lecturer) => lecturer.status === 'Active'
  ).length

  const assignedCourseCount = new Set(
    lecturers.flatMap((lecturer) => lecturer.courses)
  ).size

  function openAddModal() {
    setEditingLecturer(null)

    const nextStaffNumber =
      lecturers.reduce((highest, lecturer) => {
        const number = Number(lecturer.staffId.replace(/\D/g, ''))
        return Number.isFinite(number) ? Math.max(highest, number) : highest
      }, 0) + 1

    setForm({
      ...emptyForm,
      staffId: `STAFF-${String(nextStaffNumber).padStart(4, '0')}`,
    })

    setMessage('')
    setShowModal(true)
  }

  function openEditModal(lecturer: Lecturer) {
    setEditingLecturer(lecturer)
    setForm({
      staffId: lecturer.staffId,
      name: lecturer.name,
      email: lecturer.email,
      phone: lecturer.phone,
      faculty: lecturer.faculty,
      department: lecturer.department,
      title: lecturer.title,
      specialization: lecturer.specialization,
      employmentType: lecturer.employmentType,
      courses: lecturer.courses,
      status: lecturer.status,
      joinedDate: lecturer.joinedDate,
    })
    setMessage('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingLecturer(null)
    setMessage('')
  }

  function toggleCourse(courseCode: string) {
    setForm((current) => ({
      ...current,
      courses: current.courses.includes(courseCode)
        ? current.courses.filter((code) => code !== courseCode)
        : [...current.courses, courseCode],
    }))
  }

  function saveLecturer() {
    const name = form.name.trim()
    const email = form.email.trim()
    const phone = form.phone.trim()
    const specialization = form.specialization.trim()

    if (!form.staffId.trim() || !name || !email || !form.faculty || !form.department) {
      setMessage('Please complete Staff ID, name, email, faculty and department.')
      return
    }

    if (!email.includes('@')) {
      setMessage('Please enter a valid email address.')
      return
    }

    if (editingLecturer) {
      const nextLecturers: Lecturer[] = lecturers.map((lecturer) =>
        lecturer.id === editingLecturer.id
          ? {
              ...lecturer,
              staffId: form.staffId.trim(),
              name,
              email,
              phone,
              faculty: form.faculty,
              department: form.department,
              title: form.title.trim() || 'Lecturer',
              specialization,
              employmentType: form.employmentType,
              courses: form.courses,
              status: form.status,
              joinedDate: form.joinedDate,
            }
          : lecturer
      )

      saveLecturers(nextLecturers)
    } else {
      const nextNumber =
        lecturers.reduce((highest, lecturer) => {
          const number = Number(lecturer.id.replace(/\D/g, ''))
          return Number.isFinite(number) ? Math.max(highest, number) : highest
        }, 0) + 1

      const newLecturer: Lecturer = {
        id: `LEC-${String(nextNumber).padStart(3, '0')}`,
        staffId: form.staffId.trim(),
        name,
        email,
        phone,
        faculty: form.faculty,
        department: form.department,
        title: form.title.trim() || 'Lecturer',
        specialization,
        employmentType: form.employmentType,
        courses: form.courses,
        status: form.status,
        joinedDate: form.joinedDate,
      }

      saveLecturers([...lecturers, newLecturer])
    }

    closeModal()
  }

  function toggleStatus(lecturer: Lecturer) {
    const nextStatus: LecturerStatus =
      lecturer.status === 'Active' ? 'Inactive' : 'Active'

    const nextLecturers: Lecturer[] = lecturers.map((item) =>
      item.id === lecturer.id
        ? { ...item, status: nextStatus }
        : item
    )

    saveLecturers(nextLecturers)
  }

  function removeLecturer(lecturer: Lecturer) {
    const confirmed = window.confirm(
      `Remove ${lecturer.name} from the lecturer directory?`
    )

    if (!confirmed) return

    saveLecturers(
      lecturers.filter((item) => item.id !== lecturer.id)
    )

    removeCentralStaff(lecturer.staffId)

    setSelectedLecturer(null)
    setShowDetails(false)
  }

  function exportCSV() {
    const headers = [
      'Staff ID',
      'Name',
      'Email',
      'Phone',
      'Faculty',
      'Department',
      'Title',
      'Specialization',
      'Employment Type',
      'Courses',
      'Status',
      'Joined Date',
    ]

    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`

    const rows = filteredLecturers.map((lecturer) => [
      lecturer.staffId,
      lecturer.name,
      lecturer.email,
      lecturer.phone,
      lecturer.faculty,
      lecturer.department,
      lecturer.title,
      lecturer.specialization,
      lecturer.employmentType,
      lecturer.courses.join('; '),
      lecturer.status,
      lecturer.joinedDate,
    ])

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'nexusSIS_lecturers.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  function signOut() {
    localStorage.removeItem('nexussis_session')
    localStorage.removeItem('nexus_role')
    localStorage.removeItem('nexus_username')
    localStorage.removeItem('userSession')
    window.location.href = '/dashboard'
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-[#071a3d] px-6 py-5 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Lecturer & Faculty Management</h1>
            <p className="mt-1 text-sm text-blue-200">
              Manage academic staff, departments and course assignments
            </p>
          </div>

          <button
            onClick={signOut}
            className="rounded-lg border border-blue-300/30 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            Sign Out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total Lecturers</p>
            <p className="mt-2 text-3xl font-bold">{lecturers.length}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Active Lecturers</p>
            <p className="mt-2 text-3xl font-bold text-green-600">{activeCount}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Departments</p>
            <p className="mt-2 text-3xl font-bold">
              {departmentOptions.length - 1}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Courses Assigned</p>
            <p className="mt-2 text-3xl font-bold">{assignedCourseCount}</p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">Lecturer Directory</h2>
              <p className="text-sm text-slate-500">
                Central academic staff directory for the university.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportCSV}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Export CSV
              </button>

              <button
                onClick={openAddModal}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Add Lecturer
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, staff ID, email..."
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={facultyFilter}
              onChange={(event) => {
                setFacultyFilter(event.target.value)
                setDepartmentFilter('All')
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {facultyOptions.map((faculty) => (
                <option key={faculty}>{faculty}</option>
              ))}
            </select>

            <select
              value={departmentFilter}
              onChange={(event) => setDepartmentFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {departmentOptions.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Staff ID</th>
                  <th className="px-4 py-3">Lecturer</th>
                  <th className="px-4 py-3">Faculty / Department</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Courses</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredLecturers.map((lecturer) => (
                  <tr key={lecturer.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium">
                      {lecturer.staffId}
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-semibold">{lecturer.name}</div>
                      <div className="text-xs text-slate-500">
                        {lecturer.email}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div>{lecturer.faculty}</div>
                      <div className="text-xs text-slate-500">
                        {lecturer.department}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div>{lecturer.title}</div>
                      <div className="text-xs text-slate-500">
                        {lecturer.specialization || '—'}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {lecturer.courses.length > 0
                        ? lecturer.courses.join(', ')
                        : 'None'}
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          lecturer.status === 'Active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {lecturer.status}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedLecturer(lecturer)
                            setShowDetails(true)
                          }}
                          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
                        >
                          View
                        </button>

                        <button
                          onClick={() => openEditModal(lecturer)}
                          className="rounded-md border border-blue-300 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => toggleStatus(lecturer)}
                          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
                        >
                          {lecturer.status === 'Active'
                            ? 'Deactivate'
                            : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredLecturers.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No lecturers match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/admin/courses"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Course Management
          </a>

          <a
            href="/admin/registrar"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Registrar
          </a>

          <a
            href="/admin/registration"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Student Registration
          </a>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">
                  {editingLecturer ? 'Edit Lecturer' : 'Add Lecturer'}
                </h2>
                <p className="text-sm text-slate-500">
                  Maintain the central academic staff record.
                </p>
              </div>

              <button
                onClick={closeModal}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Staff ID
                </label>
                <input
                  value={form.staffId}
                  onChange={(event) =>
                    setForm({ ...form, staffId: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Full Name
                </label>
                <input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Phone
                </label>
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm({ ...form, phone: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Faculty
                </label>
                <select
                  value={form.faculty}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      faculty: event.target.value,
                      department: '',
                      courses: [],
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Select Faculty</option>
                  {structure.faculties.map((faculty) => (
                    <option key={faculty.id} value={faculty.name}>
                      {faculty.name}
                    </option>
                  ))}

                  {lecturers
                    .map((lecturer) => lecturer.faculty)
                    .filter(
                      (faculty, index, array) =>
                        faculty && array.indexOf(faculty) === index
                    )
                    .filter(
                      (faculty) =>
                        !structure.faculties.some(
                          (item) => item.name === faculty
                        )
                    )
                    .map((faculty) => (
                      <option key={faculty} value={faculty}>
                        {faculty}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Department
                </label>
                <select
                  value={form.department}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      department: event.target.value,
                      courses: [],
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">Select Department</option>

                  {formDepartments.map((department) => (
                    <option key={department.id} value={department.name}>
                      {department.name}
                    </option>
                  ))}

                  {lecturers
                    .filter((lecturer) => lecturer.faculty === form.faculty)
                    .map((lecturer) => lecturer.department)
                    .filter(
                      (department, index, array) =>
                        department && array.indexOf(department) === index
                    )
                    .filter(
                      (department) =>
                        !formDepartments.some(
                          (item) => item.name === department
                        )
                    )
                    .map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Academic Title
                </label>
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                  placeholder="Lecturer / Senior Lecturer / Professor"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Specialization
                </label>
                <input
                  value={form.specialization}
                  onChange={(event) =>
                    setForm({ ...form, specialization: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Employment Type
                </label>
                <select
                  value={form.employmentType}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      employmentType:
                        event.target.value as Lecturer['employmentType'],
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Permanent">Permanent</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-Time">Part-Time</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Joined Date
                </label>
                <input
                  type="date"
                  value={form.joinedDate}
                  onChange={(event) =>
                    setForm({ ...form, joinedDate: event.target.value })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as LecturerStatus,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium">
                  Course Assignments
                </label>

                <div className="grid max-h-48 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 md:grid-cols-2">
                  {availableCourses.length > 0 ? (
                    availableCourses.map((course) => (
                      <label
                        key={course.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={form.courses.includes(course.code)}
                          onChange={() => toggleCourse(course.code)}
                          className="mt-1"
                        />

                        <span>
                          <span className="block font-semibold">
                            {course.code} — {course.title}
                          </span>
                          <span className="text-xs text-slate-500">
                            {course.department} · {course.programme}
                          </span>
                        </span>
                      </label>
                    ))
                  ) : (
                    <p className="col-span-full p-4 text-sm text-slate-500">
                      No active courses match the selected faculty and
                      department. You can still save the lecturer and assign
                      courses later.
                    </p>
                  )}
                </div>
              </div>

              {message && (
                <div className="md:col-span-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {message}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium"
              >
                Cancel
              </button>

              <button
                onClick={saveLecturer}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {editingLecturer ? 'Save Changes' : 'Create Lecturer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetails && selectedLecturer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">
                  {selectedLecturer.name}
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedLecturer.staffId}
                </p>
              </div>

              <button
                onClick={() => setShowDetails(false)}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-400">Email</p>
                <p className="mt-1 font-medium">{selectedLecturer.email}</p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400">Phone</p>
                <p className="mt-1 font-medium">
                  {selectedLecturer.phone || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400">Faculty</p>
                <p className="mt-1 font-medium">
                  {selectedLecturer.faculty}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400">Department</p>
                <p className="mt-1 font-medium">
                  {selectedLecturer.department}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400">Title</p>
                <p className="mt-1 font-medium">{selectedLecturer.title}</p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400">
                  Employment
                </p>
                <p className="mt-1 font-medium">
                  {selectedLecturer.employmentType}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400">
                  Specialization
                </p>
                <p className="mt-1 font-medium">
                  {selectedLecturer.specialization || '—'}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400">
                  Joined
                </p>
                <p className="mt-1 font-medium">
                  {selectedLecturer.joinedDate}
                </p>
              </div>

              <div className="md:col-span-2">
                <p className="text-xs uppercase text-slate-400">
                  Assigned Courses
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedLecturer.courses.length > 0 ? (
                    selectedLecturer.courses.map((course) => (
                      <span
                        key={course}
                        className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700"
                      >
                        {course}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">
                      No courses assigned.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => removeLecturer(selectedLecturer)}
                className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
              >
                Remove Lecturer
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowDetails(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    setShowDetails(false)
                    openEditModal(selectedLecturer)
                  }}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Edit Lecturer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
