import { protectNexusPage } from "@/lib/nexus-access";
"use client"

import { useEffect, useMemo, useState } from "react"
import {
  clearNexusSession,

} from "@/lib/nexus-access"

import {
  NEXUS_KEYS,
  type CentralStudent,
} from "@/lib/nexus-data"

type Student = {
  id?: string
  studentId?: string
  name: string
  gender?: "Male" | "Female" | ""
  faculty?: string
  department?: string
  programme?: string
  yearLevel?: string
  status?: string
}

type AccommodationProfile = {
  studentId: string
  residenceType: "Boarding" | "Non-Boarding"
  accommodationStatus: "On Campus" | "Off Campus" | "Not Applicable"
  offCampusReason:
    | "No Accommodation Available"
    | "Accommodation Full"
    | "Approved Private Accommodation"
    | "Other"
    | ""
  updatedAt: string
}

type Dormitory = {
  id: string
  code: string
  name: string
  gender: "Male" | "Female" | "Mixed"
  location: string
  warden: string
  phone: string
  capacity: number
  status: "Active" | "Inactive"
  description: string
}

type Room = {
  id: string
  dormitoryId: string
  roomNumber: string
  floor: string
  capacity: number
  status: "Available" | "Full" | "Maintenance"
  monthlyFee: number
}

type AllocationStatus =
  | "Allocated"
  | "Checked In"
  | "Checked Out"
  | "Cancelled"

type Allocation = {
  id: string
  studentId: string
  studentName: string
  dormitoryId: string
  roomId: string
  bedNumber: string
  academicYear: string
  semester: string
  allocationDate: string
  checkInDate: string
  checkOutDate: string
  status: AllocationStatus
  feeAmount: number
  feePaid: number
  clearance: "Pending" | "Cleared" | "Not Required"
  notes: string
}

type Warden = {
  id: string
  name: string
  phone: string
  email: string
  dormitoryId: string
  status: "Active" | "Inactive"
}

type Tab =
  | "Dashboard"
  | "Dormitories"
  | "Rooms"
  | "Allocations"
  | "Students"
  | "Wardens"
  | "Clearance"
  | "Reports"

const STORAGE = {
  students: NEXUS_KEYS.students,
  accommodationProfiles: "nexusSIS_accommodation_profiles",
  dormitories: "nexusSIS_dormitories",
  rooms: "nexusSIS_dormitory_rooms",
  allocations: "nexusSIS_dormitory_allocations",
  wardens: "nexusSIS_dormitory_wardens",
}

const defaultDormitories: Dormitory[] = [
  {
    id: "DORM-M-001",
    code: "MTH",
    name: "Men's Dormitory",
    gender: "Male",
    location: "Main Campus",
    warden: "Mr. Peter Wama",
    phone: "7000 1001",
    capacity: 120,
    status: "Active",
    description: "Main residential facility for male students.",
  },
  {
    id: "DORM-F-001",
    code: "WTH",
    name: "Women's Dormitory",
    gender: "Female",
    location: "Main Campus",
    warden: "Mrs. Mary Kila",
    phone: "7000 1002",
    capacity: 120,
    status: "Active",
    description: "Main residential facility for female students.",
  },
]

const defaultRooms: Room[] = [
  {
    id: "ROOM-M-101",
    dormitoryId: "DORM-M-001",
    roomNumber: "M-101",
    floor: "Ground",
    capacity: 4,
    status: "Available",
    monthlyFee: 350,
  },
  {
    id: "ROOM-M-102",
    dormitoryId: "DORM-M-001",
    roomNumber: "M-102",
    floor: "Ground",
    capacity: 4,
    status: "Available",
    monthlyFee: 350,
  },
  {
    id: "ROOM-F-101",
    dormitoryId: "DORM-F-001",
    roomNumber: "F-101",
    floor: "Ground",
    capacity: 4,
    status: "Available",
    monthlyFee: 350,
  },
  {
    id: "ROOM-F-102",
    dormitoryId: "DORM-F-001",
    roomNumber: "F-102",
    floor: "Ground",
    capacity: 4,
    status: "Available",
    monthlyFee: 350,
  },
]

const defaultWardens: Warden[] = [
  {
    id: "WARD-001",
    name: "Mr. Peter Wama",
    phone: "7000 1001",
    email: "peter.wama@university.edu.pg",
    dormitoryId: "DORM-M-001",
    status: "Active",
  },
  {
    id: "WARD-002",
    name: "Mrs. Mary Kila",
    phone: "7000 1002",
    email: "mary.kila@university.edu.pg",
    dormitoryId: "DORM-F-001",
    status: "Active",
  },
]

function readStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback
    const value = localStorage.getItem(key)
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore localStorage write errors.
  }
}

function centralStudentToAccommodationStudent(
  student: CentralStudent,
): Student {
  return {
    id: student.id,
    studentId: student.studentId,
    name: student.fullName,
    gender:
      student.gender === "Male" || student.gender === "Female"
        ? student.gender
        : "",
    faculty: student.facultyName,
    department: student.departmentName,
    programme: student.programmeName,
    yearLevel: String(student.yearLevel),
    status: student.status,
  }
}

function readAccommodationStudents(): Student[] {
  const central = readStorage<CentralStudent[]>(
    NEXUS_KEYS.students,
    [],
  )

  if (central.length > 0) {
    return central.map(
      centralStudentToAccommodationStudent,
    )
  }

  return readStorage<Student[]>(
    "nexusSIS_registered_students",
    [],
  )
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`
}

function money(value: number) {
  return `PGK ${Number(value || 0).toLocaleString("en-PG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return

  const headers = Object.keys(rows[0])

  const escapeCsv = (value: unknown) => {
    const text = String(value ?? "")
    return `"${text.replace(/"/g, '""')}"`
  }

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsv(row[header])).join(","),
    ),
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

function StatusBadge({
  status,
}: {
  status: string
}) {
  const classes =
    status === "Active" ||
    status === "Allocated" ||
    status === "Checked In" ||
    status === "Cleared" ||
    status === "Available"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Full" ||
          status === "Pending" ||
          status === "Maintenance"
        ? "bg-amber-100 text-amber-700"
        : status === "Checked Out" ||
            status === "Inactive" ||
            status === "Cancelled"
          ? "bg-slate-100 text-slate-600"
          : "bg-blue-100 text-blue-700"

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {status}
    </span>
  )
}

