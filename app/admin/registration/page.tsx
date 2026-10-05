'use client'

import { useEffect, useMemo, useState } from 'react'
import { protectNexusPage } from '@/lib/nexus-access' 
import {
  NEXUS_KEYS,
  type CentralStudent,
  type Semester,
  type StudentType,
} from '@/lib/nexus-data'

type RegistrationStatus =
  | 'Pending'
  | 'Registered'
  | 'Deferred'
  | 'Withdrawn'

type AcademicStatus = 'Active' | 'Inactive'

type Programme = {
  id: string
  code: string
  name: string
  faculty: string
  department: string
  award: string
  duration: string
  mode: string
  status: AcademicStatus
}

type Department = {
  id: string
  name: string
  faculty: string
  head: string
  status: AcademicStatus
}

type AcademicStructure = {
  faculties: string[]
  departments: Department[]
  programmes: Programme[]
}

type RegisteredStudent = {
  id: string
  studentId: string
  applicationNumber: string
  firstName: string
  middleName: string
  lastName: string
  sex: string
  dateOfBirth: string
  email: string
  phone: string
  province: string
  country: string
  programme: string
  programmeCode: string
  faculty: string
  department: string
  intake: string
  academicYear: string
  studyMode: string
  status: RegistrationStatus
  registrationDate: string
  sponsor: string
  previousInstitution: string
  emergencyName: string
  emergencyRelationship: string
  emergencyPhone: string
  emergencyEmail: string
  emergencyAddress: string
}

type IctRegistrationQueueItem = {
  id: string
  studentId: string
  applicationNumber: string
  firstName: string
  middleName: string
  lastName: string
  fullName: string
  sex: string
  dateOfBirth: string
  email: string
  phone: string
  province: string
  country: string
  programme: string
  programmeCode: string
  faculty: string
  department: string
  academicYear: string
  intake: string
  studyMode: string
  registrationDate: string
  photo: string
  idPrintStatus: 'Pending ICT Printing'
  requestType: 'Student ID Card'
  requestedAt: string
}

const STUDENT_STORAGE_KEY = 'nexusSIS_registered_students'
const STRUCTURE_KEY = 'nexusSIS_academic_structure'
const SETTINGS_KEY = 'nexusSIS_academic_settings'
const ICT_QUEUE_KEY = 'nexusSIS_ict_registration_queue'
const SYSTEM_CONFIG_KEY = 'nexusSIS_system_configuration'

const provinces = [
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
  'Southern Highlands',
  'West New Britain',
  'Western',
  'Western Highlands',
  'West Sepik',
  'National Capital District',
  'Bougainville',
  'Other',
]

const emptyForm = {
  applicationNumber: '',
  firstName: '',
  middleName: '',
  lastName: '',
  sex: '',
  dateOfBirth: '',
  email: '',
  phone: '',
  province: '',
  country: 'Papua New Guinea',
  programme: '',
  programmeCode: '',
  faculty: '',
  department: '',
  intake: 'Semester 1',
  academicYear: '2026',
  studyMode: 'Full Time',
  status: 'Pending' as RegistrationStatus,
  sponsor: 'Self Sponsored',
  previousInstitution: '',
  emergencyName: '',
  emergencyRelationship: '',
  emergencyPhone: '',
  emergencyEmail: '',
  emergencyAddress: '',

}

