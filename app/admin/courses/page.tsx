'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { protectNexusPage } from "@/lib/nexus-access"
import {
  NEXUS_KEYS,
  type Course as CentralCourse,
  type Department as CentralDepartment,
  type Faculty as CentralFaculty,
  type Programme as CentralProgramme,
  type Semester,
} from "@/lib/nexus-data"

type Course = {
  id: string
  code: string
  title: string
  description: string
  department: string
  faculty: string
  programme: string
  yearLevel: string
  semester: string
  creditHours: string
  courseType: 'Core' | 'Elective' | 'General'
  status: 'Active' | 'Inactive'
  prerequisite: string
}

type AcademicStructure = {
  id: string
  name: string
  code: string
  dean?: string
  departments: {
    id: string
    name: string
    code: string
    head?: string
    programmes: string[]
  }[]
}

const COURSE_STORAGE_KEY = 'nexusSIS_courses'
const ACADEMIC_STORAGE_KEY = 'nexusSIS_academic_structure'


function readCentralCourses(): CentralCourse[] {
  try {
    const raw = localStorage.getItem(NEXUS_KEYS.courses)

    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) return []

    return parsed as CentralCourse[]
  } catch {
    return []
  }
}

function saveCentralCourses(courses: CentralCourse[]) {
  localStorage.setItem(
    NEXUS_KEYS.courses,
    JSON.stringify(courses)
  )

  window.dispatchEvent(
    new CustomEvent("nexusSIS_courses_updated")
  )
}

function readCentralFaculties(): CentralFaculty[] {
  try {
    const raw = localStorage.getItem(NEXUS_KEYS.faculties)

    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)

    return Array.isArray(parsed)
      ? (parsed as CentralFaculty[])
      : []
  } catch {
    return []
  }
}

function readCentralDepartments(): CentralDepartment[] {
  try {
    const raw = localStorage.getItem(NEXUS_KEYS.departments)

    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)

    return Array.isArray(parsed)
      ? (parsed as CentralDepartment[])
      : []
  } catch {
    return []
  }
}

function readCentralProgrammes(): CentralProgramme[] {
  try {
    const raw = localStorage.getItem(NEXUS_KEYS.programmes)

    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)

    return Array.isArray(parsed)
      ? (parsed as CentralProgramme[])
      : []
  } catch {
    return []
  }
}

function makeAcademicReference(
  prefix: string,
  value: string
) {
  return `${prefix}-${value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`
}

function getCentralSemester(value: string): Semester {
  if (value === "Semester 2") return "Semester 2"
  if (value === "Summer") return "Summer"
  return "Semester 1"
}

function getYearLevelNumber(value: string) {
  const match = value.match(/\d+/)

  if (!match) return 1

  const parsed = Number(match[0])

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : 1
}

function centralCourseToUiCourse(
  course: CentralCourse,
  faculties: CentralFaculty[],
  departments: CentralDepartment[],
  programmes: CentralProgramme[]
): Course {
  const faculty =
    faculties.find((item) => item.id === course.facultyId) ||
    faculties.find(
      (item) =>
        item.name.toLowerCase() ===
        String(course.facultyId).toLowerCase()
    )

  const department =
    departments.find((item) => item.id === course.departmentId) ||
    departments.find(
      (item) =>
        item.name.toLowerCase() ===
        String(course.departmentId).toLowerCase()
    )

  const programme = course.programmeId
    ? programmes.find(
        (item) => item.id === course.programmeId
      )
    : undefined

  return {
    id: course.id,
    code: course.code,
    title: course.title,
    description: course.description || "",
    department:
      department?.name || course.departmentId || "",
    faculty:
      faculty?.name || course.facultyId || "",
    programme:
      programme?.name || "",
    yearLevel: `Year ${course.yearLevel || 1}`,
    semester: course.semester,
    creditHours: String(course.creditHours ?? 0),
    courseType: course.courseType,
    status:
      course.status === "Active"
        ? "Active"
        : "Inactive",
    prerequisite: course.prerequisite || "",
  }
}

