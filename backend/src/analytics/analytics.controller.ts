import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('owner')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('reports-over-time')
  reportsOverTime(@CurrentUser() user: any) {
    return this.analyticsService.reportsOverTime(user.schoolId);
  }

  @Get('teacher-activity')
  teacherActivity(@CurrentUser() user: any) {
    return this.analyticsService.teacherActivity(user.schoolId);
  }

  @Get('storage-growth')
  storageGrowth(@CurrentUser() user: any) {
    return this.analyticsService.storageGrowth(user.schoolId);
  }

  @Get('report-status')
  reportStatusBreakdown(@CurrentUser() user: any) {
    return this.analyticsService.reportStatusBreakdown(user.schoolId);
  }
}
