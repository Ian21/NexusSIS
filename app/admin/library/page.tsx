'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  clearNexusSession,
  protectNexusPage,
} from "@/lib/nexus-access"
import {
  NEXUS_KEYS,
  type CentralStudent,
  type StudentClearance,
} from "@/lib/nexus-data"

type BookStatus = 'Available' | 'Issued' | 'Lost' | 'Damaged'
type LoanStatus = 'Issued' | 'Returned' | 'Overdue' | 'Lost' | 'Damaged'

type Student = {
  id?: string
  studentId?: string
  name?: string
  programme?: string
  faculty?: string
  department?: string
}

type Book = {
  id: string
  isbn: string
  title: string
  author: string
  category: string
  publisher: string
  year: string
  copies: number
  availableCopies: number
  status: BookStatus
}

type Loan = {
  id: string
  bookId: string
  studentId: string
  studentName: string
  bookTitle: string
  issueDate: string
  dueDate: string
  returnDate: string
  status: LoanStatus
  fine: number
}

type LibrarySettings = {
  loanDays: number
  finePerDay: number
}

type Tab = 'catalogue' | 'loans' | 'students' | 'clearance'

const BOOKS_KEY = 'nexusSIS_library_books'
const LOANS_KEY = 'nexusSIS_library_loans'
const STUDENTS_KEY = NEXUS_KEYS.students
const LEGACY_STUDENTS_KEY = 'nexusSIS_registered_students'
const SETTINGS_KEY = 'nexusSIS_library_settings'

const defaultBooks: Book[] = [
  {
    id: 'LIB-001',
    isbn: '9780131103627',
    title: 'The C Programming Language',
    author: 'Brian W. Kernighan & Dennis M. Ritchie',
    category: 'Computer Science',
    publisher: 'Prentice Hall',
    year: '1988',
    copies: 8,
    availableCopies: 6,
    status: 'Available',
  },
  {
    id: 'LIB-002',
    isbn: '9780262033848',
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen et al.',
    category: 'Computer Science',
    publisher: 'MIT Press',
    year: '2009',
    copies: 10,
    availableCopies: 8,
    status: 'Available',
  },
  {
    id: 'LIB-003',
    isbn: '9780073523323',
    title: 'Engineering Mechanics',
    author: 'J. L. Meriam',
    category: 'Engineering',
    publisher: 'McGraw-Hill',
    year: '2015',
    copies: 7,
    availableCopies: 5,
    status: 'Available',
  },
  {
    id: 'LIB-004',
    isbn: '9780134494166',
    title: 'Financial Accounting',
    author: 'Jerry J. Weygandt',
    category: 'Business & Economics',
    publisher: 'Wiley',
    year: '2018',
    copies: 9,
    availableCopies: 7,
    status: 'Available',
  },
  {
    id: 'LIB-005',
    isbn: '9780323477996',
    title: 'Medical-Surgical Nursing',
    author: 'Sharon Lewis et al.',
    category: 'Medicine & Health Sciences',
    publisher: 'Elsevier',
    year: '2017',
    copies: 6,
    availableCopies: 4,
    status: 'Available',
  },
]

const defaultLoans: Loan[] = [
  {
    id: 'LOAN-001',
    bookId: 'LIB-001',
    studentId: 'NXS2600001',
    studentName: 'David Maima',
    bookTitle: 'The C Programming Language',
    issueDate: '2026-09-20',
    dueDate: '2026-10-04',
    returnDate: '',
    status: 'Issued',
    fine: 0,
  },
  {
    id: 'LOAN-002',
    bookId: 'LIB-002',
    studentId: 'NXS2600002',
    studentName: 'Mary Kila',
    bookTitle: 'Introduction to Algorithms',
    issueDate: '2026-09-10',
    dueDate: '2026-09-24',
    returnDate: '',
    status: 'Overdue',
    fine: 0,
  },
]

const defaultSettings: LibrarySettings = {
  loanDays: 14,
  finePerDay: 2,
}

function centralStudentToLibraryStudent(
  student: CentralStudent
): Student {
  return {
    id: student.id,
    studentId: student.studentId,
    name: student.fullName,
    programme: student.programmeName,
    faculty: student.facultyName,
    department: student.departmentName,
  }
}

function readCentralLibraryStudents(): Student[] {
  const centralRaw = localStorage.getItem(NEXUS_KEYS.students)

  try {
    const central = centralRaw
      ? JSON.parse(centralRaw) as CentralStudent[]
      : []

    if (Array.isArray(central) && central.length > 0) {
      return central.map(centralStudentToLibraryStudent)
    }
  } catch {
    // Fall through to legacy student storage.
  }

  try {
    const legacyRaw = localStorage.getItem(
      LEGACY_STUDENTS_KEY
    )

    const legacy = legacyRaw
      ? JSON.parse(legacyRaw) as Student[]
      : []

    return Array.isArray(legacy) ? legacy : []
  } catch {
    return []
  }
}

