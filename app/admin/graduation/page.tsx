'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  clearNexusSession,
  protectNexusPage,
} from "@/lib/nexus-access"

import { NEXUS_KEYS } from "@/lib/nexus-data"

type StudentStatus =
  | 'Pending'
  | 'Eligible'
  | 'Cleared'
  | 'On Hold'
  | 'Graduated';

type ClearanceStatus =
  | 'Pending'
  | 'Cleared'
  | 'Not Cleared'
  | 'Not Required';

type ApprovalStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected';

type GraduationStatus =
  | 'Candidate'
  | 'Clearance'
  | 'Department Approved'
  | 'Registrar Approved'
  | 'Graduation List'
  | 'Graduated'
  | 'On Hold';

type Tab =
  | 'Dashboard'
  | 'Candidates'
  | 'Academic'
  | 'Financial'
  | 'Library'
  | 'Dormitory'
  | 'Department'
  | 'Registrar'
  | 'Graduation List'
  | 'Certificates'
  | 'Transcripts'
  | 'Reports';

type Student = {
  id?: string;
  studentId?: string;
  applicationNumber?: string;
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  province?: string;
  faculty?: string;
  department?: string;
  programme?: string;
  program?: string;
  yearLevel?: string | number;
  studentType?: string;
  status?: string;
  registrationStatus?: string;
  admissionYear?: string | number;
};

type FinanceRecord = {
  id: string;
  studentId: string;
  studentName?: string;
  totalFees?: number;
  totalAmount?: number;
  amountPaid?: number;
  paidAmount?: number;
  balance?: number;
  status?: string;
};

type Payment = {
  id: string;
  studentId: string;
  amount?: number;
  paymentAmount?: number;
  date?: string;
  paymentDate?: string;
  status?: string;
};

type LibraryLoan = {
  id: string;
  studentId: string;
  studentName?: string;
  bookTitle?: string;
  status?: string;
  fine?: number;
  fines?: number;
  returned?: boolean;
};

type DormitoryAllocation = {
  id: string;
  studentId: string;
  studentName?: string;
  dormitoryId?: string;
  dormitoryName?: string;
  roomNumber?: string;
  status?: string;
  allocationStatus?: string;
  outstandingFee?: number;
  balance?: number;
};

type Dormitory = {
  id: string;
  name: string;
  status?: string;
};

type AcademicRecord = {
  id: string;
  studentId: string;
  courseCode?: string;
  courseTitle?: string;
  grade?: string;
  gradePoint?: number;
  creditHours?: number;
  semester?: string;
  academicYear?: string;
  status?: string;
};

type GraduationRecord = {
  id: string;
  studentId: string;
  studentName: string;
  faculty: string;
  department: string;
  programme: string;
  graduationYear: string;
  graduationPeriod: string;

  academicStatus: ClearanceStatus;
  financialStatus: ClearanceStatus;
  libraryStatus: ClearanceStatus;
  dormitoryStatus: ClearanceStatus;

  departmentApproval: ApprovalStatus;
  registrarApproval: ApprovalStatus;

  status: GraduationStatus;

  academicOfficer?: string;
  academicDate?: string;
  academicNotes?: string;

  financeOfficer?: string;
  financeDate?: string;
  financeNotes?: string;

  libraryOfficer?: string;
  libraryDate?: string;
  libraryNotes?: string;

  dormitoryOfficer?: string;
  dormitoryDate?: string;
  dormitoryNotes?: string;

  departmentOfficer?: string;
  departmentDate?: string;
  departmentNotes?: string;

  registrarOfficer?: string;
  registrarDate?: string;
  registrarNotes?: string;

  graduationListNumber?: string;
  certificateNumber?: string;
  transcriptNumber?: string;

  certificateIssued?: boolean;
  transcriptIssued?: boolean;

  createdAt: string;
  updatedAt: string;
};

type Certificate = {
  id: string;
  studentId: string;
  studentName: string;
  programme: string;
  faculty: string;
  graduationYear: string;
  certificateNumber: string;
  issueDate: string;
  status: 'Issued' | 'Reprinted' | 'Cancelled';
};

type Transcript = {
  id: string;
  studentId: string;
  studentName: string;
  programme: string;
  faculty: string;
  graduationYear: string;
  transcriptNumber: string;
  issueDate: string;
  status: 'Issued' | 'Reprinted' | 'Cancelled';
};

const STORAGE = {
  students: NEXUS_KEYS.students,
  legacyStudents: 'nexusSIS_registered_students',
  finance: 'nexusSIS_finance_records',
  payments: 'nexusSIS_payments',
  libraryLoans: 'nexusSIS_library_loans',
  dormitoryAllocations: 'nexusSIS_dormitory_allocations',
  dormitories: 'nexusSIS_dormitories',
  graduation: 'nexusSIS_graduation_records',
  certificates: 'nexusSIS_graduation_certificates',
  transcripts: 'nexusSIS_graduation_transcripts',
  academicRecords: 'nexusSIS_academic_records',
  session: 'nexussis_session',
  username: 'nexus_username',
};

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'Dashboard', label: 'Dashboard' },
  { id: 'Candidates', label: 'Candidates' },
  { id: 'Academic', label: 'Academic Clearance' },
  { id: 'Financial', label: 'Financial Clearance' },
  { id: 'Library', label: 'Library Clearance' },
  { id: 'Dormitory', label: 'Dormitory Clearance' },
  { id: 'Department', label: 'Department Approval' },
  { id: 'Registrar', label: 'Registrar Approval' },
  { id: 'Graduation List', label: 'Graduation List' },
  { id: 'Certificates', label: 'Certificates' },
  { id: 'Transcripts', label: 'Transcripts' },
  { id: 'Reports', label: 'Reports' },
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function nowIso() {
  return new Date().toISOString();
}

