/** Roles that may perform destructive/moderator actions anywhere in the UI. */
export const MODERATOR_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'DEPARTMENT_MANAGER',
  'TEAM_LEAD',
] as const;

export type ModeratorRole = (typeof MODERATOR_ROLES)[number];

export function isModerator(role?: string | null): boolean {
  return MODERATOR_ROLES.includes((role ?? '') as ModeratorRole);
}
