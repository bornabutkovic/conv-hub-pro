/**
 * Role display mapping.
 * DB values: super_admin (global), admin (Penta Admin), event_organizer, organizer_admin, user.
 */

/** Returns true if the user holds the top-level super_admin role (full platform access) */
export function isSuperAdmin(role: string | null | undefined): boolean {
  return role === 'super_admin';
}

/** Returns true for admin-tier roles (super_admin OR admin). Both can approve events, manage users, etc. */
export function isAdmin(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}

/** Returns true if the user holds an elevated (admin or organizer) role */
export function isElevatedRole(role: string | null | undefined): boolean {
  return ['admin', 'super_admin', 'event_organizer', 'organizer_admin'].includes(role || '');
}

export function getRoleDisplayName(role: string | null | undefined): string {
  switch (role) {
    case 'super_admin':
      return 'Super Admin';
    case 'admin':
      return 'Admin';
    case 'event_organizer':
    case 'organizer_admin':
      return 'Event Organizer';
    case 'user':
      return 'User';
    default:
      return role || 'User';
  }
}
