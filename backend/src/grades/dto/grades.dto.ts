import { IsString, IsNumber, IsEnum, IsOptional, IsDateString, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSubjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  teacherId?: string; // required only when an owner creates it; teachers default to themselves
}

export enum AssessmentTypeEnum {
  exam = 'exam',
  quiz = 'quiz',
  homework = 'homework',
  participation = 'participation',
}

export class CreateAssessmentDto {
  @IsString()
  title: string;

  @IsEnum(AssessmentTypeEnum)
  type: AssessmentTypeEnum;

  @IsNumber()
  @Min(1)
  maxScore: number;

  @IsDateString()
  date: string;
}

export class GradeEntryDto {
  @IsString()
  studentId: string;

  @IsNumber()
  @Min(0)
  score: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class SubmitGradesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GradeEntryDto)
  grades: GradeEntryDto[];
}