export default function AccommodationPage() {
  const [tab, setTab] = useState<Tab>("Dashboard")

  const [students, setStudents] = useState<Student[]>([])
  const [accommodationProfiles, setAccommodationProfiles] =
    useState<AccommodationProfile[]>([])
  const [dormitories, setDormitories] =
    useState<Dormitory[]>(defaultDormitories)
  const [rooms, setRooms] = useState<Room[]>(defaultRooms)
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [wardens, setWardens] = useState<Warden[]>(defaultWardens)

  const [search, setSearch] = useState("")
  const [genderFilter, setGenderFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")

  const [showDormModal, setShowDormModal] = useState(false)
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [showAllocationModal, setShowAllocationModal] = useState(false)
  const [showWardenModal, setShowWardenModal] = useState(false)

  const [editingDorm, setEditingDorm] = useState<Dormitory | null>(null)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [editingWarden, setEditingWarden] = useState<Warden | null>(null)

  const [selectedAllocation, setSelectedAllocation] =
    useState<Allocation | null>(null)

  const [selectedStudentId, setSelectedStudentId] = useState("")

  const [dormForm, setDormForm] = useState<Dormitory>({
    id: "",
    code: "",
    name: "",
    gender: "Male",
    location: "",
    warden: "",
    phone: "",
    capacity: 0,
    status: "Active",
    description: "",
  })

  const [roomForm, setRoomForm] = useState<Room>({
    id: "",
    dormitoryId: "",
    roomNumber: "",
    floor: "",
    capacity: 4,
    status: "Available",
    monthlyFee: 350,
  })

  const [allocationForm, setAllocationForm] = useState({
    studentId: "",
    dormitoryId: "",
    roomId: "",
    bedNumber: "",
    academicYear: "2026",
    semester: "1",
    allocationDate: today(),
    checkInDate: today(),
    feeAmount: 350,
    notes: "",
  })

  const [wardenForm, setWardenForm] = useState<Warden>({
    id: "",
    name: "",
    phone: "",
    email: "",
    dormitoryId: "",
    status: "Active",
  })

  useEffect(() => {
    protectNexusPage([
      "Accommodation Officer",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    const storedStudents = readAccommodationStudents()

    const normalizedStudents = storedStudents.map((student, index) => ({
      ...student,
      id: student.id || student.studentId || `STUDENT-${index + 1}`,
      studentId: student.studentId || student.id || `STUDENT-${index + 1}`,
    }))

    setStudents(normalizedStudents)

    const storedProfiles = readStorage<AccommodationProfile[]>(
      STORAGE.accommodationProfiles,
      [],
    )

    const normalizedProfiles = normalizedStudents.map((student) => {
      const studentId = student.studentId || student.id || ""

      const existing = storedProfiles.find(
        (profile) => profile.studentId === studentId,
      )

      return (
        existing || {
          studentId,
          residenceType: "Non-Boarding" as const,
          accommodationStatus: "Not Applicable" as const,
          offCampusReason: "" as const,
          updatedAt: today(),
        }
      )
    })

    setAccommodationProfiles(normalizedProfiles)

    const handleStudentsUpdated = () => {
      const updatedStudents = readAccommodationStudents()

      const normalizedUpdatedStudents =
        updatedStudents.map((student, index) => ({
          ...student,
          id:
            student.id ||
            student.studentId ||
            `STUDENT-${index + 1}`,
          studentId:
            student.studentId ||
            student.id ||
            `STUDENT-${index + 1}`,
        }))

      setStudents(normalizedUpdatedStudents)

      const updatedProfiles = readStorage<AccommodationProfile[]>(
        STORAGE.accommodationProfiles,
        [],
      )

      const normalizedUpdatedProfiles =
        normalizedUpdatedStudents.map((student) => {
          const studentId =
            student.studentId ||
            student.id ||
            ""

          const existing = updatedProfiles.find(
            (profile) =>
              profile.studentId === studentId,
          )

          return (
            existing || {
              studentId,
              residenceType: "Non-Boarding" as const,
              accommodationStatus:
                "Not Applicable" as const,
              offCampusReason: "" as const,
              updatedAt: today(),
            }
          )
        })

      setAccommodationProfiles(normalizedUpdatedProfiles)
    }

    window.addEventListener(
      "nexusSIS_students_updated",
      handleStudentsUpdated,
    )

    window.addEventListener(
      "storage",
      handleStudentsUpdated,
    )

    const storedDormitories = readStorage<Dormitory[]>(
      STORAGE.dormitories,
      defaultDormitories,
    )

    const storedRooms = readStorage<Room[]>(
      STORAGE.rooms,
      defaultRooms,
    )

    const storedAllocations = readStorage<Allocation[]>(
      STORAGE.allocations,
      [],
    )

    const storedWardens = readStorage<Warden[]>(
      STORAGE.wardens,
      defaultWardens,
    )

    setDormitories(storedDormitories)
    setRooms(storedRooms)
    setAllocations(storedAllocations)
    setWardens(storedWardens)

    return () => {
      window.removeEventListener(
        "nexusSIS_students_updated",
        handleStudentsUpdated,
      )

      window.removeEventListener(
        "storage",
        handleStudentsUpdated,
      )
    }
  }, [])

  useEffect(() => {
    writeStorage(
      STORAGE.accommodationProfiles,
      accommodationProfiles,
    )
  }, [accommodationProfiles])

  useEffect(() => {
    writeStorage(STORAGE.dormitories, dormitories)
  }, [dormitories])

  useEffect(() => {
    writeStorage(STORAGE.rooms, rooms)
  }, [rooms])

  useEffect(() => {
    writeStorage(STORAGE.allocations, allocations)
  }, [allocations])

  useEffect(() => {
    writeStorage(STORAGE.wardens, wardens)
  }, [wardens])

  const activeAllocations = useMemo(
    () =>
      allocations.filter(
        (allocation) =>
          allocation.status === "Allocated" ||
          allocation.status === "Checked In",
      ),
    [allocations],
  )

  const totalCapacity = useMemo(
    () => dormitories.reduce((sum, dorm) => sum + dorm.capacity, 0),
    [dormitories],
  )

  const occupiedBeds = activeAllocations.length

  const availableBeds = Math.max(
    totalCapacity - occupiedBeds,
    0,
  )

  const boardingStudents = useMemo(
    () =>
      students.filter((student) => {
        const studentId =
          student.studentId || student.id || ""

        return accommodationProfiles.some(
          (profile) =>
            profile.studentId === studentId &&
            profile.residenceType === "Boarding",
        )
      }),
    [students, accommodationProfiles],
  )

  const onCampusBoardingStudents = useMemo(
    () =>
      boardingStudents.filter((student) => {
        const studentId =
          student.studentId || student.id || ""

        return activeAllocations.some(
          (allocation) =>
            allocation.studentId === studentId,
        )
      }),
    [boardingStudents, activeAllocations],
  )

  const offCampusBoardingStudents = useMemo(
    () =>
      boardingStudents.filter((student) => {
        const studentId =
          student.studentId || student.id || ""

        return !activeAllocations.some(
          (allocation) =>
            allocation.studentId === studentId,
        )
      }),
    [boardingStudents, activeAllocations],
  )

  const occupancyRate =
    totalCapacity > 0
      ? Math.round((occupiedBeds / totalCapacity) * 100)
      : 0

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return students.filter((student) => {
      const matchesSearch =
        !query ||
        student.name.toLowerCase().includes(query) ||
        String(student.studentId || student.id || "")
          .toLowerCase()
          .includes(query) ||
        String(student.programme || "")
          .toLowerCase()
          .includes(query)

      const matchesGender =
        genderFilter === "All" ||
        String(student.gender || "") === genderFilter

      return matchesSearch && matchesGender
    })
  }, [students, search, genderFilter])

  const filteredAllocations = useMemo(() => {
    const query = search.trim().toLowerCase()

    return allocations.filter((allocation) => {
      const student = students.find(
        (item) =>
          (item.studentId || item.id) === allocation.studentId,
      )

      const matchesSearch =
        !query ||
        allocation.studentName.toLowerCase().includes(query) ||
        allocation.studentId.toLowerCase().includes(query) ||
        allocation.bedNumber.toLowerCase().includes(query) ||
        allocation.roomId.toLowerCase().includes(query) ||
        (student?.programme || "").toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === "All" ||
        allocation.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [allocations, students, search, statusFilter])

  const availableRooms = useMemo(() => {
    return rooms.map((room) => {
      const occupied = activeAllocations.filter(
        (allocation) => allocation.roomId === room.id,
      ).length

      const available = Math.max(room.capacity - occupied, 0)

      return {
        room,
        occupied,
        available,
      }
    })
  }, [rooms, activeAllocations])

  const selectedDormitoryRooms = rooms.filter(
    (room) => room.dormitoryId === allocationForm.dormitoryId,
  )

  const selectedStudent = students.find(
    (student) =>
      (student.studentId || student.id) ===
      allocationForm.studentId,
  )

  function getAccommodationProfile(studentId: string) {
    return accommodationProfiles.find(
      (profile) =>
        profile.studentId === studentId,
    )
  }

  function updateAccommodationProfile(
    studentId: string,
    residenceType: "Boarding" | "Non-Boarding",
    forceOnCampus = false,
  ) {
    const hasActiveAllocation =
      forceOnCampus ||
      activeAllocations.some(
        (allocation) =>
          allocation.studentId === studentId,
      )

    const nextStatus =
      residenceType === "Non-Boarding"
        ? "Not Applicable"
        : hasActiveAllocation
          ? "On Campus"
          : "Off Campus"

    const nextReason =
      residenceType === "Boarding" &&
      !hasActiveAllocation
        ? "No Accommodation Available"
        : ""

    setAccommodationProfiles((current) => {
      const nextProfile: AccommodationProfile = {
        studentId,
        residenceType,
        accommodationStatus: nextStatus,
        offCampusReason: nextReason,
        updatedAt: today(),
      }

      const exists = current.some(
        (profile) =>
          profile.studentId === studentId,
      )

      if (exists) {
        return current.map((profile) =>
          profile.studentId === studentId
            ? nextProfile
            : profile,
        )
      }

      return [...current, nextProfile]
    })
  }

  function openNewDormitory() {
    setEditingDorm(null)
    setDormForm({
      id: "",
      code: "",
      name: "",
      gender: "Male",
      location: "",
      warden: "",
      phone: "",
      capacity: 0,
      status: "Active",
      description: "",
    })
    setShowDormModal(true)
  }

  function openEditDormitory(dorm: Dormitory) {
    setEditingDorm(dorm)
    setDormForm(dorm)
    setShowDormModal(true)
  }

  function saveDormitory() {
    if (!dormForm.name.trim() || !dormForm.code.trim()) {
      alert("Dormitory code and name are required.")
      return
    }

    if (dormForm.capacity <= 0) {
      alert("Dormitory capacity must be greater than zero.")
      return
    }

    if (editingDorm) {
      setDormitories((current) =>
        current.map((item) =>
          item.id === editingDorm.id
            ? { ...dormForm, id: editingDorm.id }
            : item,
        ),
      )
    } else {
      setDormitories((current) => [
        ...current,
        {
          ...dormForm,
          id: makeId("DORM"),
        },
      ])
    }

    setShowDormModal(false)
  }

  function deleteDormitory(id: string) {
    const hasRooms = rooms.some((room) => room.dormitoryId === id)
    const hasAllocations = allocations.some(
      (allocation) => allocation.dormitoryId === id,
    )

    if (hasRooms || hasAllocations) {
      alert(
        "This dormitory cannot be deleted because it has rooms or student allocations.",
      )
      return
    }

    if (!confirm("Delete this dormitory?")) return

    setDormitories((current) =>
      current.filter((item) => item.id !== id),
    )
  }

  function openNewRoom() {
    setEditingRoom(null)
    setRoomForm({
      id: "",
      dormitoryId: dormitories[0]?.id || "",
      roomNumber: "",
      floor: "Ground",
      capacity: 4,
      status: "Available",
      monthlyFee: 350,
    })
    setShowRoomModal(true)
  }

  function openEditRoom(room: Room) {
    setEditingRoom(room)
    setRoomForm(room)
    setShowRoomModal(true)
  }

  function saveRoom() {
    if (
      !roomForm.dormitoryId ||
      !roomForm.roomNumber.trim()
    ) {
      alert("Dormitory and room number are required.")
      return
    }

    if (roomForm.capacity <= 0) {
      alert("Room capacity must be greater than zero.")
      return
    }

    if (editingRoom) {
      setRooms((current) =>
        current.map((item) =>
          item.id === editingRoom.id
            ? { ...roomForm, id: editingRoom.id }
            : item,
        ),
      )
    } else {
      setRooms((current) => [
        ...current,
        {
          ...roomForm,
          id: makeId("ROOM"),
        },
      ])
    }

    setShowRoomModal(false)
  }

  function deleteRoom(id: string) {
    const hasAllocation = allocations.some(
      (allocation) => allocation.roomId === id,
    )

    if (hasAllocation) {
      alert(
        "This room cannot be deleted because it has an allocation record.",
      )
      return
    }

    if (!confirm("Delete this room?")) return

    setRooms((current) =>
      current.filter((item) => item.id !== id),
    )
  }

  function openNewAllocation() {
    setSelectedAllocation(null)

    setAllocationForm({
      studentId: selectedStudentId,
      dormitoryId: dormitories[0]?.id || "",
      roomId: "",
      bedNumber: "",
      academicYear: "2026",
      semester: "1",
      allocationDate: today(),
      checkInDate: today(),
      feeAmount: 350,
      notes: "",
    })

    setShowAllocationModal(true)
  }

  function saveAllocation() {
    if (!allocationForm.studentId) {
      alert("Select a student.")
      return
    }

    if (!allocationForm.dormitoryId) {
      alert("Select a dormitory.")
      return
    }

    if (!allocationForm.roomId) {
      alert("Select a room.")
      return
    }

    if (!allocationForm.bedNumber.trim()) {
      alert("Enter a bed number.")
      return
    }

    const student = students.find(
      (item) =>
        (item.studentId || item.id) ===
        allocationForm.studentId,
    )

    if (!student) {
      alert("Student could not be found.")
      return
    }

    const dormitory = dormitories.find(
      (item) =>
        item.id === allocationForm.dormitoryId,
    )

    if (!dormitory) {
      alert("Dormitory could not be found.")
      return
    }

    const studentGender = student.gender || ""

    if (
      studentGender &&
      dormitory.gender !== "Mixed" &&
      dormitory.gender !== studentGender
    ) {
      alert(
        `This dormitory is designated for ${dormitory.gender.toLowerCase()} students. The selected student is ${studentGender.toLowerCase()}.`,
      )
      return
    }

    const room = rooms.find(
      (item) => item.id === allocationForm.roomId,
    )

    if (!room) {
      alert("Room could not be found.")
      return
    }

    const occupiedInRoom = activeAllocations.filter(
      (allocation) => allocation.roomId === room.id,
    )

    if (
      occupiedInRoom.length >= room.capacity &&
      !selectedAllocation
    ) {
      alert("This room is already full.")
      return
    }

    const duplicateBed = activeAllocations.some(
      (allocation) =>
        allocation.roomId === allocationForm.roomId &&
        allocation.bedNumber.toLowerCase() ===
          allocationForm.bedNumber.trim().toLowerCase() &&
        allocation.id !== selectedAllocation?.id,
    )

    if (duplicateBed) {
      alert("That bed is already allocated.")
      return
    }

    const duplicateStudent = activeAllocations.some(
      (allocation) =>
        allocation.studentId === allocationForm.studentId &&
        allocation.id !== selectedAllocation?.id,
    )

    if (duplicateStudent) {
      alert(
        "This student already has an active dormitory allocation.",
      )
      return
    }

    const nextAllocation: Allocation = {
      id: selectedAllocation?.id || makeId("ALLOC"),
      studentId: allocationForm.studentId,
      studentName: student.name,
      dormitoryId: allocationForm.dormitoryId,
      roomId: allocationForm.roomId,
      bedNumber: allocationForm.bedNumber.trim(),
      academicYear: allocationForm.academicYear,
      semester: allocationForm.semester,
      allocationDate: allocationForm.allocationDate,
      checkInDate: allocationForm.checkInDate,
      checkOutDate: "",
      status: "Checked In",
      feeAmount: Number(allocationForm.feeAmount) || 0,
      feePaid: 0,
      clearance: "Pending",
      notes: allocationForm.notes.trim(),
    }

    if (selectedAllocation) {
      setAllocations((current) =>
        current.map((item) =>
          item.id === selectedAllocation.id
            ? nextAllocation
            : item,
        ),
      )
    } else {
      setAllocations((current) => [
        ...current,
        nextAllocation,
      ])
    }

    updateAccommodationProfile(
      allocationForm.studentId,
      "Boarding",
      true,
    )

    setShowAllocationModal(false)
  }

  function checkoutAllocation(allocation: Allocation) {
    if (
      !confirm(
        `Check out ${allocation.studentName} from ${allocation.roomId}, bed ${allocation.bedNumber}?`,
      )
    ) {
      return
    }

    setAllocations((current) =>
      current.map((item) =>
        item.id === allocation.id
          ? {
              ...item,
              status: "Checked Out",
              checkOutDate: today(),
            }
          : item,
      ),
    )
  }

  function cancelAllocation(allocation: Allocation) {
    if (!confirm("Cancel this dormitory allocation?")) return

    setAllocations((current) =>
      current.map((item) =>
        item.id === allocation.id
          ? {
              ...item,
              status: "Cancelled",
            }
          : item,
      ),
    )
  }

  function updateClearance(
    allocation: Allocation,
    clearance: Allocation["clearance"],
  ) {
    setAllocations((current) =>
      current.map((item) =>
        item.id === allocation.id
          ? {
              ...item,
              clearance,
            }
          : item,
      ),
    )
  }

  function openNewWarden() {
    setEditingWarden(null)
    setWardenForm({
      id: "",
      name: "",
      phone: "",
      email: "",
      dormitoryId: dormitories[0]?.id || "",
      status: "Active",
    })
    setShowWardenModal(true)
  }

  function openEditWarden(warden: Warden) {
    setEditingWarden(warden)
    setWardenForm(warden)
    setShowWardenModal(true)
  }

  function saveWarden() {
    if (!wardenForm.name.trim()) {
      alert("Warden name is required.")
      return
    }

    if (!wardenForm.dormitoryId) {
      alert("Select a dormitory.")
      return
    }

    if (editingWarden) {
      setWardens((current) =>
        current.map((item) =>
          item.id === editingWarden.id
            ? { ...wardenForm, id: editingWarden.id }
            : item,
        ),
      )
    } else {
      setWardens((current) => [
        ...current,
        {
          ...wardenForm,
          id: makeId("WARD"),
        },
      ])
    }

    setShowWardenModal(false)
  }

  function toggleWarden(warden: Warden) {
    const nextStatus: Warden["status"] =
      warden.status === "Active" ? "Inactive" : "Active"

    setWardens((current) =>
      current.map((item) =>
        item.id === warden.id
          ? { ...item, status: nextStatus }
          : item,
      ),
    )
  }

  function signOut() {
    clearNexusSession()
    window.location.href = "/dashboard"
  }

  function exportAllocations() {
    downloadCsv(
      "nexus-sis-dormitory-allocations.csv",
      allocations.map((allocation) => ({
        StudentID: allocation.studentId,
        StudentName: allocation.studentName,
        Dormitory:
          dormitories.find(
            (dorm) => dorm.id === allocation.dormitoryId,
          )?.name || "",
        Room:
          rooms.find((room) => room.id === allocation.roomId)
            ?.roomNumber || "",
        Bed: allocation.bedNumber,
        AcademicYear: allocation.academicYear,
        Semester: allocation.semester,
        AllocationDate: allocation.allocationDate,
        CheckInDate: allocation.checkInDate,
        CheckOutDate: allocation.checkOutDate,
        Status: allocation.status,
        Fee: allocation.feeAmount,
        Paid: allocation.feePaid,
        Balance: Math.max(
          allocation.feeAmount - allocation.feePaid,
          0,
        ),
        Clearance: allocation.clearance,
      })),
    )
  }

  function exportStudents() {
    downloadCsv(
      "nexus-sis-dormitory-students.csv",
      activeAllocations.map((allocation) => ({
        StudentID: allocation.studentId,
        StudentName: allocation.studentName,
        Dormitory:
          dormitories.find(
            (dorm) => dorm.id === allocation.dormitoryId,
          )?.name || "",
        Room:
          rooms.find((room) => room.id === allocation.roomId)
            ?.roomNumber || "",
        Bed: allocation.bedNumber,
        Status: allocation.status,
        Clearance: allocation.clearance,
      })),
    )
  }

  function exportRooms() {
    downloadCsv(
      "nexus-sis-dormitory-rooms.csv",
      availableRooms.map(({ room, occupied, available }) => ({
        Dormitory:
          dormitories.find(
            (dorm) => dorm.id === room.dormitoryId,
          )?.name || "",
        Room: room.roomNumber,
        Floor: room.floor,
        Capacity: room.capacity,
        Occupied: occupied,
        Available: available,
        MonthlyFee: room.monthlyFee,
        Status: room.status,
      })),
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-xl font-bold tracking-wide">
              NEXUS SIS
            </div>
            <div className="text-sm text-slate-300">
              Dormitory Management
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/admin/student-portal"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              Student Portal
            </a>

            <a
              href="/admin/student-affairs"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              Student Affairs
            </a>

            <button
              onClick={signOut}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Dormitory Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage dormitories, rooms, beds, student allocations,
            wardens and dormitory clearance.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow-sm">
          {(
            [
              "Dashboard",
              "Dormitories",
              "Rooms",
              "Allocations",
              "Students",
              "Wardens",
              "Clearance",
              "Reports",
            ] as Tab[]
          ).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === item
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {tab === "Dashboard" && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {[
                {
                  label: "Boarding Students",
                  value: boardingStudents.length,
                },
                {
                  label: "On-Campus Boarding",
                  value:
                    onCampusBoardingStudents.length,
                },
                {
                  label: "Off-Campus Boarding",
                  value:
                    offCampusBoardingStudents.length,
                },
                {
                  label: "Dormitories",
                  value: dormitories.length,
                },
                {
                  label: "Rooms",
                  value: rooms.length,
                },
                {
                  label: "Capacity",
                  value: totalCapacity,
                },
                {
                  label: "Occupied",
                  value: occupiedBeds,
                },
                {
                  label: "Available Beds",
                  value: availableBeds,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl bg-white p-5 shadow-sm"
                >
                  <div className="text-sm text-slate-500">
                    {card.label}
                  </div>
                  <div className="mt-2 text-2xl font-bold text-slate-900">
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">
                    Occupancy
                  </h2>
                  <span className="text-2xl font-bold text-blue-600">
                    {occupancyRate}%
                  </span>
                </div>

                <div className="h-4 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{
                      width: `${Math.min(occupancyRate, 100)}%`,
                    }}
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <div>
                    <div className="font-bold text-slate-900">
                      {totalCapacity}
                    </div>
                    <div className="text-slate-500">
                      Capacity
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-slate-900">
                      {occupiedBeds}
                    </div>
                    <div className="text-slate-500">
                      Occupied
                    </div>
                  </div>

                  <div>
                    <div className="font-bold text-emerald-600">
                      {availableBeds}
                    </div>
                    <div className="text-slate-500">
                      Available
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900">
                    Dormitory Summary
                  </h2>

                  <button
                    onClick={() => setTab("Dormitories")}
                    className="text-sm font-semibold text-blue-600 hover:underline"
                  >
                    Manage
                  </button>
                </div>

                <div className="space-y-3">
                  {dormitories.map((dorm) => {
                    const occupied = activeAllocations.filter(
                      (allocation) =>
                        allocation.dormitoryId === dorm.id,
                    ).length

                    const available = Math.max(
                      dorm.capacity - occupied,
                      0,
                    )

                    return (
                      <div
                        key={dorm.id}
                        className="rounded-lg border border-slate-200 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-semibold text-slate-900">
                              {dorm.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {dorm.location} · {dorm.gender}
                            </div>
                          </div>

                          <StatusBadge status={dorm.status} />
                        </div>

                        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded bg-slate-50 p-2">
                            <div className="font-bold">
                              {dorm.capacity}
                            </div>
                            Capacity
                          </div>
                          <div className="rounded bg-slate-50 p-2">
                            <div className="font-bold">
                              {occupied}
                            </div>
                            Occupied
                          </div>
                          <div className="rounded bg-emerald-50 p-2 text-emerald-700">
                            <div className="font-bold">
                              {available}
                            </div>
                            Available
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "Dormitories" && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Dormitories
                </h2>
                <p className="text-sm text-slate-500">
                  Manage residential facilities.
                </p>
              </div>

              <button
                onClick={openNewDormitory}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                + Add Dormitory
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Code</th>
                    <th className="px-5 py-3">Dormitory</th>
                    <th className="px-5 py-3">Gender</th>
                    <th className="px-5 py-3">Location</th>
                    <th className="px-5 py-3">Warden</th>
                    <th className="px-5 py-3">Capacity</th>
                    <th className="px-5 py-3">Occupied</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {dormitories.map((dorm) => {
                    const occupied =
                      activeAllocations.filter(
                        (allocation) =>
                          allocation.dormitoryId === dorm.id,
                      ).length

                    return (
                      <tr
                        key={dorm.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {dorm.code}
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {dorm.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {dorm.description}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          {dorm.gender}
                        </td>
                        <td className="px-5 py-4">
                          {dorm.location}
                        </td>
                        <td className="px-5 py-4">
                          {dorm.warden}
                        </td>
                        <td className="px-5 py-4">
                          {dorm.capacity}
                        </td>
                        <td className="px-5 py-4">
                          {occupied}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={dorm.status} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                openEditDormitory(dorm)
                              }
                              className="rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                deleteDormitory(dorm.id)
                              }
                              className="rounded bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
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
          </div>
        )}

        {tab === "Rooms" && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Rooms & Beds
                </h2>
                <p className="text-sm text-slate-500">
                  Manage rooms, capacity and room fees.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportRooms}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Export
                </button>

                <button
                  onClick={openNewRoom}
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  + Add Room
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Dormitory</th>
                    <th className="px-5 py-3">Room</th>
                    <th className="px-5 py-3">Floor</th>
                    <th className="px-5 py-3">Capacity</th>
                    <th className="px-5 py-3">Occupied</th>
                    <th className="px-5 py-3">Available</th>
                    <th className="px-5 py-3">Monthly Fee</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {availableRooms.map(
                    ({ room, occupied, available }) => (
                      <tr
                        key={room.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          {
                            dormitories.find(
                              (dorm) =>
                                dorm.id === room.dormitoryId,
                            )?.name
                          }
                        </td>
                        <td className="px-5 py-4 font-semibold">
                          {room.roomNumber}
                        </td>
                        <td className="px-5 py-4">
                          {room.floor}
                        </td>
                        <td className="px-5 py-4">
                          {room.capacity}
                        </td>
                        <td className="px-5 py-4">
                          {occupied}
                        </td>
                        <td className="px-5 py-4 font-semibold text-emerald-600">
                          {available}
                        </td>
                        <td className="px-5 py-4">
                          {money(room.monthlyFee)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              available === 0
                                ? "Full"
                                : room.status
                            }
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() =>
                                openEditRoom(room)
                              }
                              className="rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                deleteRoom(room.id)
                              }
                              className="rounded bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Allocations" && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Student Dormitory Allocations
                </h2>
                <p className="text-sm text-slate-500">
                  Allocate registered students to rooms and beds.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportAllocations}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Export
                </button>

                <button
                  onClick={openNewAllocation}
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  + New Allocation
                </button>
              </div>
            </div>

            <div className="grid gap-3 border-b p-5 md:grid-cols-3">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search student, ID, room or bed..."
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Allocated">Allocated</option>
                <option value="Checked In">Checked In</option>
                <option value="Checked Out">Checked Out</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <button
                onClick={() => {
                  setSearch("")
                  setStatusFilter("All")
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Reset Filters
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Dormitory</th>
                    <th className="px-5 py-3">Room</th>
                    <th className="px-5 py-3">Bed</th>
                    <th className="px-5 py-3">Academic Year</th>
                    <th className="px-5 py-3">Fee</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredAllocations.length ? (
                    filteredAllocations.map((allocation) => (
                      <tr
                        key={allocation.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {allocation.studentName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {allocation.studentId}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {
                            dormitories.find(
                              (dorm) =>
                                dorm.id ===
                                allocation.dormitoryId,
                            )?.name
                          }
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {
                            rooms.find(
                              (room) =>
                                room.id === allocation.roomId,
                            )?.roomNumber
                          }
                        </td>

                        <td className="px-5 py-4">
                          {allocation.bedNumber}
                        </td>

                        <td className="px-5 py-4">
                          {allocation.academicYear} /{" "}
                          {allocation.semester}
                        </td>

                        <td className="px-5 py-4">
                          <div>
                            {money(allocation.feeAmount)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Balance:{" "}
                            {money(
                              Math.max(
                                allocation.feeAmount -
                                  allocation.feePaid,
                                0,
                              ),
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={allocation.status}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => {
                                setSelectedAllocation(
                                  allocation,
                                )
                                setAllocationForm({
                                  studentId:
                                    allocation.studentId,
                                  dormitoryId:
                                    allocation.dormitoryId,
                                  roomId: allocation.roomId,
                                  bedNumber:
                                    allocation.bedNumber,
                                  academicYear:
                                    allocation.academicYear,
                                  semester:
                                    allocation.semester,
                                  allocationDate:
                                    allocation.allocationDate,
                                  checkInDate:
                                    allocation.checkInDate,
                                  feeAmount:
                                    allocation.feeAmount,
                                  notes:
                                    allocation.notes,
                                })
                                setShowAllocationModal(true)
                              }}
                              className="rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                            >
                              Edit
                            </button>

                            {allocation.status ===
                              "Allocated" ||
                            allocation.status ===
                              "Checked In" ? (
                              <button
                                onClick={() =>
                                  checkoutAllocation(
                                    allocation,
                                  )
                                }
                                className="rounded bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"
                              >
                                Check Out
                              </button>
                            ) : null}

                            {allocation.status !==
                              "Cancelled" &&
                            allocation.status !==
                              "Checked Out" ? (
                              <button
                                onClick={() =>
                                  cancelAllocation(
                                    allocation,
                                  )
                                }
                                className="rounded bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                              >
                                Cancel
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No dormitory allocations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Students" && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Student Accommodation Directory
                </h2>
                <p className="text-sm text-slate-500">
                  Students are loaded from the central registration
                  record.
                </p>
              </div>

              <button
                onClick={exportStudents}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Export Residents
              </button>
            </div>

            <div className="grid gap-3 border-b p-5 md:grid-cols-3">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search Student ID or name..."
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              />

              <select
                value={genderFilter}
                onChange={(event) =>
                  setGenderFilter(event.target.value)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              <button
                onClick={() => {
                  setSearch("")
                  setGenderFilter("All")
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Reset
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student ID</th>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Gender</th>
                    <th className="px-5 py-3">Faculty</th>
                    <th className="px-5 py-3">Programme</th>
                    <th className="px-5 py-3">Residence Type</th>
                    <th className="px-5 py-3">Accommodation</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredStudents.map((student) => {
                    const studentKey =
                      student.studentId || student.id || ""

                    const allocation =
                      activeAllocations.find(
                        (item) =>
                          item.studentId === studentKey,
                      )

                    const profile =
                      getAccommodationProfile(studentKey)

                    return (
                      <tr
                        key={studentKey}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {studentKey}
                        </td>
                        <td className="px-5 py-4">
                          {student.name}
                        </td>
                        <td className="px-5 py-4">
                          {student.gender || "—"}
                        </td>
                        <td className="px-5 py-4">
                          {student.faculty || "—"}
                        </td>
                        <td className="px-5 py-4">
                          {student.programme || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            value={
                              profile?.residenceType ||
                              "Non-Boarding"
                            }
                            onChange={(event) =>
                              updateAccommodationProfile(
                                studentKey,
                                event.target.value as
                                  | "Boarding"
                                  | "Non-Boarding",
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                          >
                            <option value="Boarding">
                              Boarding
                            </option>
                            <option value="Non-Boarding">
                              Non-Boarding
                            </option>
                          </select>
                        </td>

                        <td className="px-5 py-4">
                          {allocation ? (
                            <div>
                              <div className="font-semibold">
                                {
                                  dormitories.find(
                                    (dorm) =>
                                      dorm.id ===
                                      allocation.dormitoryId,
                                  )?.name
                                }
                              </div>

                              <div className="text-xs text-slate-500">
                                {
                                  rooms.find(
                                    (room) =>
                                      room.id ===
                                      allocation.roomId,
                                  )?.roomNumber
                                }{" "}
                                · Bed{" "}
                                {allocation.bedNumber}
                              </div>

                              <div className="mt-1 text-xs font-semibold text-emerald-700">
                                On Campus
                              </div>
                            </div>
                          ) : profile?.residenceType ===
                            "Boarding" ? (
                            <div>
                              <div className="font-semibold text-amber-700">
                                Off Campus
                              </div>

                              <div className="text-xs text-slate-500">
                                {profile.offCampusReason ||
                                  "No Accommodation Available"}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400">
                              Not Applicable
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            onClick={() => {
                              setSelectedStudentId(studentKey)
                              setAllocationForm((current) => ({
                                ...current,
                                studentId: studentKey,
                              }))
                              setTab("Allocations")
                              setShowAllocationModal(true)
                            }}
                            className="rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                          >
                            Allocate
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Wardens" && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Dormitory Wardens
                </h2>
                <p className="text-sm text-slate-500">
                  Manage dormitory wardens and contact details.
                </p>
              </div>

              <button
                onClick={openNewWarden}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                + Add Warden
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Warden</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">Email</th>
                    <th className="px-5 py-3">Dormitory</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {wardens.map((warden) => (
                    <tr
                      key={warden.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold">
                        {warden.name}
                      </td>
                      <td className="px-5 py-4">
                        {warden.phone}
                      </td>
                      <td className="px-5 py-4">
                        {warden.email}
                      </td>
                      <td className="px-5 py-4">
                        {
                          dormitories.find(
                            (dorm) =>
                              dorm.id === warden.dormitoryId,
                          )?.name
                        }
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={warden.status} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              openEditWarden(warden)
                            }
                            className="rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              toggleWarden(warden)
                            }
                            className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                          >
                            {warden.status === "Active"
                              ? "Deactivate"
                              : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Clearance" && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="border-b p-5">
              <h2 className="font-bold text-slate-900">
                Dormitory Clearance
              </h2>
              <p className="text-sm text-slate-500">
                Accommodation clearance forms part of the
                university graduation clearance workflow.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Dormitory</th>
                    <th className="px-5 py-3">Room</th>
                    <th className="px-5 py-3">Check Out</th>
                    <th className="px-5 py-3">Fee Balance</th>
                    <th className="px-5 py-3">Clearance</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {allocations
                    .filter(
                      (allocation) =>
                        allocation.status === "Checked Out" ||
                        allocation.status === "Checked In",
                    )
                    .map((allocation) => {
                      const balance = Math.max(
                        allocation.feeAmount -
                          allocation.feePaid,
                        0,
                      )

                      return (
                        <tr
                          key={allocation.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold">
                              {allocation.studentName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {allocation.studentId}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {
                              dormitories.find(
                                (dorm) =>
                                  dorm.id ===
                                  allocation.dormitoryId,
                              )?.name
                            }
                          </td>

                          <td className="px-5 py-4">
                            {
                              rooms.find(
                                (room) =>
                                  room.id === allocation.roomId,
                              )?.roomNumber
                            }{" "}
                            · {allocation.bedNumber}
                          </td>

                          <td className="px-5 py-4">
                            {allocation.checkOutDate || "—"}
                          </td>

                          <td className="px-5 py-4">
                            {money(balance)}
                          </td>

                          <td className="px-5 py-4">
                            <StatusBadge
                              status={allocation.clearance}
                            />
                          </td>

                          <td className="px-5 py-4">
                            <select
                              value={allocation.clearance}
                              onChange={(event) =>
                                updateClearance(
                                  allocation,
                                  event.target
                                    .value as Allocation["clearance"],
                                )
                              }
                              className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                            >
                              <option value="Pending">
                                Pending
                              </option>
                              <option value="Cleared">
                                Cleared
                              </option>
                              <option value="Not Required">
                                Not Required
                              </option>
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Reports" && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">
                Allocation Report
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Export all dormitory allocations.
              </p>
              <button
                onClick={exportAllocations}
                className="mt-5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Export CSV
              </button>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">
                Room Occupancy Report
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Export rooms, capacity and available beds.
              </p>
              <button
                onClick={exportRooms}
                className="mt-5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Export CSV
              </button>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">
                Resident Report
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Export current dormitory residents.
              </p>
              <button
                onClick={exportStudents}
                className="mt-5 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Export CSV
              </button>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm md:col-span-2 lg:col-span-3">
              <h2 className="font-bold text-slate-900">
                Current Accommodation Summary
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">
                    Total Capacity
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {totalCapacity}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="text-sm text-slate-500">
                    Occupied
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {occupiedBeds}
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-50 p-4">
                  <div className="text-sm text-emerald-700">
                    Available
                  </div>
                  <div className="mt-1 text-2xl font-bold text-emerald-700">
                    {availableBeds}
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="text-sm text-blue-700">
                    Occupancy Rate
                  </div>
                  <div className="mt-1 text-2xl font-bold text-blue-700">
                    {occupancyRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {showDormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  {editingDorm
                    ? "Edit Dormitory"
                    : "Add Dormitory"}
                </h2>
                <p className="text-sm text-slate-500">
                  Enter dormitory facility details.
                </p>
              </div>

              <button
                onClick={() => setShowDormModal(false)}
                className="text-xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="text-sm font-medium">
                Code
                <input
                  value={dormForm.code}
                  onChange={(event) =>
                    setDormForm({
                      ...dormForm,
                      code: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="e.g. MTH"
                />
              </label>

              <label className="text-sm font-medium">
                Dormitory Name
                <input
                  value={dormForm.name}
                  onChange={(event) =>
                    setDormForm({
                      ...dormForm,
                      name: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Gender
                <select
                  value={dormForm.gender}
                  onChange={(event) =>
                    setDormForm({
                      ...dormForm,
                      gender:
                        event.target.value as Dormitory["gender"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Location
                <input
                  value={dormForm.location}
                  onChange={(event) =>
                    setDormForm({
                      ...dormForm,
                      location: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Main Campus"
                />
              </label>

              <label className="text-sm font-medium">
                Warden
                <input
                  value={dormForm.warden}
                  onChange={(event) =>
                    setDormForm({
                      ...dormForm,
                      warden: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Phone
                <input
                  value={dormForm.phone}
                  onChange={(event) =>
                    setDormForm({
                      ...dormForm,
                      phone: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Capacity
                <input
                  type="number"
                  min="1"
                  value={dormForm.capacity}
                  onChange={(event) =>
                    setDormForm({
                      ...dormForm,
                      capacity: Number(event.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Status
                <select
                  value={dormForm.status}
                  onChange={(event) =>
                    setDormForm({
                      ...dormForm,
                      status:
                        event.target.value as Dormitory["status"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>

              <label className="text-sm font-medium md:col-span-2">
                Description
                <textarea
                  value={dormForm.description}
                  onChange={(event) =>
                    setDormForm({
                      ...dormForm,
                      description: event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t p-5">
              <button
                onClick={() => setShowDormModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveDormitory}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Dormitory
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  {editingRoom ? "Edit Room" : "Add Room"}
                </h2>
                <p className="text-sm text-slate-500">
                  Configure room capacity and fee.
                </p>
              </div>

              <button
                onClick={() => setShowRoomModal(false)}
                className="text-xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="text-sm font-medium md:col-span-2">
                Dormitory
                <select
                  value={roomForm.dormitoryId}
                  onChange={(event) =>
                    setRoomForm({
                      ...roomForm,
                      dormitoryId: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {dormitories.map((dorm) => (
                    <option key={dorm.id} value={dorm.id}>
                      {dorm.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Room Number
                <input
                  value={roomForm.roomNumber}
                  onChange={(event) =>
                    setRoomForm({
                      ...roomForm,
                      roomNumber: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Floor
                <input
                  value={roomForm.floor}
                  onChange={(event) =>
                    setRoomForm({
                      ...roomForm,
                      floor: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Capacity
                <input
                  type="number"
                  min="1"
                  value={roomForm.capacity}
                  onChange={(event) =>
                    setRoomForm({
                      ...roomForm,
                      capacity: Number(event.target.value),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Monthly Fee
                <input
                  type="number"
                  min="0"
                  value={roomForm.monthlyFee}
                  onChange={(event) =>
                    setRoomForm({
                      ...roomForm,
                      monthlyFee: Number(
                        event.target.value,
                      ),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium md:col-span-2">
                Room Status
                <select
                  value={roomForm.status}
                  onChange={(event) =>
                    setRoomForm({
                      ...roomForm,
                      status:
                        event.target.value as Room["status"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Available">
                    Available
                  </option>
                  <option value="Full">Full</option>
                  <option value="Maintenance">
                    Maintenance
                  </option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t p-5">
              <button
                onClick={() => setShowRoomModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveRoom}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Room
              </button>
            </div>
          </div>
        </div>
      )}

      {showAllocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  {selectedAllocation
                    ? "Edit Dormitory Allocation"
                    : "New Dormitory Allocation"}
                </h2>
                <p className="text-sm text-slate-500">
                  Link a registered student to a dormitory room
                  and bed.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowAllocationModal(false)
                }
                className="text-xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="text-sm font-medium md:col-span-2">
                Student
                <select
                  value={allocationForm.studentId}
                  onChange={(event) =>
                    setAllocationForm({
                      ...allocationForm,
                      studentId: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">
                    Select registered student
                  </option>
                  {students.map((student) => {
                    const id =
                      student.studentId || student.id || ""

                    return (
                      <option key={id} value={id}>
                        {id} — {student.name}
                      </option>
                    )
                  })}
                </select>
              </label>

              {selectedStudent && (
                <div className="rounded-lg bg-blue-50 p-4 text-sm md:col-span-2">
                  <div className="font-semibold text-blue-900">
                    {selectedStudent.name}
                  </div>
                  <div className="mt-1 text-blue-700">
                    {selectedStudent.studentId ||
                      selectedStudent.id}{" "}
                    · {selectedStudent.gender || "Gender not set"}
                  </div>
                  <div className="mt-1 text-blue-700">
                    {selectedStudent.programme ||
                      "Programme not set"}
                  </div>
                </div>
              )}

              <label className="text-sm font-medium">
                Dormitory
                <select
                  value={allocationForm.dormitoryId}
                  onChange={(event) =>
                    setAllocationForm({
                      ...allocationForm,
                      dormitoryId: event.target.value,
                      roomId: "",
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">
                    Select dormitory
                  </option>
                  {dormitories
                    .filter(
                      (dorm) => dorm.status === "Active",
                    )
                    .map((dorm) => (
                      <option key={dorm.id} value={dorm.id}>
                        {dorm.name} ({dorm.gender})
                      </option>
                    ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Room
                <select
                  value={allocationForm.roomId}
                  onChange={(event) => {
                    const roomId = event.target.value
                    const room = rooms.find(
                      (item) => item.id === roomId,
                    )

                    setAllocationForm({
                      ...allocationForm,
                      roomId,
                      feeAmount:
                        room?.monthlyFee ||
                        allocationForm.feeAmount,
                    })
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">
                    Select room
                  </option>
                  {selectedDormitoryRooms.map((room) => {
                    const occupied =
                      activeAllocations.filter(
                        (allocation) =>
                          allocation.roomId === room.id,
                      ).length

                    const available = Math.max(
                      room.capacity - occupied,
                      0,
                    )

                    return (
                      <option
                        key={room.id}
                        value={room.id}
                        disabled={
                          available === 0 &&
                          room.id !==
                            selectedAllocation?.roomId
                        }
                      >
                        {room.roomNumber} —{" "}
                        {available} bed(s) available
                      </option>
                    )
                  })}
                </select>
              </label>

              <label className="text-sm font-medium">
                Bed Number
                <input
                  value={allocationForm.bedNumber}
                  onChange={(event) =>
                    setAllocationForm({
                      ...allocationForm,
                      bedNumber: event.target.value,
                    })
                  }
                  placeholder="e.g. Bed 1"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Academic Year
                <input
                  value={allocationForm.academicYear}
                  onChange={(event) =>
                    setAllocationForm({
                      ...allocationForm,
                      academicYear: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Semester
                <select
                  value={allocationForm.semester}
                  onChange={(event) =>
                    setAllocationForm({
                      ...allocationForm,
                      semester: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="Summer">Summer</option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Allocation Date
                <input
                  type="date"
                  value={allocationForm.allocationDate}
                  onChange={(event) =>
                    setAllocationForm({
                      ...allocationForm,
                      allocationDate: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Check-In Date
                <input
                  type="date"
                  value={allocationForm.checkInDate}
                  onChange={(event) =>
                    setAllocationForm({
                      ...allocationForm,
                      checkInDate: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Dormitory Fee
                <input
                  type="number"
                  min="0"
                  value={allocationForm.feeAmount}
                  onChange={(event) =>
                    setAllocationForm({
                      ...allocationForm,
                      feeAmount: Number(
                        event.target.value,
                      ),
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium md:col-span-2">
                Notes
                <textarea
                  value={allocationForm.notes}
                  onChange={(event) =>
                    setAllocationForm({
                      ...allocationForm,
                      notes: event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Optional accommodation notes..."
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t p-5">
              <button
                onClick={() =>
                  setShowAllocationModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveAllocation}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                {selectedAllocation
                  ? "Update Allocation"
                  : "Allocate Student"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWardenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  {editingWarden
                    ? "Edit Warden"
                    : "Add Warden"}
                </h2>
              </div>

              <button
                onClick={() => setShowWardenModal(false)}
                className="text-xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 p-5">
              <label className="text-sm font-medium">
                Full Name
                <input
                  value={wardenForm.name}
                  onChange={(event) =>
                    setWardenForm({
                      ...wardenForm,
                      name: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Phone
                <input
                  value={wardenForm.phone}
                  onChange={(event) =>
                    setWardenForm({
                      ...wardenForm,
                      phone: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Email
                <input
                  type="email"
                  value={wardenForm.email}
                  onChange={(event) =>
                    setWardenForm({
                      ...wardenForm,
                      email: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Dormitory
                <select
                  value={wardenForm.dormitoryId}
                  onChange={(event) =>
                    setWardenForm({
                      ...wardenForm,
                      dormitoryId: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">
                    Select dormitory
                  </option>
                  {dormitories.map((dorm) => (
                    <option key={dorm.id} value={dorm.id}>
                      {dorm.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Status
                <select
                  value={wardenForm.status}
                  onChange={(event) =>
                    setWardenForm({
                      ...wardenForm,
                      status:
                        event.target.value as Warden["status"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t p-5">
              <button
                onClick={() =>
                  setShowWardenModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveWarden}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Warden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
