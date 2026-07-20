import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StudentOwnershipGuard } from '../common/guards/student-ownership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';
import { CreateReportDto, UpdateReportDto } from './dto/reports.dto';

@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, StudentOwnershipGuard)
  @Roles('owner', 'teacher')
  create(@Body() dto: CreateReportDto, @CurrentUser() user: any) {
    return this.reportsService.create(dto, user.sub);
  }

  @Get(':reportId')
  @UseGuards(JwtAuthGuard, RolesGuard, StudentOwnershipGuard)
  findOne(@Param('reportId') reportId: string) {
    return this.reportsService.findOne(reportId);
  }

  @Patch(':reportId')
  @UseGuards(JwtAuthGuard, RolesGuard, StudentOwnershipGuard)
  @Roles('owner', 'teacher')
  update(@Param('reportId') reportId: string, @Body() dto: UpdateReportDto, @CurrentUser() user: any) {
    return this.reportsService.update(reportId, dto, user.sub);
  }

  @Delete(':reportId')
  @UseGuards(JwtAuthGuard, RolesGuard, StudentOwnershipGuard)
  @Roles('owner', 'teacher')
  remove(@Param('reportId') reportId: string, @CurrentUser() user: any) {
    return this.reportsService.remove(reportId, user.sub);
  }

  @Post(':reportId/share-link')
  @UseGuards(JwtAuthGuard, RolesGuard, StudentOwnershipGuard)
  @Roles('owner', 'teacher')
  createShareLink(@Param('reportId') reportId: string, @CurrentUser() user: any) {
    return this.reportsService.createShareLink(reportId, user.sub);
  }

  /** Public endpoint - no JWT required, protected only by the unguessable token + expiry */
  @Get('shared/:token')
  resolveShareLink(@Param('token') token: string) {
    return this.reportsService.resolveShareLink(token);
  }
}