function createId() {
  return `student-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function createQueueId() {
  return `ict-print-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

type SystemConfiguration = {
  universityName?: string
  universityCode?: string
  institutionLogo?: string
  academicYear?: string
  currentSemester?: string
  nextStudentId?: string
  nextStaffId?: string
  nextLecturerId?: string
  [key: string]: unknown
}

function readSystemConfiguration(): SystemConfiguration {
  if (typeof window === 'undefined') return {}

  try {
    const raw = localStorage.getItem(SYSTEM_CONFIG_KEY)

    if (!raw) return {}

    const parsed = JSON.parse(raw)

    if (!parsed || typeof parsed !== 'object') {
      return {}
    }

    return parsed as SystemConfiguration
  } catch {
    return {}
  }
}

function getNextConfiguredStudentId(
  students: RegisteredStudent[],
):
  | {
      studentId: string
      nextStudentId: string
    }
  | {
      error: string
    } {
  const configuration = readSystemConfiguration()

  const configuredValue = String(
    configuration.nextStudentId ?? '',
  ).trim()

  /*
   * ICT Control Centre is the authority for the
   * institution's Student ID numbering.
   *
   * Registration must not invent a starting number.
   */
  if (!/^\d+$/.test(configuredValue)) {
    return {
      error:
        'Student ID numbering has not been configured by ICT. Please set the Next Student ID Number in ICT Control Centre before registering students.',
    }
  }

  const currentNumber = Number(configuredValue)

  /*
   * The configured value must be a safe integer.
   * We also need one number available for the next
   * Student ID after this registration.
   */
  if (
    !Number.isSafeInteger(currentNumber) ||
    currentNumber < 0 ||
    currentNumber >= Number.MAX_SAFE_INTEGER
  ) {
    return {
      error:
        'The ICT Student ID configuration contains an invalid or exhausted Student ID number. Please correct the Next Student ID Number in ICT Control Centre.',
    }
  }

  const existingIds = new Set(
    students.map((student) =>
      String(student.studentId || '').trim(),
    ),
  )

  let candidate = currentNumber

  /*
   * If ICT's configured number already exists, move
   * forward until an unused number is found.
   *
   * Existing students are never renumbered.
   */
  while (
    existingIds.has(String(candidate)) &&
    candidate < Number.MAX_SAFE_INTEGER
  ) {
    candidate += 1
  }

  if (candidate >= Number.MAX_SAFE_INTEGER) {
    return {
      error:
        'No available Student ID remains in the configured numeric range. Please update the Student ID configuration in ICT Control Centre.',
    }
  }

  return {
    studentId: String(candidate),
    nextStudentId: String(candidate + 1),
  }
}

function saveNextConfiguredStudentId(
  nextStudentId: string,
) {
  if (typeof window === 'undefined') return

  const currentConfiguration =
    readSystemConfiguration()

  const nextConfiguration: SystemConfiguration = {
    ...currentConfiguration,
    nextStudentId,
  }

  localStorage.setItem(
    SYSTEM_CONFIG_KEY,
    JSON.stringify(nextConfiguration),
  )

  /*
   * Notify other NEXUS SIS pages/components that the
   * central institution configuration has changed.
   */
  window.dispatchEvent(
    new Event('nexusSIS_configuration_updated'),
  )
}

function createApplicationNumber(
  students: RegisteredStudent[],
) {
  const year = new Date().getFullYear()

  const existingNumbers = students
    .map((student) => String(student.applicationNumber || ''))
    .filter((number) => number.startsWith(`APP-${year}-`))
    .map((number) => Number(number.split('-').pop()))
    .filter((number) => Number.isFinite(number))

  const nextNumber =
    existingNumbers.length > 0
      ? Math.max(...existingNumbers) + 1
      : 1

  return `APP-${year}-${String(nextNumber).padStart(5, '0')}`
}

function readStudents(): RegisteredStudent[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(STUDENT_STORAGE_KEY)

    if (!raw) return []

    const parsed = JSON.parse(raw)

    return Array.isArray(parsed)
      ? (parsed as RegisteredStudent[])
      : []
  } catch {
    return []
  }
}

function readStructure(): AcademicStructure {
  const fallback: AcademicStructure = {
    faculties: [],
    departments: [],
    programmes: [],
  }

  if (typeof window === 'undefined') return fallback

  try {
    const raw = localStorage.getItem(STRUCTURE_KEY)

    if (!raw) return fallback

    const parsed = JSON.parse(raw)

    return {
      faculties: Array.isArray(parsed.faculties)
        ? parsed.faculties.map(String)
        : [],
      departments: Array.isArray(parsed.departments)
        ? parsed.departments
        : [],
      programmes: Array.isArray(parsed.programmes)
        ? parsed.programmes
        : [],
    }
  } catch {
    return fallback
  }
}

function readAcademicSettings() {
  if (typeof window === 'undefined') {
    return {
      academicYear: '2026',
      semester: 'Semester 1',
      registrationOpen: true,
    }
  }

  try {
    const raw = localStorage.getItem(SETTINGS_KEY)

    if (!raw) {
      return {
        academicYear: '2026',
        semester: 'Semester 1',
        registrationOpen: true,
      }
    }

    const parsed = JSON.parse(raw)

    return {
      academicYear: String(parsed.academicYear ?? '2026'),
      semester: String(parsed.semester ?? 'Semester 1'),
      registrationOpen:
        typeof parsed.registrationOpen === 'boolean'
          ? parsed.registrationOpen
          : true,
    }
  } catch {
    return {
      academicYear: '2026',
      semester: 'Semester 1',
      registrationOpen: true,
    }
  }
}

function readIctQueue(): IctRegistrationQueueItem[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(ICT_QUEUE_KEY)

    if (!raw) return []

    const parsed = JSON.parse(raw)

    return Array.isArray(parsed)
      ? (parsed as IctRegistrationQueueItem[])
      : []
  } catch {
    return []
  }
}


function readCentralStudents(): CentralStudent[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = localStorage.getItem(
      NEXUS_KEYS.students,
    )

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)

    return Array.isArray(parsed)
      ? (parsed as CentralStudent[])
      : []
  } catch {
    return []
  }
}

function saveCentralStudents(
  students: CentralStudent[],
) {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.setItem(
    NEXUS_KEYS.students,
    JSON.stringify(students),
  )

  window.dispatchEvent(
    new Event('nexusSIS_central_students_updated'),
  )
}

