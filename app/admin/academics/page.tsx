'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { protectNexusPage } from "@/lib/nexus-access"
import {
  NEXUS_KEYS,
  type Faculty as CentralFaculty,
  type Department as CentralDepartment,
  type Programme as CentralProgramme,
} from "@/lib/nexus-data"

type Department = {
  id: string
  name: string
  code: string
  head: string
  programmes: string[]
}

type Faculty = {
  id: string
  name: string
  code: string
  dean: string
  departments: Department[]
}

const STORAGE_KEY = 'nexusSIS_academic_structure'
const SETTINGS_KEY = 'nexusSIS_academic_settings'
const PROGRAMME_METADATA_KEY = 'nexusSIS_programme_metadata'

type AcademicSettings = {
  academicYear: string
  semester: 'Semester 1' | 'Semester 2'
  registrationOpen: boolean
  resultsOpen: boolean
}

type ProgrammeMetadata = {
  facultyId: string
  departmentId: string
  programmeName: string
  code: string
  award: string
  duration: string
  mode: 'Full Time' | 'Part Time' | 'Online' | 'Blended'
  status: 'Active' | 'Inactive'
}

const defaultSettings: AcademicSettings = {
  academicYear: '2026',
  semester: 'Semester 1',
  registrationOpen: true,
  resultsOpen: false,
}

const defaultProgrammeMetadata: ProgrammeMetadata[] = []


function readCentralFacultyRecords(): CentralFaculty[] {
  try {
    const raw = localStorage.getItem(NEXUS_KEYS.faculties)

    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is CentralFaculty =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as CentralFaculty).id === 'string' &&
        typeof (item as CentralFaculty).name === 'string'
    )
  } catch {
    return []
  }
}

function readCentralDepartmentRecords(): CentralDepartment[] {
  try {
    const raw = localStorage.getItem(NEXUS_KEYS.departments)

    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is CentralDepartment =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as CentralDepartment).id === 'string' &&
        typeof (item as CentralDepartment).name === 'string'
    )
  } catch {
    return []
  }
}

function readCentralProgrammeRecords(): CentralProgramme[] {
  try {
    const raw = localStorage.getItem(NEXUS_KEYS.programmes)

    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) return []

    return parsed.filter(
      (item): item is CentralProgramme =>
        !!item &&
        typeof item === 'object' &&
        typeof (item as CentralProgramme).id === 'string' &&
        typeof (item as CentralProgramme).name === 'string'
    )
  } catch {
    return []
  }
}

function saveCentralAcademicRecords(
  faculties: CentralFaculty[],
  departments: CentralDepartment[],
  programmes: CentralProgramme[]
) {
  localStorage.setItem(
    NEXUS_KEYS.faculties,
    JSON.stringify(faculties)
  )

  localStorage.setItem(
    NEXUS_KEYS.departments,
    JSON.stringify(departments)
  )

  localStorage.setItem(
    NEXUS_KEYS.programmes,
    JSON.stringify(programmes)
  )

  window.dispatchEvent(
    new Event('nexusSIS_academics_updated')
  )
}

function centralRecordsToAcademicStructure(
  centralFaculties: CentralFaculty[],
  centralDepartments: CentralDepartment[],
  centralProgrammes: CentralProgramme[]
): Faculty[] {
  return centralFaculties.map((faculty) => {
    const facultyDepartments = centralDepartments
      .filter((department) => department.facultyId === faculty.id)
      .map((department) => {
        const departmentProgrammes = centralProgrammes
          .filter(
            (programme) =>
              programme.facultyId === faculty.id &&
              programme.departmentId === department.id
          )
          .map((programme) => programme.name)

        return {
          id: department.id,
          name: department.name,
          code: department.code,
          head: department.headOfDepartment || '',
          programmes: Array.from(new Set(departmentProgrammes)),
        }
      })

    return {
      id: faculty.id,
      name: faculty.name,
      code: faculty.code,
      dean: faculty.dean || '',
      departments: facultyDepartments,
    }
  })
}

function academicStructureToCentralRecords(
  structure: Faculty[],
  existingFaculties: CentralFaculty[] = [],
  existingDepartments: CentralDepartment[] = [],
  existingProgrammes: CentralProgramme[] = []
) {
  const now = new Date().toISOString()

  const faculties: CentralFaculty[] = structure.map((faculty) => {
    const existing = existingFaculties.find(
      (item) => item.id === faculty.id
    )

    return {
      id: faculty.id,
      code: faculty.code,
      name: faculty.name,
      dean: faculty.dean || undefined,
      status: existing?.status || 'Active',
    }
  })

  const departments: CentralDepartment[] = structure.flatMap(
    (faculty) =>
      faculty.departments.map((department) => {
        const existing = existingDepartments.find(
          (item) => item.id === department.id
        )

        return {
          id: department.id,
          code: department.code,
          name: department.name,
          facultyId: faculty.id,
          headOfDepartment:
            department.head || undefined,
          status: existing?.status || 'Active',
        }
      })
  )

  const programmes: CentralProgramme[] = structure.flatMap(
    (faculty) =>
      faculty.departments.flatMap((department) =>
        department.programmes.map((programmeName, index) => {
          const existing = existingProgrammes.find(
            (item) =>
              item.facultyId === faculty.id &&
              item.departmentId === department.id &&
              item.name === programmeName
          )

          const metadata = programmeMetadataForCentralRecord(
            faculty.id,
            department.id,
            programmeName
          )

          return {
            id:
              existing?.id ||
              `PROG-${faculty.id}-${department.id}-${index + 1}`,
            code:
              metadata?.code ||
              existing?.code ||
              programmeCodeFromName(
                programmeName,
                department.code,
                index + 1
              ),
            name: programmeName,
            facultyId: faculty.id,
            departmentId: department.id,
            award:
              metadata?.award ||
              existing?.award ||
              '',
            durationYears:
              metadata?.duration
                ? Number(metadata.duration) || 4
                : existing?.durationYears || 4,
            studentType:
              existing?.studentType || 'Undergraduate',
            status:
              metadata?.status ||
              existing?.status ||
              'Active',
          }
        })
      )
  )

  void now

  return {
    faculties,
    departments,
    programmes,
  }
}

