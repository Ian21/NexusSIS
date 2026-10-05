'use client'

import { useEffect, useMemo, useState } from 'react'
import { protectNexusPage } from "@/lib/nexus-access"
import { NEXUS_KEYS, type CentralStudent } from "@/lib/nexus-data"

type PaymentStatus = 'Paid' | 'Partial' | 'Pending' | 'Overdue'
type PaymentMethod = 'Cash' | 'Bank Transfer' | 'Mobile Money' | 'Card' | 'Scholarship/Sponsor'

type Student = {
  id?: string
  studentId?: string
  name: string
  faculty?: string
  department?: string
  programme?: string
  yearLevel?: string
}

type FinanceRecord = {
  id: string
  studentId: string
  studentName: string
  programme: string
  academicYear: string
  semester: string
  tuitionFee: number
  otherFees: number
  scholarshipAmount: number
  amountPaid: number
  balance: number
  status: PaymentStatus
  lastPaymentDate: string
  sponsor: string
}

type Payment = {
  id: string
  receiptNumber: string
  studentId: string
  studentName: string
  amount: number
  method: PaymentMethod
  reference: string
  date: string
  academicYear: string
  semester: string
  receivedBy: string
}

type FeeForm = {
  studentId: string
  academicYear: string
  semester: string
  tuitionFee: string
  otherFees: string
  scholarshipAmount: string
  sponsor: string
}

type PaymentForm = {
  studentId: string
  amount: string
  method: PaymentMethod
  reference: string
  academicYear: string
  semester: string
}

type TransferStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Executed'

type FundTransferRequest = {
  id: string
  studentId: string
  studentName: string
  amount: number
  reason: string
  description: string
  status: TransferStatus
  requestedAt: string
  reviewedAt: string
  reviewedBy: string
  executedAt: string
  executedBy: string
  transactionReference: string
  attachmentName: string
  attachmentData: string
  attachmentDescription: string
}

const FINANCE_KEY = 'nexusSIS_finance_records'
const PAYMENTS_KEY = 'nexusSIS_payments'
const TRANSFER_KEY = 'nexusSIS_fund_transfer_requests'
const STUDENTS_KEY = NEXUS_KEYS.students
const LEGACY_STUDENTS_KEY = 'nexusSIS_registered_students'

const defaultFinance: FinanceRecord[] = [
  {
    id: 'FIN-001',
    studentId: 'NXS2600001',
    studentName: 'David Maima',
    programme: 'Bachelor of Computer Science',
    academicYear: '2026',
    semester: 'Semester 1',
    tuitionFee: 8500,
    otherFees: 750,
    scholarshipAmount: 0,
    amountPaid: 4000,
    balance: 5250,
    status: 'Partial',
    lastPaymentDate: '2026-02-10',
    sponsor: '',
  },
  {
    id: 'FIN-002',
    studentId: 'NXS2600002',
    studentName: 'Mary Kila',
    programme: 'Bachelor of Business Administration',
    academicYear: '2026',
    semester: 'Semester 1',
    tuitionFee: 8000,
    otherFees: 750,
    scholarshipAmount: 2000,
    amountPaid: 6750,
    balance: 0,
    status: 'Paid',
    lastPaymentDate: '2026-02-15',
    sponsor: 'University Scholarship',
  },
]

const emptyFeeForm: FeeForm = {
  studentId: '',
  academicYear: '2026',
  semester: 'Semester 1',
  tuitionFee: '',
  otherFees: '0',
  scholarshipAmount: '0',
  sponsor: '',
}

const emptyPaymentForm: PaymentForm = {
  studentId: '',
  amount: '',
  method: 'Bank Transfer',
  reference: '',
  academicYear: '2026',
  semester: 'Semester 1',
}

function safeParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function centralStudentToBursaryStudent(
  student: CentralStudent
): Student {
  return {
    id: student.id,
    studentId: student.studentId,
    name: student.fullName,
    faculty: student.facultyName,
    department: student.departmentName,
    programme: student.programmeName,
    yearLevel: String(student.yearLevel),
  }
}

function readCentralBursaryStudents(): Student[] {
  const central = safeParse<CentralStudent[]>(
    localStorage.getItem(NEXUS_KEYS.students),
    []
  )

  if (central.length) {
    return central.map(centralStudentToBursaryStudent)
  }

  // Compatibility fallback for older installations.
  return safeParse<Student[]>(
    localStorage.getItem(LEGACY_STUDENTS_KEY),
    []
  )
}

