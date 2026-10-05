"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { protectNexusPage } from "@/lib/nexus-access"
import {
  NEXUS_KEYS,
  type CentralStudent,
} from "@/lib/nexus-data"

type StudentStatus =
  | "Pending"
  | "Registered"
  | "Deferred"
  | "Withdrawn"
  | "Graduated"
  | "Suspended"
  | "Inactive"


type CourseRegistration = {
  id: string
  studentId: string
  courseId: string
  academicYear: string
  semester: string
  status:
    | "Registered"
    | "Dropped"
    | "Completed"
    | "Withdrawn"
  registeredAt: string
}

type StudentClearance = {
  id: string
  studentId: string
  academic: boolean
  finance: boolean
  library: boolean
  dormitory: boolean
  department: boolean
  registrar: boolean
  academicDate?: string
  financeDate?: string
  libraryDate?: string
  dormitoryDate?: string
  departmentDate?: string
  registrarDate?: string
  graduationEligible: boolean
  notes?: string
  updatedAt: string
}

type AcademicPeriod = {
  id: string
  academicYear: string
  semester: string
  registrationOpen: boolean
  startDate?: string
  endDate?: string
  status: "Current" | "Open" | "Closed"
}

type Faculty = {
  id: string
  code: string
  name: string
  dean?: string
  status?: string
}

type Department = {
  id: string
  code: string
  name: string
  facultyId: string
  headOfDepartment?: string
  status?: string
}

type Programme = {
  id: string
  code: string
  name: string
  facultyId: string
  departmentId: string
  award?: string
  durationYears?: number
  studentType?: string
  status?: string
}

type Course = {
  id: string
  code: string
  title: string
  facultyId?: string
  departmentId?: string
  programmeId?: string
  creditHours?: number
  yearLevel?: number
  semester?: string
  courseType?: string
  status?: string
}

type GraduationRecord = {
  id?: string
  studentId?: string
  studentName?: string
  programme?: string
  faculty?: string
  graduationYear?: string
  status?: string
  registrarApproval?: string
  registrarOfficer?: string
  registrarDate?: string
  registrarNotes?: string
  academicStatus?: string
  financialStatus?: string
  libraryStatus?: string
  dormitoryStatus?: string
  departmentApproval?: string
}

const STORAGE = {
  students: "nexusSIS_central_students",
  courseRegistrations: "nexusSIS_course_registrations",
  clearances: "nexusSIS_student_clearances",
  academicPeriods: "nexusSIS_academic_periods",
  faculties: "nexusSIS_faculties",
  departments: "nexusSIS_departments",
  programmes: "nexusSIS_programmes",
  courses: "nexusSIS_courses",
  graduation: "nexusSIS_graduation_records",
  session: "nexussis_session",
  role: "nexus_role",
  username: "nexus_username",
}

