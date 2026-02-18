/**
 * Role display mapping.
 * DB values remain unchanged (super_admin, admin, user).
 * UI labels are renamed per business requirements.
 */
export function getRoleDisplayName(role: string | null | undefined): string {
  switch (role) {
    case 'super_admin':
      return 'Admin';
    case 'admin':
      return 'Event Organizer';
    case 'organizer_admin':
      return 'Event Organizer';
    case 'user':
      return 'User';
    default:
      return role || 'User';
  }
}
