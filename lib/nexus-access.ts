"use client";

export type NexusRole =
  | "Student"
  | "Lecturer"
  | "Registrar"
  | "University Admin"
  | "ICT"
  | "Super Administrator"
  | "Administration"
  | "Bursar"
  | "Librarian"
  | "Cafeteria"
  | "Staff"
  | string;

export interface NexusSession {
  username: string;
  fullName?: string;
  role: NexusRole;
  accountType?: string;
  linkedId?: string;
  permissions?: string[];
  loginAt?: number;
  expiresAt?: number;
}

const SESSION_KEY = "nexussis_session";
const ROLE_KEY = "nexus_role";
const USERNAME_KEY = "nexus_username";
const LEGACY_SESSION_KEY = "userSession";

function safeParse(value: string | null): any {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/**
 * Reads the current NEXUS SIS session.
 *
 * The application has historically used both:
 *   nexussis_session
 *   userSession
 *
 * This function accepts either format so existing login pages
 * do not suddenly become invalid.
 */
export function getCurrentSession(): NexusSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const primary = safeParse(localStorage.getItem(SESSION_KEY));
  const legacy = safeParse(localStorage.getItem(LEGACY_SESSION_KEY));

  let session = primary || legacy;

  if (!session) {
    return null;
  }

  /*
   * Some older login code stores the username/role separately.
   * Restore those values when they are missing from the session object.
   */
  const storedUsername =
    localStorage.getItem(USERNAME_KEY) ||
    session.username ||
    session.userName ||
    session.email ||
    "";

  const storedRole =
    localStorage.getItem(ROLE_KEY) ||
    session.role ||
    session.accountType ||
    "";

  if (!storedUsername || !storedRole) {
    return null;
  }

  const normalized: NexusSession = {
    ...session,
    username: storedUsername,
    role: storedRole,
  };

  return normalized;
}

/**
 * Checks whether a session is usable.
 *
 * IMPORTANT:
 * Do not require expiresAt because older accounts/sessions
 * may not have that property.
 */
export function isSessionValid(
  session: NexusSession | null
): boolean {
  if (!session) {
    return false;
  }

  if (!session.username) {
    return false;
  }

  if (!session.role) {
    return false;
  }

  /*
   * Only reject an expired session when expiresAt actually exists.
   */
  if (
    typeof session.expiresAt === "number" &&
    session.expiresAt > 0 &&
    Date.now() >= session.expiresAt
  ) {
    return false;
  }

  return true;
}

/**
 * Store a login session.
 *
 * This keeps all authentication keys synchronized so the
 * page guards and older pages can all recognize the login.
 */
export function setNexusSession(session: NexusSession): void {
  if (typeof window === "undefined") {
    return;
  }

  const completeSession: NexusSession = {
    ...session,
    loginAt: session.loginAt || Date.now(),
  };

  localStorage.setItem(
    SESSION_KEY,
    JSON.stringify(completeSession)
  );

  localStorage.setItem(
    LEGACY_SESSION_KEY,
    JSON.stringify(completeSession)
  );

  localStorage.setItem(
    USERNAME_KEY,
    completeSession.username
  );

  localStorage.setItem(
    ROLE_KEY,
    completeSession.role
  );
}

/**
 * Determines whether the logged-in user has permission to
 * enter a protected area.
 *
 * If no allowedRoles are supplied, any valid logged-in user
 * may enter the page.
 */
export function hasNexusAccess(
  session: NexusSession | null,
  allowedRoles?: string[]
): boolean {
  if (!isSessionValid(session)) {
    return false;
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const userRole = String(session!.role).trim().toLowerCase();

  return allowedRoles.some(
    (role) =>
      String(role).trim().toLowerCase() === userRole
  );
}

/**
 * Protect a page.
 *
 * Returns the valid session when access is allowed.
 * Returns null when access should be denied.
 *
 * NOTE:
 * This function does NOT automatically send users to
 * /dashboard. That behavior was causing valid page visits
 * to bounce back to the dashboard.
 */
export function protectNexusPage(
  allowedRoles?: string[]
): NexusSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const session = getCurrentSession();

  if (!hasNexusAccess(session, allowedRoles)) {
    return null;
  }

  return session;
}

/**
 * Redirect an unauthenticated user to the main login/dashboard.
 */
export function redirectToNexusLogin(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.location.href = "/dashboard";
}

/**
 * Clear all known NEXUS SIS authentication keys.
 */
export function clearNexusSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USERNAME_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);

  /*
   * Older versions of the application used these names.
   */
  localStorage.removeItem("currentUser");
  localStorage.removeItem("username");
  localStorage.removeItem("user");
  localStorage.removeItem("staffName");
  localStorage.removeItem("name");
  localStorage.removeItem("fullName");
}

/**
 * Removes expired session data without destroying a valid login.
 */
export function clearExpiredNexusSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  const session = getCurrentSession();

  if (!session) {
    return;
  }

  if (
    typeof session.expiresAt === "number" &&
    session.expiresAt > 0 &&
    Date.now() >= session.expiresAt
  ) {
    clearNexusSession();
  }
}
