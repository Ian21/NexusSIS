"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { protectNexusPage } from "@/lib/nexus-access"

type UserAccount = {
  id: string
  username: string
  fullName: string
  accountType: "Student" | "Staff" | "Administrator"
  linkedId: string
  email: string
  role: string
  status: "Active" | "Suspended" | "Locked"
  lastLogin: string
  createdDate: string
  password?: string
  credentialStatus?: "Temporary" | "Active"
}

type StoredCredential = {
  username: string
  passwordHash: string
  createdAt: string
  updatedAt: string
}

type Role = {
  id: string
  name: string
  description: string
  permissions: string[]
  status: "Active" | "Inactive"
}

type IdCard = {
  id: string
  cardNumber: string
  holderId: string
  holderName: string
  holderType: "Student" | "Staff"
  issueDate: string
  expiryDate: string
  status: "Active" | "Expired" | "Lost" | "Cancelled"
  photo?: string
  faculty?: string
  department?: string
  programme?: string
  yearLevel?: string
  phone?: string
  email?: string
  province?: string
  district?: string
  printStatus?: "Pending ICT Printing" | "Printed"
}

type Backup = {
  id: string
  name: string
  type: "Full" | "Data" | "Configuration"
  date: string
  size: string
  status: "Completed" | "Failed" | "In Progress"
  createdBy: string
}

type AuditLog = {
  id: string
  date: string
  username: string
  action: string
  module: string
  recordId: string
  details: string
  severity: "Info" | "Warning" | "Critical"
}

type SecurityEvent = {
  id: string
  date: string
  username: string
  event: string
  ipAddress: string
  status: "Successful" | "Failed" | "Blocked"
  severity: "Low" | "Medium" | "High" | "Critical"
}

type Tab =
  | "Dashboard"
  | "Users"
  | "Roles"
  | "ID Cards"
  | "Backups"
  | "Audit Logs"
  | "Configuration"
  | "Security"

const STORAGE = {
  users: "nexusSIS_ict_users",
  credentials: "nexusSIS_ict_credentials",
  roles: "nexusSIS_ict_roles",
  cards: "nexusSIS_ict_id_cards",
  backups: "nexusSIS_ict_backups",
  audit: "nexusSIS_ict_audit_logs",
  security: "nexusSIS_ict_security_events",
  config: "nexusSIS_system_configuration",
  students: "nexusSIS_registered_students",
  staff: "nexusSIS_administration_staff",
  lecturers: "nexusSIS_lecturers",
}

async function hashPassword(password: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    data,
  )

  return Array.from(
    new Uint8Array(hashBuffer),
  )
    .map((byte) =>
      byte.toString(16).padStart(2, "0"),
    )
    .join("")
}

const defaultRoles: Role[] = [
  {
    id: "ROLE-001",
    name: "Super Administrator",
    description: "Full university system administration access.",
    permissions: [
      "All Modules",
      "User Management",
      "System Configuration",
      "Audit Logs",
      "Backups",
    ],
    status: "Active",
  },
  {
    id: "ROLE-002",
    name: "Registrar",
    description: "Academic records and registration administration.",
    permissions: [
      "Registration",
      "Students",
      "Courses",
      "Examinations",
      "Graduation",
    ],
    status: "Active",
  },
  {
    id: "ROLE-003",
    name: "Finance Officer",
    description: "Student fees, payments and finance records.",
    permissions: [
      "Bursary",
      "Student Fees",
      "Payments",
      "Financial Reports",
    ],
    status: "Active",
  },
  {
    id: "ROLE-004",
    name: "Lecturer",
    description: "Teaching, LMS and academic functions.",
    permissions: [
      "Courses",
      "LMS",
      "Assignments",
      "Grades",
    ],
    status: "Active",
  },
  {
    id: "ROLE-005",
    name: "Student",
    description: "Student self-service access.",
    permissions: [
      "Student Portal",
      "LMS",
      "Fees",
      "Library",
    ],
    status: "Active",
  },
]

const defaultConfig = {
  universityName: "Nexus University",
  universityCode: "NXS",
  institutionLogo: "",
  academicYear: "2026",
  currentSemester: "Semester 1",

  // Institution-controlled numbering.
  // These are the NEXT numbers to be issued.
  // Existing IDs are never renumbered.
  nextStudentId: "",
  nextStaffId: "",
  nextLecturerId: "",

  registrationOpen: true,
  maintenanceMode: false,
  allowStudentPortal: true,
  allowStaffPortal: true,
  sessionTimeout: 30,
  passwordExpiryDays: 90,
  maxLoginAttempts: 5,
  backupFrequency: "Daily",
  systemEmail: "ict@university.edu.pg",
}

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
    // Ignore localStorage failures.
  }
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function now() {
  return new Date().toISOString()
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

function normalizeLinkedId(value: string) {
  return value.trim().toUpperCase()
}

function normalizeRoleName(value: string) {
  return value.trim().toLowerCase()
}

function makeTemporaryPassword() {
  const randomPart = Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()

  return `NXS-${randomPart}-${Math.floor(
    1000 + Math.random() * 9000,
  )}`
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "Active" ||
    status === "Completed" ||
    status === "Successful" ||
    status === "Info"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Warning" ||
          status === "Medium" ||
          status === "In Progress" ||
          status === "Expired"
        ? "bg-amber-100 text-amber-700"
        : status === "Critical" ||
            status === "Blocked" ||
            status === "Failed" ||
            status === "Locked" ||
            status === "Cancelled"
          ? "bg-red-100 text-red-700"
          : "bg-blue-100 text-blue-700"

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {status}
    </span>
  )
}

