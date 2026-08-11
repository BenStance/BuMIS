export enum RecordStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  DELETED = 'deleted',
}

export enum BusinessStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked',
}

export enum SubscriptionStatus {
  PENDING = 'pending',
  PENDING_APPROVAL = 'pending_approval',
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REJECTED = 'rejected',
  GRACE = 'grace',
  SUSPENDED = 'suspended',
  CANCELLED = 'cancelled',
}

export enum SubscriptionPaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  PARTIALLY_PAID = 'partially_paid',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT = 'credit',
}

export enum InventoryTransactionType {
  STOCK_IN = 'stock_in',
  STOCK_OUT = 'stock_out',
  ADJUSTMENT = 'adjustment',
}

export enum LedgerAccountType {
  ASSET = 'asset',
  LIABILITY = 'liability',
  EQUITY = 'equity',
  REVENUE = 'revenue',
  EXPENSE = 'expense',
}

export enum LedgerEntrySourceType {
  INVOICE = 'invoice',
  INVENTORY = 'inventory',
  MANUAL = 'manual',
}

export enum OtpPurpose {
  VERIFY_EMAIL = 'verify_email',
  PASSWORD_RESET = 'password_reset',
  LOGIN = 'login',
}

export enum AuditAction {
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  INVOICE_CREATED = 'invoice_created',
  INVOICE_CANCELLED = 'invoice_cancelled',
  STOCK_ADJUSTED = 'stock_adjusted',
  SETTINGS_UPDATED = 'settings_updated',
  SUBSCRIPTION_UPDATED = 'subscription_updated',
  ADMIN_IMPERSONATION = 'admin_impersonation',
}
