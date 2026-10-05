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

type Tab =
  | 'dashboard'
  | 'meals'
  | 'menu'
  | 'students'
  | 'staff'
  | 'reports'

type MealType = 'Breakfast' | 'Lunch' | 'Dinner'

type MealStatus = 'Served' | 'Missed' | 'Cancelled'

type Student = {
  id?: string
  studentId?: string
  name: string
  email?: string
  phone?: string
  faculty?: string
  department?: string
  programme?: string
  yearLevel?: string
  status?: string
}

type MealRecord = {
  id: string
  studentId: string
  studentName: string
  mealType: MealType
  date: string
  servedAt: string
  status: MealStatus
  servedBy: string
}

type MenuItem = {
  id: string
  date: string
  mealType: MealType
  mainMeal: string
  sideDish: string
  beverage: string
  notes: string
  status: 'Published' | 'Draft'
}

type CafeteriaStaff = {
  id: string
  staffId: string
  name: string
  role: 'Manager' | 'Cook' | 'Server' | 'Cashier' | 'Cleaner'
  phone: string
  status: 'Active' | 'Inactive'
  joinedDate: string
}

type MealForm = {
  studentId: string
  mealType: MealType
  date: string
  servedBy: string
  status: MealStatus
}

type MenuForm = {
  date: string
  mealType: MealType
  mainMeal: string
  sideDish: string
  beverage: string
  notes: string
  status: MenuItem['status']
}

type StaffForm = {
  staffId: string
  name: string
  role: CafeteriaStaff['role']
  phone: string
  joinedDate: string
}

const STORAGE = {
  students: NEXUS_KEYS.students,
  meals: 'nexusSIS_cafeteria_meals',
  menu: 'nexusSIS_cafeteria_menu',
  staff: 'nexusSIS_cafeteria_staff',
}

const defaultStudents: Student[] = [
  {
    id: 'student-1',
    studentId: 'NXS2600001',
    name: 'David Maima',
    email: 'david.maima@student.nexus.edu',
    phone: '70000001',
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
    phone: '70000002',
    faculty: 'Faculty of Business',
    department: 'Business',
    programme: 'Bachelor of Business',
    yearLevel: 'Year 1',
    status: 'Registered',
  },
]

const defaultMeals: MealRecord[] = [
  {
    id: 'meal-1',
    studentId: 'NXS2600001',
    studentName: 'David Maima',
    mealType: 'Breakfast',
    date: '2026-01-20',
    servedAt: '2026-01-20T07:35:00',
    status: 'Served',
    servedBy: 'Cafeteria Staff',
  },
  {
    id: 'meal-2',
    studentId: 'NXS2600001',
    studentName: 'David Maima',
    mealType: 'Lunch',
    date: '2026-01-20',
    servedAt: '2026-01-20T12:20:00',
    status: 'Served',
    servedBy: 'Cafeteria Staff',
  },
  {
    id: 'meal-3',
    studentId: 'NXS2600002',
    studentName: 'Mary Kila',
    mealType: 'Lunch',
    date: '2026-01-20',
    servedAt: '2026-01-20T12:25:00',
    status: 'Served',
    servedBy: 'Cafeteria Staff',
  },
]

const defaultMenu: MenuItem[] = [
  {
    id: 'menu-1',
    date: '2026-01-20',
    mealType: 'Breakfast',
    mainMeal: 'Porridge and Bread',
    sideDish: 'Boiled Egg',
    beverage: 'Tea',
    notes: '',
    status: 'Published',
  },
  {
    id: 'menu-2',
    date: '2026-01-20',
    mealType: 'Lunch',
    mainMeal: 'Rice and Chicken',
    sideDish: 'Mixed Vegetables',
    beverage: 'Juice',
    notes: '',
    status: 'Published',
  },
  {
    id: 'menu-3',
    date: '2026-01-20',
    mealType: 'Dinner',
    mainMeal: 'Rice and Beef',
    sideDish: 'Vegetables',
    beverage: 'Water',
    notes: '',
    status: 'Published',
  },
]

