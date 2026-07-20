import { IsEmail, IsString, MinLength, IsEnum, IsOptional } from 'class-validator';

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
  @IsEnum(['active', 'suspended'])
  status?: 'active' | 'suspended';
}
