import {
  Controller, Post, Get, Delete, Param, UseGuards, UseInterceptors,
  UploadedFile, ParseFilePipeBuilder,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { StudentOwnershipGuard } from '../common/guards/student-ownership.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FilesService } from './files.service';

@Controller('reports/:reportId/files')
@UseGuards(JwtAuthGuard, RolesGuard, StudentOwnershipGuard)
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post()
  @Roles('owner', 'teacher')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('reportId') reportId: string,
    @UploadedFile(
      new ParseFilePipeBuilder().build({ fileIsRequired: true }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    return this.filesService.uploadReportFile(reportId, file, user.sub);
  }

  @Get(':fileId/download-link')
  getDownloadLink(@Param('fileId') fileId: string, @CurrentUser() user: any) {
    return this.filesService.getTemporaryDownloadUrl(fileId, user.sub);
  }

  @Delete(':fileId')
  @Roles('owner', 'teacher')
  remove(@Param('fileId') fileId: string, @CurrentUser() user: any) {
    return this.filesService.remove(fileId, user.sub);
  }
}