const defaultStaff: CafeteriaStaff[] = [
  {
    id: 'caf-staff-1',
    staffId: 'CAF001',
    name: 'Cafeteria Manager',
    role: 'Manager',
    phone: '70001001',
    status: 'Active',
    joinedDate: '2026-01-01',
  },
  {
    id: 'caf-staff-2',
    staffId: 'CAF002',
    name: 'Kitchen Staff',
    role: 'Cook',
    phone: '70001002',
    status: 'Active',
    joinedDate: '2026-01-05',
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

function centralStudentToCafeteriaStudent(
  student: CentralStudent
): Student {
  return {
    id: student.id,
    studentId: student.studentId,
    name: student.fullName,
    email: student.email,
    phone: student.phone,
    faculty: student.facultyName,
    department: student.departmentName,
    programme: student.programmeName,
    yearLevel: String(student.yearLevel),
    status: student.status,
  }
}

function readCafeteriaStudents(): Student[] {
  const central = readStorage<CentralStudent[]>(
    NEXUS_KEYS.students,
    [],
  )

  if (central.length > 0) {
    return central.map(centralStudentToCafeteriaStudent)
  }

  return readStorage<Student[]>(
    'nexusSIS_registered_students',
    defaultStudents,
  )
}

function getStudentId(student: Student) {
  return String(student.studentId ?? student.id ?? '')
}

function formatDate(value: string) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString()
}

function formatDateTime(value: string) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function csvEscape(value: unknown) {
  const text = String(value ?? '')
  return `"${text.replace(/"/g, '""')}"`
}

export default function CafeteriaPage() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')

  const [students, setStudents] = useState<Student[]>([])
  const [meals, setMeals] = useState<MealRecord[]>([])
  const [menu, setMenu] = useState<MenuItem[]>([])
  const [staff, setStaff] = useState<CafeteriaStaff[]>([])

  const [search, setSearch] = useState('')
  const [dateFilter, setDateFilter] = useState(today())
  const [mealFilter, setMealFilter] = useState<'All' | MealType>('All')
  const [statusFilter, setStatusFilter] = useState<'All' | MealStatus>('All')

  const [showMealModal, setShowMealModal] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showStaffModal, setShowStaffModal] = useState(false)

  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null)
  const [editingStaff, setEditingStaff] = useState<CafeteriaStaff | null>(null)

  const [mealForm, setMealForm] = useState<MealForm>({
    studentId: '',
    mealType: 'Lunch',
    date: today(),
    servedBy: '',
    status: 'Served',
  })

  const [menuForm, setMenuForm] = useState<MenuForm>({
    date: today(),
    mealType: 'Lunch',
    mainMeal: '',
    sideDish: '',
    beverage: '',
    notes: '',
    status: 'Published',
  })

  const [staffForm, setStaffForm] = useState<StaffForm>({
    staffId: '',
    name: '',
    role: 'Server',
    phone: '',
    joinedDate: today(),
  })

  useEffect(() => {
    protectNexusPage([
      "Mess Staff",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    setStudents(readCafeteriaStudents())

    const handleStudentsUpdated = () => {
      setStudents(readCafeteriaStudents())
    }

    window.addEventListener(
      'nexusSIS_students_updated',
      handleStudentsUpdated,
    )

    window.addEventListener(
      'storage',
      handleStudentsUpdated,
    )

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

    setMeals(
      readStorage<MealRecord[]>(
        STORAGE.meals,
        defaultMeals,
      ),
    )

    setMenu(
      readStorage<MenuItem[]>(
        STORAGE.menu,
        defaultMenu,
      ),
    )

    setStaff(
      readStorage<CafeteriaStaff[]>(
        STORAGE.staff,
        defaultStaff,
      ),
    )
  }, [])

  const activeStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          !student.status ||
          ['Registered', 'Active', 'Approved'].includes(student.status),
      ),
    [students],
  )

  const filteredMeals = useMemo(() => {
    const query = search.trim().toLowerCase()

    return meals.filter((meal) => {
      const matchesSearch =
        !query ||
        meal.studentId.toLowerCase().includes(query) ||
        meal.studentName.toLowerCase().includes(query) ||
        meal.servedBy.toLowerCase().includes(query)

      const matchesDate =
        !dateFilter || meal.date === dateFilter

      const matchesMeal =
        mealFilter === 'All' ||
        meal.mealType === mealFilter

      const matchesStatus =
        statusFilter === 'All' ||
        meal.status === statusFilter

      return (
        matchesSearch &&
        matchesDate &&
        matchesMeal &&
        matchesStatus
      )
    })
  }, [meals, search, dateFilter, mealFilter, statusFilter])

  const filteredMenu = useMemo(() => {
    const query = search.trim().toLowerCase()

    return menu.filter((item) => {
      const matchesSearch =
        !query ||
        item.mainMeal.toLowerCase().includes(query) ||
        item.sideDish.toLowerCase().includes(query) ||
        item.beverage.toLowerCase().includes(query)

      const matchesDate =
        !dateFilter || item.date === dateFilter

      const matchesMeal =
        mealFilter === 'All' ||
        item.mealType === mealFilter

      return (
        matchesSearch &&
        matchesDate &&
        matchesMeal
      )
    })
  }, [menu, search, dateFilter, mealFilter])

  const todayMeals = useMemo(
    () => meals.filter((meal) => meal.date === today()),
    [meals],
  )

  const servedToday = todayMeals.filter(
    (meal) => meal.status === 'Served',
  ).length

  const breakfastToday = todayMeals.filter(
    (meal) =>
      meal.mealType === 'Breakfast' &&
      meal.status === 'Served',
  ).length

  const lunchToday = todayMeals.filter(
    (meal) =>
      meal.mealType === 'Lunch' &&
      meal.status === 'Served',
  ).length

  const dinnerToday = todayMeals.filter(
    (meal) =>
      meal.mealType === 'Dinner' &&
      meal.status === 'Served',
  ).length

  const activeStaff = staff.filter(
    (item) => item.status === 'Active',
  ).length

  function getStudent(studentId: string) {
    return students.find(
      (student) => getStudentId(student) === studentId,
    )
  }

  function setTab(tab: Tab) {
    setActiveTab(tab)
    setSearch('')
    setMealFilter('All')
    setStatusFilter('All')
    setDateFilter(today())
  }

  function openMealModal() {
    const firstStudent = activeStudents[0]

    if (!firstStudent) {
      alert('No registered students are available.')
      return
    }

    setMealForm({
      studentId: getStudentId(firstStudent),
      mealType: 'Lunch',
      date: today(),
      servedBy:
        staff.find((item) => item.status === 'Active')?.name ?? '',
      status: 'Served',
    })

    setShowMealModal(true)
  }

  function saveMeal() {
    const student = getStudent(mealForm.studentId)

    if (!student) {
      alert('Please select a valid student.')
      return
    }

    const studentId = getStudentId(student)

    if (!studentId) {
      alert('Selected student does not have a Student ID.')
      return
    }

    if (!mealForm.date) {
      alert('Please select a meal date.')
      return
    }

    if (!mealForm.servedBy.trim()) {
      alert('Please enter the staff member serving the meal.')
      return
    }

    const alreadyRecorded = meals.some(
      (meal) =>
        meal.studentId === studentId &&
        meal.date === mealForm.date &&
        meal.mealType === mealForm.mealType &&
        meal.status === 'Served',
    )

    if (alreadyRecorded) {
      alert(
        `${student.name} already has a ${mealForm.mealType.toLowerCase()} record for this date.`,
      )
      return
    }

    const nextMeal: MealRecord = {
      id: `meal-${Date.now()}`,
      studentId,
      studentName: student.name,
      mealType: mealForm.mealType,
      date: mealForm.date,
      servedAt: new Date().toISOString(),
      status: mealForm.status,
      servedBy: mealForm.servedBy.trim(),
    }

    const nextMeals = [nextMeal, ...meals]

    setMeals(nextMeals)
    saveStorage(STORAGE.meals, nextMeals)
    setShowMealModal(false)
  }

  function updateMealStatus(
    meal: MealRecord,
    status: MealStatus,
  ) {
    const nextMeals: MealRecord[] = meals.map((item) =>
      item.id === meal.id
        ? {
            ...item,
            status,
          }
        : item,
    )

    setMeals(nextMeals)
    saveStorage(STORAGE.meals, nextMeals)
  }

  function deleteMeal(meal: MealRecord) {
    if (
      !window.confirm(
        `Delete the ${meal.mealType.toLowerCase()} record for ${meal.studentName}?`,
      )
    ) {
      return
    }

    const nextMeals = meals.filter(
      (item) => item.id !== meal.id,
    )

    setMeals(nextMeals)
    saveStorage(STORAGE.meals, nextMeals)
  }

  function openMenuModal(item?: MenuItem) {
    if (item) {
      setEditingMenu(item)

      setMenuForm({
        date: item.date,
        mealType: item.mealType,
        mainMeal: item.mainMeal,
        sideDish: item.sideDish,
        beverage: item.beverage,
        notes: item.notes,
        status: item.status,
      })
    } else {
      setEditingMenu(null)

      setMenuForm({
        date: today(),
        mealType: 'Lunch',
        mainMeal: '',
        sideDish: '',
        beverage: '',
        notes: '',
        status: 'Published',
      })
    }

    setShowMenuModal(true)
  }

  function saveMenu() {
    if (
      !menuForm.date ||
      !menuForm.mainMeal.trim()
    ) {
      alert('Date and main meal are required.')
      return
    }

    if (editingMenu) {
      const nextMenu: MenuItem[] = menu.map((item) =>
        item.id === editingMenu.id
          ? {
              ...item,
              date: menuForm.date,
              mealType: menuForm.mealType,
              mainMeal: menuForm.mainMeal.trim(),
              sideDish: menuForm.sideDish.trim(),
              beverage: menuForm.beverage.trim(),
              notes: menuForm.notes.trim(),
              status: menuForm.status,
            }
          : item,
      )

      setMenu(nextMenu)
      saveStorage(STORAGE.menu, nextMenu)
    } else {
      const nextItem: MenuItem = {
        id: `menu-${Date.now()}`,
        date: menuForm.date,
        mealType: menuForm.mealType,
        mainMeal: menuForm.mainMeal.trim(),
        sideDish: menuForm.sideDish.trim(),
        beverage: menuForm.beverage.trim(),
        notes: menuForm.notes.trim(),
        status: menuForm.status,
      }

      const nextMenu = [nextItem, ...menu]

      setMenu(nextMenu)
      saveStorage(STORAGE.menu, nextMenu)
    }

    setShowMenuModal(false)
    setEditingMenu(null)
  }

  function deleteMenu(item: MenuItem) {
    if (!window.confirm(`Delete ${item.mealType} menu for ${item.date}?`)) {
      return
    }

    const nextMenu = menu.filter(
      (menuItem) => menuItem.id !== item.id,
    )

    setMenu(nextMenu)
    saveStorage(STORAGE.menu, nextMenu)
  }

  function openStaffModal(item?: CafeteriaStaff) {
    if (item) {
      setEditingStaff(item)

      setStaffForm({
        staffId: item.staffId,
        name: item.name,
        role: item.role,
        phone: item.phone,
        joinedDate: item.joinedDate,
      })
    } else {
      setEditingStaff(null)

      setStaffForm({
        staffId: '',
        name: '',
        role: 'Server',
        phone: '',
        joinedDate: today(),
      })
    }

    setShowStaffModal(true)
  }

  function saveStaff() {
    const staffId = staffForm.staffId.trim()
    const name = staffForm.name.trim()

    if (!staffId || !name) {
      alert('Staff ID and name are required.')
      return
    }

    const duplicate = staff.some(
      (item) =>
        item.staffId.toLowerCase() === staffId.toLowerCase() &&
        item.id !== editingStaff?.id,
    )

    if (duplicate) {
      alert('That cafeteria Staff ID already exists.')
      return
    }

    if (editingStaff) {
      const nextStaff: CafeteriaStaff[] = staff.map(
        (item) =>
          item.id === editingStaff.id
            ? {
                ...item,
                staffId,
                name,
                role: staffForm.role,
                phone: staffForm.phone.trim(),
                joinedDate: staffForm.joinedDate,
              }
            : item,
      )

      setStaff(nextStaff)
      saveStorage(STORAGE.staff, nextStaff)
    } else {
      const nextStaffMember: CafeteriaStaff = {
        id: `caf-staff-${Date.now()}`,
        staffId,
        name,
        role: staffForm.role,
        phone: staffForm.phone.trim(),
        joinedDate: staffForm.joinedDate,
        status: 'Active',
      }

      const nextStaff = [nextStaffMember, ...staff]

      setStaff(nextStaff)
      saveStorage(STORAGE.staff, nextStaff)
    }

    setShowStaffModal(false)
    setEditingStaff(null)
  }

  function toggleStaffStatus(item: CafeteriaStaff) {
    const nextStatus: CafeteriaStaff['status'] =
      item.status === 'Active' ? 'Inactive' : 'Active'

    const nextStaff: CafeteriaStaff[] = staff.map(
      (staffItem) =>
        staffItem.id === item.id
          ? {
              ...staffItem,
              status: nextStatus,
            }
          : staffItem,
    )

    setStaff(nextStaff)
    saveStorage(STORAGE.staff, nextStaff)
  }

  function exportMeals() {
    const rows = [
      [
        'Date',
        'Student ID',
        'Student Name',
        'Meal',
        'Status',
        'Served At',
        'Served By',
      ],
      ...filteredMeals.map((meal) => [
        meal.date,
        meal.studentId,
        meal.studentName,
        meal.mealType,
        meal.status,
        meal.servedAt,
        meal.servedBy,
      ]),
    ]

    downloadCsv('nexus-cafeteria-meals.csv', rows)
  }

  function exportMenu() {
    const rows = [
      [
        'Date',
        'Meal',
        'Main Meal',
        'Side Dish',
        'Beverage',
        'Notes',
        'Status',
      ],
      ...filteredMenu.map((item) => [
        item.date,
        item.mealType,
        item.mainMeal,
        item.sideDish,
        item.beverage,
        item.notes,
        item.status,
      ]),
    ]

    downloadCsv('nexus-cafeteria-menu.csv', rows)
  }

  function exportStudents() {
    const rows = [
      [
        'Student ID',
        'Name',
        'Faculty',
        'Department',
        'Programme',
        'Year Level',
      ],
      ...activeStudents.map((student) => [
        getStudentId(student),
        student.name,
        student.faculty,
        student.department,
        student.programme,
        student.yearLevel,
      ]),
    ]

    downloadCsv('nexus-cafeteria-students.csv', rows)
  }

  function exportStaff() {
    const rows = [
      [
        'Staff ID',
        'Name',
        'Role',
        'Phone',
        'Status',
        'Joined Date',
      ],
      ...staff.map((item) => [
        item.staffId,
        item.name,
        item.role,
        item.phone,
        item.status,
        item.joinedDate,
      ]),
    ]

    downloadCsv('nexus-cafeteria-staff.csv', rows)
  }

  function exportDailyReport() {
    const selectedDate = dateFilter || today()

    const dailyMeals = meals.filter(
      (meal) => meal.date === selectedDate,
    )

    const rows = [
      ['NEXUS SIS CAFETERIA DAILY REPORT'],
      [`Date: ${selectedDate}`],
      [],
      [
        'Student ID',
        'Student Name',
        'Meal',
        'Status',
        'Served By',
      ],
      ...dailyMeals.map((meal) => [
        meal.studentId,
        meal.studentName,
        meal.mealType,
        meal.status,
        meal.servedBy,
      ]),
      [],
      ['Breakfast Served', dailyMeals.filter(
        (meal) =>
          meal.mealType === 'Breakfast' &&
          meal.status === 'Served',
      ).length],
      ['Lunch Served', dailyMeals.filter(
        (meal) =>
          meal.mealType === 'Lunch' &&
          meal.status === 'Served',
      ).length],
      ['Dinner Served', dailyMeals.filter(
        (meal) =>
          meal.mealType === 'Dinner' &&
          meal.status === 'Served',
      ).length],
      ['Total Served', dailyMeals.filter(
        (meal) => meal.status === 'Served',
      ).length],
    ]

    downloadCsv('nexus-cafeteria-daily-report.csv', rows)
  }

  function downloadCsv(filename: string, rows: unknown[][]) {
    const csv = rows
      .map((row) =>
        row.map((cell) => csvEscape(cell)).join(','),
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

  function signOut() {
    clearNexusSession()
    window.location.href = '/dashboard'
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
                Cafeteria & Mess Management
              </h1>

              <p className="mt-1 text-sm text-slate-300">
                Student meals, menu planning, cafeteria staff and meal reports.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/admin/students"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Students
              </Link>

              <Link
                href="/admin/bursary"
                className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10"
              >
                Bursary
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
          <StatCard
            label="Meals Served Today"
            value={servedToday}
            icon="🍽️"
          />

          <StatCard
            label="Breakfast"
            value={breakfastToday}
            icon="🌅"
          />

          <StatCard
            label="Lunch"
            value={lunchToday}
            icon="☀️"
          />

          <StatCard
            label="Dinner"
            value={dinnerToday}
            icon="🌙"
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
              active={activeTab === 'meals'}
              onClick={() => setTab('meals')}
            >
              Meal Records
            </TabButton>

            <TabButton
              active={activeTab === 'menu'}
              onClick={() => setTab('menu')}
            >
              Menu
            </TabButton>

            <TabButton
              active={activeTab === 'students'}
              onClick={() => setTab('students')}
            >
              Students
            </TabButton>

            <TabButton
              active={activeTab === 'staff'}
              onClick={() => setTab('staff')}
            >
              Staff
            </TabButton>

            <TabButton
              active={activeTab === 'reports'}
              onClick={() => setTab('reports')}
            >
              Reports
            </TabButton>
          </div>

          <div className="p-6">
            {activeTab === 'dashboard' && (
              <DashboardView
                students={students}
                meals={meals}
                menu={menu}
                staff={staff}
                setTab={setTab}
              />
            )}

            {activeTab !== 'dashboard' && (
              <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-1 flex-col gap-3 sm:flex-row">
                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(event.target.value)
                    }
                    placeholder="Search..."
                    className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {(activeTab === 'meals' ||
                    activeTab === 'menu' ||
                    activeTab === 'reports') && (
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(event) =>
                        setDateFilter(event.target.value)
                      }
                      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                    />
                  )}

                  {(activeTab === 'meals' ||
                    activeTab === 'menu') && (
                    <select
                      value={mealFilter}
                      onChange={(event) =>
                        setMealFilter(
                          event.target.value as
                            | 'All'
                            | MealType,
                        )
                      }
                      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none"
                    >
                      <option value="All">All Meals</option>
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                    </select>
                  )}

                  {activeTab === 'meals' && (
                    <select
                      value={statusFilter}
                      onChange={(event) =>
                        setStatusFilter(
                          event.target.value as
                            | 'All'
                            | MealStatus,
                        )
                      }
                      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Served">Served</option>
                      <option value="Missed">Missed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeTab === 'meals' && (
                    <>
                      <button
                        onClick={openMealModal}
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        + Record Meal
                      </button>

                      <button
                        onClick={exportMeals}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      >
                        Export
                      </button>
                    </>
                  )}

                  {activeTab === 'menu' && (
                    <>
                      <button
                        onClick={() => openMenuModal()}
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        + Add Menu
                      </button>

                      <button
                        onClick={exportMenu}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      >
                        Export
                      </button>
                    </>
                  )}

                  {activeTab === 'students' && (
                    <button
                      onClick={exportStudents}
                      className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                    >
                      Export Students
                    </button>
                  )}

                  {activeTab === 'staff' && (
                    <>
                      <button
                        onClick={() => openStaffModal()}
                        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        + Add Staff
                      </button>

                      <button
                        onClick={exportStaff}
                        className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
                      >
                        Export
                      </button>
                    </>
                  )}

                  {activeTab === 'reports' && (
                    <button
                      onClick={exportDailyReport}
                      className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Export Daily Report
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'meals' && (
              <MealsView
                meals={filteredMeals}
                onStatusChange={updateMealStatus}
                onDelete={deleteMeal}
              />
            )}

            {activeTab === 'menu' && (
              <MenuView
                menu={filteredMenu}
                onEdit={openMenuModal}
                onDelete={deleteMenu}
              />
            )}

            {activeTab === 'students' && (
              <StudentsView
                students={activeStudents.filter((student) => {
                  const query = search.trim().toLowerCase()

                  return (
                    !query ||
                    getStudentId(student)
                      .toLowerCase()
                      .includes(query) ||
                    student.name.toLowerCase().includes(query) ||
                    String(student.programme ?? '')
                      .toLowerCase()
                      .includes(query)
                  )
                })}
                meals={meals}
              />
            )}

            {activeTab === 'staff' && (
              <StaffView
                staff={staff.filter((item) => {
                  const query = search.trim().toLowerCase()

                  return (
                    !query ||
                    item.staffId.toLowerCase().includes(query) ||
                    item.name.toLowerCase().includes(query) ||
                    item.role.toLowerCase().includes(query)
                  )
                })}
                onEdit={openStaffModal}
                onToggle={toggleStaffStatus}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                meals={meals}
                students={students}
                menu={menu}
                selectedDate={dateFilter || today()}
              />
            )}
          </div>
        </div>
      </div>

      {showMealModal && (
        <Modal
          title="Record Student Meal"
          onClose={() => setShowMealModal(false)}
        >
          <div className="space-y-4">
            <Field label="Student">
              <select
                value={mealForm.studentId}
                onChange={(event) =>
                  setMealForm((current) => ({
                    ...current,
                    studentId: event.target.value,
                  }))
                }
                className="input"
              >
                {activeStudents.map((student) => (
                  <option
                    key={getStudentId(student)}
                    value={getStudentId(student)}
                  >
                    {getStudentId(student)} - {student.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Meal">
                <select
                  value={mealForm.mealType}
                  onChange={(event) =>
                    setMealForm((current) => ({
                      ...current,
                      mealType:
                        event.target.value as MealType,
                    }))
                  }
                  className="input"
                >
                  <option>Breakfast</option>
                  <option>Lunch</option>
                  <option>Dinner</option>
                </select>
              </Field>

              <Field label="Date">
                <input
                  type="date"
                  value={mealForm.date}
                  onChange={(event) =>
                    setMealForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="input"
                />
              </Field>
            </div>

            <Field label="Served By">
              <input
                value={mealForm.servedBy}
                onChange={(event) =>
                  setMealForm((current) => ({
                    ...current,
                    servedBy: event.target.value,
                  }))
                }
                className="input"
                placeholder="Cafeteria staff name"
              />
            </Field>

            <Field label="Status">
              <select
                value={mealForm.status}
                onChange={(event) =>
                  setMealForm((current) => ({
                    ...current,
                    status:
                      event.target.value as MealStatus,
                  }))
                }
                className="input"
              >
                <option>Served</option>
                <option>Missed</option>
                <option>Cancelled</option>
              </select>
            </Field>

            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
              The meal record is linked to the student's central Student ID.
            </div>

            <ModalButtons
              onClose={() => setShowMealModal(false)}
              onSave={saveMeal}
              saveText="Record Meal"
            />
          </div>
        </Modal>
      )}

      {showMenuModal && (
        <Modal
          title={editingMenu ? 'Edit Menu' : 'Add Menu'}
          onClose={() => setShowMenuModal(false)}
        >
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Date">
                <input
                  type="date"
                  value={menuForm.date}
                  onChange={(event) =>
                    setMenuForm((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  className="input"
                />
              </Field>

              <Field label="Meal">
                <select
                  value={menuForm.mealType}
                  onChange={(event) =>
                    setMenuForm((current) => ({
                      ...current,
                      mealType:
                        event.target.value as MealType,
                    }))
                  }
                  className="input"
                >
                  <option>Breakfast</option>
                  <option>Lunch</option>
                  <option>Dinner</option>
                </select>
              </Field>
            </div>

            <Field label="Main Meal">
              <input
                value={menuForm.mainMeal}
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    mainMeal: event.target.value,
                  }))
                }
                className="input"
                placeholder="e.g. Rice and Chicken"
              />
            </Field>

            <Field label="Side Dish">
              <input
                value={menuForm.sideDish}
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    sideDish: event.target.value,
                  }))
                }
                className="input"
                placeholder="e.g. Mixed Vegetables"
              />
            </Field>

            <Field label="Beverage">
              <input
                value={menuForm.beverage}
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    beverage: event.target.value,
                  }))
                }
                className="input"
                placeholder="e.g. Juice"
              />
            </Field>

            <Field label="Notes">
              <textarea
                value={menuForm.notes}
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className="input min-h-24"
                placeholder="Optional menu notes..."
              />
            </Field>

            <Field label="Status">
              <select
                value={menuForm.status}
                onChange={(event) =>
                  setMenuForm((current) => ({
                    ...current,
                    status:
                      event.target.value as MenuItem['status'],
                  }))
                }
                className="input"
              >
                <option>Published</option>
                <option>Draft</option>
              </select>
            </Field>

            <ModalButtons
              onClose={() => setShowMenuModal(false)}
              onSave={saveMenu}
              saveText={editingMenu ? 'Save Changes' : 'Add Menu'}
            />
          </div>
        </Modal>
      )}

      {showStaffModal && (
        <Modal
          title={editingStaff ? 'Edit Cafeteria Staff' : 'Add Cafeteria Staff'}
          onClose={() => setShowStaffModal(false)}
        >
          <div className="space-y-4">
            <Field label="Staff ID">
              <input
                value={staffForm.staffId}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    staffId: event.target.value,
                  }))
                }
                className="input"
                placeholder="CAF003"
              />
            </Field>

            <Field label="Full Name">
              <input
                value={staffForm.name}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="input"
                placeholder="Staff name"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role">
                <select
                  value={staffForm.role}
                  onChange={(event) =>
                    setStaffForm((current) => ({
                      ...current,
                      role:
                        event.target.value as CafeteriaStaff['role'],
                    }))
                  }
                  className="input"
                >
                  <option>Manager</option>
                  <option>Cook</option>
                  <option>Server</option>
                  <option>Cashier</option>
                  <option>Cleaner</option>
                </select>
              </Field>

              <Field label="Phone">
                <input
                  value={staffForm.phone}
                  onChange={(event) =>
                    setStaffForm((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className="input"
                  placeholder="Phone number"
                />
              </Field>
            </div>

            <Field label="Joined Date">
              <input
                type="date"
                value={staffForm.joinedDate}
                onChange={(event) =>
                  setStaffForm((current) => ({
                    ...current,
                    joinedDate: event.target.value,
                  }))
                }
                className="input"
              />
            </Field>

            <ModalButtons
              onClose={() => setShowStaffModal(false)}
              onSave={saveStaff}
              saveText={editingStaff ? 'Save Changes' : 'Add Staff'}
            />
          </div>
        </Modal>
      )}
    </main>
  )
}

