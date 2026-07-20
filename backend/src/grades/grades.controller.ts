import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { SubjectOwnershipGuard } from '../common/guards/subject-ownership.guard';
import { StudentOwnershipGuard } from '../common/guards/student-ownership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GradesService } from './grades.service';
import { CreateSubjectDto, CreateAssessmentDto, SubmitGradesDto } from './dto/grades.dto';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradesController {
  constructor(private gradesService: GradesService) {}

  // ---------- Subjects ----------

  @Get('subjects')
  findSubjects(@CurrentUser() user: any) {
    return this.gradesService.findSubjectsForUser(user.sub, user.role, user.schoolId);
  }

  @Post('subjects')
  @Roles('owner', 'teacher')
  createSubject(@Body() dto: CreateSubjectDto, @CurrentUser() user: any) {
    return this.gradesService.createSubject(dto, user.sub, user.schoolId, user.role);
  }

  @Delete('subjects/:subjectId')
  @Roles('owner', 'teacher')
  @UseGuards(SubjectOwnershipGuard)
  removeSubject(@Param('subjectId') subjectId: string, @CurrentUser() user: any) {
    return this.gradesService.removeSubject(subjectId, user.sub);
  }

  // ---------- Assessments ----------

  @Get('subjects/:subjectId/assessments')
  @UseGuards(SubjectOwnershipGuard)
  findAssessments(@Param('subjectId') subjectId: string) {
    return this.gradesService.findAssessmentsForSubject(subjectId);
  }

  @Post('subjects/:subjectId/assessments')
  @Roles('owner', 'teacher')
  @UseGuards(SubjectOwnershipGuard)
  createAssessment(@Param('subjectId') subjectId: string, @Body() dto: CreateAssessmentDto, @CurrentUser() user: any) {
    return this.gradesService.createAssessment(subjectId, dto, user.sub, user.schoolId);
  }

  @Delete('assessments/:assessmentId')
  @Roles('owner', 'teacher')
  @UseGuards(SubjectOwnershipGuard)
  removeAssessment(@Param('assessmentId') assessmentId: string, @CurrentUser() user: any) {
    return this.gradesService.removeAssessment(assessmentId, user.sub);
  }

  // ---------- Grades ----------

  @Post('assessments/:assessmentId/grades')
  @Roles('owner', 'teacher')
  @UseGuards(SubjectOwnershipGuard)
  submitGrades(@Param('assessmentId') assessmentId: string, @Body() dto: SubmitGradesDto, @CurrentUser() user: any) {
    return this.gradesService.submitGrades(assessmentId, dto, user.sub);
  }

  @Get('students/:studentId/grades')
  @UseGuards(StudentOwnershipGuard)
  getStudentGrades(@Param('studentId') studentId: string) {
    return this.gradesService.getStudentGrades(studentId);
  }
}