function getStudentId(student: Student) {
  return student.studentId || student.id || ''
}

function money(value: number) {
  return new Intl.NumberFormat('en-PG', {
    style: 'currency',
    currency: 'PGK',
    minimumFractionDigits: 2,
  }).format(value)
}

function getStatus(
  totalCharges: number,
  amountPaid: number
): PaymentStatus {
  const balance = Math.max(0, totalCharges - amountPaid)

  if (balance <= 0) return 'Paid'
  if (amountPaid > 0) return 'Partial'
  return 'Pending'
}

export default function BursaryPage() {
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [transferRequests, setTransferRequests] = useState<FundTransferRequest[]>([])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [yearFilter, setYearFilter] = useState('2026')
  const [semesterFilter, setSemesterFilter] = useState('All')

  const [showFeeModal, setShowFeeModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const [selectedRecord, setSelectedRecord] = useState<FinanceRecord | null>(null)
  const [feeForm, setFeeForm] = useState<FeeForm>(emptyFeeForm)
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm)

  const [transferForm, setTransferForm] = useState({
    studentId: '',
    amount: '',
    reason: '',
    description: '',
  })

  const [transferAttachment, setTransferAttachment] = useState<File | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    protectNexusPage([
      "Finance Officer",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    const savedFinance = safeParse<FinanceRecord[]>(
      localStorage.getItem(FINANCE_KEY),
      defaultFinance
    )

    const savedPayments = safeParse<Payment[]>(
      localStorage.getItem(PAYMENTS_KEY),
      []
    )

    const savedTransfers = safeParse<FundTransferRequest[]>(
      localStorage.getItem(TRANSFER_KEY),
      []
    )

    const savedStudents = readCentralBursaryStudents()

    setFinanceRecords(savedFinance)
    setPayments(savedPayments)
    setTransferRequests(savedTransfers)
    setStudents(savedStudents)
  }, [])

  function saveFinance(next: FinanceRecord[]) {
    setFinanceRecords(next)
    localStorage.setItem(FINANCE_KEY, JSON.stringify(next))
  }

  function savePayments(next: Payment[]) {
    setPayments(next)
    localStorage.setItem(PAYMENTS_KEY, JSON.stringify(next))
  }

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase()

    return financeRecords.filter((record) => {
      const matchesSearch =
        !query ||
        record.studentId.toLowerCase().includes(query) ||
        record.studentName.toLowerCase().includes(query) ||
        record.programme.toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'All' || record.status === statusFilter

      const matchesYear =
        yearFilter === 'All' || record.academicYear === yearFilter

      const matchesSemester =
        semesterFilter === 'All' || record.semester === semesterFilter

      return (
        matchesSearch &&
        matchesStatus &&
        matchesYear &&
        matchesSemester
      )
    })
  }, [
    financeRecords,
    search,
    statusFilter,
    yearFilter,
    semesterFilter,
  ])

  const totals = useMemo(() => {
    const records = filteredRecords

    return {
      charges: records.reduce(
        (sum, record) =>
          sum +
          record.tuitionFee +
          record.otherFees -
          record.scholarshipAmount,
        0
      ),
      paid: records.reduce(
        (sum, record) => sum + record.amountPaid,
        0
      ),
      balance: records.reduce(
        (sum, record) => sum + record.balance,
        0
      ),
      paidCount: records.filter(
        (record) => record.status === 'Paid'
      ).length,
    }
  }, [filteredRecords])

  function openFeeModal(record?: FinanceRecord) {
    if (record) {
      setFeeForm({
        studentId: record.studentId,
        academicYear: record.academicYear,
        semester: record.semester,
        tuitionFee: String(record.tuitionFee),
        otherFees: String(record.otherFees),
        scholarshipAmount: String(record.scholarshipAmount),
        sponsor: record.sponsor,
      })
    } else {
      setFeeForm({ ...emptyFeeForm })
    }

    setMessage('')
    setShowFeeModal(true)
  }

  function openPaymentModal(record?: FinanceRecord) {
    setPaymentForm({
      ...emptyPaymentForm,
      studentId: record?.studentId || '',
      academicYear: record?.academicYear || '2026',
      semester: record?.semester || 'Semester 1',
    })

    setMessage('')
    setShowPaymentModal(true)
  }

  function closeModals() {
    setShowFeeModal(false)
    setShowPaymentModal(false)
    setShowTransferModal(false)
    setShowDetails(false)
    setMessage('')
  }

  function findStudent(studentId: string) {
    return students.find(
      (student) => getStudentId(student) === studentId
    )
  }

  function saveFeeRecord() {
    const studentId = feeForm.studentId.trim()
    const tuitionFee = Number(feeForm.tuitionFee)
    const otherFees = Number(feeForm.otherFees || 0)
    const scholarshipAmount = Number(
      feeForm.scholarshipAmount || 0
    )

    if (!studentId) {
      setMessage('Please select a student.')
      return
    }

    if (!Number.isFinite(tuitionFee) || tuitionFee < 0) {
      setMessage('Enter a valid tuition fee.')
      return
    }

    if (
      !Number.isFinite(otherFees) ||
      otherFees < 0 ||
      !Number.isFinite(scholarshipAmount) ||
      scholarshipAmount < 0
    ) {
      setMessage('Enter valid fee and scholarship amounts.')
      return
    }

    const student = findStudent(studentId)
    const existing = financeRecords.find(
      (record) =>
        record.studentId === studentId &&
        record.academicYear === feeForm.academicYear &&
        record.semester === feeForm.semester
    )

    const currentPaid = existing?.amountPaid || 0
    const totalCharges =
      tuitionFee + otherFees - scholarshipAmount

    const balance = Math.max(0, totalCharges - currentPaid)

    const nextRecord: FinanceRecord = {
      id: existing?.id || `FIN-${Date.now()}`,
      studentId,
      studentName:
        student?.name ||
        existing?.studentName ||
        'Registered Student',
      programme:
        student?.programme ||
        existing?.programme ||
        'Not specified',
      academicYear: feeForm.academicYear,
      semester: feeForm.semester,
      tuitionFee,
      otherFees,
      scholarshipAmount,
      amountPaid: currentPaid,
      balance,
      status: getStatus(totalCharges, currentPaid),
      lastPaymentDate: existing?.lastPaymentDate || '',
      sponsor: feeForm.sponsor.trim(),
    }

    const nextRecords = existing
      ? financeRecords.map((record) =>
          record.id === existing.id ? nextRecord : record
        )
      : [...financeRecords, nextRecord]

    saveFinance(nextRecords)
    closeModals()
  }

  function savePayment() {
    const studentId = paymentForm.studentId.trim()
    const amount = Number(paymentForm.amount)
    const reference = paymentForm.reference.trim()

    if (!studentId) {
      setMessage('Please select a student.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Enter a valid payment amount.')
      return
    }

    if (!reference) {
      setMessage('Enter a payment reference or receipt reference.')
      return
    }

    const record = financeRecords.find(
      (item) =>
        item.studentId === studentId &&
        item.academicYear === paymentForm.academicYear &&
        item.semester === paymentForm.semester
    )

    if (!record) {
      setMessage(
        'No fee record exists for this student and academic period. Create the fee record first.'
      )
      return
    }

    if (amount > record.balance) {
      setMessage(
        `Payment exceeds the outstanding balance of ${money(record.balance)}.`
      )
      return
    }

    const student = findStudent(studentId)

    const nextPaymentNumber =
      payments.reduce((highest, payment) => {
        const number = Number(
          payment.receiptNumber.replace(/\D/g, '')
        )

        return Number.isFinite(number)
          ? Math.max(highest, number)
          : highest
      }, 0) + 1

    const payment: Payment = {
      id: `PAY-${Date.now()}`,
      receiptNumber: `RCPT-${String(nextPaymentNumber).padStart(6, '0')}`,
      studentId,
      studentName:
        student?.name || record.studentName,
      amount,
      method: paymentForm.method,
      reference,
      date: new Date().toISOString().slice(0, 10),
      academicYear: paymentForm.academicYear,
      semester: paymentForm.semester,
      receivedBy: 'Bursary',
    }

    const newPaid = record.amountPaid + amount
    const newBalance = Math.max(
      0,
      record.balance - amount
    )

    const nextRecord: FinanceRecord = {
      ...record,
      amountPaid: newPaid,
      balance: newBalance,
      status: getStatus(
        record.tuitionFee +
          record.otherFees -
          record.scholarshipAmount,
        newPaid
      ),
      lastPaymentDate: payment.date,
    }

    savePayments([...payments, payment])

    saveFinance(
      financeRecords.map((item) =>
        item.id === record.id ? nextRecord : item
      )
    )

    closeModals()
  }

  function saveTransferRequests(next: FundTransferRequest[]) {
    setTransferRequests(next)
    localStorage.setItem(
      TRANSFER_KEY,
      JSON.stringify(next)
    )
  }

  function resetTransferForm() {
    setTransferForm({
      studentId: '',
      amount: '',
      reason: '',
      description: '',
    })
    setTransferAttachment(null)
    setShowTransferModal(false)
    setMessage('')
  }

  async function createTransferRequest() {
    const studentId = transferForm.studentId.trim()
    const amount = Number(transferForm.amount)
    const reason = transferForm.reason.trim()
    const description = transferForm.description.trim()

    if (!studentId) {
      setMessage('Please select a student.')
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage('Enter a valid transfer amount.')
      return
    }

    if (!reason) {
      setMessage('Enter the reason for the transfer.')
      return
    }

    const student = findStudent(studentId)

    if (!student) {
      setMessage('Student could not be found.')
      return
    }

    let attachmentData = ''
    let attachmentName = ''

    if (transferAttachment) {
      if (transferAttachment.size > 10 * 1024 * 1024) {
        setMessage('Attachment must be 10 MB or smaller.')
        return
      }

      attachmentData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () =>
          resolve(String(reader.result || ''))

        reader.onerror = () =>
          reject(new Error('Attachment could not be read.'))

        reader.readAsDataURL(transferAttachment)
      })

      attachmentName = transferAttachment.name
    }

    const request: FundTransferRequest = {
      id: `TRF-${Date.now()}`,
      studentId,
      studentName: student.name,
      amount,
      reason,
      description,
      status: 'Pending',
      requestedAt: new Date().toISOString(),
      reviewedAt: '',
      reviewedBy: '',
      executedAt: '',
      executedBy: '',
      transactionReference: '',
      attachmentName,
      attachmentData,
      attachmentDescription: description,
    }

    saveTransferRequests([
      request,
      ...transferRequests,
    ])

    resetTransferForm()
  }

  function reviewTransferRequest(
    requestId: string,
    status: 'Approved' | 'Rejected'
  ) {
    const reviewedAt = new Date().toISOString()

    saveTransferRequests(
      transferRequests.map((request) =>
        request.id === requestId
          ? {
              ...request,
              status,
              reviewedAt,
              reviewedBy: 'Bursary',
            }
          : request
      )
    )
  }

  function executeTransferRequest(requestId: string) {
    const request = transferRequests.find(
      (item) => item.id === requestId
    )

    if (!request) {
      return
    }

    if (request.status !== 'Approved') {
      setMessage(
        'Only an approved transfer can be executed.'
      )
      return
    }

    const transactionReference =
      `TRX-${Date.now()}`

    saveTransferRequests(
      transferRequests.map((item) =>
        item.id === requestId
          ? {
              ...item,
              status: 'Executed',
              executedAt: new Date().toISOString(),
              executedBy: 'Bursary',
              transactionReference,
            }
          : item
      )
    )

    setMessage(
      `Transfer executed successfully. Transaction: ${transactionReference}`
    )
  }

  function exportTransfersCSV() {
    const headers = [
      'Request ID',
      'Student ID',
      'Student Name',
      'Amount',
      'Reason',
      'Description',
      'Status',
      'Requested At',
      'Reviewed By',
      'Executed By',
      'Transaction Reference',
      'Attachment',
      'Attachment Description',
    ]

    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`

    const rows = transferRequests.map((request) => [
      request.id,
      request.studentId,
      request.studentName,
      request.amount,
      request.reason,
      request.description,
      request.status,
      request.requestedAt,
      request.reviewedBy,
      request.executedBy,
      request.transactionReference,
      request.attachmentName,
      request.attachmentDescription,
    ])

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) =>
        row.map(escapeCSV).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'nexusSIS_fund_transfer_transactions.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  function exportFinanceCSV() {
    const headers = [
      'Student ID',
      'Student Name',
      'Programme',
      'Academic Year',
      'Semester',
      'Tuition Fee',
      'Other Fees',
      'Scholarship',
      'Amount Paid',
      'Balance',
      'Status',
      'Sponsor',
      'Last Payment',
    ]

    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`

    const rows = filteredRecords.map((record) => [
      record.studentId,
      record.studentName,
      record.programme,
      record.academicYear,
      record.semester,
      record.tuitionFee,
      record.otherFees,
      record.scholarshipAmount,
      record.amountPaid,
      record.balance,
      record.status,
      record.sponsor,
      record.lastPaymentDate,
    ])

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) =>
        row.map(escapeCSV).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'nexusSIS_finance_records.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  function exportPaymentsCSV() {
    const headers = [
      'Receipt Number',
      'Student ID',
      'Student Name',
      'Amount',
      'Method',
      'Reference',
      'Date',
      'Academic Year',
      'Semester',
      'Received By',
    ]

    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`

    const rows = payments.map((payment) => [
      payment.receiptNumber,
      payment.studentId,
      payment.studentName,
      payment.amount,
      payment.method,
      payment.reference,
      payment.date,
      payment.academicYear,
      payment.semester,
      payment.receivedBy,
    ])

    const csv = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) =>
        row.map(escapeCSV).join(',')
      ),
    ].join('\n')

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = 'nexusSIS_payment_history.csv'
    link.click()

    URL.revokeObjectURL(url)
  }

  function printStatement(record: FinanceRecord) {
    const printWindow = window.open('', '_blank')

    if (!printWindow) return

    const total =
      record.tuitionFee +
      record.otherFees -
      record.scholarshipAmount

    printWindow.document.write(`
      <html>
        <head>
          <title>Student Fee Statement</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #111827;
            }
            h1 { margin-bottom: 5px; }
            h2 { margin-top: 30px; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            td, th {
              border: 1px solid #d1d5db;
              padding: 10px;
              text-align: left;
            }
            .right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>Nexus University</h1>
          <p>Student Fee Statement</p>

          <h2>Student Information</h2>
          <p><strong>Student ID:</strong> ${record.studentId}</p>
          <p><strong>Name:</strong> ${record.studentName}</p>
          <p><strong>Programme:</strong> ${record.programme}</p>
          <p><strong>Academic Year:</strong> ${record.academicYear}</p>
          <p><strong>Semester:</strong> ${record.semester}</p>

          <h2>Financial Summary</h2>
          <table>
            <tr>
              <th>Description</th>
              <th class="right">Amount</th>
            </tr>
            <tr>
              <td>Tuition Fee</td>
              <td class="right">${money(record.tuitionFee)}</td>
            </tr>
            <tr>
              <td>Other Fees</td>
              <td class="right">${money(record.otherFees)}</td>
            </tr>
            <tr>
              <td>Scholarship / Sponsor</td>
              <td class="right">-${money(record.scholarshipAmount)}</td>
            </tr>
            <tr>
              <th>Total Charges</th>
              <th class="right">${money(total)}</th>
            </tr>
            <tr>
              <td>Amount Paid</td>
              <td class="right">${money(record.amountPaid)}</td>
            </tr>
            <tr>
              <th>Outstanding Balance</th>
              <th class="right">${money(record.balance)}</th>
            </tr>
          </table>

          <p style="margin-top:30px">
            Status: <strong>${record.status}</strong>
          </p>
        </body>
      </html>
    `)

    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
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
      <header className="bg-[#071a3d] px-6 py-5 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              Bursary & Finance
            </h1>
            <p className="mt-1 text-sm text-blue-200">
              Student fees, payments, scholarships and financial clearance
            </p>
          </div>

          <button
            onClick={signOut}
            className="rounded-lg border border-blue-300/30 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            Sign Out
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Total Charges
            </p>
            <p className="mt-2 text-2xl font-bold">
              {money(totals.charges)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Amount Collected
            </p>
            <p className="mt-2 text-2xl font-bold text-green-600">
              {money(totals.paid)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Outstanding Balance
            </p>
            <p className="mt-2 text-2xl font-bold text-red-600">
              {money(totals.balance)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Fully Cleared
            </p>
            <p className="mt-2 text-2xl font-bold">
              {totals.paidCount}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">
                Student Finance Records
              </h2>
              <p className="text-sm text-slate-500">
                Manage charges, scholarships, payments and balances.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportFinanceCSV}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Export Finance
              </button>

              <button
                onClick={exportPaymentsCSV}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Export Payments
              </button>

              <button
                onClick={() => openFeeModal()}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                + Create Fee Record
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search student ID, name, programme..."
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />

            <select
              value={yearFilter}
              onChange={(event) =>
                setYearFilter(event.target.value)
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="All">All Academic Years</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>

            <select
              value={semesterFilter}
              onChange={(event) =>
                setSemesterFilter(event.target.value)
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="All">All Semesters</option>
              <option value="Semester 1">Semester 1</option>
              <option value="Semester 2">Semester 2</option>
              <option value="Summer">Summer</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="All">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Pending">Pending</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Programme</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Charges</th>
                  <th className="px-4 py-3">Paid</th>
                  <th className="px-4 py-3">Balance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredRecords.map((record) => {
                  const charges =
                    record.tuitionFee +
                    record.otherFees -
                    record.scholarshipAmount

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="font-semibold">
                          {record.studentName}
                        </div>
                        <div className="text-xs text-slate-500">
                          {record.studentId}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {record.programme}
                      </td>

                      <td className="px-4 py-4">
                        <div>{record.academicYear}</div>
                        <div className="text-xs text-slate-500">
                          {record.semester}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {money(charges)}
                      </td>

                      <td className="px-4 py-4 font-medium text-green-700">
                        {money(record.amountPaid)}
                      </td>

                      <td className="px-4 py-4 font-semibold text-red-700">
                        {money(record.balance)}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            record.status === 'Paid'
                              ? 'bg-green-100 text-green-700'
                              : record.status === 'Partial'
                                ? 'bg-yellow-100 text-yellow-700'
                                : record.status === 'Overdue'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => {
                              setSelectedRecord(record)
                              setShowDetails(true)
                            }}
                            className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium hover:bg-slate-50"
                          >
                            View
                          </button>

                          <button
                            onClick={() => openPaymentModal(record)}
                            className="rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            Payment
                          </button>

                          <button
                            onClick={() => openFeeModal(record)}
                            className="rounded-md border border-blue-300 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50"
                          >
                            Edit Fees
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filteredRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-slate-500"
                    >
                      No finance records match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <a
            href="/admin/students"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300"
          >
            <h3 className="font-bold">Student Master List</h3>
            <p className="mt-1 text-sm text-slate-500">
              Open the central student records.
            </p>
          </a>

          <a
            href="/admin/registration"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300"
          >
            <h3 className="font-bold">Student Registration</h3>
            <p className="mt-1 text-sm text-slate-500">
              Manage admissions and registration records.
            </p>
          </a>

          <a
            href="/admin/registrar"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-blue-300"
          >
            <h3 className="font-bold">Registrar</h3>
            <p className="mt-1 text-sm text-slate-500">
              Continue academic administration and clearance.
            </p>
          </a>
        </div>
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                Fund Transfer Requests
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Review, approve and execute student fund transfer requests.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowTransferModal(true)}
                className="rounded-lg bg-[#071a3d] px-4 py-2 text-sm font-medium text-white hover:bg-[#0b285d]"
              >
                Record Transfer Request
              </button>

              <button
                onClick={exportTransfersCSV}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Export Transactions
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="px-3 py-3">Request</th>
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Amount</th>
                  <th className="px-3 py-3">Reason</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Transaction</th>
                  <th className="px-3 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {transferRequests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-8 text-center text-slate-500"
                    >
                      No fund transfer requests recorded.
                    </td>
                  </tr>
                ) : (
                  transferRequests.map((request) => (
                    <tr
                      key={request.id}
                      className="border-b border-slate-100"
                    >
                      <td className="px-3 py-3 font-medium">
                        {request.id}
                      </td>

                      <td className="px-3 py-3">
                        <div>{request.studentName}</div>
                        <div className="text-xs text-slate-500">
                          {request.studentId}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {money(request.amount)}
                      </td>

                      <td className="px-3 py-3">
                        <div>{request.reason}</div>
                        {request.description && (
                          <div className="text-xs text-slate-500">
                            {request.description}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium">
                          {request.status}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        {request.transactionReference || '—'}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          {request.status === 'Pending' && (
                            <>
                              <button
                                onClick={() =>
                                  reviewTransferRequest(
                                    request.id,
                                    'Approved'
                                  )
                                }
                                className="rounded-lg border border-green-300 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50"
                              >
                                Approve
                              </button>

                              <button
                                onClick={() =>
                                  reviewTransferRequest(
                                    request.id,
                                    'Rejected'
                                  )
                                }
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {request.status === 'Approved' && (
                            <button
                              onClick={() =>
                                executeTransferRequest(
                                  request.id
                                )
                              }
                              className="rounded-lg bg-[#071a3d] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0b285d]"
                            >
                              Execute
                            </button>
                          )}

                          {request.attachmentName && (
                            <button
                              onClick={() => {
                                if (!request.attachmentData) return

                                const link =
                                  document.createElement('a')

                                link.href =
                                  request.attachmentData

                                link.download =
                                  request.attachmentName

                                link.click()
                              }}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:bg-slate-50"
                            >
                              Attachment
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  Record Fund Transfer Request
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Record a student request for Bursary review.
                </p>
              </div>

              <button
                onClick={resetTransferForm}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">
                  Student
                </span>

                <select
                  value={transferForm.studentId}
                  onChange={(event) =>
                    setTransferForm((current) => ({
                      ...current,
                      studentId: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">
                    Select student
                  </option>

                  {students.map((student) => (
                    <option
                      key={getStudentId(student)}
                      value={getStudentId(student)}
                    >
                      {getStudentId(student)} — {student.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium">
                  Amount
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={transferForm.amount}
                  onChange={(event) =>
                    setTransferForm((current) => ({
                      ...current,
                      amount: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="0.00"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium">
                  Reason
                </span>

                <input
                  value={transferForm.reason}
                  onChange={(event) =>
                    setTransferForm((current) => ({
                      ...current,
                      reason: event.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Reason for transfer"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium">
                  Description
                </span>

                <textarea
                  value={transferForm.description}
                  onChange={(event) =>
                    setTransferForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="mt-1 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Additional transaction or supporting-document description"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-medium">
                  Receipt / Cheque / Supporting Document
                </span>

                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  onChange={(event) =>
                    setTransferAttachment(
                      event.target.files?.[0] || null
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                />

                <p className="mt-1 text-xs text-slate-500">
                  Maximum 10 MB. The document is stored with the transfer record.
                </p>
              </label>
            </div>

            {message && (
              <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                {message}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={resetTransferForm}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                onClick={createTransferRequest}
                className="rounded-lg bg-[#071a3d] px-4 py-2 text-sm font-medium text-white hover:bg-[#0b285d]"
              >
                Save Request
              </button>
            </div>
          </div>
        </div>
      )}

      {showFeeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">
                  Fee Record
                </h2>
                <p className="text-sm text-slate-500">
                  Set tuition, other fees and scholarship support.
                </p>
              </div>

              <button
                onClick={closeModals}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Student
                </label>

                <select
                  value={feeForm.studentId}
                  onChange={(event) =>
                    setFeeForm({
                      ...feeForm,
                      studentId: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">
                    Select registered student
                  </option>

                  {students.map((student) => {
                    const studentId = getStudentId(student)

                    if (!studentId) return null

                    return (
                      <option
                        key={studentId}
                        value={studentId}
                      >
                        {studentId} — {student.name}
                      </option>
                    )
                  })}

                  {feeForm.studentId &&
                    !students.some(
                      (student) =>
                        getStudentId(student) ===
                        feeForm.studentId
                    ) && (
                      <option value={feeForm.studentId}>
                        {feeForm.studentId} — Existing Finance Record
                      </option>
                    )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Academic Year
                </label>
                <input
                  value={feeForm.academicYear}
                  onChange={(event) =>
                    setFeeForm({
                      ...feeForm,
                      academicYear: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Semester
                </label>
                <select
                  value={feeForm.semester}
                  onChange={(event) =>
                    setFeeForm({
                      ...feeForm,
                      semester: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option>Semester 1</option>
                  <option>Semester 2</option>
                  <option>Summer</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Tuition Fee
                </label>
                <input
                  type="number"
                  min="0"
                  value={feeForm.tuitionFee}
                  onChange={(event) =>
                    setFeeForm({
                      ...feeForm,
                      tuitionFee: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Other Fees
                </label>
                <input
                  type="number"
                  min="0"
                  value={feeForm.otherFees}
                  onChange={(event) =>
                    setFeeForm({
                      ...feeForm,
                      otherFees: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Scholarship / Sponsorship
                </label>
                <input
                  type="number"
                  min="0"
                  value={feeForm.scholarshipAmount}
                  onChange={(event) =>
                    setFeeForm({
                      ...feeForm,
                      scholarshipAmount: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Sponsor
                </label>
                <input
                  value={feeForm.sponsor}
                  onChange={(event) =>
                    setFeeForm({
                      ...feeForm,
                      sponsor: event.target.value,
                    })
                  }
                  placeholder="Scholarship / sponsor name"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              {message && (
                <div className="md:col-span-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {message}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={closeModals}
                className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium"
              >
                Cancel
              </button>

              <button
                onClick={saveFeeRecord}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Save Fee Record
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">
                  Record Student Payment
                </h2>
                <p className="text-sm text-slate-500">
                  Record an official student fee payment.
                </p>
              </div>

              <button
                onClick={closeModals}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Student
                </label>

                <select
                  value={paymentForm.studentId}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      studentId: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option value="">
                    Select registered student
                  </option>

                  {students.map((student) => {
                    const studentId = getStudentId(student)

                    if (!studentId) return null

                    return (
                      <option
                        key={studentId}
                        value={studentId}
                      >
                        {studentId} — {student.name}
                      </option>
                    )
                  })}

                  {paymentForm.studentId &&
                    !students.some(
                      (student) =>
                        getStudentId(student) ===
                        paymentForm.studentId
                    ) && (
                      <option value={paymentForm.studentId}>
                        {paymentForm.studentId} — Existing Finance Record
                      </option>
                    )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Academic Year
                </label>
                <input
                  value={paymentForm.academicYear}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      academicYear: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Semester
                </label>
                <select
                  value={paymentForm.semester}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      semester: event.target.value,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option>Semester 1</option>
                  <option>Semester 2</option>
                  <option>Summer</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Payment Amount
                </label>
                <input
                  type="number"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      amount: event.target.value,
                    })
                  }
                  placeholder="0.00"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Payment Method
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      method:
                        event.target.value as PaymentMethod,
                    })
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Mobile Money</option>
                  <option>Card</option>
                  <option>Scholarship/Sponsor</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium">
                  Reference / Receipt Reference
                </label>
                <input
                  value={paymentForm.reference}
                  onChange={(event) =>
                    setPaymentForm({
                      ...paymentForm,
                      reference: event.target.value,
                    })
                  }
                  placeholder="Bank reference, receipt number, transaction ID..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>

              {message && (
                <div className="md:col-span-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {message}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
              <button
                onClick={closeModals}
                className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium"
              >
                Cancel
              </button>

              <button
                onClick={savePayment}
                className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700"
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetails && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold">
                  Financial Statement
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedRecord.studentId} · {selectedRecord.studentName}
                </p>
              </div>

              <button
                onClick={closeModals}
                className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase text-slate-400">
                  Student
                </p>
                <p className="mt-1 font-semibold">
                  {selectedRecord.studentName}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400">
                  Student ID
                </p>
                <p className="mt-1 font-semibold">
                  {selectedRecord.studentId}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400">
                  Programme
                </p>
                <p className="mt-1 font-semibold">
                  {selectedRecord.programme}
                </p>
              </div>

              <div>
                <p className="text-xs uppercase text-slate-400">
                  Academic Period
                </p>
                <p className="mt-1 font-semibold">
                  {selectedRecord.academicYear} ·{' '}
                  {selectedRecord.semester}
                </p>
              </div>
            </div>

            <div className="mx-6 rounded-xl border border-slate-200">
              <div className="flex justify-between border-b border-slate-200 px-4 py-3">
                <span>Tuition Fee</span>
                <span className="font-medium">
                  {money(selectedRecord.tuitionFee)}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200 px-4 py-3">
                <span>Other Fees</span>
                <span className="font-medium">
                  {money(selectedRecord.otherFees)}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200 px-4 py-3">
                <span>Scholarship / Sponsor</span>
                <span className="font-medium text-green-700">
                  -{money(selectedRecord.scholarshipAmount)}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200 bg-slate-50 px-4 py-3 font-bold">
                <span>Total Charges</span>
                <span>
                  {money(
                    selectedRecord.tuitionFee +
                      selectedRecord.otherFees -
                      selectedRecord.scholarshipAmount
                  )}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-200 px-4 py-3">
                <span>Amount Paid</span>
                <span className="font-semibold text-green-700">
                  {money(selectedRecord.amountPaid)}
                </span>
              </div>

              <div className="flex justify-between px-4 py-3 font-bold">
                <span>Outstanding Balance</span>
                <span className="text-red-700">
                  {money(selectedRecord.balance)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-5">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  selectedRecord.status === 'Paid'
                    ? 'bg-green-100 text-green-700'
                    : selectedRecord.status === 'Partial'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {selectedRecord.status}
              </span>

              <div className="flex gap-2">
                <button
                  onClick={() =>
                    printStatement(selectedRecord)
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
                >
                  Print Statement
                </button>

                <button
                  onClick={() => {
                    closeModals()
                    openPaymentModal(selectedRecord)
                  }}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Record Payment
                </button>

                <button
                  onClick={closeModals}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