function programmeCodeFromName(
  programmeName: string,
  departmentCode: string,
  index: number
): string {
  const compact = programmeName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 10)

  const department = departmentCode
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 8)

  return `${department || 'PROG'}-${compact || index}`
}

function programmeMetadataForCentralRecord(
  facultyId: string,
  departmentId: string,
  programmeName: string
): ProgrammeMetadata | undefined {
  try {
    const raw = localStorage.getItem(
      PROGRAMME_METADATA_KEY
    )

    if (!raw) return undefined

    const parsed: unknown = JSON.parse(raw)

    if (!Array.isArray(parsed)) return undefined

    const metadata = parsed as ProgrammeMetadata[]

    return metadata.find(
      (item) =>
        item.facultyId === facultyId &&
        item.departmentId === departmentId &&
        item.programmeName === programmeName
    )
  } catch {
    return undefined
  }
}

function migrateLegacyAcademicStructureToCentral(
  legacyStructure: Faculty[]
) {
  const existingFaculties = readCentralFacultyRecords()
  const existingDepartments = readCentralDepartmentRecords()
  const existingProgrammes = readCentralProgrammeRecords()

  if (
    existingFaculties.length > 0 ||
    existingDepartments.length > 0 ||
    existingProgrammes.length > 0
  ) {
    return
  }

  const central = academicStructureToCentralRecords(
    legacyStructure,
    existingFaculties,
    existingDepartments,
    existingProgrammes
  )

  saveCentralAcademicRecords(
    central.faculties,
    central.departments,
    central.programmes
  )
}

