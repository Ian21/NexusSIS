/**
 * Nexus SIS Central Data Layer
 *
 * This file is the shared front-end data contract for Nexus SIS.
 * All modules should eventually use these types and helper functions.
 *
 * Current phase:
 * - Browser/localStorage based prototype
 *
 * Final phase:
 * - These same interfaces will be connected to the central database/API.
 */

export type RecordStatus =
  | "Active"
  | "Inactive"
  | "Pending"
  | "Suspended"
  | "Archived"

export type StudentStatus =
  | "Pending"
  | "Registered"
  | "Deferred"
  | "Withdrawn"
  | "Graduated"
  | "Suspended"
  | "Inactive"

export type StaffStatus =
  | "Active"
  | "Inactive"
  | "Suspended"
  | "Terminated"

export type Semester =
  | "Semester 1"
  | "Semester 2"
  | "Summer"

export type StudentType =
  | "Undergraduate"
  | "Postgraduate"
  | "Certificate"
  | "Diploma"

export interface Faculty {
  id: string
  code: string
  name: string
  dean?: string
  status: RecordStatus
}

export interface Department {
  id: string
  code: string
  name: string
  facultyId: string
  headOfDepartment?: string
  status: RecordStatus
}

export interface Programme {
  id: string
  code: string
  name: string
  facultyId: string
  departmentId: string
  award: string
  durationYears: number
  studentType: StudentType
  status: RecordStatus
}

export interface Course {
  id: string
  code: string
  title: string
  description?: string
  facultyId: string
  departmentId: string
  programmeId?: string
  creditHours: number
  yearLevel: number
  semester: Semester
  courseType: "Core" | "Elective" | "General"
  prerequisite?: string
  status: RecordStatus
}

export interface CentralStudent {
  id: string
  studentId: string

  applicationId?: string

  firstName: string
  middleName?: string
  lastName: string
  fullName: string

  gender?: string
  dateOfBirth?: string
  nationality?: string
  province?: string
  ethnicity?: string

  phone?: string
  email?: string
  address?: string

  facultyId: string
  departmentId: string
  programmeId: string

  facultyName?: string
  departmentName?: string
  programmeName?: string

  studentType: StudentType
  yearLevel: number
  academicYear: string
  semester: Semester

  sponsor?: string
  previousInstitution?: string

  status: StudentStatus

  registrationDate: string
  createdAt: string
  updatedAt: string
}

export interface CentralStaff {
  id: string
  staffId: string

  firstName: string
  middleName?: string
  lastName: string
  fullName: string

  title?: string
  email?: string
  phone?: string

  facultyId?: string
  departmentId?: string

  facultyName?: string
  departmentName?: string

  employmentType?: string
  position?: string
  specialization?: string

  status: StaffStatus

  joinedDate?: string
  createdAt: string
  updatedAt: string
}

export interface AcademicPeriod {
  id: string
  academicYear: string
  semester: Semester
  registrationOpen: boolean
  startDate?: string
  endDate?: string
  status: "Current" | "Open" | "Closed"
}

export interface StudentCourseRegistration {
  id: string
  studentId: string
  courseId: string
  academicYear: string
  semester: Semester
  status:
    | "Registered"
    | "Dropped"
    | "Completed"
    | "Withdrawn"
  registeredAt: string
}

export interface StudentClearance {
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

export interface CentralUniversityData {
  university: {
    name: string
    code: string
  }

  academicPeriods: AcademicPeriod[]

  faculties: Faculty[]
  departments: Department[]
  programmes: Programme[]
  courses: Course[]

  students: CentralStudent[]
  staff: CentralStaff[]

