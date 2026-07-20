import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard implements CanActivate {
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
      request.user = { sub: payload.sub, role: payload.role, schoolId: payload.schoolId };
      return true;
    } catch {
      throw new UnauthorizedException('توكن غير صالح أو منتهي الصلاحية');
    }
  }
}
