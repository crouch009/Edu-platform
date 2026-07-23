import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsArray } from 'class-validator';

export enum RoleEnum {
  owner = 'owner',
  teacher = 'teacher',
  parent = 'parent',
}

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsEnum(RoleEnum)
  role: RoleEnum;

  @IsOptional()
  @IsString()
  phone?: string;

  /** Only meaningful when role = teacher: subjects to create for them right away */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subjectNames?: string[];

  /** Only meaningful when role = teacher: grade stages they teach (e.g. "ابتدائي", "إعدادي") */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stages?: string[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(RoleEnum)
  role?: RoleEnum;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stages?: string[];

  @IsOptional()
  @IsEnum(['active', 'suspended'])
  status?: 'active' | 'suspended';
}
