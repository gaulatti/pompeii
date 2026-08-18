import { type Membership } from './membership';
import { type UserPreference } from './user_preference';

export type User = {
  id?: string;
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  email: string;
  memberships?: Membership[];
  roleAssignments?: Array<{
    id: number;
    team_id: number | null;
    role?: { id: number; key: string; name: string };
    team?: { id: number; name: string };
  }>;
  userPreferences?: UserPreference[];
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};
