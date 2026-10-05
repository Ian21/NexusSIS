'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type AccountType = 'Student' | 'Staff' | 'Administrator';

type UserAccount = {
  id: string;
  username: string;
  fullName: string;
  accountType: AccountType;
  linkedId: string;
  email: string;
  role: string;
  status: 'Active' | 'Suspended' | 'Locked';
  lastLogin: string;
  createdDate: string;
  password?: string;
  credentialStatus?: 'Temporary' | 'Active';
};

type Role = {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  status: 'Active' | 'Inactive';
};

type Credential = {
  username: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

type SystemConfiguration = {
  universityName?: string;
  code?: string;
  academicYear?: string;
  currentSemester?: string;
  registrationOpen?: boolean;
  maintenanceMode?: boolean;
  allowStudentPortal?: boolean;
  allowStaffPortal?: boolean;
  sessionTimeout?: number;
  passwordExpiryDays?: number;
  maxLoginAttempts?: number;
  backupFrequency?: string;
  systemEmail?: string;
};

type LoginSession = {
  username: string;
  fullName: string;
  role: string;
  accountType: AccountType;
  linkedId: string;
  permissions: string[];
  loginAt: string;
  expiresAt: string;
};

type LoginAttempt = {
  username: string;
  attempts: number;
  lockedUntil?: string;
};

type Announcement = {
  id: string;
  title: string;
  message: string;
  publishDate: string;
  expiryDate: string;
  status: 'Published' | 'Unpublished';
  postedBy: string;
  department: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE = {
  users: 'nexusSIS_ict_users',
  roles: 'nexusSIS_ict_roles',
  credentials: 'nexusSIS_ict_credentials',
  config: 'nexusSIS_system_configuration',
  audit: 'nexusSIS_ict_audit_logs',
  security: 'nexusSIS_ict_security_events',
  attempts: 'nexusSIS_login_attempts',
  session: 'nexussis_session',
  role: 'nexus_role',
  username: 'nexus_username',
  announcements: 'nexusSIS_announcements',
};

const roleRoutes: Record<string, string> = {
  Student: '/lms',
  Lecturer: '/lecturer/portal',
  Registrar: '/admin/registrar',
  'Finance Officer': '/admin/bursary',
  Librarian: '/library/portal',
  'Mess Staff': '/admin/cafeteria',
  'Super Administrator': '/admin/ict',
  'Student Affairs': '/admin/student-affairs',
  'Accommodation Officer': '/admin/accommodation',
  'Clinic Staff': '/admin/clinic',
  'ICT Administrator': '/admin/ict',
};

const roleLabels: Record<string, string> = {
  Student: 'Student Portal Login (LMS)',
  'Finance Officer': 'Bursar Office',
  Librarian: 'Library Portal',
  'Mess Staff': 'Mess / Cafeteria Staff',
  Registrar: 'Registrar Office',
  Lecturer: 'Lecturer Portal',
  'Super Administrator': 'Staff Admin Portal',
};

const legacyRoleAliases: Record<string, string> = {
  Bursar: 'Finance Officer',
  MessStaff: 'Mess Staff',
  Admin: 'Super Administrator',
};

const bgImages = [
  'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=1920&q=80',
  'https://images.unsplash.com/photo-1592280771190-3e2e4d57cbd6?auto=format&fit=crop&w=1920&q=80',
];

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeRole(role: string) {
  return legacyRoleAliases[role] || role;
}

function getRoleRoute(role: string) {
  return roleRoutes[normalizeRole(role)] || '/admin/ict';
}

function getRoleLabel(role: string) {
  const normalized = normalizeRole(role);
  return roleLabels[normalized] || `${normalized} Portal`;
}

async function hashPassword(password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function recordSecurityEvent(
  username: string,
  event: string,
  details: string
) {
  try {
    const events = readJson<
      Array<{
        id: string;
        username: string;
        event: string;
        details: string;
        timestamp: string;
      }>
    >(STORAGE.security, []);

    events.unshift({
      id: `SEC-${Date.now()}`,
      username,
      event,
      details,
      timestamp: new Date().toISOString(),
    });

    writeJson(STORAGE.security, events.slice(0, 500));
  } catch {
    // Security logging must never prevent login page rendering.
  }
}

function recordAudit(
  username: string,
  action: string,
  details: string
) {
  try {
    const logs = readJson<
      Array<{
        id: string;
        username: string;
        action: string;
        details: string;
        timestamp: string;
      }>
    >(STORAGE.audit, []);

    logs.unshift({
      id: `AUD-${Date.now()}`,
      username,
      action,
      details,
      timestamp: new Date().toISOString(),
    });

    writeJson(STORAGE.audit, logs.slice(0, 1000));
  } catch {
    // Audit logging must never prevent the dashboard from rendering.
  }
}

function clearKnownSessionKeys() {
  localStorage.removeItem(STORAGE.session);
  localStorage.removeItem(STORAGE.role);
  localStorage.removeItem(STORAGE.username);
  localStorage.removeItem('userSession');
}

function readIctUsers(): UserAccount[] {
  return readJson<UserAccount[]>(STORAGE.users, []);
}

function writeIctUsers(users: UserAccount[]) {
  writeJson(STORAGE.users, users);
}

function findIctUser(identifier: string): UserAccount | null {
  const normalized = String(identifier || '').trim().toLowerCase();

  if (!normalized) return null;

  const users = readIctUsers();

  return (
    users.find(
      (user) =>
        String(user.username || '').trim().toLowerCase() === normalized ||
        String(user.email || '').trim().toLowerCase() === normalized ||
        String(user.linkedId || '').trim().toLowerCase() === normalized,
    ) || null
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Student');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupPasswordConfirm, setSetupPasswordConfirm] = useState('');
  const [setupLoading, setSetupLoading] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [availableRoles, setAvailableRoles] = useState<string[]>([
    'Student',
    'Lecturer',
    'Registrar',
    'Finance Officer',
    'Librarian',
    'Mess Staff',
    'Super Administrator',
  ]);

  const selectedRole = useMemo(() => normalizeRole(role), [role]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBgIndex((prevIndex) => (prevIndex + 1) % bgImages.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadAnnouncements = () => {
      try {
        const stored = readJson<Announcement[]>(
          STORAGE.announcements,
          []
        );

        const now = new Date();

        const activeAnnouncements = stored
          .filter((announcement) => {
            if (announcement.status !== 'Published') {
              return false;
            }

            const publishDate = new Date(
              announcement.publishDate
            );

            const expiryDate = new Date(
              announcement.expiryDate
            );

            return (
              publishDate.getTime() <= now.getTime() &&
              expiryDate.getTime() >= now.getTime()
            );
          })
          .sort(
            (a, b) =>
              new Date(b.publishDate).getTime() -
              new Date(a.publishDate).getTime()
          );

        setAnnouncements(activeAnnouncements);
      } catch {
        setAnnouncements([]);
      }
    };

    loadAnnouncements();

    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === STORAGE.announcements ||
        event.key === null
      ) {
        loadAnnouncements();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    try {
      const ictRoles = readJson<Role[]>(STORAGE.roles, []);

      const activeRoles = ictRoles
        .filter((item) => item.status === 'Active')
        .map((item) => normalizeRole(item.name))
        .filter(Boolean);

      const defaults = [
        'Student',
        'Lecturer',
        'Registrar',
        'Finance Officer',
        'Librarian',
        'Mess Staff',
        'Super Administrator',
      ];

      const merged = Array.from(new Set([...defaults, ...activeRoles]));

      setAvailableRoles(merged);

      if (!merged.includes(normalizeRole(role))) {
        setRole(merged[0] || 'Student');
      }
    } catch {
      // Keep default role list.
    }
  }, [role]);

  const findUser = (enteredUsername: string, enteredRole: string) => {
    const users = readJson<UserAccount[]>(STORAGE.users, []);

    const normalizedUsername = enteredUsername.trim().toLowerCase();
    const normalizedSelectedRole = normalizeRole(enteredRole);

    return users.find((user) => {
      const sameUsername =
        user.username.trim().toLowerCase() === normalizedUsername ||
        user.linkedId.trim().toLowerCase() === normalizedUsername;

      const sameRole =
        normalizeRole(user.role) === normalizedSelectedRole;

      return sameUsername && sameRole;
    });
  };

  const findCredential = (enteredUsername: string) => {
    const credentials = readJson<Credential[]>(STORAGE.credentials, []);
    const normalizedUsername = enteredUsername.trim().toLowerCase();

    return credentials.find(
      (credential) =>
        credential.username.trim().toLowerCase() === normalizedUsername
    );
  };

  const getAttempts = (enteredUsername: string) => {
    const attempts = readJson<LoginAttempt[]>(STORAGE.attempts, []);
    return (
      attempts.find(
        (item) =>
          item.username.trim().toLowerCase() ===
          enteredUsername.trim().toLowerCase()
      ) || {
        username: enteredUsername.trim(),
        attempts: 0,
      }
    );
  };

  const saveAttempts = (record: LoginAttempt) => {
    const attempts = readJson<LoginAttempt[]>(STORAGE.attempts, []);

    const index = attempts.findIndex(
      (item) =>
        item.username.trim().toLowerCase() ===
        record.username.trim().toLowerCase()
    );

    if (index >= 0) {
      attempts[index] = record;
    } else {
      attempts.push(record);
    }

    writeJson(STORAGE.attempts, attempts);
  };

  const resetAttempts = (enteredUsername: string) => {
    const attempts = readJson<LoginAttempt[]>(STORAGE.attempts, []);

    const filtered = attempts.filter(
      (item) =>
        item.username.trim().toLowerCase() !==
        enteredUsername.trim().toLowerCase()
    );

    writeJson(STORAGE.attempts, filtered);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    setError('');
    setInfo('');

    const cleanUsername = username.trim();
    const cleanPassword = password;

    if (!cleanUsername || !cleanPassword) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    try {
      const config = readJson<SystemConfiguration>(
        STORAGE.config,
        {}
      );

      const normalizedRole = normalizeRole(role);
      const user = findUser(cleanUsername, normalizedRole);

      if (!user) {
        recordSecurityEvent(
          cleanUsername,
          'LOGIN_FAILED',
          `No ICT user account matched the supplied username and role: ${normalizedRole}.`
        );

        setError(
          'Invalid username, role, or password. Please check your credentials.'
        );
        return;
      }

      if (user.status !== 'Active') {
        recordSecurityEvent(
          cleanUsername,
          'LOGIN_BLOCKED',
          `Account status is ${user.status}.`
        );

        setError(
          `This account is ${user.status.toLowerCase()} and cannot sign in.`
        );
        return;
      }

      const configuredRole = normalizeRole(user.role);

      if (configuredRole !== normalizedRole) {
        setError(
          `This account is assigned to ${configuredRole}. Please select the correct portal role.`
        );
        return;
      }

      const maxLoginAttempts = Math.max(
        1,
        Number(config.maxLoginAttempts || 5)
      );

      const attemptRecord = getAttempts(cleanUsername);

      if (
        attemptRecord.lockedUntil &&
        new Date(attemptRecord.lockedUntil).getTime() > Date.now()
      ) {
        const lockedUntil = new Date(
          attemptRecord.lockedUntil
        ).toLocaleTimeString();

        setError(
          `This account is temporarily locked because of repeated failed login attempts. Try again after ${lockedUntil}.`
        );

        recordSecurityEvent(
          cleanUsername,
          'LOGIN_BLOCKED',
          'Temporary login lockout is active.'
        );

        return;
      }

      const credential = findCredential(user.username);

      if (!credential) {
        setInfo(
          'This account does not have a password configured yet. Use "Set up password" below to create its first password.'
        );
        setShowPasswordSetup(true);
        return;
      }

      const passwordHash = await hashPassword(cleanPassword);

      if (passwordHash !== credential.passwordHash) {
        const nextAttempts = attemptRecord.attempts + 1;

        if (nextAttempts >= maxLoginAttempts) {
          const lockMinutes = 15;
          const lockedUntil = new Date(
            Date.now() + lockMinutes * 60 * 1000
          ).toISOString();

          saveAttempts({
            username: cleanUsername,
            attempts: nextAttempts,
            lockedUntil,
          });

          recordSecurityEvent(
            cleanUsername,
            'LOGIN_LOCKED',
            `Account temporarily locked after ${nextAttempts} failed attempts.`
          );

          setError(
            `Too many failed attempts. This account is temporarily locked for ${lockMinutes} minutes.`
          );
        } else {
          saveAttempts({
            username: cleanUsername,
            attempts: nextAttempts,
          });

          recordSecurityEvent(
            cleanUsername,
            'LOGIN_FAILED',
            `Invalid password. Attempt ${nextAttempts} of ${maxLoginAttempts}.`
          );

          setError(
            `Invalid username, role, or password. ${Math.max(
              0,
              maxLoginAttempts - nextAttempts
            )} attempt(s) remaining.`
          );
        }

        return;
      }

      if (
        config.maintenanceMode &&
        normalizedRole !== 'Super Administrator'
      ) {
        recordSecurityEvent(
          cleanUsername,
          'LOGIN_BLOCKED',
          'System maintenance mode is enabled.'
        );

        setError(
          'The system is currently in maintenance mode. Only the Super Administrator can sign in.'
        );

        return;
      }

      if (
        user.accountType === 'Student' &&
        config.allowStudentPortal === false
      ) {
        setError('Student Portal access is currently disabled by ICT.');
        return;
      }

      if (
        user.accountType !== 'Student' &&
        config.allowStaffPortal === false
      ) {
        setError('Staff Portal access is currently disabled by ICT.');
        return;
      }

      const ictRoles = readJson<Role[]>(STORAGE.roles, []);
      const matchedRole = ictRoles.find(
        (item) =>
          normalizeRole(item.name) === normalizedRole
      );

      if (matchedRole && matchedRole.status !== 'Active') {
        setError(
          `The ${normalizedRole} role is currently inactive.`
        );
        return;
      }

      const sessionTimeout = Math.max(
        5,
        Number(config.sessionTimeout || 30)
      );

      const loginAt = new Date();
      const expiresAt = new Date(
        loginAt.getTime() + sessionTimeout * 60 * 1000
      );

      const session: LoginSession = {
        username: user.username,
        fullName: user.fullName,
        role: normalizedRole,
        accountType: user.accountType,
        linkedId: user.linkedId,
        permissions: matchedRole?.permissions || [],
        loginAt: loginAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      };

      writeJson(STORAGE.session, session);
      localStorage.setItem(STORAGE.role, normalizedRole);
      localStorage.setItem(STORAGE.username, user.username);

      resetAttempts(cleanUsername);

      const users = readJson<UserAccount[]>(STORAGE.users, []);
      const userIndex = users.findIndex(
        (item) => item.id === user.id
      );

      if (userIndex >= 0) {
        users[userIndex] = {
          ...users[userIndex],
          lastLogin: loginAt.toISOString(),
        };

        writeJson(STORAGE.users, users);
      }

      recordAudit(
        user.username,
        'LOGIN',
        `Successful login as ${normalizedRole}.`
      );

      recordSecurityEvent(
        user.username,
        'LOGIN_SUCCESS',
        `Successful authentication as ${normalizedRole}.`
      );

      router.push(getRoleRoute(normalizedRole));
    } catch (loginError) {
      console.error(loginError);

      recordSecurityEvent(
        cleanUsername,
        'LOGIN_ERROR',
        'Unexpected authentication error.'
      );

      setError(
        'Unable to complete authentication. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetup = async () => {
    setError('');
    setInfo('');

    const pendingUsername =
      localStorage.getItem(
        'nexusSIS_pending_username',
      ) || '';

    const cleanUsername = String(
      pendingUsername || username || '',
    ).trim();

    if (!cleanUsername) {
      setError(
        'Enter your username or Student ID first.',
      );
      return;
    }

    if (setupPassword.length < 8) {
      setError(
        'Password must contain at least 8 characters.',
      );
      return;
    }

    if (setupPassword !== setupPasswordConfirm) {
      setError(
        'The password confirmation does not match.',
      );
      return;
    }

    const user = findIctUser(cleanUsername);

    if (!user) {
      setError(
        'No ICT account was found for that username or Student ID.',
      );
      return;
    }

    if (user.status !== 'Active') {
      setError(
        `This account is ${user.status.toLowerCase()} and cannot set a password.`,
      );
      return;
    }

    const credentialRaw = localStorage.getItem(
      "nexusSIS_ict_credentials",
    )

    let temporaryPasswordHash = ""

    try {
      const credentials = credentialRaw
        ? JSON.parse(credentialRaw)
        : []

      if (Array.isArray(credentials)) {
        const credential = credentials.find(
          (item) =>
            String(item?.username || "")
              .trim()
              .toLowerCase() ===
            String(user.username || "")
              .trim()
              .toLowerCase(),
        )

        temporaryPasswordHash =
          String(credential?.passwordHash || "")
      }
    } catch {
      temporaryPasswordHash = ""
    }

    if (!temporaryPasswordHash) {
      alert(
        "No secure credential record was found for this account. Please contact ICT.",
      )
      return
    }

    const setupPasswordHash =
      await hashPassword(setupPassword)

    if (
      setupPasswordHash ===
      temporaryPasswordHash
    ) {
      setError(
        'Your new password must be different from the temporary password.',
      );
      return;
    }

    setSetupLoading(true);

    try {
      const users = readIctUsers();

      const userIndex = users.findIndex(
        (item) =>
          item.id === user.id ||
          String(item.username || '')
            .trim()
            .toLowerCase() ===
            user.username.trim().toLowerCase(),
      );

      if (userIndex === -1) {
        setError(
          'The ICT account could not be found.',
        );
        setSetupLoading(false);
        return;
      }

      const now = new Date().toISOString();

      const updatedUser: UserAccount = {
        ...users[userIndex],
        credentialStatus: 'Active',
        lastLogin: now,
      };

      const updatedUsers = users.map(
        (item, index) =>
          index === userIndex
            ? updatedUser
            : item,
      );

      writeIctUsers(updatedUsers);

      /*
       * Keep the old credential store synchronized
       * so older modules do not immediately lose
       * compatibility.
       */
      try {
        const passwordHash =
          await hashPassword(setupPassword);

        const credentials =
          readJson<Credential[]>(
            STORAGE.credentials,
            [],
          );

        const existingIndex =
          credentials.findIndex(
            (item) =>
              item.username
                .trim()
                .toLowerCase() ===
              updatedUser.username
                .trim()
                .toLowerCase(),
          );

        const credential: Credential = {
          username: updatedUser.username,
          passwordHash,
          createdAt:
            existingIndex >= 0
              ? credentials[
                  existingIndex
                ].createdAt
              : now,
          updatedAt: now,
        };

        if (existingIndex >= 0) {
          credentials[existingIndex] =
            credential;
        } else {
          credentials.push(credential);
        }

        writeJson(
          STORAGE.credentials,
          credentials,
        );
      } catch {
        /*
         * The ICT account has already been updated.
         * Legacy synchronization must not block login.
         */
      }

      const normalizedRole =
        normalizeRole(updatedUser.role);

      const destination =
        getRoleRoute(normalizedRole);

      const config =
        readJson<SystemConfiguration>(
          STORAGE.config,
          {},
        );

      const timeoutMinutes =
        Number(config.sessionTimeout) > 0
          ? Number(config.sessionTimeout)
          : 60;

      const sessionNow = new Date();

      const session: LoginSession = {
        username: updatedUser.username,
        fullName:
          updatedUser.fullName ||
          updatedUser.username,
        role: normalizedRole,
        accountType:
          updatedUser.accountType,
        linkedId:
          updatedUser.linkedId || '',
        permissions: [],
        loginAt:
          sessionNow.toISOString(),
        expiresAt: new Date(
          sessionNow.getTime() +
            timeoutMinutes *
              60 *
              1000,
        ).toISOString(),
      };

      writeJson(
        STORAGE.session,
        session,
      );

      localStorage.setItem(
        STORAGE.role,
        normalizedRole,
      );

      localStorage.setItem(
        STORAGE.username,
        updatedUser.username,
      );

      localStorage.removeItem(
        'nexusSIS_force_password_change',
      );

      localStorage.removeItem(
        'nexusSIS_pending_user_id',
      );

      localStorage.removeItem(
        'nexusSIS_pending_username',
      );

      recordAudit(
        updatedUser.username,
        'PASSWORD_CHANGED',
        'Temporary account credential changed to a permanent password.',
      );

      recordSecurityEvent(
        updatedUser.username,
        'PASSWORD_CHANGED',
        'Temporary credential successfully replaced.',
      );

      setSetupPassword('');
      setSetupPasswordConfirm('');
      setPassword('');
      setShowPasswordSetup(false);
      setSetupLoading(false);

      setInfo(
        'Password created successfully. Signing you in...',
      );

      router.push(destination);
    } catch {
      setSetupLoading(false);

      setError(
        'Unable to configure the password. Please try again.',
      );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* BACKGROUND SLIDING IMAGES WITH OVERLAY */}
      {bgImages.map((img, idx) => (
        <div
          key={idx}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${img})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: currentBgIndex === idx ? 1 : 0,
            transition: 'opacity 1.5s ease-in-out',
            zIndex: -2,
          }}
        />
      ))}

      {/* DARK OVERLAY TO KEEP TEXT READABLE */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          zIndex: -1,
        }}
      />

      {/* TOP HEADER */}
      <header
        style={{
          backgroundColor: 'rgba(30, 41, 59, 0.9)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #334155',
          padding: '15px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#3b82f6',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '16px',
            }}
          >
            U
          </div>

          <span
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#fff',
              letterSpacing: '0.5px',
            }}
          >
            University Portal
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '20px',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              fontSize: '13px',
              color: '#34d399',
              backgroundColor: '#0f172a',
              padding: '5px 12px',
              borderRadius: '20px',
              border: '1px solid #334155',
              fontWeight: '600',
            }}
          >
            ● System Operational
          </div>
        </div>
      </header>

      {/* MAIN SPLIT CONTAINER */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1.2fr 0.8fr',
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '40px 20px',
          gap: '40px',
          alignItems: 'center',
        }}
      >
        {/* LEFT COLUMN */}
        <div
          style={{
            color: '#fff',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div>
            <span
              style={{
                backgroundColor: 'rgba(59, 130, 246, 0.25)',
                color: '#93c5fd',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: 'bold',
                border: '1px solid rgba(59, 130, 246, 0.4)',
              }}
            >
              📢 Campus Bulletin & News
            </span>

            <h1
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                margin: '15px 0 10px 0',
                lineHeight: '1.2',
              }}
            >
              Welcome to the Academic Information Hub
            </h1>

            <p
              style={{
                fontSize: '14px',
                color: '#cbd5e1',
                lineHeight: '1.5',
                margin: 0,
              }}
            >
              Stay updated with the latest university announcements,
              semester timetables, admissions intake notices, and
              administrative deadlines.
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {announcements.length === 0 ? (
              <div
                style={{
                  backgroundColor: 'rgba(30, 41, 59, 0.9)',
                  backdropFilter: 'blur(6px)',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  padding: '20px 16px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#94a3b8',
                  }}
                >
                  No current university announcements.
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    color: '#64748b',
                    marginTop: '5px',
                  }}
                >
                  New published announcements will appear here.
                </div>
              </div>
            ) : (
              announcements.slice(0, 5).map((announcement, index) => {
                const publishDate = new Date(
                  announcement.publishDate
                );

                const formattedDate = Number.isNaN(
                  publishDate.getTime()
                )
                  ? announcement.publishDate
                  : publishDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    });

                const categoryColors = [
                  '#34d399',
                  '#f59e0b',
                  '#60a5fa',
                  '#c084fc',
                  '#fb7185',
                ];

                return (
                  <div
                    key={announcement.id}
                    style={{
                      backgroundColor: 'rgba(30, 41, 59, 0.9)',
                      backdropFilter: 'blur(6px)',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 'bold',
                          color:
                            categoryColors[
                              index % categoryColors.length
                            ],
                          textTransform: 'uppercase',
                        }}
                      >
                        {announcement.department ||
                          'University Notice'}
                      </span>

                      <span
                        style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formattedDate}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: '14px',
                        fontWeight: 'bold',
                        color: '#fff',
                        margin: '0 0 4px 0',
                      }}
                    >
                      {announcement.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '12px',
                        color: '#cbd5e1',
                        margin: 0,
                        lineHeight: '1.5',
                      }}
                    >
                      {announcement.message}
                    </p>

                    {announcement.postedBy && (
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#64748b',
                          marginTop: '8px',
                        }}
                      >
                        Posted by {announcement.postedBy}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '30px',
            boxShadow: '0 20px 25px rgba(0,0,0,0.3)',
            color: '#0f172a',
          }}
        >
          <div
            style={{
              textAlign: 'center',
              marginBottom: '20px',
            }}
          >
            <span
              style={{
                fontSize: '10px',
                fontWeight: 'bold',
                color: '#2563eb',
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Secure Authentication
            </span>

            <h2
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                margin: '4px 0 4px 0',
              }}
            >
              Sign In to Portal
            </h2>

            <p
              style={{
                fontSize: '12px',
                color: '#64748b',
                margin: 0,
              }}
            >
              Select your role and enter credentials to access your
              workspace
            </p>
          </div>

          {error && (
            <div
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '12px',
                textAlign: 'center',
                fontWeight: '500',
              }}
            >
              {error}
            </div>
          )}

          {info && (
            <div
              style={{
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                padding: '8px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '12px',
                textAlign: 'center',
                fontWeight: '500',
              }}
            >
              {info}
            </div>
          )}

          <form
            onSubmit={handleLogin}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#475569',
                  marginBottom: '4px',
                }}
              >
                Select Portal Login Type *
              </label>

              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setError('');
                  setInfo('');
                }}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#f1f5f9',
                  color: '#0f172a',
                  fontWeight: 'bold',
                  boxSizing: 'border-box',
                }}
              >
                {availableRoles.map((availableRole) => (
                  <option
                    key={availableRole}
                    value={availableRole}
                  >
                    {getRoleLabel(availableRole)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#475569',
                  marginBottom: '4px',
                }}
              >
                {selectedRole === 'Student'
                  ? 'Student ID *'
                  : 'Staff Username / ID *'}
              </label>

              <input
                type="text"
                placeholder={
                  selectedRole === 'Student'
                    ? 'e.g. NXS2600001'
                    : 'e.g. ian.wadidika'
                }
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                disabled={loading}
                autoComplete="username"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#334155',
                  color: '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  color: '#475569',
                  marginBottom: '4px',
                }}
              >
                Password *
              </label>

              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                  setInfo('');
                }}
                disabled={loading}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  backgroundColor: '#334155',
                  color: '#ffffff',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                backgroundColor: loading ? '#6b7280' : '#059669',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                marginTop: '6px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.2)',
              }}
            >
              {loading
                ? 'Authenticating...'
                : `Sign In to ${getRoleLabel(selectedRole)
                    .replace(' Portal Login (LMS)', '')
                    .replace(' Portal Login', '')}`}
            </button>
          </form>

          <div
            style={{
              marginTop: '14px',
              textAlign: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setError('');
                setInfo('');
                setShowPasswordSetup((current) => !current);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '600',
              }}
            >
              {showPasswordSetup
                ? 'Hide password setup'
                : 'First-time account? Set up password'}
            </button>
          </div>

          {showPasswordSetup && (
            <div
              style={{
                marginTop: '12px',
                paddingTop: '14px',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  lineHeight: '1.5',
                  marginBottom: '10px',
                }}
              >
                Password setup is available for an active ICT user
                account that does not yet have a password.
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '9px',
                }}
              >
                <input
                  type="password"
                  placeholder="New password (8+ characters)"
                  value={setupPassword}
                  onChange={(e) =>
                    setSetupPassword(e.target.value)
                  }
                  disabled={setupLoading}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />

                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={setupPasswordConfirm}
                  onChange={(e) =>
                    setSetupPasswordConfirm(e.target.value)
                  }
                  disabled={setupLoading}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    boxSizing: 'border-box',
                  }}
                />

                <button
                  type="button"
                  onClick={handlePasswordSetup}
                  disabled={setupLoading}
                  style={{
                    width: '100%',
                    backgroundColor: setupLoading
                      ? '#94a3b8'
                      : '#2563eb',
                    color: '#fff',
                    border: 'none',
                    padding: '9px',
                    borderRadius: '6px',
                    cursor: setupLoading
                      ? 'not-allowed'
                      : 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px',
                  }}
                >
                  {setupLoading
                    ? 'Saving Password...'
                    : 'Create Account Password'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer
        style={{
          backgroundColor: 'rgba(23, 37, 84, 0.9)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid #334155',
          padding: '20px 40px',
          textAlign: 'center',
          color: '#94a3b8',
          fontSize: '12px',
        }}
      >
        <p style={{ margin: '0 0 4px 0' }}>
          NexusSIS System &copy; 2026. All rights reserved.
        </p>

        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: '#64748b',
          }}
        >
          Licensed and deployed for academic administration.
          Configurable per institutional client branding.
        </p>
      </footer>
    </div>
  );
}
