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
  userPreferences?: UserPreference[];
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};
