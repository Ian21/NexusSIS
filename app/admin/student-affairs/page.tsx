'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  clearNexusSession,
  protectNexusPage,
} from "@/lib/nexus-access"

import {
  NEXUS_KEYS,
  type CentralStudent,
} from "@/lib/nexus-data"

type Student = {
  id?: string
  studentId?: string
  name: string
  email?: string
  phone?: string
  gender?: string
  faculty?: string
  department?: string
  programme?: string
  yearLevel?: string
  province?: string
  status?: string
}

type CaseStatus =
  | 'Open'
  | 'In Progress'
  | 'Resolved'
  | 'Closed'
  | 'Referred'

type Priority = 'Low' | 'Medium' | 'High' | 'Urgent'

type CaseType =
  | 'Welfare'
  | 'Counselling'
  | 'Discipline'
  | 'Complaint'
  | 'Grievance'

type StudentCase = {
  id: string
  studentId: string
  studentName: string
  type: CaseType
  subject: string
  description: string
  priority: Priority
  status: CaseStatus
  officer: string
  department: string
  dateOpened: string
  lastUpdated: string
  resolution?: string
  confidential: boolean
}

type AppointmentStatus =
  | 'Scheduled'
  | 'Completed'
  | 'Cancelled'
  | 'No Show'

type Appointment = {
  id: string
  studentId: string
  studentName: string
  type: 'Counselling' | 'Welfare'
  counsellor: string
  date: string
  time: string
  location: string
  reason: string
  status: AppointmentStatus
  notes?: string
}

type ClubStatus = 'Active' | 'Inactive' | 'Pending'

type Club = {
  id: string
  name: string
  category: string
  president: string
  advisor: string
  meetingDay: string
  meetingTime: string
  location: string
  members: number
  status: ClubStatus
  description: string
}

type MembershipStatus =
  | 'Active'
  | 'Pending'
  | 'Suspended'
  | 'Left'

type ClubMembership = {
  id: string
  clubId: string
  clubName: string
  studentId: string
  studentName: string
  joinedDate: string
  status: MembershipStatus
}

type Tab =
  | 'dashboard'
  | 'welfare'
  | 'counselling'
  | 'discipline'
  | 'complaints'
  | 'clubs'
  | 'students'

const STORAGE = {
  students: NEXUS_KEYS.students,
  cases: 'nexusSIS_student_affairs_cases',
  appointments: 'nexusSIS_student_affairs_appointments',
  clubs: 'nexusSIS_student_affairs_clubs',
  memberships: 'nexusSIS_student_affairs_memberships',
}

const fallbackStudents: Student[] = [
  {
    id: 'student-1',
    studentId: 'NXS2600001',
    name: 'David Maima',
    email: 'david.maima@student.nexus.edu',
    phone: '70000001',
    gender: 'Male',
    faculty: 'Faculty of Science',
    department: 'Computer Science',
    programme: 'Bachelor of Computer Science',
    yearLevel: 'Year 1',
    province: 'National Capital District',
    status: 'Registered',
  },
  {
    id: 'student-2',
    studentId: 'NXS2600002',
    name: 'Mary Kila',
    email: 'mary.kila@student.nexus.edu',
    phone: '70000002',
    gender: 'Female',
    faculty: 'Faculty of Business',
    department: 'Business',
    programme: 'Bachelor of Business',
    yearLevel: 'Year 1',
    province: 'Central',
    status: 'Registered',
  },
]

const fallbackCases: StudentCase[] = [
  {
    id: 'CASE-0001',
    studentId: 'NXS2600001',
    studentName: 'David Maima',
    type: 'Welfare',
    subject: 'Student Welfare Support',
    description:
      'Student requested assistance with personal and academic welfare matters.',
    priority: 'Medium',
    status: 'In Progress',
    officer: 'Dean of Students',
    department: 'Student Welfare',
    dateOpened: '2026-02-10',
    lastUpdated: '2026-02-12',
    confidential: true,
  },
  {
    id: 'CASE-0002',
    studentId: 'NXS2600002',
    studentName: 'Mary Kila',
    type: 'Counselling',
    subject: 'Academic Stress',
    description:
      'Student referred for counselling support relating to academic workload.',
    priority: 'Medium',
    status: 'Open',
    officer: 'Student Counsellor',
    department: 'Counselling',
    dateOpened: '2026-02-14',
    lastUpdated: '2026-02-14',
    confidential: true,
  },
]

const fallbackAppointments: Appointment[] = [
  {
    id: 'APT-0001',
    studentId: 'NXS2600002',
    studentName: 'Mary Kila',
    type: 'Counselling',
    counsellor: 'Student Counsellor',
    date: '2026-03-05',
    time: '10:00',
    location: 'Counselling Office',
    reason: 'Academic support',
    status: 'Scheduled',
  },
]

const fallbackClubs: Club[] = [
  {
    id: 'CLUB-0001',
    name: 'Nexus Computing Club',
    category: 'Academic',
    president: 'David Maima',
    advisor: 'Dr. John Wama',
    meetingDay: 'Wednesday',
    meetingTime: '16:00',
    location: 'ICT Laboratory',
    members: 24,
    status: 'Active',
    description:
      'Student club supporting programming, technology and computing activities.',
  },
  {
    id: 'CLUB-0002',
    name: 'Nexus Business Society',
    category: 'Academic',
    president: 'Mary Kila',
    advisor: 'Ms. Mary Kila',
    meetingDay: 'Thursday',
    meetingTime: '16:00',
    location: 'Business Block',
    members: 18,
    status: 'Active',
    description:
      'Student organisation supporting business, entrepreneurship and leadership activities.',
  },
]

const fallbackMemberships: ClubMembership[] = [
  {
    id: 'MEM-0001',
    clubId: 'CLUB-0001',
    clubName: 'Nexus Computing Club',
    studentId: 'NXS2600001',
    studentName: 'David Maima',
    joinedDate: '2026-02-01',
    status: 'Active',
  },
]

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)

    if (!raw) return fallback

    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function studentIdOf(student: Student) {
  return String(student.studentId ?? student.id ?? '')
}

function centralStudentToStudentAffairsStudent(
  student: CentralStudent,
): Student {
  return {
    id: student.id,
    studentId: student.studentId,
    name: student.fullName,
    email: student.email,
    phone: student.phone,
    gender: student.gender,
    faculty: student.facultyName,
    department: student.departmentName,
    programme: student.programmeName,
    yearLevel: String(student.yearLevel),
    province: student.province,
    status: student.status,
  }
}

function readStudentAffairsStudents(): Student[] {
  const central = readStorage<CentralStudent[]>(
    NEXUS_KEYS.students,
    [],
  )

  if (central.length > 0) {
    return central.map(
      centralStudentToStudentAffairsStudent,
    )
  }

  return readStorage<Student[]>(
    'nexusSIS_registered_students',
    fallbackStudents,
  )
}