function downloadCsv(
  filename: string,
  rows: Record<string, unknown>[],
) {
  if (!rows.length) {
    alert("There is no data to export.")
    return
  }

  const headers = Object.keys(rows[0])

  const escapeValue = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`

  const csv = [
    headers.map(escapeValue).join(","),
    ...rows.map((row) =>
      headers
        .map((header) => escapeValue(row[header]))
        .join(","),
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

export default function ICTControlCentrePage() {
  const [tab, setTab] = useState<Tab>("Dashboard")

  const [users, setUsers] = useState<UserAccount[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [cards, setCards] = useState<IdCard[]>([])
  const [backups, setBackups] = useState<Backup[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [securityEvents, setSecurityEvents] = useState<
    SecurityEvent[]
  >([])

  const [students, setStudents] = useState<unknown[]>([])
  const [staff, setStaff] = useState<unknown[]>([])
  const [lecturers, setLecturers] = useState<unknown[]>([])

  const [config, setConfig] = useState(defaultConfig)

  const [search, setSearch] = useState("")

  const [showUserModal, setShowUserModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showCardModal, setShowCardModal] = useState(false)
  const [showBackupModal, setShowBackupModal] = useState(false)

  const [editingUser, setEditingUser] =
    useState<UserAccount | null>(null)

  const [editingRole, setEditingRole] =
    useState<Role | null>(null)

  const [userForm, setUserForm] = useState<UserAccount>({
    id: "",
    username: "",
    fullName: "",
    accountType: "Staff",
    linkedId: "",
    email: "",
    role: "Staff",
    status: "Active",
    lastLogin: "Never",
    createdDate: today(),
    password: "",
    credentialStatus: "Temporary",
  })

  const [roleForm, setRoleForm] = useState<Role>({
    id: "",
    name: "",
    description: "",
    permissions: [],
    status: "Active",
  })

  const [cardForm, setCardForm] = useState({
    holderKey: "",
    holderId: "",
    holderName: "",
    holderType: "Student" as IdCard["holderType"],
    expiryDate: "",
    photo: "",
    faculty: "",
    department: "",
    programme: "",
    yearLevel: "",
    phone: "",
    email: "",
    province: "",
    district: "",
  })

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraStreamRef = useRef<MediaStream | null>(null)

  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState("")

  const [backupForm, setBackupForm] = useState({
    name: "",
    type: "Full" as Backup["type"],
  })

  useEffect(() => {
    protectNexusPage([
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    setUsers(
      readStorage<UserAccount[]>(
        STORAGE.users,
        [],
      ),
    )

    setRoles(
      readStorage<Role[]>(
        STORAGE.roles,
        defaultRoles,
      ),
    )

    setCards(
      readStorage<IdCard[]>(
        STORAGE.cards,
        [],
      ),
    )

    // ID cards are NOT automatically created during registration.
    // Registration creates the central student record only.
    // ICT creates/updates the ID card after selecting the person,
    // capturing the required face photo and issuing the card.

    setBackups(
      readStorage<Backup[]>(
        STORAGE.backups,
        [],
      ),
    )

    setAuditLogs(
      readStorage<AuditLog[]>(
        STORAGE.audit,
        [],
      ),
    )

    setSecurityEvents(
      readStorage<SecurityEvent[]>(
        STORAGE.security,
        [],
      ),
    )

    const savedConfiguration = readStorage<
      Partial<typeof defaultConfig>
    >(
      STORAGE.config,
      {},
    )

    setConfig({
      ...defaultConfig,
      ...savedConfiguration,
    })

    setStudents(
      readStorage<unknown[]>(
        STORAGE.students,
        [],
      ),
    )

    setStaff(
      readStorage<unknown[]>(
        STORAGE.staff,
        [],
      ),
    )

    setLecturers(
      readStorage<unknown[]>(
        STORAGE.lecturers,
        [],
      ),
    )
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const syncCredentials = async () => {
      const existingCredentials =
        readStorage<StoredCredential[]>(
          STORAGE.credentials,
          [],
        )

      const credentialMap = new Map(
        existingCredentials.map((credential) => [
          normalizeUsername(credential.username),
          credential,
        ]),
      )

      const sanitizedUsers = []

      for (const user of users) {
        const password = user.password?.trim()

        if (password) {
          const username = normalizeUsername(
            user.username,
          )

          const passwordHash =
            await hashPassword(password)

          const existingCredential =
            credentialMap.get(username)

          credentialMap.set(username, {
            username,
            passwordHash,
            createdAt:
              existingCredential?.createdAt ||
              now(),
            updatedAt: now(),
          })
        }

        const {
          password: _password,
          ...safeUser
        } = user

        sanitizedUsers.push(safeUser)
      }

      writeStorage(
        STORAGE.users,
        sanitizedUsers,
      )

      writeStorage(
        STORAGE.credentials,
        Array.from(
          credentialMap.values(),
        ),
      )
    }

    void syncCredentials()
  }, [users])

  useEffect(() => {
    if (typeof window === "undefined") return

    const existingUsers =
      readStorage<UserAccount[]>(
        STORAGE.users,
        [],
      )

    const registeredStudents =
      readStorage<Record<string, unknown>[]>(
        STORAGE.students,
        [],
      )

    const administrationStaff =
      readStorage<Record<string, unknown>[]>(
        STORAGE.staff,
        [],
      )

    const lecturersList =
      readStorage<Record<string, unknown>[]>(
        STORAGE.lecturers,
        [],
      )

    const nextUsers = [...existingUsers]

    function syncPerson(
      person: Record<string, unknown>,
      accountType: UserAccount["accountType"],
      role: string,
    ) {
      const linkedId = String(
        person.studentId ||
          person.staffId ||
          person.id ||
          "",
      ).trim()

      if (!linkedId) return

      const fullName = String(
        person.fullName ||
          person.name ||
          [
            person.firstName,
            person.middleName,
            person.lastName,
          ]
            .filter(Boolean)
            .join(" ") ||
          linkedId,
      ).trim()

      const email = String(
        person.email || "",
      ).trim()

      const existingIndex =
        nextUsers.findIndex(
          (user) =>
            user.linkedId === linkedId,
        )

      if (existingIndex >= 0) {
        const existing =
          nextUsers[existingIndex]

        nextUsers[existingIndex] = {
          ...existing,
          fullName:
            existing.fullName ||
            fullName,
          email:
            existing.email ||
            email,
          accountType,
          role:
            existing.role ||
            role,
          credentialStatus:
            existing.credentialStatus ||
            "Temporary",
        }

        return
      }

      nextUsers.push({
        id: makeId("USER"),
        username: linkedId,
        fullName,
        accountType,
        linkedId,
        email,
        role,
        status: "Active",
        lastLogin: "Never",
        createdDate: today(),
        credentialStatus: "Temporary",
      })
    }

    registeredStudents.forEach(
      (student) =>
        syncPerson(
          student,
          "Student",
          "Student",
        ),
    )

    administrationStaff.forEach(
      (member) =>
        syncPerson(
          member,
          "Staff",
          "Staff",
        ),
    )

    lecturersList.forEach(
      (lecturer) =>
        syncPerson(
          lecturer,
          "Staff",
          "Lecturer",
        ),
    )

    if (
      JSON.stringify(nextUsers) !==
      JSON.stringify(existingUsers)
    ) {
      setUsers(nextUsers)

      writeStorage(
        STORAGE.users,
        nextUsers,
      )
    }
  }, [])

  useEffect(() => {
    writeStorage(STORAGE.roles, roles)
  }, [roles])

  useEffect(() => {
    writeStorage(STORAGE.cards, cards)
  }, [cards])

  useEffect(() => {
    writeStorage(STORAGE.backups, backups)
  }, [backups])

  useEffect(() => {
    writeStorage(STORAGE.audit, auditLogs)
  }, [auditLogs])

  useEffect(() => {
    writeStorage(
      STORAGE.security,
      securityEvents,
    )
  }, [securityEvents])

  useEffect(() => {
    writeStorage(STORAGE.config, config)
  }, [config])

  function addAudit(
    action: string,
    module: string,
    recordId: string,
    details: string,
    severity: AuditLog["severity"] = "Info",
  ) {
    const entry: AuditLog = {
      id: makeId("AUDIT"),
      date: now(),
      username:
        localStorage.getItem("nexus_username") ||
        "ICT Administrator",
      action,
      module,
      recordId,
      details,
      severity,
    }

    setAuditLogs((current) => [
      entry,
      ...current,
    ])
  }

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return users

    return users.filter(
      (user) =>
        user.username.toLowerCase().includes(query) ||
        user.fullName.toLowerCase().includes(query) ||
        user.linkedId.toLowerCase().includes(query) ||
        user.role.toLowerCase().includes(query),
    )
  }, [users, search])

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return auditLogs

    return auditLogs.filter(
      (log) =>
        log.username.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.module.toLowerCase().includes(query) ||
        log.details.toLowerCase().includes(query),
    )
  }, [auditLogs, search])

  const activeUsers = users.filter(
    (user) => user.status === "Active",
  ).length

  const suspendedUsers = users.filter(
    (user) => user.status === "Suspended",
  ).length

  const lockedUsers = users.filter(
    (user) => user.status === "Locked",
  ).length

  const activeCards = cards.filter(
    (card) => card.status === "Active",
  ).length

  const criticalSecurityEvents =
    securityEvents.filter(
      (event) =>
        event.severity === "Critical" ||
        event.status === "Blocked",
    ).length

  function openNewUser() {
    setEditingUser(null)

    setUserForm({
      id: "",
      username: "",
      fullName: "",
      accountType: "Staff",
      linkedId: "",
      email: "",
      role: "Staff",
      status: "Active",
      lastLogin: "Never",
      createdDate: today(),
      password: "",
      credentialStatus: "Temporary",
    })

    setShowUserModal(true)
  }

  function editUser(user: UserAccount) {
    setEditingUser(user)

    setUserForm({
      ...user,
      username: normalizeUsername(user.username),
      linkedId: normalizeLinkedId(user.linkedId),
    })

    setShowUserModal(true)
  }



  function saveUser() {
    const username = normalizeUsername(userForm.username)
    const fullName = userForm.fullName.trim()
    const linkedId = normalizeLinkedId(userForm.linkedId)

    if (!username || !fullName) {
      alert("Username and full name are required.")
      return
    }

    if (username.length < 3) {
      alert("Username must contain at least 3 characters.")
      return
    }

    const duplicateUsername = users.some(
      (item) =>
        item.id !== editingUser?.id &&
        normalizeUsername(item.username) === username,
    )

    if (duplicateUsername) {
      alert(`Username "${username}" is already in use.`)
      return
    }

    if (linkedId) {
      const duplicateLinkedId = users.some(
        (item) =>
          item.id !== editingUser?.id &&
          normalizeLinkedId(item.linkedId) === linkedId,
      )

      if (duplicateLinkedId) {
        alert(
          `Linked ID "${linkedId}" is already assigned to another account.`,
        )
        return
      }
    }

    if (editingUser) {
      setUsers((current) =>
        current.map((item) =>
          item.id === editingUser.id
            ? {
                ...userForm,
                id: editingUser.id,
                username,
                fullName,
                linkedId,
                credentialStatus:
                  editingUser.credentialStatus ||
                  "Active",
              }
            : item,
        ),
      )

      addAudit(
        "Update User",
        "ICT User Management",
        editingUser.id,
        `Updated account ${username}.`,
      )
    } else {
      const user: UserAccount = {
        ...userForm,
        id: makeId("USER"),
        username,
        fullName,
        linkedId,
        createdDate: today(),
        credentialStatus: "Temporary",
      }

      setUsers((current) => [
        ...current,
        user,
      ])

      addAudit(
        "Create User",
        "ICT User Management",
        user.id,
        `Created account ${username}.`,
      )
    }

    setShowUserModal(false)
  }



  function updateUserStatus(
    user: UserAccount,
    status: UserAccount["status"],
  ) {
    const currentUsername =
      localStorage.getItem("nexus_username") || ""

    if (
      currentUsername &&
      normalizeUsername(user.username) ===
        normalizeUsername(currentUsername) &&
      status !== "Active"
    ) {
      alert(
        "You cannot suspend or lock the account currently being used.",
      )
      return
    }

    if (
      normalizeRoleName(user.role) ===
        normalizeRoleName("Super Administrator") &&
      status !== "Active"
    ) {
      const activeSuperAdmins = users.filter(
        (item) =>
          normalizeRoleName(item.role) ===
            normalizeRoleName("Super Administrator") &&
          item.status === "Active",
      ).length

      if (
        user.status === "Active" &&
        activeSuperAdmins <= 1
      ) {
        alert(
          "The last active Super Administrator cannot be suspended or locked.",
        )
        return
      }
    }

    setUsers((current) =>
      current.map((item) =>
        item.id === user.id
          ? {
              ...item,
              status,
            }
          : item,
      ),
    )

    addAudit(
      "Change User Status",
      "ICT User Management",
      user.id,
      `${user.username} changed to ${status}.`,
      status === "Locked" || status === "Suspended"
        ? "Warning"
        : "Info",
    )
  }



  function deleteUser(user: UserAccount) {
    const currentUsername =
      localStorage.getItem("nexus_username") || ""

    if (
      currentUsername &&
      normalizeUsername(user.username) ===
        normalizeUsername(currentUsername)
    ) {
      alert(
        "You cannot delete the account currently being used.",
      )
      return
    }

    if (
      normalizeRoleName(user.role) ===
      normalizeRoleName("Super Administrator")
    ) {
      const activeSuperAdmins = users.filter(
        (item) =>
          normalizeRoleName(item.role) ===
            normalizeRoleName("Super Administrator") &&
          item.status === "Active",
      ).length

      if (
        user.status === "Active" &&
        activeSuperAdmins <= 1
      ) {
        alert(
          "The last active Super Administrator cannot be deleted.",
        )
        return
      }
    }

    if (
      !confirm(
        `Delete account ${user.username}? This action cannot be undone.`,
      )
    ) {
      return
    }

    setUsers((current) =>
      current.filter(
        (item) => item.id !== user.id,
      ),
    )

    addAudit(
      "Delete User",
      "ICT User Management",
      user.id,
      `Deleted account ${user.username}.`,
      "Warning",
    )
  }



  function openNewRole() {
    setEditingRole(null)

    setRoleForm({
      id: "",
      name: "",
      description: "",
      permissions: [],
      status: "Active",
    })

    setShowRoleModal(true)
  }

  function editRole(role: Role) {
    setEditingRole(role)
    setRoleForm(role)
    setShowRoleModal(true)
  }

  function saveRole() {
    const roleName = roleForm.name.trim()

    if (!roleName) {
      alert("Role name is required.")
      return
    }

    if (roleName.length < 3) {
      alert("Role name must contain at least 3 characters.")
      return
    }

    const duplicateRole = roles.some(
      (item) =>
        item.id !== editingRole?.id &&
        normalizeRoleName(item.name) ===
          normalizeRoleName(roleName),
    )

    if (duplicateRole) {
      alert(`Role "${roleName}" already exists.`)
      return
    }

    if (editingRole) {
      const assignedUsers = users.filter(
        (user) =>
          normalizeRoleName(user.role) ===
          normalizeRoleName(editingRole.name),
      )

      if (
        editingRole.status === "Active" &&
        roleForm.status === "Inactive" &&
        assignedUsers.length > 0
      ) {
        const shouldContinue = confirm(
          `${assignedUsers.length} user account(s) currently use this role. Deactivating it may affect those accounts. Continue?`,
        )

        if (!shouldContinue) {
          return
        }
      }

      setRoles((current) =>
        current.map((item) =>
          item.id === editingRole.id
            ? {
                ...roleForm,
                id: editingRole.id,
                name: roleName,
              }
            : item,
        ),
      )

      addAudit(
        "Update Role",
        "Roles & Permissions",
        editingRole.id,
        `Updated role ${roleName}.`,
      )
    } else {
      const role: Role = {
        ...roleForm,
        id: makeId("ROLE"),
        name: roleName,
      }

      setRoles((current) => [
        ...current,
        role,
      ])

      addAudit(
        "Create Role",
        "Roles & Permissions",
        role.id,
        `Created role ${roleName}.`,
      )
    }

    setShowRoleModal(false)
  }



  function togglePermission(permission: string) {
    setRoleForm((current) => ({
      ...current,
      permissions: current.permissions.includes(
        permission,
      )
        ? current.permissions.filter(
            (item) => item !== permission,
          )
        : [
            ...current.permissions,
            permission,
          ],
    }))
  }

  function toggleRole(role: Role) {
    const nextStatus: Role["status"] =
      role.status === "Active"
        ? "Inactive"
        : "Active"

    setRoles((current) =>
      current.map((item) =>
        item.id === role.id
          ? {
              ...item,
              status: nextStatus,
            }
          : item,
      ),
    )

    addAudit(
      "Change Role Status",
      "Roles & Permissions",
      role.id,
      `${role.name} changed to ${nextStatus}.`,
    )
  }

  function deleteRole(role: Role) {
    if (
      !confirm(
        `Delete role ${role.name}? Existing accounts using this role may need reassignment.`,
      )
    ) {
      return
    }

    setRoles((current) =>
      current.filter(
        (item) => item.id !== role.id,
      ),
    )

    addAudit(
      "Delete Role",
      "Roles & Permissions",
      role.id,
      `Deleted role ${role.name}.`,
      "Warning",
    )
  }

  function stopCamera() {
    if (cameraStreamRef.current) {
      cameraStreamRef.current
        .getTracks()
        .forEach((track) => track.stop())

      cameraStreamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraOpen(false)
  }

  async function openCamera() {
    setCameraError("")

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setCameraError(
        "Camera access is not supported by this browser.",
      )
      return
    }

    try {
      stopCamera()

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
          },
          audio: false,
        })

      cameraStreamRef.current = stream
      setCameraOpen(true)

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current
            .play()
            .catch(() => {})
        }
      })
    } catch {
      setCameraError(
        "Camera permission was denied, no camera is available, or the camera is already being used by another application.",
      )
      setCameraOpen(false)
    }
  }

  function capturePhoto() {
    const video = videoRef.current

    if (
      !video ||
      !video.videoWidth ||
      !video.videoHeight
    ) {
      setCameraError(
        "The camera is not ready yet. Please wait a moment and try again.",
      )
      return
    }

    const canvas =
      canvasRef.current ||
      document.createElement("canvas")

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext("2d")

    if (!context) {
      setCameraError(
        "Unable to capture the camera image.",
      )
      return
    }

    context.drawImage(
      video,
      0,
      0,
      canvas.width,
      canvas.height,
    )

    const photo = canvas.toDataURL(
      "image/jpeg",
      0.9,
    )

    setCardForm((current) => ({
      ...current,
      photo,
    }))

    setCameraError("")
    stopCamera()
  }

  function openCardModal() {
    stopCamera()
    setCameraError("")

    setCardForm({
      holderKey: "",
      holderId: "",
      holderName: "",
      holderType: "Student",
      expiryDate: "",
      photo: "",
      faculty: "",
      department: "",
      programme: "",
      yearLevel: "",
      phone: "",
      email: "",
      province: "",
      district: "",
    })

    setShowCardModal(true)
  }

  function selectCardHolder(holderKey: string) {
    setCameraError("")
    stopCamera()

    if (!holderKey) {
      setCardForm({
        holderKey: "",
        holderId: "",
        holderName: "",
        holderType: "Student",
        expiryDate: "",
        photo: "",
        faculty: "",
        department: "",
        programme: "",
        yearLevel: "",
        phone: "",
        email: "",
        province: "",
        district: "",
      })
      return
    }

    const separatorIndex =
      holderKey.indexOf(":")

    const holderType =
      separatorIndex >= 0
        ? holderKey.slice(0, separatorIndex)
        : "Student"

    const holderId =
      separatorIndex >= 0
        ? holderKey.slice(
            separatorIndex + 1,
          )
        : holderKey

    const sourceList =
      holderType === "Student"
        ? students
        : holderType === "Staff"
          ? staff
          : lecturers

    const person =
      sourceList.find((item) => {
        if (
          !item ||
          typeof item !== "object"
        ) {
          return false
        }

        const record =
          item as Record<string, unknown>

        const possibleId = String(
          record.studentId ||
            record.staffId ||
            record.id ||
            "",
        ).trim()

        return possibleId === holderId
      }) as
      | Record<string, unknown>
      | undefined

    if (!person) {
      setCameraError(
        "The selected person could not be found in the central registration records.",
      )
      return
    }

    const fullName = [
      person.firstName,
      person.middleName,
      person.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim()

    const resolvedName =
      String(
        person.fullName ||
          person.name ||
          fullName ||
          holderId,
      ).trim()

    const existingCard = cards.find(
      (card) =>
        card.holderId === holderId &&
        card.holderType ===
          (holderType === "Student"
            ? "Student"
            : "Staff"),
    )

    setCardForm({
      holderKey,
      holderId,
      holderName: resolvedName,
      holderType:
        holderType === "Student"
          ? "Student"
          : "Staff",
      expiryDate:
        existingCard?.expiryDate || "",
      photo:
        existingCard?.photo ||
        (typeof person.photo === "string"
          ? person.photo
          : ""),
      faculty:
        existingCard?.faculty ||
        (typeof person.faculty === "string"
          ? person.faculty
          : ""),
      department:
        existingCard?.department ||
        (typeof person.department ===
        "string"
          ? person.department
          : ""),
      programme:
        existingCard?.programme ||
        (typeof person.programme ===
        "string"
          ? person.programme
          : typeof person.course ===
              "string"
            ? person.course
            : ""),
      yearLevel:
        existingCard?.yearLevel ||
        (typeof person.yearLevel ===
        "string"
          ? person.yearLevel
          : typeof person.academicYear ===
              "string"
            ? person.academicYear
            : ""),
      phone:
        existingCard?.phone ||
        (typeof person.phone === "string"
          ? person.phone
          : ""),
      email:
        existingCard?.email ||
        (typeof person.email === "string"
          ? person.email
          : ""),
      province:
        existingCard?.province ||
        (typeof person.province === "string"
          ? person.province
          : ""),
      district:
        existingCard?.district ||
        (typeof person.district ===
        "string"
          ? person.district
          : ""),
    })
  }

  useEffect(() => {
    return () => {
      if (cameraStreamRef.current) {
        cameraStreamRef.current
          .getTracks()
          .forEach((track) => track.stop())

        cameraStreamRef.current = null
      }
    }
  }, [])

  function printStudentIdCard(card: IdCard) {
  const printWindow = window.open(
    "",
    "_blank",
    "width=900,height=700",
  )

  if (!printWindow) {
    alert("Please allow pop-ups to print the ID card.")
    return
  }

  const photoHtml = card.photo
    ? `<img src="${card.photo}" alt="ID photo" style="width:120px;height:145px;object-fit:cover;border:1px solid #cbd5e1;border-radius:8px;" />`
    : `<div style="width:120px;height:145px;border:1px solid #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:12px;">No Photo</div>`

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${card.cardNumber} - Nexus University ID Card</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 30px;
            font-family: Arial, sans-serif;
            color: #0f172a;
          }
          .card {
            width: 760px;
            min-height: 430px;
            margin: 0 auto;
            border: 2px solid #0f172a;
            border-radius: 18px;
            overflow: hidden;
          }
          .header {
            background: #0f172a;
            color: white;
            padding: 22px 28px;
          }
          .university {
            font-size: 24px;
            font-weight: 800;
          }
          .subtitle {
            margin-top: 4px;
            font-size: 13px;
          }
          .body {
            display: flex;
            gap: 28px;
            padding: 28px;
          }
          .details {
            flex: 1;
          }
          .name {
            font-size: 25px;
            font-weight: 800;
            margin-bottom: 18px;
          }
          .row {
            margin: 7px 0;
            font-size: 14px;
          }
          .label {
            display: inline-block;
            width: 120px;
            font-weight: 700;
          }
          .footer {
            border-top: 1px solid #cbd5e1;
            padding: 14px 28px;
            font-size: 11px;
          }
          @media print {
            body { padding: 0; }
            .card { margin: 0; }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div class="university">NEXUS UNIVERSITY</div>
            <div class="subtitle">Official ${card.holderType} Identification Card</div>
          </div>

          <div class="body">
            <div>${photoHtml}</div>

            <div class="details">
              <div class="name">${card.holderName}</div>

              <div class="row">
                <span class="label">Holder ID:</span>
                ${card.holderId}
              </div>

              <div class="row">
                <span class="label">Faculty:</span>
                ${card.faculty || "—"}
              </div>

              <div class="row">
                <span class="label">Programme:</span>
                ${card.programme || "—"}
              </div>

              <div class="row">
                <span class="label">Year Level:</span>
                ${card.yearLevel || "—"}
              </div>

              <div class="row">
                <span class="label">Phone:</span>
                ${card.phone || "—"}
              </div>

              <div class="row">
                <span class="label">Email:</span>
                ${card.email || "—"}
              </div>

              <div class="row">
                <span class="label">Card Number:</span>
                ${card.cardNumber}
              </div>
            </div>
          </div>

          <div class="footer">
            Issued: ${card.issueDate}
            &nbsp;&nbsp; | &nbsp;&nbsp;
            Status: ${card.status}
          </div>
        </div>

        <script>
          window.onload = function () {
            window.print();
          };
        </script>
      </body>
    </html>
  `)

  printWindow.document.close()

  const updatedCards = cards.map((item) =>
    item.id === card.id
      ? {
          ...item,
          printStatus: "Printed" as const,
        }
      : item,
  )

  setCards(updatedCards)

  localStorage.setItem(
    STORAGE.cards,
    JSON.stringify(updatedCards),
  )

  addAudit(
    "Print ID Card",
    "ID Card Management",
    card.id,
    `Printed ${card.cardNumber} for ${card.holderName}.`,
  )
}

