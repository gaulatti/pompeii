export type AuthorizationDecision = {
  allowed: boolean;
  reason:
    | 'ALLOW'
    | 'DENY_UNKNOWN_USER'
    | 'DENY_INACTIVE_USER'
    | 'DENY_NO_PERMISSION';
  permissions: string[];
  roles: string[];
};
