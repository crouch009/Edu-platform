import {
  Body, Controller, Get, Param, Post, Put, Res, UseGuards, UseInterceptors, UploadedFile, NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PlatformSettingsService } from './platform-settings.service';

@Controller('platform-settings')
export class PlatformSettingsController {
  constructor(private settingsService: PlatformSettingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  get(@CurrentUser() user: any) {
    return this.settingsService.get(user.schoolId);
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  update(@Body('siteName') siteName: string, @CurrentUser() user: any) {
    return this.settingsService.update(user.schoolId, siteName, user.sub);
  }

  @Post('logo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner')
  @UseInterceptors(FileInterceptor('file'))
  uploadLogo(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    return this.settingsService.uploadLogo(user.schoolId, file, user.sub);
  }

  /** Public - used directly as an <img src> in the UI, so no auth guard here */
  @Get('logo/:schoolId')
  async serveLogo(@Param('schoolId') schoolId: string, @Res() res: Response) {
    const settings = await this.settingsService.get(schoolId);
    const s3 = this.settingsService.getS3Client();
    const bucket = this.settingsService.getBucket();
    if (!settings.logoKey || !s3 || !bucket) {
      throw new NotFoundException('لا يوجد لوجو مرفوع');
    }

    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: settings.logoKey }));
    res.setHeader('Content-Type', object.ContentType || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    (object.Body as any).pipe(res);
  }
}
