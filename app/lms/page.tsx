'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { clearNexusSession, protectNexusPage } from '@/lib/nexus-access';

type Portal = 'student' | 'lecturer';

type StudentRecord = {
  id?: string;
  studentId?: string;
  studentID?: string;
  idNo?: string;

  name?: string;
  studentName?: string;
  fullName?: string;

  firstName?: string;
  middleName?: string;
  lastName?: string;

  faculty?: string;
  department?: string;
  programme?: string;
  program?: string;
  course?: string;
  yearLevel?: string;

  email?: string;
  phone?: string;
  gender?: string;
  status?: string;
};

type ModuleItem = {
  name: string;
  type: string;
  size?: string;
  due?: string;
};

type Course = {
  code: string;
  title: string;
  lecturer: string;
  schedule: string;
  modules: ModuleItem[];
};

type GradeRow = {
  idNo: string;
  studentName: string;
  program: string;
  yearLevel: string;
  courseCode: string;
  semester: string;
  assignmentScore: string;
  examScore: string;
  practicalScore: string;
  labScore: string;
  finalScore: string;
  grade: string;
  status: string;
  feedback?: string;
};

type Submission = {
  id: number;
  studentId: string;
  studentName: string;
  courseCode: string;
  assignment: string;
  submittedAt: string;
  fileName: string;
  status: string;
  originality: number;
  similarity: number;
  aiIndicator: 'Low' | 'Medium' | 'High';
  lecturerDecision: string;
  feedback: string;
};

type Announcement = {
  date: string;
  author: string;
  text: string;
};

type OnlineStudent = {
  studentId: string;
  name: string;
  faculty: string;
  department: string;
  programme: string;
  yearLevel: string;
  lastSeen: number;
};

const CENTRAL_KEYS = {
  students: 'nexusSIS_registered_students',
  courses: 'nexusSIS_courses',
  lecturers: 'nexusSIS_lecturers',
  lmsCourses: 'nexusSIS_lms_courses',
  materials: 'nexusSIS_lms_materials',
  announcements: 'nexusSIS_lms_announcements',
  assignments: 'nexusSIS_lms_assignments',
  submissions: 'nexusSIS_lms_submissions',
  enrolments: 'nexusSIS_lms_enrolments',
  session: 'nexusSIS_current_student',

  currentSession: 'nexussis_session',
  username: 'nexus_username',
  role: 'nexus_role',
  presence: 'nexusSIS_lms_presence'
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);

    if (!raw) return fallback;

    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browser storage unavailable.
  }
}

function firstValue(
  record: Record<string, unknown>,
  keys: string[],
  fallback = ''
): string {
  for (const key of keys) {
    const value = record[key];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(value).trim();
    }
  }

  return fallback;
}

function numberValue(
  record: Record<string, unknown>,
  keys: string[],
  fallback = 0
): number {
  for (const key of keys) {
    const value = Number(record[key]);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return fallback;
}

function getStudentId(student: Record<string, unknown>): string {
  return firstValue(student, [
    'studentId',
    'studentID',
    'id',
    'idNo'
  ]);
}

function getStudentName(student: Record<string, unknown>): string {
  const direct = firstValue(student, [
    'name',
    'studentName',
    'fullName'
  ]);

  if (direct) return direct;

  return [
    firstValue(student, ['firstName']),
    firstValue(student, ['middleName']),
    firstValue(student, ['lastName'])
  ]
    .filter(Boolean)
    .join(' ');
}

function getCourseCode(course: Record<string, unknown>): string {
  return firstValue(course, [
    'code',
    'courseCode',
    'courseID',
    'courseId'
  ]);
}

function getCourseTitle(course: Record<string, unknown>): string {
  return firstValue(course, [
    'title',
    'courseTitle',
    'name',
    'courseName'
  ]);
}

function getLecturerName(
  course: Record<string, unknown>,
  lecturers: Record<string, unknown>[]
): string {
  const direct = firstValue(course, [
    'lecturer',
    'lecturerName',
    'instructor',
    'instructorName'
  ]);

  if (direct) return direct;

  const lecturerId = firstValue(course, [
    'lecturerId',
    'staffId',
    'instructorId'
  ]);

  if (lecturerId) {
    const lecturer = lecturers.find(
      (item) =>
        firstValue(item, [
          'staffId',
          'lecturerId',
          'id',
          'staffID'
        ]) === lecturerId
    );

    if (lecturer) {

  /*
   * Protect students from accidentally leaving the LMS.
   *
   * The browser controls the exact wording of this warning.
   * It appears when the student refreshes, closes the tab,
   * closes the browser, or navigates away.
   */
  useEffect(() => {
    const handleBeforeUnload = (
      event: BeforeUnloadEvent,
    ) => {
      try {
        const session =
          localStorage.getItem(
            'nexussis_session',
          );

        if (!session) {
          return;
        }

        event.preventDefault();

        event.returnValue =
          'You are currently logged into the Student LMS. Are you sure you want to leave this page?';
      } catch {
        // Ignore browser storage errors.
      }
    };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload,
    );




    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload,
      );
    };
  }, []);


      return (
        firstValue(lecturer, [
          'name',
          'lecturerName',
          'fullName'
        ]) ||
        [
          firstValue(lecturer, ['firstName']),
          firstValue(lecturer, ['middleName']),
          firstValue(lecturer, ['lastName'])
        ]
          .filter(Boolean)
          .join(' ')
      );
    }
  }

  return 'Assigned Lecturer';
}

function normalizeMaterial(
  material: Record<string, unknown>
): ModuleItem {
  return {
    name: firstValue(
      material,
      ['name', 'title', 'materialName', 'assignment'],
      'Course Material'
    ),
    type: firstValue(
      material,
      ['type', 'materialType', 'category'],
      'Course Material'
    ),
    size:
      firstValue(material, ['size', 'fileSize']) ||
      undefined,
    due:
      firstValue(material, [
        'due',
        'dueDate',
        'deadline'
      ]) || undefined
  };
}

function normalizeAssignment(
  assignment: Record<string, unknown>
): ModuleItem {
  return {
    name: firstValue(
      assignment,
      [
        'title',
        'name',
        'assignment',
        'assignmentName'
      ],
      'Assignment'
    ),
    type: firstValue(
      assignment,
      ['type', 'category'],
      'Assignment'
    ),
    due:
      firstValue(assignment, [
        'due',
        'dueDate',
        'deadline'
      ]) || undefined
  };
}

function normalizeSubmission(
  submission: Record<string, unknown>,
  students: Record<string, unknown>[]
): Submission {
  const studentId = firstValue(submission, [
    'studentId',
    'studentID',
    'idNo'
  ]);

  const student = students.find(
    (item) => getStudentId(item) === studentId
  );

  const rawStatus = firstValue(
    submission,
    ['status', 'submissionStatus'],
    'Submitted'
  );

  const rawDecision = firstValue(
    submission,
    [
      'lecturerDecision',
      'decision',
      'reviewStatus'
    ],
    'Pending Review'
  );

  const ai = firstValue(
    submission,
    [
      'aiIndicator',
      'aiAssistance',
      'aiStatus'
    ],
    'Low'
  );

  return {
    id: numberValue(
      submission,
      ['id', 'submissionId'],
      Date.now()
    ),

    studentId,

    studentName:
      firstValue(submission, [
        'studentName',
        'name'
      ]) ||
      (student
        ? getStudentName(student)
        : 'Registered Student'),

    courseCode: firstValue(submission, [
      'courseCode',
      'course'
    ]),

    assignment: firstValue(
      submission,
      [
        'assignment',
        'assignmentName',
        'title'
      ],
      'Assignment Submission'
    ),

    submittedAt: firstValue(
      submission,
      [
        'submittedAt',
        'submissionDate',
        'date'
      ],
      ''
    ),

    fileName: firstValue(
      submission,
      [
        'fileName',
        'file',
        'documentName'
      ],
      'Submitted File'
    ),

    status:
      rawStatus === 'Reviewed'
        ? 'Reviewed'
        : rawStatus === 'Under Review'
        ? 'Under Review'
        : 'Submitted',

    originality: numberValue(
      submission,
      [
        'originality',
        'originalityScore'
      ],
      100
    ),

    similarity: numberValue(
      submission,
      [
        'similarity',
        'similarityScore'
      ],
      0
    ),

    aiIndicator:
      ai === 'High' || ai === 'Medium'
        ? ai
        : 'Low',

    lecturerDecision:
      rawDecision === 'Accepted'
        ? 'Accepted'
        : rawDecision === 'Review Required'
        ? 'Review Required'
        : 'Pending Review',

    feedback: firstValue(
      submission,
      [
        'feedback',
        'lecturerFeedback'
      ],
      'Submission received. Lecturer review is pending.'
    )
  };
}

function calculateGrade(score: number): string {
  if (score >= 85) return 'A+';
  if (score >= 75) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  return 'F';
}

