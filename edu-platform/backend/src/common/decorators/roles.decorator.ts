import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: ('owner' | 'teacher' | 'parent')[]) => SetMetadata(ROLES_KEY, roles);
