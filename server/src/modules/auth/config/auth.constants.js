export const COMMUNITY_MEMBER = 'COMMUNITY_MEMBER';
export const PARK_MANAGER = 'PARK_MANAGER';
export const PARK_RANGER = 'PARK_RANGER';

export const USER_ROLES = Object.freeze([
  COMMUNITY_MEMBER,
  PARK_MANAGER,
  PARK_RANGER,
]);

export const PENDING = 'PENDING';
export const APPROVED = 'APPROVED';
export const REJECTED = 'REJECTED';

export const APPROVAL_STATUSES = Object.freeze([
  PENDING,
  APPROVED,
  REJECTED,
]);

export const AUTH_TOKEN_COOKIE = 'wildguard.token';