function academicStructureFromCentralRecords(
  faculties: CentralFaculty[],
  departments: CentralDepartment[],
  programmes: CentralProgramme[]
): AcademicStructure[] {
  return faculties.map((faculty) => ({
    id: faculty.id,
    name: faculty.name,
    code: faculty.code,
    dean: faculty.dean,
    departments: departments
      .filter(
        (department) =>
          department.facultyId === faculty.id
      )
      .map((department) => ({
        id: department.id,
        name: department.name,
        code: department.code,
        head: department.headOfDepartment,
        programmes: programmes
          .filter(
            (programme) =>
              programme.departmentId === department.id
          )
          .map((programme) => programme.name),
      })),
  }))
}

function courseToCentralCourse(
  course: Course,
  existing?: CentralCourse
): CentralCourse {
  const faculties = readCentralFaculties()
  const departments = readCentralDepartments()
  const programmes = readCentralProgrammes()

  const faculty =
    faculties.find(
      (item) =>
        item.name.toLowerCase() ===
        course.faculty.trim().toLowerCase()
    )

  const department =
    departments.find(
      (item) =>
        item.name.toLowerCase() ===
        course.department.trim().toLowerCase()
    )

  const programme =
    programmes.find(
      (item) =>
        item.name.toLowerCase() ===
        course.programme.trim().toLowerCase()
    )

  const facultyId =
    faculty?.id ||
    existing?.facultyId ||
    makeAcademicReference("FAC", course.faculty)

  const departmentId =
    department?.id ||
    existing?.departmentId ||
    makeAcademicReference("DEPT", course.department)

  const programmeId =
    programme?.id ||
    existing?.programmeId ||
    makeAcademicReference("PROG", course.programme)

  const now = new Date().toISOString()

  return {
    id: course.id,
    code: course.code,
    title: course.title,
    description: course.description || "",
    facultyId,
    departmentId,
    programmeId,
    creditHours:
      Number(course.creditHours) || 0,
    yearLevel:
      getYearLevelNumber(course.yearLevel),
    semester:
      getCentralSemester(course.semester),
    courseType: course.courseType,
    prerequisite:
      course.prerequisite || "",
    status:
      course.status === "Active"
        ? "Active"
        : "Inactive",
    ...(existing || {}),
  }
}

function migrateLegacyCourses(
  legacyCourses: Course[]
): CentralCourse[] {
  const existingCentral = readCentralCourses()

  return legacyCourses.map((course) => {
    const existing = existingCentral.find(
      (item) =>
        item.id === course.id ||
        item.code.toLowerCase() ===
          course.code.toLowerCase()
    )

    return courseToCentralCourse(
      course,
      existing
    )
  })
}

function readCoursesForUi(): Course[] {
  const centralCourses = readCentralCourses()

  const faculties = readCentralFaculties()
  const departments = readCentralDepartments()
  const programmes = readCentralProgrammes()

  if (centralCourses.length > 0) {
    return centralCourses.map((course) =>
      centralCourseToUiCourse(
        course,
        faculties,
        departments,
        programmes
      )
    )
  }

  const raw = localStorage.getItem(
    COURSE_STORAGE_KEY
  )

  if (!raw) {
    return defaultCourses
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return defaultCourses
    }

    const legacyCourses = parsed as Course[]
    const migrated =
      migrateLegacyCourses(legacyCourses)

    saveCentralCourses(migrated)

    return migrated.map((course) =>
      centralCourseToUiCourse(
        course,
        faculties,
        departments,
        programmes
      )
    )
  } catch {
    return defaultCourses
  }
}

function saveCoursesToCentral(
  nextCourses: Course[]
) {
  const existingCentral =
    readCentralCourses()

  const nextCentral = nextCourses.map(
    (course) => {
      const existing =
        existingCentral.find(
          (item) => item.id === course.id
        )

      return courseToCentralCourse(
        course,
        existing
      )
    }
  )

  saveCentralCourses(nextCentral)
}

