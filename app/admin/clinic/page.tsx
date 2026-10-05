"use client"

import { useEffect, useMemo, useState } from "react"
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
  studentId: string
  firstName?: string
  middleName?: string
  lastName?: string
  name?: string
  gender?: string
  faculty?: string
  department?: string
  programme?: string
  yearLevel?: string
  status?: string
}

type ClinicStaff = {
  id: string
  staffId: string
  name: string
  role: string
  phone: string
  status: "Active" | "Inactive"
}

type Patient = {
  id: string
  studentId: string
  studentName: string
  bloodGroup: string
  allergies: string
  emergencyContact: string
  emergencyPhone: string
  notes: string
  updatedAt: string
}

type Visit = {
  id: string
  studentId: string
  studentName: string
  visitDate: string
  visitTime: string
  complaint: string
  diagnosis: string
  treatment: string
  prescribedMedication: string
  attendingStaff: string
  status: "Open" | "Completed" | "Referred"
  notes: string
}

type Appointment = {
  id: string
  studentId: string
  studentName: string
  appointmentDate: string
  appointmentTime: string
  reason: string
  clinician: string
  status: "Scheduled" | "Completed" | "Cancelled"
  notes: string
}

type Prescription = {
  id: string
  studentId: string
  studentName: string
  visitId: string
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  status: "Active" | "Completed" | "Cancelled"
  issuedDate: string
}

type Referral = {
  id: string
  studentId: string
  studentName: string
  referralDate: string
  facility: string
  reason: string
  referredBy: string
  status: "Pending" | "Referred" | "Completed"
  notes: string
}

type EmergencyCase = {
  id: string
  studentId: string
  studentName: string
  date: string
  time: string
  incident: string
  actionTaken: string
  referredTo: string
  status: "Open" | "Stabilized" | "Referred" | "Closed"
  notes: string
}

type InventoryItem = {
  id: string
  itemCode: string
  name: string
  category: string
  unit: string
  quantity: number
  reorderLevel: number
  expiryDate: string
  status: "Available" | "Low Stock" | "Out of Stock" | "Expired"
}

type Tab =
  | "dashboard"
  | "patients"
  | "visits"
  | "appointments"
  | "prescriptions"
  | "referrals"
  | "emergency"
  | "staff"
  | "inventory"
  | "clearance"
  | "reports"

const STORAGE = {
  students: NEXUS_KEYS.students,
  patients: "nexusSIS_clinic_patients",
  visits: "nexusSIS_clinic_visits",
  appointments: "nexusSIS_clinic_appointments",
  prescriptions: "nexusSIS_clinic_prescriptions",
  referrals: "nexusSIS_clinic_referrals",
  emergency: "nexusSIS_clinic_emergency",
  staff: "nexusSIS_clinic_staff",
  inventory: "nexusSIS_clinic_inventory",
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`
}

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback

  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(value))
}

function centralStudentToClinicStudent(
  student: CentralStudent,
): Student {
  return {
    id: student.id,
    studentId: student.studentId,
    firstName: student.firstName,
    middleName: student.middleName,
    lastName: student.lastName,
    name: student.fullName,
    gender: student.gender,
    faculty: student.facultyName,
    department: student.departmentName,
    programme: student.programmeName,
    yearLevel: String(student.yearLevel),
    status: student.status,
  }
}

function readClinicStudents(): Student[] {
  const central = readStorage<CentralStudent[]>(
    NEXUS_KEYS.students,
    [],
  )

  if (central.length > 0) {
    return central.map(centralStudentToClinicStudent)
  }

  return readStorage<Student[]>(
    "nexusSIS_registered_students",
    [],
  )
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    alert("There is no data to export.")
    return
  }

  const headers = Object.keys(rows[0])

  const escapeValue = (value: unknown) => {
    const text = String(value ?? "")
    return `"${text.replace(/"/g, '""')}"`
  }

  const csv = [
    headers.map(escapeValue).join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeValue(row[header])).join(","),
    ),
  ].join("\n")

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;",
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = filename
  link.click()

  URL.revokeObjectURL(url)
}

