'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { protectNexusPage } from "@/lib/nexus-access"

type Tab =
  | 'dashboard'
  | 'courses'
  | 'materials'
  | 'announcements'
  | 'assignments'
  | 'enrolments'
  | 'submissions'

type Course = {
  id: string
  code: string
  title: string
  description?: string
  department?: string
  faculty?: string
  programme?: string
  yearLevel?: string
  semester?: string
  creditHours?: number
  courseType?: 'Core' | 'Elective' | 'General'
  status?: 'Active' | 'Inactive'
  prerequisite?: string
}

type Lecturer = {
  id: string
  staffId: string
  name: string
  email?: string
  faculty?: string
  department?: string
  title?: string
  courseAssignments?: string[]
  status?: 'Active' | 'Inactive'
}

type Student = {
  id: string
  studentId: string
  name: string
  email?: string
  phone?: string
  faculty?: string
  department?: string
  programme?: string
  yearLevel?: string
  status?: string
}

type LMSCourse = {
  id: string
  courseId: string
  code: string
  title: string
  lecturerId: string
  lecturerName: string
  status: 'Active' | 'Inactive'
}

type Material = {
  id: string
  courseId: string
  title: string
  type: 'Lecture Note' | 'PDF' | 'Video' | 'Link' | 'Other'
  description: string
  resourceUrl: string
  uploadedBy: string
  uploadedAt: string
}

type Announcement = {
  id: string
  courseId: string
  title: string
  message: string
  postedBy: string
  postedAt: string
}

type Assignment = {
  id: string
  courseId: string
  title: string
  instructions: string
  dueDate: string
  totalMarks: number
  status: 'Open' | 'Closed'
  createdBy: string
  createdAt: string
}

type Submission = {
  id: string
  assignmentId: string
  studentId: string
  studentName: string
  submittedAt: string
  fileName: string
  marks?: number
  feedback?: string
  status: 'Submitted' | 'Graded' | 'Late'
}

type Enrolment = {
  id: string
  courseId: string
  studentId: string
  studentName: string
  enrolledAt: string
  status: 'Active' | 'Dropped' | 'Completed'
}

type MaterialForm = {
  courseId: string
  title: string
  type: Material['type']
  description: string
  resourceUrl: string
  uploadedBy: string
}

type AnnouncementForm = {
  courseId: string
  title: string
  message: string
  postedBy: string
}

type AssignmentForm = {
  courseId: string
  title: string
  instructions: string
  dueDate: string
  totalMarks: string
  createdBy: string
}

const STORAGE = {
  courses: 'nexusSIS_courses',
  lecturers: 'nexusSIS_lecturers',
  students: 'nexusSIS_registered_students',
  lmsCourses: 'nexusSIS_lms_courses',
  materials: 'nexusSIS_lms_materials',
  announcements: 'nexusSIS_lms_announcements',
  assignments: 'nexusSIS_lms_assignments',
  submissions: 'nexusSIS_lms_submissions',
  enrolments: 'nexusSIS_lms_enrolments',
}

const defaultCourses: Course[] = [
  {
    id: 'course-1',
    code: 'CSC101',
    title: 'Introduction to Computer Science',
    department: 'Computer Science',
    faculty: 'Faculty of Science',
    programme: 'Bachelor of Computer Science',
    yearLevel: 'Year 1',
    semester: 'Semester 1',
    creditHours: 3,
    courseType: 'Core',
    status: 'Active',
  },
  {
    id: 'course-2',
    code: 'MAT101',
    title: 'Mathematics I',
    department: 'Mathematics',
    faculty: 'Faculty of Science',
    programme: 'Bachelor of Computer Science',
    yearLevel: 'Year 1',
    semester: 'Semester 1',
    creditHours: 3,
    courseType: 'Core',
    status: 'Active',
  },
  {
    id: 'course-3',
    code: 'ENG101',
    title: 'Academic English',
    department: 'English',
    faculty: 'Faculty of Humanities',
    programme: 'Bachelor of Arts',
    yearLevel: 'Year 1',
    semester: 'Semester 1',
    creditHours: 3,
    courseType: 'General',
    status: 'Active',
  },
]

const defaultLecturers: Lecturer[] = [
  {
    id: 'lec-1',
    staffId: 'STAFF001',
    name: 'Dr. John Wama',
    email: 'john.wama@nexus.edu',
    faculty: 'Faculty of Science',
    department: 'Computer Science',
    title: 'Senior Lecturer',
    courseAssignments: ['CSC101'],
    status: 'Active',
  },
  {
    id: 'lec-2',
    staffId: 'STAFF002',
    name: 'Ms. Mary Kila',
    email: 'mary.kila@nexus.edu',
    faculty: 'Faculty of Science',
    department: 'Mathematics',
    title: 'Lecturer',
    courseAssignments: ['MAT101'],
    status: 'Active',
  },
]

const defaultStudents: Student[] = [
  {
    id: 'student-1',
    studentId: 'NXS2600001',
    name: 'David Maima',
    email: 'david.maima@student.nexus.edu',
    faculty: 'Faculty of Science',
    department: 'Computer Science',
    programme: 'Bachelor of Computer Science',
    yearLevel: 'Year 1',
    status: 'Registered',
  },
  {
    id: 'student-2',
    studentId: 'NXS2600002',
    name: 'Mary Kila',
    email: 'mary.kila@student.nexus.edu',
    faculty: 'Faculty of Business',
    department: 'Business',
    programme: 'Bachelor of Business',
    yearLevel: 'Year 1',
    status: 'Registered',
  },
]

const defaultLmsCourses: LMSCourse[] = [
  {
    id: 'lms-course-1',
    courseId: 'course-1',
    code: 'CSC101',
    title: 'Introduction to Computer Science',
    lecturerId: 'lec-1',
    lecturerName: 'Dr. John Wama',
    status: 'Active',
  },
  {
    id: 'lms-course-2',
    courseId: 'course-2',
    code: 'MAT101',
    title: 'Mathematics I',
    lecturerId: 'lec-2',
    lecturerName: 'Ms. Mary Kila',
    status: 'Active',
  },
]

const defaultMaterials: Material[] = [
  {
    id: 'material-1',
    courseId: 'course-1',
    title: 'Introduction to Computer Science Notes',
    type: 'Lecture Note',
    description: 'Week 1 introductory lecture material.',
    resourceUrl: '',
    uploadedBy: 'Dr. John Wama',
    uploadedAt: '2026-01-15',
  },
  {
    id: 'material-2',
    courseId: 'course-2',
    title: 'Mathematics I - Week 1',
    type: 'Lecture Note',
    description: 'Introduction to mathematical foundations.',
    resourceUrl: '',
    uploadedBy: 'Ms. Mary Kila',
    uploadedAt: '2026-01-15',
  },
]

