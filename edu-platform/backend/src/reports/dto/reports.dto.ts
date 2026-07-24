import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateReportDto {
  @IsString()
  studentId: string;

  @IsString()
  title: string;

  @IsString()
  content: string;
}

export class UpdateReportDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(['draft', 'published'])
  status?: 'draft' | 'published';
}