const defaultCourses: Course[] = [
  {
    id: 'course-csc101',
    code: 'CSC101',
    title: 'Introduction to Computer Science',
    description: 'Foundations of computing, algorithms and problem solving.',
    department: 'Department of Computer Science',
    faculty: 'Faculty of Science',
    programme: 'Bachelor of Computer Science',
    yearLevel: 'Year 1',
    semester: 'Semester 1',
    creditHours: '3',
    courseType: 'Core',
    status: 'Active',
    prerequisite: '',
  },
  {
    id: 'course-mat101',
    code: 'MAT101',
    title: 'Mathematics I',
    description: 'Fundamental mathematical concepts for university study.',
    department: 'Department of Mathematics & Statistics',
    faculty: 'Faculty of Science',
    programme: 'Bachelor of Computer Science',
    yearLevel: 'Year 1',
    semester: 'Semester 1',
    creditHours: '3',
    courseType: 'Core',
    status: 'Active',
    prerequisite: '',
  },
  {
    id: 'course-eng101',
    code: 'ENG101',
    title: 'Academic English',
    description: 'Academic communication, reading, writing and presentation.',
    department: 'Department of Languages & Literature',
    faculty: 'Faculty of Humanities & Social Sciences',
    programme: 'Bachelor of Arts in English',
    yearLevel: 'Year 1',
    semester: 'Semester 1',
    creditHours: '3',
    courseType: 'General',
    status: 'Active',
    prerequisite: '',
  },
  {
    id: 'course-bus101',
    code: 'BUS101',
    title: 'Principles of Management',
    description: 'Introduction to management principles and organisational practice.',
    department: 'Department of Business',
    faculty: 'Faculty of Business & Economics',
    programme: 'Bachelor of Business Administration',
    yearLevel: 'Year 1',
    semester: 'Semester 1',
    creditHours: '3',
    courseType: 'Core',
    status: 'Active',
    prerequisite: '',
  },
]

