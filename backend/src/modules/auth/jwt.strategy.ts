import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from '../../common/interfaces/authenticated-user.interface';
import type { Request } from 'express';
import { SubscriptionStatus } from '../../common/enums/domain.enums';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ACCESS_SECRET') ?? '',
      passReqToCallback: true,
    });
  }

  async validate(request: Request, payload: AuthenticatedUser): Promise<Record<string, unknown>> {
    const user = await this.authService.validateJwtUser(payload.sub, payload.businessId ?? undefined);
    if (!user) {
      throw new UnauthorizedException();
    }
    await this.enforceSubscriptionAccess(request, user);
    return user as Record<string, unknown>;
  }

  private async enforceSubscriptionAccess(request: Request, user: Record<string, unknown>): Promise<void> {
    const roleName = String((user.role as { name?: string } | undefined)?.name ?? '').trim().toLowerCase();
    const businessId = String(user.businessId ?? '').trim();
    const path = this.resolvePath(request);

    if (!businessId || roleName === 'platform administrator') {
      return;
    }

    if (this.isExemptPath(path)) {
      return;
    }

    const access = await this.authService.getBusinessSubscriptionAccess(businessId);
    if (!access.needsSubscription) {
      return;
    }

    throw new ForbiddenException({
      message: 'Subscription Required',
      subscriptionStatus: access.status ?? SubscriptionStatus.EXPIRED,
      redirect: '/subscription-control',
    });
  }

  private resolvePath(request: Request): string {
    return String(request.originalUrl || request.url || '')
      .split('?')[0]
      .replace(/^\/api/, '');
  }

  private isExemptPath(path: string): boolean {
    return (
      path.startsWith('/auth/me') ||
      path.startsWith('/auth/logout') ||
      path.startsWith('/auth/change-password') ||
      path.startsWith('/subscriptions')
    );
  }
}
