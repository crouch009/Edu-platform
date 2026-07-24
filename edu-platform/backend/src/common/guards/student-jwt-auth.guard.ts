import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Students authenticate with a separate, lighter JWT (role: 'student') that
 * carries their studentId/teacherId/schoolId instead of a staff user id.
 * This guard validates that token shape specifically.
 */
@Injectable()
export class StudentJwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('لا يوجد توكن مصادقة');
    }
    const token = authHeader.split(' ')[1];
    try {
      const payload = this.jwt.verify(token);
      if (payload.role !== 'student') {
        throw new UnauthorizedException('توكن غير صالح لهذا المسار');
      }
      request.student = {
        sub: payload.sub,
        schoolId: payload.schoolId,
        teacherId: payload.teacherId,
      };
      return true;
    } catch {
      throw new UnauthorizedException('توكن غير صالح أو منتهي الصلاحية');
    }
  }
}