function createId() {
  return `course-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export default function CourseManagementPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [academicStructure, setAcademicStructure] = useState<
    AcademicStructure[]
  >([])

  const [search, setSearch] = useState('')
  const [facultyFilter, setFacultyFilter] = useState('All Faculties')
  const [departmentFilter, setDepartmentFilter] = useState(
    'All Departments'
  )
  const [programmeFilter, setProgrammeFilter] = useState(
    'All Programmes'
  )
  const [semesterFilter, setSemesterFilter] = useState('All Semesters')
  const [statusFilter, setStatusFilter] = useState('All Statuses')

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(
    null
  )
  const [editingCourse, setEditingCourse] = useState<Course | null>(
    null
  )
  const [showModal, setShowModal] = useState(false)
  const [message, setMessage] = useState('')

  const emptyForm: Omit<Course, 'id'> = {
    code: '',
    title: '',
    description: '',
    department: '',
    faculty: '',
    programme: '',
    yearLevel: 'Year 1',
    semester: 'Semester 1',
    creditHours: '3',
    courseType: 'Core',
    status: 'Active',
    prerequisite: '',
  }

  const [form, setForm] = useState<Omit<Course, 'id'>>(emptyForm)

  useEffect(() => {
    protectNexusPage([
      "Registrar",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    try {
      const faculties = readCentralFaculties()
      const departments = readCentralDepartments()
      const programmes = readCentralProgrammes()

      const centralStructure =
        academicStructureFromCentralRecords(
          faculties,
          departments,
          programmes
        )

      if (centralStructure.length > 0) {
        setAcademicStructure(
          centralStructure
        )
      } else {
        const structureRaw =
          localStorage.getItem(
            ACADEMIC_STORAGE_KEY
          )

        if (structureRaw) {
          const structure: unknown =
            JSON.parse(structureRaw)

          if (Array.isArray(structure)) {
            setAcademicStructure(
              structure as AcademicStructure[]
            )
          }
        }
      }

      const loadedCourses =
        readCoursesForUi()

      if (loadedCourses.length > 0) {
        setCourses(loadedCourses)
      } else {
        const migrated =
          migrateLegacyCourses(
            defaultCourses
          )

        saveCentralCourses(migrated)

        setCourses(
          migrated.map((course) =>
            centralCourseToUiCourse(
              course,
              faculties,
              departments,
              programmes
            )
          )
        )
      }
    } catch {
      setCourses(defaultCourses)
    }
  }, [])

  useEffect(() => {
    function reloadCourses() {
      try {
        setCourses(readCoursesForUi())

        const faculties =
          readCentralFaculties()
        const departments =
          readCentralDepartments()
        const programmes =
          readCentralProgrammes()

        const structure =
          academicStructureFromCentralRecords(
            faculties,
            departments,
            programmes
          )

        if (structure.length > 0) {
          setAcademicStructure(
            structure
          )
        }
      } catch {
        // Keep the current UI state if
        // another module temporarily has
        // incomplete data.
      }
    }

    window.addEventListener(
      "nexusSIS_courses_updated",
      reloadCourses
    )

    window.addEventListener(
      "nexusSIS_academics_updated",
      reloadCourses
    )

    window.addEventListener(
      "storage",
      reloadCourses
    )

    return () => {
      window.removeEventListener(
        "nexusSIS_courses_updated",
        reloadCourses
      )

      window.removeEventListener(
        "nexusSIS_academics_updated",
        reloadCourses
      )

      window.removeEventListener(
        "storage",
        reloadCourses
      )
    }
  }, [])

  const faculties = useMemo(
    () => academicStructure.map((faculty) => faculty.name),
    [academicStructure]
  )

  const departments = useMemo(() => {
    if (form.faculty) {
      const faculty = academicStructure.find(
        (item) => item.name === form.faculty
      )

      return faculty?.departments.map((department) => department.name) || []
    }

    return academicStructure.flatMap((faculty) =>
      faculty.departments.map((department) => department.name)
    )
  }, [academicStructure, form.faculty])

  const programmes = useMemo(() => {
    if (form.faculty) {
      const faculty = academicStructure.find(
        (item) => item.name === form.faculty
      )

      if (!faculty) return []

      if (form.department) {
        const department = faculty.departments.find(
          (item) => item.name === form.department
        )

        return department?.programmes || []
      }

      return faculty.departments.flatMap(
        (department) => department.programmes
      )
    }

    return academicStructure.flatMap((faculty) =>
      faculty.departments.flatMap(
        (department) => department.programmes
      )
    )
  }, [academicStructure, form.faculty, form.department])

  const filterDepartments = useMemo(() => {
    if (facultyFilter === 'All Faculties') {
      return Array.from(
        new Set(
          academicStructure.flatMap((faculty) =>
            faculty.departments.map((department) => department.name)
          )
        )
      )
    }

    const faculty = academicStructure.find(
      (item) => item.name === facultyFilter
    )

    return faculty?.departments.map((department) => department.name) || []
  }, [academicStructure, facultyFilter])

  const filterProgrammes = useMemo(() => {
    let facultiesToUse = academicStructure

    if (facultyFilter !== 'All Faculties') {
      facultiesToUse = academicStructure.filter(
        (faculty) => faculty.name === facultyFilter
      )
    }

    let departmentsToUse = facultiesToUse.flatMap(
      (faculty) => faculty.departments
    )

    if (departmentFilter !== 'All Departments') {
      departmentsToUse = departmentsToUse.filter(
        (department) => department.name === departmentFilter
      )
    }

    return Array.from(
      new Set(
        departmentsToUse.flatMap(
          (department) => department.programmes
        )
      )
    )
  }, [
    academicStructure,
    facultyFilter,
    departmentFilter,
  ])

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase()

    return courses.filter((course) => {
      const matchesSearch =
        !query ||
        course.code.toLowerCase().includes(query) ||
        course.title.toLowerCase().includes(query) ||
        course.description.toLowerCase().includes(query) ||
        course.department.toLowerCase().includes(query) ||
        course.programme.toLowerCase().includes(query)

      const matchesFaculty =
        facultyFilter === 'All Faculties' ||
        course.faculty === facultyFilter

      const matchesDepartment =
        departmentFilter === 'All Departments' ||
        course.department === departmentFilter

      const matchesProgramme =
        programmeFilter === 'All Programmes' ||
        course.programme === programmeFilter

      const matchesSemester =
        semesterFilter === 'All Semesters' ||
        course.semester === semesterFilter

      const matchesStatus =
        statusFilter === 'All Statuses' ||
        course.status === statusFilter

      return (
        matchesSearch &&
        matchesFaculty &&
        matchesDepartment &&
        matchesProgramme &&
        matchesSemester &&
        matchesStatus
      )
    })
  }, [
    courses,
    search,
    facultyFilter,
    departmentFilter,
    programmeFilter,
    semesterFilter,
    statusFilter,
  ])

  const statistics = useMemo(
    () => ({
      total: courses.length,
      active: courses.filter((course) => course.status === 'Active')
        .length,
      core: courses.filter((course) => course.courseType === 'Core')
        .length,
      electives: courses.filter(
        (course) => course.courseType === 'Elective'
      ).length,
    }),
    [courses]
  )

  function saveCourses(nextCourses: Course[]) {
    setCourses(nextCourses)
    saveCoursesToCentral(nextCourses)
  }

  function openNewCourse() {
    setEditingCourse(null)
    setForm({
      ...emptyForm,
      faculty: '',
      department: '',
      programme: '',
    })
    setShowModal(true)
  }

  function openEditCourse(course: Course) {
    setEditingCourse(course)
    setForm({
      code: course.code,
      title: course.title,
      description: course.description,
      department: course.department,
      faculty: course.faculty,
      programme: course.programme,
      yearLevel: course.yearLevel,
      semester: course.semester,
      creditHours: course.creditHours,
      courseType: course.courseType,
      status: course.status,
      prerequisite: course.prerequisite,
    })
    setShowModal(true)
  }

  function saveCourse() {
    const code = form.code.trim().toUpperCase()
    const title = form.title.trim()
    const description = form.description.trim()
    const department = form.department.trim()
    const faculty = form.faculty.trim()
    const programme = form.programme.trim()
    const creditHours = form.creditHours.trim()
    const prerequisite = form.prerequisite.trim()

    if (
      !code ||
      !title ||
      !faculty ||
      !department ||
      !programme ||
      !creditHours
    ) {
      setMessage(
        'Course code, title, faculty, department, programme and credit hours are required.'
      )
      return
    }

    const duplicate = courses.some(
      (course) =>
        course.code.toLowerCase() === code.toLowerCase() &&
        course.id !== editingCourse?.id
    )

    if (duplicate) {
      setMessage(`Course code ${code} already exists.`)
      return
    }

    const courseData = {
      code,
      title,
      description,
      department,
      faculty,
      programme,
      yearLevel: form.yearLevel,
      semester: form.semester,
      creditHours,
      courseType: form.courseType,
      status: form.status,
      prerequisite,
    }

    if (editingCourse) {
      const nextCourses: Course[] = courses.map((course) =>
        course.id === editingCourse.id
          ? {
              ...course,
              ...courseData,
            }
          : course
      )

      saveCourses(nextCourses)

      const updated = nextCourses.find(
        (course) => course.id === editingCourse.id
      )

      if (updated) {
        setSelectedCourse(updated)
      }

      setMessage(`${code} has been updated.`)
    } else {
      const newCourse: Course = {
        id: createId(),
        ...courseData,
      }

      saveCourses([...courses, newCourse])
      setSelectedCourse(newCourse)
      setMessage(`${code} has been added to the course catalogue.`)
    }

    setShowModal(false)
  }

  function deleteCourse(course: Course) {
    const confirmed = window.confirm(
      `Remove ${course.code} - ${course.title} from the course catalogue?`
    )

    if (!confirmed) return

    const nextCourses = courses.filter(
      (item) => item.id !== course.id
    )

    saveCourses(nextCourses)
    setSelectedCourse(null)
    setMessage(`${course.code} has been removed.`)
  }

  function toggleStatus(course: Course) {
    const nextStatus =
      course.status === 'Active' ? 'Inactive' : 'Active'

    const nextCourses: Course[] = courses.map((item) =>
      item.id === course.id
        ? {
            ...item,
            status: nextStatus as Course['status'],
          }
        : item
    )

    saveCourses(nextCourses)

    setSelectedCourse({
      ...course,
      status: nextStatus,
    })

    setMessage(
      `${course.code} is now ${nextStatus.toLowerCase()}.`
    )
  }

  function exportCsv() {
    if (filteredCourses.length === 0) {
      setMessage('There are no courses to export.')
      return
    }

    const headers = [
      'Course Code',
      'Course Title',
      'Description',
      'Faculty',
      'Department',
      'Programme',
      'Year Level',
      'Semester',
      'Credit Hours',
      'Course Type',
      'Status',
      'Prerequisite',
    ]

    const rows = filteredCourses.map((course) => [
      course.code,
      course.title,
      course.description,
      course.faculty,
      course.department,
      course.programme,
      course.yearLevel,
      course.semester,
      course.creditHours,
      course.courseType,
      course.status,
      course.prerequisite,
    ])

    const csv = [
      headers.map(csvEscape).join(','),
      ...rows.map((row) => row.map(csvEscape).join(',')),
    ].join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `nexus-sis-course-catalogue-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`

    document.body.appendChild(link)
    link.click()
    link.remove()

    URL.revokeObjectURL(url)

    setMessage('Course catalogue exported successfully.')
  }

  function resetFilters() {
    setSearch('')
    setFacultyFilter('All Faculties')
    setDepartmentFilter('All Departments')
    setProgrammeFilter('All Programmes')
    setSemesterFilter('All Semesters')
    setStatusFilter('All Statuses')
  }

  function signOut() {
    localStorage.removeItem('nexussis_session')
    localStorage.removeItem('nexus_role')
    localStorage.removeItem('nexus_username')
    localStorage.removeItem('userSession')

    window.location.href = '/dashboard'
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-[#071a33] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <div className="text-xl font-bold tracking-wide">
              NEXUS SIS
            </div>

            <div className="text-xs text-slate-300">
              Course Catalogue Management
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/academics"
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm hover:bg-white/10"
            >
              Academic Structure
            </Link>

            <Link
              href="/admin/registrar"
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm hover:bg-white/10"
            >
              Registrar
            </Link>

            <button
              onClick={signOut}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#071a33] hover:bg-slate-100"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">
              Academic Administration
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              Course Catalogue
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Create and maintain the central university course
              catalogue used by academic programmes, lecturers,
              student registration, LMS and examinations.
            </p>
          </div>

          <button
            onClick={openNewCourse}
            className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
          >
            + Add Course
          </button>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <div className="mb-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Total Courses
            </div>
            <div className="mt-2 text-3xl font-bold">
              {statistics.total}
            </div>
          </div>

          <div className="rounded-xl border border-green-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Active Courses
            </div>
            <div className="mt-2 text-3xl font-bold text-green-600">
              {statistics.active}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Core Courses
            </div>
            <div className="mt-2 text-3xl font-bold text-blue-700">
              {statistics.core}
            </div>
          </div>

          <div className="rounded-xl border border-purple-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Electives
            </div>
            <div className="mt-2 text-3xl font-bold text-purple-700">
              {statistics.electives}
            </div>
          </div>
        </div>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-3">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search Courses
              </label>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search course code, title, department or programme..."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Faculty
              </label>

              <select
                value={facultyFilter}
                onChange={(e) => {
                  setFacultyFilter(e.target.value)
                  setDepartmentFilter('All Departments')
                  setProgrammeFilter('All Programmes')
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              >
                <option>All Faculties</option>

                {faculties.map((faculty) => (
                  <option key={faculty}>{faculty}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Department
              </label>

              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value)
                  setProgrammeFilter('All Programmes')
                }}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              >
                <option>All Departments</option>

                {filterDepartments.map((department) => (
                  <option key={department}>{department}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Programme
              </label>

              <select
                value={programmeFilter}
                onChange={(e) =>
                  setProgrammeFilter(e.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm"
              >
                <option>All Programmes</option>

                {filterProgrammes.map((programme) => (
                  <option key={programme}>{programme}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={semesterFilter}
              onChange={(e) =>
                setSemesterFilter(e.target.value)
              }
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
            >
              <option>All Semesters</option>
              <option>Semester 1</option>
              <option>Semester 2</option>
              <option>Summer</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value)
              }
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm"
            >
              <option>All Statuses</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>

            <button
              onClick={resetFilters}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              Reset Filters
            </button>

            <button
              onClick={exportCsv}
              className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Export CSV
            </button>

            <div className="ml-auto text-sm text-slate-500">
              Showing {filteredCourses.length} of {courses.length}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-5 py-4 font-semibold">
                    Course
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Programme
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Department
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Level
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Semester
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Credits
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Type
                  </th>

                  <th className="px-5 py-4 font-semibold">
                    Status
                  </th>

                  <th className="px-5 py-4 text-right font-semibold">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredCourses.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center"
                    >
                      <div className="font-semibold text-slate-700">
                        No courses found
                      </div>

                      <p className="mt-1 text-sm text-slate-500">
                        Add a course or change the current filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredCourses.map((course) => (
                    <tr
                      key={course.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-blue-700">
                          {course.code}
                        </div>

                        <div className="mt-1 font-semibold text-slate-800">
                          {course.title}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-700">
                        {course.programme}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {course.department}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {course.yearLevel}
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {course.semester}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {course.creditHours}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
                          {course.courseType}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            course.status === 'Active'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {course.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() =>
                            setSelectedCourse(course)
                          }
                          className="rounded-lg bg-[#071a33] px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-blue-700">
                  Course Record
                </div>

                <h2 className="mt-1 text-2xl font-bold">
                  {selectedCourse.code}
                </h2>

                <p className="mt-1 text-slate-600">
                  {selectedCourse.title}
                </p>
              </div>

              <button
                onClick={() => setSelectedCourse(null)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ['Faculty', selectedCourse.faculty],
                  ['Department', selectedCourse.department],
                  ['Programme', selectedCourse.programme],
                  ['Year Level', selectedCourse.yearLevel],
                  ['Semester', selectedCourse.semester],
                  ['Credit Hours', selectedCourse.creditHours],
                  ['Course Type', selectedCourse.courseType],
                  ['Status', selectedCourse.status],
                  [
                    'Prerequisite',
                    selectedCourse.prerequisite || 'None',
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {label}
                    </div>

                    <div className="mt-1 text-sm font-medium">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Course Description
                </div>

                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {selectedCourse.description || 'No description provided.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 border-t border-slate-200 pt-5">
                <button
                  onClick={() =>
                    openEditCourse(selectedCourse)
                  }
                  className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                >
                  Edit Course
                </button>

                <button
                  onClick={() =>
                    toggleStatus(selectedCourse)
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                >
                  {selectedCourse.status === 'Active'
                    ? 'Deactivate'
                    : 'Activate'}
                </button>

                <button
                  onClick={() =>
                    deleteCourse(selectedCourse)
                  }
                  className="rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingCourse ? 'Edit Course' : 'Add Course'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Maintain the central course catalogue.
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Course Code *
                <input
                  value={form.code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      code: e.target.value,
                    })
                  }
                  placeholder="CSC201"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal uppercase"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Course Title *
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      title: e.target.value,
                    })
                  }
                  placeholder="Data Structures"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Course Description
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="Describe the course..."
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Faculty *
                <select
                  value={form.faculty}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      faculty: e.target.value,
                      department: '',
                      programme: '',
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                >
                  <option value="">Select Faculty</option>

                  {faculties.map((faculty) => (
                    <option key={faculty}>{faculty}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Department *
                <select
                  value={form.department}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      department: e.target.value,
                      programme: '',
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                >
                  <option value="">Select Department</option>

                  {departments.map((department) => (
                    <option key={department}>
                      {department}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Programme *
                <select
                  value={form.programme}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      programme: e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                >
                  <option value="">Select Programme</option>

                  {programmes.map((programme) => (
                    <option key={programme}>
                      {programme}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Year Level
                <select
                  value={form.yearLevel}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      yearLevel: e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                >
                  <option>Year 1</option>
                  <option>Year 2</option>
                  <option>Year 3</option>
                  <option>Year 4</option>
                  <option>Year 5</option>
                  <option>Year 6</option>
                  <option>Postgraduate</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Semester
                <select
                  value={form.semester}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      semester: e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                >
                  <option>Semester 1</option>
                  <option>Semester 2</option>
                  <option>Summer</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Credit Hours *
                <select
                  value={form.creditHours}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      creditHours: e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                >
                  <option>1</option>
                  <option>2</option>
                  <option>3</option>
                  <option>4</option>
                  <option>5</option>
                  <option>6</option>
                  <option>8</option>
                  <option>12</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Course Type
                <select
                  value={form.courseType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      courseType: e.target.value as Course['courseType'],
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                >
                  <option>Core</option>
                  <option>Elective</option>
                  <option>General</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Status
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      status: e.target.value as Course['status'],
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Prerequisite
                <input
                  value={form.prerequisite}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      prerequisite: e.target.value,
                    })
                  }
                  placeholder="e.g. CSC101 or None"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveCourse}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                {editingCourse ? 'Save Changes' : 'Add Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
