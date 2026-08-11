import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';
import { NotificationRead } from '../../database/entities/notification-read.entity';
import { AuditAction } from '../../common/enums/domain.enums';

type CurrentUserContext = {
  sub?: string;
  businessId?: string | null;
  business?: { id?: string | null } | null;
  role?: { name?: string | null } | null;
};

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  kind: 'info' | 'success' | 'warning' | 'danger';
  createdAt: Date;
  unread: boolean;
  entityName: string | null;
  entityId: string | null;
  action: string;
  user: { id: string | null; fullName: string | null; email: string | null } | null;
};

const ROLE_ALIASES = {
  admin: ['platform administrator', 'platform admin'],
  owner: ['business owner', 'owner'],
  staff: ['staff', 'staff user'],
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(AuditLog) private readonly auditLogsRepository: Repository<AuditLog>,
    @InjectRepository(NotificationRead) private readonly notificationReadsRepository: Repository<NotificationRead>,
  ) {}

  async list(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const limit = Math.min(Math.max(Number(filters.limit ?? 10), 1), 20);
    const unreadOnly = String(filters.unreadOnly ?? '').trim() === 'true';
    const roleName = this.normalizeRoleName(currentUser.role?.name ?? '');
    const businessId = this.resolveBusinessId(currentUser);

    const query = this.auditLogsRepository.createQueryBuilder('audit').leftJoinAndSelect('audit.user', 'user');
    if (roleName === 'admin') {
      // Platform administrators should see all notifications
    } else if (businessId) {
      query.andWhere('audit.businessId = :businessId', { businessId });
    } else if (currentUser.sub) {
      query.andWhere('audit.userId = :userId', { userId: currentUser.sub });
    }

    const logs = await query.orderBy('audit.createdAt', 'DESC').take(limit * 4).getMany();

    const relevantLogs = logs.filter((log) => this.isRelevantForRole(roleName, log));
    const ids = relevantLogs.map((log) => log.id);
    const readSet = new Set(
      (
        ids.length
          ? await this.notificationReadsRepository.find({
              where: {
                userId: currentUser.sub ?? '',
                notificationId: In(ids),
              },
            })
          : []
      ).map((item) => item.notificationId),
    );

    const items = relevantLogs
      .map((log) => this.shapeNotification(log, readSet.has(log.id)))
      .filter((item) => (unreadOnly ? item.unread : true))
      .slice(0, limit);

    return {
      items,
      total: relevantLogs.length,
      unreadCount: relevantLogs.filter((log) => !readSet.has(log.id)).length,
    };
  }

  async markRead(currentUser: CurrentUserContext, notificationId: string): Promise<Record<string, unknown>> {
    const userId = currentUser.sub;
    if (!userId) {
      return { success: false };
    }

    const existing = await this.notificationReadsRepository.findOne({
      where: { userId, notificationId },
    });

    if (!existing) {
      await this.notificationReadsRepository.save(
        this.notificationReadsRepository.create({
          userId,
          notificationId,
          readAt: new Date(),
        }),
      );
    }

    return { success: true };
  }

  async markAllRead(currentUser: CurrentUserContext, filters: Record<string, unknown>): Promise<Record<string, unknown>> {
    const notifications = await this.list(currentUser, { ...filters, limit: 20, unreadOnly: 'false' });
    const items = (notifications.items as Array<Record<string, unknown>>) ?? [];
    const userId = currentUser.sub;
    if (!userId || !items.length) {
      return { success: true, updated: 0 };
    }

    const ids = items.map((item) => String(item.id));
    const existing = await this.notificationReadsRepository.find({
      where: { userId, notificationId: In(ids) },
    });
    const existingIds = new Set(existing.map((item) => item.notificationId));
    const newReads = ids
      .filter((id) => !existingIds.has(id))
      .map((notificationId) =>
        this.notificationReadsRepository.create({
          userId,
          notificationId,
          readAt: new Date(),
        }),
      );

    if (newReads.length) {
      await this.notificationReadsRepository.save(newReads);
    }

    return { success: true, updated: newReads.length };
  }

  private shapeNotification(log: AuditLog, unread: boolean): NotificationItem {
    const action = String(log.action ?? '');
    const entityName = log.entityName ?? null;
    const entityId = log.entityId ?? null;
    const kind = this.resolveKind(action);

    return {
      id: log.id,
      title: this.resolveTitle(action, entityName),
      message: this.resolveMessage(action, entityName, entityId, log.user?.fullName ?? null),
      kind,
      createdAt: log.createdAt,
      unread,
      entityName,
      entityId,
      action,
      user: log.user
        ? {
            id: log.user.id,
            fullName: log.user.fullName,
            email: log.user.email,
          }
        : null,
    };
  }

  private isRelevantForRole(roleName: string, log: AuditLog): boolean {
    const action = String(log.action ?? '');
    const entityName = String(log.entityName ?? '').toLowerCase();

    if (roleName === 'admin') {
      return true;
    }

    if (roleName === 'owner') {
      return Boolean(log.businessId);
    }

    if (roleName === 'staff') {
      const staffEntityNames = ['invoice', 'product', 'inventory', 'customer', 'vendor', 'stock', 'ledger'];
      const staffActions = new Set([
        AuditAction.INVOICE_CREATED,
        AuditAction.INVOICE_CANCELLED,
        AuditAction.STOCK_ADJUSTED,
        AuditAction.CREATE,
        AuditAction.UPDATE,
        AuditAction.DELETE,
      ]);
      return staffActions.has(action as AuditAction) || staffEntityNames.some((entry) => entityName.includes(entry));
    }

    return true;
  }

  private resolveTitle(action: string, entityName: string | null): string {
    const readableEntity = entityName || 'Activity';
    switch (action) {
      case AuditAction.INVOICE_CREATED:
        return 'Invoice created';
      case AuditAction.INVOICE_CANCELLED:
        return 'Invoice cancelled';
      case AuditAction.STOCK_ADJUSTED:
        return 'Stock adjusted';
      case AuditAction.SETTINGS_UPDATED:
        return 'Settings updated';
      case AuditAction.SUBSCRIPTION_UPDATED:
        return 'Subscription updated';
      case AuditAction.LOGIN_SUCCESS:
        return 'Login successful';
      case AuditAction.LOGIN_FAILED:
        return 'Login failed';
      default:
        return `${readableEntity} updated`;
    }
  }

  private resolveMessage(action: string, entityName: string | null, entityId: string | null, userName: string | null): string {
    const actor = userName || 'Someone';
    const target = entityName ? `${entityName}${entityId ? ` #${entityId}` : ''}` : 'an item';

    switch (action) {
      case AuditAction.INVOICE_CREATED:
        return `${actor} created a new invoice.`;
      case AuditAction.INVOICE_CANCELLED:
        return `${actor} cancelled ${target}.`;
      case AuditAction.STOCK_ADJUSTED:
        return `${actor} updated stock levels for ${target}.`;
      case AuditAction.SETTINGS_UPDATED:
        return `${actor} changed system settings.`;
      case AuditAction.SUBSCRIPTION_UPDATED:
        return `${actor} updated the subscription.`;
      case AuditAction.LOGIN_SUCCESS:
        return `${actor} signed in successfully.`;
      case AuditAction.LOGIN_FAILED:
        return `${actor} attempted a sign in.`;
      default:
        return `${actor} changed ${target}.`;
    }
  }

  private resolveKind(action: string): NotificationItem['kind'] {
    if (action === AuditAction.LOGIN_FAILED) return 'danger';
    if (action === AuditAction.INVOICE_CANCELLED) return 'warning';
    if (action === AuditAction.STOCK_ADJUSTED || action === AuditAction.SETTINGS_UPDATED) return 'warning';
    if (action === AuditAction.LOGIN_SUCCESS || action === AuditAction.INVOICE_CREATED || action === AuditAction.SUBSCRIPTION_UPDATED) {
      return 'success';
    }
    return 'info';
  }

  private resolveBusinessId(currentUser: CurrentUserContext): string | undefined {
    return currentUser.businessId ?? currentUser.business?.id ?? undefined;
  }

  private normalizeRoleName(value: string): 'admin' | 'owner' | 'staff' | 'other' {
    const normalized = value.trim().toLowerCase();
    if (ROLE_ALIASES.admin.includes(normalized)) return 'admin';
    if (ROLE_ALIASES.owner.includes(normalized)) return 'owner';
    if (ROLE_ALIASES.staff.includes(normalized)) return 'staff';
    return 'other';
  }
}