function money(value: number | undefined | null) {
  return `PGK ${Number(value || 0).toLocaleString('en-PG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');

  if (
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n')
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<unknown>>
) {
  const csv = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => row.map(csvEscape).join(',')),
  ].join('\n');

  const blob = new Blob([csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

function getStudentId(student: Student) {
  return String(
    student.studentId ||
      student.id ||
      student.applicationNumber ||
      ''
  );
}

function getStudentName(student: Student) {
  if (student.fullName) {
    return student.fullName;
  }

  return [
    student.firstName,
    student.middleName,
    student.lastName,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
}

function getProgramme(student: Student) {
  return student.programme || student.program || '';
}

function getFinanceBalance(record: FinanceRecord) {
  if (typeof record.balance === 'number') {
    return record.balance;
  }

  const total =
    record.totalFees ??
    record.totalAmount ??
    0;

  const paid =
    record.amountPaid ??
    record.paidAmount ??
    0;

  return Math.max(0, total - paid);
}

function getLibraryFine(loan: LibraryLoan) {
  return Number(loan.fine ?? loan.fines ?? 0);
}

function getDormitoryBalance(allocation: DormitoryAllocation) {
  return Number(
    allocation.outstandingFee ??
      allocation.balance ??
      0
  );
}

function isLibraryLoanOutstanding(loan: LibraryLoan) {
  const status = String(loan.status || '').toLowerCase();

  if (loan.returned === true) {
    return false;
  }

  if (
    status === 'returned' ||
    status === 'closed' ||
    status === 'cleared'
  ) {
    return false;
  }

  return true;
}

function isDormitoryAllocationActive(
  allocation: DormitoryAllocation
) {
  const status = String(
    allocation.allocationStatus ||
      allocation.status ||
      ''
  ).toLowerCase();

  return ![
    'cancelled',
    'canceled',
    'checked out',
    'checked-out',
    'closed',
  ].includes(status);
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  let className = 'bg-slate-100 text-slate-700';

  if (
    status === 'Cleared' ||
    status === 'Approved' ||
    status === 'Graduation List' ||
    status === 'Graduated' ||
    status === 'Issued' ||
    status === 'Eligible'
  ) {
    className = 'bg-emerald-100 text-emerald-700';
  } else if (
    status === 'Not Cleared' ||
    status === 'Rejected' ||
    status === 'On Hold' ||
    status === 'Cancelled'
  ) {
    className = 'bg-red-100 text-red-700';
  } else if (
    status === 'Department Approved' ||
    status === 'Registrar Approved'
  ) {
    className = 'bg-blue-100 text-blue-700';
  } else if (
    status === 'Clearance' ||
    status === 'Candidate' ||
    status === 'Pending'
  ) {
    className = 'bg-amber-100 text-amber-700';
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {status}
    </span>
  );
}

function ClearanceBadge({
  status,
}: {
  status: ClearanceStatus;
}) {
  return <StatusBadge status={status} />;
}

function ApprovalBadge({
  status,
}: {
  status: ApprovalStatus;
}) {
  return <StatusBadge status={status} />;
}

export default function GraduationPage() {
  const router = useRouter();

  const [tab, setTab] = useState<Tab>('Dashboard');

  const [students, setStudents] = useState<Student[]>([]);
  const [financeRecords, setFinanceRecords] = useState<
    FinanceRecord[]
  >([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [libraryLoans, setLibraryLoans] = useState<
    LibraryLoan[]
  >([]);
  const [dormitoryAllocations, setDormitoryAllocations] =
    useState<DormitoryAllocation[]>([]);
  const [dormitories, setDormitories] = useState<Dormitory[]>(
    []
  );
  const [academicRecords, setAcademicRecords] = useState<
    AcademicRecord[]
  >([]);
  const [graduationRecords, setGraduationRecords] = useState<
    GraduationRecord[]
  >([]);
  const [certificates, setCertificates] = useState<
    Certificate[]
  >([]);
  const [transcripts, setTranscripts] = useState<
    Transcript[]
  >([]);

  const [search, setSearch] = useState('');
  const [facultyFilter, setFacultyFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  const [selectedRecord, setSelectedRecord] =
    useState<GraduationRecord | null>(null);

  const [selectedStudentId, setSelectedStudentId] =
    useState('');

  const [showCandidateModal, setShowCandidateModal] =
    useState(false);

  const [showDetailsModal, setShowDetailsModal] =
    useState(false);

  const [showClearanceModal, setShowClearanceModal] =
    useState(false);

  const [clearanceType, setClearanceType] = useState<
    | 'Academic'
    | 'Financial'
    | 'Library'
    | 'Dormitory'
    | 'Department'
    | 'Registrar'
  >('Academic');

  const [clearanceNotes, setClearanceNotes] = useState('');
  const [officerName, setOfficerName] = useState('');

  const [graduationYear, setGraduationYear] = useState(
    new Date().getFullYear().toString()
  );

  const [graduationPeriod, setGraduationPeriod] =
    useState('December');

  const [programmeFilter, setProgrammeFilter] = useState('');

  useEffect(() => {
    protectNexusPage([
      "Registrar",
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    type CentralStudentRecord = {
      id?: string;
      studentId?: string;
      applicationId?: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      fullName?: string;
      gender?: string;
      dateOfBirth?: string;
      province?: string;
      phone?: string;
      email?: string;
      facultyId?: string;
      departmentId?: string;
      programmeId?: string;
      facultyName?: string;
      departmentName?: string;
      programmeName?: string;
      studentType?: string;
      yearLevel?: number;
      status?: string;
      academicYear?: string;
    };

    const loadedCentralStudents =
      readJson<CentralStudentRecord[]>(
        STORAGE.students,
        []
      );

    const loadedLegacyStudents =
      readJson<Student[]>(
        STORAGE.legacyStudents,
        []
      );

    const loadedStudents: Student[] =
      loadedCentralStudents.length > 0
        ? loadedCentralStudents.map((student) => ({
            id: student.id,
            studentId: student.studentId,
            applicationNumber: student.applicationId,
            fullName: student.fullName,
            firstName: student.firstName,
            middleName: student.middleName,
            lastName: student.lastName,
            gender: student.gender,
            dateOfBirth: student.dateOfBirth,
            email: student.email,
            phone: student.phone,
            province: student.province,
            faculty: student.facultyName,
            department: student.departmentName,
            programme: student.programmeName,
            program: student.programmeName,
            yearLevel: student.yearLevel,
            studentType: student.studentType,
            status: student.status,
            registrationStatus: student.status,
            admissionYear: student.academicYear,
          }))
        : loadedLegacyStudents;

    const loadedFinance = readJson<FinanceRecord[]>(
      STORAGE.finance,
      []
    );

    const loadedPayments = readJson<Payment[]>(
      STORAGE.payments,
      []
    );

    const loadedLibraryLoans = readJson<LibraryLoan[]>(
      STORAGE.libraryLoans,
      []
    );

    const loadedDormitoryAllocations =
      readJson<DormitoryAllocation[]>(
        STORAGE.dormitoryAllocations,
        []
      );

    const loadedDormitories = readJson<Dormitory[]>(
      STORAGE.dormitories,
      []
    );

    const loadedAcademicRecords =
      readJson<AcademicRecord[]>(
        STORAGE.academicRecords,
        []
      );

    const loadedGraduation =
      readJson<GraduationRecord[]>(
        STORAGE.graduation,
        []
      );

    const loadedCertificates =
      readJson<Certificate[]>(
        STORAGE.certificates,
        []
      );

    const loadedTranscripts =
      readJson<Transcript[]>(
        STORAGE.transcripts,
        []
      );

    setStudents(loadedStudents);
    setFinanceRecords(loadedFinance);
    setPayments(loadedPayments);
    setLibraryLoans(loadedLibraryLoans);
    setDormitoryAllocations(
      loadedDormitoryAllocations
    );
    setDormitories(loadedDormitories);
    setAcademicRecords(loadedAcademicRecords);
    setGraduationRecords(loadedGraduation);
    setCertificates(loadedCertificates);
    setTranscripts(loadedTranscripts);

    const handleStudentsUpdated = () => {
      type CentralStudentRecord = {
        id?: string;
        studentId?: string;
        applicationId?: string;
        firstName?: string;
        middleName?: string;
        lastName?: string;
        fullName?: string;
        gender?: string;
        dateOfBirth?: string;
        province?: string;
        phone?: string;
        email?: string;
        facultyName?: string;
        departmentName?: string;
        programmeName?: string;
        studentType?: string;
        yearLevel?: number;
        status?: string;
        academicYear?: string;
      };

      const updatedCentralStudents =
        readJson<CentralStudentRecord[]>(
          STORAGE.students,
          []
        );

      const updatedLegacyStudents =
        readJson<Student[]>(
          STORAGE.legacyStudents,
          []
        );

      const updatedStudents: Student[] =
        updatedCentralStudents.length > 0
          ? updatedCentralStudents.map((student) => ({
              id: student.id,
              studentId: student.studentId,
              applicationNumber: student.applicationId,
              fullName: student.fullName,
              firstName: student.firstName,
              middleName: student.middleName,
              lastName: student.lastName,
              gender: student.gender,
              dateOfBirth: student.dateOfBirth,
              email: student.email,
              phone: student.phone,
              province: student.province,
              faculty: student.facultyName,
              department: student.departmentName,
              programme: student.programmeName,
              program: student.programmeName,
              yearLevel: student.yearLevel,
              studentType: student.studentType,
              status: student.status,
              registrationStatus: student.status,
              admissionYear: student.academicYear,
            }))
          : updatedLegacyStudents;

      setStudents(updatedStudents);
    };

    window.addEventListener(
      'nexusSIS_students_updated',
      handleStudentsUpdated,
    );

    window.addEventListener(
      'storage',
      handleStudentsUpdated,
    );

    return () => {
      window.removeEventListener(
        'nexusSIS_students_updated',
        handleStudentsUpdated,
      );

      window.removeEventListener(
        'storage',
        handleStudentsUpdated,
      );
    };
  }, []);

  const faculties = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map((student) => student.faculty)
          .filter((faculty): faculty is string => Boolean(faculty))
      )
    ).sort();
  }, [students]);

  const programmes = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map((student) => getProgramme(student))
          .filter(Boolean)
      )
    ).sort();
  }, [students]);

  const getStudent = (studentId: string) => {
    return students.find(
      (student) => getStudentId(student) === studentId
    );
  };

  const getFinance = (studentId: string) => {
    return financeRecords.filter(
      (record) => record.studentId === studentId
    );
  };

  const getPayments = (studentId: string) => {
    return payments.filter(
      (payment) => payment.studentId === studentId
    );
  };

  const getLibrary = (studentId: string) => {
    return libraryLoans.filter(
      (loan) => loan.studentId === studentId
    );
  };

  const getDormitory = (studentId: string) => {
    return dormitoryAllocations.filter(
      (allocation) =>
        allocation.studentId === studentId
    );
  };

  const getAcademic = (studentId: string) => {
    return academicRecords.filter(
      (record) => record.studentId === studentId
    );
  };

  const calculateAcademicClearance = (
    studentId: string
  ): ClearanceStatus => {
    const records = getAcademic(studentId);

    if (!records.length) {
      return 'Pending';
    }

    const hasIncomplete = records.some((record) => {
      const status = String(record.status || '')
        .toLowerCase();

      const grade = String(record.grade || '')
        .toUpperCase();

      return (
        status === 'incomplete' ||
        status === 'failed' ||
        status === 'fail' ||
        grade === 'F' ||
        grade === 'I'
      );
    });

    return hasIncomplete
      ? 'Not Cleared'
      : 'Cleared';
  };

  const calculateFinancialClearance = (
    studentId: string
  ): ClearanceStatus => {
    const records = getFinance(studentId);

    if (!records.length) {
      return 'Cleared';
    }

    const balance = records.reduce(
      (sum, record) =>
        sum + getFinanceBalance(record),
      0
    );

    return balance <= 0
      ? 'Cleared'
      : 'Not Cleared';
  };

  const calculateLibraryClearance = (
    studentId: string
  ): ClearanceStatus => {
    const loans = getLibrary(studentId);

    const outstanding = loans.filter(
      isLibraryLoanOutstanding
    );

    const fines = loans.reduce(
      (sum, loan) =>
        sum + getLibraryFine(loan),
      0
    );

    if (
      outstanding.length === 0 &&
      fines <= 0
    ) {
      return 'Cleared';
    }

    return 'Not Cleared';
  };

  const calculateDormitoryClearance = (
    studentId: string
  ): ClearanceStatus => {
    const allocations = getDormitory(studentId);

    if (!allocations.length) {
      return 'Not Required';
    }

    const activeAllocations =
      allocations.filter(
        isDormitoryAllocationActive
      );

    const balance = allocations.reduce(
      (sum, allocation) =>
        sum + getDormitoryBalance(allocation),
      0
    );

    if (
      activeAllocations.length === 0 &&
      balance <= 0
    ) {
      return 'Cleared';
    }

    return 'Not Cleared';
  };

  const calculateOverallStatus = (
    record: GraduationRecord
  ): GraduationStatus => {
    const clearances = [
      record.academicStatus,
      record.financialStatus,
      record.libraryStatus,
      record.dormitoryStatus,
    ];

    if (
      clearances.includes('Not Cleared')
    ) {
      return 'On Hold';
    }

    if (
      record.registrarApproval === 'Approved'
    ) {
      if (record.status === 'Graduated') {
        return 'Graduated';
      }

      return 'Registrar Approved';
    }

    if (
      record.departmentApproval === 'Approved'
    ) {
      return 'Department Approved';
    }

    if (
      clearances.every(
        (status) =>
          status === 'Cleared' ||
          status === 'Not Required'
      )
    ) {
      return 'Clearance';
    }

    return 'Clearance';
  };

  const buildRecordForStudent = (
    student: Student
  ): GraduationRecord => {
    const studentId = getStudentId(student);
    const studentName = getStudentName(student);

    const existing = graduationRecords.find(
      (record) => record.studentId === studentId
    );

    if (existing) {
      return existing;
    }

    const academicStatus =
      calculateAcademicClearance(studentId);

    const financialStatus =
      calculateFinancialClearance(studentId);

    const libraryStatus =
      calculateLibraryClearance(studentId);

    const dormitoryStatus =
      calculateDormitoryClearance(studentId);

    const initialStatus: GraduationStatus =
      academicStatus === 'Cleared' &&
      financialStatus === 'Cleared' &&
      libraryStatus === 'Cleared' &&
      (
        dormitoryStatus === 'Cleared' ||
        dormitoryStatus === 'Not Required'
      )
        ? 'Clearance'
        : 'On Hold';

    return {
      id: `GRAD-${Date.now()}-${studentId}`,
      studentId,
      studentName,
      faculty: student.faculty || '',
      department: student.department || '',
      programme: getProgramme(student),
      graduationYear,
      graduationPeriod,

      academicStatus,
      financialStatus,
      libraryStatus,
      dormitoryStatus,

      departmentApproval: 'Pending',
      registrarApproval: 'Pending',

      status: initialStatus,

      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  };

  const saveGraduationRecord = (
    record: GraduationRecord
  ) => {
    const records = [...graduationRecords];

    const index = records.findIndex(
      (item) => item.id === record.id
    );

    if (index >= 0) {
      records[index] = {
        ...record,
        updatedAt: nowIso(),
      };
    } else {
      records.unshift({
        ...record,
        updatedAt: nowIso(),
      });
    }

    setGraduationRecords(records);
    writeJson(STORAGE.graduation, records);
  };

  const refreshRecordClearances = (
    record: GraduationRecord
  ) => {
    const academicStatus =
      calculateAcademicClearance(
        record.studentId
      );

    const financialStatus =
      calculateFinancialClearance(
        record.studentId
      );

    const libraryStatus =
      calculateLibraryClearance(
        record.studentId
      );

    const dormitoryStatus =
      calculateDormitoryClearance(
        record.studentId
      );

    const refreshed: GraduationRecord = {
      ...record,
      academicStatus,
      financialStatus,
      libraryStatus,
      dormitoryStatus,
      updatedAt: nowIso(),
    };

    refreshed.status =
      calculateOverallStatus(refreshed);

    saveGraduationRecord(refreshed);

    setSelectedRecord(refreshed);
  };

  const addCandidate = () => {
    if (!selectedStudentId) {
      return;
    }

    const student = getStudent(selectedStudentId);

    if (!student) {
      return;
    }

    const existing = graduationRecords.find(
      (record) =>
        record.studentId === selectedStudentId
    );

    if (existing) {
      setSelectedRecord(existing);
      setShowDetailsModal(true);
      return;
    }

    const record = buildRecordForStudent(student);

    saveGraduationRecord(record);

    setShowCandidateModal(false);
    setSelectedStudentId('');

    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const openClearance = (
    record: GraduationRecord,
    type: typeof clearanceType
  ) => {
    setSelectedRecord(record);
    setClearanceType(type);
    setClearanceNotes('');
    setOfficerName(
      localStorage.getItem(STORAGE.username) ||
        'Officer'
    );
    setShowClearanceModal(true);
  };

  const approveClearance = () => {
    if (!selectedRecord) {
      return;
    }

    const record = {
      ...selectedRecord,
    };

    const officer =
      officerName.trim() || 'Officer';

    const date = today();

    if (clearanceType === 'Academic') {
      record.academicStatus = 'Cleared';
      record.academicOfficer = officer;
      record.academicDate = date;
      record.academicNotes = clearanceNotes;
    }

    if (clearanceType === 'Financial') {
      record.financialStatus = 'Cleared';
      record.financeOfficer = officer;
      record.financeDate = date;
      record.financeNotes = clearanceNotes;
    }

    if (clearanceType === 'Library') {
      record.libraryStatus = 'Cleared';
      record.libraryOfficer = officer;
      record.libraryDate = date;
      record.libraryNotes = clearanceNotes;
    }

    if (clearanceType === 'Dormitory') {
      record.dormitoryStatus = 'Cleared';
      record.dormitoryOfficer = officer;
      record.dormitoryDate = date;
      record.dormitoryNotes = clearanceNotes;
    }

    if (clearanceType === 'Department') {
      record.departmentApproval = 'Approved';
      record.departmentOfficer = officer;
      record.departmentDate = date;
      record.departmentNotes = clearanceNotes;
    }

    if (clearanceType === 'Registrar') {
      record.registrarApproval = 'Approved';
      record.registrarOfficer = officer;
      record.registrarDate = date;
      record.registrarNotes = clearanceNotes;
    }

    record.status =
      calculateOverallStatus(record);

    if (
      clearanceType === 'Registrar' &&
      record.registrarApproval === 'Approved'
    ) {
      record.status = 'Registrar Approved';
    }

    saveGraduationRecord(record);

    setSelectedRecord(record);
    setShowClearanceModal(false);
    setClearanceNotes('');
  };

  const rejectApproval = () => {
    if (!selectedRecord) {
      return;
    }

    const record = {
      ...selectedRecord,
    };

    const officer =
      officerName.trim() || 'Officer';

    const date = today();

    if (clearanceType === 'Department') {
      record.departmentApproval = 'Rejected';
      record.departmentOfficer = officer;
      record.departmentDate = date;
      record.departmentNotes = clearanceNotes;
      record.status = 'On Hold';
    }

    if (clearanceType === 'Registrar') {
      record.registrarApproval = 'Rejected';
      record.registrarOfficer = officer;
      record.registrarDate = date;
      record.registrarNotes = clearanceNotes;
      record.status = 'On Hold';
    }

    saveGraduationRecord(record);

    setSelectedRecord(record);
    setShowClearanceModal(false);
    setClearanceNotes('');
  };

  const addToGraduationList = (
    record: GraduationRecord
  ) => {
    if (
      record.registrarApproval !== 'Approved'
    ) {
      return;
    }

    const existingNumber =
      record.graduationListNumber ||
      `GL-${record.graduationYear}-${String(
        graduationRecords.findIndex(
          (item) => item.id === record.id
        ) + 1
      ).padStart(4, '0')}`;

    const updated: GraduationRecord = {
      ...record,
      graduationListNumber: existingNumber,
      status: 'Graduation List',
      updatedAt: nowIso(),
    };

    saveGraduationRecord(updated);
    setSelectedRecord(updated);
  };

  const issueCertificate = (
    record: GraduationRecord
  ) => {
    if (
      record.status !== 'Graduation List' &&
      record.status !== 'Graduated'
    ) {
      return;
    }

    const existing = certificates.find(
      (certificate) =>
        certificate.studentId === record.studentId
    );

    const certificateNumber =
      existing?.certificateNumber ||
      `CERT-${record.graduationYear}-${String(
        certificates.length + 1
      ).padStart(5, '0')}`;

    const certificate: Certificate =
      existing || {
        id: `CERT-${Date.now()}`,
        studentId: record.studentId,
        studentName: record.studentName,
        programme: record.programme,
        faculty: record.faculty,
        graduationYear: record.graduationYear,
        certificateNumber,
        issueDate: today(),
        status: 'Issued',
      };

    const nextCertificates = existing
      ? certificates.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                status: 'Issued' as const,
              }
            : item
        )
      : [certificate, ...certificates];

    setCertificates(nextCertificates);
    writeJson(
      STORAGE.certificates,
      nextCertificates
    );

    const updated: GraduationRecord = {
      ...record,
      certificateNumber,
      certificateIssued: true,
      status: 'Graduated',
      updatedAt: nowIso(),
    };

    saveGraduationRecord(updated);
    setSelectedRecord(updated);
  };

  const issueTranscript = (
    record: GraduationRecord
  ) => {
    if (
      record.status !== 'Graduation List' &&
      record.status !== 'Graduated'
    ) {
      return;
    }

    const existing = transcripts.find(
      (transcript) =>
        transcript.studentId === record.studentId
    );

    const transcriptNumber =
      existing?.transcriptNumber ||
      `TRX-${record.graduationYear}-${String(
        transcripts.length + 1
      ).padStart(5, '0')}`;

    const transcript: Transcript =
      existing || {
        id: `TRX-${Date.now()}`,
        studentId: record.studentId,
        studentName: record.studentName,
        programme: record.programme,
        faculty: record.faculty,
        graduationYear: record.graduationYear,
        transcriptNumber,
        issueDate: today(),
        status: 'Issued',
      };

    const nextTranscripts = existing
      ? transcripts.map((item) =>
          item.id === existing.id
            ? {
                ...item,
                status: 'Issued' as const,
              }
            : item
        )
      : [transcript, ...transcripts];

    setTranscripts(nextTranscripts);
    writeJson(
      STORAGE.transcripts,
      nextTranscripts
    );

    const updated: GraduationRecord = {
      ...record,
      transcriptNumber,
      transcriptIssued: true,
      updatedAt: nowIso(),
    };

    saveGraduationRecord(updated);
    setSelectedRecord(updated);
  };

  const createTranscriptFromAcademicRecord = (
    record: GraduationRecord
  ) => {
    issueTranscript(record);
  };

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return graduationRecords.filter(
      (record) => {
        const matchesSearch =
          !query ||
          record.studentId
            .toLowerCase()
            .includes(query) ||
          record.studentName
            .toLowerCase()
            .includes(query) ||
          record.programme
            .toLowerCase()
            .includes(query) ||
          record.department
            .toLowerCase()
            .includes(query);

        const matchesFaculty =
          facultyFilter === 'All' ||
          record.faculty === facultyFilter;

        const matchesStatus =
          statusFilter === 'All' ||
          record.status === statusFilter;

        const matchesProgramme =
          !programmeFilter ||
          record.programme === programmeFilter;

        return (
          matchesSearch &&
          matchesFaculty &&
          matchesStatus &&
          matchesProgramme
        );
      }
    );
  }, [
    graduationRecords,
    search,
    facultyFilter,
    statusFilter,
    programmeFilter,
  ]);

  const candidateStudents = useMemo(() => {
    return students.filter((student) => {
      const id = getStudentId(student);

      if (!id) {
        return false;
      }

      const alreadyCandidate =
        graduationRecords.some(
          (record) => record.studentId === id
        );

      if (alreadyCandidate) {
        return false;
      }

      const status = String(
        student.status ||
          student.registrationStatus ||
          ''
      ).toLowerCase();

      if (
        status === 'withdrawn' ||
        status === 'inactive' ||
        status === 'deferred'
      ) {
        return false;
      }

      return true;
    });
  }, [students, graduationRecords]);

  const counts = useMemo(() => {
    const candidates = graduationRecords.length;

    const academicCleared =
      graduationRecords.filter(
        (record) =>
          record.academicStatus === 'Cleared'
      ).length;

    const financialCleared =
      graduationRecords.filter(
        (record) =>
          record.financialStatus === 'Cleared'
      ).length;

    const libraryCleared =
      graduationRecords.filter(
        (record) =>
          record.libraryStatus === 'Cleared'
      ).length;

    const dormitoryCleared =
      graduationRecords.filter(
        (record) =>
          record.dormitoryStatus === 'Cleared' ||
          record.dormitoryStatus ===
            'Not Required'
      ).length;

    const departmentApproved =
      graduationRecords.filter(
        (record) =>
          record.departmentApproval ===
          'Approved'
      ).length;

    const registrarApproved =
      graduationRecords.filter(
        (record) =>
          record.registrarApproval ===
          'Approved'
      ).length;

    const graduationList =
      graduationRecords.filter(
        (record) =>
          record.status === 'Graduation List' ||
          record.status === 'Graduated'
      ).length;

    const graduated =
      graduationRecords.filter(
        (record) =>
          record.status === 'Graduated'
      ).length;

    return {
      candidates,
      academicCleared,
      financialCleared,
      libraryCleared,
      dormitoryCleared,
      departmentApproved,
      registrarApproved,
      graduationList,
      graduated,
    };
  }, [graduationRecords]);

  const totalOutstandingFinance = useMemo(() => {
    return graduationRecords.reduce(
      (sum, record) => {
        return (
          sum +
          getFinance(record.studentId).reduce(
            (inner, finance) =>
              inner + getFinanceBalance(finance),
            0
          )
        );
      },
      0
    );
  }, [graduationRecords, financeRecords]);

  const totalLibraryFines = useMemo(() => {
    return graduationRecords.reduce(
      (sum, record) => {
        return (
          sum +
          getLibrary(record.studentId).reduce(
            (inner, loan) =>
              inner + getLibraryFine(loan),
            0
          )
        );
      },
      0
    );
  }, [graduationRecords, libraryLoans]);

  const totalDormitoryBalance = useMemo(() => {
    return graduationRecords.reduce(
      (sum, record) => {
        return (
          sum +
          getDormitory(record.studentId).reduce(
            (inner, allocation) =>
              inner +
              getDormitoryBalance(allocation),
            0
          )
        );
      },
      0
    );
  }, [
    graduationRecords,
    dormitoryAllocations,
  ]);

  const refreshAll = () => {
    const refreshed = graduationRecords.map(
      (record) => {
        const updated = {
          ...record,
          academicStatus:
            calculateAcademicClearance(
              record.studentId
            ),
          financialStatus:
            calculateFinancialClearance(
              record.studentId
            ),
          libraryStatus:
            calculateLibraryClearance(
              record.studentId
            ),
          dormitoryStatus:
            calculateDormitoryClearance(
              record.studentId
            ),
          updatedAt: nowIso(),
        };

        updated.status =
          calculateOverallStatus(updated);

        return updated;
      }
    );

    setGraduationRecords(refreshed);
    writeJson(STORAGE.graduation, refreshed);
  };

  const signOut = () => {
    clearNexusSession();
    router.push('/dashboard');
  };

  const printRecord = (record: GraduationRecord) => {
    setSelectedRecord(record);

    setTimeout(() => {
      window.print();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <header className="bg-slate-900 text-white shadow-lg print:hidden">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 font-bold">
                  N
                </div>

                <div>
                  <h1 className="text-xl font-bold">
                    Nexus SIS
                  </h1>

                  <p className="text-xs text-slate-400">
                    Graduation & Clearance
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() =>
                  router.push('/admin/registrar')
                }
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
              >
                Registrar
              </button>

              <button
                onClick={() =>
                  router.push('/admin/students')
                }
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
              >
                Students
              </button>

              <button
                onClick={signOut}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold hover:bg-red-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Graduation & Clearance
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage academic, financial, library, dormitory,
                department and registrar clearance through one
                central Student ID.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={refreshAll}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Refresh Clearances
              </button>

              <button
                onClick={() =>
                  setShowCandidateModal(true)
                }
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                + Add Candidate
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
          {[
            ['Candidates', counts.candidates],
            ['Academic', counts.academicCleared],
            ['Finance', counts.financialCleared],
            ['Library', counts.libraryCleared],
            ['Dormitory', counts.dormitoryCleared],
            ['Department', counts.departmentApproved],
            ['Registrar', counts.registrarApproved],
            ['Graduation List', counts.graduationList],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-xl bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </p>

              <p className="mt-2 text-2xl font-bold text-slate-900">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="mb-6 overflow-x-auto rounded-xl bg-white shadow-sm print:hidden">
          <div className="flex min-w-max gap-1 border-b border-slate-200 p-2">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  tab === item.id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'Dashboard' && (
          <DashboardTab
            counts={counts}
            totalOutstandingFinance={
              totalOutstandingFinance
            }
            totalLibraryFines={totalLibraryFines}
            totalDormitoryBalance={
              totalDormitoryBalance
            }
            graduationRecords={graduationRecords}
            onOpen={(record) => {
              setSelectedRecord(record);
              setShowDetailsModal(true);
            }}
          />
        )}

        {tab === 'Candidates' && (
          <CandidatesTab
            records={filteredRecords}
            search={search}
            setSearch={setSearch}
            facultyFilter={facultyFilter}
            setFacultyFilter={setFacultyFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            programmeFilter={programmeFilter}
            setProgrammeFilter={setProgrammeFilter}
            faculties={faculties}
            programmes={programmes}
            onOpen={(record) => {
              setSelectedRecord(record);
              setShowDetailsModal(true);
            }}
            onRefresh={refreshAll}
            onAdd={() =>
              setShowCandidateModal(true)
            }
            onPrint={printRecord}
          />
        )}

        {tab === 'Academic' && (
          <ClearanceTab
            title="Academic Clearance"
            description="Review academic completion and approve students who have satisfied academic requirements."
            records={filteredRecords}
            type="Academic"
            onOpen={(record) =>
              openClearance(record, 'Academic')
            }
            getDetails={(record) => {
              const academic =
                getAcademic(record.studentId);

              return academic.length
                ? `${academic.length} academic record(s)`
                : 'No academic records found';
            }}
          />
        )}

        {tab === 'Financial' && (
          <ClearanceTab
            title="Financial Clearance"
            description="Review outstanding student fees and financial obligations before graduation."
            records={filteredRecords}
            type="Financial"
            onOpen={(record) =>
              openClearance(record, 'Financial')
            }
            getDetails={(record) => {
              const balance =
                getFinance(record.studentId).reduce(
                  (sum, item) =>
                    sum + getFinanceBalance(item),
                  0
                );

              return money(balance);
            }}
          />
        )}

        {tab === 'Library' && (
          <ClearanceTab
            title="Library Clearance"
            description="Confirm that books, loans and library fines have been cleared."
            records={filteredRecords}
            type="Library"
            onOpen={(record) =>
              openClearance(record, 'Library')
            }
            getDetails={(record) => {
              const loans =
                getLibrary(record.studentId);

              const outstanding =
                loans.filter(
                  isLibraryLoanOutstanding
                ).length;

              const fines = loans.reduce(
                (sum, loan) =>
                  sum + getLibraryFine(loan),
                0
              );

              return `${outstanding} outstanding • ${money(
                fines
              )} fines`;
            }}
          />
        )}

        {tab === 'Dormitory' && (
          <ClearanceTab
            title="Dormitory Clearance"
            description="Confirm dormitory allocation, room and outstanding dormitory fee obligations."
            records={filteredRecords}
            type="Dormitory"
            onOpen={(record) =>
              openClearance(record, 'Dormitory')
            }
            getDetails={(record) => {
              const allocations =
                getDormitory(record.studentId);

              if (!allocations.length) {
                return 'Not required';
              }

              const balance =
                allocations.reduce(
                  (sum, allocation) =>
                    sum +
                    getDormitoryBalance(
                      allocation
                    ),
                  0
                );

              return `${allocations.length} allocation(s) • ${money(
                balance
              )}`;
            }}
          />
        )}

        {tab === 'Department' && (
          <ApprovalTab
            title="Department Approval"
            description="Department confirms the candidate has completed departmental requirements."
            records={filteredRecords}
            type="Department"
            onOpen={(record) =>
              openClearance(record, 'Department')
            }
          />
        )}

        {tab === 'Registrar' && (
          <ApprovalTab
            title="Registrar Approval"
            description="Registrar performs final institutional approval before the student is placed on the graduation list."
            records={filteredRecords}
            type="Registrar"
            onOpen={(record) =>
              openClearance(record, 'Registrar')
            }
          />
        )}

        {tab === 'Graduation List' && (
          <GraduationListTab
            records={graduationRecords.filter(
              (record) =>
                record.status ===
                  'Graduation List' ||
                record.status === 'Graduated'
            )}
            onOpen={(record) => {
              setSelectedRecord(record);
              setShowDetailsModal(true);
            }}
            onAddToList={addToGraduationList}
            onIssueCertificate={issueCertificate}
            onIssueTranscript={
              createTranscriptFromAcademicRecord
            }
          />
        )}

        {tab === 'Certificates' && (
          <DocumentsTab
            title="Certificates"
            description="Issued graduation certificates linked to the central Student ID."
            type="Certificate"
            certificates={certificates}
            transcripts={[]}
          />
        )}

        {tab === 'Transcripts' && (
          <DocumentsTab
            title="Transcripts"
            description="Issued graduation transcripts linked to the central Student ID."
            type="Transcript"
            certificates={[]}
            transcripts={transcripts}
          />
        )}

        {tab === 'Reports' && (
          <ReportsTab
            records={graduationRecords}
            certificates={certificates}
            transcripts={transcripts}
            counts={counts}
            onExportCandidates={() =>
              downloadCsv(
                'graduation-candidates.csv',
                [
                  'Student ID',
                  'Student Name',
                  'Faculty',
                  'Department',
                  'Programme',
                  'Academic',
                  'Financial',
                  'Library',
                  'Dormitory',
                  'Department Approval',
                  'Registrar Approval',
                  'Status',
                ],
                graduationRecords.map(
                  (record) => [
                    record.studentId,
                    record.studentName,
                    record.faculty,
                    record.department,
                    record.programme,
                    record.academicStatus,
                    record.financialStatus,
                    record.libraryStatus,
                    record.dormitoryStatus,
                    record.departmentApproval,
                    record.registrarApproval,
                    record.status,
                  ]
                )
              )
            }
            onExportGraduates={() =>
              downloadCsv(
                'graduation-list.csv',
                [
                  'Graduation List Number',
                  'Student ID',
                  'Student Name',
                  'Faculty',
                  'Department',
                  'Programme',
                  'Graduation Year',
                  'Graduation Period',
                  'Certificate Number',
                  'Transcript Number',
                ],
                graduationRecords
                  .filter(
                    (record) =>
                      record.status ===
                        'Graduation List' ||
                      record.status ===
                        'Graduated'
                  )
                  .map((record) => [
                    record.graduationListNumber ||
                      '',
                    record.studentId,
                    record.studentName,
                    record.faculty,
                    record.department,
                    record.programme,
                    record.graduationYear,
                    record.graduationPeriod,
                    record.certificateNumber ||
                      '',
                    record.transcriptNumber ||
                      '',
                  ])
              )
            }
          />
        )}
      </main>

      {showCandidateModal && (
        <Modal
          title="Add Graduation Candidate"
          onClose={() => {
            setShowCandidateModal(false);
            setSelectedStudentId('');
          }}
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Student *
              </label>

              <select
                value={selectedStudentId}
                onChange={(event) =>
                  setSelectedStudentId(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">
                  Select student
                </option>

                {candidateStudents.map(
                  (student) => (
                    <option
                      key={getStudentId(student)}
                      value={getStudentId(student)}
                    >
                      {getStudentId(student)} —{' '}
                      {getStudentName(student)}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Graduation Year
                </label>

                <input
                  value={graduationYear}
                  onChange={(event) =>
                    setGraduationYear(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Graduation Period
                </label>

                <select
                  value={graduationPeriod}
                  onChange={(event) =>
                    setGraduationPeriod(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option>June</option>
                  <option>September</option>
                  <option>December</option>
                </select>
              </div>
            </div>

            {selectedStudentId &&
              getStudent(selectedStudentId) && (
                <div className="rounded-lg bg-slate-50 p-4 text-sm">
                  {(() => {
                    const student =
                      getStudent(
                        selectedStudentId
                      )!;

                    return (
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <div>
                          <span className="text-slate-500">
                            Student ID
                          </span>
                          <p className="font-semibold">
                            {getStudentId(
                              student
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-500">
                            Student
                          </span>
                          <p className="font-semibold">
                            {getStudentName(
                              student
                            )}
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-500">
                            Faculty
                          </span>
                          <p className="font-semibold">
                            {student.faculty ||
                              '—'}
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-500">
                            Department
                          </span>
                          <p className="font-semibold">
                            {student.department ||
                              '—'}
                          </p>
                        </div>

                        <div>
                          <span className="text-slate-500">
                            Programme
                          </span>
                          <p className="font-semibold">
                            {getProgramme(
                              student
                            ) || '—'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() =>
                  setShowCandidateModal(false)
                }
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              >
                Cancel
              </button>

              <button
                onClick={addCandidate}
                disabled={!selectedStudentId}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create Candidate
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showClearanceModal &&
        selectedRecord && (
          <Modal
            title={`${clearanceType} ${
              clearanceType === 'Department' ||
              clearanceType === 'Registrar'
                ? 'Approval'
                : 'Clearance'
            }`}
            onClose={() =>
              setShowClearanceModal(false)
            }
          >
            <div className="space-y-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">
                      Student ID
                    </p>
                    <p className="font-semibold">
                      {selectedRecord.studentId}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Student
                    </p>
                    <p className="font-semibold">
                      {selectedRecord.studentName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Programme
                    </p>
                    <p className="font-semibold">
                      {selectedRecord.programme ||
                        '—'}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Current Status
                    </p>
                    <div className="mt-1">
                      <StatusBadge
                        status={
                          clearanceType ===
                          'Academic'
                            ? selectedRecord.academicStatus
                            : clearanceType ===
                              'Financial'
                            ? selectedRecord.financialStatus
                            : clearanceType ===
                              'Library'
                            ? selectedRecord.libraryStatus
                            : clearanceType ===
                              'Dormitory'
                            ? selectedRecord.dormitoryStatus
                            : clearanceType ===
                              'Department'
                            ? selectedRecord.departmentApproval
                            : selectedRecord.registrarApproval
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {clearanceType === 'Academic' && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-2 text-sm font-semibold">
                    Academic Record Summary
                  </p>

                  {getAcademic(
                    selectedRecord.studentId
                  ).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No academic records have been
                      entered for this Student ID.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {getAcademic(
                        selectedRecord.studentId
                      ).map((academic) => (
                        <div
                          key={academic.id}
                          className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm"
                        >
                          <div>
                            <p className="font-semibold">
                              {academic.courseCode ||
                                'Course'}{' '}
                              {academic.courseTitle ||
                                ''}
                            </p>
                            <p className="text-xs text-slate-500">
                              {academic.academicYear ||
                                ''}{' '}
                              {academic.semester ||
                                ''}
                            </p>
                          </div>

                          <span className="font-bold">
                            {academic.grade ||
                              academic.status ||
                              '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {clearanceType === 'Financial' && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-2 text-sm font-semibold">
                    Financial Summary
                  </p>

                  <div className="space-y-2">
                    {getFinance(
                      selectedRecord.studentId
                    ).map((finance) => (
                      <div
                        key={finance.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm"
                      >
                        <span>
                          Fee Record
                        </span>

                        <span className="font-semibold text-red-600">
                          {money(
                            getFinanceBalance(
                              finance
                            )
                          )}
                        </span>
                      </div>
                    ))}

                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>
                        Outstanding Balance
                      </span>

                      <span>
                        {money(
                          getFinance(
                            selectedRecord.studentId
                          ).reduce(
                            (sum, item) =>
                              sum +
                              getFinanceBalance(
                                item
                              ),
                            0
                          )
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {clearanceType === 'Library' && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-2 text-sm font-semibold">
                    Library Summary
                  </p>

                  <div className="space-y-2">
                    {getLibrary(
                      selectedRecord.studentId
                    ).map((loan) => (
                      <div
                        key={loan.id}
                        className="rounded-lg bg-slate-50 p-3 text-sm"
                      >
                        <div className="flex justify-between gap-3">
                          <span className="font-semibold">
                            {loan.bookTitle ||
                              'Library Item'}
                          </span>

                          <span>
                            {loan.status ||
                              (loan.returned
                                ? 'Returned'
                                : 'Outstanding')}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          Fine:{' '}
                          {money(
                            getLibraryFine(
                              loan
                            )
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {clearanceType === 'Dormitory' && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="mb-2 text-sm font-semibold">
                    Dormitory Summary
                  </p>

                  {getDormitory(
                    selectedRecord.studentId
                  ).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No dormitory allocation found.
                      Dormitory clearance is therefore
                      not required.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {getDormitory(
                        selectedRecord.studentId
                      ).map((allocation) => (
                        <div
                          key={allocation.id}
                          className="rounded-lg bg-slate-50 p-3 text-sm"
                        >
                          <p className="font-semibold">
                            {allocation.dormitoryName ||
                              'Dormitory'}
                          </p>

                          <p className="text-xs text-slate-500">
                            Room:{' '}
                            {allocation.roomNumber ||
                              '—'}
                          </p>

                          <p className="mt-1 font-semibold">
                            Balance:{' '}
                            {money(
                              getDormitoryBalance(
                                allocation
                              )
                            )}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Officer
                </label>

                <input
                  value={officerName}
                  onChange={(event) =>
                    setOfficerName(
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Officer name / username"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">
                  Notes
                </label>

                <textarea
                  value={clearanceNotes}
                  onChange={(event) =>
                    setClearanceNotes(
                      event.target.value
                    )
                  }
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Enter clearance or approval notes..."
                />
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={() =>
                    setShowClearanceModal(false)
                  }
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                >
                  Cancel
                </button>

                {(clearanceType ===
                  'Department' ||
                  clearanceType ===
                    'Registrar') && (
                  <button
                    onClick={rejectApproval}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white"
                  >
                    Reject / Hold
                  </button>
                )}

                <button
                  onClick={approveClearance}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  {clearanceType ===
                    'Department' ||
                  clearanceType === 'Registrar'
                    ? 'Approve'
                    : 'Clear Student'}
                </button>
              </div>
            </div>
          </Modal>
        )}

      {showDetailsModal &&
        selectedRecord && (
          <Modal
            title="Graduation Candidate Details"
            onClose={() =>
              setShowDetailsModal(false)
            }
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <InfoCard
                  label="Student ID"
                  value={
                    selectedRecord.studentId
                  }
                />

                <InfoCard
                  label="Student"
                  value={
                    selectedRecord.studentName
                  }
                />

                <InfoCard
                  label="Programme"
                  value={
                    selectedRecord.programme ||
                    '—'
                  }
                />

                <InfoCard
                  label="Faculty"
                  value={
                    selectedRecord.faculty ||
                    '—'
                  }
                />

                <InfoCard
                  label="Department"
                  value={
                    selectedRecord.department ||
                    '—'
                  }
                />

                <InfoCard
                  label="Graduation"
                  value={`${selectedRecord.graduationPeriod} ${selectedRecord.graduationYear}`}
                />
              </div>

              <div>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Clearance Workflow
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <WorkflowCard
                    label="Academic Clearance"
                    status={
                      selectedRecord.academicStatus
                    }
                    onClick={() =>
                      openClearance(
                        selectedRecord,
                        'Academic'
                      )
                    }
                  />

                  <WorkflowCard
                    label="Financial Clearance"
                    status={
                      selectedRecord.financialStatus
                    }
                    onClick={() =>
                      openClearance(
                        selectedRecord,
                        'Financial'
                      )
                    }
                  />

                  <WorkflowCard
                    label="Library Clearance"
                    status={
                      selectedRecord.libraryStatus
                    }
                    onClick={() =>
                      openClearance(
                        selectedRecord,
                        'Library'
                      )
                    }
                  />

                  <WorkflowCard
                    label="Dormitory Clearance"
                    status={
                      selectedRecord.dormitoryStatus
                    }
                    onClick={() =>
                      openClearance(
                        selectedRecord,
                        'Dormitory'
                      )
                    }
                  />

                  <WorkflowCard
                    label="Department Approval"
                    status={
                      selectedRecord.departmentApproval
                    }
                    onClick={() =>
                      openClearance(
                        selectedRecord,
                        'Department'
                      )
                    }
                  />

                  <WorkflowCard
                    label="Registrar Approval"
                    status={
                      selectedRecord.registrarApproval
                    }
                    onClick={() =>
                      openClearance(
                        selectedRecord,
                        'Registrar'
                      )
                    }
                  />
                </div>
              </div>

              <div className="rounded-xl bg-slate-900 p-4 text-white">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs text-slate-400">
                      Overall Graduation Status
                    </p>

                    <div className="mt-1">
                      <StatusBadge
                        status={
                          selectedRecord.status
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedRecord.registrarApproval ===
                      'Approved' &&
                      selectedRecord.status !==
                        'Graduation List' &&
                      selectedRecord.status !==
                        'Graduated' && (
                        <button
                          onClick={() =>
                            addToGraduationList(
                              selectedRecord
                            )
                          }
                          className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Add to Graduation List
                        </button>
                      )}

                    {(selectedRecord.status ===
                      'Graduation List' ||
                      selectedRecord.status ===
                        'Graduated') && (
                      <>
                        <button
                          onClick={() =>
                            issueCertificate(
                              selectedRecord
                            )
                          }
                          className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Issue Certificate
                        </button>

                        <button
                          onClick={() =>
                            issueTranscript(
                              selectedRecord
                            )
                          }
                          className="rounded-lg bg-purple-600 px-3 py-2 text-sm font-semibold text-white"
                        >
                          Issue Transcript
                        </button>
                      </>
                    )}

                    <button
                      onClick={() =>
                        printRecord(
                          selectedRecord
                        )
                      }
                      className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Print
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoCard
                  label="Graduation List Number"
                  value={
                    selectedRecord.graduationListNumber ||
                    'Not assigned'
                  }
                />

                <InfoCard
                  label="Certificate Number"
                  value={
                    selectedRecord.certificateNumber ||
                    'Not issued'
                  }
                />

                <InfoCard
                  label="Transcript Number"
                  value={
                    selectedRecord.transcriptNumber ||
                    'Not issued'
                  }
                />

                <InfoCard
                  label="Last Updated"
                  value={new Date(
                    selectedRecord.updatedAt
                  ).toLocaleString()}
                />
              </div>
            </div>
          </Modal>
        )}
    </div>
  );
}

function DashboardTab({
  counts,
  totalOutstandingFinance,
  totalLibraryFines,
  totalDormitoryBalance,
  graduationRecords,
  onOpen,
}: {
  counts: {
    candidates: number;
    academicCleared: number;
    financialCleared: number;
    libraryCleared: number;
    dormitoryCleared: number;
    departmentApproved: number;
    registrarApproved: number;
    graduationList: number;
    graduated: number;
  };
  totalOutstandingFinance: number;
  totalLibraryFines: number;
  totalDormitoryBalance: number;
  graduationRecords: GraduationRecord[];
  onOpen: (record: GraduationRecord) => void;
}) {
  const recent = graduationRecords.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Outstanding Student Fees
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {money(totalOutstandingFinance)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Candidates requiring financial clearance
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Library Fines
          </p>

          <p className="mt-2 text-2xl font-bold text-amber-600">
            {money(totalLibraryFines)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Outstanding library fines across candidates
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">
            Dormitory Balances
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-600">
            {money(totalDormitoryBalance)}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Outstanding dormitory obligations
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">
              Graduation Workflow
            </h3>

            <p className="text-sm text-slate-500">
              Candidate progression through the central clearance
              process.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
          {[
            ['Candidates', counts.candidates],
            ['Academic', counts.academicCleared],
            ['Finance', counts.financialCleared],
            ['Library', counts.libraryCleared],
            ['Dormitory', counts.dormitoryCleared],
            ['Department', counts.departmentApproved],
            ['Registrar', counts.registrarApproved],
            ['Graduated', counts.graduated],
          ].map(([label, value]) => (
            <div
              key={String(label)}
              className="rounded-lg border border-slate-200 p-3 text-center"
            >
              <p className="text-xs text-slate-500">
                {label}
              </p>

              <p className="mt-1 text-xl font-bold text-slate-900">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h3 className="font-bold text-slate-900">
            Recent Graduation Candidates
          </h3>
        </div>

        {recent.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No graduation candidates have been added yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
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
                    Status
                  </th>

                  <th className="px-5 py-3">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {recent.map((record) => (
                  <tr
                    key={record.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-3 font-semibold">
                      {record.studentId}
                    </td>

                    <td className="px-5 py-3">
                      {record.studentName}
                    </td>

                    <td className="px-5 py-3">
                      {record.programme ||
                        '—'}
                    </td>

                    <td className="px-5 py-3">
                      <StatusBadge
                        status={record.status}
                      />
                    </td>

                    <td className="px-5 py-3">
                      <button
                        onClick={() =>
                          onOpen(record)
                        }
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function CandidatesTab({
  records,
  search,
  setSearch,
  facultyFilter,
  setFacultyFilter,
  statusFilter,
  setStatusFilter,
  programmeFilter,
  setProgrammeFilter,
  faculties,
  programmes,
  onOpen,
  onRefresh,
  onAdd,
  onPrint,
}: {
  records: GraduationRecord[];
  search: string;
  setSearch: (value: string) => void;
  facultyFilter: string;
  setFacultyFilter: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  programmeFilter: string;
  setProgrammeFilter: (value: string) => void;
  faculties: string[];
  programmes: string[];
  onOpen: (record: GraduationRecord) => void;
  onRefresh: () => void;
  onAdd: () => void;
  onPrint: (record: GraduationRecord) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="Search Student ID, name, programme..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />

          <select
            value={facultyFilter}
            onChange={(event) =>
              setFacultyFilter(
                event.target.value
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="All">
              All Faculties
            </option>

            {faculties.map((faculty) => (
              <option
                key={faculty}
                value={faculty}
              >
                {faculty}
              </option>
            ))}
          </select>

          <select
            value={programmeFilter}
            onChange={(event) =>
              setProgrammeFilter(
                event.target.value
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">
              All Programmes
            </option>

            {programmes.map((programme) => (
              <option
                key={programme}
                value={programme}
              >
                {programme}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="All">
              All Statuses
            </option>

            {[
              'Candidate',
              'Clearance',
              'Department Approved',
              'Registrar Approved',
              'Graduation List',
              'Graduated',
              'On Hold',
            ].map((status) => (
              <option
                key={status}
                value={status}
              >
                {status}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
            >
              Refresh
            </button>

            <button
              onClick={onAdd}
              className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
            >
              + Candidate
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
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
                  Academic
                </th>

                <th className="px-5 py-3">
                  Finance
                </th>

                <th className="px-5 py-3">
                  Library
                </th>

                <th className="px-5 py-3">
                  Dormitory
                </th>

                <th className="px-5 py-3">
                  Status
                </th>

                <th className="px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="border-t border-slate-100"
                >
                  <td className="px-5 py-3 font-semibold">
                    {record.studentId}
                  </td>

                  <td className="px-5 py-3">
                    {record.studentName}
                  </td>

                  <td className="px-5 py-3">
                    {record.programme ||
                      '—'}
                  </td>

                  <td className="px-5 py-3">
                    <ClearanceBadge
                      status={
                        record.academicStatus
                      }
                    />
                  </td>

                  <td className="px-5 py-3">
                    <ClearanceBadge
                      status={
                        record.financialStatus
                      }
                    />
                  </td>

                  <td className="px-5 py-3">
                    <ClearanceBadge
                      status={
                        record.libraryStatus
                      }
                    />
                  </td>

                  <td className="px-5 py-3">
                    <ClearanceBadge
                      status={
                        record.dormitoryStatus
                      }
                    />
                  </td>

                  <td className="px-5 py-3">
                    <StatusBadge
                      status={record.status}
                    />
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          onOpen(record)
                        }
                        className="font-semibold text-blue-600"
                      >
                        View
                      </button>

                      <button
                        onClick={() =>
                          onPrint(record)
                        }
                        className="font-semibold text-slate-600"
                      >
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No graduation candidates match the
                    current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClearanceTab({
  title,
  description,
  records,
  type,
  onOpen,
  getDetails,
}: {
  title: string;
  description: string;
  records: GraduationRecord[];
  type:
    | 'Academic'
    | 'Financial'
    | 'Library'
    | 'Dormitory';
  onOpen: (record: GraduationRecord) => void;
  getDetails: (record: GraduationRecord) => string;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
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
                  Current Status
                </th>

                <th className="px-5 py-3">
                  Details
                </th>

                <th className="px-5 py-3">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => {
                const status =
                  type === 'Academic'
                    ? record.academicStatus
                    : type === 'Financial'
                    ? record.financialStatus
                    : type === 'Library'
                    ? record.libraryStatus
                    : record.dormitoryStatus;

                return (
                  <tr
                    key={record.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-3 font-semibold">
                      {record.studentId}
                    </td>

                    <td className="px-5 py-3">
                      {record.studentName}
                    </td>

                    <td className="px-5 py-3">
                      {record.programme ||
                        '—'}
                    </td>

                    <td className="px-5 py-3">
                      <ClearanceBadge
                        status={status}
                      />
                    </td>

                    <td className="px-5 py-3 text-slate-500">
                      {getDetails(record)}
                    </td>

                    <td className="px-5 py-3">
                      <button
                        onClick={() =>
                          onOpen(record)
                        }
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}

              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No graduation candidates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ApprovalTab({
  title,
  description,
  records,
  type,
  onOpen,
}: {
  title: string;
  description: string;
  records: GraduationRecord[];
  type: 'Department' | 'Registrar';
  onOpen: (record: GraduationRecord) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  Student ID
                </th>

                <th className="px-5 py-3">
                  Student
                </th>

                <th className="px-5 py-3">
                  Department
                </th>

                <th className="px-5 py-3">
                  Clearances
                </th>

                <th className="px-5 py-3">
                  Approval
                </th>

                <th className="px-5 py-3">
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => {
                const approval =
                  type === 'Department'
                    ? record.departmentApproval
                    : record.registrarApproval;

                return (
                  <tr
                    key={record.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-3 font-semibold">
                      {record.studentId}
                    </td>

                    <td className="px-5 py-3">
                      {record.studentName}
                    </td>

                    <td className="px-5 py-3">
                      {record.department ||
                        '—'}
                    </td>

                    <td className="px-5 py-3">
                      <div className="flex flex-wrap gap-1">
                        <ClearanceBadge
                          status={
                            record.academicStatus
                          }
                        />

                        <ClearanceBadge
                          status={
                            record.financialStatus
                          }
                        />

                        <ClearanceBadge
                          status={
                            record.libraryStatus
                          }
                        />

                        <ClearanceBadge
                          status={
                            record.dormitoryStatus
                          }
                        />
                      </div>
                    </td>

                    <td className="px-5 py-3">
                      <ApprovalBadge
                        status={approval}
                      />
                    </td>

                    <td className="px-5 py-3">
                      <button
                        onClick={() =>
                          onOpen(record)
                        }
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}

              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No candidates found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GraduationListTab({
  records,
  onOpen,
  onAddToList,
  onIssueCertificate,
  onIssueTranscript,
}: {
  records: GraduationRecord[];
  onOpen: (record: GraduationRecord) => void;
  onAddToList: (
    record: GraduationRecord
  ) => void;
  onIssueCertificate: (
    record: GraduationRecord
  ) => void;
  onIssueTranscript: (
    record: GraduationRecord
  ) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Graduation List
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Students approved by the Registrar and prepared for
          graduation.
        </p>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">
                  List Number
                </th>

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
                  Graduation
                </th>

                <th className="px-5 py-3">
                  Certificate
                </th>

                <th className="px-5 py-3">
                  Transcript
                </th>

                <th className="px-5 py-3">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="border-t border-slate-100"
                >
                  <td className="px-5 py-3 font-semibold">
                    {record.graduationListNumber ||
                      'Pending'}
                  </td>

                  <td className="px-5 py-3">
                    {record.studentId}
                  </td>

                  <td className="px-5 py-3">
                    {record.studentName}
                  </td>

                  <td className="px-5 py-3">
                    {record.programme ||
                      '—'}
                  </td>

                  <td className="px-5 py-3">
                    {record.graduationPeriod}{' '}
                    {record.graduationYear}
                  </td>

                  <td className="px-5 py-3">
                    {record.certificateIssued ? (
                      <StatusBadge status="Issued" />
                    ) : (
                      <span className="text-slate-400">
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3">
                    {record.transcriptIssued ? (
                      <StatusBadge status="Issued" />
                    ) : (
                      <span className="text-slate-400">
                        Pending
                      </span>
                    )}
                  </td>

                  <td className="px-5 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() =>
                          onOpen(record)
                        }
                        className="font-semibold text-blue-600"
                      >
                        View
                      </button>

                      {record.registrarApproval ===
                        'Approved' &&
                        !record.graduationListNumber && (
                          <button
                            onClick={() =>
                              onAddToList(
                                record
                              )
                            }
                            className="font-semibold text-emerald-600"
                          >
                            Add
                          </button>
                        )}

                      {record.graduationListNumber && (
                        <>
                          <button
                            onClick={() =>
                              onIssueCertificate(
                                record
                              )
                            }
                            className="font-semibold text-blue-600"
                          >
                            Certificate
                          </button>

                          <button
                            onClick={() =>
                              onIssueTranscript(
                                record
                              )
                            }
                            className="font-semibold text-purple-600"
                          >
                            Transcript
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {records.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No students have reached the graduation
                    list yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DocumentsTab({
  title,
  description,
  type,
  certificates,
  transcripts,
}: {
  title: string;
  description: string;
  type: 'Certificate' | 'Transcript';
  certificates: Certificate[];
  transcripts: Transcript[];
}) {
  const documents =
    type === 'Certificate'
      ? certificates
      : transcripts;

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          {title}
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          {description}
        </p>
      </div>

      <div className="rounded-xl bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
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
                  Number
                </th>

                <th className="px-5 py-3">
                  Issue Date
                </th>

                <th className="px-5 py-3">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {documents.map((document) => {
                const item =
                  document as
                    | Certificate
                    | Transcript;

                const number =
                  'certificateNumber' in item
                    ? item.certificateNumber
                    : item.transcriptNumber;

                return (
                  <tr
                    key={item.id}
                    className="border-t border-slate-100"
                  >
                    <td className="px-5 py-3 font-semibold">
                      {item.studentId}
                    </td>

                    <td className="px-5 py-3">
                      {item.studentName}
                    </td>

                    <td className="px-5 py-3">
                      {item.programme}
                    </td>

                    <td className="px-5 py-3 font-semibold">
                      {number}
                    </td>

                    <td className="px-5 py-3">
                      {item.issueDate}
                    </td>

                    <td className="px-5 py-3">
                      <StatusBadge
                        status={item.status}
                      />
                    </td>
                  </tr>
                );
              })}

              {documents.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-slate-500"
                  >
                    No {type.toLowerCase()} records have been
                    issued.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ReportsTab({
  records,
  certificates,
  transcripts,
  counts,
  onExportCandidates,
  onExportGraduates,
}: {
  records: GraduationRecord[];
  certificates: Certificate[];
  transcripts: Transcript[];
  counts: {
    candidates: number;
    academicCleared: number;
    financialCleared: number;
    libraryCleared: number;
    dormitoryCleared: number;
    departmentApproved: number;
    registrarApproved: number;
    graduationList: number;
    graduated: number;
  };
  onExportCandidates: () => void;
  onExportGraduates: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">
          Graduation Reports
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Export and review graduation, clearance and document
          records.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ReportCard
          title="Graduation Candidates"
          value={counts.candidates}
          description="Students currently in the graduation workflow."
        />

        <ReportCard
          title="Graduation List"
          value={counts.graduationList}
          description="Students approved for the graduation list."
        />

        <ReportCard
          title="Graduated"
          value={counts.graduated}
          description="Students whose graduation records are complete."
        />

        <ReportCard
          title="Certificates"
          value={certificates.length}
          description="Issued certificate records."
        />

        <ReportCard
          title="Transcripts"
          value={transcripts.length}
          description="Issued transcript records."
        />

        <ReportCard
          title="Registrar Approved"
          value={counts.registrarApproved}
          description="Candidates with final Registrar approval."
        />
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">
          Export Reports
        </h3>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={onExportCandidates}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Export Candidates CSV
          </button>

          <button
            onClick={onExportGraduates}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Export Graduation List CSV
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">
          Clearance Summary
        </h3>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryItem
            label="Academic Cleared"
            value={counts.academicCleared}
          />

          <SummaryItem
            label="Financial Cleared"
            value={counts.financialCleared}
          />

          <SummaryItem
            label="Library Cleared"
            value={counts.libraryCleared}
          />

          <SummaryItem
            label="Dormitory Cleared"
            value={counts.dormitoryCleared}
          />

          <SummaryItem
            label="Department Approved"
            value={counts.departmentApproved}
          />

          <SummaryItem
            label="Registrar Approved"
            value={counts.registrarApproved}
          />

          <SummaryItem
            label="Graduation List"
            value={counts.graduationList}
          />

          <SummaryItem
            label="Graduated"
            value={counts.graduated}
          />
        </div>
      </div>
    </div>
  );
}

function ReportCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description: string;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-xl font-bold">
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-xs font-medium text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function WorkflowCard({
  label,
  status,
  onClick,
}: {
  label: string;
  status: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50"
    >
      <div>
        <p className="text-sm font-semibold text-slate-900">
          {label}
        </p>

        <p className="mt-1 text-xs text-slate-500">
          Review and update
        </p>
      </div>

      <StatusBadge status={status} />
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}