function studentDisplayName(student: Student) {
  if (student.name) return student.name

  return [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim()
}

export default function ClinicPage() {
  const [tab, setTab] = useState<Tab>("dashboard")

  const [students, setStudents] = useState<Student[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [emergencyCases, setEmergencyCases] =
    useState<EmergencyCase[]>([])
  const [staff, setStaff] = useState<ClinicStaff[]>([])
  const [inventory, setInventory] =
    useState<InventoryItem[]>([])

  const [search, setSearch] = useState("")
  const [studentFilter, setStudentFilter] = useState("All")
  const [statusFilter, setStatusFilter] = useState("All")

  const [showVisitModal, setShowVisitModal] =
    useState(false)
  const [showAppointmentModal, setShowAppointmentModal] =
    useState(false)
  const [showPrescriptionModal, setShowPrescriptionModal] =
    useState(false)
  const [showReferralModal, setShowReferralModal] =
    useState(false)
  const [showEmergencyModal, setShowEmergencyModal] =
    useState(false)
  const [showPatientModal, setShowPatientModal] =
    useState(false)
  const [showStaffModal, setShowStaffModal] =
    useState(false)
  const [showInventoryModal, setShowInventoryModal] =
    useState(false)

  const [selectedStudentId, setSelectedStudentId] =
    useState("")

  const [visitForm, setVisitForm] = useState({
    studentId: "",
    visitDate: today(),
    visitTime: "",
    complaint: "",
    diagnosis: "",
    treatment: "",
    prescribedMedication: "",
    attendingStaff: "",
    status: "Open" as Visit["status"],
    notes: "",
  })

  const [appointmentForm, setAppointmentForm] =
    useState({
      studentId: "",
      appointmentDate: today(),
      appointmentTime: "",
      reason: "",
      clinician: "",
      status: "Scheduled" as Appointment["status"],
      notes: "",
    })

  const [prescriptionForm, setPrescriptionForm] =
    useState({
      studentId: "",
      visitId: "",
      medication: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      status: "Active" as Prescription["status"],
    })

  const [referralForm, setReferralForm] = useState({
    studentId: "",
    referralDate: today(),
    facility: "",
    reason: "",
    referredBy: "",
    status: "Pending" as Referral["status"],
    notes: "",
  })

  const [emergencyForm, setEmergencyForm] =
    useState({
      studentId: "",
      date: today(),
      time: "",
      incident: "",
      actionTaken: "",
      referredTo: "",
      status: "Open" as EmergencyCase["status"],
      notes: "",
    })

  const [patientForm, setPatientForm] = useState({
    studentId: "",
    bloodGroup: "",
    allergies: "",
    emergencyContact: "",
    emergencyPhone: "",
    notes: "",
  })

  const [staffForm, setStaffForm] = useState({
    staffId: "",
    name: "",
    role: "",
    phone: "",
    status: "Active" as ClinicStaff["status"],
  })

  const [inventoryForm, setInventoryForm] =
    useState({
      itemCode: "",
      name: "",
      category: "",
      unit: "",
      quantity: "0",
      reorderLevel: "0",
      expiryDate: "",
      status: "Available" as InventoryItem["status"],
    })

  useEffect(() => {
    protectNexusPage([
      "Clinic Staff",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    const storedStudents = readClinicStudents()

    const normalizedStudents = storedStudents.map(
      (student) => ({
        ...student,
        studentId:
          student.studentId ||
          student.id ||
          "",
      }),
    )

    setStudents(normalizedStudents)

    const handleStudentsUpdated = () => {
      const updatedStudents = readClinicStudents()

      const normalizedUpdatedStudents =
        updatedStudents.map((student) => ({
          ...student,
          studentId:
            student.studentId ||
            student.id ||
            "",
        }))

      setStudents(normalizedUpdatedStudents)
    }

    window.addEventListener(
      "nexusSIS_students_updated",
      handleStudentsUpdated,
    )

    window.addEventListener(
      "storage",
      handleStudentsUpdated,
    )

    setPatients(
      readStorage<Patient[]>(STORAGE.patients, []),
    )
    setVisits(
      readStorage<Visit[]>(STORAGE.visits, []),
    )
    setAppointments(
      readStorage<Appointment[]>(
        STORAGE.appointments,
        [],
      ),
    )
    setPrescriptions(
      readStorage<Prescription[]>(
        STORAGE.prescriptions,
        [],
      ),
    )
    setReferrals(
      readStorage<Referral[]>(
        STORAGE.referrals,
        [],
      ),
    )
    setEmergencyCases(
      readStorage<EmergencyCase[]>(
        STORAGE.emergency,
        [],
      ),
    )
    setStaff(
      readStorage<ClinicStaff[]>(
        STORAGE.staff,
        [],
      ),
    )
    setInventory(
      readStorage<InventoryItem[]>(
        STORAGE.inventory,
        [],
      ),
    )

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
    writeStorage(STORAGE.patients, patients)
  }, [patients])

  useEffect(() => {
    writeStorage(STORAGE.visits, visits)
  }, [visits])

  useEffect(() => {
    writeStorage(
      STORAGE.appointments,
      appointments,
    )
  }, [appointments])

  useEffect(() => {
    writeStorage(
      STORAGE.prescriptions,
      prescriptions,
    )
  }, [prescriptions])

  useEffect(() => {
    writeStorage(STORAGE.referrals, referrals)
  }, [referrals])

  useEffect(() => {
    writeStorage(
      STORAGE.emergency,
      emergencyCases,
    )
  }, [emergencyCases])

  useEffect(() => {
    writeStorage(STORAGE.staff, staff)
  }, [staff])

  useEffect(() => {
    writeStorage(
      STORAGE.inventory,
      inventory,
    )
  }, [inventory])

  const activePatients = patients.length

  const openVisits = visits.filter(
    (visit) => visit.status === "Open",
  ).length

  const todayAppointments = appointments.filter(
    (appointment) =>
      appointment.appointmentDate === today() &&
      appointment.status === "Scheduled",
  ).length

  const activePrescriptions = prescriptions.filter(
    (prescription) =>
      prescription.status === "Active",
  ).length

  const pendingReferrals = referrals.filter(
    (referral) =>
      referral.status === "Pending" ||
      referral.status === "Referred",
  ).length

  const openEmergencyCases = emergencyCases.filter(
    (item) =>
      item.status === "Open" ||
      item.status === "Stabilized" ||
      item.status === "Referred",
  ).length

  const lowStockItems = inventory.filter(
    (item) =>
      item.status === "Low Stock" ||
      item.status === "Out of Stock" ||
      item.status === "Expired",
  ).length

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase()

    return students.filter((student) => {
      const name = studentDisplayName(student)
      const studentId = student.studentId || ""

      const matchesSearch =
        !query ||
        name.toLowerCase().includes(query) ||
        studentId.toLowerCase().includes(query) ||
        (student.faculty || "")
          .toLowerCase()
          .includes(query) ||
        (student.department || "")
          .toLowerCase()
          .includes(query)

      const matchesStudent =
        studentFilter === "All" ||
        studentId === studentFilter

      return matchesSearch && matchesStudent
    })
  }, [students, search, studentFilter])

  const filteredVisits = useMemo(() => {
    const query = search.trim().toLowerCase()

    return visits.filter((visit) => {
      const matchesSearch =
        !query ||
        visit.studentName
          .toLowerCase()
          .includes(query) ||
        visit.studentId
          .toLowerCase()
          .includes(query) ||
        visit.complaint
          .toLowerCase()
          .includes(query) ||
        visit.diagnosis
          .toLowerCase()
          .includes(query)

      const matchesStudent =
        studentFilter === "All" ||
        visit.studentId === studentFilter

      const matchesStatus =
        statusFilter === "All" ||
        visit.status === statusFilter

      return (
        matchesSearch &&
        matchesStudent &&
        matchesStatus
      )
    })
  }, [
    visits,
    search,
    studentFilter,
    statusFilter,
  ])

  function getStudent(studentId: string) {
    return students.find(
      (student) => student.studentId === studentId,
    )
  }

  function getStudentName(studentId: string) {
    const student = getStudent(studentId)
    return student
      ? studentDisplayName(student)
      : studentId
  }

  function saveVisit() {
    if (!visitForm.studentId) {
      alert("Select a student.")
      return
    }

    if (!visitForm.complaint.trim()) {
      alert("Enter the presenting complaint.")
      return
    }

    const student = getStudent(visitForm.studentId)

    if (!student) {
      alert("Student could not be found.")
      return
    }

    const visit: Visit = {
      id: makeId("VIS"),
      studentName: studentDisplayName(student),
      ...visitForm,
      complaint: visitForm.complaint.trim(),
      diagnosis: visitForm.diagnosis.trim(),
      treatment: visitForm.treatment.trim(),
      prescribedMedication:
        visitForm.prescribedMedication.trim(),
      notes: visitForm.notes.trim(),
    }

    setVisits((current) => [
      visit,
      ...current,
    ])

    setShowVisitModal(false)

    setVisitForm({
      studentId: "",
      visitDate: today(),
      visitTime: "",
      complaint: "",
      diagnosis: "",
      treatment: "",
      prescribedMedication: "",
      attendingStaff: "",
      status: "Open",
      notes: "",
    })
  }

  function saveAppointment() {
    if (!appointmentForm.studentId) {
      alert("Select a student.")
      return
    }

    if (!appointmentForm.reason.trim()) {
      alert("Enter the appointment reason.")
      return
    }

    const appointment: Appointment = {
      id: makeId("APT"),
      studentName: getStudentName(
        appointmentForm.studentId,
      ),
      ...appointmentForm,
      reason: appointmentForm.reason.trim(),
      notes: appointmentForm.notes.trim(),
    }

    setAppointments((current) => [
      appointment,
      ...current,
    ])

    setShowAppointmentModal(false)

    setAppointmentForm({
      studentId: "",
      appointmentDate: today(),
      appointmentTime: "",
      reason: "",
      clinician: "",
      status: "Scheduled",
      notes: "",
    })
  }

  function savePrescription() {
    if (!prescriptionForm.studentId) {
      alert("Select a student.")
      return
    }

    if (!prescriptionForm.medication.trim()) {
      alert("Enter the medication.")
      return
    }

    const prescription: Prescription = {
      id: makeId("RX"),
      studentId: prescriptionForm.studentId,
      studentName: getStudentName(
        prescriptionForm.studentId,
      ),
      visitId: prescriptionForm.visitId,
      medication:
        prescriptionForm.medication.trim(),
      dosage: prescriptionForm.dosage.trim(),
      frequency:
        prescriptionForm.frequency.trim(),
      duration:
        prescriptionForm.duration.trim(),
      instructions:
        prescriptionForm.instructions.trim(),
      status: prescriptionForm.status,
      issuedDate: today(),
    }

    setPrescriptions((current) => [
      prescription,
      ...current,
    ])

    setShowPrescriptionModal(false)

    setPrescriptionForm({
      studentId: "",
      visitId: "",
      medication: "",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      status: "Active",
    })
  }

  function saveReferral() {
    if (!referralForm.studentId) {
      alert("Select a student.")
      return
    }

    if (!referralForm.facility.trim()) {
      alert("Enter the referral facility.")
      return
    }

    const referral: Referral = {
      id: makeId("REF"),
      studentName: getStudentName(
        referralForm.studentId,
      ),
      ...referralForm,
      facility:
        referralForm.facility.trim(),
      reason:
        referralForm.reason.trim(),
      referredBy:
        referralForm.referredBy.trim(),
      notes:
        referralForm.notes.trim(),
    }

    setReferrals((current) => [
      referral,
      ...current,
    ])

    setShowReferralModal(false)

    setReferralForm({
      studentId: "",
      referralDate: today(),
      facility: "",
      reason: "",
      referredBy: "",
      status: "Pending",
      notes: "",
    })
  }

  function saveEmergencyCase() {
    if (!emergencyForm.studentId) {
      alert("Select a student.")
      return
    }

    if (!emergencyForm.incident.trim()) {
      alert("Enter the emergency incident.")
      return
    }

    const emergency: EmergencyCase = {
      id: makeId("EMG"),
      studentName: getStudentName(
        emergencyForm.studentId,
      ),
      ...emergencyForm,
      incident:
        emergencyForm.incident.trim(),
      actionTaken:
        emergencyForm.actionTaken.trim(),
      referredTo:
        emergencyForm.referredTo.trim(),
      notes:
        emergencyForm.notes.trim(),
    }

    setEmergencyCases((current) => [
      emergency,
      ...current,
    ])

    setShowEmergencyModal(false)

    setEmergencyForm({
      studentId: "",
      date: today(),
      time: "",
      incident: "",
      actionTaken: "",
      referredTo: "",
      status: "Open",
      notes: "",
    })
  }

  function savePatient() {
    if (!patientForm.studentId) {
      alert("Select a student.")
      return
    }

    const student = getStudent(
      patientForm.studentId,
    )

    if (!student) {
      alert("Student could not be found.")
      return
    }

    const existing = patients.find(
      (patient) =>
        patient.studentId ===
        patientForm.studentId,
    )

    const patient: Patient = {
      id: existing?.id || makeId("PAT"),
      studentId: patientForm.studentId,
      studentName: studentDisplayName(student),
      bloodGroup:
        patientForm.bloodGroup.trim(),
      allergies:
        patientForm.allergies.trim(),
      emergencyContact:
        patientForm.emergencyContact.trim(),
      emergencyPhone:
        patientForm.emergencyPhone.trim(),
      notes: patientForm.notes.trim(),
      updatedAt: new Date().toISOString(),
    }

    setPatients((current) => {
      if (existing) {
        return current.map((item) =>
          item.id === existing.id
            ? patient
            : item,
        )
      }

      return [patient, ...current]
    })

    setShowPatientModal(false)

    setPatientForm({
      studentId: "",
      bloodGroup: "",
      allergies: "",
      emergencyContact: "",
      emergencyPhone: "",
      notes: "",
    })
  }

  function saveStaff() {
    if (!staffForm.name.trim()) {
      alert("Enter the staff name.")
      return
    }

    const staffMember: ClinicStaff = {
      id: makeId("CST"),
      staffId:
        staffForm.staffId.trim() ||
        `CLINIC-${String(
          staff.length + 1,
        ).padStart(4, "0")}`,
      name: staffForm.name.trim(),
      role: staffForm.role.trim(),
      phone: staffForm.phone.trim(),
      status: staffForm.status,
    }

    setStaff((current) => [
      staffMember,
      ...current,
    ])

    setShowStaffModal(false)

    setStaffForm({
      staffId: "",
      name: "",
      role: "",
      phone: "",
      status: "Active",
    })
  }

  function saveInventoryItem() {
    if (!inventoryForm.name.trim()) {
      alert("Enter the item name.")
      return
    }

    const quantity =
      Number(inventoryForm.quantity) || 0

    const reorderLevel =
      Number(inventoryForm.reorderLevel) || 0

    let status: InventoryItem["status"] =
      inventoryForm.status

    if (
      inventoryForm.expiryDate &&
      inventoryForm.expiryDate < today()
    ) {
      status = "Expired"
    } else if (quantity <= 0) {
      status = "Out of Stock"
    } else if (quantity <= reorderLevel) {
      status = "Low Stock"
    } else {
      status = "Available"
    }

    const item: InventoryItem = {
      id: makeId("INV"),
      itemCode:
        inventoryForm.itemCode.trim() ||
        `MED-${String(
          inventory.length + 1,
        ).padStart(4, "0")}`,
      name: inventoryForm.name.trim(),
      category:
        inventoryForm.category.trim(),
      unit: inventoryForm.unit.trim(),
      quantity,
      reorderLevel,
      expiryDate:
        inventoryForm.expiryDate,
      status,
    }

    setInventory((current) => [
      item,
      ...current,
    ])

    setShowInventoryModal(false)

    setInventoryForm({
      itemCode: "",
      name: "",
      category: "",
      unit: "",
      quantity: "0",
      reorderLevel: "0",
      expiryDate: "",
      status: "Available",
    })
  }

  function updateVisitStatus(
    id: string,
    status: Visit["status"],
  ) {
    setVisits((current) =>
      current.map((visit) =>
        visit.id === id
          ? { ...visit, status }
          : visit,
      ),
    )
  }

  function updateAppointmentStatus(
    id: string,
    status: Appointment["status"],
  ) {
    setAppointments((current) =>
      current.map((appointment) =>
        appointment.id === id
          ? { ...appointment, status }
          : appointment,
      ),
    )
  }

  function updateReferralStatus(
    id: string,
    status: Referral["status"],
  ) {
    setReferrals((current) =>
      current.map((referral) =>
        referral.id === id
          ? { ...referral, status }
          : referral,
      ),
    )
  }

  function updateEmergencyStatus(
    id: string,
    status: EmergencyCase["status"],
  ) {
    setEmergencyCases((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status }
          : item,
      ),
    )
  }

  function updatePrescriptionStatus(
    id: string,
    status: Prescription["status"],
  ) {
    setPrescriptions((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status }
          : item,
      ),
    )
  }

  function signOut() {
    clearNexusSession()
    window.location.href = "/dashboard"
  }

  function openPatientForStudent(
    studentId: string,
  ) {
    const existing = patients.find(
      (patient) =>
        patient.studentId === studentId,
    )

    setPatientForm({
      studentId,
      bloodGroup:
        existing?.bloodGroup || "",
      allergies:
        existing?.allergies || "",
      emergencyContact:
        existing?.emergencyContact || "",
      emergencyPhone:
        existing?.emergencyPhone || "",
      notes: existing?.notes || "",
    })

    setShowPatientModal(true)
  }

  function exportVisits() {
    downloadCsv(
      "nexus-sis-clinic-visits.csv",
      visits.map((visit) => ({
        VisitID: visit.id,
        StudentID: visit.studentId,
        StudentName: visit.studentName,
        Date: visit.visitDate,
        Time: visit.visitTime,
        Complaint: visit.complaint,
        Diagnosis: visit.diagnosis,
        Treatment: visit.treatment,
        Medication:
          visit.prescribedMedication,
        AttendingStaff:
          visit.attendingStaff,
        Status: visit.status,
      })),
    )
  }

  function exportPatients() {
    downloadCsv(
      "nexus-sis-clinic-patients.csv",
      patients.map((patient) => ({
        StudentID: patient.studentId,
        StudentName: patient.studentName,
        BloodGroup: patient.bloodGroup,
        Allergies: patient.allergies,
        EmergencyContact:
          patient.emergencyContact,
        EmergencyPhone:
          patient.emergencyPhone,
        UpdatedAt: patient.updatedAt,
      })),
    )
  }

  function exportAppointments() {
    downloadCsv(
      "nexus-sis-clinic-appointments.csv",
      appointments.map((item) => ({
        AppointmentID: item.id,
        StudentID: item.studentId,
        StudentName: item.studentName,
        Date: item.appointmentDate,
        Time: item.appointmentTime,
        Reason: item.reason,
        Clinician: item.clinician,
        Status: item.status,
      })),
    )
  }

  function exportInventory() {
    downloadCsv(
      "nexus-sis-clinic-inventory.csv",
      inventory.map((item) => ({
        ItemCode: item.itemCode,
        Name: item.name,
        Category: item.category,
        Unit: item.unit,
        Quantity: item.quantity,
        ReorderLevel: item.reorderLevel,
        ExpiryDate: item.expiryDate,
        Status: item.status,
      })),
    )
  }

  const navItems: {
    key: Tab
    label: string
  }[] = [
    { key: "dashboard", label: "Dashboard" },
    { key: "patients", label: "Patients / Students" },
    { key: "visits", label: "Medical Visits" },
    { key: "appointments", label: "Appointments" },
    { key: "prescriptions", label: "Prescriptions" },
    { key: "referrals", label: "Referrals" },
    { key: "emergency", label: "Emergency" },
    { key: "staff", label: "Health Staff" },
    { key: "inventory", label: "Clinic Inventory" },
    { key: "clearance", label: "Health Clearance" },
    { key: "reports", label: "Reports" },
  ]

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-800 bg-[#071a33] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
              Nexus SIS
            </p>
            <h1 className="mt-1 text-2xl font-bold">
              University Clinic / Health
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              Central student health, clinic visits,
              appointments, referrals and medical services.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/admin/accommodation"
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Accommodation
            </a>

            <a
              href="/admin/student-affairs"
              className="rounded-lg border border-slate-500 px-4 py-2 text-sm font-semibold hover:bg-white/10"
            >
              Student Affairs
            </a>

            <button
              onClick={signOut}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === item.key
                  ? "bg-[#071a33] text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "dashboard" && (
          <section>
            <div className="mb-6">
              <h2 className="text-xl font-bold">
                Clinic Dashboard
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                University health services connected to the
                central Student ID.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Registered Students",
                  value: students.length,
                },
                {
                  label: "Clinic Patients",
                  value: activePatients,
                },
                {
                  label: "Open Visits",
                  value: openVisits,
                },
                {
                  label: "Today's Appointments",
                  value: todayAppointments,
                },
                {
                  label: "Active Prescriptions",
                  value: activePrescriptions,
                },
                {
                  label: "Pending Referrals",
                  value: pendingReferrals,
                },
                {
                  label: "Emergency Cases",
                  value: openEmergencyCases,
                },
                {
                  label: "Inventory Alerts",
                  value: lowStockItems,
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-sm font-medium text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {card.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold">
                      Quick Actions
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Common clinic operations.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    onClick={() => {
                      setTab("visits")
                      setShowVisitModal(true)
                    }}
                    className="rounded-lg bg-[#071a33] px-4 py-3 text-sm font-semibold text-white"
                  >
                    Record Medical Visit
                  </button>

                  <button
                    onClick={() => {
                      setTab("appointments")
                      setShowAppointmentModal(true)
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold"
                  >
                    New Appointment
                  </button>

                  <button
                    onClick={() => {
                      setTab("emergency")
                      setShowEmergencyModal(true)
                    }}
                    className="rounded-lg border border-red-300 px-4 py-3 text-sm font-semibold text-red-700"
                  >
                    Emergency Case
                  </button>

                  <button
                    onClick={() => {
                      setTab("patients")
                      setShowPatientModal(true)
                    }}
                    className="rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold"
                  >
                    Patient Record
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="font-bold">
                  Central Student Integration
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Clinic records use the Student ID from the
                  central registration record. The clinic does
                  not create a separate student registry.
                </p>

                <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm">
                  <div className="font-semibold">
                    Registration
                  </div>
                  <div className="my-2 text-slate-400">
                    ↓
                  </div>
                  <div className="font-semibold">
                    Central Student Record
                  </div>
                  <div className="my-2 text-slate-400">
                    ↓
                  </div>
                  <div className="font-semibold">
                    Student ID
                  </div>
                  <div className="my-2 text-slate-400">
                    ↓
                  </div>
                  <div className="font-semibold">
                    University Clinic / Health
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {tab === "patients" && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  Patients / Students
                </h2>
                <p className="text-sm text-slate-500">
                  Central registered students and their clinic
                  health profiles.
                </p>
              </div>

              <button
                onClick={() => setShowPatientModal(true)}
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                Add / Update Patient
              </button>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search Student ID, name, faculty..."
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm outline-none focus:border-slate-500"
              />

              <select
                value={studentFilter}
                onChange={(event) =>
                  setStudentFilter(event.target.value)
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
              >
                <option value="All">
                  All Students
                </option>
                {students.map((student) => (
                  <option
                    key={student.studentId}
                    value={student.studentId}
                  >
                    {student.studentId} —{" "}
                    {studentDisplayName(student)}
                  </option>
                ))}
              </select>

              <button
                onClick={exportPatients}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
              >
                Export Patients CSV
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">
                        Student ID
                      </th>
                      <th className="px-5 py-3">
                        Student
                      </th>
                      <th className="px-5 py-3">
                        Faculty / Department
                      </th>
                      <th className="px-5 py-3">
                        Blood Group
                      </th>
                      <th className="px-5 py-3">
                        Allergies
                      </th>
                      <th className="px-5 py-3">
                        Emergency Contact
                      </th>
                      <th className="px-5 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map(
                      (student) => {
                        const patient =
                          patients.find(
                            (item) =>
                              item.studentId ===
                              student.studentId,
                          )

                        return (
                          <tr
                            key={student.studentId}
                            className="hover:bg-slate-50"
                          >
                            <td className="px-5 py-4 font-semibold">
                              {student.studentId}
                            </td>

                            <td className="px-5 py-4">
                              <div className="font-semibold">
                                {studentDisplayName(
                                  student,
                                )}
                              </div>
                              <div className="text-xs text-slate-500">
                                {student.yearLevel ||
                                  "Year level not set"}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              <div>
                                {student.faculty ||
                                  "—"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {student.department ||
                                  "—"}
                              </div>
                            </td>

                            <td className="px-5 py-4">
                              {patient?.bloodGroup ||
                                "Not recorded"}
                            </td>

                            <td className="px-5 py-4">
                              {patient?.allergies ||
                                "None recorded"}
                            </td>

                            <td className="px-5 py-4">
                              {patient?.emergencyContact ||
                                "Not recorded"}
                            </td>

                            <td className="px-5 py-4">
                              <button
                                onClick={() =>
                                  openPatientForStudent(
                                    student.studentId,
                                  )
                                }
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold"
                              >
                                {patient
                                  ? "Update"
                                  : "Create Record"}
                              </button>
                            </td>
                          </tr>
                        )
                      },
                    )}

                    {!filteredStudents.length && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No registered students found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === "visits" && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  Medical Visits
                </h2>
                <p className="text-sm text-slate-500">
                  Record consultations, diagnoses,
                  treatments and clinic notes.
                </p>
              </div>

              <button
                onClick={() => setShowVisitModal(true)}
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                Record Visit
              </button>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search visits..."
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
              />

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm"
              >
                <option value="All">
                  All Statuses
                </option>
                <option value="Open">Open</option>
                <option value="Completed">
                  Completed
                </option>
                <option value="Referred">
                  Referred
                </option>
              </select>

              <button
                onClick={exportVisits}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
              >
                Export Visits CSV
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1200px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">
                        Student
                      </th>
                      <th className="px-5 py-3">
                        Date / Time
                      </th>
                      <th className="px-5 py-3">
                        Complaint
                      </th>
                      <th className="px-5 py-3">
                        Diagnosis
                      </th>
                      <th className="px-5 py-3">
                        Treatment
                      </th>
                      <th className="px-5 py-3">
                        Staff
                      </th>
                      <th className="px-5 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredVisits.map((visit) => (
                      <tr
                        key={visit.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {visit.studentName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {visit.studentId}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {visit.visitDate}
                          <div className="text-xs text-slate-500">
                            {visit.visitTime || "—"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {visit.complaint}
                        </td>

                        <td className="px-5 py-4">
                          {visit.diagnosis || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {visit.treatment || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {visit.attendingStaff ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={visit.status}
                            onChange={(event) =>
                              updateVisitStatus(
                                visit.id,
                                event.target
                                  .value as Visit["status"],
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                          >
                            <option value="Open">
                              Open
                            </option>
                            <option value="Completed">
                              Completed
                            </option>
                            <option value="Referred">
                              Referred
                            </option>
                          </select>
                        </td>
                      </tr>
                    ))}

                    {!filteredVisits.length && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No clinic visits recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === "appointments" && (
          <section>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  Appointments
                </h2>
                <p className="text-sm text-slate-500">
                  Schedule student clinic appointments.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowAppointmentModal(true)
                }
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                New Appointment
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">
                        Student
                      </th>
                      <th className="px-5 py-3">
                        Date
                      </th>
                      <th className="px-5 py-3">
                        Time
                      </th>
                      <th className="px-5 py-3">
                        Reason
                      </th>
                      <th className="px-5 py-3">
                        Clinician
                      </th>
                      <th className="px-5 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {appointments.map(
                      (appointment) => (
                        <tr
                          key={appointment.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold">
                              {appointment.studentName}
                            </div>
                            <div className="text-xs text-slate-500">
                              {appointment.studentId}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            {appointment.appointmentDate}
                          </td>

                          <td className="px-5 py-4">
                            {appointment.appointmentTime ||
                              "—"}
                          </td>

                          <td className="px-5 py-4">
                            {appointment.reason}
                          </td>

                          <td className="px-5 py-4">
                            {appointment.clinician ||
                              "—"}
                          </td>

                          <td className="px-5 py-4">
                            <select
                              value={
                                appointment.status
                              }
                              onChange={(event) =>
                                updateAppointmentStatus(
                                  appointment.id,
                                  event.target
                                    .value as Appointment["status"],
                                )
                              }
                              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
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
                            </select>
                          </td>
                        </tr>
                      ),
                    )}

                    {!appointments.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No appointments scheduled.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === "prescriptions" && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Prescriptions
                </h2>
                <p className="text-sm text-slate-500">
                  Record medications issued to students.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowPrescriptionModal(true)
                }
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                New Prescription
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">
                        Student
                      </th>
                      <th className="px-5 py-3">
                        Medication
                      </th>
                      <th className="px-5 py-3">
                        Dosage
                      </th>
                      <th className="px-5 py-3">
                        Frequency
                      </th>
                      <th className="px-5 py-3">
                        Duration
                      </th>
                      <th className="px-5 py-3">
                        Issued
                      </th>
                      <th className="px-5 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {prescriptions.map(
                      (prescription) => (
                        <tr
                          key={prescription.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4">
                            <div className="font-semibold">
                              {
                                prescription.studentName
                              }
                            </div>
                            <div className="text-xs text-slate-500">
                              {prescription.studentId}
                            </div>
                          </td>

                          <td className="px-5 py-4 font-semibold">
                            {prescription.medication}
                          </td>

                          <td className="px-5 py-4">
                            {prescription.dosage ||
                              "—"}
                          </td>

                          <td className="px-5 py-4">
                            {prescription.frequency ||
                              "—"}
                          </td>

                          <td className="px-5 py-4">
                            {prescription.duration ||
                              "—"}
                          </td>

                          <td className="px-5 py-4">
                            {prescription.issuedDate}
                          </td>

                          <td className="px-5 py-4">
                            <select
                              value={
                                prescription.status
                              }
                              onChange={(event) =>
                                updatePrescriptionStatus(
                                  prescription.id,
                                  event.target
                                    .value as Prescription["status"],
                                )
                              }
                              className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                            >
                              <option value="Active">
                                Active
                              </option>
                              <option value="Completed">
                                Completed
                              </option>
                              <option value="Cancelled">
                                Cancelled
                              </option>
                            </select>
                          </td>
                        </tr>
                      ),
                    )}

                    {!prescriptions.length && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No prescriptions recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === "referrals" && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Referrals
                </h2>
                <p className="text-sm text-slate-500">
                  Track external medical referrals and
                  outcomes.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowReferralModal(true)
                }
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                New Referral
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">
                        Student
                      </th>
                      <th className="px-5 py-3">
                        Date
                      </th>
                      <th className="px-5 py-3">
                        Facility
                      </th>
                      <th className="px-5 py-3">
                        Reason
                      </th>
                      <th className="px-5 py-3">
                        Referred By
                      </th>
                      <th className="px-5 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {referrals.map((referral) => (
                      <tr
                        key={referral.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {referral.studentName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {referral.studentId}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {referral.referralDate}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {referral.facility}
                        </td>

                        <td className="px-5 py-4">
                          {referral.reason || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {referral.referredBy || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={referral.status}
                            onChange={(event) =>
                              updateReferralStatus(
                                referral.id,
                                event.target
                                  .value as Referral["status"],
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                          >
                            <option value="Pending">
                              Pending
                            </option>
                            <option value="Referred">
                              Referred
                            </option>
                            <option value="Completed">
                              Completed
                            </option>
                          </select>
                        </td>
                      </tr>
                    ))}

                    {!referrals.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No referrals recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === "emergency" && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Emergency Cases
                </h2>
                <p className="text-sm text-slate-500">
                  Track urgent incidents and emergency
                  referrals.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowEmergencyModal(true)
                }
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Record Emergency
              </button>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">
                        Student
                      </th>
                      <th className="px-5 py-3">
                        Date / Time
                      </th>
                      <th className="px-5 py-3">
                        Incident
                      </th>
                      <th className="px-5 py-3">
                        Action Taken
                      </th>
                      <th className="px-5 py-3">
                        Referred To
                      </th>
                      <th className="px-5 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {emergencyCases.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {item.studentName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {item.studentId}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {item.date}
                          <div className="text-xs text-slate-500">
                            {item.time || "—"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {item.incident}
                        </td>

                        <td className="px-5 py-4">
                          {item.actionTaken || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {item.referredTo || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <select
                            value={item.status}
                            onChange={(event) =>
                              updateEmergencyStatus(
                                item.id,
                                event.target
                                  .value as EmergencyCase["status"],
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                          >
                            <option value="Open">
                              Open
                            </option>
                            <option value="Stabilized">
                              Stabilized
                            </option>
                            <option value="Referred">
                              Referred
                            </option>
                            <option value="Closed">
                              Closed
                            </option>
                          </select>
                        </td>
                      </tr>
                    ))}

                    {!emergencyCases.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No emergency cases recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === "staff" && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Health Staff
                </h2>
                <p className="text-sm text-slate-500">
                  Manage clinic nurses, doctors and health
                  personnel.
                </p>
              </div>

              <button
                onClick={() => setShowStaffModal(true)}
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                Add Health Staff
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {staff.map((member) => (
                <div
                  key={member.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">
                        {member.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {member.staffId}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        member.status === "Active"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {member.status}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <div>
                      <span className="font-semibold">
                        Role:
                      </span>{" "}
                      {member.role || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">
                        Phone:
                      </span>{" "}
                      {member.phone || "—"}
                    </div>
                  </div>
                </div>
              ))}

              {!staff.length && (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500 md:col-span-2 lg:col-span-3">
                  No clinic staff recorded.
                </div>
              )}
            </div>
          </section>
        )}

        {tab === "inventory" && (
          <section>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Clinic Inventory
                </h2>
                <p className="text-sm text-slate-500">
                  Track medicines, supplies, stock levels and
                  expiry dates.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportInventory}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
                >
                  Export CSV
                </button>

                <button
                  onClick={() =>
                    setShowInventoryModal(true)
                  }
                  className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
                >
                  Add Inventory Item
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">
                        Code
                      </th>
                      <th className="px-5 py-3">
                        Item
                      </th>
                      <th className="px-5 py-3">
                        Category
                      </th>
                      <th className="px-5 py-3">
                        Unit
                      </th>
                      <th className="px-5 py-3">
                        Quantity
                      </th>
                      <th className="px-5 py-3">
                        Reorder Level
                      </th>
                      <th className="px-5 py-3">
                        Expiry
                      </th>
                      <th className="px-5 py-3">
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {inventory.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {item.itemCode}
                        </td>

                        <td className="px-5 py-4">
                          {item.name}
                        </td>

                        <td className="px-5 py-4">
                          {item.category || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {item.unit || "—"}
                        </td>

                        <td className="px-5 py-4">
                          {item.quantity}
                        </td>

                        <td className="px-5 py-4">
                          {item.reorderLevel}
                        </td>

                        <td className="px-5 py-4">
                          {item.expiryDate || "—"}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              item.status ===
                              "Available"
                                ? "bg-emerald-100 text-emerald-700"
                                : item.status ===
                                    "Expired"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}

                    {!inventory.length && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No clinic inventory recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === "clearance" && (
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-bold">
                Health Clearance
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review student clinic records for health
                clearance processes.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">
                        Student ID
                      </th>
                      <th className="px-5 py-3">
                        Student
                      </th>
                      <th className="px-5 py-3">
                        Clinic Visits
                      </th>
                      <th className="px-5 py-3">
                        Open Cases
                      </th>
                      <th className="px-5 py-3">
                        Referrals
                      </th>
                      <th className="px-5 py-3">
                        Health Status
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {students.map((student) => {
                      const studentVisits =
                        visits.filter(
                          (visit) =>
                            visit.studentId ===
                            student.studentId,
                        )

                      const studentOpenVisits =
                        studentVisits.filter(
                          (visit) =>
                            visit.status === "Open",
                        )

                      const studentReferrals =
                        referrals.filter(
                          (referral) =>
                            referral.studentId ===
                            student.studentId &&
                            referral.status !==
                              "Completed",
                        )

                      const hasOpenEmergency =
                        emergencyCases.some(
                          (item) =>
                            item.studentId ===
                              student.studentId &&
                            item.status !==
                              "Closed",
                        )

                      const clear =
                        studentOpenVisits.length ===
                          0 &&
                        studentReferrals.length ===
                          0 &&
                        !hasOpenEmergency

                      return (
                        <tr
                          key={student.studentId}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-4 font-semibold">
                            {student.studentId}
                          </td>

                          <td className="px-5 py-4">
                            {studentDisplayName(
                              student,
                            )}
                          </td>

                          <td className="px-5 py-4">
                            {studentVisits.length}
                          </td>

                          <td className="px-5 py-4">
                            {studentOpenVisits.length}
                          </td>

                          <td className="px-5 py-4">
                            {studentReferrals.length}
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                clear
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {clear
                                ? "Clear"
                                : "Review Required"}
                            </span>
                          </td>
                        </tr>
                      )
                    })}

                    {!students.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-10 text-center text-slate-500"
                        >
                          No registered students available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {tab === "reports" && (
          <section>
            <div className="mb-5">
              <h2 className="text-xl font-bold">
                Clinic Reports
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Export operational clinic data.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Patient Register",
                  description:
                    "Registered clinic patient profiles.",
                  action: exportPatients,
                },
                {
                  title: "Medical Visits",
                  description:
                    "Consultations, diagnoses and treatments.",
                  action: exportVisits,
                },
                {
                  title: "Appointments",
                  description:
                    "Scheduled and completed appointments.",
                  action: exportAppointments,
                },
                {
                  title: "Clinic Inventory",
                  description:
                    "Medicines and health supply stock.",
                  action: exportInventory,
                },
                {
                  title: "Prescriptions",
                  description:
                    "Medication records issued to students.",
                  action: () =>
                    downloadCsv(
                      "nexus-sis-clinic-prescriptions.csv",
                      prescriptions.map(
                        (item) => ({
                          PrescriptionID:
                            item.id,
                          StudentID:
                            item.studentId,
                          StudentName:
                            item.studentName,
                          Medication:
                            item.medication,
                          Dosage:
                            item.dosage,
                          Frequency:
                            item.frequency,
                          Duration:
                            item.duration,
                          Status:
                            item.status,
                          IssuedDate:
                            item.issuedDate,
                        }),
                      ),
                    ),
                },
                {
                  title: "Referrals",
                  description:
                    "External medical referrals.",
                  action: () =>
                    downloadCsv(
                      "nexus-sis-clinic-referrals.csv",
                      referrals.map(
                        (item) => ({
                          ReferralID: item.id,
                          StudentID:
                            item.studentId,
                          StudentName:
                            item.studentName,
                          Date:
                            item.referralDate,
                          Facility:
                            item.facility,
                          Reason:
                            item.reason,
                          ReferredBy:
                            item.referredBy,
                          Status:
                            item.status,
                        }),
                      ),
                    ),
                },
              ].map((report) => (
                <div
                  key={report.title}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="font-bold">
                    {report.title}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500">
                    {report.description}
                  </p>

                  <button
                    onClick={report.action}
                    className="mt-5 rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Export CSV
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {showPatientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold">
                Patient Health Profile
              </h2>
              <p className="text-sm text-slate-500">
                Patient records remain linked to the central
                Student ID.
              </p>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Student
                <select
                  value={patientForm.studentId}
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      studentId:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                >
                  <option value="">
                    Select student
                  </option>
                  {students.map((student) => (
                    <option
                      key={student.studentId}
                      value={student.studentId}
                    >
                      {student.studentId} —{" "}
                      {studentDisplayName(student)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Blood Group
                <input
                  value={patientForm.bloodGroup}
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      bloodGroup:
                        event.target.value,
                    })
                  }
                  placeholder="e.g. O+"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Allergies
                <input
                  value={patientForm.allergies}
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      allergies:
                        event.target.value,
                    })
                  }
                  placeholder="None known"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Emergency Contact
                <input
                  value={
                    patientForm.emergencyContact
                  }
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      emergencyContact:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Emergency Phone
                <input
                  value={
                    patientForm.emergencyPhone
                  }
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      emergencyPhone:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Health Notes
                <textarea
                  value={patientForm.notes}
                  onChange={(event) =>
                    setPatientForm({
                      ...patientForm,
                      notes: event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() =>
                  setShowPatientModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={savePatient}
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Patient Record
              </button>
            </div>
          </div>
        </div>
      )}

      {showVisitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold">
                Record Medical Visit
              </h2>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Student
                <select
                  value={visitForm.studentId}
                  onChange={(event) =>
                    setVisitForm({
                      ...visitForm,
                      studentId:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                >
                  <option value="">
                    Select student
                  </option>
                  {students.map((student) => (
                    <option
                      key={student.studentId}
                      value={student.studentId}
                    >
                      {student.studentId} —{" "}
                      {studentDisplayName(student)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Visit Date
                <input
                  type="date"
                  value={visitForm.visitDate}
                  onChange={(event) =>
                    setVisitForm({
                      ...visitForm,
                      visitDate:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Visit Time
                <input
                  type="time"
                  value={visitForm.visitTime}
                  onChange={(event) =>
                    setVisitForm({
                      ...visitForm,
                      visitTime:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Attending Staff
                <select
                  value={visitForm.attendingStaff}
                  onChange={(event) =>
                    setVisitForm({
                      ...visitForm,
                      attendingStaff:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                >
                  <option value="">
                    Select staff
                  </option>
                  {staff
                    .filter(
                      (member) =>
                        member.status ===
                        "Active",
                    )
                    .map((member) => (
                      <option
                        key={member.id}
                        value={member.name}
                      >
                        {member.name} —{" "}
                        {member.role}
                      </option>
                    ))}
                </select>
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Presenting Complaint
                <textarea
                  value={visitForm.complaint}
                  onChange={(event) =>
                    setVisitForm({
                      ...visitForm,
                      complaint:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Diagnosis
                <textarea
                  value={visitForm.diagnosis}
                  onChange={(event) =>
                    setVisitForm({
                      ...visitForm,
                      diagnosis:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Treatment
                <textarea
                  value={visitForm.treatment}
                  onChange={(event) =>
                    setVisitForm({
                      ...visitForm,
                      treatment:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Prescribed Medication
                <input
                  value={
                    visitForm.prescribedMedication
                  }
                  onChange={(event) =>
                    setVisitForm({
                      ...visitForm,
                      prescribedMedication:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Status
                <select
                  value={visitForm.status}
                  onChange={(event) =>
                    setVisitForm({
                      ...visitForm,
                      status:
                        event.target
                          .value as Visit["status"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                >
                  <option value="Open">
                    Open
                  </option>
                  <option value="Completed">
                    Completed
                  </option>
                  <option value="Referred">
                    Referred
                  </option>
                </select>
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Notes
                <textarea
                  value={visitForm.notes}
                  onChange={(event) =>
                    setVisitForm({
                      ...visitForm,
                      notes: event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() =>
                  setShowVisitModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveVisit}
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Visit
              </button>
            </div>
          </div>
        </div>
      )}

      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold">
                New Clinic Appointment
              </h2>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Student
                <select
                  value={appointmentForm.studentId}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      studentId:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                >
                  <option value="">
                    Select student
                  </option>
                  {students.map((student) => (
                    <option
                      key={student.studentId}
                      value={student.studentId}
                    >
                      {student.studentId} —{" "}
                      {studentDisplayName(student)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Date
                <input
                  type="date"
                  value={
                    appointmentForm.appointmentDate
                  }
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      appointmentDate:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Time
                <input
                  type="time"
                  value={
                    appointmentForm.appointmentTime
                  }
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      appointmentTime:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Clinician
                <select
                  value={
                    appointmentForm.clinician
                  }
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      clinician:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                >
                  <option value="">
                    Select clinician
                  </option>
                  {staff
                    .filter(
                      (member) =>
                        member.status ===
                        "Active",
                    )
                    .map((member) => (
                      <option
                        key={member.id}
                        value={member.name}
                      >
                        {member.name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Reason
                <textarea
                  value={appointmentForm.reason}
                  onChange={(event) =>
                    setAppointmentForm({
                      ...appointmentForm,
                      reason:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Notes
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
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() =>
                  setShowAppointmentModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveAppointment}
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrescriptionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold">
                New Prescription
              </h2>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Student
                <select
                  value={
                    prescriptionForm.studentId
                  }
                  onChange={(event) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      studentId:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                >
                  <option value="">
                    Select student
                  </option>
                  {students.map((student) => (
                    <option
                      key={student.studentId}
                      value={student.studentId}
                    >
                      {student.studentId} —{" "}
                      {studentDisplayName(student)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Visit
                <select
                  value={prescriptionForm.visitId}
                  onChange={(event) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      visitId:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                >
                  <option value="">
                    No linked visit
                  </option>
                  {visits
                    .filter(
                      (visit) =>
                        !prescriptionForm.studentId ||
                        visit.studentId ===
                          prescriptionForm.studentId,
                    )
                    .map((visit) => (
                      <option
                        key={visit.id}
                        value={visit.id}
                      >
                        {visit.visitDate} —{" "}
                        {visit.complaint}
                      </option>
                    ))}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Medication
                <input
                  value={
                    prescriptionForm.medication
                  }
                  onChange={(event) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      medication:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Dosage
                <input
                  value={
                    prescriptionForm.dosage
                  }
                  onChange={(event) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      dosage:
                        event.target.value,
                    })
                  }
                  placeholder="e.g. 500 mg"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Frequency
                <input
                  value={
                    prescriptionForm.frequency
                  }
                  onChange={(event) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      frequency:
                        event.target.value,
                    })
                  }
                  placeholder="e.g. Twice daily"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Duration
                <input
                  value={
                    prescriptionForm.duration
                  }
                  onChange={(event) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      duration:
                        event.target.value,
                    })
                  }
                  placeholder="e.g. 5 days"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Instructions
                <textarea
                  value={
                    prescriptionForm.instructions
                  }
                  onChange={(event) =>
                    setPrescriptionForm({
                      ...prescriptionForm,
                      instructions:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() =>
                  setShowPrescriptionModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={savePrescription}
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Prescription
              </button>
            </div>
          </div>
        </div>
      )}

      {showReferralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold">
                New Medical Referral
              </h2>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Student
                <select
                  value={referralForm.studentId}
                  onChange={(event) =>
                    setReferralForm({
                      ...referralForm,
                      studentId:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                >
                  <option value="">
                    Select student
                  </option>
                  {students.map((student) => (
                    <option
                      key={student.studentId}
                      value={student.studentId}
                    >
                      {student.studentId} —{" "}
                      {studentDisplayName(student)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Referral Date
                <input
                  type="date"
                  value={referralForm.referralDate}
                  onChange={(event) =>
                    setReferralForm({
                      ...referralForm,
                      referralDate:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Facility
                <input
                  value={referralForm.facility}
                  onChange={(event) =>
                    setReferralForm({
                      ...referralForm,
                      facility:
                        event.target.value,
                    })
                  }
                  placeholder="Hospital / clinic"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Referred By
                <input
                  value={referralForm.referredBy}
                  onChange={(event) =>
                    setReferralForm({
                      ...referralForm,
                      referredBy:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Reason
                <textarea
                  value={referralForm.reason}
                  onChange={(event) =>
                    setReferralForm({
                      ...referralForm,
                      reason:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Notes
                <textarea
                  value={referralForm.notes}
                  onChange={(event) =>
                    setReferralForm({
                      ...referralForm,
                      notes:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() =>
                  setShowReferralModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveReferral}
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Referral
              </button>
            </div>
          </div>
        </div>
      )}

      {showEmergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold">
                Record Emergency Case
              </h2>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Student
                <select
                  value={emergencyForm.studentId}
                  onChange={(event) =>
                    setEmergencyForm({
                      ...emergencyForm,
                      studentId:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                >
                  <option value="">
                    Select student
                  </option>
                  {students.map((student) => (
                    <option
                      key={student.studentId}
                      value={student.studentId}
                    >
                      {student.studentId} —{" "}
                      {studentDisplayName(student)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold">
                Date
                <input
                  type="date"
                  value={emergencyForm.date}
                  onChange={(event) =>
                    setEmergencyForm({
                      ...emergencyForm,
                      date: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Time
                <input
                  type="time"
                  value={emergencyForm.time}
                  onChange={(event) =>
                    setEmergencyForm({
                      ...emergencyForm,
                      time: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Referred To
                <input
                  value={emergencyForm.referredTo}
                  onChange={(event) =>
                    setEmergencyForm({
                      ...emergencyForm,
                      referredTo:
                        event.target.value,
                    })
                  }
                  placeholder="Hospital / ambulance / other"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Incident
                <textarea
                  value={emergencyForm.incident}
                  onChange={(event) =>
                    setEmergencyForm({
                      ...emergencyForm,
                      incident:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Action Taken
                <textarea
                  value={emergencyForm.actionTaken}
                  onChange={(event) =>
                    setEmergencyForm({
                      ...emergencyForm,
                      actionTaken:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Notes
                <textarea
                  value={emergencyForm.notes}
                  onChange={(event) =>
                    setEmergencyForm({
                      ...emergencyForm,
                      notes: event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() =>
                  setShowEmergencyModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveEmergencyCase}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Emergency Case
              </button>
            </div>
          </div>
        </div>
      )}

      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold">
                Add Health Staff
              </h2>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Staff ID
                <input
                  value={staffForm.staffId}
                  onChange={(event) =>
                    setStaffForm({
                      ...staffForm,
                      staffId:
                        event.target.value,
                    })
                  }
                  placeholder="Auto-generated if blank"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Name
                <input
                  value={staffForm.name}
                  onChange={(event) =>
                    setStaffForm({
                      ...staffForm,
                      name: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Role
                <input
                  value={staffForm.role}
                  onChange={(event) =>
                    setStaffForm({
                      ...staffForm,
                      role: event.target.value,
                    })
                  }
                  placeholder="Doctor / Nurse / Health Officer"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Phone
                <input
                  value={staffForm.phone}
                  onChange={(event) =>
                    setStaffForm({
                      ...staffForm,
                      phone: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() =>
                  setShowStaffModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveStaff}
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Staff
              </button>
            </div>
          </div>
        </div>
      )}

      {showInventoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="text-lg font-bold">
                Add Clinic Inventory Item
              </h2>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <label className="text-sm font-semibold">
                Item Code
                <input
                  value={
                    inventoryForm.itemCode
                  }
                  onChange={(event) =>
                    setInventoryForm({
                      ...inventoryForm,
                      itemCode:
                        event.target.value,
                    })
                  }
                  placeholder="Auto-generated if blank"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Item Name
                <input
                  value={inventoryForm.name}
                  onChange={(event) =>
                    setInventoryForm({
                      ...inventoryForm,
                      name: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Category
                <input
                  value={
                    inventoryForm.category
                  }
                  onChange={(event) =>
                    setInventoryForm({
                      ...inventoryForm,
                      category:
                        event.target.value,
                    })
                  }
                  placeholder="Medicine / Equipment / Supply"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Unit
                <input
                  value={inventoryForm.unit}
                  onChange={(event) =>
                    setInventoryForm({
                      ...inventoryForm,
                      unit: event.target.value,
                    })
                  }
                  placeholder="Boxes / tablets / bottles"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Quantity
                <input
                  type="number"
                  min="0"
                  value={
                    inventoryForm.quantity
                  }
                  onChange={(event) =>
                    setInventoryForm({
                      ...inventoryForm,
                      quantity:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold">
                Reorder Level
                <input
                  type="number"
                  min="0"
                  value={
                    inventoryForm.reorderLevel
                  }
                  onChange={(event) =>
                    setInventoryForm({
                      ...inventoryForm,
                      reorderLevel:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>

              <label className="text-sm font-semibold md:col-span-2">
                Expiry Date
                <input
                  type="date"
                  value={
                    inventoryForm.expiryDate
                  }
                  onChange={(event) =>
                    setInventoryForm({
                      ...inventoryForm,
                      expiryDate:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                />
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={() =>
                  setShowInventoryModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveInventoryItem}
                className="rounded-lg bg-[#071a33] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Inventory Item
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