export default function LMSPortalPage() {
  useEffect(() => {
    protectNexusPage([
      'Student',
      'Super Administrator',
      'ICT Administrator',
    ]);
  }, []);

  const [activePortal, setActivePortal] =



    useState<Portal>('student');

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [currentStudent, setCurrentStudent] =
    useState<StudentRecord | null>(null);

  const [currentStudentId, setCurrentStudentId] =
    useState('');
    const performLogout = () => {
      try {
        clearNexusSession();

        localStorage.removeItem(
          'nexusSIS_current_student',
        );

        const presenceRaw =
          localStorage.getItem(
            'nexusSIS_lms_presence',
          );

        if (presenceRaw) {
          try {
            const presence =
              JSON.parse(presenceRaw);

            if (Array.isArray(presence)) {
              const remaining =
                presence.filter(
                  (student: {
                    studentId?: string;
                  }) =>
                    student.studentId !==
                    currentStudentId,
                );

              localStorage.setItem(
                'nexusSIS_lms_presence',
                JSON.stringify(remaining),
              );
            }
          } catch {
            // Ignore presence cleanup errors.
          }
        }
      } catch {
        // Continue to login page even if localStorage cleanup fails.
      }

      setShowLogoutConfirm(false);
      window.location.href =
        '/dashboard';
    };


  const [currentStudentName, setCurrentStudentName] =
    useState('');

  const [centralLmsReady, setCentralLmsReady] =
    useState(false);

  const [onlineClassmates, setOnlineClassmates] =
    useState<OnlineStudent[]>([]);

  const [courses, setCourses] = useState<Course[]>([]);

  const [gradebook, setGradebook] =
    useState<GradeRow[]>([]);

  const [submissions, setSubmissions] =
    useState<Submission[]>([]);

  const [announcements, setAnnouncements] =
    useState<Announcement[]>([]);

  const [selectedSemesterFilter, setSelectedSemesterFilter] =
    useState('All');

  const [announcementText, setAnnouncementText] =
    useState('');

  const [uploadCourse, setUploadCourse] =
    useState('');

  const [uploadTitle, setUploadTitle] =
    useState('');

  const [uploadType, setUploadType] =
    useState('PDF Notes');

  const [modal, setModal] = useState<
    'grades' |
    'assignment' |
    'research' |
    'integrity' |
    'course' |
    null
  >(null);

  const [selectedCourse, setSelectedCourse] =
    useState<Course | null>(null);

  const [selectedAssignment, setSelectedAssignment] =
    useState<ModuleItem | null>(null);

  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);

  const [submissionFile, setSubmissionFile] =
    useState<File | null>(null);

  const [submissionMessage, setSubmissionMessage] =
    useState('');


  /*
   * LMS ONLINE PRESENCE
   *
   * Students are considered online when their LMS browser
   * sends a heartbeat. The presence record expires after
   * 90 seconds without a heartbeat.
   *
   * This is appropriate for the current localStorage-based
   * prototype. A real multi-computer deployment should use
   * a shared backend/WebSocket service instead.
   */
  useEffect(() => {
    if (
      activePortal !== 'student' ||
      !currentStudentId ||
      !currentStudent
    ) {
      return;
    }

    const presenceInterval = 30000;
    const presenceTimeout = 90000;

    const updatePresence = () => {
      try {
        const students =
          readStorage<Record<string, unknown>[]>(
            CENTRAL_KEYS.students,
            []
          );

        const me =
          students.find(
            (student) =>
              getStudentId(student) ===
              currentStudentId
          ) ||
          (currentStudent as Record<string, unknown>);

        const name =
          getStudentName(me);

        const faculty =
          firstValue(
            me,
            ['faculty'],
            ''
          );

        const department =
          firstValue(
            me,
            ['department'],
            ''
          );

        const programme =
          firstValue(
            me,
            [
              'programme',
              'program',
              'course'
            ],
            ''
          );

        const yearLevel =
          firstValue(
            me,
            ['yearLevel'],
            ''
          );

        const now = Date.now();

        const existing =
          readStorage<
            OnlineStudent[]
          >(
            CENTRAL_KEYS.presence,
            []
          );

        const withoutMe =
          existing.filter(
            (student) =>
              student.studentId !==
              currentStudentId
          );

        const updated: OnlineStudent[] = [
          ...withoutMe,
          {
            studentId:
              currentStudentId,
            name,
            faculty,
            department,
            programme,
            yearLevel,
            lastSeen: now
          }
        ];

        writeStorage(
          CENTRAL_KEYS.presence,
          updated
        );

        /*
         * Clean out expired users.
         */
        const fresh =
          updated.filter(
            (student) =>
              now -
                Number(
                  student.lastSeen
                ) <
              presenceTimeout
          );

        /*
         * Only show classmates from the same
         * programme/course and year.
         */
        const myProgramme =
          programme.trim().toLowerCase();

        const myYear =
          yearLevel.trim().toLowerCase();

        const classmates =
          fresh.filter((student) => {
            if (
              student.studentId ===
              currentStudentId
            ) {
              return false;
            }

            const theirProgramme =
              String(
                student.programme || ''
              )
                .trim()
                .toLowerCase();

            const theirYear =
              String(
                student.yearLevel || ''
              )
                .trim()
                .toLowerCase();

            /*
             * Prefer exact programme + year.
             */
            if (
              myProgramme &&
              myYear
            ) {
              return (
                theirProgramme ===
                  myProgramme &&
                theirYear === myYear
              );
            }

            /*
             * If programme is missing,
             * fall back to year.
             */
            if (myYear) {
              return (
                theirYear ===
                myYear
              );
            }

            return false;
          });

        setOnlineClassmates(
          classmates
        );

        /*
         * Write cleaned records back.
         */
        writeStorage(
          CENTRAL_KEYS.presence,
          fresh
        );
      } catch {
        // Presence is non-critical.
      }
    };

    updatePresence();

    const interval =
      window.setInterval(
        updatePresence,
        presenceInterval
      );

    const handleStorage =
      () => {
        updatePresence();
      };

    window.addEventListener(
      'storage',
      handleStorage
    );

    const handleBeforeUnload =
      () => {
        try {
          const existing =
            readStorage<
              OnlineStudent[]
            >(
              CENTRAL_KEYS.presence,
              []
            );

          const remaining =
            existing.filter(
              (student) =>
                student.studentId !==
                currentStudentId
            );

          writeStorage(
            CENTRAL_KEYS.presence,
            remaining
          );
        } catch {
          // Ignore cleanup errors.
        }
      };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    );

    return () => {
      window.clearInterval(
        interval
      );

      window.removeEventListener(
        'storage',
        handleStorage
      );

      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    };
  }, [
    activePortal,
    currentStudentId,
    currentStudent
  ]);

  useEffect(() => {
    try {
      const students =
        readStorage<Record<string, unknown>[]>(
          CENTRAL_KEYS.students,
          []
        );

      const baseCourses =
        readStorage<Record<string, unknown>[]>(
          CENTRAL_KEYS.courses,
          []
        );

      const lmsCourses =
        readStorage<Record<string, unknown>[]>(
          CENTRAL_KEYS.lmsCourses,
          []
        );

      const lecturers =
        readStorage<Record<string, unknown>[]>(
          CENTRAL_KEYS.lecturers,
          []
        );

      const materials =
        readStorage<Record<string, unknown>[]>(
          CENTRAL_KEYS.materials,
          []
        );

      const assignments =
        readStorage<Record<string, unknown>[]>(
          CENTRAL_KEYS.assignments,
          []
        );

      const enrolments =
        readStorage<Record<string, unknown>[]>(
          CENTRAL_KEYS.enrolments,
          []
        );

      const storedAnnouncements =
        readStorage<Record<string, unknown>[]>(
          CENTRAL_KEYS.announcements,
          []
        );

      const storedSubmissions =
        readStorage<Record<string, unknown>[]>(
          CENTRAL_KEYS.submissions,
          []
        );

      /*
       * Resolve the logged-in user.
       */
      const session =
        readStorage<Record<string, unknown> | null>(
          CENTRAL_KEYS.currentSession,
          null
        );

      const currentUsername =
        localStorage.getItem(
          CENTRAL_KEYS.username
        ) || '';

      const currentRole =
        localStorage.getItem(
          CENTRAL_KEYS.role
        ) || '';

      /*
       * If this page is being used as the student LMS,
       * identify the student from the central registration
       * database.
       */
      let activeStudent: Record<string, unknown> | null =
        null;

      /*
       * 1. Existing current student session.
       */
      const studentSession =
        readStorage<Record<string, unknown> | null>(
          CENTRAL_KEYS.session,
          null
        );

      if (studentSession) {
        const wantedId = firstValue(
          studentSession,
          [
            'studentId',
            'studentID',
            'id',
            'idNo',
            'linkedId'
          ]
        );

        const wantedName = firstValue(
          studentSession,
          [
            'name',
            'studentName',
            'fullName',
            'username'
          ]
        );

        if (wantedId) {
          activeStudent =
            students.find(
              (student) =>
                getStudentId(student) === wantedId
            ) || null;
        }

        if (!activeStudent && wantedName) {
          activeStudent =
            students.find(
              (student) =>
                getStudentName(student)
                  .toLowerCase() ===
                wantedName.toLowerCase()
            ) || null;
        }
      }

      /*
       * 2. Standard NexusSIS login session.
       */
      if (!activeStudent && session) {
        const possibleIds = [
          firstValue(session, [
            'studentId',
            'studentID',
            'linkedId',
            'idNo'
          ]),
          currentUsername
        ].filter(Boolean);

        activeStudent =
          students.find((student) =>
            possibleIds.includes(
              getStudentId(student)
            )
          ) || null;
      }

      /*
       * 3. Existing browser student ID values.
       */
      if (!activeStudent) {
        const browserIds = [
          localStorage.getItem(
            'nexusSIS_student_id'
          ),
          localStorage.getItem(
            'nexus_student_id'
          ),
          localStorage.getItem(
            'studentId'
          ),
          localStorage.getItem(
            'studentID'
          )
        ].filter(Boolean) as string[];

        if (browserIds.length > 0) {
          activeStudent =
            students.find((student) =>
              browserIds.includes(
                getStudentId(student)
              )
            ) || null;
        }
      }

      /*
       * 4. Match by logged-in username/name.
       */
      if (!activeStudent && currentUsername) {
        activeStudent =
          students.find((student) => {
            const studentId =
              getStudentId(student);

            const studentName =
              getStudentName(student);

            const email =
              firstValue(student, ['email']);

            return (
              studentId === currentUsername ||
              studentName.toLowerCase() ===
                currentUsername.toLowerCase() ||
              email.toLowerCase() ===
                currentUsername.toLowerCase()
            );
          }) || null;
      }

      /*
       * IMPORTANT:
       * There is intentionally NO hard-coded Ian/student
       * fallback here.
       *
       * If the logged-in student cannot be matched to the
       * central registration database, the LMS shows a clear
       * message rather than displaying another student's data.
       */
      if (activeStudent) {
        const normalizedStudent: StudentRecord =
          activeStudent as StudentRecord;

        setCurrentStudent(
          normalizedStudent
        );

        setCurrentStudentId(
          getStudentId(activeStudent)
        );

        setCurrentStudentName(
          getStudentName(activeStudent)
        );
      } else if (
        currentRole.toLowerCase() !==
        'student'
      ) {
        /*
         * Lecturer/admin users can still use the lecturer
         * view of this shared LMS component.
         */
        setActivePortal('lecturer');
      }

      const resolvedStudentId =
        activeStudent
          ? getStudentId(activeStudent)
          : '';

      /*
       * Course source.
       */
      const sourceCourses =
        lmsCourses.length > 0
          ? lmsCourses
          : baseCourses;

      /*
       * Find only this student's enrolments.
       */
      const studentEnrolments =
        resolvedStudentId
          ? enrolments.filter((enrolment) => {
              const studentId =
                firstValue(enrolment, [
                  'studentId',
                  'studentID',
                  'idNo'
                ]);

              const status =
                firstValue(
                  enrolment,
                  [
                    'status',
                    'enrolmentStatus'
                  ],
                  'Active'
                ).toLowerCase();

              return (
                studentId ===
                  resolvedStudentId &&
                ![
                  'inactive',
                  'dropped',
                  'withdrawn',
                  'cancelled'
                ].includes(status)
              );
            })
          : [];

      const enrolledCourseIds =
        new Set(
          studentEnrolments
            .map((enrolment) =>
              firstValue(enrolment, [
                'courseId',
                'courseID',
                'lmsCourseId',
                'courseCode'
              ])
            )
            .filter(Boolean)
        );

      /*
       * If enrolments exist, only those courses are shown.
       *
       * If there are NO enrolment records yet, the central
       * course catalogue is used so the LMS does not appear
       * empty during setup.
       */
      const normalizedCourses: Course[] =
        sourceCourses
          .filter((rawCourse) => {
            if (!resolvedStudentId) {
              return true;
            }

            if (
              studentEnrolments.length === 0
            ) {
              return true;
            }

            const courseCode =
              getCourseCode(rawCourse);

            const courseId =
              firstValue(rawCourse, [
                'id',
                'courseId',
                'courseID'
              ]);

            return (
              enrolledCourseIds.has(
                courseCode
              ) ||
              enrolledCourseIds.has(
                courseId
              )
            );
          })
          .map((rawCourse) => {
            const code =
              getCourseCode(rawCourse);

            const title =
              getCourseTitle(rawCourse);

            const courseId =
              firstValue(rawCourse, [
                'id',
                'courseId',
                'courseID'
              ]);

            const courseMaterials =
              materials
                .filter((material) => {
                  const materialCourseId =
                    firstValue(
                      material,
                      [
                        'courseId',
                        'courseID',
                        'lmsCourseId'
                      ]
                    );

                  const materialCourseCode =
                    firstValue(
                      material,
                      [
                        'courseCode',
                        'course'
                      ]
                    );

                  return (
                    materialCourseId ===
                      courseId ||
                    materialCourseCode ===
                      code
                  );
                })
                .map(normalizeMaterial);

            const courseAssignments =
              assignments
                .filter((assignment) => {
                  const assignmentCourseId =
                    firstValue(
                      assignment,
                      [
                        'courseId',
                        'courseID',
                        'lmsCourseId'
                      ]
                    );

                  const assignmentCourseCode =
                    firstValue(
                      assignment,
                      [
                        'courseCode',
                        'course'
                      ]
                    );

                  return (
                    assignmentCourseId ===
                      courseId ||
                    assignmentCourseCode ===
                      code
                  );
                })
                .map(normalizeAssignment);

            return {
              code,
              title,
              lecturer:
                getLecturerName(
                  rawCourse,
                  lecturers
                ),
              schedule:
                firstValue(
                  rawCourse,
                  [
                    'schedule',
                    'classSchedule',
                    'meetingSchedule',
                    'time'
                  ],
                  'Schedule to be advised'
                ),
              modules: [
                ...courseMaterials,
                ...courseAssignments
              ]
            };
          })
          .filter(
            (course) =>
              course.code &&
              course.title
          );

      setCourses(normalizedCourses);

      if (
        normalizedCourses.length > 0
      ) {
        setUploadCourse(
          normalizedCourses[0].code
        );
      }

      /*
       * LMS announcements.
       */
      if (
        storedAnnouncements.length > 0
      ) {
        setAnnouncements(
          storedAnnouncements
            .map((announcement) => ({
              date: firstValue(
                announcement,
                [
                  'date',
                  'createdAt',
                  'publishedAt'
                ],
                new Date()
                  .toISOString()
                  .split('T')[0]
              ),
              author: firstValue(
                announcement,
                [
                  'author',
                  'lecturerName',
                  'createdBy'
                ],
                'LMS Administration'
              ),
              text: firstValue(
                announcement,
                [
                  'text',
                  'message',
                  'content',
                  'announcement'
                ],
                ''
              )
            }))
            .filter(
              (announcement) =>
                announcement.text
            )
        );
      }

      /*
       * Central submissions.
       */
      if (
        storedSubmissions.length > 0
      ) {
        const normalizedSubmissions =
          storedSubmissions.map(
            (submission) =>
              normalizeSubmission(
                submission,
                students
              )
          );

        setSubmissions(
          normalizedSubmissions
        );
      }

      /*
       * Existing gradebook.
       *
       * Grades are deliberately filtered later for students.
       * Lecturer view can continue to work with the complete
       * academic gradebook.
       */
      const storedGrades =
        readStorage<Record<string, unknown>[]>(
          'nexusSIS_lms_gradebook',
          []
        );

      if (storedGrades.length > 0) {
        setGradebook(
          storedGrades.map((grade) => ({
            idNo: firstValue(
              grade,
              [
                'idNo',
                'studentId',
                'studentID'
              ]
            ),
            studentName: firstValue(
              grade,
              [
                'studentName',
                'name'
              ],
              'Student'
            ),
            program: firstValue(
              grade,
              [
                'program',
                'programme',
                'course'
              ],
              ''
            ),
            yearLevel: firstValue(
              grade,
              ['yearLevel'],
              ''
            ),
            courseCode: firstValue(
              grade,
              [
                'courseCode',
                'course'
              ]
            ),
            semester: firstValue(
              grade,
              ['semester'],
              'Semester 1, 2026'
            ),
            assignmentScore:
              firstValue(
                grade,
                [
                  'assignmentScore',
                  'assignment'
                ],
                '0'
              ),
            examScore: firstValue(
              grade,
              [
                'examScore',
                'exam'
              ],
              '0'
            ),
            practicalScore:
              firstValue(
                grade,
                [
                  'practicalScore',
                  'practical'
                ],
                '0'
              ),
            labScore: firstValue(
              grade,
              [
                'labScore',
                'lab'
              ],
              '0'
            ),
            finalScore: firstValue(
              grade,
              ['finalScore'],
              '0'
            ),
            grade: firstValue(
              grade,
              ['grade'],
              'F'
            ),
            status: firstValue(
              grade,
              ['status'],
              'Submitted'
            ),
            feedback: firstValue(
              grade,
              [
                'feedback',
                'lecturerFeedback'
              ],
              ''
            )
          }))
        );
      }

      setCentralLmsReady(true);
    } catch {
      setCentralLmsReady(false);
    }
  }, []);

  /*
   * Student-specific grades.
   */
  const myGrades = useMemo(() => {
    if (!currentStudentId) {
      return [];
    }

    return gradebook.filter(
      (row) =>
        row.idNo === currentStudentId
    );
  }, [
    gradebook,
    currentStudentId
  ]);

  /*
   * Student-specific submissions.
   */
  const mySubmissions = useMemo(() => {
    if (!currentStudentId) {
      return [];
    }

    return submissions.filter(
      (submission) =>
        submission.studentId ===
        currentStudentId
    );
  }, [
    submissions,
    currentStudentId
  ]);

  /*
   * Lecturer sees the complete review queue.
   * Students never use this list.
   */
  const pendingIntegrityReviews =
    submissions.filter(
      (submission) =>
        submission.lecturerDecision !==
        'Accepted'
    );

  const filteredGradebook =
    gradebook.filter((row) => {
      if (
        selectedSemesterFilter ===
        'All'
      ) {
        return true;
      }

      return (
        row.semester ===
        selectedSemesterFilter
      );
    });

  const studentAverage = useMemo(() => {
    if (myGrades.length === 0) {
      return 0;
    }

    const total = myGrades.reduce(
      (sum, grade) =>
        sum +
        Number(
          grade.finalScore || 0
        ),
      0
    );

    return Math.round(
      total / myGrades.length
    );
  }, [myGrades]);

  const handlePostAnnouncement = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!announcementText.trim()) {
      return;
    }

    const newAnnouncement: Announcement =
      {
        date: new Date()
          .toISOString()
          .split('T')[0],
        author:
          'Lecturer Portal',
        text:
          announcementText.trim()
      };

    setAnnouncements((previous) => {
      const next = [
        newAnnouncement,
        ...previous
      ];

      writeStorage(
        CENTRAL_KEYS.announcements,
        next
      );

      return next;
    });

    setAnnouncementText('');

    alert(
      'Announcement posted successfully to the central LMS.'
    );
  };

  const handleFileUpload = (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    if (!uploadTitle.trim()) {
      return;
    }

    const newMaterial = {
      id: `MAT-${Date.now()}`,
      courseCode: uploadCourse,
      title: uploadTitle.trim(),
      name: uploadTitle.trim(),
      type: uploadType,
      size: `${(
        Math.random() * 5 +
        1
      ).toFixed(1)} MB`,
      uploadedAt:
        new Date().toISOString(),
      uploadedBy:
        'Lecturer Portal'
    };

    const existingMaterials =
      readStorage<
        Record<string, unknown>[]
      >(
        CENTRAL_KEYS.materials,
        []
      );

    writeStorage(
      CENTRAL_KEYS.materials,
      [
        newMaterial,
        ...existingMaterials
      ]
    );

    setCourses((previous) =>
      previous.map((course) =>
        course.code ===
        uploadCourse
          ? {
              ...course,
              modules: [
                ...course.modules,
                normalizeMaterial(
                  newMaterial
                )
              ]
            }
          : course
      )
    );

    setUploadTitle('');

    alert(
      'Material uploaded successfully to the central LMS.'
    );
  };

  const handleUpdateScore = (
    idNo: string,
    courseCode: string,
    field:
      | 'assignmentScore'
      | 'examScore'
      | 'practicalScore'
      | 'labScore',
    value: string
  ) => {
    setGradebook((previous) => {
      const next = previous.map(
        (item) => {
          if (
            item.idNo !== idNo ||
            item.courseCode !==
              courseCode
          ) {
            return item;
          }

          const updated = {
            ...item,
            [field]: value
          };

          const assignment =
            Number(
              updated.assignmentScore
            ) || 0;

          const exam =
            Number(
              updated.examScore
            ) || 0;

          const practical =
            Number(
              updated.practicalScore
            ) || 0;

          const lab =
            Number(
              updated.labScore
            ) || 0;

          const finalScore =
            Math.round(
              (assignment +
                exam +
                practical +
                lab) /
                4
            );

          updated.finalScore =
            String(finalScore);

          updated.grade =
            calculateGrade(
              finalScore
            );

          return updated;
        }
      );

      writeStorage(
        'nexusSIS_lms_gradebook',
        next
      );

      return next;
    });
  };

  const handlePrintGradebook =
    () => {
      window.print();
    };

  const handleSendToRegistrar =
    () => {
      alert(
        'Official semester gradebook successfully transmitted to the Registrar Office and HOD for academic transcript processing.'
      );
    };

  const openAssignment = (
    course: Course,
    module: ModuleItem
  ) => {
    setSelectedCourse(course);
    setSelectedAssignment(module);
    setSubmissionFile(null);
    setSubmissionMessage('');
    setModal('assignment');
  };

  const openCourse = (
    course: Course
  ) => {
    setSelectedCourse(course);
    setModal('course');
  };

  const openIntegrity = (
    submission: Submission
  ) => {
    setSelectedSubmission(
      submission
    );
    setModal('integrity');
  };

  const runIntegrityScreening = (
    submissionId: number
  ) => {
    setSubmissions((previous) => {
      const next = previous.map(
        (submission) =>
          submission.id ===
          submissionId
            ? {
                ...submission,
                status:
                  'Under Review',
                lecturerDecision:
                  'Review Required',
                feedback:
                  'Integrity screening completed. Lecturer review is required before final academic action.'
              }
            : submission
      );

      writeStorage(
        CENTRAL_KEYS.submissions,
        next
      );

      return next;
    });

    setSelectedSubmission(
      (previous) =>
        previous
          ? {
              ...previous,
              status:
                'Under Review',
              lecturerDecision:
                'Review Required',
              feedback:
                'Integrity screening completed. Lecturer review is required before final academic action.'
            }
          : null
    );
  };

  const acceptSubmission = (
    submissionId: number
  ) => {
    setSubmissions((previous) => {
      const next = previous.map(
        (submission) =>
          submission.id ===
          submissionId
            ? {
                ...submission,
                status:
                  'Reviewed',
                lecturerDecision:
                  'Accepted',
                feedback:
                  'Submission reviewed and accepted by the lecturer.'
              }
            : submission
      );

      writeStorage(
        CENTRAL_KEYS.submissions,
        next
      );

      return next;
    });

    setSelectedSubmission(
      (previous) =>
        previous
          ? {
              ...previous,
              status:
                'Reviewed',
              lecturerDecision:
                'Accepted',
              feedback:
                'Submission reviewed and accepted by the lecturer.'
            }
          : null
    );
  };

  const submitAssignment = () => {
    if (
      !submissionFile ||
      !selectedAssignment ||
      !selectedCourse ||
      !currentStudentId
    ) {
      setSubmissionMessage(
        !currentStudentId
          ? 'Your student registration record could not be resolved. Please log in again.'
          : 'Please select the assignment file before submitting.'
      );

      return;
    }

    const newSubmission: Submission =
      {
        id: Date.now(),
        studentId:
          currentStudentId,
        studentName:
          currentStudentName,
        courseCode:
          selectedCourse.code,
        assignment:
          selectedAssignment.name,
        submittedAt:
          new Date().toLocaleString(),
        fileName:
          submissionFile.name,
        status: 'Submitted',
        originality: 100,
        similarity: 0,
        aiIndicator: 'Low',
        lecturerDecision:
          'Pending Review',
        feedback:
          'Submission received. Integrity screening and lecturer review are pending.'
      };

    setSubmissions((previous) => {
      const next = [
        newSubmission,
        ...previous
      ];

      writeStorage(
        CENTRAL_KEYS.submissions,
        next
      );

      return next;
    });

    setSubmissionFile(null);

    setSubmissionMessage(
      'Assignment submitted successfully. It has been sent for academic integrity screening and lecturer review.'
    );
  };

  const integrityLabel = (
    submission: Submission
  ) => {
    if (
      submission.aiIndicator ===
      'High'
    ) {
      return 'Review Required';
    }

    if (
      submission.aiIndicator ===
      'Medium'
    ) {
      return 'Review Recommended';
    }

    return 'No Strong AI Indicator';
  };

  const studentFaculty =
    currentStudent
      ? firstValue(
          currentStudent as Record<
            string,
            unknown
          >,
          ['faculty'],
          'Faculty not recorded'
        )
      : '';

  const studentDepartment =
    currentStudent
      ? firstValue(
          currentStudent as Record<
            string,
            unknown
          >,
          ['department'],
          ''
        )
      : '';

  const studentProgramme =
    currentStudent
      ? firstValue(
          currentStudent as Record<
            string,
            unknown
          >,
          [
            'programme',
            'program',
            'course'
          ],
          ''
        )
      : '';

  const studentYear =
    currentStudent
      ? firstValue(
          currentStudent as Record<
            string,
            unknown
          >,
          ['yearLevel'],
          ''
        )
      : '';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: 'sans-serif'
      }}
    >
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          #printable-gradebook,
          #printable-gradebook * {
            visibility: visible;
          }

          #printable-gradebook {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: #fff;
            border: none;
            box-shadow: none;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* TOP NAVIGATION */}
      <nav
        className="no-print"
        style={{
          backgroundColor: '#0f172a',
          color: '#fff',
          padding: '15px 40px',
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '15px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '30px',
            flexWrap: 'wrap'
          }}
        >
          <span
            style={{
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            NexusSIS - Moodle LMS Portal
          </span>

          <div
            style={{
              display: 'flex',
              gap: '20px',
              fontSize: '14px',
              color: '#cbd5e1'
            }}
          >
            <a
              href="/dashboard"
              style={{
                color: 'inherit',
                textDecoration: 'none'
              }}
            >
              Home
            </a>


          </div>
        </div>

        {currentStudentId ? (
          <div
            style={{
              fontSize: '12px',
              color: '#cbd5e1'
            }}
          >
            Student ID:{' '}
            <strong
              style={{ color: '#fff' }}
            >
              {currentStudentId}
            </strong>
          </div>
        ) : null}
      

<button
  type="button"
  onClick={() => setShowLogoutConfirm(true)}
  style={{
    border: 'none',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    padding: '9px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '13px',
  }}
>
  Logout
</button>

</nav>

      {/* HEADER */}
      <div
        className="no-print"
        style={{
          maxWidth: '1200px',
          margin:
            '30px auto 20px auto',
          padding: '0 20px'
        }}
      >
        <div
          style={{
            backgroundColor: '#0f172a',
            color: '#fff',
            borderRadius: '10px',
            padding: '25px 30px',
            boxShadow:
              '0 4px 6px -1px rgba(0,0,0,0.1)'
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 'bold',
              color: '#38bdf8',
              letterSpacing:
                '0.05em',
              marginBottom: '8px'
            }}
          >
            MODULE: VIRTUAL LEARNING
            ENVIRONMENT (LMS)
          </div>

          <div
            style={{
              fontSize: '22px',
              fontWeight: 'bold'
            }}
          >
            {activePortal ===
            'student'
              ? 'Student Course Hub & Assignment Portal'
              : 'Lecturer Course Management & Gradebook Terminal'}
          </div>

          <div
            style={{
              marginTop: '8px',
              fontSize: '12px',
              color: '#cbd5e1'
            }}
          >
            {centralLmsReady
              ? currentStudentId
                ? `Central LMS connected • ${currentStudentId}`
                : 'Central LMS connected'
              : 'Central LMS loading...'}
          </div>
        </div>
      </div>

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding:
            '0 20px 40px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '25px'
        }}
      >
        {/* STUDENT IDENTITY CARD */}
        {activePortal ===
          'student' && (
          <div
            className="no-print"
            style={{
              backgroundColor: '#fff',
              border:
                '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '25px',
              boxShadow:
                '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            {currentStudent ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent:
                      'space-between',
                    alignItems:
                      'flex-start',
                    gap: '20px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: '#2563eb',
                        letterSpacing:
                          '0.05em',
                        marginBottom:
                          '6px'
                      }}
                    >
                      STUDENT LEARNING
                      PROFILE
                    </div>

                    <h1
                      style={{
                        margin: 0,
                        fontSize: '25px',
                        color: '#0f172a'
                      }}
                    >
                      {currentStudentName}
                    </h1>

                    <div
                      style={{
                        marginTop: '6px',
                        color: '#64748b',
                        fontSize: '13px'
                      }}
                    >
                      Student ID:{' '}
                      <strong>
                        {currentStudentId ||
                          'Not recorded'}
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor:
                        '#ecfdf5',
                      color: '#166534',
                      padding:
                        '8px 14px',
                      borderRadius:
                        '20px',
                      fontSize: '12px',
                      fontWeight:
                        'bold'
                    }}
                  >
                    ✓ Registered Student
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(190px, 1fr))',
                    gap: '12px',
                    marginTop: '20px'
                  }}
                >
                  <div
                    style={{
                      backgroundColor:
                        '#f8fafc',
                      padding: '14px',
                      borderRadius:
                        '8px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        fontWeight:
                          'bold'
                      }}
                    >
                      YEAR LEVEL
                    </div>

                    <div
                      style={{
                        marginTop:
                          '4px',
                        fontSize: '15px',
                        fontWeight:
                          'bold',
                        color:
                          '#0f172a'
                      }}
                    >
                      {studentYear
                        ? `Year ${studentYear.replace(
                            /^Year\\s*/i,
                            ''
                          )}`
                        : 'Not recorded'}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor:
                        '#f8fafc',
                      padding: '14px',
                      borderRadius:
                        '8px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        fontWeight:
                          'bold'
                      }}
                    >
                      PROGRAMME
                    </div>

                    <div
                      style={{
                        marginTop:
                          '4px',
                        fontSize: '15px',
                        fontWeight:
                          'bold',
                        color:
                          '#0f172a'
                      }}
                    >
                      {studentProgramme ||
                        'Not recorded'}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor:
                        '#f8fafc',
                      padding: '14px',
                      borderRadius:
                        '8px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        fontWeight:
                          'bold'
                      }}
                    >
                      FACULTY
                    </div>

                    <div
                      style={{
                        marginTop:
                          '4px',
                        fontSize: '14px',
                        fontWeight:
                          'bold',
                        color:
                          '#0f172a'
                      }}
                    >
                      {studentFaculty ||
                        'Not recorded'}
                    </div>
                  </div>

                  <div
                    style={{
                      backgroundColor:
                        '#f8fafc',
                      padding: '14px',
                      borderRadius:
                        '8px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#64748b',
                        fontWeight:
                          'bold'
                      }}
                    >
                      DEPARTMENT
                    </div>

                    <div
                      style={{
                        marginTop:
                          '4px',
                        fontSize: '14px',
                        fontWeight:
                          'bold',
                        color:
                          '#0f172a'
                      }}
                    >
                      {studentDepartment ||
                        'Not recorded'}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div
                style={{
                  backgroundColor:
                    '#fff7ed',
                  border:
                    '1px solid #fed7aa',
                  borderRadius: '8px',
                  padding: '18px',
                  color: '#9a3412'
                }}
              >
                <strong>
                  Student registration
                  profile not found.
                </strong>

                <div
                  style={{
                    marginTop: '6px',
                    fontSize: '13px'
                  }}
                >
                  Your LMS account could not
                  be matched to a record in
                  the central student
                  registration system. No other
                  student's private information
                  is being displayed.
                </div>
              </div>
            )}
          </div>
        )}

        {/* STUDENT QUICK ACTIONS */}
        {activePortal ===
          'student' &&
          currentStudent && (
            <div
              className="no-print"
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '15px'
              }}
            >
              <button
                onClick={() =>
                  setModal('grades')
                }
                style={{
                  backgroundColor: '#fff',
                  border:
                    '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '18px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow:
                    '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div
                  style={{
                    fontSize: '24px'
                  }}
                >
                  📊
                </div>

                <strong
                  style={{
                    color: '#0f172a'
                  }}
                >
                  My Grades
                </strong>

                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b'
                  }}
                >
                  View your lecturer-updated
                  results
                </div>
              </button>

              <button
                onClick={() =>
                  setModal(
                    'assignment'
                  )
                }
                style={{
                  backgroundColor: '#fff',
                  border:
                    '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '18px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow:
                    '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div
                  style={{
                    fontSize: '24px'
                  }}
                >
                  📝
                </div>

                <strong
                  style={{
                    color: '#0f172a'
                  }}
                >
                  My Assignments
                </strong>

                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b'
                  }}
                >
                  Submit and track your work
                </div>
              </button>

              <button
                onClick={() =>
                  setModal('research')
                }
                style={{
                  backgroundColor: '#fff',
                  border:
                    '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '18px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  boxShadow:
                    '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div
                  style={{
                    fontSize: '24px'
                  }}
                >
                  🔬
                </div>

                <strong
                  style={{
                    color: '#0f172a'
                  }}
                >
                  Research Portal
                </strong>

                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b'
                  }}
                >
                  Research topics and
                  submissions
                </div>
              </button>

              <div
                style={{
                  backgroundColor: '#fff',
                  border:
                    '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '18px',
                  boxShadow:
                    '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <div
                  style={{
                    fontSize: '24px'
                  }}
                >
                  🎓
                </div>

                <strong
                  style={{
                    color: '#0f172a'
                  }}
                >
                  Current Average
                </strong>

                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#2563eb',
                    marginTop: '4px'
                  }}
                >
                  {studentAverage}%
                </div>
              </div>
            </div>
          )}

        {/* CLASSMATES ONLINE */}
        {activePortal === 'student' &&
          currentStudent && (
            <div
              className="no-print"
              style={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '25px',
                boxShadow:
                  '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '15px',
                  flexWrap: 'wrap',
                  marginBottom: '18px'
                }}
              >
                <div>
                  <h3
                    style={{
                      fontSize: '17px',
                      fontWeight: 'bold',
                      color: '#0f172a',
                      margin: 0
                    }}
                  >
                    🟢 Classmates Online
                  </h3>

                  <div
                    style={{
                      marginTop: '5px',
                      color: '#64748b',
                      fontSize: '13px'
                    }}
                  >
                    Students from your class who
                    are currently using the LMS.
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor:
                      '#ecfdf5',
                    color: '#166534',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {onlineClassmates.length}{' '}
                  online
                </div>
              </div>

              {onlineClassmates.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '18px',
                    color: '#64748b',
                    fontSize: '13px'
                  }}
                >
                  <div
                    style={{
                      fontWeight: '600',
                      color: '#334155',
                      marginBottom: '4px'
                    }}
                  >
                    No classmates are online right now.
                  </div>

                  <div>
                    Your classmates will appear here when
                    they log into the LMS.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '12px'
                  }}
                >
                  {onlineClassmates.map(
                    (classmate) => (
                      <div
                        key={
                          classmate.studentId
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '14px',
                          backgroundColor:
                            '#f8fafc',
                          border:
                            '1px solid #e2e8f0',
                          borderRadius: '9px'
                        }}
                      >
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            backgroundColor:
                              '#dbeafe',
                            color: '#1d4ed8',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '15px',
                            flexShrink: 0
                          }}
                        >
                          {classmate.name
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map(
                              (part) =>
                                part.charAt(0)
                            )
                            .join('')
                            .toUpperCase()}
                        </div>

                        <div
                          style={{
                            minWidth: 0,
                            flex: 1
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <span
                              style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor:
                                  '#22c55e',
                                display:
                                  'inline-block',
                                flexShrink: 0
                              }}
                            />

                            <strong
                              style={{
                                color: '#0f172a',
                                fontSize: '14px',
                                overflow: 'hidden',
                                textOverflow:
                                  'ellipsis',
                                whiteSpace:
                                  'nowrap'
                              }}
                            >
                              {
                                classmate.name
                              }
                            </strong>
                          </div>

                          <div
                            style={{
                              marginTop: '4px',
                              color: '#64748b',
                              fontSize: '11px'
                            }}
                          >
                            {classmate.studentId}
                          </div>

                          <div
                            style={{
                              marginTop: '3px',
                              color: '#475569',
                              fontSize: '11px'
                            }}
                          >
                            {classmate.programme ||
                              'Programme not recorded'}
                            {' • '}
                            {classmate.yearLevel
                              ? `Year ${String(
                                  classmate.yearLevel
                                ).replace(
                                  /^Year\s*/i,
                                  ''
                                )}`
                              : 'Year not recorded'}
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: '10px',
                            color: '#16a34a',
                            fontWeight: 'bold',
                            alignSelf: 'flex-start'
                          }}
                        >
                          ONLINE
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

        {/* ANNOUNCEMENTS */}
        <div
          className="no-print"
          style={{
            backgroundColor: '#fff',
            borderRadius: '10px',
            border:
              '1px solid #e2e8f0',
            padding: '25px',
            boxShadow:
              '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <h3
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#0f172a',
              marginBottom: '15px'
            }}
          >
            📢 Course Announcements &
            Notices
          </h3>

          {announcements.length ===
          0 ? (
            <div
              style={{
                padding: '15px',
                backgroundColor:
                  '#f8fafc',
                borderRadius: '7px',
                color: '#64748b',
                fontSize: '13px'
              }}
            >
              No current LMS
              announcements.
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection:
                  'column',
                gap: '12px'
              }}
            >
              {announcements.map(
                (announcement, index) => (
                  <div
                    key={`${announcement.date}-${index}`}
                    style={{
                      backgroundColor:
                        '#f8fafc',
                      padding:
                        '12px 16px',
                      borderRadius: '6px',
                      borderLeft:
                        '4px solid #2563eb'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        fontSize: '12px',
                        color: '#64748b',
                        marginBottom:
                          '4px'
                      }}
                    >
                      <strong>
                        {
                          announcement.author
                        }
                      </strong>

                      <span>
                        {
                          announcement.date
                        }
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '14px',
                        color: '#334155'
                      }}
                    >
                      {
                        announcement.text
                      }
                    </div>
                  </div>
                )
              )}
            </div>
          )}

          {activePortal ===
            'lecturer' && (
            <form
              onSubmit={
                handlePostAnnouncement
              }
              style={{
                marginTop: '20px',
                display: 'flex',
                gap: '10px'
              }}
            >
              <input
                type="text"
                placeholder="Type new course announcement for students..."
                value={
                  announcementText
                }
                onChange={(e) =>
                  setAnnouncementText(
                    e.target.value
                  )
                }
                style={{
                  flex: 1,
                  padding:
                    '10px 14px',
                  border:
                    '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                required
              />

              <button
                type="submit"
                style={{
                  backgroundColor:
                    '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding:
                    '10px 20px',
                  borderRadius: '6px',
                  fontWeight:
                    'bold',
                  cursor: 'pointer'
                }}
              >
                Broadcast Notice
              </button>
            </form>
          )}
        </div>

        {/* LECTURER MATERIAL UPLOAD */}
        {activePortal ===
          'lecturer' && (
          <div
            className="no-print"
            style={{
              backgroundColor: '#fff',
              borderRadius: '10px',
              border:
                '1px solid #e2e8f0',
              padding: '25px',
              boxShadow:
                '0 1px 3px rgba(0,0,0,0.05)'
            }}
          >
            <h3
              style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#0f172a',
                marginBottom: '15px'
              }}
            >
              📤 Upload Course Material
            </h3>

            <form
              onSubmit={
                handleFileUpload
              }
              style={{
                display: 'flex',
                gap: '15px',
                alignItems: 'center',
                flexWrap: 'wrap'
              }}
            >
              <select
                value={uploadCourse}
                onChange={(e) =>
                  setUploadCourse(
                    e.target.value
                  )
                }
                style={{
                  padding:
                    '10px 14px',
                  border:
                    '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor:
                    '#fff',
                  color: '#0f172a',
                  fontWeight: '600'
                }}
              >
                {courses.map(
                  (course) => (
                    <option
                      key={
                        course.code
                      }
                      value={
                        course.code
                      }
                    >
                      {course.code} -{' '}
                      {
                        course.title
                      }
                    </option>
                  )
                )}
              </select>

              <select
                value={uploadType}
                onChange={(e) =>
                  setUploadType(
                    e.target.value
                  )
                }
                style={{
                  padding:
                    '10px 14px',
                  border:
                    '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor:
                    '#fff',
                  color: '#0f172a',
                  fontWeight: '600'
                }}
              >
                <option value="PDF Notes">
                  PDF Notes
                </option>
                <option value="Lecture Slides">
                  Lecture Slides
                </option>
                <option value="Lab">
                  Lab Material
                </option>
                <option value="Research">
                  Research Material
                </option>
                <option value="Practical / Industrial Training">
                  Practical /
                  Industrial Training
                </option>
              </select>

              <input
                type="text"
                placeholder="Document Title"
                value={uploadTitle}
                onChange={(e) =>
                  setUploadTitle(
                    e.target.value
                  )
                }
                style={{
                  flex: 1,
                  minWidth:
                    '200px',
                  padding:
                    '10px 14px',
                  border:
                    '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                required
              />

              <button
                type="submit"
                style={{
                  backgroundColor:
                    '#059669',
                  color: '#fff',
                  border: 'none',
                  padding:
                    '10px 20px',
                  borderRadius: '6px',
                  fontWeight:
                    'bold',
                  cursor: 'pointer'
                }}
              >
                Upload Material
              </button>
            </form>
          </div>
        )}

        {/* STUDENT COURSE HUB */}
        {activePortal ===
          'student' && (
          <div
            style={{
              display: 'flex',
              flexDirection:
                'column',
              gap: '25px'
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '18px',
                  fontWeight:
                    'bold',
                  color: '#0f172a',
                  marginBottom:
                    '5px'
                }}
              >
                My Enrolled Courses &
                Learning Materials
              </h2>

              <div
                style={{
                  color: '#64748b',
                  fontSize: '13px'
                }}
              >
                These courses are
                connected to your central
                NexusSIS registration and
                enrolment records.
              </div>
            </div>

            {!currentStudent ? (
              <div
                style={{
                  backgroundColor:
                    '#fff',
                  border:
                    '1px solid #e2e8f0',
                  borderRadius:
                    '10px',
                  padding: '25px',
                  color: '#64748b'
                }}
              >
                Your student profile
                could not be resolved, so
                private student course
                information is not being
                displayed.
              </div>
            ) : courses.length ===
              0 ? (
              <div
                style={{
                  backgroundColor:
                    '#fff',
                  border:
                    '1px solid #e2e8f0',
                  borderRadius:
                    '10px',
                  padding: '25px',
                  color: '#64748b'
                }}
              >
                No courses have been
                assigned to your student
                record yet.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(auto-fit, minmax(400px, 1fr))',
                  gap: '25px'
                }}
              >
                {courses.map(
                  (course) => (
                    <div
                      key={
                        course.code
                      }
                      style={{
                        backgroundColor:
                          '#fff',
                        border:
                          '1px solid #e2e8f0',
                        borderRadius:
                          '10px',
                        padding:
                          '25px',
                        boxShadow:
                          '0 1px 3px rgba(0,0,0,0.05)'
                      }}
                    >
                      <div
                        style={{
                          display:
                            'flex',
                          justifyContent:
                            'space-between',
                          marginBottom:
                            '10px',
                          gap: '10px'
                        }}
                      >
                        <span
                          style={{
                            fontSize:
                              '12px',
                            fontWeight:
                              'bold',
                            backgroundColor:
                              '#e0f2fe',
                            color:
                              '#0369a1',
                            padding:
                              '4px 10px',
                            borderRadius:
                              '12px'
                          }}
                        >
                          {
                            course.code
                          }
                        </span>

                        <span
                          style={{
                            fontSize:
                              '12px',
                            color:
                              '#64748b'
                          }}
                        >
                          {
                            course.schedule
                          }
                        </span>
                      </div>

                      <h3
                        style={{
                          fontSize:
                            '18px',
                          fontWeight:
                            'bold',
                          color:
                            '#0f172a',
                          marginBottom:
                            '6px'
                        }}
                      >
                        {
                          course.title
                        }
                      </h3>

                      <div
                        style={{
                          fontSize:
                            '13px',
                          color:
                            '#475569',
                          marginBottom:
                            '15px'
                        }}
                      >
                        Lecturer:{' '}
                        <strong>
                          {
                            course.lecturer
                          }
                        </strong>
                      </div>

                      <div
                        style={{
                          display:
                            'flex',
                          gap: '8px',
                          marginBottom:
                            '15px'
                        }}
                      >
                        <button
                          onClick={() =>
                            openCourse(
                              course
                            )
                          }
                          style={{
                            backgroundColor:
                              '#0f172a',
                            color:
                              '#fff',
                            border:
                              'none',
                            padding:
                              '7px 12px',
                            borderRadius:
                              '5px',
                            fontSize:
                              '12px',
                            fontWeight:
                              'bold',
                            cursor:
                              'pointer'
                          }}
                        >
                          View Course
                        </button>

                        <button
                          onClick={() => {
                            setSelectedCourse(
                              course
                            );
                            setModal(
                              'research'
                            );
                          }}
                          style={{
                            backgroundColor:
                              '#7c3aed',
                            color:
                              '#fff',
                            border:
                              'none',
                            padding:
                              '7px 12px',
                            borderRadius:
                              '5px',
                            fontSize:
                              '12px',
                            fontWeight:
                              'bold',
                            cursor:
                              'pointer'
                          }}
                        >
                          Research
                        </button>
                      </div>

                      <div
                        style={{
                          borderTop:
                            '1px solid #e2e8f0',
                          paddingTop:
                            '15px',
                          display:
                            'flex',
                          flexDirection:
                            'column',
                          gap: '10px'
                        }}
                      >
                        <div
                          style={{
                            fontSize:
                              '12px',
                            fontWeight:
                              'bold',
                            color:
                              '#0f172a'
                          }}
                        >
                          COURSE MODULES &
                          ASSIGNMENTS
                        </div>

                        {course.modules
                          .length ===
                        0 ? (
                          <div
                            style={{
                              color:
                                '#64748b',
                              fontSize:
                                '13px',
                              padding:
                                '10px'
                            }}
                          >
                            No course
                            materials
                            published
                            yet.
                          </div>
                        ) : (
                          course.modules.map(
                            (
                              module,
                              index
                            ) => (
                              <div
                                key={
                                  index
                                }
                                style={{
                                  display:
                                    'flex',
                                  justifyContent:
                                    'space-between',
                                  alignItems:
                                    'center',
                                  gap: '10px',
                                  backgroundColor:
                                    '#f8fafc',
                                  padding:
                                    '10px 12px',
                                  borderRadius:
                                    '6px',
                                  fontSize:
                                    '13px'
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontWeight:
                                        '600',
                                      color:
                                        '#334155'
                                    }}
                                  >
                                    {
                                      module.name
                                    }
                                  </div>

                                  <div
                                    style={{
                                      fontSize:
                                        '11px',
                                      color:
                                        '#64748b'
                                    }}
                                  >
                                    {
                                      module.type
                                    }{' '}
                                    {module.size
                                      ? `(${module.size})`
                                      : module.due
                                      ? `• Due: ${module.due}`
                                      : ''}
                                  </div>
                                </div>

                                <button
                                  onClick={() => {
                                    if (
                                      module.type ===
                                        'Assignment' ||
                                      module.type ===
                                        'Research' ||
                                      module.type ===
                                        'Practical / Industrial Training'
                                    ) {
                                      openAssignment(
                                        course,
                                        module
                                      );
                                    } else {
                                      alert(
                                        `${module.name} is available for download/viewing.`
                                      );
                                    }
                                  }}
                                  style={{
                                    backgroundColor:
                                      module.type ===
                                      'Research'
                                        ? '#7c3aed'
                                        : '#2563eb',
                                    color:
                                      '#fff',
                                    border:
                                      'none',
                                    padding:
                                      '6px 12px',
                                    borderRadius:
                                      '4px',
                                    fontSize:
                                      '12px',
                                    fontWeight:
                                      'bold',
                                    cursor:
                                      'pointer'
                                  }}
                                >
                                  {module.type ===
                                    'Assignment' ||
                                  module.type ===
                                    'Research' ||
                                  module.type ===
                                    'Practical / Industrial Training'
                                    ? 'Submit Work'
                                    : 'Download'}
                                </button>
                              </div>
                            )
                          )
                        )}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* LECTURER GRADEBOOK */}
        {activePortal ===
          'lecturer' && (
          <>
            <div
              className="no-print"
              style={{
                backgroundColor:
                  '#fff',
                borderRadius:
                  '10px',
                border:
                  '1px solid #e2e8f0',
                padding: '20px',
                display: 'flex',
                justifyContent:
                  'space-between',
                alignItems:
                  'center',
                gap: '15px',
                flexWrap:
                  'wrap'
              }}
            >
              <div>
                <strong
                  style={{
                    color:
                      '#0f172a'
                  }}
                >
                  Academic Integrity
                  Review Queue
                </strong>

                <div
                  style={{
                    fontSize:
                      '13px',
                    color:
                      '#64748b',
                    marginTop:
                      '4px'
                  }}
                >
                  {
                    pendingIntegrityReviews.length
                  }{' '}
                  submission(s) require
                  lecturer review.
                </div>
              </div>

              <button
                onClick={() => {
                  const first =
                    pendingIntegrityReviews[0];

                  if (first) {
                    openIntegrity(
                      first
                    );
                  }
                }}
                style={{
                  backgroundColor:
                    '#7c3aed',
                  color: '#fff',
                  border: 'none',
                  padding:
                    '9px 16px',
                  borderRadius:
                    '6px',
                  fontWeight:
                    'bold',
                  cursor:
                    'pointer'
                }}
              >
                🔎 Review Integrity
                Queue
              </button>
            </div>

            <div
              id="printable-gradebook"
              style={{
                backgroundColor:
                  '#fff',
                borderRadius:
                  '10px',
                border:
                  '1px solid #e2e8f0',
                padding: '30px',
                boxShadow:
                  '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'space-between',
                  alignItems:
                    'center',
                  marginBottom:
                    '20px',
                  gap: '15px',
                  flexWrap:
                    'wrap'
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize:
                        '20px',
                      fontWeight:
                        'bold',
                      color:
                        '#0f172a',
                      marginBottom:
                        '6px'
                    }}
                  >
                    Official Semester
                    Gradebook &
                    Transcript
                    Submissions
                  </h2>

                  <div
                    style={{
                      fontSize:
                        '14px',
                      color:
                        '#64748b'
                    }}
                  >
                    Manage student
                    scores and
                    publish academic
                    results.
                  </div>
                </div>

                <div
                  style={{
                    display:
                      'flex',
                    gap: '10px',
                    alignItems:
                      'center',
                    flexWrap:
                      'wrap'
                  }}
                >
                  <select
                    value={
                      selectedSemesterFilter
                    }
                    onChange={(e) =>
                      setSelectedSemesterFilter(
                        e.target.value
                      )
                    }
                    style={{
                      padding:
                        '8px 12px',
                      border:
                        '1px solid #cbd5e1',
                      borderRadius:
                        '6px',
                      fontSize:
                        '13px',
                      backgroundColor:
                        '#fff',
                      fontWeight:
                        '600',
                      color:
                        '#0f172a'
                    }}
                  >
                    <option value="All">
                      All Semesters
                    </option>

                    <option value="Semester 1, 2026">
                      Semester 1, 2026
                    </option>

                    <option value="Semester 2, 2025">
                      Semester 2, 2025
                    </option>
                  </select>

                  <button
                    onClick={
                      handlePrintGradebook
                    }
                    style={{
                      backgroundColor:
                        '#1e293b',
                      color:
                        '#fff',
                      border:
                        'none',
                      padding:
                        '8px 14px',
                      borderRadius:
                        '6px',
                      fontWeight:
                        'bold',
                      fontSize:
                        '13px',
                      cursor:
                        'pointer'
                    }}
                  >
                    🖨️ Print / Save
                    PDF
                  </button>

                  <button
                    onClick={
                      handleSendToRegistrar
                    }
                    style={{
                      backgroundColor:
                        '#059669',
                      color:
                        '#fff',
                      border:
                        'none',
                      padding:
                        '8px 14px',
                      borderRadius:
                        '6px',
                      fontWeight:
                        'bold',
                      fontSize:
                        '13px',
                      cursor:
                        'pointer'
                    }}
                  >
                    📤 Send to
                    Registrar & HOD
                  </button>
                </div>
              </div>

              <div
                style={{
                  overflowX:
                    'auto',
                  border:
                    '1px solid #e2e8f0',
                  borderRadius:
                    '8px'
                }}
              >
                <table
                  style={{
                    width:
                      '100%',
                    borderCollapse:
                      'collapse',
                    textAlign:
                      'left',
                    fontSize:
                      '14px'
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor:
                          '#f1f5f9',
                        color:
                          '#334155',
                        borderBottom:
                          '1px solid #e2e8f0'
                      }}
                    >
                      <th style={{ padding: '14px 16px' }}>
                        Student ID
                      </th>
                      <th style={{ padding: '14px 16px' }}>
                        Student Name
                      </th>
                      <th style={{ padding: '14px 16px' }}>
                        Program / Year
                      </th>
                      <th style={{ padding: '14px 16px' }}>
                        Course
                      </th>
                      <th style={{ padding: '14px 16px' }}>
                        Semester
                      </th>
                      <th style={{ padding: '14px 16px' }}>
                        Assignment
                      </th>
                      <th style={{ padding: '14px 16px' }}>
                        Exam
                      </th>
                      <th style={{ padding: '14px 16px' }}>
                        Practical
                      </th>
                      <th style={{ padding: '14px 16px' }}>
                        Lab
                      </th>
                      <th style={{ padding: '14px 16px' }}>
                        Final Score
                      </th>
                      <th style={{ padding: '14px 16px' }}>
                        Grade
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredGradebook.map(
                      (row, index) => (
                        <tr
                          key={`${row.idNo}-${row.courseCode}`}
                          style={{
                            borderBottom:
                              '1px solid #e2e8f0',
                            backgroundColor:
                              index %
                                2 ===
                              0
                                ? '#fff'
                                : '#f8fafc'
                          }}
                        >
                          <td
                            style={{
                              padding:
                                '16px',
                              color:
                                '#2563eb',
                              fontWeight:
                                '600'
                            }}
                          >
                            {row.idNo}
                          </td>

                          <td
                            style={{
                              padding:
                                '16px',
                              fontWeight:
                                '600',
                              color:
                                '#0f172a'
                            }}
                          >
                            {
                              row.studentName
                            }
                          </td>

                          <td
                            style={{
                              padding:
                                '16px',
                              color:
                                '#475569',
                              fontSize:
                                '13px'
                            }}
                          >
                            {
                              row.program
                            }{' '}
                            (
                            {
                              row.yearLevel
                            }
                            )
                          </td>

                          <td
                            style={{
                              padding:
                                '16px',
                              fontWeight:
                                '600',
                              color:
                                '#0f172a'
                            }}
                          >
                            {
                              row.courseCode
                            }
                          </td>

                          <td
                            style={{
                              padding:
                                '16px',
                              color:
                                '#0369a1',
                              fontSize:
                                '13px',
                              fontWeight:
                                '600'
                            }}
                          >
                            {
                              row.semester
                            }
                          </td>

                          {(
                            [
                              'assignmentScore',
                              'examScore',
                              'practicalScore',
                              'labScore'
                            ] as const
                          ).map(
                            (field) => (
                              <td
                                key={
                                  field
                                }
                                style={{
                                  padding:
                                    '16px'
                                }}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={
                                    row[
                                      field
                                    ]
                                  }
                                  onChange={(
                                    e
                                  ) =>
                                    handleUpdateScore(
                                      row.idNo,
                                      row.courseCode,
                                      field,
                                      e.target
                                        .value
                                    )
                                  }
                                  style={{
                                    width:
                                      '55px',
                                    padding:
                                      '6px',
                                    border:
                                      '1px solid #cbd5e1',
                                    borderRadius:
                                      '4px',
                                    fontSize:
                                      '13px',
                                    textAlign:
                                      'center'
                                  }}
                                />
                              </td>
                            )
                          )}

                          <td
                            style={{
                              padding:
                                '16px',
                              fontWeight:
                                'bold',
                              color:
                                '#0f172a'
                            }}
                          >
                            {
                              row.finalScore
                            }
                            %
                          </td>

                          <td
                            style={{
                              padding:
                                '16px'
                            }}
                          >
                            <span
                              style={{
                                padding:
                                  '4px 10px',
                                borderRadius:
                                  '12px',
                                fontSize:
                                  '12px',
                                fontWeight:
                                  'bold',
                                backgroundColor:
                                  row.grade.startsWith(
                                    'A'
                                  )
                                    ? '#dcfce7'
                                    : '#e0f2fe',
                                color:
                                  row.grade.startsWith(
                                    'A'
                                  )
                                    ? '#166534'
                                    : '#0369a1'
                              }}
                            >
                              {
                                row.grade
                              }
                            </span>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LECTURER SUBMISSIONS */}
            <div
              className="no-print"
              style={{
                backgroundColor:
                  '#fff',
                borderRadius:
                  '10px',
                border:
                  '1px solid #e2e8f0',
                padding: '25px',
                boxShadow:
                  '0 1px 3px rgba(0,0,0,0.05)'
              }}
            >
              <h2
                style={{
                  fontSize:
                    '18px',
                  fontWeight:
                    'bold',
                  color:
                    '#0f172a',
                  marginBottom:
                    '15px'
                }}
              >
                📚 Student Assignment &
                Research Submissions
              </h2>

              <div
                style={{
                  overflowX:
                    'auto',
                  border:
                    '1px solid #e2e8f0',
                  borderRadius:
                    '8px'
                }}
              >
                <table
                  style={{
                    width:
                      '100%',
                    borderCollapse:
                      'collapse',
                    fontSize:
                      '13px'
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor:
                          '#f1f5f9',
                        color:
                          '#334155'
                      }}
                    >
                      <th
                        style={{
                          padding:
                            '12px',
                          textAlign:
                            'left'
                        }}
                      >
                        Student
                      </th>

                      <th
                        style={{
                          padding:
                            '12px',
                          textAlign:
                            'left'
                        }}
                      >
                        Course
                      </th>

                      <th
                        style={{
                          padding:
                            '12px',
                          textAlign:
                            'left'
                        }}
                      >
                        Assignment
                      </th>

                      <th
                        style={{
                          padding:
                            '12px',
                          textAlign:
                            'left'
                        }}
                      >
                        Originality
                      </th>

                      <th
                        style={{
                          padding:
                            '12px',
                          textAlign:
                            'left'
                        }}
                      >
                        AI Indicator
                      </th>

                      <th
                        style={{
                          padding:
                            '12px',
                          textAlign:
                            'left'
                        }}
                      >
                        Status
                      </th>

                      <th
                        style={{
                          padding:
                            '12px'
                        }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {submissions.map(
                      (submission) => (
                        <tr
                          key={
                            submission.id
                          }
                          style={{
                            borderTop:
                              '1px solid #e2e8f0'
                          }}
                        >
                          <td
                            style={{
                              padding:
                                '12px'
                            }}
                          >
                            <strong>
                              {
                                submission.studentName
                              }
                            </strong>

                            <div
                              style={{
                                color:
                                  '#64748b'
                              }}
                            >
                              {
                                submission.studentId
                              }
                            </div>
                          </td>

                          <td
                            style={{
                              padding:
                                '12px'
                            }}
                          >
                            {
                              submission.courseCode
                            }
                          </td>

                          <td
                            style={{
                              padding:
                                '12px'
                            }}
                          >
                            {
                              submission.assignment
                            }
                          </td>

                          <td
                            style={{
                              padding:
                                '12px',
                              fontWeight:
                                'bold',
                              color:
                                submission.originality >=
                                85
                                  ? '#059669'
                                  : '#d97706'
                            }}
                          >
                            {
                              submission.originality
                            }
                            %
                          </td>

                          <td
                            style={{
                              padding:
                                '12px'
                            }}
                          >
                            <span
                              style={{
                                backgroundColor:
                                  submission.aiIndicator ===
                                  'High'
                                    ? '#fee2e2'
                                    : submission.aiIndicator ===
                                      'Medium'
                                    ? '#fef3c7'
                                    : '#dcfce7',
                                color:
                                  submission.aiIndicator ===
                                  'High'
                                    ? '#991b1b'
                                    : submission.aiIndicator ===
                                      'Medium'
                                    ? '#92400e'
                                    : '#166534',
                                padding:
                                  '4px 8px',
                                borderRadius:
                                  '10px',
                                fontWeight:
                                  'bold'
                              }}
                            >
                              {
                                submission.aiIndicator
                              }
                            </span>
                          </td>

                          <td
                            style={{
                              padding:
                                '12px'
                            }}
                          >
                            {
                              submission.lecturerDecision
                            }
                          </td>

                          <td
                            style={{
                              padding:
                                '12px'
                            }}
                          >
                            <button
                              onClick={() =>
                                openIntegrity(
                                  submission
                                )
                              }
                              style={{
                                backgroundColor:
                                  '#7c3aed',
                                color:
                                  '#fff',
                                border:
                                  'none',
                                padding:
                                  '6px 10px',
                                borderRadius:
                                  '5px',
                                fontWeight:
                                  'bold',
                                cursor:
                                  'pointer'
                              }}
                            >
                              View
                              Integrity
                            </button>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL */}
      {modal && (
        <div
          className="no-print"
          onClick={() =>
            setModal(null)
          }
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor:
              'rgba(15,23,42,0.72)',
            display: 'flex',
            alignItems:
              'center',
            justifyContent:
              'center',
            padding: '20px',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              backgroundColor:
                '#fff',
              width: '100%',
              maxWidth:
                '850px',
              maxHeight:
                '90vh',
              overflowY:
                'auto',
              borderRadius:
                '14px',
              boxShadow:
                '0 25px 50px -12px rgba(0,0,0,0.35)',
              padding: '30px',
              position:
                'relative'
            }}
          >
            <button
              onClick={() =>
                setModal(null)
              }
              style={{
                position:
                  'absolute',
                right: '18px',
                top: '15px',
                border: 'none',
                backgroundColor:
                  '#f1f5f9',
                color:
                  '#334155',
                width: '34px',
                height: '34px',
                borderRadius:
                  '50%',
                cursor:
                  'pointer',
                fontSize:
                  '18px'
              }}
            >
              ×
            </button>

            {/* MY GRADES */}
            {modal ===
              'grades' && (
              <div>
                <h2
                  style={{
                    color:
                      '#0f172a',
                    fontSize:
                      '22px',
                    fontWeight:
                      'bold',
                    marginBottom:
                      '5px'
                  }}
                >
                  📊 My Grades
                </h2>

                <p
                  style={{
                    color:
                      '#64748b',
                    fontSize:
                      '13px',
                    marginBottom:
                      '20px'
                  }}
                >
                  Only grades belonging to
                  your student ID are shown.
                </p>

                <div
                  style={{
                    display:
                      'grid',
                    gridTemplateColumns:
                      'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '12px',
                    marginBottom:
                      '20px'
                  }}
                >
                  <div
                    style={{
                      backgroundColor:
                        '#eff6ff',
                      padding:
                        '15px',
                      borderRadius:
                        '8px'
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          '12px',
                        color:
                          '#64748b'
                      }}
                    >
                      Current Average
                    </div>

                    <strong
                      style={{
                        fontSize:
                          '25px',
                        color:
                          '#2563eb'
                      }}
                    >
                      {
                        studentAverage
                      }%
                    </strong>
                  </div>

                  <div
                    style={{
                      backgroundColor:
                        '#ecfdf5',
                      padding:
                        '15px',
                      borderRadius:
                        '8px'
                    }}
                  >
                    <div
                      style={{
                        fontSize:
                          '12px',
                        color:
                          '#64748b'
                      }}
                    >
                      Courses
                    </div>

                    <strong
                      style={{
                        fontSize:
                          '25px',
                        color:
                          '#059669'
                      }}
                    >
                      {
                        myGrades.length
                      }
                    </strong>
                  </div>
                </div>

                {myGrades.length ===
                0 ? (
                  <div
                    style={{
                      backgroundColor:
                        '#f8fafc',
                      padding:
                        '20px',
                      borderRadius:
                        '8px',
                      color:
                        '#64748b'
                    }}
                  >
                    No grades have been
                    published for your
                    student record yet.
                  </div>
                ) : (
                  myGrades.map(
                    (grade) => (
                      <div
                        key={`${grade.courseCode}-${grade.semester}`}
                        style={{
                          border:
                            '1px solid #e2e8f0',
                          borderRadius:
                            '10px',
                          padding:
                            '18px',
                          marginBottom:
                            '12px'
                        }}
                      >
                        <div
                          style={{
                            display:
                              'flex',
                            justifyContent:
                              'space-between',
                            gap: '15px',
                            flexWrap:
                              'wrap'
                          }}
                        >
                          <div>
                            <strong
                              style={{
                                color:
                                  '#0f172a',
                                fontSize:
                                  '16px'
                              }}
                            >
                              {
                                grade.courseCode
                              }
                            </strong>

                            <div
                              style={{
                                color:
                                  '#64748b',
                                fontSize:
                                  '13px'
                              }}
                            >
                              {
                                grade.semester
                              }
                            </div>
                          </div>

                          <div
                            style={{
                              textAlign:
                                'right'
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  '#059669',
                                fontSize:
                                  '20px'
                              }}
                            >
                              {
                                grade.grade
                              }
                            </strong>

                            <div
                              style={{
                                fontSize:
                                  '12px',
                                color:
                                  '#64748b'
                              }}
                            >
                              {
                                grade.finalScore
                              }%
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              'grid',
                            gridTemplateColumns:
                              'repeat(4, 1fr)',
                            gap: '8px',
                            marginTop:
                              '15px',
                            fontSize:
                              '13px'
                          }}
                        >
                          <div>
                            Assignment:{' '}
                            <strong>
                              {
                                grade.assignmentScore
                              }
                            </strong>
                          </div>

                          <div>
                            Exam:{' '}
                            <strong>
                              {
                                grade.examScore
                              }
                            </strong>
                          </div>

                          <div>
                            Practical:{' '}
                            <strong>
                              {
                                grade.practicalScore
                              }
                            </strong>
                          </div>

                          <div>
                            Lab:{' '}
                            <strong>
                              {
                                grade.labScore
                              }
                            </strong>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop:
                              '15px',
                            backgroundColor:
                              '#f8fafc',
                            padding:
                              '12px',
                            borderRadius:
                              '6px',
                            fontSize:
                              '13px',
                            color:
                              '#475569'
                          }}
                        >
                          <strong>
                            Lecturer
                            Feedback:
                          </strong>{' '}
                          {
                            grade.feedback ||
                            'No feedback published yet.'
                          }
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            )}

            {/* ASSIGNMENT */}
            {modal ===
              'assignment' && (
              <div>
                <h2
                  style={{
                    color:
                      '#0f172a',
                    fontSize:
                      '22px',
                    fontWeight:
                      'bold'
                  }}
                >
                  📝 Assignment
                  Submission
                </h2>

                {selectedAssignment ? (
                  <>
                    <div
                      style={{
                        backgroundColor:
                          '#f8fafc',
                        padding:
                          '15px',
                        borderRadius:
                          '8px',
                        margin:
                          '20px 0'
                      }}
                    >
                      <strong
                        style={{
                          color:
                            '#0f172a'
                        }}
                      >
                        {
                          selectedAssignment.name
                        }
                      </strong>

                      <div
                        style={{
                          fontSize:
                            '13px',
                          color:
                            '#64748b',
                          marginTop:
                            '5px'
                        }}
                      >
                        Course:{' '}
                        {
                          selectedCourse?.code
                        }{' '}
                        -{' '}
                        {
                          selectedCourse?.title
                        }
                      </div>

                      {selectedAssignment.due && (
                        <div
                          style={{
                            fontSize:
                              '13px',
                            color:
                              '#dc2626',
                            marginTop:
                              '5px'
                          }}
                        >
                          Due:{' '}
                          {
                            selectedAssignment.due
                          }
                        </div>
                      )}
                    </div>

                    <label
                      style={{
                        display:
                          'block',
                        fontWeight:
                          'bold',
                        color:
                          '#334155',
                        marginBottom:
                          '8px'
                      }}
                    >
                      Select your work
                    </label>

                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt,.zip"
                      onChange={(e) =>
                        setSubmissionFile(
                          e.target
                            .files?.[0] ||
                            null
                        )
                      }
                      style={{
                        width:
                          '100%',
                        padding:
                          '12px',
                        border:
                          '1px solid #cbd5e1',
                        borderRadius:
                          '7px'
                      }}
                    />

                    {submissionFile && (
                      <div
                        style={{
                          marginTop:
                            '10px',
                          color:
                            '#2563eb',
                          fontSize:
                            '13px'
                        }}
                      >
                        Selected:{' '}
                        {
                          submissionFile.name
                        }
                      </div>
                    )}

                    <div
                      style={{
                        marginTop:
                          '20px',
                        backgroundColor:
                          '#fff7ed',
                        border:
                          '1px solid #fed7aa',
                        borderRadius:
                          '8px',
                        padding:
                          '14px',
                        fontSize:
                          '13px',
                        color:
                          '#9a3412'
                      }}
                    >
                      <strong>
                        Academic Integrity
                        Notice
                      </strong>

                      <div
                        style={{
                          marginTop:
                            '5px'
                        }}
                      >
                        Submitted work may
                        undergo similarity
                        and AI-assistance
                        screening. Screening
                        results are indicators
                        for lecturer review.
                      </div>
                    </div>

                    <button
                      onClick={
                        submitAssignment
                      }
                      style={{
                        marginTop:
                          '20px',
                        width:
                          '100%',
                        backgroundColor:
                          '#2563eb',
                        color:
                          '#fff',
                        border:
                          'none',
                        padding:
                          '13px',
                        borderRadius:
                          '7px',
                        fontWeight:
                          'bold',
                        cursor:
                          'pointer'
                      }}
                    >
                      Submit Assignment
                    </button>

                    {submissionMessage && (
                      <div
                        style={{
                          marginTop:
                            '15px',
                          backgroundColor:
                            '#ecfdf5',
                          color:
                            '#166534',
                          padding:
                            '12px',
                          borderRadius:
                            '7px',
                          fontSize:
                            '13px'
                        }}
                      >
                        {
                          submissionMessage
                        }
                      </div>
                    )}
                  </>
                ) : (
                  <div>
                    <p
                      style={{
                        color:
                          '#64748b'
                      }}
                    >
                      Select an assignment
                      from your course first.
                    </p>

                    {courses
                      .flatMap(
                        (course) =>
                          course.modules
                            .filter(
                              (module) =>
                                module.type ===
                                  'Assignment' ||
                                module.type ===
                                  'Research' ||
                                module.type ===
                                  'Practical / Industrial Training'
                            )
                            .map(
                              (module) => ({
                                course,
                                module
                              })
                            )
                      )
                      .map(
                        ({
                          course,
                          module
                        }) => (
                          <button
                            key={`${course.code}-${module.name}`}
                            onClick={() =>
                              openAssignment(
                                course,
                                module
                              )
                            }
                            style={{
                              display:
                                'block',
                              width:
                                '100%',
                              textAlign:
                                'left',
                              backgroundColor:
                                '#f8fafc',
                              border:
                                '1px solid #e2e8f0',
                              padding:
                                '13px',
                              borderRadius:
                                '7px',
                              marginTop:
                                '8px',
                              cursor:
                                'pointer'
                            }}
                          >
                            <strong
                              style={{
                                color:
                                  '#0f172a'
                              }}
                            >
                              {
                                module.name
                              }
                            </strong>

                            <div
                              style={{
                                fontSize:
                                  '12px',
                                color:
                                  '#64748b'
                              }}
                            >
                              {
                                course.code
                              }{' '}
                              •{' '}
                              {
                                module.type
                              }
                            </div>
                          </button>
                        )
                      )}
                  </div>
                )}
              </div>
            )}

            {/* RESEARCH */}
            {modal ===
              'research' && (
              <div>
                <h2
                  style={{
                    color:
                      '#0f172a',
                    fontSize:
                      '22px',
                    fontWeight:
                      'bold'
                  }}
                >
                  🔬 Research Portal
                </h2>

                <p
                  style={{
                    color:
                      '#64748b',
                    fontSize:
                      '13px',
                    marginBottom:
                      '20px'
                  }}
                >
                  Research topics, resources
                  and research submissions
                  for your enrolled courses.
                </p>

                <div
                  style={{
                    backgroundColor:
                      '#f5f3ff',
                    border:
                      '1px solid #ddd6fe',
                    borderRadius:
                      '9px',
                    padding:
                      '18px',
                    marginBottom:
                      '15px'
                  }}
                >
                  <strong
                    style={{
                      color:
                        '#5b21b6'
                    }}
                  >
                    Research Integrity
                  </strong>

                  <p
                    style={{
                      color:
                        '#6b21a8',
                      fontSize:
                        '13px',
                      marginTop:
                        '7px'
                    }}
                  >
                    Research submissions
                    may be screened for
                    similarity and possible
                    AI-assisted writing
                    indicators before
                    lecturer review.
                  </p>
                </div>

                {courses
                  .flatMap(
                    (course) =>
                      course.modules
                        .filter(
                          (module) =>
                            module.type ===
                            'Research'
                        )
                        .map(
                          (module) => ({
                            course,
                            module
                          })
                        )
                  )
                  .map(
                    ({
                      course,
                      module
                    }) => (
                      <div
                        key={`${course.code}-${module.name}`}
                        style={{
                          border:
                            '1px solid #e2e8f0',
                          borderRadius:
                            '8px',
                          padding:
                            '15px',
                          marginBottom:
                            '10px'
                        }}
                      >
                        <strong
                          style={{
                            color:
                              '#0f172a'
                          }}
                        >
                          {
                            module.name
                          }
                        </strong>

                        <div
                          style={{
                            color:
                              '#64748b',
                            fontSize:
                              '12px',
                            margin:
                              '5px 0 10px'
                          }}
                        >
                          {
                            course.code
                          }{' '}
                          • Lecturer:{' '}
                          {
                            course.lecturer
                          }{' '}
                          • Due:{' '}
                          {
                            module.due ||
                            'Not specified'
                          }
                        </div>

                        <button
                          onClick={() =>
                            openAssignment(
                              course,
                              module
                            )
                          }
                          style={{
                            backgroundColor:
                              '#7c3aed',
                            color:
                              '#fff',
                            border:
                              'none',
                            padding:
                              '7px 12px',
                            borderRadius:
                              '5px',
                            fontWeight:
                              'bold',
                            cursor:
                              'pointer'
                          }}
                        >
                          Submit Research
                        </button>
                      </div>
                    )
                  )}
              </div>
            )}

            {/* COURSE */}
            {modal ===
              'course' &&
              selectedCourse && (
                <div>
                  <h2
                    style={{
                      color:
                        '#0f172a',
                      fontSize:
                        '22px',
                      fontWeight:
                        'bold'
                    }}
                  >
                    {
                      selectedCourse.code
                    }{' '}
                    -{' '}
                    {
                      selectedCourse.title
                    }
                  </h2>

                  <div
                    style={{
                      color:
                        '#64748b',
                      fontSize:
                        '13px',
                      margin:
                        '8px 0 20px'
                    }}
                  >
                    Lecturer:{' '}
                    {
                      selectedCourse.lecturer
                    }{' '}
                    •{' '}
                    {
                      selectedCourse.schedule
                    }
                  </div>

                  {selectedCourse.modules.map(
                    (
                      module,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        style={{
                          padding:
                            '14px',
                          border:
                            '1px solid #e2e8f0',
                          borderRadius:
                            '8px',
                          marginBottom:
                            '8px',
                          display:
                            'flex',
                          justifyContent:
                            'space-between',
                          alignItems:
                            'center',
                          gap: '10px'
                        }}
                      >
                        <div>
                          <strong
                            style={{
                              color:
                                '#0f172a'
                            }}
                          >
                            {
                              module.name
                            }
                          </strong>

                          <div
                            style={{
                              fontSize:
                                '12px',
                              color:
                                '#64748b'
                            }}
                          >
                            {
                              module.type
                            }
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            module.type ===
                              'Assignment' ||
                            module.type ===
                              'Research' ||
                            module.type ===
                              'Practical / Industrial Training'
                              ? openAssignment(
                                  selectedCourse,
                                  module
                                )
                              : alert(
                                  `Opening ${module.name}`
                                )
                          }
                          style={{
                            backgroundColor:
                              '#2563eb',
                            color:
                              '#fff',
                            border:
                              'none',
                            padding:
                              '7px 12px',
                            borderRadius:
                              '5px',
                            fontSize:
                              '12px',
                            fontWeight:
                              'bold',
                            cursor:
                              'pointer'
                          }}
                        >
                          {module.type ===
                            'Assignment' ||
                          module.type ===
                            'Research'
                            ? 'Open'
                            : 'View'}
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}

            {/* INTEGRITY */}
            {modal ===
              'integrity' &&
              selectedSubmission && (
                <div>
                  <h2
                    style={{
                      color:
                        '#0f172a',
                      fontSize:
                        '22px',
                      fontWeight:
                        'bold'
                    }}
                  >
                    🔎 Academic Integrity
                    Report
                  </h2>

                  <div
                    style={{
                      color:
                        '#64748b',
                      fontSize:
                        '13px',
                      marginTop:
                        '5px',
                      marginBottom:
                        '20px'
                    }}
                  >
                    Lecturer review for{' '}
                    <strong>
                      {
                        selectedSubmission.studentName
                      }
                    </strong>
                  </div>

                  <div
                    style={{
                      display:
                        'grid',
                      gridTemplateColumns:
                        'repeat(auto-fit, minmax(150px, 1fr))',
                      gap: '12px'
                    }}
                  >
                    <div
                      style={{
                        backgroundColor:
                          '#ecfdf5',
                        padding:
                          '18px',
                        borderRadius:
                          '8px'
                      }}
                    >
                      <div
                        style={{
                          fontSize:
                            '12px',
                          color:
                            '#64748b'
                        }}
                      >
                        Originality
                      </div>

                      <strong
                        style={{
                          fontSize:
                            '26px',
                          color:
                            '#059669'
                        }}
                      >
                        {
                          selectedSubmission.originality
                        }%
                      </strong>
                    </div>

                    <div
                      style={{
                        backgroundColor:
                          '#eff6ff',
                        padding:
                          '18px',
                        borderRadius:
                          '8px'
                      }}
                    >
                      <div
                        style={{
                          fontSize:
                            '12px',
                          color:
                            '#64748b'
                        }}
                      >
                        Similarity
                      </div>

                      <strong
                        style={{
                          fontSize:
                            '26px',
                          color:
                            '#2563eb'
                        }}
                      >
                        {
                          selectedSubmission.similarity
                        }%
                      </strong>
                    </div>

                    <div
                      style={{
                        backgroundColor:
                          '#fef3c7',
                        padding:
                          '18px',
                        borderRadius:
                          '8px'
                      }}
                    >
                      <div
                        style={{
                          fontSize:
                            '12px',
                          color:
                            '#64748b'
                        }}
                      >
                        AI-Assistance
                        Indicator
                      </div>

                      <strong
                        style={{
                          fontSize:
                            '20px',
                          color:
                            '#92400e'
                        }}
                      >
                        {
                          selectedSubmission.aiIndicator
                        }
                      </strong>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop:
                        '18px',
                      padding:
                        '15px',
                      backgroundColor:
                        '#f8fafc',
                      borderRadius:
                        '8px'
                    }}
                  >
                    <strong
                      style={{
                        color:
                          '#0f172a'
                      }}
                    >
                      Screening Result
                    </strong>

                    <div
                      style={{
                        marginTop:
                          '6px',
                        color:
                          '#475569',
                        fontSize:
                          '13px'
                      }}
                    >
                      {integrityLabel(
                        selectedSubmission
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop:
                        '15px',
                      border:
                        '1px solid #fed7aa',
                      backgroundColor:
                        '#fff7ed',
                      padding:
                        '15px',
                      borderRadius:
                        '8px',
                      fontSize:
                        '13px',
                      color:
                        '#9a3412'
                    }}
                  >
                    <strong>
                      Important:
                    </strong>{' '}
                    AI indicators and
                    similarity measurements
                    are screening signals and
                    should be reviewed by the
                    lecturer before academic
                    action.
                  </div>

                  <div
                    style={{
                      marginTop:
                        '15px',
                      fontSize:
                        '13px',
                      color:
                        '#475569'
                    }}
                  >
                    <strong>
                      File:
                    </strong>{' '}
                    {
                      selectedSubmission.fileName
                    }
                    <br />

                    <strong>
                      Submitted:
                    </strong>{' '}
                    {
                      selectedSubmission.submittedAt
                    }
                    <br />

                    <strong>
                      Current Decision:
                    </strong>{' '}
                    {
                      selectedSubmission.lecturerDecision
                    }
                  </div>

                  <div
                    style={{
                      marginTop:
                        '20px',
                      display:
                        'flex',
                      gap: '10px',
                      flexWrap:
                        'wrap'
                    }}
                  >
                    <button
                      onClick={() =>
                        runIntegrityScreening(
                          selectedSubmission.id
                        )
                      }
                      style={{
                        backgroundColor:
                          '#7c3aed',
                        color:
                          '#fff',
                        border:
                          'none',
                        padding:
                          '10px 15px',
                        borderRadius:
                          '6px',
                        fontWeight:
                          'bold',
                        cursor:
                          'pointer'
                      }}
                    >
                      🔍 Run / Refresh
                      Screening
                    </button>

                    <button
                      onClick={() =>
                        acceptSubmission(
                          selectedSubmission.id
                        )
                      }
                      style={{
                        backgroundColor:
                          '#059669',
                        color:
                          '#fff',
                        border:
                          'none',
                        padding:
                          '10px 15px',
                        borderRadius:
                          '6px',
                        fontWeight:
                          'bold',
                        cursor:
                          'pointer'
                      }}
                    >
                      ✓ Accept After
                      Review
                    </button>
                  </div>

                  <div
                    style={{
                      marginTop:
                        '15px',
                      backgroundColor:
                        '#f1f5f9',
                      padding:
                        '12px',
                      borderRadius:
                        '7px',
                      fontSize:
                        '13px',
                      color:
                        '#475569'
                    }}
                  >
                    <strong>
                      Lecturer Feedback:
                    </strong>{' '}
                    {
                      selectedSubmission.feedback
                    }
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
    

      {showLogoutConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor:
              'rgba(15, 23, 42, 0.60)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            style={{
              width: '100%',
              maxWidth: '430px',
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '28px',
              boxShadow:
                '0 25px 70px rgba(0,0,0,0.30)',
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '50%',
                backgroundColor: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '16px',
              }}
            >
              ⚠️
            </div>

            <h2
              id="logout-dialog-title"
              style={{
                margin: 0,
                color: '#0f172a',
                fontSize: '21px',
                fontWeight: 800,
              }}
            >
              Logout of LMS?
            </h2>

            <p
              style={{
                marginTop: '10px',
                marginBottom: '24px',
                color: '#64748b',
                fontSize: '14px',
                lineHeight: 1.65,
              }}
            >
              Are you sure you want to logout?
              You will need to sign in again to
              access your courses, assignments,
              materials, grades and other LMS
              activities.
            </p>

            <div
              style={{
                display: 'flex',
                gap: '10px',
                justifyContent: 'flex-end',
                flexWrap: 'wrap',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setShowLogoutConfirm(false)
                }
                style={{
                  border:
                    '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={performLogout}
                style={{
                  border: 'none',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      )}

</div>
  );
}