function makeCentralReference(
  prefix: string,
  value: string,
) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `${prefix}-${normalized || 'UNASSIGNED'}`
}

function getCentralSemester(
  value: string,
): Semester {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()

  if (
    normalized === 'semester 2' ||
    normalized === 'semester2'
  ) {
    return 'Semester 2'
  }

  if (
    normalized === 'summer' ||
    normalized === 'summer semester'
  ) {
    return 'Summer'
  }

  return 'Semester 1'
}

function getCentralStudentType(
  _student: RegisteredStudent,
): StudentType {
  return 'Undergraduate'
}

function registeredStudentToCentralStudent(
  student: RegisteredStudent,
  existing?: CentralStudent,
): CentralStudent {
  const now = new Date().toISOString()

  return {
    id: student.id,

    studentId:
      student.studentId,

    applicationId:
      student.applicationNumber || undefined,

    firstName:
      student.firstName,

    middleName:
      student.middleName || undefined,

    lastName:
      student.lastName,

    fullName: [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),

    gender:
      student.sex || undefined,

    dateOfBirth:
      student.dateOfBirth || undefined,

    nationality:
      student.country || undefined,

    province:
      student.province || undefined,

    phone:
      student.phone || undefined,

    email:
      student.email || undefined,

    address:
      undefined,

    facultyId:
      makeCentralReference(
        'FAC',
        student.faculty,
      ),

    departmentId:
      makeCentralReference(
        'DEPT',
        student.department,
      ),

    programmeId:
      makeCentralReference(
        'PROG',
        student.programmeCode ||
          student.programme,
      ),

    facultyName:
      student.faculty || undefined,

    departmentName:
      student.department || undefined,

    programmeName:
      student.programme || undefined,

    studentType:
      getCentralStudentType(student),

    yearLevel:
      existing?.yearLevel || 1,

    academicYear:
      student.academicYear,

    semester:
      getCentralSemester(
        student.intake,
      ),

    sponsor:
      student.sponsor || undefined,

    previousInstitution:
      student.previousInstitution || undefined,

    status:
      student.status,

    registrationDate:
      student.registrationDate,

    createdAt:
      existing?.createdAt || now,

    updatedAt:
      now,
  }
}

function syncStudentToCentralRecord(
  student: RegisteredStudent,
) {
  const centralStudents =
    readCentralStudents()

  const existing =
    centralStudents.find(
      (item) =>
        item.id === student.id ||
        String(item.studentId || '').trim() ===
          String(student.studentId || '').trim(),
    )

  const centralStudent =
    registeredStudentToCentralStudent(
      student,
      existing,
    )

  const nextStudents = existing
    ? centralStudents.map((item) =>
        item.id === existing.id ||
        String(item.studentId || '').trim() ===
          String(student.studentId || '').trim()
          ? centralStudent
          : item,
      )
    : [
        ...centralStudents,
        centralStudent,
      ]

  saveCentralStudents(nextStudents)
}

function removeStudentFromCentralRecord(
  student: RegisteredStudent,
) {
  const centralStudents =
    readCentralStudents()

  const nextStudents =
    centralStudents.filter(
      (item) =>
        item.id !== student.id &&
        String(item.studentId || '').trim() !==
          String(student.studentId || '').trim(),
    )

  saveCentralStudents(nextStudents)
}