  courseRegistrations: StudentCourseRegistration[]
  clearances: StudentClearance[]
}

export const NEXUS_KEYS = {
  university: "nexusSIS_university",

  faculties: "nexusSIS_faculties",
  departments: "nexusSIS_departments",
  programmes: "nexusSIS_programmes",
  courses: "nexusSIS_courses",

  students: "nexusSIS_central_students",
  staff: "nexusSIS_central_staff",

  academicPeriods:
    "nexusSIS_academic_periods",

  courseRegistrations:
    "nexusSIS_course_registrations",

  clearances:
    "nexusSIS_student_clearances",

  migration:
    "nexusSIS_central_migration_version",
}

export const LEGACY_KEYS = {
  students:
    "nexusSIS_registered_students",

  lecturers:
    "nexusSIS_lecturers",

  courses:
    "nexusSIS_courses",

  academicStructure:
    "nexusSIS_academic_structure",

  academicSettings:
    "nexusSIS_academic_settings",
}

export function readNexusStorage<T>(
  key: string,
  fallback: T,
): T {
  if (typeof window === "undefined") {
    return fallback
  }

  try {
    const value = localStorage.getItem(key)

    if (!value) {
      return fallback
    }

    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function writeNexusStorage<T>(
  key: string,
  value: T,
) {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.setItem(
      key,
      JSON.stringify(value),
    )
  } catch {
    // Ignore storage failures.
  }
}

export function removeNexusStorage(
  key: string,
) {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}

export function nexusToday(): string {
  return new Date()
    .toISOString()
    .slice(0, 10)
}

export function nexusNow(): string {
  return new Date().toISOString()
}

export function nexusId(
  prefix: string,
): string {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`
}

export function buildStudentId(
  academicYear: string,
  sequence: number,
): string {
  const yearPart =
    academicYear.replace(/\D/g, "").slice(-2) ||
    "26"

  return `NXS${yearPart}${String(
    sequence,
  ).padStart(5, "0")}`
}

export function buildStaffId(
  sequence: number,
): string {
  return `NXS-ST-${String(
    sequence,
  ).padStart(5, "0")}`
}

export function buildApplicationId(
  academicYear: string,
  sequence: number,
): string {
  const year =
    academicYear.replace(/\D/g, "") ||
    "2026"

  return `APP-${year}-${String(
    sequence,
  ).padStart(5, "0")}`
}

export function getNextStudentId(
  academicYear: string,
  students: CentralStudent[],
): string {
  const yearPart =
    academicYear.replace(/\D/g, "").slice(-2) ||
    "26"

  const prefix = `NXS${yearPart}`

  let highest = 0

  for (const student of students) {
    if (!student.studentId.startsWith(prefix)) {
      continue
    }

    const number = Number(
      student.studentId.slice(prefix.length),
    )

    if (
      Number.isFinite(number) &&
      number > highest
    ) {
      highest = number
    }
  }

  return buildStudentId(
    academicYear,
    highest + 1,
  )
}

export function getNextStaffId(
  staff: CentralStaff[],
): string {
  let highest = 0

  for (const member of staff) {
    const match =
      member.staffId.match(
        /^NXS-ST-(\d+)$/,
      )

    if (!match) {
      continue
    }

    const number = Number(match[1])

    if (
      Number.isFinite(number) &&
      number > highest
    ) {
      highest = number
    }
  }

  return buildStaffId(highest + 1)
}

export function getNextApplicationId(
  academicYear: string,
  students: CentralStudent[],
): string {
  const year =
    academicYear.replace(/\D/g, "") ||
    "2026"

  const prefix = `APP-${year}-`

  let highest = 0

  for (const student of students) {
    if (
      !student.applicationId?.startsWith(
        prefix,
      )
    ) {
      continue
    }

    const number = Number(
      student.applicationId.slice(
        prefix.length,
      ),
    )

    if (
      Number.isFinite(number) &&
      number > highest
    ) {
      highest = number
    }
  }

  return buildApplicationId(
    academicYear,
    highest + 1,
  )
}

export function getFaculty(
  faculties: Faculty[],
  id: string,
) {
  return faculties.find(
    (faculty) => faculty.id === id,
  )
}

export function getDepartment(
  departments: Department[],
  id: string,
) {
  return departments.find(
    (department) => department.id === id,
  )
}

export function getProgramme(
  programmes: Programme[],
  id: string,
) {
  return programmes.find(
    (programme) => programme.id === id,
  )
}

export function getCourse(
  courses: Course[],
  id: string,
) {
  return courses.find(
    (course) => course.id === id,
  )
}

export function getStudent(
  students: CentralStudent[],
  studentId: string,
) {
  return students.find(
    (student) =>
      student.studentId === studentId ||
      student.id === studentId,
  )
}

export function getStaff(
  staff: CentralStaff[],
  staffId: string,
) {
  return staff.find(
    (member) =>
      member.staffId === staffId ||
      member.id === staffId,
  )
}

export function getDepartmentsForFaculty(
  departments: Department[],
  facultyId: string,
) {
  return departments.filter(
    (department) =>
      department.facultyId === facultyId,
  )
}

export function getProgrammesForDepartment(
  programmes: Programme[],
  departmentId: string,
) {
  return programmes.filter(
    (programme) =>
      programme.departmentId ===
      departmentId,
  )
}

export function getCoursesForProgramme(
  courses: Course[],
  programmeId: string,
) {
  return courses.filter(
    (course) =>
      course.programmeId === programmeId,
  )
}

export function getStudentName(
  student: CentralStudent,
): string {
  return (
    student.fullName ||
    [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ")
  )
}

export function getStaffName(
  staff: CentralStaff,
): string {
  return (
    staff.fullName ||
    [
      staff.firstName,
      staff.middleName,
      staff.lastName,
    ]
      .filter(Boolean)
      .join(" ")
  )
}

/**
 * Converts the existing Registration/Student Master
 * records into the new central Student structure.
 *
 * This is intentionally non-destructive.
 * The old key remains available until final migration.
 */
export function migrateLegacyStudents(): {
  students: CentralStudent[]
  migrated: number
} {
  const legacy = readNexusStorage<
    Record<string, unknown>[]
  >(
    LEGACY_KEYS.students,
    [],
  )

  const existing = readNexusStorage<
    CentralStudent[]
  >(
    NEXUS_KEYS.students,
    [],
  )

  if (!legacy.length) {
    return {
      students: existing,
      migrated: 0,
    }
  }

  const central = [...existing]
  let migrated = 0

  for (const record of legacy) {
    const rawStudentId = String(
      record.studentId ||
        record.id ||
        "",
    ).trim()

    if (!rawStudentId) {
      continue
    }

    const existingIndex = central.findIndex(
      (student) =>
        student.studentId === rawStudentId ||
        student.id === rawStudentId,
    )

    const firstName = String(
      record.firstName || "",
    ).trim()

    const middleName = String(
      record.middleName || "",
    ).trim()

    const lastName = String(
      record.lastName || "",
    ).trim()

    const fallbackName = String(
      record.name ||
        record.fullName ||
        "Unnamed Student",
    ).trim()

    const fullName =
      fallbackName ||
      [
        firstName,
        middleName,
        lastName,
      ]
        .filter(Boolean)
        .join(" ")

    const facultyId = String(
      record.facultyId ||
        record.faculty ||
        "",
    ).trim()

    const departmentId = String(
      record.departmentId ||
        record.department ||
        "",
    ).trim()

    const programmeId = String(
      record.programmeId ||
        record.programme ||
        "",
    ).trim()

    const rawStatus = String(
      record.status ||
        "Registered",
    )

    const validStatuses: StudentStatus[] =
      [
        "Pending",
        "Registered",
        "Deferred",
        "Withdrawn",
        "Graduated",
        "Suspended",
        "Inactive",
      ]

    const status: StudentStatus =
      validStatuses.includes(
        rawStatus as StudentStatus,
      )
        ? (rawStatus as StudentStatus)
        : "Registered"

    const student: CentralStudent = {
      id: String(
        record.id ||
          nexusId("STUDENT"),
      ),

      studentId: rawStudentId,

      applicationId:
        record.applicationId
          ? String(record.applicationId)
          : undefined,

      firstName:
        firstName ||
        fullName.split(" ")[0] ||
        "",

      middleName:
        middleName || undefined,

      lastName:
        lastName ||
        fullName
          .split(" ")
          .slice(1)
          .join(" "),

      fullName,

      gender: record.gender
        ? String(record.gender)
        : undefined,

      dateOfBirth: record.dateOfBirth
        ? String(record.dateOfBirth)
        : undefined,

      nationality: record.nationality
        ? String(record.nationality)
        : undefined,

      province: record.province
        ? String(record.province)
        : undefined,

      ethnicity: record.ethnicity
        ? String(record.ethnicity)
        : undefined,

      phone: record.phone
        ? String(record.phone)
        : undefined,

      email: record.email
        ? String(record.email)
        : undefined,

      address: record.address
        ? String(record.address)
        : undefined,

      facultyId,

      departmentId,

      programmeId,

      facultyName: record.faculty
        ? String(record.faculty)
        : undefined,

      departmentName:
        record.department
          ? String(record.department)
          : undefined,

      programmeName:
        record.programme
          ? String(record.programme)
          : undefined,

      studentType:
        record.studentType ===
          "Postgraduate" ||
        record.studentType ===
          "Certificate" ||
        record.studentType ===
          "Diploma"
          ? record.studentType
          : "Undergraduate",

      yearLevel: Number(
        record.yearLevel || 1,
      ),

      academicYear: String(
        record.academicYear ||
          "2026",
      ),

      semester:
        record.semester ===
          "Semester 2" ||
        record.semester === "Summer"
          ? record.semester
          : "Semester 1",

      sponsor: record.sponsor
        ? String(record.sponsor)
        : undefined,

      previousInstitution:
        record.previousInstitution
          ? String(
              record.previousInstitution,
            )
          : undefined,

      status,

      registrationDate: String(
        record.registrationDate ||
          record.createdAt ||
          nexusToday(),
      ),

      createdAt: String(
        record.createdAt ||
          nexusNow(),
      ),

      updatedAt: nexusNow(),
    }

    if (existingIndex >= 0) {
      const existingStudent =
        central[existingIndex]

      central[existingIndex] = {
        ...existingStudent,
        ...student,
        id: existingStudent.id,
        createdAt: existingStudent.createdAt,
        updatedAt: nexusNow(),
      }
    } else {
      central.push(student)
      migrated += 1
    }
  }

  writeNexusStorage(
    NEXUS_KEYS.students,
    central,
  )

  writeNexusStorage(
    NEXUS_KEYS.migration,
    "1.0",
  )

  return {
    students: central,
    migrated,
  }
}

/**
 * Converts the existing lecturer/staff records
 * into central staff records.
 */
export function migrateLegacyStaff(): {
  staff: CentralStaff[]
  migrated: number
} {
  const lecturerRecords =
    readNexusStorage<
      Record<string, unknown>[]
    >(
      LEGACY_KEYS.lecturers,
      [],
    )

  const existing = readNexusStorage<
    CentralStaff[]
  >(
    NEXUS_KEYS.staff,
    [],
  )

  const central = [...existing]
  let migrated = 0

  for (const record of lecturerRecords) {
    const rawStaffId = String(
      record.staffId ||
        record.id ||
        "",
    ).trim()

    if (!rawStaffId) {
      continue
    }

    const existingIndex = central.findIndex(
      (member) =>
        member.staffId === rawStaffId ||
        member.id === rawStaffId,
    )

    const fullName = String(
      record.name ||
        record.fullName ||
        "Unnamed Staff",
    ).trim()

    const staff: CentralStaff = {
      id: String(
        record.id ||
          nexusId("STAFF"),
      ),

      staffId: rawStaffId,

      firstName:
        String(
          record.firstName || "",
        ).trim() ||
        fullName.split(" ")[0],

      middleName: record.middleName
        ? String(record.middleName)
        : undefined,

      lastName:
        String(
          record.lastName || "",
        ).trim() ||
        fullName
          .split(" ")
          .slice(1)
          .join(" "),

      fullName,

      title: record.title
        ? String(record.title)
        : undefined,

      email: record.email
        ? String(record.email)
        : undefined,

      phone: record.phone
        ? String(record.phone)
        : undefined,

      facultyId: record.facultyId
        ? String(record.facultyId)
        : undefined,

      departmentId:
        record.departmentId
          ? String(record.departmentId)
          : undefined,

      facultyName: record.faculty
        ? String(record.faculty)
        : undefined,

      departmentName:
        record.department
          ? String(record.department)
          : undefined,

      employmentType:
        record.employmentType
          ? String(record.employmentType)
          : undefined,

      position: record.position
        ? String(record.position)
        : undefined,

      specialization:
        record.specialization
          ? String(record.specialization)
          : undefined,

      status:
        record.status === "Inactive"
          ? "Inactive"
          : record.status ===
              "Suspended"
            ? "Suspended"
            : record.status ===
                "Terminated"
              ? "Terminated"
              : "Active",

      joinedDate:
        record.joinedDate
          ? String(record.joinedDate)
          : undefined,

      createdAt: nexusNow(),
      updatedAt: nexusNow(),
    }

    if (existingIndex >= 0) {
      const existingStaff =
        central[existingIndex]

      central[existingIndex] = {
        ...existingStaff,
        ...staff,
        id: existingStaff.id,
        createdAt:
          existingStaff.createdAt,
        updatedAt: nexusNow(),
      }
    } else {
      central.push(staff)
      migrated += 1
    }
  }

  writeNexusStorage(
    NEXUS_KEYS.staff,
    central,
  )

  return {
    staff: central,
    migrated,
  }
}

/**
 * Removes a central staff record by permanent Staff ID.
 */
export function removeCentralStaff(
  staffId: string,
): CentralStaff[] {
  const target = String(staffId || "").trim()

  if (!target) {
    return readNexusStorage<CentralStaff[]>(
      NEXUS_KEYS.staff,
      [],
    )
  }

  const central = readNexusStorage<CentralStaff[]>(
    NEXUS_KEYS.staff,
    [],
  )

  const next = central.filter(
    (member) =>
      member.staffId !== target &&
      member.id !== target,
  )

  writeNexusStorage(
    NEXUS_KEYS.staff,
    next,
  )

  return next
}

/**
 * Ensures the university and academic period exist.
 */
export function initialiseCentralUniversity() {
  const university = readNexusStorage(
    NEXUS_KEYS.university,
    {
      name: "Nexus University",
      code: "NXS",
    },
  )

  const periods =
    readNexusStorage<AcademicPeriod[]>(
      NEXUS_KEYS.academicPeriods,
      [],
    )

  if (!periods.length) {
    const current: AcademicPeriod = {
      id: "PERIOD-2026-1",
      academicYear: "2026",
      semester: "Semester 1",
      registrationOpen: true,
      status: "Current",
    }

    writeNexusStorage(
      NEXUS_KEYS.academicPeriods,
      [current],
    )
  }

  writeNexusStorage(
    NEXUS_KEYS.university,
    university,
  )
}

/**
 * One-call central migration.
 *
 * Safe to run more than once.
 * Existing central records are not duplicated.
 */
export function runCentralMigration() {
  initialiseCentralUniversity()

  const studentResult =
    migrateLegacyStudents()

  const staffResult =
    migrateLegacyStaff()

  return {
    studentsMigrated:
      studentResult.migrated,

    totalStudents:
      studentResult.students.length,

    staffMigrated:
      staffResult.migrated,

    totalStaff:
      staffResult.staff.length,
  }
}