function formatDate(value?: string) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString()
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function makeId(prefix: string, existing: string[]) {
  const highest = existing.reduce((max, value) => {
    const match = value.match(/(\d+)$/)

    if (!match) return max

    return Math.max(max, Number(match[1]))
  }, 0)

  return `${prefix}-${String(highest + 1).padStart(4, '0')}`
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

export default function StudentAffairsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [cases, setCases] = useState<StudentCase[]>([])
  const [appointments, setAppointments] =
    useState<Appointment[]>([])
  const [clubs, setClubs] = useState<Club[]>([])
  const [memberships, setMemberships] =
    useState<ClubMembership[]>([])

  const [activeTab, setActiveTab] =
    useState<Tab>('dashboard')

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] =
    useState('All')
  const [filterPriority, setFilterPriority] =
    useState('All')

  const [showCaseModal, setShowCaseModal] =
    useState(false)
  const [showAppointmentModal, setShowAppointmentModal] =
    useState(false)
  const [showClubModal, setShowClubModal] =
    useState(false)
  const [showMembershipModal, setShowMembershipModal] =
    useState(false)
  const [showDetails, setShowDetails] =
    useState<StudentCase | null>(null)

  const [editingCaseId, setEditingCaseId] =
    useState<string | null>(null)
  const [editingClubId, setEditingClubId] =
    useState<string | null>(null)

  const [caseForm, setCaseForm] = useState({
    studentId: '',
    type: 'Welfare' as CaseType,
    subject: '',
    description: '',
    priority: 'Medium' as Priority,
    status: 'Open' as CaseStatus,
    officer: 'Dean of Students',
    department: 'Student Welfare',
    confidential: true,
    resolution: '',
  })

  const [appointmentForm, setAppointmentForm] =
    useState({
      studentId: '',
      type: 'Counselling' as
        | 'Counselling'
        | 'Welfare',
      counsellor: 'Student Counsellor',
      date: '',
      time: '',
      location: 'Counselling Office',
      reason: '',
      status: 'Scheduled' as AppointmentStatus,
      notes: '',
    })

  const [clubForm, setClubForm] = useState({
    name: '',
    category: 'Academic',
    president: '',
    advisor: '',
    meetingDay: 'Monday',
    meetingTime: '16:00',
    location: '',
    members: 0,
    status: 'Active' as ClubStatus,
    description: '',
  })

  const [membershipForm, setMembershipForm] =
    useState({
      studentId: '',
      clubId: '',
      status: 'Active' as MembershipStatus,
    })

  useEffect(() => {
    protectNexusPage([
      "Student Affairs",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    const loadedStudents =
      readStudentAffairsStudents()

    const loadedCases = readStorage<StudentCase[]>(
      STORAGE.cases,
      fallbackCases,
    )

    const loadedAppointments =
      readStorage<Appointment[]>(
        STORAGE.appointments,
        fallbackAppointments,
      )

    const loadedClubs = readStorage<Club[]>(
      STORAGE.clubs,
      fallbackClubs,
    )

    const loadedMemberships =
      readStorage<ClubMembership[]>(
        STORAGE.memberships,
        fallbackMemberships,
      )

    setStudents(loadedStudents)
    setCases(loadedCases)
    setAppointments(loadedAppointments)
    setClubs(loadedClubs)
    setMemberships(loadedMemberships)

    const handleStudentsUpdated = () => {
      const updatedStudents =
        readStudentAffairsStudents()

      setStudents(updatedStudents)
    }

    window.addEventListener(
      'nexusSIS_students_updated',
      handleStudentsUpdated,
    )

    window.addEventListener(
      'storage',
      handleStudentsUpdated,
    )

    const firstStudent =
      loadedStudents.length > 0
        ? studentIdOf(loadedStudents[0])
        : ''

    setCaseForm((previous) => ({
      ...previous,
      studentId: firstStudent,
    }))

    setAppointmentForm((previous) => ({
      ...previous,
      studentId: firstStudent,
    }))

    setMembershipForm((previous) => ({
      ...previous,
      studentId: firstStudent,
      clubId:
        loadedClubs.length > 0
          ? loadedClubs[0].id
          : '',
    }))

    return () => {
      window.removeEventListener(
        'nexusSIS_students_updated',
        handleStudentsUpdated,
      )

      window.removeEventListener(
        'storage',
        handleStudentsUpdated,
      )
    }
  }, [])

  function saveCases(nextCases: StudentCase[]) {
    setCases(nextCases)
    writeStorage(STORAGE.cases, nextCases)
  }

  function saveAppointments(
    nextAppointments: Appointment[],
  ) {
    setAppointments(nextAppointments)
    writeStorage(
      STORAGE.appointments,
      nextAppointments,
    )
  }

  function saveClubs(nextClubs: Club[]) {
    setClubs(nextClubs)
    writeStorage(STORAGE.clubs, nextClubs)
  }

  function saveMemberships(
    nextMemberships: ClubMembership[],
  ) {
    setMemberships(nextMemberships)
    writeStorage(
      STORAGE.memberships,
      nextMemberships,
    )
  }

  function openNewCase() {
    const firstStudent =
      students.length > 0
        ? studentIdOf(students[0])
        : ''

    setEditingCaseId(null)

    setCaseForm({
      studentId: firstStudent,
      type: 'Welfare',
      subject: '',
      description: '',
      priority: 'Medium',
      status: 'Open',
      officer: 'Dean of Students',
      department: 'Student Welfare',
      confidential: true,
      resolution: '',
    })

    setShowCaseModal(true)
  }

  function openEditCase(item: StudentCase) {
    setEditingCaseId(item.id)

    setCaseForm({
      studentId: item.studentId,
      type: item.type,
      subject: item.subject,
      description: item.description,
      priority: item.priority,
      status: item.status,
      officer: item.officer,
      department: item.department,
      confidential: item.confidential,
      resolution: item.resolution || '',
    })

    setShowCaseModal(true)
  }

  function saveCase() {
    const student = students.find(
      (item) =>
        studentIdOf(item) === caseForm.studentId,
    )

    if (!student) {
      alert('Please select a student.')
      return
    }

    if (
      !caseForm.subject.trim() ||
      !caseForm.description.trim()
    ) {
      alert('Subject and description are required.')
      return
    }

    const existing = editingCaseId
      ? cases.find(
          (item) => item.id === editingCaseId,
        )
      : undefined

    const record: StudentCase = {
      id:
        editingCaseId ||
        makeId(
          'CASE',
          cases.map((item) => item.id),
        ),
      studentId: studentIdOf(student),
      studentName: student.name,
      type: caseForm.type,
      subject: caseForm.subject.trim(),
      description: caseForm.description.trim(),
      priority: caseForm.priority,
      status: caseForm.status,
      officer: caseForm.officer.trim(),
      department: caseForm.department.trim(),
      dateOpened:
        existing?.dateOpened || today(),
      lastUpdated: today(),
      resolution: caseForm.resolution.trim(),
      confidential: caseForm.confidential,
    }

    const nextCases = editingCaseId
      ? cases.map((item) =>
          item.id === editingCaseId
            ? record
            : item,
        )
      : [record, ...cases]

    saveCases(nextCases)
    setShowCaseModal(false)
    setEditingCaseId(null)
  }

  function deleteCase(id: string) {
    if (
      !confirm(
        'Delete this student affairs case?',
      )
    ) {
      return
    }

    saveCases(
      cases.filter((item) => item.id !== id),
    )
  }

  function updateCaseStatus(
    id: string,
    status: CaseStatus,
  ) {
    const nextCases = cases.map((item) =>
      item.id === id
        ? {
            ...item,
            status,
            lastUpdated: today(),
          }
        : item,
    )

    saveCases(nextCases)
  }

  function openNewAppointment() {
    setAppointmentForm({
      studentId:
        students.length > 0
          ? studentIdOf(students[0])
          : '',
      type: 'Counselling',
      counsellor: 'Student Counsellor',
      date: '',
      time: '',
      location: 'Counselling Office',
      reason: '',
      status: 'Scheduled',
      notes: '',
    })

    setShowAppointmentModal(true)
  }

  function saveAppointment() {
    const student = students.find(
      (item) =>
        studentIdOf(item) ===
        appointmentForm.studentId,
    )

    if (!student) {
      alert('Please select a student.')
      return
    }

    if (
      !appointmentForm.date ||
      !appointmentForm.time ||
      !appointmentForm.reason.trim()
    ) {
      alert(
        'Date, time and reason are required.',
      )
      return
    }

    const record: Appointment = {
      id: makeId(
        'APT',
        appointments.map((item) => item.id),
      ),
      studentId: studentIdOf(student),
      studentName: student.name,
      type: appointmentForm.type,
      counsellor:
        appointmentForm.counsellor.trim() ||
        'Student Counsellor',
      date: appointmentForm.date,
      time: appointmentForm.time,
      location:
        appointmentForm.location.trim() ||
        'Counselling Office',
      reason: appointmentForm.reason.trim(),
      status: appointmentForm.status,
      notes: appointmentForm.notes.trim(),
    }

    saveAppointments([record, ...appointments])
    setShowAppointmentModal(false)
  }

  function updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
  ) {
    saveAppointments(
      appointments.map((item) =>
        item.id === id
          ? { ...item, status }
          : item,
      ),
    )
  }

  function deleteAppointment(id: string) {
    if (
      !confirm(
        'Delete this appointment record?',
      )
    ) {
      return
    }

    saveAppointments(
      appointments.filter(
        (item) => item.id !== id,
      ),
    )
  }

  function openNewClub() {
    setEditingClubId(null)

    setClubForm({
      name: '',
      category: 'Academic',
      president: '',
      advisor: '',
      meetingDay: 'Monday',
      meetingTime: '16:00',
      location: '',
      members: 0,
      status: 'Active',
      description: '',
    })

    setShowClubModal(true)
  }

  function openEditClub(club: Club) {
    setEditingClubId(club.id)

    setClubForm({
      name: club.name,
      category: club.category,
      president: club.president,
      advisor: club.advisor,
      meetingDay: club.meetingDay,
      meetingTime: club.meetingTime,
      location: club.location,
      members: club.members,
      status: club.status,
      description: club.description,
    })

    setShowClubModal(true)
  }

  function saveClub() {
    if (!clubForm.name.trim()) {
      alert('Club name is required.')
      return
    }

    const record: Club = {
      id:
        editingClubId ||
        makeId(
          'CLUB',
          clubs.map((item) => item.id),
        ),
      name: clubForm.name.trim(),
      category: clubForm.category.trim(),
      president: clubForm.president.trim(),
      advisor: clubForm.advisor.trim(),
      meetingDay: clubForm.meetingDay,
      meetingTime: clubForm.meetingTime,
      location: clubForm.location.trim(),
      members: Number(clubForm.members || 0),
      status: clubForm.status,
      description: clubForm.description.trim(),
    }

    const nextClubs = editingClubId
      ? clubs.map((item) =>
          item.id === editingClubId
            ? record
            : item,
        )
      : [record, ...clubs]

    saveClubs(nextClubs)
    setShowClubModal(false)
    setEditingClubId(null)
  }

  function deleteClub(id: string) {
    if (
      !confirm(
        'Delete this student club? Existing membership records will remain unless removed separately.',
      )
    ) {
      return
    }

    saveClubs(
      clubs.filter((item) => item.id !== id),
    )
  }

  function toggleClubStatus(id: string) {
    const nextClubs: Club[] = clubs.map(
      (club) => {
        const nextStatus: ClubStatus =
          club.status === 'Active'
            ? 'Inactive'
            : 'Active'

        return club.id === id
          ? { ...club, status: nextStatus }
          : club
      },
    )

    saveClubs(nextClubs)
  }

  function openNewMembership() {
    setMembershipForm({
      studentId:
        students.length > 0
          ? studentIdOf(students[0])
          : '',
      clubId:
        clubs.length > 0
          ? clubs[0].id
          : '',
      status: 'Active',
    })

    setShowMembershipModal(true)
  }

  function saveMembership() {
    const student = students.find(
      (item) =>
        studentIdOf(item) ===
        membershipForm.studentId,
    )

    const club = clubs.find(
      (item) =>
        item.id === membershipForm.clubId,
    )

    if (!student || !club) {
      alert(
        'Please select both a student and club.',
      )
      return
    }

    const duplicate = memberships.some(
      (item) =>
        item.studentId ===
          studentIdOf(student) &&
        item.clubId === club.id &&
        item.status !== 'Left',
    )

    if (duplicate) {
      alert(
        'This student already has an active membership in this club.',
      )
      return
    }

    const record: ClubMembership = {
      id: makeId(
        'MEM',
        memberships.map((item) => item.id),
      ),
      clubId: club.id,
      clubName: club.name,
      studentId: studentIdOf(student),
      studentName: student.name,
      joinedDate: today(),
      status: membershipForm.status,
    }

    saveMemberships([
      record,
      ...memberships,
    ])

    saveClubs(
      clubs.map((item) =>
        item.id === club.id
          ? {
              ...item,
              members:
                item.members + 1,
            }
          : item,
      ),
    )

    setShowMembershipModal(false)
  }

  function updateMembershipStatus(
    id: string,
    status: MembershipStatus,
  ) {
    const existing = memberships.find(
      (item) => item.id === id,
    )

    if (!existing) return

    const nextMemberships =
      memberships.map((item) =>
        item.id === id
          ? { ...item, status }
          : item,
      )

    saveMemberships(nextMemberships)

    if (
      status === 'Left' &&
      existing.status !== 'Left'
    ) {
      saveClubs(
        clubs.map((club) =>
          club.id === existing.clubId
            ? {
                ...club,
                members: Math.max(
                  0,
                  club.members - 1,
                ),
              }
            : club,
        ),
      )
    }
  }

  function deleteMembership(id: string) {
    if (
      !confirm(
        'Delete this membership record?',
      )
    ) {
      return
    }

    saveMemberships(
      memberships.filter(
        (item) => item.id !== id,
      ),
    )
  }

  function exportCases() {
    downloadCsv(
      'nexus-student-affairs-cases.csv',
      [
        [
          'Case ID',
          'Student ID',
          'Student',
          'Type',
          'Subject',
          'Priority',
          'Status',
          'Officer',
          'Department',
          'Date Opened',
          'Last Updated',
          'Confidential',
        ],
        ...cases.map((item) => [
          item.id,
          item.studentId,
          item.studentName,
          item.type,
          item.subject,
          item.priority,
          item.status,
          item.officer,
          item.department,
          item.dateOpened,
          item.lastUpdated,
          item.confidential
            ? 'Yes'
            : 'No',
        ]),
      ],
    )
  }

  function exportAppointments() {
    downloadCsv(
      'nexus-student-affairs-appointments.csv',
      [
        [
          'Appointment ID',
          'Student ID',
          'Student',
          'Type',
          'Counsellor',
          'Date',
          'Time',
          'Location',
          'Reason',
          'Status',
        ],
        ...appointments.map((item) => [
          item.id,
          item.studentId,
          item.studentName,
          item.type,
          item.counsellor,
          item.date,
          item.time,
          item.location,
          item.reason,
          item.status,
        ]),
      ],
    )
  }

  function exportClubs() {
    downloadCsv(
      'nexus-student-clubs.csv',
      [
        [
          'Club ID',
          'Club Name',
          'Category',
          'President',
          'Advisor',
          'Meeting Day',
          'Meeting Time',
          'Location',
          'Members',
          'Status',
        ],
        ...clubs.map((item) => [
          item.id,
          item.name,
          item.category,
          item.president,
          item.advisor,
          item.meetingDay,
          item.meetingTime,
          item.location,
          item.members,
          item.status,
        ]),
      ],
    )
  }

  function signOut() {
    clearNexusSession()
    window.location.href = '/dashboard'
  }

  const openCases = cases.filter(
    (item) =>
      item.status === 'Open' ||
      item.status === 'In Progress' ||
      item.status === 'Referred',
  ).length

  const urgentCases = cases.filter(
    (item) =>
      item.priority === 'Urgent' ||
      item.priority === 'High',
  ).length

  const upcomingAppointments =
    appointments.filter(
      (item) =>
        item.status === 'Scheduled' &&
        item.date >= today(),
    ).length

  const activeClubs = clubs.filter(
    (item) => item.status === 'Active',
  ).length

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase()

    return cases.filter((item) => {
      const matchesSearch =
        !query ||
        item.id.toLowerCase().includes(query) ||
        item.studentId
          .toLowerCase()
          .includes(query) ||
        item.studentName
          .toLowerCase()
          .includes(query) ||
        item.subject
          .toLowerCase()
          .includes(query) ||
        item.type.toLowerCase().includes(query)

      const matchesStatus =
        filterStatus === 'All' ||
        item.status === filterStatus

      const matchesPriority =
        filterPriority === 'All' ||
        item.priority === filterPriority

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority
      )
    })
  }, [
    cases,
    search,
    filterStatus,
    filterPriority,
  ])

  const welfareCases = filteredCases.filter(
    (item) => item.type === 'Welfare',
  )

  const counsellingCases =
    filteredCases.filter(
      (item) => item.type === 'Counselling',
    )

  const disciplineCases =
    filteredCases.filter(
      (item) => item.type === 'Discipline',
    )

  const complaintCases =
    filteredCases.filter(
      (item) =>
        item.type === 'Complaint' ||
        item.type === 'Grievance',
    )

  const filteredAppointments =
    appointments.filter((item) => {
      const query = search.trim().toLowerCase()

      return (
        !query ||
        item.id.toLowerCase().includes(query) ||
        item.studentId
          .toLowerCase()
          .includes(query) ||
        item.studentName
          .toLowerCase()
          .includes(query) ||
        item.reason
          .toLowerCase()
          .includes(query) ||
        item.type.toLowerCase().includes(query)
      )
    })

  const filteredClubs = clubs.filter((item) => {
    const query = search.trim().toLowerCase()

    return (
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query) ||
      item.president
        .toLowerCase()
        .includes(query) ||
      item.advisor
        .toLowerCase()
        .includes(query)
    )
  })

  const filteredStudents =
    students.filter((student) => {
      const query = search.trim().toLowerCase()

      return (
        !query ||
        studentIdOf(student)
          .toLowerCase()
          .includes(query) ||
        student.name
          .toLowerCase()
          .includes(query) ||
        String(student.faculty || '')
          .toLowerCase()
          .includes(query) ||
        String(student.department || '')
          .toLowerCase()
          .includes(query) ||
        String(student.programme || '')
          .toLowerCase()
          .includes(query)
      )
    })

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
                Student Affairs
              </h1>

              <p className="mt-1 text-sm text-slate-300">
                Welfare, counselling, discipline, complaints and student activities.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/student-portal"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Student Portal
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <PortalStat
            label="Open Cases"
            value={openCases}
            icon="📁"
          />

          <PortalStat
            label="High / Urgent"
            value={urgentCases}
            icon="⚠️"
          />

          <PortalStat
            label="Upcoming Appointments"
            value={upcomingAppointments}
            icon="📅"
          />

          <PortalStat
            label="Active Clubs"
            value={activeClubs}
            icon="🎓"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
            <PortalTab
              active={activeTab === 'dashboard'}
              onClick={() => {
                setActiveTab('dashboard')
                setSearch('')
              }}
            >
              Dashboard
            </PortalTab>

            <PortalTab
              active={activeTab === 'welfare'}
              onClick={() => {
                setActiveTab('welfare')
                setSearch('')
              }}
            >
              Welfare
            </PortalTab>

            <PortalTab
              active={activeTab === 'counselling'}
              onClick={() => {
                setActiveTab('counselling')
                setSearch('')
              }}
            >
              Counselling
            </PortalTab>

            <PortalTab
              active={activeTab === 'discipline'}
              onClick={() => {
                setActiveTab('discipline')
                setSearch('')
              }}
            >
              Discipline
            </PortalTab>

            <PortalTab
              active={activeTab === 'complaints'}
              onClick={() => {
                setActiveTab('complaints')
                setSearch('')
              }}
            >
              Complaints / Grievances
            </PortalTab>

            <PortalTab
              active={activeTab === 'clubs'}
              onClick={() => {
                setActiveTab('clubs')
                setSearch('')
              }}
            >
              Clubs & Activities
            </PortalTab>

            <PortalTab
              active={activeTab === 'students'}
              onClick={() => {
                setActiveTab('students')
                setSearch('')
              }}
            >
              Students
            </PortalTab>
          </div>

          <div className="p-6">
            {activeTab !== 'dashboard' && (
              <div className="mb-5 flex flex-col gap-3 lg:flex-row">
                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search Student ID, student name, subject..."
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                {(activeTab === 'welfare' ||
                  activeTab === 'counselling' ||
                  activeTab === 'discipline' ||
                  activeTab === 'complaints') && (
                  <>
                    <select
                      value={filterStatus}
                      onChange={(event) =>
                        setFilterStatus(
                          event.target.value,
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
                    >
                      <option value="All">
                        All Statuses
                      </option>
                      <option value="Open">
                        Open
                      </option>
                      <option value="In Progress">
                        In Progress
                      </option>
                      <option value="Referred">
                        Referred
                      </option>
                      <option value="Resolved">
                        Resolved
                      </option>
                      <option value="Closed">
                        Closed
                      </option>
                    </select>

                    <select
                      value={filterPriority}
                      onChange={(event) =>
                        setFilterPriority(
                          event.target.value,
                        )
                      }
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm"
                    >
                      <option value="All">
                        All Priorities
                      </option>
                      <option value="Low">
                        Low
                      </option>
                      <option value="Medium">
                        Medium
                      </option>
                      <option value="High">
                        High
                      </option>
                      <option value="Urgent">
                        Urgent
                      </option>
                    </select>
                  </>
                )}
              </div>
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                cases={cases}
                appointments={appointments}
                clubs={clubs}
                memberships={memberships}
                students={students}
                openNewCase={openNewCase}
                openNewAppointment={
                  openNewAppointment
                }
                openNewClub={openNewClub}
                openNewMembership={
                  openNewMembership
                }
                setActiveTab={setActiveTab}
              />
            )}

            {activeTab === 'welfare' && (
              <CaseSection
                title="Student Welfare"
                description="Manage student welfare support, referrals and assistance."
                cases={welfareCases}
                emptyMessage="No welfare cases found."
                onNew={openNewCase}
                onEdit={openEditCase}
                onDelete={deleteCase}
                onDetails={setShowDetails}
                onStatus={updateCaseStatus}
                onExport={exportCases}
              />
            )}

            {activeTab === 'counselling' && (
              <CounsellingView
                cases={counsellingCases}
                appointments={
                  filteredAppointments
                }
                onNewCase={openNewCase}
                onNewAppointment={
                  openNewAppointment
                }
                onEditCase={openEditCase}
                onDeleteCase={deleteCase}
                onDetails={setShowDetails}
                onCaseStatus={
                  updateCaseStatus
                }
                onAppointmentStatus={
                  updateAppointmentStatus
                }
                onDeleteAppointment={
                  deleteAppointment
                }
                onExport={exportAppointments}
              />
            )}

            {activeTab === 'discipline' && (
              <CaseSection
                title="Student Discipline"
                description="Track disciplinary cases, actions and resolutions."
                cases={disciplineCases}
                emptyMessage="No discipline cases found."
                onNew={openNewCase}
                onEdit={openEditCase}
                onDelete={deleteCase}
                onDetails={setShowDetails}
                onStatus={updateCaseStatus}
                onExport={exportCases}
              />
            )}

            {activeTab === 'complaints' && (
              <CaseSection
                title="Complaints & Grievances"
                description="Register, investigate and track student complaints and grievances."
                cases={complaintCases}
                emptyMessage="No complaints or grievances found."
                onNew={openNewCase}
                onEdit={openEditCase}
                onDelete={deleteCase}
                onDetails={setShowDetails}
                onStatus={updateCaseStatus}
                onExport={exportCases}
              />
            )}

            {activeTab === 'clubs' && (
              <ClubsView
                clubs={filteredClubs}
                memberships={memberships}
                onNewClub={openNewClub}
                onEditClub={openEditClub}
                onDeleteClub={deleteClub}
                onToggleClub={toggleClubStatus}
                onNewMembership={
                  openNewMembership
                }
                onMembershipStatus={
                  updateMembershipStatus
                }
                onDeleteMembership={
                  deleteMembership
                }
                onExport={exportClubs}
              />
            )}

            {activeTab === 'students' && (
              <StudentsView
                students={filteredStudents}
                cases={cases}
                appointments={appointments}
                memberships={memberships}
              />
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-5">
          <h3 className="font-bold text-blue-900">
            Student Affairs & Central Student Record
          </h3>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            Every welfare, counselling, discipline and complaint
            record is linked to the central Student ID. Confidential
            case information should ultimately be protected by
            role-based permissions in the central database and audit
            system.
          </p>
        </div>
      </div>

      {showCaseModal && (
        <Modal
          title={
            editingCaseId
              ? 'Edit Student Affairs Case'
              : 'New Student Affairs Case'
          }
          onClose={() =>
            setShowCaseModal(false)
          }
          wide
        >
          <div className="grid gap-5 md:grid-cols-2">
            <FormField label="Student">
              <select
                value={caseForm.studentId}
                onChange={(event) =>
                  setCaseForm({
                    ...caseForm,
                    studentId:
                      event.target.value,
                  })
                }
                className="input"
              >
                {students.map((student) => (
                  <option
                    key={studentIdOf(student)}
                    value={studentIdOf(student)}
                  >
                    {studentIdOf(student)} -{' '}
                    {student.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Case Type">
              <select
                value={caseForm.type}
                onChange={(event) => {
                  const type =
                    event.target.value as CaseType

                  const department =
                    type === 'Welfare'
                      ? 'Student Welfare'
                      : type === 'Counselling'
                        ? 'Counselling'
                        : type === 'Discipline'
                          ? 'Student Discipline'
                          : 'Complaints & Grievances'

                  const officer =
                    type === 'Discipline'
                      ? 'Dean of Students'
                      : type === 'Counselling'
                        ? 'Student Counsellor'
                        : 'Dean of Students'

                  setCaseForm({
                    ...caseForm,
                    type,
                    department,
                    officer,
                  })
                }}
                className="input"
              >
                <option value="Welfare">
                  Welfare
                </option>
                <option value="Counselling">
                  Counselling
                </option>
                <option value="Discipline">
                  Discipline
                </option>
                <option value="Complaint">
                  Complaint
                </option>
                <option value="Grievance">
                  Grievance
                </option>
              </select>
            </FormField>

            <FormField label="Subject">
              <input
                value={caseForm.subject}
                onChange={(event) =>
                  setCaseForm({
                    ...caseForm,
                    subject:
                      event.target.value,
                  })
                }
                className="input"
                placeholder="Case subject"
              />
            </FormField>

            <FormField label="Priority">
              <select
                value={caseForm.priority}
                onChange={(event) =>
                  setCaseForm({
                    ...caseForm,
                    priority:
                      event.target
                        .value as Priority,
                  })
                }
                className="input"
              >
                <option value="Low">
                  Low
                </option>
                <option value="Medium">
                  Medium
                </option>
                <option value="High">
                  High
                </option>
                <option value="Urgent">
                  Urgent
                </option>
              </select>
            </FormField>

            <FormField label="Status">
              <select
                value={caseForm.status}
                onChange={(event) =>
                  setCaseForm({
                    ...caseForm,
                    status:
                      event.target
                        .value as CaseStatus,
                  })
                }
                className="input"
              >
                <option value="Open">
                  Open
                </option>
                <option value="In Progress">
                  In Progress
                </option>
                <option value="Referred">
                  Referred
                </option>
                <option value="Resolved">
                  Resolved
                </option>
                <option value="Closed">
                  Closed
                </option>
              </select>
            </FormField>

            <FormField label="Responsible Officer">
              <input
                value={caseForm.officer}
                onChange={(event) =>
                  setCaseForm({
                    ...caseForm,
                    officer:
                      event.target.value,
                  })
                }
                className="input"
              />
            </FormField>

            <FormField label="Department">
              <input
                value={caseForm.department}
                onChange={(event) =>
                  setCaseForm({
                    ...caseForm,
                    department:
                      event.target.value,
                  })
                }
                className="input"
              />
            </FormField>

            <FormField label="Confidential">
              <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-300 px-4 text-sm">
                <input
                  type="checkbox"
                  checked={caseForm.confidential}
                  onChange={(event) =>
                    setCaseForm({
                      ...caseForm,
                      confidential:
                        event.target.checked,
                    })
                  }
                />

                Mark this record as confidential.
              </label>
            </FormField>

            <div className="md:col-span-2">
              <FormField label="Description">
                <textarea
                  value={caseForm.description}
                  onChange={(event) =>
                    setCaseForm({
                      ...caseForm,
                      description:
                        event.target.value,
                    })
                  }
                  rows={5}
                  className="input"
                  placeholder="Describe the case..."
                />
              </FormField>
            </div>

            <div className="md:col-span-2">
              <FormField label="Resolution / Action Taken">
                <textarea
                  value={caseForm.resolution}
                  onChange={(event) =>
                    setCaseForm({
                      ...caseForm,
                      resolution:
                        event.target.value,
                    })
                  }
                  rows={4}
                  className="input"
                  placeholder="Record resolution or action taken when applicable..."
                />
              </FormField>
            </div>
          </div>

          <ModalActions
            onCancel={() =>
              setShowCaseModal(false)
            }
            onSave={saveCase}
            saveLabel={
              editingCaseId
                ? 'Update Case'
                : 'Create Case'
            }
          />
        </Modal>
      )}

      {showAppointmentModal && (
        <Modal
          title="New Counselling / Welfare Appointment"
          onClose={() =>
            setShowAppointmentModal(false)
          }
        >
          <div className="space-y-5">
            <FormField label="Student">
              <select
                value={appointmentForm.studentId}
                onChange={(event) =>
                  setAppointmentForm({
                    ...appointmentForm,
                    studentId:
                      event.target.value,
                  })
                }
                className="input"
              >
                {students.map((student) => (
                  <option
                    key={studentIdOf(student)}
                    value={studentIdOf(student)}
                  >
                    {studentIdOf(student)} -{' '}
                    {student.name}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Appointment Type">
                <select
                  value={appointmentForm.type}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      type:
                        event.target
                          .value as
                          | 'Counselling'
                          | 'Welfare',
                    })
                  }
                  className="input"
                >
                  <option value="Counselling">
                    Counselling
                  </option>
                  <option value="Welfare">
                    Welfare
                  </option>
                </select>
              </FormField>

              <FormField label="Counsellor / Officer">
                <input
                  value={
                    appointmentForm.counsellor
                  }
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      counsellor:
                        event.target.value,
                    })
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Date">
                <input
                  type="date"
                  value={appointmentForm.date}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      date: event.target.value,
                    })
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Time">
                <input
                  type="time"
                  value={appointmentForm.time}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      time: event.target.value,
                    })
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Location">
                <input
                  value={appointmentForm.location}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      location:
                        event.target.value,
                    })
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Status">
                <select
                  value={appointmentForm.status}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      status:
                        event.target
                          .value as AppointmentStatus,
                    })
                  }
                  className="input"
                >
                  <option value="Scheduled">
                    Scheduled
                  </option>
                  <option value="Completed">
                    Completed
                  </option>
                  <option value="Cancelled">
                    Cancelled
                  </option>
                  <option value="No Show">
                    No Show
                  </option>
                </select>
              </FormField>
            </div>

            <FormField label="Reason">
              <textarea
                value={appointmentForm.reason}
                onChange={(event) =>
                  setAppointmentForm({
                    ...appointmentForm,
                    reason:
                      event.target.value,
                  })
                }
                rows={4}
                className="input"
                placeholder="Reason for appointment..."
              />
            </FormField>

            <FormField label="Notes">
              <textarea
                value={appointmentForm.notes}
                onChange={(event) =>
                  setAppointmentForm({
                    ...appointmentForm,
                    notes:
                      event.target.value,
                  })
                }
                rows={3}
                className="input"
                placeholder="Additional notes..."
              />
            </FormField>
          </div>

          <ModalActions
            onCancel={() =>
              setShowAppointmentModal(false)
            }
            onSave={saveAppointment}
            saveLabel="Schedule Appointment"
          />
        </Modal>
      )}

      {showClubModal && (
        <Modal
          title={
            editingClubId
              ? 'Edit Student Club'
              : 'New Student Club'
          }
          onClose={() =>
            setShowClubModal(false)
          }
        >
          <div className="space-y-5">
            <FormField label="Club Name">
              <input
                value={clubForm.name}
                onChange={(event) =>
                  setClubForm({
                    ...clubForm,
                    name: event.target.value,
                  })
                }
                className="input"
                placeholder="Club or organisation name"
              />
            </FormField>

            <div className="grid gap-5 sm:grid-cols-2">
              <FormField label="Category">
                <select
                  value={clubForm.category}
                  onChange={(event) =>
                    setClubForm({
                      ...clubForm,
                      category:
                        event.target.value,
                    })
                  }
                  className="input"
                >
                  <option value="Academic">
                    Academic
                  </option>
                  <option value="Cultural">
                    Cultural
                  </option>
                  <option value="Sports">
                    Sports
                  </option>
                  <option value="Religious">
                    Religious
                  </option>
                  <option value="Social">
                    Social
                  </option>
                  <option value="Professional">
                    Professional
                  </option>
                  <option value="Other">
                    Other
                  </option>
                </select>
              </FormField>

              <FormField label="Status">
                <select
                  value={clubForm.status}
                  onChange={(event) =>
                    setClubForm({
                      ...clubForm,
                      status:
                        event.target
                          .value as ClubStatus,
                    })
                  }
                  className="input"
                >
                  <option value="Active">
                    Active
                  </option>
                  <option value="Inactive">
                    Inactive
                  </option>
                  <option value="Pending">
                    Pending
                  </option>
                </select>
              </FormField>

              <FormField label="President">
                <input
                  value={clubForm.president}
                  onChange={(event) =>
                    setClubForm({
                      ...clubForm,
                      president:
                        event.target.value,
                    })
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Staff Advisor">
                <input
                  value={clubForm.advisor}
                  onChange={(event) =>
                    setClubForm({
                      ...clubForm,
                      advisor:
                        event.target.value,
                    })
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Meeting Day">
                <select
                  value={clubForm.meetingDay}
                  onChange={(event) =>
                    setClubForm({
                      ...clubForm,
                      meetingDay:
                        event.target.value,
                    })
                  }
                  className="input"
                >
                  <option value="Monday">
                    Monday
                  </option>
                  <option value="Tuesday">
                    Tuesday
                  </option>
                  <option value="Wednesday">
                    Wednesday
                  </option>
                  <option value="Thursday">
                    Thursday
                  </option>
                  <option value="Friday">
                    Friday
                  </option>
                  <option value="Saturday">
                    Saturday
                  </option>
                  <option value="Sunday">
                    Sunday
                  </option>
                </select>
              </FormField>

              <FormField label="Meeting Time">
                <input
                  type="time"
                  value={clubForm.meetingTime}
                  onChange={(event) =>
                    setClubForm({
                      ...clubForm,
                      meetingTime:
                        event.target.value,
                    })
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Meeting Location">
                <input
                  value={clubForm.location}
                  onChange={(event) =>
                    setClubForm({
                      ...clubForm,
                      location:
                        event.target.value,
                    })
                  }
                  className="input"
                />
              </FormField>

              <FormField label="Members">
                <input
                  type="number"
                  min="0"
                  value={clubForm.members}
                  onChange={(event) =>
                    setClubForm({
                      ...clubForm,
                      members:
                        Number(
                          event.target.value,
                        ),
                    })
                  }
                  className="input"
                />
              </FormField>
            </div>

            <FormField label="Description">
              <textarea
                value={clubForm.description}
                onChange={(event) =>
                  setClubForm({
                    ...clubForm,
                    description:
                      event.target.value,
                  })
                }
                rows={4}
                className="input"
                placeholder="Describe the club..."
              />
            </FormField>
          </div>

          <ModalActions
            onCancel={() =>
              setShowClubModal(false)
            }
            onSave={saveClub}
            saveLabel={
              editingClubId
                ? 'Update Club'
                : 'Create Club'
            }
          />
        </Modal>
      )}

      {showMembershipModal && (
        <Modal
          title="Add Club Membership"
          onClose={() =>
            setShowMembershipModal(false)
          }
        >
          <div className="space-y-5">
            <FormField label="Student">
              <select
                value={membershipForm.studentId}
                onChange={(event) =>
                  setMembershipForm({
                    ...membershipForm,
                    studentId:
                      event.target.value,
                  })
                }
                className="input"
              >
                {students.map((student) => (
                  <option
                    key={studentIdOf(student)}
                    value={studentIdOf(student)}
                  >
                    {studentIdOf(student)} -{' '}
                    {student.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Club">
              <select
                value={membershipForm.clubId}
                onChange={(event) =>
                  setMembershipForm({
                    ...membershipForm,
                    clubId:
                      event.target.value,
                  })
                }
                className="input"
              >
                {clubs.map((club) => (
                  <option
                    key={club.id}
                    value={club.id}
                  >
                    {club.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Membership Status">
              <select
                value={membershipForm.status}
                onChange={(event) =>
                  setMembershipForm({
                    ...membershipForm,
                    status:
                      event.target
                        .value as MembershipStatus,
                  })
                }
                className="input"
              >
                <option value="Active">
                  Active
                </option>
                <option value="Pending">
                  Pending
                </option>
                <option value="Suspended">
                  Suspended
                </option>
              </select>
            </FormField>
          </div>

          <ModalActions
            onCancel={() =>
              setShowMembershipModal(false)
            }
            onSave={saveMembership}
            saveLabel="Add Membership"
          />
        </Modal>
      )}

      {showDetails && (
        <CaseDetailsModal
          item={showDetails}
          onClose={() =>
            setShowDetails(null)
          }
          onEdit={() => {
            openEditCase(showDetails)
            setShowDetails(null)
          }}
        />
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          background: white;
          padding: 0.7rem 0.85rem;
          font-size: 0.875rem;
          outline: none;
        }

        .input:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 3px rgb(219 234 254);
        }

        textarea.input {
          resize: vertical;
        }
      `}</style>
    </main>
  )
}

function DashboardView({
  cases,
  appointments,
  clubs,
  memberships,
  students,
  openNewCase,
  openNewAppointment,
  openNewClub,
  openNewMembership,
  setActiveTab,
}: {
  cases: StudentCase[]
  appointments: Appointment[]
  clubs: Club[]
  memberships: ClubMembership[]
  students: Student[]
  openNewCase: () => void
  openNewAppointment: () => void
  openNewClub: () => void
  openNewMembership: () => void
  setActiveTab: (tab: Tab) => void
}) {
  const recentCases = cases.slice(0, 5)
  const upcoming = appointments
    .filter(
      (item) =>
        item.status === 'Scheduled',
    )
    .sort((a, b) =>
      `${a.date} ${a.time}`.localeCompare(
        `${b.date} ${b.time}`,
      ),
    )
    .slice(0, 5)

  const recentClubs = clubs
    .filter((club) => club.status === 'Active')
    .slice(0, 4)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Student Affairs Dashboard
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Central view of student welfare, support and activities.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={openNewCase}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New Case
          </button>

          <button
            onClick={openNewAppointment}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            + Appointment
          </button>

          <button
            onClick={openNewClub}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            + Club
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DepartmentCard
          title="Dean of Students"
          description="Overall student welfare, support and conduct."
          count={cases.filter(
            (item) =>
              item.officer ===
              'Dean of Students',
          ).length}
          onClick={() => setActiveTab('welfare')}
        />

        <DepartmentCard
          title="Counselling"
          description="Counselling cases and student appointments."
          count={
            cases.filter(
              (item) =>
                item.type === 'Counselling',
            ).length
          }
          onClick={() =>
            setActiveTab('counselling')
          }
        />

        <DepartmentCard
          title="Discipline"
          description="Student discipline and conduct management."
          count={
            cases.filter(
              (item) =>
                item.type === 'Discipline',
            ).length
          }
          onClick={() =>
            setActiveTab('discipline')
          }
        />

        <DepartmentCard
          title="Clubs & Activities"
          description="Student organisations, clubs and memberships."
          count={clubs.length}
          onClick={() => setActiveTab('clubs')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="font-bold">
                Recent Cases
              </h3>

              <p className="text-xs text-slate-500">
                Latest student affairs records
              </p>
            </div>

            <button
              onClick={() =>
                setActiveTab('welfare')
              }
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View Cases
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentCases.length === 0 ? (
              <EmptyState message="No cases recorded." />
            ) : (
              recentCases.map((item) => (
                <div
                  key={item.id}
                  className="p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {item.subject}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {item.studentName} ·{' '}
                        {item.studentId}
                      </p>
                    </div>

                    <CaseBadge
                      status={item.status}
                    />
                  </div>

                  <div className="mt-2 flex gap-2">
                    <TypeBadge
                      type={item.type}
                    />

                    <PriorityBadge
                      priority={item.priority}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="font-bold">
                Upcoming Appointments
              </h3>

              <p className="text-xs text-slate-500">
                Scheduled counselling and welfare sessions
              </p>
            </div>

            <button
              onClick={() =>
                setActiveTab('counselling')
              }
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {upcoming.length === 0 ? (
              <EmptyState message="No upcoming appointments." />
            ) : (
              upcoming.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div>
                    <p className="font-semibold">
                      {item.studentName}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {item.type} ·{' '}
                      {item.reason}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {formatDate(item.date)}
                    </p>

                    <p className="text-xs text-slate-500">
                      {item.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="font-bold">
                Active Student Clubs
              </h3>

              <p className="text-xs text-slate-500">
                Registered student organisations
              </p>
            </div>

            <button
              onClick={openNewMembership}
              className="text-xs font-semibold text-blue-600"
            >
              + Membership
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentClubs.map((club) => (
              <div
                key={club.id}
                className="flex items-center justify-between p-4"
              >
                <div>
                  <p className="font-semibold">
                    {club.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {club.category} ·{' '}
                    {club.meetingDay} {club.meetingTime}
                  </p>
                </div>

                <span className="text-sm font-bold text-blue-700">
                  {club.members}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-bold">
              Student Affairs Overview
            </h3>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <OverviewMetric
              label="Registered Students"
              value={students.length}
            />

            <OverviewMetric
              label="Case Records"
              value={cases.length}
            />

            <OverviewMetric
              label="Appointments"
              value={appointments.length}
            />

            <OverviewMetric
              label="Club Memberships"
              value={memberships.length}
            />
          </div>
        </section>
      </div>
    </div>
  )
}

function CaseSection({
  title,
  description,
  cases,
  emptyMessage,
  onNew,
  onEdit,
  onDelete,
  onDetails,
  onStatus,
  onExport,
}: {
  title: string
  description: string
  cases: StudentCase[]
  emptyMessage: string
  onNew: () => void
  onEdit: (item: StudentCase) => void
  onDelete: (id: string) => void
  onDetails: (item: StudentCase) => void
  onStatus: (
    id: string,
    status: CaseStatus,
  ) => void
  onExport: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            {title}
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onExport}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            Export CSV
          </button>

          <button
            onClick={onNew}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New Case
          </button>
        </div>
      </div>

      {cases.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  Case
                </th>

                <th className="px-5 py-3">
                  Student
                </th>

                <th className="px-5 py-3">
                  Type
                </th>

                <th className="px-5 py-3">
                  Priority
                </th>

                <th className="px-5 py-3">
                  Status
                </th>

                <th className="px-5 py-3">
                  Officer
                </th>

                <th className="px-5 py-3">
                  Updated
                </th>

                <th className="px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {cases.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="font-mono text-xs font-bold text-blue-700">
                      {item.id}
                    </p>

                    <p className="mt-1 max-w-xs font-semibold">
                      {item.subject}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <p className="font-medium">
                      {item.studentName}
                    </p>

                    <p className="mt-1 font-mono text-xs text-slate-500">
                      {item.studentId}
                    </p>
                  </td>

                  <td className="px-5 py-4">
                    <TypeBadge type={item.type} />
                  </td>

                  <td className="px-5 py-4">
                    <PriorityBadge
                      priority={item.priority}
                    />
                  </td>

                  <td className="px-5 py-4">
                    <select
                      value={item.status}
                      onChange={(event) =>
                        onStatus(
                          item.id,
                          event.target
                            .value as CaseStatus,
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="Open">
                        Open
                      </option>
                      <option value="In Progress">
                        In Progress
                      </option>
                      <option value="Referred">
                        Referred
                      </option>
                      <option value="Resolved">
                        Resolved
                      </option>
                      <option value="Closed">
                        Closed
                      </option>
                    </select>
                  </td>

                  <td className="px-5 py-4">
                    {item.officer}
                  </td>

                  <td className="px-5 py-4 text-xs text-slate-500">
                    {formatDate(
                      item.lastUpdated,
                    )}
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          onDetails(item)
                        }
                        className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-50"
                      >
                        View
                      </button>

                      <button
                        onClick={() =>
                          onEdit(item)
                        }
                        className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          onDelete(item.id)
                        }
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700"
                      >
                        Delete
                      </button>
                    </div>
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

function CounsellingView({
  cases,
  appointments,
  onNewCase,
  onNewAppointment,
  onEditCase,
  onDeleteCase,
  onDetails,
  onCaseStatus,
  onAppointmentStatus,
  onDeleteAppointment,
  onExport,
}: {
  cases: StudentCase[]
  appointments: Appointment[]
  onNewCase: () => void
  onNewAppointment: () => void
  onEditCase: (item: StudentCase) => void
  onDeleteCase: (id: string) => void
  onDetails: (item: StudentCase) => void
  onCaseStatus: (
    id: string,
    status: CaseStatus,
  ) => void
  onAppointmentStatus: (
    id: string,
    status: AppointmentStatus,
  ) => void
  onDeleteAppointment: (id: string) => void
  onExport: () => void
}) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">
            Counselling Services
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Counselling cases, referrals and appointments.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onExport}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
          >
            Export Appointments
          </button>

          <button
            onClick={onNewCase}
            className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700"
          >
            + Counselling Case
          </button>

          <button
            onClick={onNewAppointment}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + Appointment
          </button>
        </div>
      </div>

      <section>
        <h3 className="mb-3 font-bold">
          Counselling Cases
        </h3>

        <CaseTableCompact
          cases={cases}
          onEdit={onEditCase}
          onDelete={onDeleteCase}
          onDetails={onDetails}
          onStatus={onCaseStatus}
        />
      </section>

      <section>
        <h3 className="mb-3 font-bold">
          Counselling & Welfare Appointments
        </h3>

        {appointments.length === 0 ? (
          <EmptyState message="No appointments found." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Student
                  </th>

                  <th className="px-5 py-3">
                    Type
                  </th>

                  <th className="px-5 py-3">
                    Date
                  </th>

                  <th className="px-5 py-3">
                    Time
                  </th>

                  <th className="px-5 py-3">
                    Counsellor
                  </th>

                  <th className="px-5 py-3">
                    Location
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>

                  <th className="px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {appointments.map((item) => (
                  <tr key={item.id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {item.studentName}
                      </p>

                      <p className="font-mono text-xs text-slate-500">
                        {item.studentId}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {item.type}
                    </td>

                    <td className="px-5 py-4">
                      {formatDate(item.date)}
                    </td>

                    <td className="px-5 py-4">
                      {item.time}
                    </td>

                    <td className="px-5 py-4">
                      {item.counsellor}
                    </td>

                    <td className="px-5 py-4">
                      {item.location}
                    </td>

                    <td className="px-5 py-4">
                      <select
                        value={item.status}
                        onChange={(event) =>
                          onAppointmentStatus(
                            item.id,
                            event.target
                              .value as AppointmentStatus,
                          )
                        }
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                      >
                        <option value="Scheduled">
                          Scheduled
                        </option>
                        <option value="Completed">
                          Completed
                        </option>
                        <option value="Cancelled">
                          Cancelled
                        </option>
                        <option value="No Show">
                          No Show
                        </option>
                      </select>
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() =>
                          onDeleteAppointment(
                            item.id,
                          )
                        }
                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700"
                      >
                        Delete
                      </button>
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

function CaseTableCompact({
  cases,
  onEdit,
  onDelete,
  onDetails,
  onStatus,
}: {
  cases: StudentCase[]
  onEdit: (item: StudentCase) => void
  onDelete: (id: string) => void
  onDetails: (item: StudentCase) => void
  onStatus: (
    id: string,
    status: CaseStatus,
  ) => void
}) {
  if (cases.length === 0) {
    return (
      <EmptyState message="No cases found." />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">
              Student
            </th>

            <th className="px-5 py-3">
              Subject
            </th>

            <th className="px-5 py-3">
              Priority
            </th>

            <th className="px-5 py-3">
              Status
            </th>

            <th className="px-5 py-3">
              Actions
            </th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {cases.map((item) => (
            <tr key={item.id}>
              <td className="px-5 py-4">
                <p className="font-semibold">
                  {item.studentName}
                </p>

                <p className="font-mono text-xs text-slate-500">
                  {item.studentId}
                </p>
              </td>

              <td className="px-5 py-4">
                {item.subject}
              </td>

              <td className="px-5 py-4">
                <PriorityBadge
                  priority={item.priority}
                />
              </td>

              <td className="px-5 py-4">
                <select
                  value={item.status}
                  onChange={(event) =>
                    onStatus(
                      item.id,
                      event.target
                        .value as CaseStatus,
                    )
                  }
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                >
                  <option value="Open">
                    Open
                  </option>
                  <option value="In Progress">
                    In Progress
                  </option>
                  <option value="Referred">
                    Referred
                  </option>
                  <option value="Resolved">
                    Resolved
                  </option>
                  <option value="Closed">
                    Closed
                  </option>
                </select>
              </td>

              <td className="px-5 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      onDetails(item)
                    }
                    className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-semibold"
                  >
                    View
                  </button>

                  <button
                    onClick={() =>
                      onEdit(item)
                    }
                    className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() =>
                      onDelete(item.id)
                    }
                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClubsView({
  clubs,
  memberships,
  onNewClub,
  onEditClub,
  onDeleteClub,
  onToggleClub,
  onNewMembership,
  onMembershipStatus,
  onDeleteMembership,
  onExport,
}: {
  clubs: Club[]
  memberships: ClubMembership[]
  onNewClub: () => void
  onEditClub: (club: Club) => void
  onDeleteClub: (id: string) => void
  onToggleClub: (id: string) => void
  onNewMembership: () => void
  onMembershipStatus: (
    id: string,
    status: MembershipStatus,
  ) => void
  onDeleteMembership: (id: string) => void
  onExport: () => void
}) {
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold">
              Clubs & Student Activities
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage registered clubs, student organisations and memberships.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={onExport}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
            >
              Export Clubs
            </button>

            <button
              onClick={onNewMembership}
              className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700"
            >
              + Membership
            </button>

            <button
              onClick={onNewClub}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + New Club
            </button>
          </div>
        </div>

        {clubs.length === 0 ? (
          <EmptyState message="No student clubs registered." />
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {clubs.map((club) => (
              <div
                key={club.id}
                className="rounded-xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      {club.category}
                    </p>

                    <h3 className="mt-1 text-lg font-bold">
                      {club.name}
                    </h3>
                  </div>

                  <ClubBadge
                    status={club.status}
                  />
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {club.description ||
                    'No description provided.'}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <InfoBox
                    label="President"
                    value={
                      club.president || '-'
                    }
                  />

                  <InfoBox
                    label="Advisor"
                    value={
                      club.advisor || '-'
                    }
                  />

                  <InfoBox
                    label="Meetings"
                    value={`${club.meetingDay} ${club.meetingTime}`}
                  />

                  <InfoBox
                    label="Location"
                    value={
                      club.location || '-'
                    }
                  />
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs text-slate-500">
                      Members
                    </p>

                    <p className="text-xl font-bold text-blue-700">
                      {club.members}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        onEditClub(club)
                      }
                      className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        onToggleClub(club.id)
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"
                    >
                      {club.status ===
                      'Active'
                        ? 'Deactivate'
                        : 'Activate'}
                    </button>

                    <button
                      onClick={() =>
                        onDeleteClub(club.id)
                      }
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4">
          <h3 className="text-lg font-bold">
            Club Memberships
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Students linked to registered clubs using their central Student ID.
          </p>
        </div>

        {memberships.length === 0 ? (
          <EmptyState message="No membership records found." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">
                    Student
                  </th>

                  <th className="px-5 py-3">
                    Club
                  </th>

                  <th className="px-5 py-3">
                    Joined
                  </th>

                  <th className="px-5 py-3">
                    Status
                  </th>

                  <th className="px-5 py-3">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {memberships.map(
                  (membership) => (
                    <tr
                      key={membership.id}
                    >
                      <td className="px-5 py-4">
                        <p className="font-semibold">
                          {
                            membership.studentName
                          }
                        </p>

                        <p className="font-mono text-xs text-slate-500">
                          {
                            membership.studentId
                          }
                        </p>
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {
                          membership.clubName
                        }
                      </td>

                      <td className="px-5 py-4">
                        {formatDate(
                          membership.joinedDate,
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <select
                          value={
                            membership.status
                          }
                          onChange={(
                            event,
                          ) =>
                            onMembershipStatus(
                              membership.id,
                              event.target
                                .value as MembershipStatus,
                            )
                          }
                          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs"
                        >
                          <option value="Active">
                            Active
                          </option>
                          <option value="Pending">
                            Pending
                          </option>
                          <option value="Suspended">
                            Suspended
                          </option>
                          <option value="Left">
                            Left
                          </option>
                        </select>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() =>
                            onDeleteMembership(
                              membership.id,
                            )
                          }
                          className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function StudentsView({
  students,
  cases,
  appointments,
  memberships,
}: {
  students: Student[]
  cases: StudentCase[]
  appointments: Appointment[]
  memberships: ClubMembership[]
}) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">
          Student Affairs Student Directory
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Central students available to Student Affairs.
        </p>
      </div>

      {students.length === 0 ? (
        <EmptyState message="No students found." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  Student
                </th>

                <th className="px-5 py-3">
                  Academic
                </th>

                <th className="px-5 py-3">
                  Welfare Cases
                </th>

                <th className="px-5 py-3">
                  Appointments
                </th>

                <th className="px-5 py-3">
                  Club Memberships
                </th>

                <th className="px-5 py-3">
                  Status
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {students.map((student) => {
                const id =
                  studentIdOf(student)

                const studentCases =
                  cases.filter(
                    (item) =>
                      item.studentId === id,
                  ).length

                const studentAppointments =
                  appointments.filter(
                    (item) =>
                      item.studentId === id,
                  ).length

                const studentMemberships =
                  memberships.filter(
                    (item) =>
                      item.studentId === id,
                  ).length

                return (
                  <tr key={id}>
                    <td className="px-5 py-4">
                      <p className="font-semibold">
                        {student.name}
                      </p>

                      <p className="mt-1 font-mono text-xs text-blue-700">
                        {id}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <p className="font-medium">
                        {student.programme ||
                          '-'}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {student.faculty ||
                          '-'}{' '}
                        ·{' '}
                        {student.yearLevel ||
                          '-'}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-bold">
                      {studentCases}
                    </td>

                    <td className="px-5 py-4 font-bold">
                      {studentAppointments}
                    </td>

                    <td className="px-5 py-4 font-bold">
                      {studentMemberships}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge
                        status={
                          student.status ||
                          'Registered'
                        }
                        active
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function DepartmentCard({
  title,
  description,
  count,
  onClick,
}: {
  title: string
  description: string
  count: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-bold">
          {title}
        </h3>

        <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
          {count}
        </span>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <p className="mt-4 text-xs font-semibold text-blue-600">
        Open module →
      </p>
    </button>
  )
}

function OverviewMetric({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>
    </div>
  )
}

function InfoBox({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold">
        {value}
      </p>
    </div>
  )
}

function PortalStat({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold">
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

function CaseBadge({
  status,
}: {
  status: CaseStatus
}) {
  const className =
    status === 'Resolved' ||
    status === 'Closed'
      ? 'bg-emerald-100 text-emerald-700'
      : status === 'In Progress'
        ? 'bg-blue-100 text-blue-700'
        : status === 'Referred'
          ? 'bg-purple-100 text-purple-700'
          : 'bg-amber-100 text-amber-700'

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {status}
    </span>
  )
}

function TypeBadge({
  type,
}: {
  type: CaseType
}) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      {type}
    </span>
  )
}

function PriorityBadge({
  priority,
}: {
  priority: Priority
}) {
  const className =
    priority === 'Urgent'
      ? 'bg-red-100 text-red-700'
      : priority === 'High'
        ? 'bg-orange-100 text-orange-700'
        : priority === 'Medium'
          ? 'bg-amber-100 text-amber-700'
          : 'bg-slate-100 text-slate-600'

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {priority}
    </span>
  )
}

function ClubBadge({
  status,
}: {
  status: ClubStatus
}) {
  const active = status === 'Active'

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
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
      <p className="text-sm font-medium text-slate-500">
        {message}
      </p>
    </div>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      {children}
    </div>
  )
}

function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white shadow-2xl ${
          wide ? 'max-w-4xl' : 'max-w-2xl'
        }`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-bold">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xl text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}

function ModalActions({
  onCancel,
  onSave,
  saveLabel,
}: {
  onCancel: () => void
  onSave: () => void
  saveLabel: string
}) {
  return (
    <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
      <button
        onClick={onCancel}
        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
      >
        Cancel
      </button>

      <button
        onClick={onSave}
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {saveLabel}
      </button>
    </div>
  )
}

function CaseDetailsModal({
  item,
  onClose,
  onEdit,
}: {
  item: StudentCase
  onClose: () => void
  onEdit: () => void
}) {
  return (
    <Modal
      title={`Case ${item.id}`}
      onClose={onClose}
      wide
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <InfoBox
            label="Student"
            value={`${item.studentName} (${item.studentId})`}
          />

          <InfoBox
            label="Type"
            value={item.type}
          />

          <InfoBox
            label="Priority"
            value={item.priority}
          />

          <InfoBox
            label="Status"
            value={item.status}
          />

          <InfoBox
            label="Officer"
            value={item.officer}
          />

          <InfoBox
            label="Department"
            value={item.department}
          />
        </div>

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Subject
          </p>

          <p className="mt-1 font-bold">
            {item.subject}
          </p>
        </section>

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Description
          </p>

          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {item.description}
          </p>
        </section>

        <section>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Resolution / Action Taken
          </p>

          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            {item.resolution ||
              'No resolution has been recorded.'}
          </p>
        </section>

        <div className="flex items-center justify-between border-t border-slate-200 pt-5">
          <div className="text-xs text-slate-500">
            Opened {formatDate(item.dateOpened)}
            {' · '}
            Updated {formatDate(item.lastUpdated)}
            {' · '}
            {item.confidential
              ? 'Confidential'
              : 'Standard Record'}
          </div>

          <button
            onClick={onEdit}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Edit Case
          </button>
        </div>
      </div>
    </Modal>
  )
}
