"use client"

import { useEffect, useState } from "react"
import { protectNexusPage } from "@/lib/nexus-access"

type CountCard = {
  label: string
  count: number
  href: string
  description: string
}

type Announcement = {
  id: string
  title: string
  message: string
  publishDate: string
  expiryDate: string
  status: "Published" | "Unpublished"
  postedBy: string
  department: string
  createdAt: string
  updatedAt: string
}

function readArray(key: string): any[] {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []

    const parsed = JSON.parse(raw)

    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function signOut() {
  localStorage.removeItem("nexussis_session")
  localStorage.removeItem("nexus_role")
  localStorage.removeItem("nexus_username")
  localStorage.removeItem("userSession")

  window.location.href = "/dashboard"
}

export default function ExecutiveDashboardPage() {
  useEffect(() => {
    protectNexusPage([
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])


  const [loaded, setLoaded] = useState(false)

  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  const [counts, setCounts] = useState({
    students: 0,
    staff: 0,
    lecturers: 0,
    courses: 0,
    finance: 0,
    libraryLoans: 0,
    dormitories: 0,
    clinicVisits: 0,
    lmsCourses: 0,
    cafeteriaMeals: 0,
    welfareCases: 0,
    graduation: 0,
  })

  useEffect(() => {
    function load() {
      const students = readArray(
        "nexusSIS_registered_students",
      )

      const lecturers = readArray(
        "nexusSIS_lecturers",
      )

      const administrationStaff = readArray(
        "nexusSIS_administration_staff",
      )

      const courses = readArray(
        "nexusSIS_courses",
      )

      const finance = readArray(
        "nexusSIS_finance",
      )

      const libraryLoans = readArray(
        "nexusSIS_library_loans",
      )

      const dormitories = readArray(
        "nexusSIS_dormitories",
      )

      const clinicVisits = readArray(
        "nexusSIS_clinic_visits",
      )

      const lmsCourses = readArray(
        "nexusSIS_lms_courses",
      )

      const cafeteriaMeals = readArray(
        "nexusSIS_cafeteria_meals",
      )

      const welfareCases = readArray(
        "nexusSIS_student_affairs_welfare",
      )

      const graduation = readArray(
        "nexusSIS_graduation_records",
      )

      const announcementData = readArray(
        "nexusSIS_announcements",
      ) as Announcement[]

      const today = new Date()
        .toISOString()
        .slice(0, 10)

      const publishedAnnouncements =
        announcementData
          .filter((announcement) => {
            if (
              announcement.status !==
              "Published"
            ) {
              return false
            }

            if (
              announcement.publishDate >
              today
            ) {
              return false
            }

            if (
              announcement.expiryDate &&
              announcement.expiryDate <
                today
            ) {
              return false
            }

            return true
          })
          .sort((a, b) => {
            const dateA =
              new Date(
                b.publishDate,
              ).getTime()

            const dateB =
              new Date(
                a.publishDate,
              ).getTime()

            if (dateA !== dateB) {
              return dateA - dateB
            }

            return (
              new Date(
                b.createdAt,
              ).getTime() -
              new Date(
                a.createdAt,
              ).getTime()
            )
          })

      setAnnouncements(
        publishedAnnouncements,
      )

      setCounts({
        students: students.length,

        staff:
          administrationStaff.length +
          lecturers.length,

        lecturers: lecturers.length,

        courses: courses.length,

        finance: finance.length,

        libraryLoans:
          libraryLoans.length,

        dormitories:
          dormitories.length,

        clinicVisits:
          clinicVisits.length,

        lmsCourses:
          lmsCourses.length,

        cafeteriaMeals:
          cafeteriaMeals.length,

        welfareCases:
          welfareCases.length,

        graduation:
          graduation.length,
      })

      setLoaded(true)
    }

    load()

    const handleStorage = () => {
      load()
    }

    const handleFocus = () => {
      load()
    }

    const handlePageShow = () => {
      load()
    }

    const handleVisibilityChange = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        load()
      }
    }

    window.addEventListener(
      "storage",
      handleStorage,
    )

    window.addEventListener(
      "focus",
      handleFocus,
    )

    window.addEventListener(
      "pageshow",
      handlePageShow,
    )

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange,
    )

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      )

      window.removeEventListener(
        "focus",
        handleFocus,
      )

      window.removeEventListener(
        "pageshow",
        handlePageShow,
      )

      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange,
      )
    }
  }, [])

  const cards: CountCard[] = [
    {
      label: "Registered Students",
      count: counts.students,
      href: "/admin/students",
      description:
        "Central student records",
    },
    {
      label: "Staff & Lecturers",
      count: counts.staff,
      href: "/admin/lecturers",
      description:
        "University personnel",
    },
    {
      label: "Courses",
      count: counts.courses,
      href: "/admin/courses",
      description:
        "Academic course catalogue",
    },
    {
      label: "Finance Records",
      count: counts.finance,
      href: "/admin/bursary",
      description:
        "Fees and financial records",
    },
    {
      label: "Library Loans",
      count: counts.libraryLoans,
      href: "/admin/library",
      description:
        "Library circulation",
    },
    {
      label: "Dormitories",
      count: counts.dormitories,
      href: "/admin/accommodation",
      description:
        "Campus accommodation",
    },
    {
      label: "Clinic Visits",
      count: counts.clinicVisits,
      href: "/admin/clinic",
      description:
        "University health services",
    },
    {
      label: "LMS Courses",
      count: counts.lmsCourses,
      href: "/admin/lms",
      description:
        "Learning management",
    },
  ]

  const modules = [
    [
      "Academic Administration",
      "/admin/academics",
    ],
    [
      "Student Registration",
      "/admin/registration",
    ],
    [
      "Student Master Records",
      "/admin/students",
    ],
    [
      "Lecturer Management",
      "/admin/lecturers",
    ],
    [
      "Bursary & Finance",
      "/admin/bursary",
    ],
    [
      "Library",
      "/admin/library",
    ],
    [
      "Learning Management System",
      "/admin/lms",
    ],
    [
      "Cafeteria / Mess",
      "/admin/cafeteria",
    ],
    [
      "Dormitories",
      "/admin/accommodation",
    ],
    [
      "University Clinic",
      "/admin/clinic",
    ],
    [
      "Student Affairs",
      "/admin/student-affairs",
    ],
    [
      "Graduation",
      "/admin/graduation",
    ],
    [
      "Central Data Centre",
      "/admin/data-centre",
    ],
    [
      "ICT Control Centre",
      "/admin/ict",
    ],
  ]

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-[#071a3d] px-6 py-5 text-white shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              NEXUS SIS Executive Dashboard
            </h1>

            <p className="mt-1 text-sm text-blue-200">
              University management and
              institutional overview
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a
              href="/admin/data-centre"
              className="rounded-lg border border-blue-300/30 px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              Central Data Centre
            </a>

            <a
              href="/admin/ict"
              className="rounded-lg border border-blue-300/30 px-4 py-2 text-sm font-medium hover:bg-white/10"
            >
              ICT Control Centre
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

      <section className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            University Management Overview
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            One university, one central data
            system, one Student ID and one
            Staff ID.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <a
              key={card.label}
              href={card.href}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <p className="text-sm text-slate-500">
                {card.label}
              </p>

              <p className="mt-2 text-3xl font-bold">
                {loaded
                  ? card.count
                  : "—"}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                {card.description}
              </p>
            </a>
          ))}
        </div>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                University Announcements
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Latest published announcements
                from across the university.
              </p>
            </div>

            <a
              href="/admin/ict/announcements"
              className="inline-flex w-fit rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Manage Announcements
            </a>
          </div>

          <div className="mt-5 space-y-4">
            {announcements.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="font-semibold text-slate-700">
                  No current announcements
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Published university
                  announcements will appear
                  here.
                </p>
              </div>
            ) : (
              announcements
                .slice(0, 5)
                .map((announcement) => (
                  <article
                    key={announcement.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-5"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-slate-900">
                          {announcement.title}
                        </h3>

                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                          {
                            announcement.message
                          }
                        </p>
                      </div>

                      <span className="w-fit shrink-0 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                        {
                          announcement.department
                        }
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span>
                        Published:{" "}
                        {
                          announcement.publishDate
                        }
                      </span>

                      <span>
                        Posted by:{" "}
                        {
                          announcement.postedBy
                        }
                      </span>

                      {announcement.expiryDate && (
                        <span>
                          Expires:{" "}
                          {
                            announcement.expiryDate
                          }
                        </span>
                      )}
                    </div>
                  </article>
                ))
            )}
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">
              Academic Snapshot
            </h2>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-sm">
                  Students
                </span>

                <span className="font-bold">
                  {counts.students}
                </span>
              </div>

              <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-sm">
                  Lecturers
                </span>

                <span className="font-bold">
                  {counts.lecturers}
                </span>
              </div>

              <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-sm">
                  Courses
                </span>

                <span className="font-bold">
                  {counts.courses}
                </span>
              </div>

              <a
                href="/admin/academics"
                className="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Academic Administration
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">
              Student Services
            </h2>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-sm">
                  Library Loans
                </span>

                <span className="font-bold">
                  {counts.libraryLoans}
                </span>
              </div>

              <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-sm">
                  Dormitories
                </span>

                <span className="font-bold">
                  {counts.dormitories}
                </span>
              </div>

              <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-sm">
                  Clinic Visits
                </span>

                <span className="font-bold">
                  {counts.clinicVisits}
                </span>
              </div>

              <a
                href="/admin/student-affairs"
                className="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Student Affairs
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">
              Institutional Services
            </h2>

            <div className="mt-5 space-y-3">
              <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-sm">
                  Finance Records
                </span>

                <span className="font-bold">
                  {counts.finance}
                </span>
              </div>

              <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-sm">
                  LMS Courses
                </span>

                <span className="font-bold">
                  {counts.lmsCourses}
                </span>
              </div>

              <div className="flex justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-sm">
                  Cafeteria Meals
                </span>

                <span className="font-bold">
                  {counts.cafeteriaMeals}
                </span>
              </div>

              <a
                href="/admin/bursary"
                className="block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Finance Administration
              </a>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-bold">
              University Administration Modules
            </h2>

            <p className="text-sm text-slate-500">
              Central access to the major
              university management functions.
            </p>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {modules.map(
              ([label, href]) => (
                <a
                  key={href}
                  href={href}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4 text-sm font-semibold hover:bg-slate-50"
                >
                  <span>{label}</span>

                  <span className="text-slate-400">
                    →
                  </span>
                </a>
              ),
            )}
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="font-bold text-blue-900">
            Central University Architecture
          </h2>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            Registration creates the central
            student identity. Academic,
            financial, library, LMS, cafeteria,
            dormitory, clinic, student affairs
            and graduation services use that
            identity throughout the university
            system.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/admin/data-centre"
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              View Central Data
            </a>

            <a
              href="/admin/graduation"
              className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100"
            >
              Graduation
            </a>

            <a
              href="/admin/ict"
              className="rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-100"
            >
              ICT Control Centre
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
