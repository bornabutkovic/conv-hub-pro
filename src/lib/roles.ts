/**
 * Role display mapping.
 * DB values: admin (top-level), event_organizer, organizer_admin, user.
 * Legacy: super_admin is treated the same as admin.
 */

/** Returns true if the user holds a top-level admin role */
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