const defaultAnnouncements: Announcement[] = [
  {
    id: 'announcement-1',
    courseId: 'course-1',
    title: 'Welcome to CSC101',
    message: 'Welcome students. Please review the first lecture material before the next class.',
    postedBy: 'Dr. John Wama',
    postedAt: '2026-01-15',
  },
]

const defaultAssignments: Assignment[] = [
  {
    id: 'assignment-1',
    courseId: 'course-1',
    title: 'Computer Science Introduction Assignment',
    instructions: 'Explain the major areas of computer science and provide examples.',
    dueDate: '2026-02-15',
    totalMarks: 20,
    status: 'Open',
    createdBy: 'Dr. John Wama',
    createdAt: '2026-01-16',
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

function saveStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function formatDate(value: string) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString()
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export default function LMSPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const [courses, setCourses] = useState<Course[]>([])
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [lmsCourses, setLmsCourses] = useState<LMSCourse[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [enrolments, setEnrolments] = useState<Enrolment[]>([])

  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('All')

  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [showCourseModal, setShowCourseModal] = useState(false)
  const [showEnrolmentModal, setShowEnrolmentModal] = useState(false)
  const [showSubmissionModal, setShowSubmissionModal] = useState(false)

  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null)

  const [materialForm, setMaterialForm] = useState<MaterialForm>({
    courseId: '',
    title: '',
    type: 'Lecture Note',
    description: '',
    resourceUrl: '',
    uploadedBy: '',
  })

  const [announcementForm, setAnnouncementForm] =
    useState<AnnouncementForm>({
      courseId: '',
      title: '',
      message: '',
      postedBy: '',
    })

  const [assignmentForm, setAssignmentForm] =
    useState<AssignmentForm>({
      courseId: '',
      title: '',
      instructions: '',
      dueDate: '',
      totalMarks: '100',
      createdBy: '',
    })

  const [selectedLmsCourse, setSelectedLmsCourse] = useState<LMSCourse | null>(
    null,
  )

  const [enrolmentForm, setEnrolmentForm] = useState({
    courseId: '',
    studentId: '',
  })

  useEffect(() => {
    protectNexusPage([
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    const loadedCourses = readStorage<Course[]>(
      STORAGE.courses,
      defaultCourses,
    )

    const loadedLecturers = readStorage<Lecturer[]>(
      STORAGE.lecturers,
      defaultLecturers,
    )

    const loadedStudents = readStorage<Student[]>(
      STORAGE.students,
      defaultStudents,
    )

    const loadedLmsCourses = readStorage<LMSCourse[]>(
      STORAGE.lmsCourses,
      defaultLmsCourses,
    )

    const loadedMaterials = readStorage<Material[]>(
      STORAGE.materials,
      defaultMaterials,
    )

    const loadedAnnouncements = readStorage<Announcement[]>(
      STORAGE.announcements,
      defaultAnnouncements,
    )

    const loadedAssignments = readStorage<Assignment[]>(
      STORAGE.assignments,
      defaultAssignments,
    )

    const loadedSubmissions = readStorage<Submission[]>(
      STORAGE.submissions,
      [],
    )

    const loadedEnrolments = readStorage<Enrolment[]>(
      STORAGE.enrolments,
      [],
    )

    setCourses(loadedCourses)
    setLecturers(loadedLecturers)
    setStudents(loadedStudents)
    setLmsCourses(loadedLmsCourses)
    setMaterials(loadedMaterials)
    setAnnouncements(loadedAnnouncements)
    setAssignments(loadedAssignments)
    setSubmissions(loadedSubmissions)
    setEnrolments(loadedEnrolments)
  }, [])

  const activeCourses = useMemo(
    () => courses.filter((course) => course.status !== 'Inactive'),
    [courses],
  )

  const filteredCourses = useMemo(() => {
    const query = search.trim().toLowerCase()

    return lmsCourses.filter((course) => {
      const matchesSearch =
        !query ||
        course.code.toLowerCase().includes(query) ||
        course.title.toLowerCase().includes(query) ||
        course.lecturerName.toLowerCase().includes(query)

      const matchesCourse =
        courseFilter === 'All' || course.id === courseFilter

      return matchesSearch && matchesCourse
    })
  }, [lmsCourses, search, courseFilter])

  const filteredMaterials = useMemo(() => {
    const query = search.trim().toLowerCase()

    return materials.filter((material) => {
      const course = courses.find((item) => item.id === material.courseId)

      const matchesSearch =
        !query ||
        material.title.toLowerCase().includes(query) ||
        material.description.toLowerCase().includes(query) ||
        course?.code.toLowerCase().includes(query) ||
        course?.title.toLowerCase().includes(query)

      const matchesCourse =
        courseFilter === 'All' || material.courseId === courseFilter

      return matchesSearch && matchesCourse
    })
  }, [materials, courses, search, courseFilter])

  const filteredAnnouncements = useMemo(() => {
    const query = search.trim().toLowerCase()

    return announcements.filter((announcement) => {
      const course = courses.find(
        (item) => item.id === announcement.courseId,
      )

      const matchesSearch =
        !query ||
        announcement.title.toLowerCase().includes(query) ||
        announcement.message.toLowerCase().includes(query) ||
        course?.code.toLowerCase().includes(query)

      const matchesCourse =
        courseFilter === 'All' || announcement.courseId === courseFilter

      return matchesSearch && matchesCourse
    })
  }, [announcements, courses, search, courseFilter])

  const filteredAssignments = useMemo(() => {
    const query = search.trim().toLowerCase()

    return assignments.filter((assignment) => {
      const course = courses.find((item) => item.id === assignment.courseId)

      const matchesSearch =
        !query ||
        assignment.title.toLowerCase().includes(query) ||
        assignment.instructions.toLowerCase().includes(query) ||
        course?.code.toLowerCase().includes(query)

      const matchesCourse =
        courseFilter === 'All' || assignment.courseId === courseFilter

      return matchesSearch && matchesCourse
    })
  }, [assignments, courses, search, courseFilter])

  function getCourse(courseId: string) {
    return courses.find((course) => course.id === courseId)
  }

  function getStudent(studentId: string) {
    return students.find((student) => student.studentId === studentId)
  }

  function getLmsCourse(courseId: string) {
    return lmsCourses.find((course) => course.courseId === courseId)
  }

  function addLmsCourse() {
    if (activeCourses.length === 0) {
      alert('No active courses are available in Course Management.')
      return
    }

    setSelectedLmsCourse(null)
    setShowCourseModal(true)
  }

  function createLmsCourse(course: Course, lecturer: Lecturer) {
    const exists = lmsCourses.some((item) => item.courseId === course.id)

    if (exists) {
      alert('This course already exists in the LMS.')
      return
    }

    const nextCourse: LMSCourse = {
      id: `lms-${Date.now()}`,
      courseId: course.id,
      code: course.code,
      title: course.title,
      lecturerId: lecturer.staffId,
      lecturerName: lecturer.name,
      status: 'Active',
    }

    const nextCourses: LMSCourse[] = [...lmsCourses, nextCourse]

    setLmsCourses(nextCourses)
    saveStorage(STORAGE.lmsCourses, nextCourses)
    setShowCourseModal(false)
  }

  function toggleLmsCourse(course: LMSCourse) {
    const nextStatus: LMSCourse['status'] =
      course.status === 'Active' ? 'Inactive' : 'Active'

    const nextCourses: LMSCourse[] = lmsCourses.map((item) =>
      item.id === course.id
        ? {
            ...item,
            status: nextStatus,
          }
        : item,
    )

    setLmsCourses(nextCourses)
    saveStorage(STORAGE.lmsCourses, nextCourses)
  }

  function removeLmsCourse(course: LMSCourse) {
    const confirmed = window.confirm(
      `Remove ${course.code} from the LMS? Existing materials and assignments will remain.`,
    )

    if (!confirmed) return

    const nextCourses = lmsCourses.filter((item) => item.id !== course.id)

    setLmsCourses(nextCourses)
    saveStorage(STORAGE.lmsCourses, nextCourses)
  }

  function openMaterialModal() {
    if (lmsCourses.length === 0) {
      alert('Add an LMS course first.')
      return
    }

    setMaterialForm({
      courseId: lmsCourses[0]?.courseId ?? '',
      title: '',
      type: 'Lecture Note',
      description: '',
      resourceUrl: '',
      uploadedBy: lmsCourses[0]?.lecturerName ?? '',
    })

    setShowMaterialModal(true)
  }

  function saveMaterial() {
    const title = materialForm.title.trim()
    const description = materialForm.description.trim()
    const uploadedBy = materialForm.uploadedBy.trim()

    if (!materialForm.courseId || !title || !uploadedBy) {
      alert('Course, title and uploaded by are required.')
      return
    }

    const nextMaterial: Material = {
      id: `material-${Date.now()}`,
      courseId: materialForm.courseId,
      title,
      type: materialForm.type,
      description,
      resourceUrl: materialForm.resourceUrl.trim(),
      uploadedBy,
      uploadedAt: new Date().toISOString(),
    }

    const nextMaterials = [nextMaterial, ...materials]

    setMaterials(nextMaterials)
    saveStorage(STORAGE.materials, nextMaterials)
    setShowMaterialModal(false)
  }

  function deleteMaterial(material: Material) {
    if (!window.confirm(`Delete "${material.title}"?`)) return

    const nextMaterials = materials.filter((item) => item.id !== material.id)

    setMaterials(nextMaterials)
    saveStorage(STORAGE.materials, nextMaterials)
  }

  function openAnnouncementModal() {
    if (lmsCourses.length === 0) {
      alert('Add an LMS course first.')
      return
    }

    setAnnouncementForm({
      courseId: lmsCourses[0]?.courseId ?? '',
      title: '',
      message: '',
      postedBy: lmsCourses[0]?.lecturerName ?? '',
    })

    setShowAnnouncementModal(true)
  }

  function saveAnnouncement() {
    const title = announcementForm.title.trim()
    const message = announcementForm.message.trim()
    const postedBy = announcementForm.postedBy.trim()

    if (!announcementForm.courseId || !title || !message || !postedBy) {
      alert('Course, title, message and posted by are required.')
      return
    }

    const nextAnnouncement: Announcement = {
      id: `announcement-${Date.now()}`,
      courseId: announcementForm.courseId,
      title,
      message,
      postedBy,
      postedAt: new Date().toISOString(),
    }

    const nextAnnouncements = [nextAnnouncement, ...announcements]

    setAnnouncements(nextAnnouncements)
    saveStorage(STORAGE.announcements, nextAnnouncements)
    setShowAnnouncementModal(false)
  }

  function deleteAnnouncement(announcement: Announcement) {
    if (!window.confirm(`Delete "${announcement.title}"?`)) return

    const nextAnnouncements = announcements.filter(
      (item) => item.id !== announcement.id,
    )

    setAnnouncements(nextAnnouncements)
    saveStorage(STORAGE.announcements, nextAnnouncements)
  }

  function openAssignmentModal() {
    if (lmsCourses.length === 0) {
      alert('Add an LMS course first.')
      return
    }

    setAssignmentForm({
      courseId: lmsCourses[0]?.courseId ?? '',
      title: '',
      instructions: '',
      dueDate: '',
      totalMarks: '100',
      createdBy: lmsCourses[0]?.lecturerName ?? '',
    })

    setShowAssignmentModal(true)
  }

  function saveAssignment() {
    const title = assignmentForm.title.trim()
    const instructions = assignmentForm.instructions.trim()
    const createdBy = assignmentForm.createdBy.trim()
    const totalMarks = Number(assignmentForm.totalMarks)

    if (
      !assignmentForm.courseId ||
      !title ||
      !instructions ||
      !assignmentForm.dueDate ||
      !createdBy
    ) {
      alert('Complete all required assignment fields.')
      return
    }

    if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
      alert('Total marks must be greater than zero.')
      return
    }

    const nextAssignment: Assignment = {
      id: `assignment-${Date.now()}`,
      courseId: assignmentForm.courseId,
      title,
      instructions,
      dueDate: assignmentForm.dueDate,
      totalMarks,
      status: 'Open',
      createdBy,
      createdAt: new Date().toISOString(),
    }

    const nextAssignments = [nextAssignment, ...assignments]

    setAssignments(nextAssignments)
    saveStorage(STORAGE.assignments, nextAssignments)
    setShowAssignmentModal(false)
  }

  function toggleAssignment(assignment: Assignment) {
    const nextStatus: Assignment['status'] =
      assignment.status === 'Open' ? 'Closed' : 'Open'

    const nextAssignments: Assignment[] = assignments.map((item) =>
      item.id === assignment.id
        ? {
            ...item,
            status: nextStatus,
          }
        : item,
    )

    setAssignments(nextAssignments)
    saveStorage(STORAGE.assignments, nextAssignments)
  }

  function deleteAssignment(assignment: Assignment) {
    if (!window.confirm(`Delete "${assignment.title}"?`)) return

    const nextAssignments = assignments.filter(
      (item) => item.id !== assignment.id,
    )

    setAssignments(nextAssignments)
    saveStorage(STORAGE.assignments, nextAssignments)
  }

  function openEnrolmentModal() {
    if (lmsCourses.length === 0 || students.length === 0) {
      alert('LMS courses and registered students are required.')
      return
    }

    setEnrolmentForm({
      courseId: lmsCourses[0]?.courseId ?? '',
      studentId: students[0]?.studentId ?? '',
    })

    setShowEnrolmentModal(true)
  }

  function saveEnrolment() {
    const student = getStudent(enrolmentForm.studentId)
    const course = getCourse(enrolmentForm.courseId)

    if (!student || !course) {
      alert('Select a valid student and course.')
      return
    }

    const alreadyEnrolled = enrolments.some(
      (item) =>
        item.courseId === course.id &&
        item.studentId === student.studentId &&
        item.status === 'Active',
    )

    if (alreadyEnrolled) {
      alert('Student is already enrolled in this course.')
      return
    }

    const nextEnrolment: Enrolment = {
      id: `enrolment-${Date.now()}`,
      courseId: course.id,
      studentId: student.studentId,
      studentName: student.name,
      enrolledAt: new Date().toISOString(),
      status: 'Active',
    }

    const nextEnrolments = [nextEnrolment, ...enrolments]

    setEnrolments(nextEnrolments)
    saveStorage(STORAGE.enrolments, nextEnrolments)
    setShowEnrolmentModal(false)
  }

  function updateEnrolmentStatus(
    enrolment: Enrolment,
    status: Enrolment['status'],
  ) {
    const nextEnrolments: Enrolment[] = enrolments.map((item) =>
      item.id === enrolment.id
        ? {
            ...item,
            status,
          }
        : item,
    )

    setEnrolments(nextEnrolments)
    saveStorage(STORAGE.enrolments, nextEnrolments)
  }

  function openSubmissionModal(submission: Submission) {
    setSelectedSubmission(submission)
    setShowSubmissionModal(true)
  }

  function saveSubmissionGrade(marksValue: string, feedback: string) {
    if (!selectedSubmission) return

    const marks = Number(marksValue)

    if (!Number.isFinite(marks) || marks < 0) {
      alert('Enter a valid mark.')
      return
    }

    const assignment = assignments.find(
      (item) => item.id === selectedSubmission.assignmentId,
    )

    if (assignment && marks > assignment.totalMarks) {
      alert(`Mark cannot exceed ${assignment.totalMarks}.`)
      return
    }

    const nextSubmissions: Submission[] = submissions.map((item) =>
      item.id === selectedSubmission.id
        ? {
            ...item,
            marks,
            feedback: feedback.trim(),
            status: 'Graded',
          }
        : item,
    )

    setSubmissions(nextSubmissions)
    saveStorage(STORAGE.submissions, nextSubmissions)

    setSelectedSubmission({
      ...selectedSubmission,
      marks,
      feedback: feedback.trim(),
      status: 'Graded',
    })

    setShowSubmissionModal(false)
  }

  function exportLmsCourses() {
    const rows = [
      [
        'Course Code',
        'Course Title',
        'Lecturer',
        'Status',
      ],
      ...lmsCourses.map((course) => [
        course.code,
        course.title,
        course.lecturerName,
        course.status,
      ]),
    ]

    downloadCsv('nexus-lms-courses.csv', rows)
  }

  function exportEnrolments() {
    const rows = [
      [
        'Course',
        'Student ID',
        'Student Name',
        'Enrolled At',
        'Status',
      ],
      ...enrolments.map((enrolment) => [
        getCourse(enrolment.courseId)?.code ?? enrolment.courseId,
        enrolment.studentId,
        enrolment.studentName,
        enrolment.enrolledAt,
        enrolment.status,
      ]),
    ]

    downloadCsv('nexus-lms-enrolments.csv', rows)
  }

  function exportAssignments() {
    const rows = [
      [
        'Course',
        'Assignment',
        'Due Date',
        'Total Marks',
        'Status',
        'Created By',
      ],
      ...assignments.map((assignment) => [
        getCourse(assignment.courseId)?.code ?? assignment.courseId,
        assignment.title,
        assignment.dueDate,
        assignment.totalMarks,
        assignment.status,
        assignment.createdBy,
      ]),
    ]

    downloadCsv('nexus-lms-assignments.csv', rows)
  }

  function downloadCsv(filename: string, rows: unknown[][]) {
    const csv = rows
      .map((row) => row.map((cell) => csvEscape(cell)).join(','))
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

  function signOut() {
    localStorage.removeItem('nexussis_session')
    localStorage.removeItem('nexus_role')
    localStorage.removeItem('nexus_username')
    localStorage.removeItem('userSession')

    window.location.href = '/dashboard'
  }

  function setTab(tab: Tab) {
    setActiveTab(tab)
    setSearch('')
    setCourseFilter('All')
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
                Learning Management System
              </h1>

              <p className="mt-1 text-sm text-slate-300">
                Courses, learning materials, announcements, assignments and
                student learning activities.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/courses"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Courses
              </Link>

              <Link
                href="/admin/lecturers"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Lecturers
              </Link>

              <Link
                href="/admin/students"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Students
              </Link>

              <button
                onClick={signOut}
                className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="LMS Courses"
            value={lmsCourses.filter((item) => item.status === 'Active').length}
            icon="📚"
          />

          <StatCard
            label="Materials"
            value={materials.length}
            icon="📄"
          />

          <StatCard
            label="Assignments"
            value={assignments.length}
            icon="📝"
          />

          <StatCard
            label="Enrolments"
            value={
              enrolments.filter((item) => item.status === 'Active').length
            }
            icon="👨‍🎓"
          />
        </div>

        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
            <TabButton
              active={activeTab === 'dashboard'}
              onClick={() => setTab('dashboard')}
            >
              Dashboard
            </TabButton>

            <TabButton
              active={activeTab === 'courses'}
              onClick={() => setTab('courses')}
            >
              LMS Courses
            </TabButton>

            <TabButton
              active={activeTab === 'materials'}
              onClick={() => setTab('materials')}
            >
              Materials
            </TabButton>

            <TabButton
              active={activeTab === 'announcements'}
              onClick={() => setTab('announcements')}
            >
              Announcements
            </TabButton>

            <TabButton
              active={activeTab === 'assignments'}
              onClick={() => setTab('assignments')}
            >
              Assignments
            </TabButton>

            <TabButton
              active={activeTab === 'enrolments'}
              onClick={() => setTab('enrolments')}
            >
              Enrolments
            </TabButton>

            <TabButton
              active={activeTab === 'submissions'}
              onClick={() => setTab('submissions')}
            >
              Submissions
            </TabButton>
          </div>

          <div className="p-6">
            {activeTab !== 'dashboard' && (
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search..."
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <select
                    value={courseFilter}
                    onChange={(event) => setCourseFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="All">All Courses</option>

                    {lmsCourses.map((course) => (
                      <option key={course.id} value={course.courseId}>
                        {course.code} - {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeTab === 'courses' && (
                    <>
                      <button
                        onClick={addLmsCourse}
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        + Add LMS Course
                      </button>

                      <button
                        onClick={exportLmsCourses}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      >
                        Export
                      </button>
                    </>
                  )}

                  {activeTab === 'materials' && (
                    <button
                      onClick={openMaterialModal}
                      className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      + Add Material
                    </button>
                  )}

                  {activeTab === 'announcements' && (
                    <button
                      onClick={openAnnouncementModal}
                      className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      + New Announcement
                    </button>
                  )}

                  {activeTab === 'assignments' && (
                    <>
                      <button
                        onClick={openAssignmentModal}
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        + New Assignment
                      </button>

                      <button
                        onClick={exportAssignments}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      >
                        Export
                      </button>
                    </>
                  )}

                  {activeTab === 'enrolments' && (
                    <>
                      <button
                        onClick={openEnrolmentModal}
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        + Enrol Student
                      </button>

                      <button
                        onClick={exportEnrolments}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      >
                        Export
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                lmsCourses={lmsCourses}
                materials={materials}
                announcements={announcements}
                assignments={assignments}
                enrolments={enrolments}
                submissions={submissions}
                courses={courses}
                setTab={setTab}
              />
            )}

            {activeTab === 'courses' && (
              <CoursesView
                courses={filteredCourses}
                onToggle={toggleLmsCourse}
                onRemove={removeLmsCourse}
              />
            )}

            {activeTab === 'materials' && (
              <MaterialsView
                materials={filteredMaterials}
                courses={courses}
                onDelete={deleteMaterial}
              />
            )}

            {activeTab === 'announcements' && (
              <AnnouncementsView
                announcements={filteredAnnouncements}
                courses={courses}
                onDelete={deleteAnnouncement}
              />
            )}

            {activeTab === 'assignments' && (
              <AssignmentsView
                assignments={filteredAssignments}
                courses={courses}
                onToggle={toggleAssignment}
                onDelete={deleteAssignment}
              />
            )}

            {activeTab === 'enrolments' && (
              <EnrolmentsView
                enrolments={enrolments}
                courses={courses}
                onStatusChange={updateEnrolmentStatus}
              />
            )}

            {activeTab === 'submissions' && (
              <SubmissionsView
                submissions={submissions}
                assignments={assignments}
                courses={courses}
                onGrade={openSubmissionModal}
              />
            )}
          </div>
        </div>
      </div>

      {showCourseModal && (
        <CourseModal
          courses={activeCourses}
          lecturers={lecturers}
          onClose={() => setShowCourseModal(false)}
          onSave={createLmsCourse}
        />
      )}

      {showMaterialModal && (
        <Modal
          title="Add Learning Material"
          onClose={() => setShowMaterialModal(false)}
        >
          <div className="space-y-4">
            <Field label="Course">
              <select
                value={materialForm.courseId}
                onChange={(event) => {
                  const courseId = event.target.value
                  const lmsCourse = getLmsCourse(courseId)

                  setMaterialForm((current) => ({
                    ...current,
                    courseId,
                    uploadedBy: lmsCourse?.lecturerName ?? current.uploadedBy,
                  }))
                }}
                className="input"
              >
                {lmsCourses.map((course) => (
                  <option key={course.id} value={course.courseId}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Title">
              <input
                value={materialForm.title}
                onChange={(event) =>
                  setMaterialForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="input"
                placeholder="Lecture title"
              />
            </Field>

            <Field label="Material Type">
              <select
                value={materialForm.type}
                onChange={(event) =>
                  setMaterialForm((current) => ({
                    ...current,
                    type: event.target.value as Material['type'],
                  }))
                }
                className="input"
              >
                <option>Lecture Note</option>
                <option>PDF</option>
                <option>Video</option>
                <option>Link</option>
                <option>Other</option>
              </select>
            </Field>

            <Field label="Description">
              <textarea
                value={materialForm.description}
                onChange={(event) =>
                  setMaterialForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                className="input min-h-24"
                placeholder="Describe the learning material..."
              />
            </Field>

            <Field label="Resource URL (optional)">
              <input
                value={materialForm.resourceUrl}
                onChange={(event) =>
                  setMaterialForm((current) => ({
                    ...current,
                    resourceUrl: event.target.value,
                  }))
                }
                className="input"
                placeholder="https://..."
              />
            </Field>

            <Field label="Uploaded By">
              <input
                value={materialForm.uploadedBy}
                onChange={(event) =>
                  setMaterialForm((current) => ({
                    ...current,
                    uploadedBy: event.target.value,
                  }))
                }
                className="input"
              />
            </Field>

            <ModalButtons
              onClose={() => setShowMaterialModal(false)}
              onSave={saveMaterial}
              saveText="Save Material"
            />
          </div>
        </Modal>
      )}

      {showAnnouncementModal && (
        <Modal
          title="Create Course Announcement"
          onClose={() => setShowAnnouncementModal(false)}
        >
          <div className="space-y-4">
            <Field label="Course">
              <select
                value={announcementForm.courseId}
                onChange={(event) => {
                  const courseId = event.target.value
                  const lmsCourse = getLmsCourse(courseId)

                  setAnnouncementForm((current) => ({
                    ...current,
                    courseId,
                    postedBy: lmsCourse?.lecturerName ?? current.postedBy,
                  }))
                }}
                className="input"
              >
                {lmsCourses.map((course) => (
                  <option key={course.id} value={course.courseId}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Announcement Title">
              <input
                value={announcementForm.title}
                onChange={(event) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="input"
                placeholder="Announcement title"
              />
            </Field>

            <Field label="Message">
              <textarea
                value={announcementForm.message}
                onChange={(event) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    message: event.target.value,
                  }))
                }
                className="input min-h-32"
                placeholder="Announcement message..."
              />
            </Field>

            <Field label="Posted By">
              <input
                value={announcementForm.postedBy}
                onChange={(event) =>
                  setAnnouncementForm((current) => ({
                    ...current,
                    postedBy: event.target.value,
                  }))
                }
                className="input"
              />
            </Field>

            <ModalButtons
              onClose={() => setShowAnnouncementModal(false)}
              onSave={saveAnnouncement}
              saveText="Publish Announcement"
            />
          </div>
        </Modal>
      )}

      {showAssignmentModal && (
        <Modal
          title="Create Assignment"
          onClose={() => setShowAssignmentModal(false)}
        >
          <div className="space-y-4">
            <Field label="Course">
              <select
                value={assignmentForm.courseId}
                onChange={(event) => {
                  const courseId = event.target.value
                  const lmsCourse = getLmsCourse(courseId)

                  setAssignmentForm((current) => ({
                    ...current,
                    courseId,
                    createdBy: lmsCourse?.lecturerName ?? current.createdBy,
                  }))
                }}
                className="input"
              >
                {lmsCourses.map((course) => (
                  <option key={course.id} value={course.courseId}>
                    {course.code} - {course.title}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Assignment Title">
              <input
                value={assignmentForm.title}
                onChange={(event) =>
                  setAssignmentForm((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                className="input"
                placeholder="Assignment title"
              />
            </Field>

            <Field label="Instructions">
              <textarea
                value={assignmentForm.instructions}
                onChange={(event) =>
                  setAssignmentForm((current) => ({
                    ...current,
                    instructions: event.target.value,
                  }))
                }
                className="input min-h-32"
                placeholder="Assignment instructions..."
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Due Date">
                <input
                  type="date"
                  value={assignmentForm.dueDate}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                  className="input"
                />
              </Field>

              <Field label="Total Marks">
                <input
                  type="number"
                  min="1"
                  value={assignmentForm.totalMarks}
                  onChange={(event) =>
                    setAssignmentForm((current) => ({
                      ...current,
                      totalMarks: event.target.value,
                    }))
                  }
                  className="input"
                />
              </Field>
            </div>

            <Field label="Created By">
              <input
                value={assignmentForm.createdBy}
                onChange={(event) =>
                  setAssignmentForm((current) => ({
                    ...current,
                    createdBy: event.target.value,
                  }))
                }
                className="input"
              />
            </Field>

            <ModalButtons
              onClose={() => setShowAssignmentModal(false)}
              onSave={saveAssignment}
              saveText="Create Assignment"
            />
          </div>
        </Modal>
      )}

      {showEnrolmentModal && (
        <Modal
          title="Enrol Student in Course"
          onClose={() => setShowEnrolmentModal(false)}
        >
          <div className="space-y-4">
            <Field label="Course">
              <select
                value={enrolmentForm.courseId}
                onChange={(event) =>
                  setEnrolmentForm((current) => ({
                    ...current,
                    courseId: event.target.value,
                  }))
                }
                className="input"
              >
                {lmsCourses
                  .filter((course) => course.status === 'Active')
                  .map((course) => (
                    <option key={course.id} value={course.courseId}>
                      {course.code} - {course.title}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Student">
              <select
                value={enrolmentForm.studentId}
                onChange={(event) =>
                  setEnrolmentForm((current) => ({
                    ...current,
                    studentId: event.target.value,
                  }))
                }
                className="input"
              >
                {students.map((student) => (
                  <option key={student.studentId} value={student.studentId}>
                    {student.studentId} - {student.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              The enrolment is linked to the student's central Student ID.
            </div>

            <ModalButtons
              onClose={() => setShowEnrolmentModal(false)}
              onSave={saveEnrolment}
              saveText="Enrol Student"
            />
          </div>
        </Modal>
      )}

      {showSubmissionModal && selectedSubmission && (
        <SubmissionModal
          submission={selectedSubmission}
          assignment={assignments.find(
            (item) => item.id === selectedSubmission.assignmentId,
          )}
          onClose={() => setShowSubmissionModal(false)}
          onSave={saveSubmissionGrade}
        />
      )}
    </main>
  )
}

function StatCard({
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
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
          {icon}
        </div>
      </div>
    </div>
  )
}

function TabButton({
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

function DashboardView({
  lmsCourses,
  materials,
  announcements,
  assignments,
  enrolments,
  submissions,
  courses,
  setTab,
}: {
  lmsCourses: LMSCourse[]
  materials: Material[]
  announcements: Announcement[]
  assignments: Assignment[]
  enrolments: Enrolment[]
  submissions: Submission[]
  courses: Course[]
  setTab: (tab: Tab) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          LMS Dashboard
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Central learning activity overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickCard
          title="Manage Courses"
          description="Connect academic courses with lecturers and the LMS."
          button="Open Courses"
          onClick={() => setTab('courses')}
        />

        <QuickCard
          title="Learning Materials"
          description="Publish lecture notes, PDFs, videos and links."
          button="Open Materials"
          onClick={() => setTab('materials')}
        />

        <QuickCard
          title="Assignments"
          description="Create coursework and manage due dates and marks."
          button="Open Assignments"
          onClick={() => setTab('assignments')}
        />

        <QuickCard
          title="Enrolments"
          description="Connect registered students to their courses."
          button="Open Enrolments"
          onClick={() => setTab('enrolments')}
        />

        <QuickCard
          title="Announcements"
          description="Publish course announcements to students."
          button="Open Announcements"
          onClick={() => setTab('announcements')}
        />

        <QuickCard
          title="Submissions"
          description="Review and grade student assignment submissions."
          button="Open Submissions"
          onClick={() => setTab('submissions')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-bold text-slate-900">Active LMS Courses</h3>
          </div>

          <div className="divide-y divide-slate-100">
            {lmsCourses.filter((course) => course.status === 'Active').length ===
            0 ? (
              <EmptyState message="No active LMS courses." />
            ) : (
              lmsCourses
                .filter((course) => course.status === 'Active')
                .slice(0, 5)
                .map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between px-5 py-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">
                        {course.code}
                      </p>
                      <p className="text-sm text-slate-500">
                        {course.title}
                      </p>
                    </div>

                    <span className="text-xs text-slate-500">
                      {course.lecturerName}
                    </span>
                  </div>
                ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-bold text-slate-900">
              Recent Announcements
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {announcements.length === 0 ? (
              <EmptyState message="No announcements have been posted." />
            ) : (
              announcements.slice(0, 5).map((announcement) => {
                const course = courses.find(
                  (item) => item.id === announcement.courseId,
                )

                return (
                  <div key={announcement.id} className="px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-slate-900">
                        {announcement.title}
                      </p>

                      <span className="text-xs text-slate-400">
                        {formatDate(announcement.postedAt)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs font-semibold text-blue-600">
                      {course?.code ?? 'Course'}
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                      {announcement.message}
                    </p>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
        <h3 className="font-bold text-blue-900">LMS Integration</h3>

        <p className="mt-2 text-sm leading-6 text-blue-800">
          This LMS currently reads Course Management, Lecturer Management and
          central Student Registration data from Nexus SIS localStorage. The
          final system integration will move these relationships into the
          central university database.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <IntegrationBox
            label="Academic Courses"
            value={courses.length}
          />

          <IntegrationBox
            label="Learning Materials"
            value={materials.length}
          />

          <IntegrationBox
            label="Student Enrolments"
            value={enrolments.length}
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <IntegrationBox
            label="Assignments"
            value={assignments.length}
          />

          <IntegrationBox
            label="Submissions"
            value={submissions.length}
          />
        </div>
      </div>
    </div>
  )
}

function QuickCard({
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
      <h3 className="font-bold text-slate-900">{title}</h3>

      <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
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

function IntegrationBox({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function CoursesView({
  courses,
  onToggle,
  onRemove,
}: {
  courses: LMSCourse[]
  onToggle: (course: LMSCourse) => void
  onRemove: (course: LMSCourse) => void
}) {
  if (courses.length === 0) {
    return <EmptyState message="No LMS courses found." />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Course</th>
            <th className="px-5 py-3">Title</th>
            <th className="px-5 py-3">Lecturer</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {courses.map((course) => (
            <tr key={course.id} className="hover:bg-slate-50">
              <td className="px-5 py-4 font-bold text-blue-700">
                {course.code}
              </td>

              <td className="px-5 py-4 text-slate-700">{course.title}</td>

              <td className="px-5 py-4 text-slate-600">
                {course.lecturerName}
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  status={course.status}
                  active={course.status === 'Active'}
                />
              </td>

              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onToggle(course)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                  >
                    {course.status === 'Active' ? 'Deactivate' : 'Activate'}
                  </button>

                  <button
                    onClick={() => onRemove(course)}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Remove
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

function MaterialsView({
  materials,
  courses,
  onDelete,
}: {
  materials: Material[]
  courses: Course[]
  onDelete: (material: Material) => void
}) {
  if (materials.length === 0) {
    return <EmptyState message="No learning materials found." />
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {materials.map((material) => {
        const course = courses.find(
          (item) => item.id === material.courseId,
        )

        return (
          <div
            key={material.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                  {course?.code ?? 'Course'}
                </span>

                <h3 className="mt-1 font-bold text-slate-900">
                  {material.title}
                </h3>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {material.type}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              {material.description || 'No description provided.'}
            </p>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>By {material.uploadedBy}</span>
              <span>{formatDate(material.uploadedAt)}</span>
            </div>

            <div className="mt-4 flex gap-2">
              {material.resourceUrl && (
                <a
                  href={material.resourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Open Resource
                </a>
              )}

              <button
                onClick={() => onDelete(material)}
                className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AnnouncementsView({
  announcements,
  courses,
  onDelete,
}: {
  announcements: Announcement[]
  courses: Course[]
  onDelete: (announcement: Announcement) => void
}) {
  if (announcements.length === 0) {
    return <EmptyState message="No announcements found." />
  }

  return (
    <div className="space-y-4">
      {announcements.map((announcement) => {
        const course = courses.find(
          (item) => item.id === announcement.courseId,
        )

        return (
          <div
            key={announcement.id}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-blue-600">
                  {course?.code ?? 'Course'}
                </span>

                <h3 className="mt-1 text-lg font-bold text-slate-900">
                  {announcement.title}
                </h3>
              </div>

              <span className="text-xs text-slate-400">
                {formatDate(announcement.postedAt)}
              </span>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {announcement.message}
            </p>

            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Posted by {announcement.postedBy}
              </span>

              <button
                onClick={() => onDelete(announcement)}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AssignmentsView({
  assignments,
  courses,
  onToggle,
  onDelete,
}: {
  assignments: Assignment[]
  courses: Course[]
  onToggle: (assignment: Assignment) => void
  onDelete: (assignment: Assignment) => void
}) {
  if (assignments.length === 0) {
    return <EmptyState message="No assignments found." />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Course</th>
            <th className="px-5 py-3">Assignment</th>
            <th className="px-5 py-3">Due Date</th>
            <th className="px-5 py-3">Marks</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {assignments.map((assignment) => {
            const course = courses.find(
              (item) => item.id === assignment.courseId,
            )

            return (
              <tr key={assignment.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-bold text-blue-700">
                  {course?.code ?? '-'}
                </td>

                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-900">
                    {assignment.title}
                  </p>

                  <p className="mt-1 max-w-md truncate text-xs text-slate-500">
                    {assignment.instructions}
                  </p>
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {formatDate(assignment.dueDate)}
                </td>

                <td className="px-5 py-4 font-semibold text-slate-700">
                  {assignment.totalMarks}
                </td>

                <td className="px-5 py-4">
                  <StatusBadge
                    status={assignment.status}
                    active={assignment.status === 'Open'}
                  />
                </td>

                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => onToggle(assignment)}
                      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                    >
                      {assignment.status === 'Open' ? 'Close' : 'Open'}
                    </button>

                    <button
                      onClick={() => onDelete(assignment)}
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EnrolmentsView({
  enrolments,
  courses,
  onStatusChange,
}: {
  enrolments: Enrolment[]
  courses: Course[]
  onStatusChange: (
    enrolment: Enrolment,
    status: Enrolment['status'],
  ) => void
}) {
  if (enrolments.length === 0) {
    return (
      <EmptyState message="No student enrolments yet. Use Enrol Student to add one." />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Course</th>
            <th className="px-5 py-3">Student ID</th>
            <th className="px-5 py-3">Student</th>
            <th className="px-5 py-3">Enrolled</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {enrolments.map((enrolment) => {
            const course = courses.find(
              (item) => item.id === enrolment.courseId,
            )

            return (
              <tr key={enrolment.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-bold text-blue-700">
                  {course?.code ?? enrolment.courseId}
                </td>

                <td className="px-5 py-4 font-mono text-xs text-slate-600">
                  {enrolment.studentId}
                </td>

                <td className="px-5 py-4 font-semibold text-slate-800">
                  {enrolment.studentName}
                </td>

                <td className="px-5 py-4 text-slate-500">
                  {formatDate(enrolment.enrolledAt)}
                </td>

                <td className="px-5 py-4">
                  <StatusBadge
                    status={enrolment.status}
                    active={enrolment.status === 'Active'}
                  />
                </td>

                <td className="px-5 py-4">
                  <select
                    value={enrolment.status}
                    onChange={(event) =>
                      onStatusChange(
                        enrolment,
                        event.target.value as Enrolment['status'],
                      )
                    }
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  >
                    <option>Active</option>
                    <option>Dropped</option>
                    <option>Completed</option>
                  </select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function SubmissionsView({
  submissions,
  assignments,
  courses,
  onGrade,
}: {
  submissions: Submission[]
  assignments: Assignment[]
  courses: Course[]
  onGrade: (submission: Submission) => void
}) {
  if (submissions.length === 0) {
    return (
      <EmptyState message="No assignment submissions have been recorded yet." />
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Course</th>
            <th className="px-5 py-3">Assignment</th>
            <th className="px-5 py-3">Student</th>
            <th className="px-5 py-3">Submitted</th>
            <th className="px-5 py-3">Marks</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {submissions.map((submission) => {
            const assignment = assignments.find(
              (item) => item.id === submission.assignmentId,
            )

            const course = courses.find(
              (item) => item.id === assignment?.courseId,
            )

            return (
              <tr key={submission.id} className="hover:bg-slate-50">
                <td className="px-5 py-4 font-bold text-blue-700">
                  {course?.code ?? '-'}
                </td>

                <td className="px-5 py-4 font-semibold text-slate-800">
                  {assignment?.title ?? '-'}
                </td>

                <td className="px-5 py-4">
                  <p className="font-semibold text-slate-800">
                    {submission.studentName}
                  </p>

                  <p className="font-mono text-xs text-slate-400">
                    {submission.studentId}
                  </p>
                </td>

                <td className="px-5 py-4 text-slate-500">
                  {formatDate(submission.submittedAt)}
                </td>

                <td className="px-5 py-4 font-semibold text-slate-700">
                  {submission.marks ?? '-'}
                  {assignment ? ` / ${assignment.totalMarks}` : ''}
                </td>

                <td className="px-5 py-4">
                  <StatusBadge
                    status={submission.status}
                    active={submission.status === 'Graded'}
                  />
                </td>

                <td className="px-5 py-4">
                  <button
                    onClick={() => onGrade(submission)}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    {submission.status === 'Graded' ? 'Edit Grade' : 'Grade'}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function CourseModal({
  courses,
  lecturers,
  onClose,
  onSave,
}: {
  courses: Course[]
  lecturers: Lecturer[]
  onClose: () => void
  onSave: (course: Course, lecturer: Lecturer) => void
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '')
  const [lecturerId, setLecturerId] = useState(
    lecturers.find((lecturer) => lecturer.status !== 'Inactive')?.staffId ??
      lecturers[0]?.staffId ??
      '',
  )

  const availableLecturers = lecturers.filter(
    (lecturer) => lecturer.status !== 'Inactive',
  )

  const selectedCourse = courses.find((course) => course.id === courseId)

  function save() {
    const course = courses.find((item) => item.id === courseId)
    const lecturer = lecturers.find(
      (item) => item.staffId === lecturerId,
    )

    if (!course || !lecturer) {
      alert('Select a valid course and lecturer.')
      return
    }

    onSave(course, lecturer)
  }

  return (
    <Modal title="Add Course to LMS" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Academic Course">
          <select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="input"
          >
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} - {course.title}
              </option>
            ))}
          </select>
        </Field>

        {selectedCourse && (
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <p className="font-semibold text-slate-800">
              {selectedCourse.code} — {selectedCourse.title}
            </p>

            <p className="mt-1 text-slate-500">
              {selectedCourse.department || 'Department not specified'}
            </p>
          </div>
        )}

        <Field label="Lecturer">
          <select
            value={lecturerId}
            onChange={(event) => setLecturerId(event.target.value)}
            className="input"
          >
            {availableLecturers.length === 0 ? (
              <option value="">No active lecturers available</option>
            ) : (
              availableLecturers.map((lecturer) => (
                <option key={lecturer.staffId} value={lecturer.staffId}>
                  {lecturer.name} ({lecturer.staffId})
                </option>
              ))
            )}
          </select>
        </Field>

        <ModalButtons
          onClose={onClose}
          onSave={save}
          saveText="Add to LMS"
        />
      </div>
    </Modal>
  )
}

function SubmissionModal({
  submission,
  assignment,
  onClose,
  onSave,
}: {
  submission: Submission
  assignment?: Assignment
  onClose: () => void
  onSave: (marks: string, feedback: string) => void
}) {
  const [marks, setMarks] = useState(
    submission.marks !== undefined ? String(submission.marks) : '',
  )

  const [feedback, setFeedback] = useState(submission.feedback ?? '')

  return (
    <Modal title="Grade Submission" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="font-semibold text-slate-900">
            {submission.studentName}
          </p>

          <p className="mt-1 font-mono text-xs text-slate-500">
            {submission.studentId}
          </p>

          <p className="mt-2 text-sm text-slate-600">
            {assignment?.title ?? 'Assignment'}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Maximum: {assignment?.totalMarks ?? '-'} marks
          </p>
        </div>

        <Field label="Marks">
          <input
            type="number"
            min="0"
            max={assignment?.totalMarks}
            value={marks}
            onChange={(event) => setMarks(event.target.value)}
            className="input"
          />
        </Field>

        <Field label="Feedback">
          <textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            className="input min-h-28"
            placeholder="Lecturer feedback..."
          />
        </Field>

        <ModalButtons
          onClose={onClose}
          onSave={() => onSave(marks, feedback)}
          saveText="Save Grade"
        />
      </div>
    </Modal>
  )
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function ModalButtons({
  onClose,
  onSave,
  saveText,
}: {
  onClose: () => void
  onSave: () => void
  saveText: string
}) {
  return (
    <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
      <button
        onClick={onClose}
        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>

      <button
        onClick={onSave}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {saveText}
      </button>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {children}
    </label>
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

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  )
}
