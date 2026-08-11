import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { AuditAction } from '../../common/enums/domain.enums';

type AuditLogInput = {
  businessId?: string | null;
  userId?: string | null;
  action: AuditAction | string;
  entityName?: string;
  entityId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown> | string | null;
};

type CurrentUserContext = {
  sub?: string;
  businessId?: string | null;
  business?: { id?: string | null } | null;
};

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditLog) private readonly auditLogsRepository: Repository<AuditLog>) {}

  async record(input: AuditLogInput): Promise<AuditLog> {
    return (await this.auditLogsRepository.save(
      this.auditLogsRepository.create({
        businessId: input.businessId ?? undefined,
        userId: input.userId ?? undefined,
        action: input.action,
        entityName: input.entityName,
        entityId: input.entityId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata:
          input.metadata === undefined || input.metadata === null
            ? undefined
            : typeof input.metadata === 'string'
              ? input.metadata
              : JSON.stringify(input.metadata),
      } as any),
    )) as unknown as AuditLog;
  }

  async recordLoginAttempt(input: {
    userId?: string | null;
    businessId?: string | null;
    email?: string;
    success: boolean;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  }): Promise<AuditLog> {
    return this.record({
      businessId: input.businessId,
      userId: input.userId,
      action: input.success ? AuditAction.LOGIN_SUCCESS : AuditAction.LOGIN_FAILED,
      entityName: 'Auth',
      entityId: input.userId ?? input.email,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      metadata: {
        email: input.email,
        success: input.success,
        reason: input.reason,
      },
    });
  }

  async findAll(filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const page = Math.max(Number(filters.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(filters.limit ?? 20), 1), 100);
    const businessId = String(filters.businessId ?? '').trim();
    const userId = String(filters.userId ?? '').trim();
    const action = String(filters.action ?? '').trim();
    const entityName = String(filters.entityName ?? '').trim();
    const search = String(filters.search ?? '').trim();
    const dateFrom = String(filters.dateFrom ?? '').trim();
    const dateTo = String(filters.dateTo ?? '').trim();

    const query = this.auditLogsRepository.createQueryBuilder('audit').leftJoinAndSelect('audit.user', 'user');

    if (businessId) {
      query.andWhere('audit.businessId = :businessId', { businessId });
    }
    if (userId) {
      query.andWhere('audit.userId = :userId', { userId });
    }
    if (action) {
      query.andWhere('audit.action = :action', { action });
    }
    if (entityName) {
      query.andWhere('audit.entityName = :entityName', { entityName });
    }
    if (search) {
      query.andWhere(
        '(audit.action LIKE :search OR audit.entityName LIKE :search OR audit.entityId LIKE :search OR audit.metadata LIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (dateFrom) {
      query.andWhere('audit.createdAt >= :dateFrom', { dateFrom: new Date(dateFrom) });
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      query.andWhere('audit.createdAt < :dateTo', { dateTo: end });
    }

    const [items, total] = await query.orderBy('audit.createdAt', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();
    return {
      items: items.map((log) => this.shapeLog(log)),
      page,
      limit,
      total,
    };
  }

  async summary(filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const logs = await this.findAll({ ...filters, limit: 1000, page: 1 });
    const items = (logs.items as Array<Record<string, unknown>>) ?? [];
    const byAction = items.reduce<Record<string, number>>((acc, log) => {
      const action = String(log.action ?? 'unknown');
      acc[action] = (acc[action] ?? 0) + 1;
      return acc;
    }, {});

    return {
      total: logs.total,
      byAction,
    };
  }

  private shapeLog(log: AuditLog): Record<string, unknown> {
    return {
      id: log.id,
      businessId: log.businessId ?? null,
      userId: log.userId ?? null,
      action: log.action,
      entityName: log.entityName ?? null,
      entityId: log.entityId ?? null,
      ipAddress: log.ipAddress ?? null,
      userAgent: log.userAgent ?? null,
      metadata: this.parseMetadata(log.metadata),
      user: log.user
        ? {
            id: log.user.id,
            fullName: log.user.fullName,
            email: log.user.email,
          }
        : null,
      createdAt: log.createdAt,
    };
  }

  private parseMetadata(metadata?: string | null): Record<string, unknown> | null {
    if (!metadata) {
      return null;
    }
    try {
      return JSON.parse(metadata) as Record<string, unknown>;
    } catch {
      return { raw: metadata };
    }
  }

  resolveBusinessId(currentUser: CurrentUserContext): string | undefined {
    return currentUser.businessId ?? currentUser.business?.id ?? undefined;
  }
}