const defaultFaculties: Faculty[] = [
  {
    id: 'fac-agr',
    name: 'Faculty of Agriculture',
    code: 'FOA',
    dean: 'Dean - Agriculture',
    departments: [
      {
        id: 'dep-agr',
        name: 'Department of Agriculture',
        code: 'AGR',
        head: 'Head of Agriculture',
        programmes: [
          'Bachelor of Agriculture',
          'Diploma in Agriculture',
          'Certificate in Agriculture',
        ],
      },
      {
        id: 'dep-animal',
        name: 'Department of Animal Science',
        code: 'ANS',
        head: 'Head of Animal Science',
        programmes: [
          'Bachelor of Animal Science',
          'Diploma in Animal Science',
        ],
      },
    ],
  },
  {
    id: 'fac-bus',
    name: 'Faculty of Business & Economics',
    code: 'FBE',
    dean: 'Dean - Business & Economics',
    departments: [
      {
        id: 'dep-accounting',
        name: 'Department of Accounting',
        code: 'ACC',
        head: 'Head of Accounting',
        programmes: [
          'Bachelor of Accounting',
          'Diploma in Accounting',
        ],
      },
      {
        id: 'dep-business',
        name: 'Department of Business',
        code: 'BUS',
        head: 'Head of Business',
        programmes: [
          'Bachelor of Business Administration',
          'Bachelor of Management',
          'Diploma in Business',
        ],
      },
      {
        id: 'dep-economics',
        name: 'Department of Economics',
        code: 'ECO',
        head: 'Head of Economics',
        programmes: [
          'Bachelor of Economics',
          'Diploma in Economics',
        ],
      },
    ],
  },
  {
    id: 'fac-edu',
    name: 'Faculty of Education',
    code: 'FED',
    dean: 'Dean - Education',
    departments: [
      {
        id: 'dep-education',
        name: 'Department of Education',
        code: 'EDU',
        head: 'Head of Education',
        programmes: [
          'Bachelor of Education',
          'Bachelor of Primary Education',
          'Diploma in Education',
        ],
      },
      {
        id: 'dep-teacher',
        name: 'Department of Teacher Education',
        code: 'TED',
        head: 'Head of Teacher Education',
        programmes: [
          'Bachelor of Teaching',
          'Diploma in Teaching',
        ],
      },
    ],
  },
  {
    id: 'fac-eng',
    name: 'Faculty of Engineering',
    code: 'FEN',
    dean: 'Dean - Engineering',
    departments: [
      {
        id: 'dep-civil',
        name: 'Department of Civil Engineering',
        code: 'CVE',
        head: 'Head of Civil Engineering',
        programmes: [
          'Bachelor of Civil Engineering',
          'Diploma in Civil Engineering',
        ],
      },
      {
        id: 'dep-electrical',
        name: 'Department of Electrical Engineering',
        code: 'EEE',
        head: 'Head of Electrical Engineering',
        programmes: [
          'Bachelor of Electrical Engineering',
          'Diploma in Electrical Engineering',
        ],
      },
      {
        id: 'dep-mechanical',
        name: 'Department of Mechanical Engineering',
        code: 'MEE',
        head: 'Head of Mechanical Engineering',
        programmes: [
          'Bachelor of Mechanical Engineering',
          'Diploma in Mechanical Engineering',
        ],
      },
    ],
  },
  {
    id: 'fac-health',
    name: 'Faculty of Health Sciences',
    code: 'FHS',
    dean: 'Dean - Health Sciences',
    departments: [
      {
        id: 'dep-nursing',
        name: 'Department of Nursing',
        code: 'NUR',
        head: 'Head of Nursing',
        programmes: [
          'Bachelor of Nursing',
          'Diploma in Nursing',
        ],
      },
      {
        id: 'dep-public-health',
        name: 'Department of Public Health',
        code: 'PH',
        head: 'Head of Public Health',
        programmes: [
          'Bachelor of Public Health',
          'Diploma in Public Health',
        ],
      },
    ],
  },
  {
    id: 'fac-hss',
    name: 'Faculty of Humanities & Social Sciences',
    code: 'FHSS',
    dean: 'Dean - Humanities & Social Sciences',
    departments: [
      {
        id: 'dep-social',
        name: 'Department of Social Sciences',
        code: 'SOC',
        head: 'Head of Social Sciences',
        programmes: [
          'Bachelor of Social Science',
          'Bachelor of Sociology',
        ],
      },
      {
        id: 'dep-history',
        name: 'Department of History',
        code: 'HIS',
        head: 'Head of History',
        programmes: [
          'Bachelor of Arts in History',
          'Diploma in History',
        ],
      },
      {
        id: 'dep-language',
        name: 'Department of Languages & Literature',
        code: 'LAN',
        head: 'Head of Languages',
        programmes: [
          'Bachelor of Arts in English',
          'Bachelor of Arts in Literature',
        ],
      },
    ],
  },
  {
    id: 'fac-law',
    name: 'Faculty of Law',
    code: 'LAW',
    dean: 'Dean - Law',
    departments: [
      {
        id: 'dep-law',
        name: 'Department of Law',
        code: 'LAW',
        head: 'Head of Law',
        programmes: [
          'Bachelor of Laws',
          'Diploma in Law',
        ],
      },
    ],
  },
  {
    id: 'fac-science',
    name: 'Faculty of Science',
    code: 'FSC',
    dean: 'Dean - Science',
    departments: [
      {
        id: 'dep-compsci',
        name: 'Department of Computer Science',
        code: 'CSC',
        head: 'Head of Computer Science',
        programmes: [
          'Bachelor of Computer Science',
          'Bachelor of Information Technology',
          'Diploma in Information Technology',
        ],
      },
      {
        id: 'dep-mathematics',
        name: 'Department of Mathematics & Statistics',
        code: 'MAT',
        head: 'Head of Mathematics',
        programmes: [
          'Bachelor of Mathematics',
          'Bachelor of Statistics',
          'Diploma in Mathematics',
        ],
      },
      {
        id: 'dep-science',
        name: 'Department of Natural Sciences',
        code: 'NSC',
        head: 'Head of Natural Sciences',
        programmes: [
          'Bachelor of Science',
          'Diploma in Science',
        ],
      },
    ],
  },
  {
    id: 'fac-theology',
    name: 'Faculty of Theology & Philosophy',
    code: 'FTP',
    dean: 'Dean - Theology & Philosophy',
    departments: [
      {
        id: 'dep-theology',
        name: 'Department of Theology',
        code: 'THE',
        head: 'Head of Theology',
        programmes: [
          'Bachelor of Theology',
          'Diploma in Theology',
        ],
      },
      {
        id: 'dep-philosophy',
        name: 'Department of Philosophy',
        code: 'PHI',
        head: 'Head of Philosophy',
        programmes: [
          'Bachelor of Philosophy',
          'Diploma in Philosophy',
        ],
      },
    ],
  },
]

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

