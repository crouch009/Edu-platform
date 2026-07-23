import { IsString, IsNumber, IsEnum, IsOptional, IsArray, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCurriculumDto {
  @IsString()
  title: string;

  @IsString()
  text: string;
}

export enum QuestionTypeEnum {
  mcq = 'mcq',
  truefalse = 'truefalse',
  short = 'short',
}

export class CreateQuestionDto {
  @IsEnum(QuestionTypeEnum)
  type: QuestionTypeEnum;

  @IsString()
  text: string;

  @IsOptional()
  @IsArray()
  options?: string[];

  @IsString()
  correctAnswer: string;

  @IsOptional()
  @IsString()
  curriculumId?: string;
}

export class GenerateQuestionsDto {
  @IsString()
  curriculumTitle: string;

  @IsString()
  curriculumText: string;

  @IsNumber()
  @Min(1)
  @Max(30)
  count: number;

  @IsOptional()
  @IsEnum(['سهل', 'متوسط', 'صعب'])
  difficulty?: string;
}

export class CreateExamDto {
  @IsString()
  title: string;

  @IsNumber()
  @Min(1)
  duration: number;

  @IsArray()
  @IsString({ each: true })
  questionIds: string[];

  @IsOptional()
  shuffleQuestions?: boolean;

  @IsOptional()
  allowRetake?: boolean;
}

export class StudentAnswerDto {
  @IsString()
  questionId: string;

  @IsString()
  answer: string;
}

export class SubmitExamDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAnswerDto)
  answers: StudentAnswerDto[];
}

export class SetStudentCredentialsDto {
  @IsString()
  email: string;

  @IsString()
  password: string;
}
