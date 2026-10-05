"use client"
import { protectNexusPage } from "@/lib/nexus-access"

import { useEffect, useMemo, useState } from "react"

type AnnouncementStatus = "Published" | "Unpublished"

type Announcement = {
  id: string
  title: string
  message: string
  publishDate: string
  expiryDate: string
  status: AnnouncementStatus
  postedBy: string
  department: string
  createdAt: string
  updatedAt: string
}

const STORAGE_KEY = "nexusSIS_announcements"

function readAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return []
    }

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
  } catch {
    return []
  }
}

function saveAnnouncements(announcements: Announcement[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(announcements))

  // Notify other NEXUS SIS pages in the same browser tab.
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new Event("nexusSIS_announcements_updated"),
    )
  }
}

function generateId() {
  return `ANN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isExpired(announcement: Announcement) {
  if (!announcement.expiryDate) {
    return false
  }

  const expiry = new Date(`${announcement.expiryDate}T23:59:59`)

  return expiry.getTime() < Date.now()
}

export default function AnnouncementsPage() {
  useEffect(() => {
    protectNexusPage([
      "Super Administrator",
      "ICT Administrator",
    ])
  }, [])


  const [announcements, setAnnouncements] = useState<Announcement[]>([])

  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [publishDate, setPublishDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [postedBy, setPostedBy] = useState("")
  const [department, setDepartment] = useState("")

  const [editingId, setEditingId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    const stored = readAnnouncements()

    setAnnouncements(stored)

    const today = new Date().toISOString().split("T")[0]

    setPublishDate(today)
  }, [])

  const filteredAnnouncements = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return announcements
    }

    return announcements.filter((announcement) => {
      return (
        announcement.title.toLowerCase().includes(query) ||
        announcement.message.toLowerCase().includes(query) ||
        announcement.department.toLowerCase().includes(query) ||
        announcement.postedBy.toLowerCase().includes(query) ||
        announcement.status.toLowerCase().includes(query)
      )
    })
  }, [announcements, search])

  function resetForm() {
    setTitle("")
    setMessage("")
    setPostedBy("")
    setDepartment("")
    setEditingId(null)
    setShowForm(false)

    const today = new Date().toISOString().split("T")[0]

    setPublishDate(today)
    setExpiryDate("")
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!title.trim()) {
      alert("Please enter an announcement title.")
      return
    }

    if (!message.trim()) {
      alert("Please enter the announcement message.")
      return
    }

    if (!publishDate) {
      alert("Please select a publish date.")
      return
    }

    if (!postedBy.trim()) {
      alert("Please enter who is posting the announcement.")
      return
    }

    if (!department.trim()) {
      alert("Please enter the department.")
      return
    }

    if (expiryDate && expiryDate < publishDate) {
      alert("Expiry date cannot be earlier than the publish date.")
      return
    }

    const now = new Date().toISOString()

    if (editingId) {
      const updated: Announcement[] = announcements.map((announcement) => {
        if (announcement.id !== editingId) {
          return announcement
        }

        return {
          ...announcement,
          title: title.trim(),
          message: message.trim(),
          publishDate,
          expiryDate,
          postedBy: postedBy.trim(),
          department: department.trim(),
          updatedAt: now,
        }
      })

      saveAnnouncements(updated)
      setAnnouncements(updated)

      resetForm()
      return
    }

    const newAnnouncement: Announcement = {
      id: generateId(),
      title: title.trim(),
      message: message.trim(),
      publishDate,
      expiryDate,
      status: "Published",
      postedBy: postedBy.trim(),
      department: department.trim(),
      createdAt: now,
      updatedAt: now,
    }

    const updated: Announcement[] = [
      newAnnouncement,
      ...announcements,
    ]

    saveAnnouncements(updated)
    setAnnouncements(updated)

    resetForm()
  }

  function editAnnouncement(announcement: Announcement) {
    setEditingId(announcement.id)
    setTitle(announcement.title)
    setMessage(announcement.message)
    setPublishDate(announcement.publishDate)
    setExpiryDate(announcement.expiryDate)
    setPostedBy(announcement.postedBy)
    setDepartment(announcement.department)
    setShowForm(true)

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  function toggleStatus(id: string) {
    const updated: Announcement[] = announcements.map((announcement) => {
      if (announcement.id !== id) {
        return announcement
      }

      const newStatus: AnnouncementStatus =
        announcement.status === "Published"
          ? "Unpublished"
          : "Published"

      return {
        ...announcement,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      }
    })

    saveAnnouncements(updated)
    setAnnouncements(updated)
  }

  function deleteAnnouncement(id: string) {
    const announcement = announcements.find(
      (item) => item.id === id
    )

    if (!announcement) {
      return
    }

    const confirmed = window.confirm(
      `Delete "${announcement.title}"? This action cannot be undone.`
    )

    if (!confirmed) {
      return
    }

    const updated: Announcement[] = announcements.filter(
      (item) => item.id !== id
    )

    saveAnnouncements(updated)
    setAnnouncements(updated)

    if (editingId === id) {
      resetForm()
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  const publishedCount = announcements.filter(
    (announcement) =>
      announcement.status === "Published" &&
      announcement.publishDate <= today &&
      !isExpired(announcement)
  ).length

  const unpublishedCount = announcements.filter(
    (announcement) => announcement.status === "Unpublished"
  ).length

  const expiredCount = announcements.filter(
    (announcement) => isExpired(announcement)
  ).length

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600">
              University System
            </p>

            <h1 className="mt-1 text-3xl font-bold">
              University Announcements
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Central announcement management for university-wide updates
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/admin/ict"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Home
            </a>

            <button
              type="button"
              onClick={() => {
                setShowForm(true)

                window.scrollTo({
                  top: 0,
                  behavior: "smooth",
                })
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              + New Announcement
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Announcements
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {announcements.length}
            </p>
          </div>

          <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-green-700">
              Currently Published
            </p>

            <p className="mt-2 text-3xl font-bold text-green-800">
              {publishedCount}
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-amber-700">
              Unpublished
            </p>

            <p className="mt-2 text-3xl font-bold text-amber-800">
              {unpublishedCount}
            </p>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-red-700">
              Expired
            </p>

            <p className="mt-2 text-3xl font-bold text-red-800">
              {expiredCount}
            </p>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">
                    {editingId
                      ? "Edit Announcement"
                      : "Create Announcement"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Published announcements are visible across the university.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Announcement Title
                  </label>

                  <input
                    type="text"
                    value={title}
                    onChange={(event) =>
                      setTitle(event.target.value)
                    }
                    placeholder="Enter announcement title"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Announcement Message
                  </label>

                  <textarea
                    value={message}
                    onChange={(event) =>
                      setMessage(event.target.value)
                    }
                    placeholder="Enter the announcement details..."
                    rows={6}
                    className="w-full resize-y rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Publish Date
                  </label>

                  <input
                    type="date"
                    value={publishDate}
                    onChange={(event) =>
                      setPublishDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Expiry Date
                  </label>

                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(event) =>
                      setExpiryDate(event.target.value)
                    }
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  <p className="mt-1 text-xs text-slate-500">
                    Leave blank if the announcement should not expire.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Posted By
                  </label>

                  <input
                    type="text"
                    value={postedBy}
                    onChange={(event) =>
                      setPostedBy(event.target.value)
                    }
                    placeholder="e.g. ICT Administrator"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Department / Office
                  </label>

                  <input
                    type="text"
                    value={department}
                    onChange={(event) =>
                      setDepartment(event.target.value)
                    }
                    placeholder="e.g. ICT Department, Registrar's Office"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  {editingId
                    ? "Save Changes"
                    : "Publish Announcement"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Search */}
        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Announcement Management
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage university-wide announcements from one location.
              </p>
            </div>

            <div className="w-full lg:w-96">
              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search announcements..."
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>
        </section>

        {/* Announcement List */}
        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {filteredAnnouncements.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-2xl">
                📢
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No announcements found
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Create a university-wide announcement to get started.
              </p>

              <button
                type="button"
                onClick={() => {
                  setShowForm(true)

                  window.scrollTo({
                    top: 0,
                    behavior: "smooth",
                  })
                }}
                className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create Announcement
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Announcement
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Department
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Published
                      </th>

                      <th className="px-5 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredAnnouncements.map((announcement) => {
                      const expired = isExpired(announcement)

                      return (
                        <tr
                          key={announcement.id}
                          className="transition hover:bg-slate-50"
                        >
                          <td className="max-w-xl px-5 py-5 align-top">
                            <div className="font-semibold text-slate-900">
                              {announcement.title}
                            </div>

                            <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                              {announcement.message}
                            </p>

                            <div className="mt-2 text-xs text-slate-400">
                              Posted by {announcement.postedBy}
                            </div>
                          </td>

                          <td className="px-5 py-5 align-top">
                            <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              {announcement.department}
                            </span>
                          </td>

                          <td className="px-5 py-5 align-top text-sm text-slate-600">
                            <div>
                              {announcement.publishDate}
                            </div>

                            {announcement.expiryDate && (
                              <div className="mt-1 text-xs text-slate-400">
                                Expires {announcement.expiryDate}
                              </div>
                            )}
                          </td>

                          <td className="px-5 py-5 align-top">
                            {expired ? (
                              <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                Expired
                              </span>
                            ) : announcement.status ===
                              "Published" ? (
                              <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                Published
                              </span>
                            ) : (
                              <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                                Unpublished
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-5 align-top">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  editAnnouncement(
                                    announcement
                                  )
                                }
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleStatus(
                                    announcement.id
                                  )
                                }
                                className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                              >
                                {announcement.status ===
                                "Published"
                                  ? "Unpublish"
                                  : "Publish"}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  deleteAnnouncement(
                                    announcement.id
                                  )
                                }
                                className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
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

              {/* Mobile Cards */}
              <div className="divide-y divide-slate-200 lg:hidden">
                {filteredAnnouncements.map((announcement) => {
                  const expired = isExpired(announcement)

                  return (
                    <div
                      key={announcement.id}
                      className="p-5"
                    >
                      <div className="flex flex-col gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {announcement.title}
                          </h3>

                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {announcement.message}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                            {announcement.department}
                          </span>

                          {expired ? (
                            <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                              Expired
                            </span>
                          ) : announcement.status ===
                            "Published" ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                              Published
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                              Unpublished
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-slate-500">
                          Posted by {announcement.postedBy}
                        </div>

                        <div className="text-xs text-slate-500">
                          Published: {announcement.publishDate}
                        </div>

                        {announcement.expiryDate && (
                          <div className="text-xs text-slate-500">
                            Expires: {announcement.expiryDate}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() =>
                              editAnnouncement(
                                announcement
                              )
                            }
                            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              toggleStatus(
                                announcement.id
                              )
                            }
                            className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700"
                          >
                            {announcement.status ===
                            "Published"
                              ? "Unpublish"
                              : "Publish"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteAnnouncement(
                                announcement.id
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