export default function AcademicStructurePage() {
  const [faculties, setFaculties] = useState<Faculty[]>([])
  const [selectedFacultyId, setSelectedFacultyId] = useState('')
  const [search, setSearch] = useState('')
  const [showFacultyModal, setShowFacultyModal] = useState(false)
  const [showDepartmentModal, setShowDepartmentModal] = useState(false)
  const [showProgrammeModal, setShowProgrammeModal] = useState(false)
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null)
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  )
  const [editingProgramme, setEditingProgramme] = useState('')
  const [message, setMessage] = useState('')

  const [facultyForm, setFacultyForm] = useState({
    name: '',
    code: '',
    dean: '',
  })

  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    code: '',
    head: '',
  })

  const [programmeForm, setProgrammeForm] = useState('')

  const [academicSettings, setAcademicSettings] =
    useState<AcademicSettings>(defaultSettings)

  const [programmeMetadata, setProgrammeMetadata] =
    useState<ProgrammeMetadata[]>(defaultProgrammeMetadata)

  const [showProgrammeDetailsModal, setShowProgrammeDetailsModal] =
    useState(false)

  const [editingProgrammeDetails, setEditingProgrammeDetails] =
    useState<ProgrammeMetadata | null>(null)

  const [programmeDetailsForm, setProgrammeDetailsForm] =
    useState<Omit<
      ProgrammeMetadata,
      'facultyId' | 'departmentId' | 'programmeName'
    >>({
      code: '',
      award: 'Bachelor Degree',
      duration: '4 Years',
      mode: 'Full Time',
      status: 'Active',
    })

  useEffect(() => {
    protectNexusPage([
      "Registrar",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    try {
      const centralFaculties = readCentralFacultyRecords()
      const centralDepartments = readCentralDepartmentRecords()
      const centralProgrammes = readCentralProgrammeRecords()

      if (
        centralFaculties.length > 0 ||
        centralDepartments.length > 0 ||
        centralProgrammes.length > 0
      ) {
        const centralStructure =
          centralRecordsToAcademicStructure(
            centralFaculties,
            centralDepartments,
            centralProgrammes
          )

        setFaculties(centralStructure)

        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(centralStructure)
        )
      } else {
        const raw = localStorage.getItem(STORAGE_KEY)

        if (raw) {
          const parsed: unknown = JSON.parse(raw)

          if (Array.isArray(parsed)) {
            const legacyStructure = parsed as Faculty[]

            migrateLegacyAcademicStructureToCentral(
              legacyStructure
            )

            setFaculties(legacyStructure)

            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(legacyStructure)
            )
          } else {
            migrateLegacyAcademicStructureToCentral(
              defaultFaculties
            )

            setFaculties(defaultFaculties)

            localStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(defaultFaculties)
            )
          }
        } else {
          migrateLegacyAcademicStructureToCentral(
            defaultFaculties
          )

          setFaculties(defaultFaculties)

          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(defaultFaculties)
          )
        }
      }

      const rawSettings = localStorage.getItem(SETTINGS_KEY)

      if (!rawSettings) {
        setAcademicSettings(defaultSettings)
        localStorage.setItem(
          SETTINGS_KEY,
          JSON.stringify(defaultSettings)
        )
      } else {
        const parsedSettings: unknown = JSON.parse(rawSettings)

        if (
          parsedSettings &&
          typeof parsedSettings === 'object'
        ) {
          setAcademicSettings({
            ...defaultSettings,
            ...(parsedSettings as Partial<AcademicSettings>),
          })
        }
      }

      const rawMetadata = localStorage.getItem(
        PROGRAMME_METADATA_KEY
      )

      if (!rawMetadata) {
        setProgrammeMetadata(defaultProgrammeMetadata)
        localStorage.setItem(
          PROGRAMME_METADATA_KEY,
          JSON.stringify(defaultProgrammeMetadata)
        )
      } else {
        const parsedMetadata: unknown = JSON.parse(rawMetadata)

        if (Array.isArray(parsedMetadata)) {
          setProgrammeMetadata(
            parsedMetadata as ProgrammeMetadata[]
          )
        }
      }
    } catch {
      setFaculties(defaultFaculties)
      setAcademicSettings(defaultSettings)
      setProgrammeMetadata(defaultProgrammeMetadata)
    }
  }, [])

  useEffect(() => {
    const handleAcademicStorageUpdate = () => {
      const centralFaculties =
        readCentralFacultyRecords()

      const centralDepartments =
        readCentralDepartmentRecords()

      const centralProgrammes =
        readCentralProgrammeRecords()

      if (
        centralFaculties.length === 0 &&
        centralDepartments.length === 0 &&
        centralProgrammes.length === 0
      ) {
        return
      }

      const centralStructure =
        centralRecordsToAcademicStructure(
          centralFaculties,
          centralDepartments,
          centralProgrammes
        )

      setFaculties(centralStructure)
    }

    window.addEventListener(
      'nexusSIS_academics_updated',
      handleAcademicStorageUpdate
    )

    return () => {
      window.removeEventListener(
        'nexusSIS_academics_updated',
        handleAcademicStorageUpdate
      )
    }
  }, [])

  const selectedFaculty = useMemo(
    () =>
      faculties.find((faculty) => faculty.id === selectedFacultyId) ||
      faculties[0] ||
      null,
    [faculties, selectedFacultyId]
  )

  useEffect(() => {
    if (!selectedFacultyId && faculties.length > 0) {
      setSelectedFacultyId(faculties[0].id)
    }
  }, [faculties, selectedFacultyId])

  const filteredFaculties = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return faculties
    }

    return faculties.filter((faculty) => {
      const facultyMatch =
        faculty.name.toLowerCase().includes(query) ||
        faculty.code.toLowerCase().includes(query) ||
        faculty.dean.toLowerCase().includes(query)

      const departmentMatch = faculty.departments.some(
        (department) =>
          department.name.toLowerCase().includes(query) ||
          department.code.toLowerCase().includes(query) ||
          department.head.toLowerCase().includes(query) ||
          department.programmes.some((programme) =>
            programme.toLowerCase().includes(query)
          )
      )

      return facultyMatch || departmentMatch
    })
  }, [faculties, search])

  const totals = useMemo(() => {
    const departments = faculties.reduce(
      (total, faculty) => total + faculty.departments.length,
      0
    )

    const programmes = faculties.reduce(
      (total, faculty) =>
        total +
        faculty.departments.reduce(
          (departmentTotal, department) =>
            departmentTotal + department.programmes.length,
          0
        ),
      0
    )

    return {
      faculties: faculties.length,
      departments,
      programmes,
    }
  }, [faculties])

  function saveStructure(next: Faculty[]) {
    const existingFaculties =
      readCentralFacultyRecords()

    const existingDepartments =
      readCentralDepartmentRecords()

    const existingProgrammes =
      readCentralProgrammeRecords()

    const central =
      academicStructureToCentralRecords(
        next,
        existingFaculties,
        existingDepartments,
        existingProgrammes
      )

    saveCentralAcademicRecords(
      central.faculties,
      central.departments,
      central.programmes
    )

    setFaculties(next)

    // Keep the old structure as a compatibility mirror only.
    // Central records are now the authoritative source.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(next)
    )
  }

  function openNewFaculty() {
    setEditingFaculty(null)
    setFacultyForm({
      name: '',
      code: '',
      dean: '',
    })
    setShowFacultyModal(true)
  }

  function openEditFaculty(faculty: Faculty) {
    setEditingFaculty(faculty)
    setFacultyForm({
      name: faculty.name,
      code: faculty.code,
      dean: faculty.dean,
    })
    setShowFacultyModal(true)
  }

  function saveFaculty() {
    const name = facultyForm.name.trim()
    const code = facultyForm.code.trim().toUpperCase()
    const dean = facultyForm.dean.trim()

    if (!name || !code || !dean) {
      setMessage('Faculty name, code and dean are required.')
      return
    }

    if (editingFaculty) {
      const next = faculties.map((faculty) =>
        faculty.id === editingFaculty.id
          ? {
              ...faculty,
              name,
              code,
              dean,
            }
          : faculty
      )

      saveStructure(next)
      setSelectedFacultyId(editingFaculty.id)
      setMessage(`${name} has been updated.`)
    } else {
      const newFaculty: Faculty = {
        id: createId('fac'),
        name,
        code,
        dean,
        departments: [],
      }

      const next = [...faculties, newFaculty]

      saveStructure(next)
      setSelectedFacultyId(newFaculty.id)
      setMessage(`${name} has been added.`)
    }

    setShowFacultyModal(false)
  }

  function deleteFaculty(faculty: Faculty) {
    const confirmed = window.confirm(
      `Delete ${faculty.name}? This will also remove its departments and programme definitions from the current academic structure.`
    )

    if (!confirmed) return

    const next = faculties.filter((item) => item.id !== faculty.id)

    saveStructure(next)
    setSelectedFacultyId(next[0]?.id || '')
    setMessage(`${faculty.name} has been removed.`)
  }

  function openNewDepartment() {
    if (!selectedFaculty) {
      setMessage('Select a faculty first.')
      return
    }

    setEditingDepartment(null)
    setDepartmentForm({
      name: '',
      code: '',
      head: '',
    })
    setShowDepartmentModal(true)
  }

  function openEditDepartment(department: Department) {
    setEditingDepartment(department)
    setDepartmentForm({
      name: department.name,
      code: department.code,
      head: department.head,
    })
    setShowDepartmentModal(true)
  }

  function saveDepartment() {
    if (!selectedFaculty) return

    const name = departmentForm.name.trim()
    const code = departmentForm.code.trim().toUpperCase()
    const head = departmentForm.head.trim()

    if (!name || !code || !head) {
      setMessage('Department name, code and head are required.')
      return
    }

    let next: Faculty[]

    if (editingDepartment) {
      next = faculties.map((faculty) => {
        if (faculty.id !== selectedFaculty.id) {
          return faculty
        }

        return {
          ...faculty,
          departments: faculty.departments.map((department) =>
            department.id === editingDepartment.id
              ? {
                  ...department,
                  name,
                  code,
                  head,
                }
              : department
          ),
        }
      })

      setMessage(`${name} has been updated.`)
    } else {
      const newDepartment: Department = {
        id: createId('dep'),
        name,
        code,
        head,
        programmes: [],
      }

      next = faculties.map((faculty) =>
        faculty.id === selectedFaculty.id
          ? {
              ...faculty,
              departments: [...faculty.departments, newDepartment],
            }
          : faculty
      )

      setMessage(`${name} has been added.`)
    }

    saveStructure(next)
    setShowDepartmentModal(false)
  }

  function deleteDepartment(department: Department) {
    if (!selectedFaculty) return

    const confirmed = window.confirm(
      `Delete ${department.name}? Its programme definitions will also be removed from this academic structure.`
    )

    if (!confirmed) return

    const next = faculties.map((faculty) =>
      faculty.id === selectedFaculty.id
        ? {
            ...faculty,
            departments: faculty.departments.filter(
              (item) => item.id !== department.id
            ),
          }
        : faculty
    )

    saveStructure(next)
    setMessage(`${department.name} has been removed.`)
  }

  function openNewProgramme(department: Department) {
    setEditingDepartment(department)
    setEditingProgramme('')
    setProgrammeForm('')
    setShowProgrammeModal(true)
  }

  function openEditProgramme(
    department: Department,
    programme: string
  ) {
    setEditingDepartment(department)
    setEditingProgramme(programme)
    setProgrammeForm(programme)
    setShowProgrammeModal(true)
  }

  function saveProgramme() {
    if (!selectedFaculty || !editingDepartment) return

    const programme = programmeForm.trim()

    if (!programme) {
      setMessage('Programme name is required.')
      return
    }

    const departmentId = editingDepartment.id

    const next = faculties.map((faculty) => {
      if (faculty.id !== selectedFaculty.id) {
        return faculty
      }

      return {
        ...faculty,
        departments: faculty.departments.map((department) => {
          if (department.id !== departmentId) {
            return department
          }

          const programmes = editingProgramme
            ? department.programmes.map((item) =>
                item === editingProgramme ? programme : item
              )
            : [...department.programmes, programme]

          return {
            ...department,
            programmes: Array.from(new Set(programmes)),
          }
        }),
      }
    })

    if (editingProgramme && editingProgramme !== programme) {
      const updatedMetadata = programmeMetadata.map((item) =>
        item.facultyId === selectedFaculty.id &&
        item.departmentId === departmentId &&
        item.programmeName === editingProgramme
          ? {
              ...item,
              programmeName: programme,
            }
          : item
      )

      setProgrammeMetadata(updatedMetadata)
      localStorage.setItem(
        PROGRAMME_METADATA_KEY,
        JSON.stringify(updatedMetadata)
      )
    }

    saveStructure(next)
    setShowProgrammeModal(false)

    setMessage(
      editingProgramme
        ? `${programme} has been updated.`
        : `${programme} has been added.`
    )
  }

  function deleteProgramme(
    department: Department,
    programme: string
  ) {
    if (!selectedFaculty) return

    const confirmed = window.confirm(
      `Remove ${programme} from ${department.name}?`
    )

    if (!confirmed) return

    const next = faculties.map((faculty) =>
      faculty.id === selectedFaculty.id
        ? {
            ...faculty,
            departments: faculty.departments.map((item) =>
              item.id === department.id
                ? {
                    ...item,
                    programmes: item.programmes.filter(
                      (programmeItem) => programmeItem !== programme
                    ),
                  }
                : item
            ),
          }
        : faculty
    )

    const nextMetadata = programmeMetadata.filter(
      (item) =>
        !(
          item.facultyId === selectedFaculty.id &&
          item.departmentId === department.id &&
          item.programmeName === programme
        )
    )

    setProgrammeMetadata(nextMetadata)
    localStorage.setItem(
      PROGRAMME_METADATA_KEY,
      JSON.stringify(nextMetadata)
    )

    saveStructure(next)
    setMessage(`${programme} has been removed.`)
  }

  function resetToDefaults() {
    const confirmed = window.confirm(
      'Reset the academic structure to the Nexus SIS starting catalogue? Custom faculties, departments and programmes will be removed.'
    )

    if (!confirmed) return

    const central =
      academicStructureToCentralRecords(
        defaultFaculties,
        [],
        [],
        []
      )

    saveCentralAcademicRecords(
      central.faculties,
      central.departments,
      central.programmes
    )

    setFaculties(defaultFaculties)

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(defaultFaculties)
    )

    setSelectedFacultyId(defaultFaculties[0].id)
    setMessage(
      'Academic structure has been reset to the starting catalogue.'
    )
  }

  function saveAcademicSettings(next: AcademicSettings) {
    setAcademicSettings(next)
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify(next)
    )
    setMessage('Academic settings have been saved.')
  }

  function getProgrammeMetadata(
    facultyId: string,
    departmentId: string,
    programmeName: string
  ) {
    return programmeMetadata.find(
      (item) =>
        item.facultyId === facultyId &&
        item.departmentId === departmentId &&
        item.programmeName === programmeName
    )
  }

  function openProgrammeDetails(
    department: Department,
    programme: string
  ) {
    const existing = getProgrammeMetadata(
      selectedFaculty?.id || '',
      department.id,
      programme
    )

    setEditingProgrammeDetails(
      existing || {
        facultyId: selectedFaculty?.id || '',
        departmentId: department.id,
        programmeName: programme,
        code: '',
        award: 'Bachelor Degree',
        duration: '4 Years',
        mode: 'Full Time',
        status: 'Active',
      }
    )

    setProgrammeDetailsForm({
      code: existing?.code || '',
      award: existing?.award || 'Bachelor Degree',
      duration: existing?.duration || '4 Years',
      mode: existing?.mode || 'Full Time',
      status: existing?.status || 'Active',
    })

    setShowProgrammeDetailsModal(true)
  }

  function saveProgrammeDetails() {
    if (!selectedFaculty || !editingProgrammeDetails) return

    const code = programmeDetailsForm.code
      .trim()
      .toUpperCase()

    if (!code) {
      setMessage('Programme code is required.')
      return
    }

    const record: ProgrammeMetadata = {
      facultyId: selectedFaculty.id,
      departmentId: editingProgrammeDetails.departmentId,
      programmeName: editingProgrammeDetails.programmeName,
      ...programmeDetailsForm,
      code,
    }

    const exists = programmeMetadata.some(
      (item) =>
        item.facultyId === record.facultyId &&
        item.departmentId === record.departmentId &&
        item.programmeName === record.programmeName
    )

    const next = exists
      ? programmeMetadata.map((item) =>
          item.facultyId === record.facultyId &&
          item.departmentId === record.departmentId &&
          item.programmeName === record.programmeName
            ? record
            : item
        )
      : [...programmeMetadata, record]

    setProgrammeMetadata(next)
    localStorage.setItem(
      PROGRAMME_METADATA_KEY,
      JSON.stringify(next)
    )

    setShowProgrammeDetailsModal(false)
    setMessage(
      `${record.programmeName} details have been saved.`
    )
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
              Academic Structure Management
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="#academic-settings"
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm hover:bg-white/10"
            >
              Academic Settings
            </Link>

            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm hover:bg-white/10"
            >
              Dashboard
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
              Faculties, Departments & Programmes
            </h1>

            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Manage the university&apos;s academic structure. These
              definitions will become the central catalogue used by
              Registration, Registrar, Lecturers, Courses, LMS and
              Examinations.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={openNewFaculty}
              className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              + Add Faculty
            </button>

            <button
              onClick={resetToDefaults}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Reset Catalogue
            </button>
          </div>
        </div>

        {message && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        <div className="mb-7 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Faculties
            </div>
            <div className="mt-2 text-3xl font-bold">
              {totals.faculties}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Departments
            </div>
            <div className="mt-2 text-3xl font-bold">
              {totals.departments}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">
              Programmes
            </div>
            <div className="mt-2 text-3xl font-bold">
              {totals.programmes}
            </div>
          </div>
        </div>

        <section
          id="academic-settings"
          className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
              Registrar Controls
            </p>

            <h2 className="mt-1 text-xl font-bold">
              Academic Settings
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Control the current academic period, registration and results access.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-semibold text-slate-700">
              Academic Year
              <input
                value={academicSettings.academicYear}
                onChange={(e) =>
                  setAcademicSettings({
                    ...academicSettings,
                    academicYear: e.target.value,
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                placeholder="2026"
              />
            </label>

            <label className="text-sm font-semibold text-slate-700">
              Semester
              <select
                value={academicSettings.semester}
                onChange={(e) =>
                  setAcademicSettings({
                    ...academicSettings,
                    semester:
                      e.target.value as AcademicSettings['semester'],
                  })
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
              >
                <option value="Semester 1">Semester 1</option>
                <option value="Semester 2">Semester 2</option>
              </select>
            </label>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-700">
                Student Registration
              </div>

              <button
                type="button"
                onClick={() =>
                  setAcademicSettings({
                    ...academicSettings,
                    registrationOpen:
                      !academicSettings.registrationOpen,
                  })
                }
                className={`mt-3 rounded-full px-4 py-2 text-xs font-bold ${
                  academicSettings.registrationOpen
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {academicSettings.registrationOpen
                  ? 'OPEN'
                  : 'CLOSED'}
              </button>
            </div>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-700">
                Results Entry
              </div>

              <button
                type="button"
                onClick={() =>
                  setAcademicSettings({
                    ...academicSettings,
                    resultsOpen:
                      !academicSettings.resultsOpen,
                  })
                }
                className={`mt-3 rounded-full px-4 py-2 text-xs font-bold ${
                  academicSettings.resultsOpen
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {academicSettings.resultsOpen
                  ? 'OPEN'
                  : 'CLOSED'}
              </button>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={() =>
                saveAcademicSettings(academicSettings)
              }
              className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Save Academic Settings
            </button>
          </div>
        </section>

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Search Academic Structure
          </label>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search faculty, department, programme or code..."
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="font-bold">Faculties</h2>
              <p className="mt-1 text-xs text-slate-500">
                Select a faculty to manage its departments.
              </p>
            </div>

            <div className="max-h-[650px] overflow-y-auto p-3">
              {filteredFaculties.length === 0 ? (
                <div className="p-5 text-center text-sm text-slate-500">
                  No faculties found.
                </div>
              ) : (
                filteredFaculties.map((faculty) => (
                  <button
                    key={faculty.id}
                    onClick={() => setSelectedFacultyId(faculty.id)}
                    className={`mb-2 w-full rounded-xl border p-4 text-left transition ${
                      selectedFaculty?.id === faculty.id
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">
                          {faculty.name}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          {faculty.code} • {faculty.departments.length}{' '}
                          departments
                        </div>
                      </div>

                      <span className="rounded bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                        {faculty.code}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            {!selectedFaculty ? (
              <div className="flex min-h-[400px] items-center justify-center p-8 text-center">
                <div>
                  <h2 className="text-xl font-bold">
                    No Faculty Selected
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    Add a faculty or select one from the list.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                        {selectedFaculty.code}
                      </div>

                      <h2 className="mt-1 text-2xl font-bold">
                        {selectedFaculty.name}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        {selectedFaculty.dean}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditFaculty(selectedFaculty)}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                      >
                        Edit Faculty
                      </button>

                      <button
                        onClick={() => deleteFaculty(selectedFaculty)}
                        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="text-lg font-bold">
                        Departments
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        Manage departments and their programmes.
                      </p>
                    </div>

                    <button
                      onClick={openNewDepartment}
                      className="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                    >
                      + Add Department
                    </button>
                  </div>

                  <div className="space-y-4">
                    {selectedFaculty.departments.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center">
                        <div className="font-semibold text-slate-700">
                          No departments yet
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          Add the first department for this faculty.
                        </p>
                      </div>
                    ) : (
                      selectedFaculty.departments.map((department) => (
                        <div
                          key={department.id}
                          className="rounded-xl border border-slate-200"
                        >
                          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4 md:flex-row md:items-start">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="font-bold">
                                  {department.name}
                                </h4>

                                <span className="rounded bg-white px-2 py-1 text-xs font-bold text-slate-600">
                                  {department.code}
                                </span>
                              </div>

                              <p className="mt-1 text-xs text-slate-500">
                                {department.head}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  openEditDepartment(department)
                                }
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                              >
                                Edit
                              </button>

                              <button
                                onClick={() =>
                                  deleteDepartment(department)
                                }
                                className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Delete
                              </button>
                            </div>
                          </div>

                          <div className="p-5">
                            <div className="mb-3 flex items-center justify-between">
                              <div>
                                <div className="text-sm font-semibold">
                                  Programmes
                                </div>

                                <div className="text-xs text-slate-500">
                                  {department.programmes.length} programme
                                  {department.programmes.length === 1
                                    ? ''
                                    : 's'}
                                </div>
                              </div>

                              <button
                                onClick={() =>
                                  openNewProgramme(department)
                                }
                                className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                              >
                                + Add Programme
                              </button>
                            </div>

                            {department.programmes.length === 0 ? (
                              <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
                                No programmes defined.
                              </div>
                            ) : (
                              <div className="grid gap-2 sm:grid-cols-2">
                                {department.programmes.map(
                                  (programme) => (
                                    <div
                                      key={programme}
                                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3"
                                    >
                                      <div className="min-w-0">
                                        <span className="block text-sm font-medium">
                                          {programme}
                                        </span>

                                        {(() => {
                                          const metadata =
                                            getProgrammeMetadata(
                                              selectedFaculty.id,
                                              department.id,
                                              programme
                                            )

                                          if (!metadata) {
                                            return (
                                              <span className="mt-1 block text-xs text-slate-400">
                                                Details not configured
                                              </span>
                                            )
                                          }

                                          return (
                                            <span className="mt-1 block text-xs text-slate-500">
                                              {metadata.code} • {metadata.award} •{' '}
                                              {metadata.duration} • {metadata.mode}
                                            </span>
                                          )
                                        })()}
                                      </div>

                                      <div className="flex shrink-0 gap-1">
                                        <button
                                          onClick={() =>
                                            openProgrammeDetails(
                                              department,
                                              programme
                                            )
                                          }
                                          className="rounded px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                                        >
                                          Details
                                        </button>

                                        <button
                                          onClick={() =>
                                            openEditProgramme(
                                              department,
                                              programme
                                            )
                                          }
                                          className="rounded px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                                        >
                                          Edit
                                        </button>

                                        <button
                                          onClick={() =>
                                            deleteProgramme(
                                              department,
                                              programme
                                            )
                                          }
                                          className="rounded px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        </div>
      </section>

      {showFacultyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingFaculty ? 'Edit Faculty' : 'Add Faculty'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Define the university faculty.
                </p>
              </div>

              <button
                onClick={() => setShowFacultyModal(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block text-sm font-semibold text-slate-700">
                Faculty Name
                <input
                  value={facultyForm.name}
                  onChange={(e) =>
                    setFacultyForm({
                      ...facultyForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Faculty of Science"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Faculty Code
                <input
                  value={facultyForm.code}
                  onChange={(e) =>
                    setFacultyForm({
                      ...facultyForm,
                      code: e.target.value,
                    })
                  }
                  placeholder="e.g. FSC"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal uppercase"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Dean
                <input
                  value={facultyForm.dean}
                  onChange={(e) =>
                    setFacultyForm({
                      ...facultyForm,
                      dean: e.target.value,
                    })
                  }
                  placeholder="Dean - Faculty of Science"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                onClick={() => setShowFacultyModal(false)}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveFaculty}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Save Faculty
              </button>
            </div>
          </div>
        </div>
      )}

      {showDepartmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingDepartment
                    ? 'Edit Department'
                    : 'Add Department'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Faculty: {selectedFaculty?.name}
                </p>
              </div>

              <button
                onClick={() => setShowDepartmentModal(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-6">
              <label className="block text-sm font-semibold text-slate-700">
                Department Name
                <input
                  value={departmentForm.name}
                  onChange={(e) =>
                    setDepartmentForm({
                      ...departmentForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Department of Computer Science"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Department Code
                <input
                  value={departmentForm.code}
                  onChange={(e) =>
                    setDepartmentForm({
                      ...departmentForm,
                      code: e.target.value,
                    })
                  }
                  placeholder="e.g. CSC"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal uppercase"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Department Head
                <input
                  value={departmentForm.head}
                  onChange={(e) =>
                    setDepartmentForm({
                      ...departmentForm,
                      head: e.target.value,
                    })
                  }
                  placeholder="Head of Computer Science"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                onClick={() => setShowDepartmentModal(false)}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveDepartment}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Save Department
              </button>
            </div>
          </div>
        </div>
      )}

      {showProgrammeDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  Programme Details
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingProgrammeDetails?.programmeName}
                </p>
              </div>

              <button
                onClick={() =>
                  setShowProgrammeDetailsModal(false)
                }
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Programme Code
                <input
                  value={programmeDetailsForm.code}
                  onChange={(e) =>
                    setProgrammeDetailsForm({
                      ...programmeDetailsForm,
                      code: e.target.value,
                    })
                  }
                  placeholder="e.g. BCS"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal uppercase"
                />
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Award
                <select
                  value={programmeDetailsForm.award}
                  onChange={(e) =>
                    setProgrammeDetailsForm({
                      ...programmeDetailsForm,
                      award: e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
                >
                  <option>Bachelor Degree</option>
                  <option>Diploma</option>
                  <option>Certificate</option>
                  <option>Postgraduate Diploma</option>
                  <option>Master Degree</option>
                  <option>Doctorate</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Duration
                <select
                  value={programmeDetailsForm.duration}
                  onChange={(e) =>
                    setProgrammeDetailsForm({
                      ...programmeDetailsForm,
                      duration: e.target.value,
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
                >
                  <option>1 Year</option>
                  <option>2 Years</option>
                  <option>3 Years</option>
                  <option>4 Years</option>
                  <option>5 Years</option>
                  <option>6 Years</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Study Mode
                <select
                  value={programmeDetailsForm.mode}
                  onChange={(e) =>
                    setProgrammeDetailsForm({
                      ...programmeDetailsForm,
                      mode:
                        e.target.value as ProgrammeMetadata['mode'],
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
                >
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Online">Online</option>
                  <option value="Blended">Blended</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700 md:col-span-2">
                Programme Status
                <select
                  value={programmeDetailsForm.status}
                  onChange={(e) =>
                    setProgrammeDetailsForm({
                      ...programmeDetailsForm,
                      status:
                        e.target.value as ProgrammeMetadata['status'],
                    })
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 font-normal"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                onClick={() =>
                  setShowProgrammeDetailsModal(false)
                }
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveProgrammeDetails}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Save Programme Details
              </button>
            </div>
          </div>
        </div>
      )}

      {showProgrammeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editingProgramme
                    ? 'Edit Programme'
                    : 'Add Programme'}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {editingDepartment?.name}
                </p>
              </div>

              <button
                onClick={() => setShowProgrammeModal(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-semibold text-slate-700">
                Programme Name
                <input
                  value={programmeForm}
                  onChange={(e) => setProgrammeForm(e.target.value)}
                  placeholder="e.g. Bachelor of Computer Science"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal"
                  autoFocus
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-5">
              <button
                onClick={() => setShowProgrammeModal(false)}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveProgramme}
                className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Save Programme
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
