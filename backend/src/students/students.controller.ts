import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StudentOwnershipGuard } from '../common/guards/student-ownership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { StudentsService } from './students.service';
import { CreateStudentDto, UpdateStudentDto } from './dto/students.dto';
import { IsString, IsEmail } from 'class-validator';

class SetStudentCredentialsDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

@Controller('students')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StudentsController {
  constructor(private studentsService: StudentsService) {}

  @Get()
  findAll(@CurrentUser() user: any) {
    return this.studentsService.findAllForUser(user.sub, user.role, user.schoolId);
  }

  @Get(':studentId')
  @UseGuards(StudentOwnershipGuard)
  findOne(@Param('studentId') studentId: string) {
    return this.studentsService.findOne(studentId);
  }

  @Post()
  @Roles('owner', 'teacher')
  create(@Body() dto: CreateStudentDto, @CurrentUser() user: any) {
    return this.studentsService.create(dto, user.sub, user.schoolId);
  }

  @Patch(':studentId')
  @Roles('owner', 'teacher')
  @UseGuards(StudentOwnershipGuard)
  update(@Param('studentId') studentId: string, @Body() dto: UpdateStudentDto, @CurrentUser() user: any) {
    return this.studentsService.update(studentId, dto, user.sub);
  }

  @Delete(':studentId')
  @Roles('owner', 'teacher')
  @UseGuards(StudentOwnershipGuard)
  remove(@Param('studentId') studentId: string, @CurrentUser() user: any) {
    return this.studentsService.remove(studentId, user.sub);
  }

  @Patch(':studentId/login-credentials')
  @Roles('owner', 'teacher')
  @UseGuards(StudentOwnershipGuard)
  setLoginCredentials(
    @Param('studentId') studentId: string,
    @Body() dto: SetStudentCredentialsDto,
    @CurrentUser() user: any,
  ) {
    return this.studentsService.setLoginCredentials(studentId, dto.email, dto.password, user.sub);
  }

  @Post(':studentId/impersonate')
  @Roles('owner')
  impersonate(@Param('studentId') studentId: string, @CurrentUser() user: any) {
    return this.studentsService.impersonate(studentId, user.sub, user.schoolId);
  }

  @Post('generate-credentials')
  @Roles('owner', 'teacher')
  generateCredentials(@CurrentUser() user: any) {
    // Teachers only generate for their own students; owners generate for the whole school
    const teacherId = user.role === 'teacher' ? user.sub : undefined;
    return this.studentsService.generateCredentialsForStudentsWithout(user.schoolId, teacherId, user.sub);
  }
}