function DashboardView({
  students,
  meals,
  menu,
  staff,
  setTab,
}: {
  students: Student[]
  meals: MealRecord[]
  menu: MenuItem[]
  staff: CafeteriaStaff[]
  setTab: (tab: Tab) => void
}) {
  const date = today()

  const todayMeals = meals.filter(
    (meal) => meal.date === date,
  )

  const publishedMenu = menu.filter(
    (item) =>
      item.date === date &&
      item.status === 'Published',
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Cafeteria Dashboard
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Daily student meal and cafeteria operations overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <QuickCard
          title="Record Meal"
          description="Record breakfast, lunch or dinner against a central Student ID."
          button="Record Meal"
          onClick={() => setTab('meals')}
        />

        <QuickCard
          title="Daily Menu"
          description="Manage breakfast, lunch and dinner menus for students."
          button="Manage Menu"
          onClick={() => setTab('menu')}
        />

        <QuickCard
          title="Cafeteria Staff"
          description="Manage cafeteria managers, cooks, servers and other staff."
          button="Manage Staff"
          onClick={() => setTab('staff')}
        />

        <QuickCard
          title="Student Meal History"
          description="Review meal attendance and student consumption records."
          button="View Students"
          onClick={() => setTab('students')}
        />

        <QuickCard
          title="Daily Reports"
          description="Review daily meal counts and operational statistics."
          button="Open Reports"
          onClick={() => setTab('reports')}
        />

        <QuickCard
          title="Central Student System"
          description="Student records are read from the Nexus central registration store."
          button="Student Records"
          onClick={() => setTab('students')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-bold text-slate-900">
              Today's Menu
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {publishedMenu.length === 0 ? (
              <EmptyState message="No published menu for today." />
            ) : (
              publishedMenu.map((item) => (
                <div
                  key={item.id}
                  className="px-5 py-4"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-blue-700">
                      {item.mealType}
                    </p>

                    <span className="text-xs text-slate-400">
                      {item.date}
                    </span>
                  </div>

                  <p className="mt-2 font-semibold text-slate-900">
                    {item.mainMeal}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.sideDish || 'No side dish listed'}
                    {' · '}
                    {item.beverage || 'No beverage listed'}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-bold text-slate-900">
              Today's Meal Activity
            </h3>
          </div>

          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <ActivityBox
              label="Registered Students"
              value={students.length}
            />

            <ActivityBox
              label="Meals Recorded"
              value={todayMeals.length}
            />

            <ActivityBox
              label="Meals Served"
              value={
                todayMeals.filter(
                  (meal) => meal.status === 'Served',
                ).length
              }
            />

            <ActivityBox
              label="Active Staff"
              value={
                staff.filter(
                  (item) => item.status === 'Active',
                ).length
              }
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
        <h3 className="font-bold text-blue-900">
          Central Student Integration
        </h3>

        <p className="mt-2 text-sm leading-6 text-blue-800">
          Cafeteria records use the central Student ID created by Student
          Registration. In the final database architecture, this same Student
          ID will connect cafeteria services with Bursary, Library,
          Accommodation, LMS, Student Affairs and the other university
          services.
        </p>
      </div>
    </div>
  )
}

function MealsView({
  meals,
  onStatusChange,
  onDelete,
}: {
  meals: MealRecord[]
  onStatusChange: (
    meal: MealRecord,
    status: MealStatus,
  ) => void
  onDelete: (meal: MealRecord) => void
}) {
  if (meals.length === 0) {
    return <EmptyState message="No meal records found." />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Date</th>
            <th className="px-5 py-3">Student ID</th>
            <th className="px-5 py-3">Student</th>
            <th className="px-5 py-3">Meal</th>
            <th className="px-5 py-3">Served At</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Served By</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {meals.map((meal) => (
            <tr
              key={meal.id}
              className="hover:bg-slate-50"
            >
              <td className="px-5 py-4 text-slate-600">
                {formatDate(meal.date)}
              </td>

              <td className="px-5 py-4 font-mono text-xs font-semibold text-blue-700">
                {meal.studentId}
              </td>

              <td className="px-5 py-4 font-semibold text-slate-800">
                {meal.studentName}
              </td>

              <td className="px-5 py-4">
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {meal.mealType}
                </span>
              </td>

              <td className="px-5 py-4 text-xs text-slate-500">
                {formatDateTime(meal.servedAt)}
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  status={meal.status}
                  active={meal.status === 'Served'}
                />
              </td>

              <td className="px-5 py-4 text-slate-600">
                {meal.servedBy}
              </td>

              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <select
                    value={meal.status}
                    onChange={(event) =>
                      onStatusChange(
                        meal,
                        event.target.value as MealStatus,
                      )
                    }
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-xs"
                  >
                    <option>Served</option>
                    <option>Missed</option>
                    <option>Cancelled</option>
                  </select>

                  <button
                    onClick={() => onDelete(meal)}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
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

function MenuView({
  menu,
  onEdit,
  onDelete,
}: {
  menu: MenuItem[]
  onEdit: (item: MenuItem) => void
  onDelete: (item: MenuItem) => void
}) {
  if (menu.length === 0) {
    return <EmptyState message="No menu records found." />
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {menu.map((item) => (
        <div
          key={item.id}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-blue-600">
                {item.mealType}
              </p>

              <h3 className="mt-1 text-lg font-bold text-slate-900">
                {item.mainMeal}
              </h3>
            </div>

            <StatusBadge
              status={item.status}
              active={item.status === 'Published'}
            />
          </div>

          <p className="mt-2 text-sm font-medium text-slate-500">
            {formatDate(item.date)}
          </p>

          <div className="mt-4 space-y-2 text-sm">
            <p>
              <span className="font-semibold text-slate-700">
                Side:
              </span>{' '}
              {item.sideDish || '-'}
            </p>

            <p>
              <span className="font-semibold text-slate-700">
                Beverage:
              </span>{' '}
              {item.beverage || '-'}
            </p>

            {item.notes && (
              <p className="rounded-lg bg-slate-50 p-3 text-slate-600">
                {item.notes}
              </p>
            )}
          </div>

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => onEdit(item)}
              className="rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
            >
              Edit
            </button>

            <button
              onClick={() => onDelete(item)}
              className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function StudentsView({
  students,
  meals,
}: {
  students: Student[]
  meals: MealRecord[]
}) {
  if (students.length === 0) {
    return <EmptyState message="No registered students found." />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Student ID</th>
            <th className="px-5 py-3">Name</th>
            <th className="px-5 py-3">Faculty</th>
            <th className="px-5 py-3">Programme</th>
            <th className="px-5 py-3">Year</th>
            <th className="px-5 py-3">Meals Served</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {students.map((student) => {
            const studentId = getStudentId(student)

            const studentMeals = meals.filter(
              (meal) =>
                meal.studentId === studentId &&
                meal.status === 'Served',
            ).length

            return (
              <tr
                key={studentId}
                className="hover:bg-slate-50"
              >
                <td className="px-5 py-4 font-mono text-xs font-bold text-blue-700">
                  {studentId}
                </td>

                <td className="px-5 py-4 font-semibold text-slate-800">
                  {student.name}
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {student.faculty || '-'}
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {student.programme || '-'}
                </td>

                <td className="px-5 py-4 text-slate-600">
                  {student.yearLevel || '-'}
                </td>

                <td className="px-5 py-4 font-bold text-slate-800">
                  {studentMeals}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StaffView({
  staff,
  onEdit,
  onToggle,
}: {
  staff: CafeteriaStaff[]
  onEdit: (item: CafeteriaStaff) => void
  onToggle: (item: CafeteriaStaff) => void
}) {
  if (staff.length === 0) {
    return <EmptyState message="No cafeteria staff found." />
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-5 py-3">Staff ID</th>
            <th className="px-5 py-3">Name</th>
            <th className="px-5 py-3">Role</th>
            <th className="px-5 py-3">Phone</th>
            <th className="px-5 py-3">Joined</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Actions</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {staff.map((item) => (
            <tr
              key={item.id}
              className="hover:bg-slate-50"
            >
              <td className="px-5 py-4 font-mono text-xs font-bold text-blue-700">
                {item.staffId}
              </td>

              <td className="px-5 py-4 font-semibold text-slate-800">
                {item.name}
              </td>

              <td className="px-5 py-4 text-slate-600">
                {item.role}
              </td>

              <td className="px-5 py-4 text-slate-600">
                {item.phone || '-'}
              </td>

              <td className="px-5 py-4 text-slate-500">
                {formatDate(item.joinedDate)}
              </td>

              <td className="px-5 py-4">
                <StatusBadge
                  status={item.status}
                  active={item.status === 'Active'}
                />
              </td>

              <td className="px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => onToggle(item)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                  >
                    {item.status === 'Active'
                      ? 'Deactivate'
                      : 'Activate'}
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

function ReportsView({
  meals,
  students,
  menu,
  selectedDate,
}: {
  meals: MealRecord[]
  students: Student[]
  menu: MenuItem[]
  selectedDate: string
}) {
  const dailyMeals = meals.filter(
    (meal) => meal.date === selectedDate,
  )

  const served = dailyMeals.filter(
    (meal) => meal.status === 'Served',
  )

  const breakfast = served.filter(
    (meal) => meal.mealType === 'Breakfast',
  ).length

  const lunch = served.filter(
    (meal) => meal.mealType === 'Lunch',
  ).length

  const dinner = served.filter(
    (meal) => meal.mealType === 'Dinner',
  ).length

  const uniqueStudents = new Set(
    served.map((meal) => meal.studentId),
  ).size

  const menuCount = menu.filter(
    (item) =>
      item.date === selectedDate &&
      item.status === 'Published',
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Cafeteria Reports
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Daily operational report for {selectedDate}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReportCard
          label="Breakfast Served"
          value={breakfast}
        />

        <ReportCard
          label="Lunch Served"
          value={lunch}
        />

        <ReportCard
          label="Dinner Served"
          value={dinner}
        />

        <ReportCard
          label="Students Served"
          value={uniqueStudents}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-slate-900">
            Daily Summary
          </h3>

          <div className="mt-4 space-y-3">
            <SummaryRow
              label="Total Registered Students"
              value={students.length}
            />

            <SummaryRow
              label="Total Meal Records"
              value={dailyMeals.length}
            />

            <SummaryRow
              label="Total Meals Served"
              value={served.length}
            />

            <SummaryRow
              label="Missed Meals"
              value={
                dailyMeals.filter(
                  (meal) => meal.status === 'Missed',
                ).length
              }
            />

            <SummaryRow
              label="Cancelled Meals"
              value={
                dailyMeals.filter(
                  (meal) => meal.status === 'Cancelled',
                ).length
              }
            />

            <SummaryRow
              label="Published Menu Items"
              value={menuCount}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-bold text-slate-900">
            Meal Distribution
          </h3>

          <div className="mt-5 space-y-5">
            <ProgressRow
              label="Breakfast"
              value={breakfast}
              total={served.length}
            />

            <ProgressRow
              label="Lunch"
              value={lunch}
              total={served.length}
            />

            <ProgressRow
              label="Dinner"
              value={dinner}
              total={served.length}
            />
          </div>
        </div>
      </div>
    </div>
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
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-3xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">
          {icon}
        </div>
      </div>
    </div>
  )
}

function ActivityBox({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value}
      </p>
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
      <h3 className="font-bold text-slate-900">
        {title}
      </h3>

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

function ReportCard({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  )
}

function SummaryRow({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
      <span className="text-sm text-slate-600">
        {label}
      </span>

      <span className="font-bold text-slate-900">
        {value}
      </span>
    </div>
  )
}

function ProgressRow({
  label,
  value,
  total,
}: {
  label: string
  value: number
  total: number
}) {
  const percentage =
    total > 0 ? Math.round((value / total) * 100) : 0

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">
          {label}
        </span>

        <span className="font-semibold text-slate-900">
          {value} ({percentage}%)
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${percentage}%` }}
        />
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
          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
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

function EmptyState({
  message,
}: {
  message: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-500">
        {message}
      </p>
    </div>
  )
}