function saveCard() {
    if (
      !cardForm.holderId.trim() ||
      !cardForm.holderName.trim()
    ) {
      alert(
        "Please select a registered student or staff member.",
      )
      return
    }

    if (!cardForm.expiryDate) {
      alert("Expiry date is required.")
      return
    }

    if (!cardForm.photo.trim()) {
      alert(
        "Please open the camera and capture the ID photo before issuing the card.",
      )
      return
    }

    const existingIndex = cards.findIndex(
      (card) =>
        card.holderId ===
          cardForm.holderId.trim() &&
        card.holderType ===
          cardForm.holderType,
    )

    const existingCard =
      existingIndex >= 0
        ? cards[existingIndex]
        : null

    const card: IdCard = existingCard
      ? {
          ...existingCard,
          holderId:
            cardForm.holderId.trim(),
          holderName:
            cardForm.holderName.trim(),
          holderType:
            cardForm.holderType,
          issueDate:
            existingCard.issueDate ||
            today(),
          expiryDate:
            cardForm.expiryDate,
          status:
            existingCard.status ===
              "Lost" ||
            existingCard.status ===
              "Cancelled"
              ? "Active"
              : existingCard.status,
          photo: cardForm.photo,
          faculty:
            cardForm.faculty || undefined,
          department:
            cardForm.department ||
            undefined,
          programme:
            cardForm.programme ||
            undefined,
          yearLevel:
            cardForm.yearLevel ||
            undefined,
          phone:
            cardForm.phone || undefined,
          email:
            cardForm.email || undefined,
          province:
            cardForm.province ||
            undefined,
          district:
            cardForm.district ||
            undefined,
          printStatus:
            "Pending ICT Printing",
        }
      : {
          id: makeId("CARD"),
          cardNumber:
            `NXS-ID-${String(
              cards.length + 1,
            ).padStart(6, "0")}`,
          holderId:
            cardForm.holderId.trim(),
          holderName:
            cardForm.holderName.trim(),
          holderType:
            cardForm.holderType,
          issueDate: today(),
          expiryDate:
            cardForm.expiryDate,
          status: "Active",
          photo: cardForm.photo,
          faculty:
            cardForm.faculty || undefined,
          department:
            cardForm.department ||
            undefined,
          programme:
            cardForm.programme ||
            undefined,
          yearLevel:
            cardForm.yearLevel ||
            undefined,
          phone:
            cardForm.phone || undefined,
          email:
            cardForm.email || undefined,
          province:
            cardForm.province ||
            undefined,
          district:
            cardForm.district ||
            undefined,
          printStatus:
            "Pending ICT Printing",
        }

    const updatedCards =
      existingCard
        ? cards.map((item, index) =>
            index === existingIndex
              ? card
              : item,
          )
        : [
            ...cards,
            card,
          ]

    setCards(updatedCards)

    localStorage.setItem(
      STORAGE.cards,
      JSON.stringify(updatedCards),
    )

    addAudit(
      existingCard
        ? "Update ID Card"
        : "Issue ID Card",
      "ID Card Management",
      card.id,
      `${existingCard ? "Updated" : "Issued"} ${card.cardNumber} for ${card.holderName}. Photo captured in ICT.`,
    )

    stopCamera()
    setShowCardModal(false)
  }

  function updateCardStatus(
    card: IdCard,
    status: IdCard["status"],
  ) {
    setCards((current) => {
      const updated = current.map((item) =>
        item.id === card.id
          ? {
              ...item,
              status,
              printStatus:
                status === "Lost" ||
                status === "Cancelled"
                  ? item.printStatus
                  : item.printStatus,
            }
          : item,
      )

      localStorage.setItem(
        STORAGE.cards,
        JSON.stringify(updated),
      )

      return updated
    })

    addAudit(
      "Change ID Card Status",
      "ID Card Management",
      card.id,
      `${card.cardNumber} changed to ${status}.`,
      status === "Lost" ||
        status === "Cancelled"
        ? "Warning"
        : "Info",
    )
  }

  function openBackupModal() {
    setBackupForm({
      name: `Nexus SIS Backup ${today()}`,
      type: "Full",
    })

    setShowBackupModal(true)
  }

  function createBackup() {
    const name =
      backupForm.name.trim() ||
      `NexusSIS-${backupForm.type}-${today()}`

    const createdBy =
      localStorage.getItem("nexus_username") ||
      "ICT Administrator"

    const backupId = makeId("BACKUP")

    const allData = {
      users: readStorage(
        STORAGE.users,
        [],
      ),
      roles: readStorage(
        STORAGE.roles,
        [],
      ),
      cards: readStorage(
        STORAGE.cards,
        [],
      ),
      backups: readStorage(
        STORAGE.backups,
        [],
      ),
      auditLogs: readStorage(
        STORAGE.audit,
        [],
      ),
      securityEvents: readStorage(
        STORAGE.security,
        [],
      ),
      configuration: readStorage(
        STORAGE.config,
        defaultConfig,
      ),
    }

    let backupData = allData

    if (backupForm.type === "Data") {
      backupData = {
        users: allData.users,
        roles: allData.roles,
        cards: allData.cards,
        backups: [],
        auditLogs: [],
        securityEvents: [],
        configuration: allData.configuration,
      }
    }

    if (
      backupForm.type === "Configuration"
    ) {
      backupData = {
        users: [],
        roles: allData.roles,
        cards: [],
        backups: [],
        auditLogs: [],
        securityEvents: [],
        configuration:
          allData.configuration,
      }
    }

    const payload = {
      backupId,
      backupName: name,
      backupType: backupForm.type,
      createdAt: now(),
      createdBy,
      application: "NexusSIS",
      data: backupData,
    }

    const json = JSON.stringify(
      payload,
      null,
      2,
    )

    const blob = new Blob(
      [json],
      {
        type: "application/json;charset=utf-8",
      },
    )

    const url =
      URL.createObjectURL(blob)

    const link =
      document.createElement("a")

    link.href = url
    link.download =
      `${name.replace(
        /[^a-z0-9_-]+/gi,
        "_",
      )}.json`

    document.body.appendChild(link)
    link.click()
    link.remove()

    window.setTimeout(
      () => URL.revokeObjectURL(url),
      1000,
    )

    const backup: Backup = {
      id: backupId,
      name,
      type: backupForm.type,
      date: now(),
      size:
        `${Math.ceil(
          json.length / 1024,
        )} KB`,
      status: "Completed",
      createdBy,
    }

    setBackups((current) => [
      backup,
      ...current,
    ])

    addAudit(
      "Create Backup",
      "Backup & Recovery",
      backup.id,
      `Created and exported ${backup.type} backup "${name}".`,
    )

    setBackupForm({
      name: "",
      type: "Full",
    })

    setShowBackupModal(false)

    alert(
      "Backup created and downloaded successfully.",
    )
  }



  function restoreBackup(backup: Backup) {
    if (
      !confirm(
        `Restore ${backup.name}? This prototype records the restore action but does not overwrite live data.`,
      )
    ) {
      return
    }

    addAudit(
      "Restore Backup",
      "Backup & Recovery",
      backup.id,
      `Restore requested for ${backup.name}.`,
      "Warning",
    )

    alert(
      "Restore request recorded. The production system will connect this action to the real database backup service.",
    )
  }

  function saveConfiguration() {
    if (!config.universityName.trim()) {
      alert("Please enter the institution name.")
      return
    }

    if (!config.universityCode.trim()) {
      alert("Please enter the institution code.")
      return
    }

    const idFields = [
      ["Student ID", config.nextStudentId],
      ["Staff ID", config.nextStaffId],
      ["Lecturer ID", config.nextLecturerId],
    ] as const

    for (const [label, value] of idFields) {
      if (!String(value).trim()) {
        alert(`Please enter the next ${label} number.`)
        return
      }

      if (!/^\d+$/.test(String(value).trim())) {
        alert(`${label} must contain numbers only.`)
        return
      }
    }

    writeStorage(STORAGE.config, config)

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new Event("nexusSIS_configuration_updated"),
      )
    }

    addAudit(
      "Update Configuration",
      "System Configuration",
      "SYSTEM",
      "Institution and system configuration updated.",
      "Warning",
    )

    alert("System configuration saved.")
  }

  function resetConfiguration() {
    if (
      !confirm(
        "Reset system configuration to the default values?",
      )
    ) {
      return
    }

    setConfig(defaultConfig)

    addAudit(
      "Reset Configuration",
      "System Configuration",
      "SYSTEM",
      "System configuration reset to defaults.",
      "Warning",
    )
  }

  function exportUsers() {
    downloadCsv(
      "nexus-sis-ict-users.csv",
      users.map((user) => ({
        Username: user.username,
        FullName: user.fullName,
        AccountType: user.accountType,
        LinkedID: user.linkedId,
        Email: user.email,
        Role: user.role,
        Status: user.status,
        LastLogin: user.lastLogin,
        CreatedDate: user.createdDate,
      })),
    )
  }

  function exportAuditLogs() {
    downloadCsv(
      "nexus-sis-audit-logs.csv",
      auditLogs.map((log) => ({
        Date: log.date,
        Username: log.username,
        Action: log.action,
        Module: log.module,
        RecordID: log.recordId,
        Details: log.details,
        Severity: log.severity,
      })),
    )
  }

  function exportCards() {
    downloadCsv(
      "nexus-sis-id-cards.csv",
      cards.map((card) => ({
        CardNumber: card.cardNumber,
        HolderID: card.holderId,
        HolderName: card.holderName,
        HolderType: card.holderType,
        IssueDate: card.issueDate,
        ExpiryDate: card.expiryDate,
        Status: card.status,
      })),
    )
  }

  function exportBackups() {
    downloadCsv(
      "nexus-sis-backups.csv",
      backups.map((backup) => ({
        Name: backup.name,
        Type: backup.type,
        Date: backup.date,
        Size: backup.size,
        Status: backup.status,
        CreatedBy: backup.createdBy,
      })),
    )
  }

  function signOut() {
    localStorage.removeItem("nexussis_session")
    localStorage.removeItem("nexus_role")
    localStorage.removeItem("nexus_username")
    localStorage.removeItem("userSession")

    window.location.href = "/dashboard"
  }

  const permissionOptions = [
    "All Modules",
    "User Management",
    "System Configuration",
    "Audit Logs",
    "Backups",
    "Registration",
    "Students",
    "Courses",
    "Examinations",
    "Graduation",
    "Bursary",
    "Student Fees",
    "Payments",
    "Financial Reports",
    "LMS",
    "Assignments",
    "Grades",
    "Student Portal",
    "Library",
    "Dormitories",
    "Cafeteria",
    "Student Affairs",
    "HR",
    "Procurement",
    "Inventory",
  ]

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-xl font-bold tracking-wide">
              NEXUS SIS
            </div>
            <div className="text-sm text-slate-300">
              ICT Control Centre
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/dashboard"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              Home
            </a>

            <a
              href="/admin/ict/announcements"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
            >
              Announcements
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
            ICT Control Centre
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Central technical administration, security,
            accounts, ID cards, backups and system configuration.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow-sm">
          {(
            [
              "Dashboard",
              "Users",
              "Roles",
              "ID Cards",
              "Backups",
              "Audit Logs",
              "Configuration",
              "Security",
            ] as Tab[]
          ).map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ${
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  User Accounts
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {users.length}
                </div>
                <div className="mt-1 text-xs text-emerald-600">
                  {activeUsers} active
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Roles
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {roles.length}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {roles.filter(
                    (role) =>
                      role.status === "Active",
                  ).length}{" "}
                  active
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  ID Cards
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {cards.length}
                </div>
                <div className="mt-1 text-xs text-emerald-600">
                  {activeCards} active
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Audit Events
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {auditLogs.length}
                </div>
                <div className="mt-1 text-xs text-red-600">
                  {criticalSecurityEvents} security alerts
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      System Status
                    </h2>
                    <p className="text-sm text-slate-500">
                      Current central system configuration.
                    </p>
                  </div>

                  <StatusBadge
                    status={
                      config.maintenanceMode
                        ? "Warning"
                        : "Active"
                    }
                  />
                </div>

                <div className="mt-5 space-y-3">
                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      University
                    </span>
                    <span className="font-semibold">
                      {config.universityName}
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      Academic Year
                    </span>
                    <span className="font-semibold">
                      {config.academicYear}
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      Semester
                    </span>
                    <span className="font-semibold">
                      {config.currentSemester}
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      Registration
                    </span>
                    <StatusBadge
                      status={
                        config.registrationOpen
                          ? "Active"
                          : "Inactive"
                      }
                    />
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      Student Portal
                    </span>
                    <StatusBadge
                      status={
                        config.allowStudentPortal
                          ? "Active"
                          : "Inactive"
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  Security Overview
                </h2>

                <div className="mt-5 space-y-3">
                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      Suspended accounts
                    </span>
                    <span className="font-bold text-amber-600">
                      {suspendedUsers}
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      Locked accounts
                    </span>
                    <span className="font-bold text-red-600">
                      {lockedUsers}
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      Security events
                    </span>
                    <span className="font-bold">
                      {securityEvents.length}
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-red-50 p-4">
                    <span className="text-sm text-red-700">
                      Critical / blocked
                    </span>
                    <span className="font-bold text-red-700">
                      {criticalSecurityEvents}
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      Login attempts allowed
                    </span>
                    <span className="font-bold">
                      {config.maxLoginAttempts}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">
                Central System Connections
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">
                    Students
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {students.length}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">
                    Administration Staff
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {staff.length}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">
                    Lecturers
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {lecturers.length}
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="text-xs text-slate-500">
                    Backups
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {backups.length}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {tab === "Users" && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  User Management
                </h2>
                <p className="text-sm text-slate-500">
                  Manage university system accounts and linked IDs.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportUsers}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Export
                </button>

                <button
                  onClick={openNewUser}
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  + Create Account
                </button>
              </div>
            </div>

            <div className="border-b p-5">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search username, name, Student ID, Staff ID or role..."
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm md:max-w-xl"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Username
                    </th>
                    <th className="px-5 py-3">
                      Account Holder
                    </th>
                    <th className="px-5 py-3">
                      Linked ID
                    </th>
                    <th className="px-5 py-3">
                      Role
                    </th>
                    <th className="px-5 py-3">
                      Status
                    </th>
                    <th className="px-5 py-3">
                      Last Login
                    </th>
                    <th className="px-5 py-3">
                      Credentials
                    </th>
                    <th className="px-5 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold">
                        {user.username}
                        <div className="text-xs font-normal text-slate-500">
                          {user.email}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div>{user.fullName}</div>
                        <div className="text-xs text-slate-500">
                          {user.accountType}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {user.linkedId || "—"}
                      </td>

                      <td className="px-5 py-4">
                        {user.role}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={user.status}
                        />
                      </td>

                      <td className="px-5 py-4">
                        {user.lastLogin}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold">
                          {user.username}
                        </div>
                        <div className="text-xs text-slate-500">
                          {user.credentialStatus === "Temporary"
                            ? "Temporary password issued"
                            : "Password active"}
                        </div>
                        <div className="mt-1">
                          <StatusBadge
                            status={
                              user.credentialStatus ||
                              "Temporary"
                            }
                          />
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              editUser(user)
                            }
                            className="rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() =>
                              updateUserStatus(
                                user,
                                user.status === "Active"
                                  ? "Suspended"
                                  : "Active",
                              )
                            }
                            className="rounded bg-slate-100 px-3 py-1.5 text-xs font-semibold"
                          >
                            {user.status === "Active"
                              ? "Suspend"
                              : "Activate"}
                          </button>

                          <button
                            onClick={() =>
                              updateUserStatus(
                                user,
                                "Locked",
                              )
                            }
                            className="rounded bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                          >
                            Lock
                          </button>

                          <button
                            onClick={() =>
                              deleteUser(user)
                            }
                            className="rounded bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!filteredUsers.length && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No user accounts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Roles" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm">
              <div>
                <h2 className="font-bold text-slate-900">
                  Roles & Permissions
                </h2>
                <p className="text-sm text-slate-500">
                  Define controlled access to university modules.
                </p>
              </div>

              <button
                onClick={openNewRole}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                + Add Role
              </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="rounded-xl bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-slate-900">
                        {role.name}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {role.description}
                      </p>
                    </div>

                    <StatusBadge
                      status={role.status}
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {role.permissions.map(
                      (permission) => (
                        <span
                          key={permission}
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                        >
                          {permission}
                        </span>
                      ),
                    )}
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() =>
                        editRole(role)
                      }
                      className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        toggleRole(role)
                      }
                      className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold"
                    >
                      {role.status === "Active"
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                    <button
                      onClick={() =>
                        deleteRole(role)
                      }
                      className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "ID Cards" && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  ID Card Management
                </h2>
                <p className="text-sm text-slate-500">
                  Manage university Student and Staff ID cards.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportCards}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Export
                </button>

                <button
                  onClick={openCardModal}
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  + Issue ID Card
                </button>
              </div>
            </div>

            <div className="grid gap-4 border-b p-5 md:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="text-xs text-slate-500">
                  Total Cards
                </div>
                <div className="mt-1 text-2xl font-bold">
                  {cards.length}
                </div>
              </div>

              <div className="rounded-lg bg-emerald-50 p-4">
                <div className="text-xs text-emerald-700">
                  Active
                </div>
                <div className="mt-1 text-2xl font-bold text-emerald-700">
                  {activeCards}
                </div>
              </div>

              <div className="rounded-lg bg-red-50 p-4">
                <div className="text-xs text-red-700">
                  Lost
                </div>
                <div className="mt-1 text-2xl font-bold text-red-700">
                  {
                    cards.filter(
                      (card) =>
                        card.status === "Lost",
                    ).length
                  }
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 p-4">
                <div className="text-xs text-amber-700">
                  Expired
                </div>
                <div className="mt-1 text-2xl font-bold text-amber-700">
                  {
                    cards.filter(
                      (card) =>
                        card.status === "Expired",
                    ).length
                  }
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Card Number
                    </th>
                    <th className="px-5 py-3">
                      Holder
                    </th>
                    <th className="px-5 py-3">
                      Holder ID
                    </th>
                    <th className="px-5 py-3">
                      Issue Date
                    </th>
                    <th className="px-5 py-3">
                      Expiry
                    </th>
                    <th className="px-5 py-3">
                      Status
                    </th>
                    <th className="px-5 py-3">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {cards.map((card) => (
                    <tr
                      key={card.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-semibold">
                        {card.cardNumber}
                      </td>

                      <td className="px-5 py-4">
                        <div>{card.holderName}</div>
                        <div className="text-xs text-slate-500">
                          {card.holderType}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {card.holderId}
                      </td>

                      <td className="px-5 py-4">
                        {card.issueDate}
                      </td>

                      <td className="px-5 py-4">
                        {card.expiryDate}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={card.status}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex min-w-[220px] flex-col gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              printStudentIdCard(card)
                            }
                            disabled={
                              card.status === "Lost" ||
                              card.status === "Cancelled" ||
                              !card.photo
                            }
                            className="rounded-lg bg-slate-950 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            {card.printStatus === "Printed"
                              ? "Reprint ID Card"
                              : "Print ID Card"}
                          </button>

                          <select
                            value={card.status}
                            onChange={(event) =>
                              updateCardStatus(
                                card,
                                event.target
                                  .value as IdCard["status"],
                              )
                            }
                            className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                          >
                            <option value="Active">
                              Active
                            </option>
                            <option value="Expired">
                              Expired
                            </option>
                            <option value="Lost">
                              Lost
                            </option>
                            <option value="Cancelled">
                              Cancelled
                            </option>
                          </select>

                          <span
                            className={`text-xs font-semibold ${
                              card.printStatus === "Printed"
                                ? "text-emerald-700"
                                : "text-amber-700"
                            }`}
                          >
                            {card.printStatus ||
                              "Pending ICT Printing"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {!cards.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No ID cards have been issued.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Backups" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm">
              <div>
                <h2 className="font-bold text-slate-900">
                  Backup & Recovery
                </h2>
                <p className="text-sm text-slate-500">
                  Record system backup and recovery operations.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportBackups}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Export
                </button>

                <button
                  onClick={openBackupModal}
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  + Create Backup
                </button>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Total Backups
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {backups.length}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Completed
                </div>
                <div className="mt-2 text-3xl font-bold text-emerald-600">
                  {
                    backups.filter(
                      (backup) =>
                        backup.status ===
                        "Completed",
                    ).length
                  }
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Backup Frequency
                </div>
                <div className="mt-2 text-2xl font-bold">
                  {config.backupFrequency}
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">
                        Backup
                      </th>
                      <th className="px-5 py-3">
                        Type
                      </th>
                      <th className="px-5 py-3">
                        Date
                      </th>
                      <th className="px-5 py-3">
                        Size
                      </th>
                      <th className="px-5 py-3">
                        Status
                      </th>
                      <th className="px-5 py-3">
                        Created By
                      </th>
                      <th className="px-5 py-3">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {backups.map((backup) => (
                      <tr
                        key={backup.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-semibold">
                          {backup.name}
                        </td>

                        <td className="px-5 py-4">
                          {backup.type}
                        </td>

                        <td className="px-5 py-4">
                          {backup.date}
                        </td>

                        <td className="px-5 py-4">
                          {backup.size}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={backup.status}
                          />
                        </td>

                        <td className="px-5 py-4">
                          {backup.createdBy}
                        </td>

                        <td className="px-5 py-4">
                          <button
                            onClick={() =>
                              restoreBackup(backup)
                            }
                            className="rounded bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700"
                          >
                            Restore
                          </button>
                        </td>
                      </tr>
                    ))}

                    {!backups.length && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-12 text-center text-slate-500"
                        >
                          No backups have been recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "Audit Logs" && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Audit Trail
                </h2>
                <p className="text-sm text-slate-500">
                  Track administrative actions across the system.
                </p>
              </div>

              <button
                onClick={exportAuditLogs}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Export Logs
              </button>
            </div>

            <div className="border-b p-5">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search user, action, module or details..."
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm md:max-w-xl"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Date
                    </th>
                    <th className="px-5 py-3">
                      User
                    </th>
                    <th className="px-5 py-3">
                      Action
                    </th>
                    <th className="px-5 py-3">
                      Module
                    </th>
                    <th className="px-5 py-3">
                      Record
                    </th>
                    <th className="px-5 py-3">
                      Details
                    </th>
                    <th className="px-5 py-3">
                      Severity
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 whitespace-nowrap">
                        {log.date}
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {log.username}
                      </td>

                      <td className="px-5 py-4">
                        {log.action}
                      </td>

                      <td className="px-5 py-4">
                        {log.module}
                      </td>

                      <td className="px-5 py-4">
                        {log.recordId}
                      </td>

                      <td className="px-5 py-4 max-w-md">
                        {log.details}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={log.severity}
                        />
                      </td>
                    </tr>
                  ))}

                  {!filteredLogs.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No audit events recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Configuration" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">
                University Configuration
              </h2>

              <div className="mt-5 space-y-4">
                <label className="block text-sm font-medium">
                  University Name
                  <input
                    value={config.universityName}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        universityName:
                          event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm font-medium">
                  University Code
                  <input
                    value={config.universityCode}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        universityCode:
                          event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Next Student ID Number
                  <input
                    type="text"
                    inputMode="numeric"
                    value={config.nextStudentId}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        nextStudentId:
                          event.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="Example: 10001"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <div className="mt-1 text-xs text-slate-500">
                    The next student registration will use this number.
                    Existing student IDs are never changed.
                  </div>
                </label>

                <label className="block text-sm font-medium">
                  Next Staff ID Number
                  <input
                    type="text"
                    inputMode="numeric"
                    value={config.nextStaffId}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        nextStaffId:
                          event.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="Example: 50001"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <div className="mt-1 text-xs text-slate-500">
                    The next staff member will receive this number.
                  </div>
                </label>

                <label className="block text-sm font-medium">
                  Next Lecturer ID Number
                  <input
                    type="text"
                    inputMode="numeric"
                    value={config.nextLecturerId}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        nextLecturerId:
                          event.target.value.replace(/\D/g, ""),
                      })
                    }
                    placeholder="Example: 90001"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <div className="mt-1 text-xs text-slate-500">
                    The next lecturer will receive this number.
                  </div>
                </label>

                <label className="block text-sm font-medium">
                  Academic Year
                  <input
                    value={config.academicYear}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        academicYear:
                          event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Current Semester
                  <select
                    value={config.currentSemester}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        currentSemester:
                          event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="Semester 1">
                      Semester 1
                    </option>
                    <option value="Semester 2">
                      Semester 2
                    </option>
                  </select>
                </label>

                <label className="block text-sm font-medium">
                  Institution Logo
                  <input
                    type="text"
                    value={config.institutionLogo}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        institutionLogo:
                          event.target.value,
                      })
                    }
                    placeholder="Logo URL or stored image reference"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <div className="mt-1 text-xs text-slate-500">
                    Institution logo reference for dashboards,
                    ID cards and reports.
                  </div>
                </label>

                <label className="block text-sm font-medium">
                  System Email
                  <input
                    type="email"
                    value={config.systemEmail}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        systemEmail:
                          event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">
                System & Security Settings
              </h2>

              <div className="mt-5 space-y-4">
                <label className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                  <div>
                    <div className="text-sm font-semibold">
                      Registration Open
                    </div>
                    <div className="text-xs text-slate-500">
                      Allow student registration workflows.
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={config.registrationOpen}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        registrationOpen:
                          event.target.checked,
                      })
                    }
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                  <div>
                    <div className="text-sm font-semibold">
                      Maintenance Mode
                    </div>
                    <div className="text-xs text-slate-500">
                      Restrict normal system access.
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={config.maintenanceMode}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        maintenanceMode:
                          event.target.checked,
                      })
                    }
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                  <div>
                    <div className="text-sm font-semibold">
                      Student Portal
                    </div>
                    <div className="text-xs text-slate-500">
                      Enable student self-service.
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={config.allowStudentPortal}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        allowStudentPortal:
                          event.target.checked,
                      })
                    }
                    className="h-5 w-5"
                  />
                </label>

                <label className="flex items-center justify-between rounded-lg bg-slate-50 p-4">
                  <div>
                    <div className="text-sm font-semibold">
                      Staff Portal
                    </div>
                    <div className="text-xs text-slate-500">
                      Enable staff self-service.
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={config.allowStaffPortal}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        allowStaffPortal:
                          event.target.checked,
                      })
                    }
                    className="h-5 w-5"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Session Timeout (minutes)
                  <input
                    type="number"
                    min="5"
                    value={config.sessionTimeout}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        sessionTimeout:
                          Number(
                            event.target.value,
                          ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Password Expiry (days)
                  <input
                    type="number"
                    min="1"
                    value={config.passwordExpiryDays}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        passwordExpiryDays:
                          Number(
                            event.target.value,
                          ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Maximum Login Attempts
                  <input
                    type="number"
                    min="1"
                    value={config.maxLoginAttempts}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        maxLoginAttempts:
                          Number(
                            event.target.value,
                          ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </label>

                <label className="block text-sm font-medium">
                  Backup Frequency
                  <select
                    value={config.backupFrequency}
                    onChange={(event) =>
                      setConfig({
                        ...config,
                        backupFrequency:
                          event.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  >
                    <option value="Hourly">
                      Hourly
                    </option>
                    <option value="Daily">
                      Daily
                    </option>
                    <option value="Weekly">
                      Weekly
                    </option>
                    <option value="Monthly">
                      Monthly
                    </option>
                  </select>
                </label>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={resetConfiguration}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                >
                  Reset
                </button>

                <button
                  onClick={saveConfiguration}
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "Security" && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Security Events
                </div>
                <div className="mt-2 text-3xl font-bold">
                  {securityEvents.length}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Failed
                </div>
                <div className="mt-2 text-3xl font-bold text-amber-600">
                  {
                    securityEvents.filter(
                      (event) =>
                        event.status === "Failed",
                    ).length
                  }
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Blocked
                </div>
                <div className="mt-2 text-3xl font-bold text-red-600">
                  {
                    securityEvents.filter(
                      (event) =>
                        event.status === "Blocked",
                    ).length
                  }
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Critical
                </div>
                <div className="mt-2 text-3xl font-bold text-red-600">
                  {
                    securityEvents.filter(
                      (event) =>
                        event.severity ===
                        "Critical",
                    ).length
                  }
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white shadow-sm">
              <div className="border-b p-5">
                <h2 className="font-bold text-slate-900">
                  Security Events
                </h2>
                <p className="text-sm text-slate-500">
                  Authentication and security monitoring records.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">
                        Date
                      </th>
                      <th className="px-5 py-3">
                        Username
                      </th>
                      <th className="px-5 py-3">
                        Event
                      </th>
                      <th className="px-5 py-3">
                        IP Address
                      </th>
                      <th className="px-5 py-3">
                        Status
                      </th>
                      <th className="px-5 py-3">
                        Severity
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {securityEvents.map((event) => (
                      <tr
                        key={event.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          {event.date}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {event.username}
                        </td>

                        <td className="px-5 py-4">
                          {event.event}
                        </td>

                        <td className="px-5 py-4">
                          {event.ipAddress}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={event.status}
                          />
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={event.severity}
                          />
                        </td>
                      </tr>
                    ))}

                    {!securityEvents.length && (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-5 py-12 text-center text-slate-500"
                        >
                          No security events recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
              <h2 className="font-bold text-amber-900">
                Security Controls
              </h2>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-white/70 p-4">
                  <div className="text-xs text-amber-700">
                    Maximum Login Attempts
                  </div>
                  <div className="mt-1 text-xl font-bold text-amber-900">
                    {config.maxLoginAttempts}
                  </div>
                </div>

                <div className="rounded-lg bg-white/70 p-4">
                  <div className="text-xs text-amber-700">
                    Session Timeout
                  </div>
                  <div className="mt-1 text-xl font-bold text-amber-900">
                    {config.sessionTimeout} minutes
                  </div>
                </div>

                <div className="rounded-lg bg-white/70 p-4">
                  <div className="text-xs text-amber-700">
                    Password Expiry
                  </div>
                  <div className="mt-1 text-xl font-bold text-amber-900">
                    {config.passwordExpiryDays} days
                  </div>
                </div>
              </div>

              <p className="mt-5 text-sm text-amber-800">
                Production security controls will be enforced
                by the backend authentication and authorization
                service during the final integration phase.
              </p>
            </div>
          </div>
        )}
      </main>

      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="font-bold text-slate-900">
                {editingUser
                  ? "Edit User Account"
                  : "Create User Account"}
              </h2>

              <button
                onClick={() =>
                  setShowUserModal(false)
                }
                className="text-xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <label className="text-sm font-medium">
                Username
                <input
                  value={userForm.username}
                  onChange={(event) =>
                    setUserForm({
                      ...userForm,
                      username:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Full Name
                <input
                  value={userForm.fullName}
                  onChange={(event) =>
                    setUserForm({
                      ...userForm,
                      fullName:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Account Type
                <select
                  value={userForm.accountType}
                  onChange={(event) =>
                    setUserForm({
                      ...userForm,
                      accountType:
                        event.target
                          .value as UserAccount["accountType"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Student">
                    Student
                  </option>
                  <option value="Staff">
                    Staff
                  </option>
                  <option value="Administrator">
                    Administrator
                  </option>
                </select>
              </label>

              <label className="text-sm font-medium">
                Linked Student / Staff ID
                <input
                  value={userForm.linkedId}
                  onChange={(event) =>
                    setUserForm({
                      ...userForm,
                      linkedId:
                        event.target.value,
                    })
                  }
                  placeholder="Student ID or Staff ID"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Email
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(event) =>
                    setUserForm({
                      ...userForm,
                      email:
                        event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Password
                <input
                  type="password"
                  value={userForm.password || ""}
                  autoComplete="new-password"
                  onChange={(event) =>
                    setUserForm({
                      ...userForm,
                      password:
                        event.target.value,
                    })
                  }
                  placeholder="Leave blank to generate automatically"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Role
                <select
                  value={userForm.role}
                  onChange={(event) =>
                    setUserForm({
                      ...userForm,
                      role: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  {roles
                    .filter(
                      (role) =>
                        role.status ===
                        "Active",
                    )
                    .map((role) => (
                      <option
                        key={role.id}
                        value={role.name}
                      >
                        {role.name}
                      </option>
                    ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Status
                <select
                  value={userForm.status}
                  onChange={(event) =>
                    setUserForm({
                      ...userForm,
                      status:
                        event.target
                          .value as UserAccount["status"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Active">
                    Active
                  </option>
                  <option value="Suspended">
                    Suspended
                  </option>
                  <option value="Locked">
                    Locked
                  </option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-3 border-t p-5">
              <button
                onClick={() =>
                  setShowUserModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveUser}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Account
              </button>
            </div>
          </div>
        </div>
      )}

      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="font-bold text-slate-900">
                {editingRole
                  ? "Edit Role"
                  : "Create Role"}
              </h2>

              <button
                onClick={() =>
                  setShowRoleModal(false)
                }
                className="text-xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="p-5">
              <label className="block text-sm font-medium">
                Role Name
                <input
                  value={roleForm.name}
                  onChange={(event) =>
                    setRoleForm({
                      ...roleForm,
                      name: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="mt-4 block text-sm font-medium">
                Description
                <textarea
                  value={roleForm.description}
                  onChange={(event) =>
                    setRoleForm({
                      ...roleForm,
                      description:
                        event.target.value,
                    })
                  }
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="mt-4 block text-sm font-medium">
                Status
                <select
                  value={roleForm.status}
                  onChange={(event) =>
                    setRoleForm({
                      ...roleForm,
                      status:
                        event.target
                          .value as Role["status"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Active">
                    Active
                  </option>
                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </label>

              <div className="mt-5">
                <div className="mb-2 text-sm font-semibold">
                  Permissions
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  {permissionOptions.map(
                    (permission) => (
                      <label
                        key={permission}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={roleForm.permissions.includes(
                            permission,
                          )}
                          onChange={() =>
                            togglePermission(
                              permission,
                            )
                          }
                          className="h-4 w-4"
                        />
                        {permission}
                      </label>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t p-5">
              <button
                onClick={() =>
                  setShowRoleModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={saveRole}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Save Role
              </button>
            </div>
          </div>
        </div>
      )}

      {showCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-6 w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  ICT ID Card Issuance
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Registration supplies the central details. ICT captures the photo, generates and prints the ID card.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  stopCamera()
                  setShowCardModal(false)
                }}
                className="text-xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Registered Student / Staff
                  </label>

                  <select
                    value={cardForm.holderKey}
                    onChange={(event) =>
                      selectCardHolder(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  >
                    <option value="">
                      Select registered person
                    </option>

                    <optgroup label="Registered Students">
                      {students
                        .filter(
                          (item) =>
                            item &&
                            typeof item === "object",
                        )
                        .map((item) => {
                          const person =
                            item as Record<
                              string,
                              unknown
                            >

                          const id = String(
                            person.studentId ||
                              person.id ||
                              "",
                          ).trim()

                          if (!id) return null

                          const name = [
                            person.firstName,
                            person.middleName,
                            person.lastName,
                          ]
                            .filter(Boolean)
                            .join(" ")
                            .trim()

                          return (
                            <option
                              key={`Student:${id}`}
                              value={`Student:${id}`}
                            >
                              {id} —{" "}
                              {name || id}
                            </option>
                          )
                        })}
                    </optgroup>

                    <optgroup label="Staff">
                      {staff
                        .filter(
                          (item) =>
                            item &&
                            typeof item === "object",
                        )
                        .map((item) => {
                          const person =
                            item as Record<
                              string,
                              unknown
                            >

                          const id = String(
                            person.staffId ||
                              person.id ||
                              "",
                          ).trim()

                          if (!id) return null

                          const name = String(
                            person.fullName ||
                              person.name ||
                              [
                                person.firstName,
                                person.middleName,
                                person.lastName,
                              ]
                                .filter(Boolean)
                                .join(" ") ||
                              id,
                          ).trim()

                          return (
                            <option
                              key={`Staff:${id}`}
                              value={`Staff:${id}`}
                            >
                              {id} — {name}
                            </option>
                          )
                        })}
                    </optgroup>

                    <optgroup label="Lecturers">
                      {lecturers
                        .filter(
                          (item) =>
                            item &&
                            typeof item === "object",
                        )
                        .map((item) => {
                          const person =
                            item as Record<
                              string,
                              unknown
                            >

                          const id = String(
                            person.staffId ||
                              person.lecturerId ||
                              person.id ||
                              "",
                          ).trim()

                          if (!id) return null

                          const name = String(
                            person.fullName ||
                              person.name ||
                              [
                                person.firstName,
                                person.middleName,
                                person.lastName,
                              ]
                                .filter(Boolean)
                                .join(" ") ||
                              id,
                          ).trim()

                          return (
                            <option
                              key={`Staff:${id}`}
                              value={`Staff:${id}`}
                            >
                              {id} — {name}
                            </option>
                          )
                        })}
                    </optgroup>
                  </select>
                </div>

                {cardForm.holderId && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Central Registration Details
                        </div>
                        <div className="mt-1 font-bold text-slate-900">
                          {cardForm.holderName}
                        </div>
                      </div>

                      <StatusBadge
                        status={
                          cards.some(
                            (card) =>
                              card.holderId ===
                                cardForm.holderId &&
                              card.holderType ===
                                cardForm.holderType,
                          )
                            ? "Existing"
                            : "New"
                        }
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="text-xs text-slate-500">
                          ID
                        </div>
                        <div className="font-semibold">
                          {cardForm.holderId}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">
                          Type
                        </div>
                        <div className="font-semibold">
                          {cardForm.holderType}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">
                          Faculty
                        </div>
                        <div className="font-semibold">
                          {cardForm.faculty || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">
                          Department
                        </div>
                        <div className="font-semibold">
                          {cardForm.department || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">
                          Programme
                        </div>
                        <div className="font-semibold">
                          {cardForm.programme || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">
                          Year
                        </div>
                        <div className="font-semibold">
                          {cardForm.yearLevel || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">
                          Phone
                        </div>
                        <div className="font-semibold">
                          {cardForm.phone || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">
                          Email
                        </div>
                        <div className="break-all font-semibold">
                          {cardForm.email || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">
                          Province
                        </div>
                        <div className="font-semibold">
                          {cardForm.province || "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-500">
                          District
                        </div>
                        <div className="font-semibold">
                          {cardForm.district || "—"}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm font-semibold">
                    Expiry Date
                  </label>

                  <input
                    type="date"
                    value={cardForm.expiryDate}
                    min={today()}
                    onChange={(event) =>
                      setCardForm((current) => ({
                        ...current,
                        expiryDate:
                          event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5"
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">
                        ICT Camera
                      </div>
                      <div className="text-xs text-slate-500">
                        Capture the face photo here. Registration does not capture ID photos.
                      </div>
                    </div>

                    {!cameraOpen && (
                      <button
                        type="button"
                        onClick={openCamera}
                        disabled={!cardForm.holderId}
                        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        Open Camera
                      </button>
                    )}
                  </div>

                  {cameraOpen && (
                    <div className="space-y-3">
                      <div className="overflow-hidden rounded-xl bg-slate-950">
                        <video
                          ref={videoRef}
                          autoPlay
                          muted
                          playsInline
                          className="aspect-video w-full object-cover"
                        />
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={capturePhoto}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                        >
                          Capture Photo
                        </button>

                        <button
                          type="button"
                          onClick={stopCamera}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                        >
                          Close Camera
                        </button>
                      </div>
                    </div>
                  )}

                  {cameraError && (
                    <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                      {cameraError}
                    </div>
                  )}

                  {cardForm.photo && (
                    <div className="mt-4 rounded-xl bg-slate-50 p-4">
                      <div className="mb-2 text-sm font-semibold text-slate-700">
                        Captured ID Photo
                      </div>

                      <div className="flex flex-wrap items-start gap-4">
                        <img
                          src={cardForm.photo}
                          alt="Captured ID photo"
                          className="h-40 w-32 rounded-xl border border-slate-300 object-cover"
                        />

                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={openCamera}
                            disabled={!cardForm.holderId}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-100"
                          >
                            Retake Photo
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCardForm(
                                (current) => ({
                                  ...current,
                                  photo: "",
                                }),
                              )
                            }
                            className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                          >
                            Remove Photo
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <canvas
                    ref={canvasRef}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    ID Card Preview
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    The card below is generated from the central registration information and the ICT-captured photo.
                  </div>
                </div>

                <div className="mx-auto max-w-md overflow-hidden rounded-2xl border-2 border-slate-900 bg-white shadow-lg">
                  <div className="bg-slate-950 p-5 text-white">
                    <div className="text-xl font-black">
                      NEXUS UNIVERSITY
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-wider text-slate-300">
                      Official {cardForm.holderType} Identification Card
                    </div>
                  </div>

                  <div className="grid grid-cols-[120px_1fr] gap-5 p-5">
                    <div>
                      {cardForm.photo ? (
                        <img
                          src={cardForm.photo}
                          alt="ID preview"
                          className="h-36 w-28 rounded-lg border border-slate-300 object-cover"
                        />
                      ) : (
                        <div className="flex h-36 w-28 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-center text-xs text-slate-400">
                          Photo required
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="break-words text-lg font-black text-slate-900">
                        {cardForm.holderName ||
                          "Holder Name"}
                      </div>

                      <div className="mt-3 space-y-1.5 text-xs">
                        <div>
                          <span className="font-bold">
                            Holder ID:
                          </span>{" "}
                          {cardForm.holderId ||
                            "—"}
                        </div>

                        <div>
                          <span className="font-bold">
                            Faculty:
                          </span>{" "}
                          {cardForm.faculty ||
                            "—"}
                        </div>

                        <div>
                          <span className="font-bold">
                            Programme:
                          </span>{" "}
                          {cardForm.programme ||
                            "—"}
                        </div>

                        <div>
                          <span className="font-bold">
                            Year:
                          </span>{" "}
                          {cardForm.yearLevel ||
                            "—"}
                        </div>

                        <div>
                          <span className="font-bold">
                            Card:
                          </span>{" "}
                          {(() => {
                            const existing =
                              cards.find(
                                (item) =>
                                  item.holderId ===
                                    cardForm.holderId &&
                                  item.holderType ===
                                    cardForm.holderType,
                              )

                            return (
                              existing?.cardNumber ||
                              "New card"
                            )
                          })()}
                        </div>

                        <div>
                          <span className="font-bold">
                            Expiry:
                          </span>{" "}
                          {cardForm.expiryDate ||
                            "—"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
                    Issued by ICT Control Centre
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t p-5">
              <button
                type="button"
                onClick={() => {
                  stopCamera()
                  setShowCardModal(false)
                }}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveCard}
                disabled={
                  !cardForm.holderId ||
                  !cardForm.expiryDate ||
                  !cardForm.photo
                }
                className="rounded-lg bg-slate-950 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Issue / Update ID Card
              </button>
            </div>
          </div>
        </div>
      )}

      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b p-5">
              <h2 className="font-bold text-slate-900">
                Create Backup
              </h2>

              <button
                onClick={() =>
                  setShowBackupModal(false)
                }
                className="text-xl text-slate-400"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-5">
              <label className="block text-sm font-medium">
                Backup Name
                <input
                  value={backupForm.name}
                  onChange={(event) =>
                    setBackupForm({
                      ...backupForm,
                      name: event.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </label>

              <label className="block text-sm font-medium">
                Backup Type
                <select
                  value={backupForm.type}
                  onChange={(event) =>
                    setBackupForm({
                      ...backupForm,
                      type:
                        event.target
                          .value as Backup["type"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="Full">
                    Full System
                  </option>
                  <option value="Data">
                    Data Only
                  </option>
                  <option value="Configuration">
                    Configuration Only
                  </option>
                </select>
              </label>

              <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                The current front-end prototype records backup
                operations in local storage. During the final
                integration phase this will connect to the actual
                database backup and recovery service.
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t p-5">
              <button
                onClick={() =>
                  setShowBackupModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={createBackup}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white"
              >
                Create Backup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
