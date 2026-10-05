"use client"

import { useEffect, useState } from "react"

import {
  CentralStudent,
  CentralStaff,
  NEXUS_KEYS,
  readNexusStorage,
  runCentralMigration,
} from "@/lib/nexus-data"
import { protectNexusPage } from "@/lib/nexus-access"

type Tab =
  | "Dashboard"
  | "Students"
  | "Staff"
  | "Architecture"

function StatusBadge({
  status,
}: {
  status: string
}) {
  const className =
    status === "Registered" ||
    status === "Active" ||
    status === "Current"
      ? "bg-emerald-100 text-emerald-700"
      : status === "Suspended" ||
          status === "Pending"
        ? "bg-amber-100 text-amber-700"
        : status === "Withdrawn" ||
            status === "Inactive"
          ? "bg-red-100 text-red-700"
          : "bg-slate-100 text-slate-700"

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {status}
    </span>
  )
}

export default function CentralDataCentrePage() {
  const [tab, setTab] =
    useState<Tab>("Dashboard")

  const [students, setStudents] =
    useState<CentralStudent[]>([])

  const [staff, setStaff] =
    useState<CentralStaff[]>([])

  const [university, setUniversity] =
    useState({
      name: "Nexus University",
      code: "NXS",
    })

  const [academicPeriods, setAcademicPeriods] =
    useState<
      {
        id: string
        academicYear: string
        semester: string
        registrationOpen: boolean
        status: string
      }[]
    >([])

  const [message, setMessage] =
    useState("")

  const [search, setSearch] =
    useState("")

  useEffect(() => {
    protectNexusPage([
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])

  useEffect(() => {
    loadCentralData()
  }, [])

  function loadCentralData() {
    setStudents(
      readNexusStorage<CentralStudent[]>(
        NEXUS_KEYS.students,
        [],
      ),
    )

    setStaff(
      readNexusStorage<CentralStaff[]>(
        NEXUS_KEYS.staff,
        [],
      ),
    )

    setUniversity(
      readNexusStorage(
        NEXUS_KEYS.university,
        {
          name: "Nexus University",
          code: "NXS",
        },
      ),
    )

    setAcademicPeriods(
      readNexusStorage(
        NEXUS_KEYS.academicPeriods,
        [],
      ),
    )
  }

  function migrate() {
    const result =
      runCentralMigration()

    loadCentralData()

    setMessage(
      `Migration complete: ${result.studentsMigrated} students and ${result.staffMigrated} staff records added to the central data layer.`,
    )
  }

  const filteredStudents =
    students.filter((student) => {
      const query =
        search.trim().toLowerCase()

      if (!query) return true

      return (
        student.studentId
          .toLowerCase()
          .includes(query) ||
        student.fullName
          .toLowerCase()
          .includes(query) ||
        student.email
          ?.toLowerCase()
          .includes(query) ||
        student.programmeName
          ?.toLowerCase()
          .includes(query)
      )
    })

  const filteredStaff =
    staff.filter((member) => {
      const query =
        search.trim().toLowerCase()

      if (!query) return true

      return (
        member.staffId
          .toLowerCase()
          .includes(query) ||
        member.fullName
          .toLowerCase()
          .includes(query) ||
        member.email
          ?.toLowerCase()
          .includes(query) ||
        member.departmentName
          ?.toLowerCase()
          .includes(query)
      )
    })

  function signOut() {
    localStorage.removeItem(
      "nexussis_session",
    )
    localStorage.removeItem(
      "nexus_role",
    )
    localStorage.removeItem(
      "nexus_username",
    )
    localStorage.removeItem(
      "userSession",
    )

    window.location.href = "/dashboard"
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
              Central Data Centre
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/admin/ict"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              ICT Control Centre
            </a>

            <a
              href="/admin/registration"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20"
            >
              Registration
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
            Central Data Centre
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            One university, one central data system,
            one Student ID and one Staff ID.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-xl bg-white p-2 shadow-sm">
          {(
            [
              "Dashboard",
              "Students",
              "Staff",
              "Architecture",
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

        {message && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        {tab === "Dashboard" && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Central Students
                </div>

                <div className="mt-2 text-3xl font-bold">
                  {students.length}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Central Staff
                </div>

                <div className="mt-2 text-3xl font-bold">
                  {staff.length}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Academic Periods
                </div>

                <div className="mt-2 text-3xl font-bold">
                  {academicPeriods.length}
                </div>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <div className="text-sm text-slate-500">
                  Current Academic Year
                </div>

                <div className="mt-2 text-3xl font-bold">
                  {academicPeriods.find(
                    (period) =>
                      period.status ===
                      "Current",
                  )?.academicYear ||
                    "2026"}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  University Identity
                </h2>

                <div className="mt-5 space-y-3">
                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      University
                    </span>

                    <span className="font-semibold">
                      {university.name}
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      University Code
                    </span>

                    <span className="font-semibold">
                      {university.code}
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      Student ID Format
                    </span>

                    <span className="font-semibold">
                      NXS26xxxxx
                    </span>
                  </div>

                  <div className="flex justify-between rounded-lg bg-slate-50 p-4">
                    <span className="text-sm">
                      Staff ID Format
                    </span>

                    <span className="font-semibold">
                      NXS-ST-xxxxx
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="font-bold text-slate-900">
                  Central Integration
                </h2>

                <div className="mt-5 space-y-3">
                  {[
                    "Student Registration",
                    "Student Master Records",
                    "Bursary & Student Fees",
                    "Library",
                    "LMS",
                    "Cafeteria / Mess",
                    "Dormitories",
                    "Student Affairs",
                    "Administration",
                    "ICT Control Centre",
                  ].map((module) => (
                    <div
                      key={module}
                      className="flex items-center gap-3 rounded-lg bg-slate-50 p-3"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-700">
                        ✓
                      </span>

                      <span className="text-sm font-medium">
                        {module}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
              <h2 className="font-bold text-blue-900">
                Legacy Data Migration
              </h2>

              <p className="mt-2 text-sm text-blue-800">
                This migration copies existing Student
                Registration and Lecturer records into the
                central data layer without deleting the
                existing module data.
              </p>

              <button
                onClick={migrate}
                className="mt-4 rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
              >
                Run Central Migration
              </button>
            </div>
          </>
        )}

        {tab === "Students" && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Central Student Records
                </h2>

                <p className="text-sm text-slate-500">
                  Every service will reference this Student ID.
                </p>
              </div>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search Student ID or name..."
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Student ID
                    </th>

                    <th className="px-5 py-3">
                      Student
                    </th>

                    <th className="px-5 py-3">
                      Faculty
                    </th>

                    <th className="px-5 py-3">
                      Department
                    </th>

                    <th className="px-5 py-3">
                      Programme
                    </th>

                    <th className="px-5 py-3">
                      Year
                    </th>

                    <th className="px-5 py-3">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredStudents.map(
                    (student) => (
                      <tr
                        key={student.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-bold text-blue-700">
                          {student.studentId}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {student.fullName}
                          </div>

                          <div className="text-xs text-slate-500">
                            {student.email ||
                              "No email"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {student.facultyName ||
                            student.facultyId ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          {student.departmentName ||
                            student.departmentId ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          {student.programmeName ||
                            student.programmeId ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          Year {student.yearLevel}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              student.status
                            }
                          />
                        </td>
                      </tr>
                    ),
                  )}

                  {!filteredStudents.length && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No central student records found.
                        Run the central migration if existing
                        registration records have not been migrated.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Staff" && (
          <div className="rounded-xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
              <div>
                <h2 className="font-bold text-slate-900">
                  Central Staff Records
                </h2>

                <p className="text-sm text-slate-500">
                  Staff and lecturer records use one Staff ID.
                </p>
              </div>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search Staff ID or name..."
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-5 py-3">
                      Staff ID
                    </th>

                    <th className="px-5 py-3">
                      Staff Member
                    </th>

                    <th className="px-5 py-3">
                      Position
                    </th>

                    <th className="px-5 py-3">
                      Faculty
                    </th>

                    <th className="px-5 py-3">
                      Department
                    </th>

                    <th className="px-5 py-3">
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredStaff.map(
                    (member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 font-bold text-blue-700">
                          {member.staffId}
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-semibold">
                            {member.fullName}
                          </div>

                          <div className="text-xs text-slate-500">
                            {member.email ||
                              "No email"}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          {member.position ||
                            member.title ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          {member.facultyName ||
                            member.facultyId ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          {member.departmentName ||
                            member.departmentId ||
                            "—"}
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              member.status
                            }
                          />
                        </td>
                      </tr>
                    ),
                  )}

                  {!filteredStaff.length && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-12 text-center text-slate-500"
                      >
                        No central staff records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "Architecture" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">
                Central Identity
              </h2>

              <div className="mt-5 space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <div className="text-xs font-semibold uppercase text-blue-600">
                    Student Identity
                  </div>

                  <div className="mt-1 text-xl font-bold text-blue-900">
                    One Student ID
                  </div>

                  <p className="mt-2 text-sm text-blue-800">
                    The same Student ID is used by Registration,
                    Student Master, Finance, Library, LMS,
                    Cafeteria, Dormitories, Student Affairs,
                    Graduation and other services.
                  </p>
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-xs font-semibold uppercase text-emerald-600">
                    Staff Identity
                  </div>

                  <div className="mt-1 text-xl font-bold text-emerald-900">
                    One Staff ID
                  </div>

                  <p className="mt-2 text-sm text-emerald-800">
                    Staff and lecturers will share one central
                    Staff ID across HR, teaching, LMS,
                    administration and ICT services.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="font-bold text-slate-900">
                Data Relationships
              </h2>

              <div className="mt-5 space-y-2 text-sm">
                {[
                  [
                    "Faculty",
                    "Department",
                  ],
                  [
                    "Department",
                    "Programme",
                  ],
                  [
                    "Programme",
                    "Student",
                  ],
                  [
                    "Programme",
                    "Course",
                  ],
                  [
                    "Student",
                    "Course Registration",
                  ],
                  [
                    "Student",
                    "Finance",
                  ],
                  [
                    "Student",
                    "Library",
                  ],
                  [
                    "Student",
                    "Dormitory",
                  ],
                  [
                    "Student",
                    "Cafeteria",
                  ],
                  [
                    "Student",
                    "Student Affairs",
                  ],
                  [
                    "Student",
                    "Graduation Clearance",
                  ],
                  [
                    "Staff",
                    "Lecturer / Administration",
                  ],
                ].map(
                  ([parent, child]) => (
                    <div
                      key={`${parent}-${child}`}
                      className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                    >
                      <span className="font-semibold">
                        {parent}
                      </span>

                      <span className="text-slate-400">
                        →
                      </span>

                      <span>
                        {child}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="font-bold text-slate-900">
                Migration Strategy
              </h2>

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-5">
                  <div className="text-lg font-bold">
                    01
                  </div>

                  <div className="mt-2 font-semibold">
                    Existing Modules
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Current pages continue working with their
                    existing localStorage records.
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-5">
                  <div className="text-lg font-bold">
                    02
                  </div>

                  <div className="mt-2 font-semibold">
                    Central Layer
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    Existing Student and Staff records are
                    migrated into the central identity structure.
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-5">
                  <div className="text-lg font-bold">
                    03
                  </div>

                  <div className="mt-2 font-semibold">
                    Database
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    The central interfaces will later connect
                    to the real backend database without
                    redesigning the university modules.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