export default function StudentRegistrationPage() {
  const [students, setStudents] = useState<RegisteredStudent[]>([])
  const [structure, setStructure] =
    useState<AcademicStructure>({
      faculties: [],
      departments: [],
      programmes: [],
    })

  const [academicYear, setAcademicYear] = useState('2026')
  const [registrationOpen, setRegistrationOpen] = useState(true)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [programmeFilter, setProgrammeFilter] = useState('All')

  const [showModal, setShowModal] = useState(false)
  const [selectedStudent, setSelectedStudent] =
    useState<RegisteredStudent | null>(null)

  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [registeredStudent, setRegisteredStudent] =
    useState<RegisteredStudent | null>(null)

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
    const academic = readAcademicSettings()

    setStudents(readStudents())
    setStructure(readStructure())
    setAcademicYear(academic.academicYear)
    setRegistrationOpen(academic.registrationOpen)
  }, [])

  const activeProgrammes = useMemo(
    () =>
      structure.programmes.filter(
        (programme) => programme.status === 'Active',
      ),
    [structure.programmes],
  )

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase()

    return students.filter((student) => {
      const fullName =
        `${student.firstName} ${student.middleName} ${student.lastName}`.toLowerCase()

      const matchesSearch =
        !term ||
        fullName.includes(term) ||
        String(student.studentId || '')
          .toLowerCase()
          .includes(term) ||
        String(student.applicationNumber || '')
          .toLowerCase()
          .includes(term) ||
        String(student.email || '')
          .toLowerCase()
          .includes(term) ||
        String(student.phone || '')
          .toLowerCase()
          .includes(term)

      const matchesStatus =
        statusFilter === 'All' ||
        student.status === statusFilter

      const matchesProgramme =
        programmeFilter === 'All' ||
        student.programmeCode === programmeFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesProgramme
      )
    })
  }, [
    students,
    search,
    statusFilter,
    programmeFilter,
  ])

  const stats = useMemo(() => {
    return {
      total: students.length,
      pending: students.filter(
        (student) => student.status === 'Pending',
      ).length,
      registered: students.filter(
        (student) => student.status === 'Registered',
      ).length,
      deferred: students.filter(
        (student) => student.status === 'Deferred',
      ).length,
    }
  }, [students])

  const selectedFacultyDepartments = useMemo(() => {
    if (!form.faculty) return []

    return structure.departments.filter(
      (department) =>
        department.faculty === form.faculty &&
        department.status === 'Active',
    )
  }, [structure.departments, form.faculty])

  const selectedDepartmentProgrammes = useMemo(() => {
    if (!form.department) return []

    return activeProgrammes.filter(
      (programme) =>
        programme.department === form.department &&
        programme.faculty === form.faculty,
    )
  }, [
    activeProgrammes,
    form.department,
    form.faculty,
  ])

  function saveStudents(nextStudents: RegisteredStudent[]) {
    setStudents(nextStudents)

    localStorage.setItem(
      STUDENT_STORAGE_KEY,
      JSON.stringify(nextStudents),
    )
  }

  function sendToIctForPrinting(
    student: RegisteredStudent,
  ) {
    const queue = readIctQueue()

    const alreadyQueued = queue.some(
      (item) =>
        item.studentId === student.studentId ||
        item.applicationNumber === student.applicationNumber,
    )

    if (alreadyQueued) return

    const queueItem: IctRegistrationQueueItem = {
      id: createQueueId(),
      studentId: student.studentId,
      applicationNumber: student.applicationNumber,
      firstName: student.firstName,
      middleName: student.middleName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.middleName} ${student.lastName}`
        .replace(/\s+/g, ' ')
        .trim(),
      sex: student.sex,
      dateOfBirth: student.dateOfBirth,
      email: student.email,
      phone: student.phone,
      province: student.province,
      country: student.country,
      programme: student.programme,
      programmeCode: student.programmeCode,
      faculty: student.faculty,
      department: student.department,
      academicYear: student.academicYear,
      intake: student.intake,
      studyMode: student.studyMode,
      registrationDate: student.registrationDate,
      photo: '',
      idPrintStatus: 'Pending ICT Printing',
      requestType: 'Student ID Card',
      requestedAt: new Date().toISOString(),
    }

    localStorage.setItem(
      ICT_QUEUE_KEY,
      JSON.stringify([...queue, queueItem]),
    )
  }

  function openRegistration() {
    const nextApplicationNumber =
      createApplicationNumber(students)

    setForm({
      ...emptyForm,
      applicationNumber: nextApplicationNumber,
      academicYear,
      intake:
        readAcademicSettings().semester || 'Semester 1',
    })

    setMessage('')
    setShowModal(true)
  }

  function selectProgramme(programmeCode: string) {
    const programme = activeProgrammes.find(
      (item) => item.code === programmeCode,
    )

    if (!programme) {
      setForm((current) => ({
        ...current,
        programmeCode: '',
        programme: '',
      }))
      return
    }

    setForm((current) => ({
      ...current,
      programmeCode: programme.code,
      programme: programme.name,
      faculty: programme.faculty,
      department: programme.department,
      studyMode: programme.mode,
    }))
  }

  async function handleRegister() {
    const firstName = form.firstName.trim()
    const middleName = form.middleName.trim()
    const lastName = form.lastName.trim()
    const email = form.email.trim().toLowerCase()
    const phone = form.phone.trim()
    const applicationNumber = form.applicationNumber.trim().toUpperCase()
    const programmeCode = form.programmeCode.trim()

    if (
      !firstName ||
      !lastName ||
      !form.sex ||
      !form.dateOfBirth ||
      !email ||
      !phone ||
      !form.province ||
      !programmeCode
    ) {
      setMessage(
        'Please complete all required student and programme fields.',
      )
      return
    }

    if (!email.includes('@')) {
      setMessage('Please enter a valid student email address.')
      return
    }

    if (!registrationOpen) {
      setMessage(
        'Student registration is currently closed by the Registrar.',
      )
      return
    }

    const duplicateApplication = students.some(
      (student) =>
        String(student.applicationNumber || '').toLowerCase() ===
        applicationNumber.toLowerCase(),
    )

    if (duplicateApplication) {
      setMessage(
        `Application ${applicationNumber} already exists.`,
      )
      return
    }

    const duplicateEmail = students.some(
      (student) =>
        String(student.email || '').toLowerCase() ===
        email.toLowerCase(),
    )

    if (duplicateEmail) {
      setMessage(
        `A student with the email ${email} is already registered.`,
      )
      return
    }

    const studentIdResult = getNextConfiguredStudentId(students)

    if ('error' in studentIdResult) {
      setMessage(studentIdResult.error)
      return
    }

    const studentId = studentIdResult.studentId

    const duplicateStudentId = students.some(
      (student) =>
        String(student.studentId || '').trim() ===
        studentId,
    )

    if (duplicateStudentId) {
      setMessage(
        `Student ID ${studentId} already exists. Please check the ICT Control Centre Student ID configuration.`,
      )
      return
    }

    const newStudent = {
      id: createId(),
      studentId,
      applicationNumber,
      firstName,
      middleName,
      lastName,
      sex: form.sex,
      dateOfBirth: form.dateOfBirth,
      email,
      phone,
      province: form.province,
      country: form.country.trim() || 'Papua New Guinea',
      programme: form.programme.trim(),
      programmeCode,
      faculty: form.faculty.trim(),
      department: form.department.trim(),
      intake: form.intake,
      academicYear: form.academicYear,
      studyMode: form.studyMode,
      status: form.status,
      registrationDate: new Date().toISOString().slice(0, 10),
      sponsor: form.sponsor.trim(),
      previousInstitution: form.previousInstitution.trim(),
      emergencyName: form.emergencyName.trim(),
      emergencyRelationship: form.emergencyRelationship.trim(),
      emergencyPhone: form.emergencyPhone.trim(),
      emergencyEmail: form.emergencyEmail.trim(),
      emergencyAddress: form.emergencyAddress.trim(),
    }

    try {
      const payload = {
        username:
          `${firstName}.${lastName}.${Date.now()}`
            .replace(/[^a-zA-Z0-9._-]/g, '')
            .toLowerCase()
            .slice(0, 40) || 'student',

        password: 'Password123!',
        email,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        preferred_name: firstName || lastName,
        student_id_num: studentId,
        dob: form.dateOfBirth,
        gender: form.sex,
        nationality: form.country || 'Papua New Guinea',
        ethnicity: 'Unknown',
        permanent_address: form.emergencyAddress || form.province,
        term_address: form.emergencyAddress || form.province,
        phone_number: phone,
        emergency_contact_name: form.emergencyName,
        emergency_contact_relationship: form.emergencyRelationship,
        emergency_contact_phone: form.emergencyPhone,
        emergency_contact_address: form.emergencyAddress,
        college_faculty: form.faculty,
        degree_program: form.programme,
        program_major: form.department,
        academic_advisor: '',
        enrollment_status: 'ACTIVE',
        entry_term: form.intake,
        previous_education: form.previousInstitution,
      }

      const response = await fetch('/api/students/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'Student registration failed')
      }

      const nextStudents = [...students, newStudent]
      saveStudents(nextStudents)

      syncStudentToCentralRecord(newStudent)

      saveNextConfiguredStudentId(studentIdResult.nextStudentId)

      sendToIctForPrinting(newStudent)

      setRegisteredStudent(newStudent)
      setSelectedStudent(newStudent)
      setShowModal(false)
      setMessage('')

      setShowSuccessPopup(true)
    } catch (error) {
      console.error('Student registration failed:', error)

      setMessage(
        error instanceof Error
          ? error.message
          : 'The student could not be registered. Please try again.',
      )
    }
  }

  function updateStatus(
    student: RegisteredStudent,
    status: RegistrationStatus,
  ) {
    const nextStudents = students.map((item) =>
      item.id === student.id
        ? {
            ...item,
            status,
          }
        : item,
    )

    saveStudents(nextStudents)

    /*
     * Keep the central student record synchronized with
     * registration status changes.
     */
    syncStudentToCentralRecord({
      ...student,
      status,
    })

    setSelectedStudent({
      ...student,
      status,
    })

    setMessage(
      `${student.studentId} is now ${status.toLowerCase()}.`,
    )
  }

  function deleteApplication(
    student: RegisteredStudent,
  ) {
    const confirmed = window.confirm(
      `Remove application ${student.applicationNumber}?`,
    )

    if (!confirmed) return

    const nextStudents = students.filter(
      (item) => item.id !== student.id,
    )

    saveStudents(nextStudents)

    /*
     * Remove the corresponding central student record.
     */
    removeStudentFromCentralRecord(student)

    setSelectedStudent(null)

    setMessage(
      `${student.applicationNumber} has been removed.`,
    )
  }

  function exportCsv() {
    const headers = [
      'Student ID',
      'Application Number',
      'First Name',
      'Middle Name',
      'Last Name',
      'Sex',
      'Date of Birth',
      'Email',
      'Phone',
      'Province',
      'Country',
      'Programme Code',
      'Programme',
      'Faculty',
      'Department',
      'Intake',
      'Academic Year',
      'Study Mode',
      'Status',
      'Registration Date',
      'Sponsor',
      'Previous Institution',
    ]

    const escapeCsv = (value: string) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`

    const rows = filteredStudents.map((student) => [
      student.studentId,
      student.applicationNumber,
      student.firstName,
      student.middleName,
      student.lastName,
      student.sex,
      student.dateOfBirth,
      student.email,
      student.phone,
      student.province,
      student.country,
      student.programmeCode,
      student.programme,
      student.faculty,
      student.department,
      student.intake,
      student.academicYear,
      student.studyMode,
      student.status,
      student.registrationDate,
      student.sponsor,
      student.previousInstitution,
    ])

    const csv = [
      headers.map(escapeCsv).join(','),
      ...rows.map((row) =>
        row.map(escapeCsv).join(','),
      ),
    ].join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `nexus-student-registration-${academicYear}.csv`
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
      <header className="border-b border-slate-800 bg-[#071a33] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              Nexus SIS
            </p>

            <h1 className="mt-1 text-2xl font-bold">
              Student Registration & Admissions
            </h1>

            <p className="mt-1 text-sm text-slate-300">
              Register students into the central university student record.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/registrar"
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Registrar
            </a>

            <a
              href="/admin/students"
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Student Master
            </a>

            <button
              onClick={signOut}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-6">
        {message && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800">
            {message}
          </div>
        )}

        {!registrationOpen && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Student registration is currently closed by the Registrar.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Applications
            </p>
            <p className="mt-2 text-3xl font-bold">
              {stats.total}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Pending
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-600">
              {stats.pending}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Registered
            </p>
            <p className="mt-2 text-3xl font-bold text-green-700">
              {stats.registered}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Deferred
            </p>
            <p className="mt-2 text-3xl font-bold text-blue-700">
              {stats.deferred}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid flex-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Search
                </label>

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Name, Student ID, application..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Programme
                </label>

                <select
                  value={programmeFilter}
                  onChange={(event) =>
                    setProgrammeFilter(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="All">
                    All Programmes
                  </option>

                  {activeProgrammes.map((programme) => (
                    <option
                      key={programme.id}
                      value={programme.code}
                    >
                      {programme.code} — {programme.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </label>

                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value)
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="All">
                    All Statuses
                  </option>
                  <option value="Pending">
                    Pending
                  </option>
                  <option value="Registered">
                    Registered
                  </option>
                  <option value="Deferred">
                    Deferred
                  </option>
                  <option value="Withdrawn">
                    Withdrawn
                  </option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={exportCsv}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Export CSV
              </button>

              <button
                onClick={openRegistration}
                disabled={!registrationOpen}
                className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                + Register Student
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold">
              Student Registration Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {filteredStudents.length} record
              {filteredStudents.length === 1 ? '' : 's'} displayed
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Student ID
                  </th>
                  <th className="px-5 py-3">
                    Student
                  </th>
                  <th className="px-5 py-3">
                    Programme
                  </th>
                  <th className="px-5 py-3">
                    Faculty / Department
                  </th>
                  <th className="px-5 py-3">
                    Academic Year
                  </th>
                  <th className="px-5 py-3">
                    Status
                  </th>
                  <th className="px-5 py-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr
                    key={student.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-5 py-4">
                      <p className="font-bold text-blue-700">
                        {student.studentId}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.applicationNumber}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {student.firstName}{' '}
                        {student.middleName}{' '}
                        {student.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.email}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {student.programmeCode}
                      </p>
                      <p className="max-w-xs text-xs text-slate-500">
                        {student.programme}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p>{student.faculty}</p>
                      <p className="text-xs text-slate-500">
                        {student.department}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p>{student.academicYear}</p>
                      <p className="text-xs text-slate-500">
                        {student.intake}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          student.status === 'Registered'
                            ? 'bg-green-100 text-green-700'
                            : student.status === 'Pending'
                              ? 'bg-amber-100 text-amber-700'
                              : student.status === 'Deferred'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() =>
                          setSelectedStudent(student)
                        }
                        className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-5 py-12 text-center text-slate-500"
                    >
                      No student registration records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  Central Student Record
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {selectedStudent.firstName}{' '}
                  {selectedStudent.lastName}
                </h2>

                <p className="text-sm text-slate-500">
                  {selectedStudent.studentId}
                </p>
              </div>

              <button
                onClick={() =>
                  setSelectedStudent(null)
                }
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Application
                </p>
                <p className="mt-1 font-medium">
                  {selectedStudent.applicationNumber}
                </p>
                <p className="text-sm text-slate-500">
                  Registered{' '}
                  {selectedStudent.registrationDate}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Status
                </p>
                <p className="mt-1 font-medium">
                  {selectedStudent.status}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Contact
                </p>
                <p className="mt-1 font-medium">
                  {selectedStudent.email}
                </p>
                <p className="text-sm text-slate-500">
                  {selectedStudent.phone}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Personal Information
                </p>
                <p className="mt-1 text-sm">
                  {selectedStudent.sex} ·{' '}
                  {selectedStudent.dateOfBirth}
                </p>
                <p className="text-sm text-slate-500">
                  {selectedStudent.province},{' '}
                  {selectedStudent.country}
                </p>
              </div>

              <div className="md:col-span-2 rounded-xl border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs font-semibold uppercase text-blue-600">
                  Academic Placement
                </p>

                <p className="mt-1 font-bold">
                  {selectedStudent.programmeCode}
                </p>

                <p className="text-sm text-blue-900">
                  {selectedStudent.programme}
                </p>

                <p className="mt-2 text-sm text-blue-800">
                  {selectedStudent.faculty} ·{' '}
                  {selectedStudent.department}
                </p>

                <p className="text-xs text-blue-700">
                  {selectedStudent.academicYear} ·{' '}
                  {selectedStudent.intake} ·{' '}
                  {selectedStudent.studyMode}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Sponsor
                </p>
                <p className="mt-1 font-medium">
                  {selectedStudent.sponsor ||
                    'Not recorded'}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-slate-400">
                  Previous Institution
                </p>
                <p className="mt-1 font-medium">
                  {selectedStudent.previousInstitution ||
                    'Not recorded'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() =>
                  deleteApplication(selectedStudent)
                }
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Remove
              </button>

              <div className="flex flex-wrap gap-2">
                {selectedStudent.status !== 'Registered' && (
                  <button
                    onClick={() =>
                      updateStatus(
                        selectedStudent,
                        'Registered',
                      )
                    }
                    className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                  >
                    Approve / Register
                  </button>
                )}

                {selectedStudent.status !== 'Deferred' && (
                  <button
                    onClick={() =>
                      updateStatus(
                        selectedStudent,
                        'Deferred',
                      )
                    }
                    className="rounded-lg border border-amber-300 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                  >
                    Defer
                  </button>
                )}

                {selectedStudent.status !== 'Withdrawn' && (
                  <button
                    onClick={() =>
                      updateStatus(
                        selectedStudent,
                        'Withdrawn',
                      )
                    }
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  New Student Registration
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  Student Admission & Registration
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Academic Year {form.academicYear}
                </p>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 p-6">
              <section>
                <h3 className="font-bold">
                  Application Information
                </h3>

                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Application Number
                    </label>

                    <input
                      value={form.applicationNumber}
                      readOnly
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Academic Year
                    </label>

                    <input
                      value={form.academicYear}
                      readOnly
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Intake
                    </label>

                    <select
                      value={form.intake}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          intake: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    >
                      <option>Semester 1</option>
                      <option>Semester 2</option>
                      <option>Summer Semester</option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-bold">
                  Personal Information
                </h3>

                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      First Name *
                    </label>

                    <input
                      value={form.firstName}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          firstName: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Middle Name
                    </label>

                    <input
                      value={form.middleName}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          middleName: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Last Name *
                    </label>

                    <input
                      value={form.lastName}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          lastName: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Sex *
                    </label>

                    <select
                      value={form.sex}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          sex: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    >
                      <option value="">
                        Select sex
                      </option>
                      <option>Male</option>
                      <option>Female</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Date of Birth *
                    </label>

                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          dateOfBirth: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Province *
                    </label>

                    <select
                      value={form.province}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          province: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    >
                      <option value="">
                        Select province
                      </option>

                      {provinces.map((province) => (
                        <option
                          key={province}
                          value={province}
                        >
                          {province}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-bold">
                  Contact Information
                </h3>

                <div className="mt-3 grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Email *
                    </label>

                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          email: event.target.value,
                        })
                      }
                      placeholder="student@example.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Phone *
                    </label>

                    <input
                      value={form.phone}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          phone: event.target.value,
                        })
                      }
                      placeholder="+675 ..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Country
                    </label>

                    <input
                      value={form.country}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          country: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    />
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-bold">
                  Academic Placement
                </h3>

                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Faculty
                    </label>

                    <select
                      value={form.faculty}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          faculty: event.target.value,
                          department: '',
                          programme: '',
                          programmeCode: '',
                            studyMode: 'Full Time',
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    >
                      <option value="">
                        Select faculty
                      </option>

                      {structure.faculties.map(
                        (faculty) => (
                          <option
                            key={faculty}
                            value={faculty}
                          >
                            {faculty}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Department
                    </label>

                    <select
                      value={form.department}
                      onChange={(event) => {
                            const department =
                              event.target.value

                            setForm({
                              ...form,
                              department,
                              programme: '',
                              programmeCode: '',
                              studyMode: 'Full Time',
                            })
                          }}
                          disabled={!form.faculty}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50"
                    >
                      <option value="">
                        Select department
                      </option>

                      {selectedFacultyDepartments.map(
                        (department) => (
                          <option
                            key={department.id}
                            value={department.name}
                          >
                            {department.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-1 block text-sm font-semibold">
                      Programme *
                    </label>

                    <select
                      value={form.programmeCode}
                      onChange={(event) =>
                        selectProgramme(
                          event.target.value,
                        )
                      }
                      disabled={!form.department}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50"
                    >
                      <option value="">
                        Select programme
                      </option>

                      {selectedDepartmentProgrammes.map(
                        (programme) => (
                          <option
                            key={programme.id}
                            value={programme.code}
                          >
                            {programme.code} —{' '}
                            {programme.name}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Study Mode
                    </label>

                    <select
                      value={form.studyMode}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          studyMode: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    >
                      <option>Full Time</option>
                      <option>Part Time</option>
                      <option>Distance Learning</option>
                      <option>Online</option>
                      <option>Blended</option>
                    </select>
                  </div>

                </div>
              </section>

              <section>
                <h3 className="font-bold">
                  Emergency Contact
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  Provide a person the university can contact in case of an emergency.
                </p>

                <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={form.emergencyName}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            emergencyName: e.target.value,
                          }))
                        }
                        placeholder="Emergency contact full name"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Relationship
                      </label>
                      <input
                        type="text"
                        value={form.emergencyRelationship}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            emergencyRelationship: e.target.value,
                          }))
                        }
                        placeholder="e.g. Parent, Guardian, Spouse"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={form.emergencyPhone}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            emergencyPhone: e.target.value,
                          }))
                        }
                        placeholder="Emergency contact phone"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Email
                      </label>
                      <input
                        type="email"
                        value={form.emergencyEmail}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            emergencyEmail: e.target.value,
                          }))
                        }
                        placeholder="Emergency contact email"
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Address
                      </label>
                      <textarea
                        value={form.emergencyAddress}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            emergencyAddress: e.target.value,
                          }))
                        }
                        placeholder="Emergency contact residential address"
                        rows={3}
                        className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                      />
                    </div>
                  </div>

              </section>

              <section>
                <div>
                    <label className="mb-1 block text-sm font-semibold">
                      Sponsor
                    </label>

                    <select
                      value={form.sponsor}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          sponsor: event.target.value,
                        })
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                    >
                      <option>
                        Self Sponsored
                      </option>
                      <option>
                        Government Sponsored
                      </option>
                      <option>
                        University Scholarship
                      </option>
                      <option>
                        External Scholarship
                      </option>
                      <option>
                        Employer Sponsored
                      </option>
                      <option>Other</option>
                    </select>
                </div>
              </section>

              <section>
                <h3 className="font-bold">
                  Previous Education
                </h3>

                <div className="mt-3">
                  <label className="mb-1 block text-sm font-semibold">
                    Previous Institution
                  </label>

                  <input
                    value={form.previousInstitution}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        previousInstitution:
                          event.target.value,
                      })
                    }
                    placeholder="Previous school, college or university"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  />
                </div>
              </section>

              {message && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {message}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={handleRegister}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Register Student
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccessPopup && registeredStudent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="p-7 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <span className="text-3xl text-green-700">
                  ✓
                </span>
              </div>

              <h2 className="mt-5 text-2xl font-bold text-slate-900">
                Student Registered Successfully
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                The student has been added to the central
                university student record.
              </p>

              <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-5 text-left">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Student ID
                    </p>
                    <p className="mt-1 text-lg font-bold text-blue-900">
                      {registeredStudent.studentId}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Application
                    </p>
                    <p className="mt-1 font-semibold text-blue-900">
                      {registeredStudent.applicationNumber}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Student
                    </p>
                    <p className="mt-1 font-semibold text-blue-900">
                      {registeredStudent.firstName}{' '}
                      {registeredStudent.middleName}{' '}
                      {registeredStudent.lastName}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Programme
                    </p>
                    <p className="mt-1 font-semibold text-blue-900">
                      {registeredStudent.programmeCode} —{' '}
                      {registeredStudent.programme}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
                <p className="font-semibold text-amber-900">
                  ICT ID Card Printing
                </p>

                <p className="mt-1 text-sm text-amber-800">
                  The student's information has been sent
                  to the ICT Control Centre for Student ID
                  card printing.
                </p>

                <p className="mt-2 text-xs font-semibold text-amber-700">
                  Status: Pending ICT Printing
                </p>
              </div>

              <button
                onClick={() => {
                  setShowSuccessPopup(false)
                  setRegisteredStudent(null)
                }}
                className="mt-6 w-full rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