function todayString() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00`)
  value.setDate(value.getDate() + days)
  return value.toISOString().slice(0, 10)
}

function formatPGK(amount: number) {
  return `PGK ${amount.toFixed(2)}`
}

function getStudentId(student: Student) {
  return String(student.studentId || student.id || '').trim()
}

function updateCentralLibraryClearance(
  studentId: string,
  currentLoans: Loan[],
  finePerDay: number
) {
  const normalizedStudentId = studentId.trim().toLowerCase()

  if (!normalizedStudentId) {
    return
  }

  let clearances: StudentClearance[] = []

  try {
    const raw = localStorage.getItem(NEXUS_KEYS.clearances)
    const parsed = raw ? JSON.parse(raw) : []

    clearances = Array.isArray(parsed) ? parsed : []
  } catch {
    clearances = []
  }

  const studentLoans = currentLoans.filter(
    (loan) =>
      loan.studentId.trim().toLowerCase() ===
        normalizedStudentId &&
      loan.status !== 'Returned'
  )

  const outstandingFine = studentLoans.reduce(
    (sum, loan) =>
      sum + calculateFine(loan, finePerDay),
    0
  )

  const libraryClear =
    studentLoans.length === 0 &&
    outstandingFine <= 0

  const existingIndex = clearances.findIndex(
    (clearance) =>
      clearance.studentId.trim().toLowerCase() ===
      normalizedStudentId
  )

  const now = new Date().toISOString()

  if (existingIndex >= 0) {
    clearances[existingIndex] = {
      ...clearances[existingIndex],
      library: libraryClear,
      libraryDate: now,
      updatedAt: now,
    }
  } else {
    clearances.push({
      id: `CLR-${Date.now()}-${studentId}`,
      studentId,
      academic: false,
      finance: false,
      library: libraryClear,
      dormitory: false,
      department: false,
      registrar: false,
      libraryDate: now,
      graduationEligible: false,
      updatedAt: now,
    })
  }

  localStorage.setItem(
    NEXUS_KEYS.clearances,
    JSON.stringify(clearances)
  )

  window.dispatchEvent(
    new CustomEvent('nexusSIS_clearances_updated')
  )
}

function calculateFine(loan: Loan, finePerDay: number) {
  if (loan.status === 'Returned' || loan.status === 'Lost' || loan.status === 'Damaged') {
    return loan.fine
  }

  const today = new Date(`${todayString()}T00:00:00`)
  const due = new Date(`${loan.dueDate}T00:00:00`)
  const difference = Math.floor((today.getTime() - due.getTime()) / 86400000)

  return difference > 0 ? difference * finePerDay : 0
}

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([])
  const [loans, setLoans] = useState<Loan[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [settings, setSettings] = useState<LibrarySettings>(defaultSettings)

  const [activeTab, setActiveTab] = useState<Tab>('catalogue')
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [loanFilter, setLoanFilter] = useState('All')
  const [studentSearch, setStudentSearch] = useState('')

  const [showBookModal, setShowBookModal] = useState(false)
  const [showIssueModal, setShowIssueModal] = useState(false)
  const [showBookDetails, setShowBookDetails] = useState<Book | null>(null)
  const [showStudentDetails, setShowStudentDetails] = useState<Student | null>(null)

  const [editingBook, setEditingBook] = useState<Book | null>(null)

  const [bookForm, setBookForm] = useState({
    isbn: '',
    title: '',
    author: '',
    category: 'Computer Science',
    publisher: '',
    year: String(new Date().getFullYear()),
    copies: '1',
  })

  const [issueForm, setIssueForm] = useState({
    bookId: '',
    studentId: '',
  })

  useEffect(() => {
    protectNexusPage([
      "Librarian",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    try {
      const storedBooks = localStorage.getItem(BOOKS_KEY)
      const storedLoans = localStorage.getItem(LOANS_KEY)
      const storedSettings = localStorage.getItem(SETTINGS_KEY)

      setBooks(storedBooks ? JSON.parse(storedBooks) : defaultBooks)
      setLoans(storedLoans ? JSON.parse(storedLoans) : defaultLoans)
      setStudents(readCentralLibraryStudents())
      setSettings(storedSettings ? JSON.parse(storedSettings) : defaultSettings)
    } catch {
      setBooks(defaultBooks)
      setLoans(defaultLoans)
      setStudents([])
      setSettings(defaultSettings)
    }
  }, [])

  useEffect(() => {
    if (books.length > 0) {
      localStorage.setItem(BOOKS_KEY, JSON.stringify(books))
    }
  }, [books])

  useEffect(() => {
    function refreshCentralStudents() {
      setStudents(readCentralLibraryStudents())
    }

    window.addEventListener(
      'nexusSIS_students_updated',
      refreshCentralStudents
    )

    window.addEventListener(
      'storage',
      refreshCentralStudents
    )

    return () => {
      window.removeEventListener(
        'nexusSIS_students_updated',
        refreshCentralStudents
      )

      window.removeEventListener(
        'storage',
        refreshCentralStudents
      )
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans))
  }, [loans])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const categories = useMemo(() => {
    const values = books.map((book) => book.category).filter(Boolean)
    return ['All', ...Array.from(new Set(values)).sort()]
  }, [books])

  const filteredBooks = useMemo(() => {
    const query = search.trim().toLowerCase()

    return books.filter((book) => {
      const matchesSearch =
        !query ||
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.isbn.toLowerCase().includes(query) ||
        book.id.toLowerCase().includes(query)

      const matchesCategory =
        categoryFilter === 'All' || book.category === categoryFilter

      return matchesSearch && matchesCategory
    })
  }, [books, search, categoryFilter])

  const filteredLoans = useMemo(() => {
    const query = search.trim().toLowerCase()

    return loans.filter((loan) => {
      const matchesSearch =
        !query ||
        loan.studentId.toLowerCase().includes(query) ||
        loan.studentName.toLowerCase().includes(query) ||
        loan.bookTitle.toLowerCase().includes(query) ||
        loan.id.toLowerCase().includes(query)

      const matchesStatus =
        loanFilter === 'All' || loan.status === loanFilter

      return matchesSearch && matchesStatus
    })
  }, [loans, search, loanFilter])

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase()

    return students.filter((student) => {
      const id = getStudentId(student)

      return (
        !query ||
        id.toLowerCase().includes(query) ||
        String(student.name || '').toLowerCase().includes(query) ||
        String(student.programme || '').toLowerCase().includes(query)
      )
    })
  }, [students, studentSearch])

  const issuedLoans = loans.filter(
    (loan) => loan.status === 'Issued' || loan.status === 'Overdue'
  )

  const overdueLoans = loans.filter((loan) => loan.status === 'Overdue')

  const totalFines = loans.reduce(
    (sum, loan) => sum + calculateFine(loan, settings.finePerDay),
    0
  )

  const availableCopies = books.reduce(
    (sum, book) => sum + book.availableCopies,
    0
  )

  const totalCopies = books.reduce((sum, book) => sum + book.copies, 0)

  function refreshLoanStatuses() {
    setLoans((current) =>
      current.map((loan) => {
        if (loan.status === 'Issued' && loan.dueDate < todayString()) {
          return {
            ...loan,
            status: 'Overdue',
            fine: calculateFine(
              { ...loan, status: 'Overdue' },
              settings.finePerDay
            ),
          }
        }

        if (loan.status === 'Overdue') {
          return {
            ...loan,
            fine: calculateFine(loan, settings.finePerDay),
          }
        }

        return loan
      })
    )
  }

  function openAddBook() {
    setEditingBook(null)
    setBookForm({
      isbn: '',
      title: '',
      author: '',
      category: 'Computer Science',
      publisher: '',
      year: String(new Date().getFullYear()),
      copies: '1',
    })
    setShowBookModal(true)
  }

  function openEditBook(book: Book) {
    setEditingBook(book)
    setBookForm({
      isbn: book.isbn,
      title: book.title,
      author: book.author,
      category: book.category,
      publisher: book.publisher,
      year: book.year,
      copies: String(book.copies),
    })
    setShowBookModal(true)
  }

  function saveBook(event: FormEvent) {
    event.preventDefault()

    const title = bookForm.title.trim()
    const author = bookForm.author.trim()
    const isbn = bookForm.isbn.trim()
    const publisher = bookForm.publisher.trim()
    const copies = Math.max(1, Number(bookForm.copies) || 1)

    if (!title || !author || !isbn) {
      alert('Please enter ISBN, title and author.')
      return
    }

    if (editingBook) {
      const difference = copies - editingBook.copies

      setBooks((current) =>
        current.map((book) =>
          book.id === editingBook.id
            ? {
                ...book,
                isbn,
                title,
                author,
                category: bookForm.category,
                publisher,
                year: bookForm.year.trim(),
                copies,
                availableCopies: Math.max(
                  0,
                  Math.min(copies, book.availableCopies + difference)
                ),
                status:
                  book.availableCopies + difference > 0
                    ? 'Available'
                    : book.status,
              }
            : book
        )
      )
    } else {
      const nextNumber =
        books.reduce((max, book) => {
          const number = Number(book.id.replace('LIB-', ''))
          return Number.isFinite(number) ? Math.max(max, number) : max
        }, 0) + 1

      const newBook: Book = {
        id: `LIB-${String(nextNumber).padStart(3, '0')}`,
        isbn,
        title,
        author,
        category: bookForm.category,
        publisher,
        year: bookForm.year.trim(),
        copies,
        availableCopies: copies,
        status: 'Available',
      }

      setBooks((current) => [...current, newBook])
    }

    setShowBookModal(false)
    setEditingBook(null)
  }

  function deleteBook(book: Book) {
    const hasLoans = loans.some(
      (loan) =>
        loan.bookId === book.id &&
        (loan.status === 'Issued' || loan.status === 'Overdue')
    )

    if (hasLoans) {
      alert('This book cannot be deleted while copies are currently issued.')
      return
    }

    if (!confirm(`Delete "${book.title}" from the catalogue?`)) {
      return
    }

    setBooks((current) => current.filter((item) => item.id !== book.id))
  }

  function issueBook(event: FormEvent) {
    event.preventDefault()

    const studentId = issueForm.studentId.trim()

    if (!issueForm.bookId || !studentId) {
      alert('Select a book and enter a Student ID.')
      return
    }

    const book = books.find((item) => item.id === issueForm.bookId)

    if (!book) {
      alert('Selected book was not found.')
      return
    }

    if (book.availableCopies <= 0) {
      alert('No available copies of this book.')
      return
    }

    const student = students.find(
      (item) => getStudentId(item).toLowerCase() === studentId.toLowerCase()
    )

    if (!student) {
      alert(
        'Student ID was not found in the central registration records. Register the student first.'
      )
      return
    }

    const existingLoan = loans.find(
      (loan) =>
        loan.bookId === book.id &&
        loan.studentId.toLowerCase() === studentId.toLowerCase() &&
        (loan.status === 'Issued' || loan.status === 'Overdue')
    )

    if (existingLoan) {
      alert('This student already has this book on loan.')
      return
    }

    const issueDate = todayString()

    const newLoan: Loan = {
      id: `LOAN-${String(loans.length + 1).padStart(3, '0')}`,
      bookId: book.id,
      studentId: getStudentId(student),
      studentName: String(student.name || 'Unknown Student'),
      bookTitle: book.title,
      issueDate,
      dueDate: addDays(issueDate, settings.loanDays),
      returnDate: '',
      status: 'Issued',
      fine: 0,
    }

    const nextLoans = [...loans, newLoan]

    setLoans(nextLoans)

    updateCentralLibraryClearance(
      studentId,
      nextLoans,
      settings.finePerDay
    )

    setBooks((current) =>
      current.map((item) =>
        item.id === book.id
          ? {
              ...item,
              availableCopies: item.availableCopies - 1,
              status: item.availableCopies - 1 > 0 ? 'Available' : 'Issued',
            }
          : item
      )
    )

    setIssueForm({ bookId: '', studentId: '' })
    setShowIssueModal(false)
  }

  function returnBook(loan: Loan) {
    if (loan.status === 'Returned') {
      return
    }

    const returnDate = todayString()
    const fine = calculateFine(
      { ...loan, status: 'Overdue' },
      settings.finePerDay
    )

    const nextLoans = loans.map((item) =>
      item.id === loan.id
        ? {
            ...item,
            returnDate,
            status: 'Returned' as LoanStatus,
            fine,
          }
        : item
    )

    setLoans(nextLoans)

    updateCentralLibraryClearance(
      loan.studentId,
      nextLoans,
      settings.finePerDay
    )

    setBooks((current) =>
      current.map((book) =>
        book.id === loan.bookId
          ? {
              ...book,
              availableCopies: Math.min(
                book.copies,
                book.availableCopies + 1
              ),
              status: 'Available',
            }
          : book
      )
    )
  }

  function renewBook(loan: Loan) {
    if (loan.status !== 'Issued' && loan.status !== 'Overdue') {
      return
    }

    const newDueDate = addDays(
      loan.dueDate > todayString() ? loan.dueDate : todayString(),
      settings.loanDays
    )

    const nextLoans = loans.map((item) =>
      item.id === loan.id
        ? {
            ...item,
            dueDate: newDueDate,
            status: 'Issued' as LoanStatus,
            fine: 0,
          }
        : item
    )

    setLoans(nextLoans)

    updateCentralLibraryClearance(
      loan.studentId,
      nextLoans,
      settings.finePerDay
    )
  }

  function markLoanStatus(loan: Loan, status: 'Lost' | 'Damaged') {
    const fine =
      status === 'Lost'
        ? Math.max(calculateFine(loan, settings.finePerDay), 50)
        : Math.max(calculateFine(loan, settings.finePerDay), 20)

    const nextLoans = loans.map((item) =>
      item.id === loan.id
        ? {
            ...item,
            status,
            fine,
          }
        : item
    )

    setLoans(nextLoans)

    updateCentralLibraryClearance(
      loan.studentId,
      nextLoans,
      settings.finePerDay
    )

    setBooks((current) =>
      current.map((book) =>
        book.id === loan.bookId
          ? {
              ...book,
              copies: Math.max(0, book.copies - 1),
              availableCopies: Math.min(
                Math.max(0, book.copies - 1),
                book.availableCopies
              ),
              status: book.availableCopies > 0 ? 'Available' : status,
            }
          : book
      )
    )
  }

  function libraryClearance(studentId: string) {
    const studentLoans = loans.filter(
      (loan) =>
        loan.studentId.toLowerCase() === studentId.toLowerCase() &&
        loan.status !== 'Returned'
    )

    const outstandingFine = studentLoans.reduce(
      (sum, loan) => sum + calculateFine(loan, settings.finePerDay),
      0
    )

    return {
      clear: studentLoans.length === 0 && outstandingFine <= 0,
      loans: studentLoans.length,
      fine: outstandingFine,
    }
  }

  function exportBooks() {
    const headers = [
      'Book ID',
      'ISBN',
      'Title',
      'Author',
      'Category',
      'Publisher',
      'Year',
      'Copies',
      'Available',
      'Status',
    ]

    const rows = books.map((book) => [
      book.id,
      book.isbn,
      book.title,
      book.author,
      book.category,
      book.publisher,
      book.year,
      book.copies,
      book.availableCopies,
      book.status,
    ])

    downloadCSV('nexus-sis-library-catalogue.csv', headers, rows)
  }

  function exportLoans() {
    const headers = [
      'Loan ID',
      'Student ID',
      'Student Name',
      'Book',
      'Issue Date',
      'Due Date',
      'Return Date',
      'Status',
      'Fine',
    ]

    const rows = loans.map((loan) => [
      loan.id,
      loan.studentId,
      loan.studentName,
      loan.bookTitle,
      loan.issueDate,
      loan.dueDate,
      loan.returnDate,
      loan.status,
      calculateFine(loan, settings.finePerDay).toFixed(2),
    ])

    downloadCSV('nexus-sis-library-loans.csv', headers, rows)
  }

  function downloadCSV(
    filename: string,
    headers: (string | number)[],
    rows: (string | number)[][]
  ) {
    const escapeCSV = (value: string | number) => {
      const text = String(value ?? '')
      return `"${text.replace(/"/g, '""')}"`
    }

    const content = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ].join('\n')

    const blob = new Blob([content], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  function signOut() {
    clearNexusSession()
    window.location.href = '/dashboard'
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">
              Nexus SIS
            </p>
            <h1 className="mt-1 text-2xl font-bold">Library Management</h1>
            <p className="mt-1 text-sm text-slate-400">
              Central university library catalogue, loans and clearance
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/admin/students"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Students
            </Link>

            <Link
              href="/admin/bursary"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Bursary
            </Link>

            <Link
              href="/admin/registrar"
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Registrar
            </Link>

            <button
              onClick={signOut}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Book Titles" value={books.length} />
          <StatCard label="Total Copies" value={totalCopies} />
          <StatCard label="Available Copies" value={availableCopies} />
          <StatCard label="Active Loans" value={issuedLoans.length} />
          <StatCard
            label="Outstanding Fines"
            value={formatPGK(totalFines)}
          />
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              <TabButton
                active={activeTab === 'catalogue'}
                onClick={() => setActiveTab('catalogue')}
              >
                📚 Catalogue
              </TabButton>

              <TabButton
                active={activeTab === 'loans'}
                onClick={() => {
                  refreshLoanStatuses()
                  setActiveTab('loans')
                }}
              >
                📖 Loans
              </TabButton>

              <TabButton
                active={activeTab === 'students'}
                onClick={() => setActiveTab('students')}
              >
                👨‍🎓 Students
              </TabButton>

              <TabButton
                active={activeTab === 'clearance'}
                onClick={() => setActiveTab('clearance')}
              >
                ✅ Clearance
              </TabButton>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  refreshLoanStatuses()
                  setShowIssueModal(true)
                }}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Issue Book
              </button>

              <button
                onClick={openAddBook}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                + Add Book
              </button>
            </div>
          </div>
        </section>

        {activeTab === 'catalogue' && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Library Catalogue</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Manage books, copies and academic resources.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search title, author, ISBN..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-72"
                  />

                  <select
                    value={categoryFilter}
                    onChange={(event) =>
                      setCategoryFilter(event.target.value)
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    {categories.map((category) => (
                      <option key={category}>{category}</option>
                    ))}
                  </select>

                  <button
                    onClick={exportBooks}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Book</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">ISBN</th>
                    <th className="px-5 py-3">Copies</th>
                    <th className="px-5 py-3">Available</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setShowBookDetails(book)}
                          className="text-left"
                        >
                          <p className="font-semibold text-slate-900 hover:text-blue-600">
                            {book.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {book.author} · {book.id}
                          </p>
                        </button>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {book.category}
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-slate-600">
                        {book.isbn}
                      </td>

                      <td className="px-5 py-4">{book.copies}</td>

                      <td className="px-5 py-4 font-semibold">
                        {book.availableCopies}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={book.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setIssueForm({
                                bookId: book.id,
                                studentId: '',
                              })
                              setShowIssueModal(true)
                            }}
                            disabled={book.availableCopies <= 0}
                            className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            Issue
                          </button>

                          <button
                            onClick={() => openEditBook(book)}
                            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteBook(book)}
                            className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredBooks.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  No books match your search.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'loans' && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-lg font-bold">Book Loans</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Issue, return, renew and track borrowed resources.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search student or book..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 sm:w-64"
                  />

                  <select
                    value={loanFilter}
                    onChange={(event) => setLoanFilter(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  >
                    <option>All</option>
                    <option>Issued</option>
                    <option>Overdue</option>
                    <option>Returned</option>
                    <option>Lost</option>
                    <option>Damaged</option>
                  </select>

                  <button
                    onClick={exportLoans}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
            </div>

            {overdueLoans.length > 0 && (
              <div className="m-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <strong>{overdueLoans.length}</strong> loan(s) are currently
                overdue.
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student</th>
                    <th className="px-5 py-3">Book</th>
                    <th className="px-5 py-3">Issued</th>
                    <th className="px-5 py-3">Due</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Fine</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <p className="font-semibold">{loan.studentName}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">
                          {loan.studentId}
                        </p>
                      </td>

                      <td className="px-5 py-4">{loan.bookTitle}</td>

                      <td className="px-5 py-4">{loan.issueDate}</td>

                      <td
                        className={`px-5 py-4 ${
                          loan.status === 'Overdue'
                            ? 'font-semibold text-red-600'
                            : ''
                        }`}
                      >
                        {loan.dueDate}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={loan.status} />
                      </td>

                      <td className="px-5 py-4 font-semibold">
                        {formatPGK(
                          calculateFine(loan, settings.finePerDay)
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          {(loan.status === 'Issued' ||
                            loan.status === 'Overdue') && (
                            <>
                              <button
                                onClick={() => returnBook(loan)}
                                className="rounded-md bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Return
                              </button>

                              <button
                                onClick={() => renewBook(loan)}
                                className="rounded-md border border-blue-200 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                              >
                                Renew
                              </button>

                              <button
                                onClick={() =>
                                  markLoanStatus(loan, 'Lost')
                                }
                                className="rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                              >
                                Lost
                              </button>

                              <button
                                onClick={() =>
                                  markLoanStatus(loan, 'Damaged')
                                }
                                className="rounded-md border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                              >
                                Damaged
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredLoans.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  No loan records match your filters.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'students' && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold">Library Students</h2>
              <p className="mt-1 text-sm text-slate-500">
                Students are read from the central Nexus SIS registration
                records.
              </p>

              <input
                value={studentSearch}
                onChange={(event) => setStudentSearch(event.target.value)}
                placeholder="Search Student ID, name or programme..."
                className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Student ID</th>
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3">Programme</th>
                    <th className="px-5 py-3">Faculty</th>
                    <th className="px-5 py-3">Library Status</th>
                    <th className="px-5 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const id = getStudentId(student)
                    const clearance = libraryClearance(id)

                    return (
                      <tr key={id} className="hover:bg-slate-50">
                        <td className="px-5 py-4 font-mono text-xs">
                          {id || '—'}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {student.name || 'Unnamed Student'}
                        </td>

                        <td className="px-5 py-4">
                          {student.programme || '—'}
                        </td>

                        <td className="px-5 py-4">
                          {student.faculty || '—'}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              clearance.clear
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {clearance.clear ? 'Clear' : 'Not Clear'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setShowStudentDetails(student)}
                            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {filteredStudents.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  No central student records found.
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'clearance' && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-5">
              <h2 className="text-lg font-bold">Library Clearance</h2>
              <p className="mt-1 text-sm text-slate-500">
                Students must return outstanding library resources and settle
                library fines before being library-clear.
              </p>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Students Registered</p>
                <p className="mt-2 text-3xl font-bold">{students.length}</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Outstanding Loans</p>
                <p className="mt-2 text-3xl font-bold">
                  {issuedLoans.length}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm text-slate-500">Outstanding Fines</p>
                <p className="mt-2 text-3xl font-bold">
                  {formatPGK(totalFines)}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto px-5 pb-5">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Student ID</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Outstanding Loans</th>
                    <th className="px-4 py-3">Fine</th>
                    <th className="px-4 py-3">Clearance</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {students.map((student) => {
                    const id = getStudentId(student)
                    const clearance = libraryClearance(id)

                    return (
                      <tr key={id}>
                        <td className="px-4 py-3 font-mono text-xs">
                          {id}
                        </td>

                        <td className="px-4 py-3 font-semibold">
                          {student.name || 'Unnamed Student'}
                        </td>

                        <td className="px-4 py-3">
                          {clearance.loans}
                        </td>

                        <td className="px-4 py-3">
                          {formatPGK(clearance.fine)}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              clearance.clear
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {clearance.clear
                              ? 'LIBRARY CLEAR'
                              : 'CLEARANCE REQUIRED'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {students.length === 0 && (
                <div className="p-10 text-center text-sm text-slate-500">
                  No registered students are available yet.
                </div>
              )}
            </div>
          </section>
        )}

        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-bold">Library Settings</h2>
            <p className="mt-1 text-sm text-slate-500">
              Default borrowing rules for the current prototype.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Loan Period (days)
                <input
                  type="number"
                  min="1"
                  value={settings.loanDays}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      loanDays: Math.max(1, Number(event.target.value) || 1),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                />
              </label>

              <label className="text-sm font-medium">
                Fine Per Day (PGK)
                <input
                  type="number"
                  min="0"
                  step="0.50"
                  value={settings.finePerDay}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      finePerDay: Math.max(
                        0,
                        Number(event.target.value) || 0
                      ),
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
            <h2 className="font-bold text-blue-950">System Integration</h2>
            <p className="mt-2 text-sm leading-6 text-blue-900">
              The library uses the central registered Student ID rather than
              creating a separate library student account. This allows the
              future final database to connect library loans and clearance to
              Registrar, Finance, Graduation and the Student Portal.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/admin/registration"
                className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm"
              >
                Registration
              </Link>

              <Link
                href="/admin/students"
                className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm"
              >
                Student Master
              </Link>

              <Link
                href="/admin/bursary"
                className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-700 shadow-sm"
              >
                Finance
              </Link>
            </div>
          </div>
        </section>
      </div>

      {showBookModal && (
        <Modal
          title={editingBook ? 'Edit Library Book' : 'Add Library Book'}
          onClose={() => setShowBookModal(false)}
        >
          <form onSubmit={saveBook} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="ISBN"
                value={bookForm.isbn}
                onChange={(value) =>
                  setBookForm((current) => ({ ...current, isbn: value }))
                }
                required
              />

              <Input
                label="Year"
                value={bookForm.year}
                onChange={(value) =>
                  setBookForm((current) => ({ ...current, year: value }))
                }
              />
            </div>

            <Input
              label="Book Title"
              value={bookForm.title}
              onChange={(value) =>
                setBookForm((current) => ({ ...current, title: value }))
              }
              required
            />

            <Input
              label="Author"
              value={bookForm.author}
              onChange={(value) =>
                setBookForm((current) => ({ ...current, author: value }))
              }
              required
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Category
                <select
                  value={bookForm.category}
                  onChange={(event) =>
                    setBookForm((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                >
                  <option>Computer Science</option>
                  <option>Business & Economics</option>
                  <option>Engineering</option>
                  <option>Education</option>
                  <option>Medicine & Health Sciences</option>
                  <option>Law & Jurisprudence</option>
                  <option>Mathematics & Statistics</option>
                  <option>Biology</option>
                  <option>Chemistry</option>
                  <option>Physics</option>
                  <option>Agriculture</option>
                  <option>History</option>
                  <option>Literature & Arts</option>
                  <option>Psychology</option>
                  <option>Sociology & Anthropology</option>
                  <option>Theology & Philosophy</option>
                  <option>Geography & Earth Sciences</option>
                  <option>Other / New Discipline</option>
                </select>
              </label>

              <Input
                label="Number of Copies"
                type="number"
                value={bookForm.copies}
                onChange={(value) =>
                  setBookForm((current) => ({ ...current, copies: value }))
                }
                required
              />
            </div>

            <Input
              label="Publisher"
              value={bookForm.publisher}
              onChange={(value) =>
                setBookForm((current) => ({
                  ...current,
                  publisher: value,
                }))
              }
            />

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowBookModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                {editingBook ? 'Save Changes' : 'Add Book'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showIssueModal && (
        <Modal
          title="Issue Library Book"
          onClose={() => setShowIssueModal(false)}
        >
          <form onSubmit={issueBook} className="space-y-4">
            <label className="text-sm font-medium">
              Book
              <select
                value={issueForm.bookId}
                onChange={(event) =>
                  setIssueForm((current) => ({
                    ...current,
                    bookId: event.target.value,
                  }))
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
                required
              >
                <option value="">Select book</option>
                {books
                  .filter((book) => book.availableCopies > 0)
                  .map((book) => (
                    <option key={book.id} value={book.id}>
                      {book.title} — {book.availableCopies} available
                    </option>
                  ))}
              </select>
            </label>

            <Input
              label="Student ID"
              value={issueForm.studentId}
              onChange={(value) =>
                setIssueForm((current) => ({
                  ...current,
                  studentId: value,
                }))
              }
              placeholder="e.g. NXS2600001"
              required
            />

            <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-600">
              The Student ID must already exist in Nexus SIS registration
              records. The student's registered name will be captured
              automatically.
            </p>

            <div className="flex justify-end gap-2 pt-3">
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Issue Book
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showBookDetails && (
        <Modal
          title="Book Details"
          onClose={() => setShowBookDetails(null)}
        >
          <div className="space-y-4">
            <div>
              <p className="text-xl font-bold">{showBookDetails.title}</p>
              <p className="mt-1 text-sm text-slate-500">
                {showBookDetails.author}
              </p>
            </div>

            <DetailRow label="Book ID" value={showBookDetails.id} />
            <DetailRow label="ISBN" value={showBookDetails.isbn} />
            <DetailRow label="Category" value={showBookDetails.category} />
            <DetailRow
              label="Publisher"
              value={showBookDetails.publisher || '—'}
            />
            <DetailRow label="Year" value={showBookDetails.year} />
            <DetailRow
              label="Copies"
              value={`${showBookDetails.availableCopies} available / ${showBookDetails.copies} total`}
            />

            <div className="flex justify-end">
              <button
                onClick={() => setShowBookDetails(null)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showStudentDetails && (
        <Modal
          title="Student Library Record"
          onClose={() => setShowStudentDetails(null)}
        >
          {(() => {
            const id = getStudentId(showStudentDetails)
            const studentLoans = loans.filter(
              (loan) => loan.studentId.toLowerCase() === id.toLowerCase()
            )
            const clearance = libraryClearance(id)

            return (
              <div className="space-y-4">
                <div>
                  <p className="text-xl font-bold">
                    {showStudentDetails.name || 'Unnamed Student'}
                  </p>
                  <p className="mt-1 font-mono text-xs text-slate-500">
                    {id}
                  </p>
                </div>

                <DetailRow
                  label="Programme"
                  value={showStudentDetails.programme || '—'}
                />

                <DetailRow
                  label="Faculty"
                  value={showStudentDetails.faculty || '—'}
                />

                <DetailRow
                  label="Department"
                  value={showStudentDetails.department || '—'}
                />

                <DetailRow
                  label="Active Loans"
                  value={String(clearance.loans)}
                />

                <DetailRow
                  label="Outstanding Fine"
                  value={formatPGK(clearance.fine)}
                />

                <div
                  className={`rounded-lg p-4 text-sm font-semibold ${
                    clearance.clear
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {clearance.clear
                    ? 'Student is clear with the library.'
                    : 'Student has outstanding library obligations.'}
                </div>

                {studentLoans.length > 0 && (
                  <div className="rounded-lg border border-slate-200">
                    {studentLoans.map((loan) => (
                      <div
                        key={loan.id}
                        className="border-b border-slate-100 p-3 last:border-0"
                      >
                        <p className="font-semibold">{loan.bookTitle}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Due: {loan.dueDate} · {loan.status}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={() => setShowStudentDetails(null)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Close
                  </button>
                </div>
              </div>
            )
          })()}
        </Modal>
      )}
    </main>
  )
}

function StatCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
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
      className={`rounded-lg px-4 py-2 text-sm font-semibold ${
        active
          ? 'bg-slate-900 text-white'
          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
      }`}
    >
      {children}
    </button>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Available: 'bg-emerald-100 text-emerald-700',
    Issued: 'bg-blue-100 text-blue-700',
    Overdue: 'bg-red-100 text-red-700',
    Returned: 'bg-slate-100 text-slate-700',
    Lost: 'bg-red-100 text-red-700',
    Damaged: 'bg-amber-100 text-amber-700',
  }

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        styles[status] || 'bg-slate-100 text-slate-700'
      }`}
    >
      {status}
    </span>
  )
}

function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
      />
    </label>
  )
}

function DetailRow({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
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
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <h2 className="text-lg font-bold">{title}</h2>

          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
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