type Tab =
  | "dashboard"
  | "students"
  | "registrations"
  | "periods"
  | "clearance"
  | "graduation"

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback
  }

  try {
    const raw = localStorage.getItem(key)

    if (!raw) {
      return fallback
    }

    const parsed = JSON.parse(raw)

    return parsed as T
  } catch {
    return fallback
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

export default function RegistrarPage() {
  const router = useRouter()

  const [activeTab, setActiveTab] =
    useState<Tab>("dashboard")

  const [students, setStudents] =
    useState<CentralStudent[]>([])

  const [registrations, setRegistrations] =
    useState<CourseRegistration[]>([])

  const [clearances, setClearances] =
    useState<StudentClearance[]>([])

  const [academicPeriods, setAcademicPeriods] =
    useState<AcademicPeriod[]>([])

  const [faculties, setFaculties] =
    useState<Faculty[]>([])

  const [departments, setDepartments] =
    useState<Department[]>([])

  const [programmes, setProgrammes] =
    useState<Programme[]>([])

  const [courses, setCourses] =
    useState<Course[]>([])

  const [graduationRecords, setGraduationRecords] =
    useState<GraduationRecord[]>([])

  const [search, setSearch] = useState("")
  const [selectedStudent, setSelectedStudent] =
    useState<CentralStudent | null>(null)

  const [selectedRegistrationStudent, setSelectedRegistrationStudent] =
    useState("")

  const [selectedClearanceStudent, setSelectedClearanceStudent] =
    useState("")

  const loadData = () => {
    setStudents(
      readStorage<CentralStudent[]>(
        STORAGE.students,
        [],
      ),
    )

    setRegistrations(
      readStorage<CourseRegistration[]>(
        STORAGE.courseRegistrations,
        [],
      ),
    )

    setClearances(
      readStorage<StudentClearance[]>(
        STORAGE.clearances,
        [],
      ),
    )

    setAcademicPeriods(
      readStorage<AcademicPeriod[]>(
        STORAGE.academicPeriods,
        [],
      ),
    )

    setFaculties(
      readStorage<Faculty[]>(
        STORAGE.faculties,
        [],
      ),
    )

    setDepartments(
      readStorage<Department[]>(
        STORAGE.departments,
        [],
      ),
    )

    setProgrammes(
      readStorage<Programme[]>(
        STORAGE.programmes,
        [],
      ),
    )

    setCourses(
      readStorage<Course[]>(
        STORAGE.courses,
        [],
      ),
    )

    setGraduationRecords(
      readStorage<GraduationRecord[]>(
        STORAGE.graduation,
        [],
      ),
    )
  }

  useEffect(() => {
    protectNexusPage([
      "Registrar",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    loadData()

    const session =
      localStorage.getItem(STORAGE.session)

    const role =
      localStorage.getItem(STORAGE.role)

    if (!session) {
      router.replace("/dashboard")
      return
    }

    const allowedRoles = [
      "Registrar",
      "Super Administrator",
      "ICT Administrator",
    ]

    if (
      role &&
      !allowedRoles.includes(role)
    ) {
      router.replace("/dashboard")
      return
    }

    const handleStorage = () => {
      loadData()
    }

    window.addEventListener(
      "storage",
      handleStorage,
    )

    window.addEventListener(
      "nexusSIS_data_updated",
      handleStorage,
    )

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      )

      window.removeEventListener(
        "nexusSIS_data_updated",
        handleStorage,
      )
    }
  }, [router])

  const signOut = () => {
    localStorage.removeItem(STORAGE.session)
    localStorage.removeItem(STORAGE.role)
    localStorage.removeItem(STORAGE.username)
    localStorage.removeItem("userSession")

    router.push("/dashboard")
  }

  const filteredStudents = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase()

    if (!value) {
      return students
    }

    return students.filter((student) =>
      [
        student.studentId,
        student.fullName,
        student.firstName,
        student.lastName,
        student.facultyName,
        student.departmentName,
        student.programmeName,
        student.applicationId,
      ]
        .filter(Boolean)
        .some((item) =>
          String(item)
            .toLowerCase()
            .includes(value),
        ),
    )
  }, [students, search])

  const currentPeriod = useMemo(
    () =>
      academicPeriods.find(
        (period) =>
          period.status === "Current",
      ),
    [academicPeriods],
  )

  const registrationOpenCount =
    academicPeriods.filter(
      (period) =>
        period.registrationOpen === true,
    ).length

  const activeStudents =
    students.filter(
      (student) =>
        student.status === "Registered" ||
        student.status === "Pending",
    ).length

  const graduationApproved =
    graduationRecords.filter(
      (record) =>
        record.registrarApproval ===
        "Approved",
    ).length

  const clearanceComplete =
    clearances.filter(
      (clearance) =>
        clearance.academic &&
        clearance.finance &&
        clearance.library &&
        clearance.dormitory &&
        clearance.department &&
        clearance.registrar,
    ).length

  const getStudentName = (
    studentId: string,
  ) => {
    const student = students.find(
      (item) =>
        item.studentId === studentId,
    )

    return (
      student?.fullName ||
      studentId
    )
  }

  const getCourse = (
    courseId: string,
  ) => {
    return courses.find(
      (course) =>
        course.id === courseId ||
        course.code === courseId,
    )
  }

  const selectedRegistrationRows =
    selectedRegistrationStudent
      ? registrations.filter(
          (registration) =>
            registration.studentId ===
            selectedRegistrationStudent,
        )
      : []

  const selectedClearance =
    selectedClearanceStudent
      ? clearances.find(
          (clearance) =>
            clearance.studentId ===
            selectedClearanceStudent,
        )
      : undefined

  const refresh = () => {
    loadData()
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-900 text-white shadow-lg">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-bold">
                  N
                </div>

                <div>
                  <h1 className="text-xl font-bold">
                    Nexus SIS
                  </h1>

                  <p className="text-xs text-slate-400">
                    Registrar Office
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  router.push(
                    "/admin/academics",
                  )
                }
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
              >
                Academic Structure
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/admin/registration",
                  )
                }
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
              >
                Registration
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/admin/graduation",
                  )
                }
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
              >
                Graduation
              </button>

              <button
                onClick={signOut}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Registrar Office
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Academic administration, student
                records, course registration,
                clearance and graduation oversight.
              </p>
            </div>

            <button
              onClick={refresh}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Refresh Data
            </button>
          </div>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["dashboard", "Dashboard"],
            ["students", "Student Records"],
            ["registrations", "Course Registration"],
            ["periods", "Academic Periods"],
            ["clearance", "Clearance"],
            ["graduation", "Graduation"],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() =>
                setActiveTab(id as Tab)
              }
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                activeTab === id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 shadow-sm hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "dashboard" && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              {[
                [
                  "Central Students",
                  students.length,
                ],
                [
                  "Active Students",
                  activeStudents,
                ],
                [
                  "Course Registrations",
                  registrations.length,
                ],
                [
                  "Academic Periods",
                  academicPeriods.length,
                ],
                [
                  "Clearance Records",
                  clearances.length,
                ],
                [
                  "Registrar Approved",
                  graduationApproved,
                ],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-xl bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>

                  <p className="mt-2 text-2xl font-bold text-slate-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  Current Academic Period
                </h3>

                {currentPeriod ? (
                  <div className="mt-4 space-y-2 text-sm">
                    <p>
                      <span className="font-semibold">
                        Academic Year:
                      </span>{" "}
                      {currentPeriod.academicYear}
                    </p>

                    <p>
                      <span className="font-semibold">
                        Semester:
                      </span>{" "}
                      {currentPeriod.semester}
                    </p>

                    <p>
                      <span className="font-semibold">
                        Status:
                      </span>{" "}
                      {currentPeriod.status}
                    </p>

                    <p>
                      <span className="font-semibold">
                        Registration:
                      </span>{" "}
                      {currentPeriod.registrationOpen
                        ? "Open"
                        : "Closed"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    No current academic period has
                    been configured.
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900">
                  Academic Structure
                </h3>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {[
                    ["Faculties", faculties.length],
                    [
                      "Departments",
                      departments.length,
                    ],
                    ["Programmes", programmes.length],
                    ["Courses", courses.length],
                    [
                      "Registration Windows",
                      registrationOpenCount,
                    ],
                    [
                      "Complete Clearances",
                      clearanceComplete,
                    ],
                  ].map(([label, value]) => (
                    <div
                      key={String(label)}
                      className="rounded-lg bg-slate-50 p-3"
                    >
                      <p className="text-xs text-slate-500">
                        {label}
                      </p>

                      <p className="mt-1 text-lg font-bold text-slate-900">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <button
                onClick={() =>
                  router.push(
                    "/admin/registration",
                  )
                }
                className="rounded-xl bg-white p-5 text-left shadow-sm hover:bg-slate-50"
              >
                <h3 className="font-bold text-slate-900">
                  Student Registration
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Manage admissions and registration
                  records.
                </p>
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/admin/students",
                  )
                }
                className="rounded-xl bg-white p-5 text-left shadow-sm hover:bg-slate-50"
              >
                <h3 className="font-bold text-slate-900">
                  Student Master
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Review the central student master
                  records.
                </p>
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/admin/academics",
                  )
                }
                className="rounded-xl bg-white p-5 text-left shadow-sm hover:bg-slate-50"
              >
                <h3 className="font-bold text-slate-900">
                  Academic Structure
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Faculties, departments, programmes
                  and courses.
                </p>
              </button>

              <button
                onClick={() =>
                  router.push(
                    "/admin/graduation",
                  )
                }
                className="rounded-xl bg-white p-5 text-left shadow-sm hover:bg-slate-50"
              >
                <h3 className="font-bold text-slate-900">
                  Graduation
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Review clearance and Registrar
                  approval workflows.
                </p>
              </button>
            </div>
          </>
        )}

        {activeTab === "students" && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Central Student Records
                </h3>

                <p className="text-sm text-slate-500">
                  Search and review academic student
                  records.
                </p>
              </div>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search Student ID or name..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-80"
              />
            </div>

            {filteredStudents.length === 0 ? (
              <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">
                No central student records found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">
                        Student ID
                      </th>
                      <th className="px-3 py-3">
                        Name
                      </th>
                      <th className="px-3 py-3">
                        Programme
                      </th>
                      <th className="px-3 py-3">
                        Faculty
                      </th>
                      <th className="px-3 py-3">
                        Year
                      </th>
                      <th className="px-3 py-3">
                        Status
                      </th>
                      <th className="px-3 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map(
                      (student) => (
                        <tr
                          key={student.id}
                          className="border-b last:border-0"
                        >
                          <td className="px-3 py-3 font-semibold">
                            {student.studentId}
                          </td>

                          <td className="px-3 py-3">
                            {student.fullName}
                          </td>

                          <td className="px-3 py-3">
                            {student.programmeName ||
                              "-"}
                          </td>

                          <td className="px-3 py-3">
                            {student.facultyName ||
                              "-"}
                          </td>

                          <td className="px-3 py-3">
                            {student.yearLevel ??
                              "-"}
                          </td>

                          <td className="px-3 py-3">
                            {student.status ||
                              "-"}
                          </td>

                          <td className="px-3 py-3">
                            <button
                              onClick={() =>
                                setSelectedStudent(
                                  student,
                                )
                              }
                              className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "registrations" && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              Course Registration Records
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Review courses registered against a
              Student ID.
            </p>

            <div className="mt-5">
              <select
                value={selectedRegistrationStudent}
                onChange={(event) =>
                  setSelectedRegistrationStudent(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-96"
              >
                <option value="">
                  Select Student
                </option>

                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.studentId}
                  >
                    {student.studentId} -{" "}
                    {student.fullName}
                  </option>
                ))}
              </select>
            </div>

            {selectedRegistrationStudent && (
              <div className="mt-6 overflow-x-auto">
                {selectedRegistrationRows.length ===
                0 ? (
                  <p className="rounded-lg bg-slate-50 p-6 text-sm text-slate-500">
                    No course registrations found
                    for this Student ID.
                  </p>
                ) : (
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="px-3 py-3">
                          Course
                        </th>
                        <th className="px-3 py-3">
                          Academic Year
                        </th>
                        <th className="px-3 py-3">
                          Semester
                        </th>
                        <th className="px-3 py-3">
                          Status
                        </th>
                        <th className="px-3 py-3">
                          Registered
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedRegistrationRows.map(
                        (registration) => {
                          const course =
                            getCourse(
                              registration.courseId,
                            )

                          return (
                            <tr
                              key={
                                registration.id
                              }
                              className="border-b"
                            >
                              <td className="px-3 py-3">
                                {course
                                  ? `${course.code} - ${course.title}`
                                  : registration.courseId}
                              </td>

                              <td className="px-3 py-3">
                                {
                                  registration.academicYear
                                }
                              </td>

                              <td className="px-3 py-3">
                                {
                                  registration.semester
                                }
                              </td>

                              <td className="px-3 py-3">
                                {
                                  registration.status
                                }
                              </td>

                              <td className="px-3 py-3">
                                {registration.registeredAt
                                  ? new Date(
                                      registration.registeredAt,
                                    ).toLocaleDateString()
                                  : "-"}
                              </td>
                            </tr>
                          )
                        },
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "periods" && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              Academic Periods
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Current academic years, semesters and
              registration windows.
            </p>

            <div className="mt-6 overflow-x-auto">
              {academicPeriods.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-6 text-sm text-slate-500">
                  No academic periods found.
                </p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">
                        Academic Year
                      </th>
                      <th className="px-3 py-3">
                        Semester
                      </th>
                      <th className="px-3 py-3">
                        Status
                      </th>
                      <th className="px-3 py-3">
                        Registration
                      </th>
                      <th className="px-3 py-3">
                        Start
                      </th>
                      <th className="px-3 py-3">
                        End
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {academicPeriods.map(
                      (period) => (
                        <tr
                          key={period.id}
                          className="border-b"
                        >
                          <td className="px-3 py-3 font-semibold">
                            {period.academicYear}
                          </td>

                          <td className="px-3 py-3">
                            {period.semester}
                          </td>

                          <td className="px-3 py-3">
                            {period.status}
                          </td>

                          <td className="px-3 py-3">
                            {period.registrationOpen
                              ? "Open"
                              : "Closed"}
                          </td>

                          <td className="px-3 py-3">
                            {period.startDate ||
                              "-"}
                          </td>

                          <td className="px-3 py-3">
                            {period.endDate ||
                              "-"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === "clearance" && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900">
              Student Clearance
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Review clearance status across
              university services.
            </p>

            <div className="mt-5">
              <select
                value={selectedClearanceStudent}
                onChange={(event) =>
                  setSelectedClearanceStudent(
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm md:w-96"
              >
                <option value="">
                  Select Student
                </option>

                {students.map((student) => (
                  <option
                    key={student.id}
                    value={student.studentId}
                  >
                    {student.studentId} -{" "}
                    {student.fullName}
                  </option>
                ))}
              </select>
            </div>

            {selectedClearanceStudent && (
              <div className="mt-6">
                {selectedClearance ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[
                      [
                        "Academic",
                        selectedClearance.academic,
                      ],
                      [
                        "Finance",
                        selectedClearance.finance,
                      ],
                      [
                        "Library",
                        selectedClearance.library,
                      ],
                      [
                        "Dormitory",
                        selectedClearance.dormitory,
                      ],
                      [
                        "Department",
                        selectedClearance.department,
                      ],
                      [
                        "Registrar",
                        selectedClearance.registrar,
                      ],
                      [
                        "Graduation Eligible",
                        selectedClearance.graduationEligible,
                      ],
                    ].map(([label, value]) => (
                      <div
                        key={String(label)}
                        className="rounded-lg bg-slate-50 p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {label}
                        </p>

                        <p
                          className={`mt-2 text-lg font-bold ${
                            value
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          {value
                            ? "Cleared"
                            : "Pending"}
                        </p>
                      </div>
                    ))}

                    {selectedClearance.notes && (
                      <div className="rounded-lg bg-slate-50 p-4 md:col-span-2 lg:col-span-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Notes
                        </p>

                        <p className="mt-2 text-sm text-slate-700">
                          {selectedClearance.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="rounded-lg bg-slate-50 p-6 text-sm text-slate-500">
                    No clearance record exists for
                    this Student ID.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "graduation" && (
          <div className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Graduation & Registrar Approval
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Review existing graduation records
                  and Registrar approval status.
                </p>
              </div>

              <button
                onClick={() =>
                  router.push(
                    "/admin/graduation",
                  )
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Open Graduation Module
              </button>
            </div>

            <div className="mt-6 overflow-x-auto">
              {graduationRecords.length ===
              0 ? (
                <p className="rounded-lg bg-slate-50 p-6 text-sm text-slate-500">
                  No graduation records found.
                </p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-3 py-3">
                        Student ID
                      </th>
                      <th className="px-3 py-3">
                        Student
                      </th>
                      <th className="px-3 py-3">
                        Programme
                      </th>
                      <th className="px-3 py-3">
                        Graduation Year
                      </th>
                      <th className="px-3 py-3">
                        Registrar
                      </th>
                      <th className="px-3 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {graduationRecords.map(
                      (record, index) => (
                        <tr
                          key={
                            record.id ||
                            `${record.studentId}-${index}`
                          }
                          className="border-b"
                        >
                          <td className="px-3 py-3 font-semibold">
                            {record.studentId ||
                              "-"}
                          </td>

                          <td className="px-3 py-3">
                            {record.studentName ||
                              getStudentName(
                                record.studentId ||
                                  "",
                              )}
                          </td>

                          <td className="px-3 py-3">
                            {record.programme ||
                              "-"}
                          </td>

                          <td className="px-3 py-3">
                            {record.graduationYear ||
                              "-"}
                          </td>

                          <td className="px-3 py-3">
                            {record.registrarApproval ||
                              "Pending"}
                          </td>

                          <td className="px-3 py-3">
                            {record.status || "-"}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Student Academic Record
                </h3>

                <p className="text-sm text-slate-500">
                  {selectedStudent.studentId}
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedStudent(null)
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              {[
                [
                  "Student ID",
                  selectedStudent.studentId,
                ],
                [
                  "Application ID",
                  selectedStudent.applicationId ||
                    "-",
                ],
                [
                  "Full Name",
                  selectedStudent.fullName,
                ],
                [
                  "Student Type",
                  selectedStudent.studentType ||
                    "-",
                ],
                [
                  "Faculty",
                  selectedStudent.facultyName ||
                    selectedStudent.facultyId ||
                    "-",
                ],
                [
                  "Department",
                  selectedStudent.departmentName ||
                    selectedStudent.departmentId ||
                    "-",
                ],
                [
                  "Programme",
                  selectedStudent.programmeName ||
                    selectedStudent.programmeId ||
                    "-",
                ],
                [
                  "Year Level",
                  selectedStudent.yearLevel ??
                    "-",
                ],
                [
                  "Academic Year",
                  selectedStudent.academicYear ||
                    "-",
                ],
                [
                  "Semester",
                  selectedStudent.semester ||
                    "-",
                ],
                [
                  "Status",
                  selectedStudent.status ||
                    "-",
                ],
                [
                  "Registration Date",
                  selectedStudent.registrationDate ||
                    "-",
                ],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="rounded-lg bg-slate-50 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t px-6 py-4">
              <button
                onClick={() => {
                  setSelectedStudent(null)
                  router.push(
                    "/admin/students",
                  )
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Open Student Master
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-6 pb-8">
        <div className="rounded-xl bg-white p-4 text-center text-xs text-slate-500 shadow-sm">
          Nexus SIS Registrar Office • Academic
          administration and student records
          management
        </div>
      </div>
    </div>
  )
}
