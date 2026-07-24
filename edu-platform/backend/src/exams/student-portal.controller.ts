import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { StudentJwtAuthGuard } from '../common/guards/student-jwt-auth.guard';
import { CurrentStudent } from '../common/decorators/current-student.decorator';
import { ExamsService } from './exams.service';
import { SubmitExamDto } from './dto/exams.dto';

@Controller('student')
@UseGuards(StudentJwtAuthGuard)
export class StudentPortalController {
  constructor(private examsService: ExamsService) {}

  @Get('exams')
  findExams(@CurrentStudent() student: any) {
    return this.examsService.findExamsForStudent(student.sub, student.teacherId);
  }

  @Get('exams/:examId')
  getExam(@Param('examId') examId: string, @CurrentStudent() student: any) {
    return this.examsService.getExamForTaking(examId, student.teacherId);
  }

  @Post('exams/:examId/submit')
  submitExam(@Param('examId') examId: string, @Body() dto: SubmitExamDto, @CurrentStudent() student: any) {
    return this.examsService.submitExam(examId, dto, student.sub, student.teacherId);
  }
}
