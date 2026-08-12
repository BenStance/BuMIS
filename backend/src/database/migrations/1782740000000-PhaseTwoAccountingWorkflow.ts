import { MigrationInterface, QueryRunner } from 'typeorm';

export class PhaseTwoAccountingWorkflow1782740000000 implements MigrationInterface {
  name = 'PhaseTwoAccountingWorkflow1782740000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "SalesInvoices" ADD "DocumentStatus" nvarchar(30) NOT NULL CONSTRAINT "DF_SalesInvoices_DocumentStatus" DEFAULT 'draft'`);
    await queryRunner.query(`ALTER TABLE "SalesInvoices" ADD "PaymentStatus" nvarchar(30) NOT NULL CONSTRAINT "DF_SalesInvoices_PaymentStatus" DEFAULT 'unpaid'`);
    await queryRunner.query(`ALTER TABLE "Vendors" ADD "Balance" decimal(18,2) NOT NULL CONSTRAINT "DF_Vendors_Balance" DEFAULT 0`);

    await queryRunner.query(`ALTER TABLE "LedgerEntries" ADD "SourceId" uniqueidentifier`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" ADD "SourceNumber" nvarchar(100)`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" ADD "PostingBatchId" nvarchar(100)`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" ADD "PostingDate" datetime2 NOT NULL CONSTRAINT "DF_LedgerEntries_PostingDate" DEFAULT GETDATE()`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" ADD "IsReversal" bit NOT NULL CONSTRAINT "DF_LedgerEntries_IsReversal" DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" ADD "ReversalOfEntryId" uniqueidentifier`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" ADD "ReversalBatchId" nvarchar(100)`);

    await queryRunner.query(`ALTER TABLE "InventoryTransactions" ADD "SourceId" uniqueidentifier`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" ADD "SourceNumber" nvarchar(100)`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" ADD "IsReversal" bit NOT NULL CONSTRAINT "DF_InventoryTransactions_IsReversal" DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" ADD "ReversalOfTransactionId" uniqueidentifier`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" ADD "ReversalBatchId" nvarchar(100)`);

    await queryRunner.query(`CREATE TABLE "DocumentCounters" (
      "Id" uniqueidentifier NOT NULL CONSTRAINT "DF_DocumentCounters_Id" DEFAULT NEWID(),
      "CreatedAt" datetime2 NOT NULL CONSTRAINT "DF_DocumentCounters_CreatedAt" DEFAULT GETDATE(),
      "UpdatedAt" datetime2 NOT NULL CONSTRAINT "DF_DocumentCounters_UpdatedAt" DEFAULT GETDATE(),
      "BusinessId" uniqueidentifier NULL,
      "DocumentType" nvarchar(50) NOT NULL,
      "Prefix" nvarchar(50) NOT NULL,
      "NextSequence" int NOT NULL CONSTRAINT "DF_DocumentCounters_NextSequence" DEFAULT 1,
      "IncludeYear" bit NOT NULL CONSTRAINT "DF_DocumentCounters_IncludeYear" DEFAULT 1,
      "Padding" int NOT NULL CONSTRAINT "DF_DocumentCounters_Padding" DEFAULT 6,
      CONSTRAINT "PK_DocumentCounters" PRIMARY KEY ("Id"),
      CONSTRAINT "UQ_DocumentCounters_BusinessId_DocumentType" UNIQUE ("BusinessId", "DocumentType")
    )`);

    await queryRunner.query(`CREATE INDEX "IDX_DocumentCounters_BusinessId" ON "DocumentCounters" ("BusinessId")`);
    await queryRunner.query(`CREATE INDEX "IDX_DocumentCounters_DocumentType" ON "DocumentCounters" ("DocumentType")`);

    await queryRunner.query(`CREATE TABLE "PurchaseInvoices" (
      "Id" uniqueidentifier NOT NULL CONSTRAINT "DF_PurchaseInvoices_Id" DEFAULT NEWID(),
      "CreatedAt" datetime2 NOT NULL CONSTRAINT "DF_PurchaseInvoices_CreatedAt" DEFAULT GETDATE(),
      "UpdatedAt" datetime2 NOT NULL CONSTRAINT "DF_PurchaseInvoices_UpdatedAt" DEFAULT GETDATE(),
      "BusinessId" uniqueidentifier NOT NULL,
      "VendorId" uniqueidentifier NOT NULL,
      "CreatedByUserId" uniqueidentifier NOT NULL,
      "PostedByUserId" uniqueidentifier NULL,
      "CancelledByUserId" uniqueidentifier NULL,
      "ReversedByUserId" uniqueidentifier NULL,
      "PurchaseInvoiceNumber" nvarchar(50) NOT NULL,
      "VendorInvoiceNumber" nvarchar(100) NULL,
      "InvoiceDate" datetime2 NOT NULL CONSTRAINT "DF_PurchaseInvoices_InvoiceDate" DEFAULT GETDATE(),
      "PostingDate" datetime2 NULL,
      "DueDate" date NULL,
      "CurrencyCode" nvarchar(10) NOT NULL CONSTRAINT "DF_PurchaseInvoices_CurrencyCode" DEFAULT 'TZS',
      "ExchangeRate" decimal(18,6) NOT NULL CONSTRAINT "DF_PurchaseInvoices_ExchangeRate" DEFAULT 1,
      "Subtotal" decimal(18,2) NOT NULL CONSTRAINT "DF_PurchaseInvoices_Subtotal" DEFAULT 0,
      "DiscountTotal" decimal(18,2) NOT NULL CONSTRAINT "DF_PurchaseInvoices_DiscountTotal" DEFAULT 0,
      "TaxTotal" decimal(18,2) NOT NULL CONSTRAINT "DF_PurchaseInvoices_TaxTotal" DEFAULT 0,
      "TotalAmount" decimal(18,2) NOT NULL CONSTRAINT "DF_PurchaseInvoices_TotalAmount" DEFAULT 0,
      "AmountPaid" decimal(18,2) NOT NULL CONSTRAINT "DF_PurchaseInvoices_AmountPaid" DEFAULT 0,
      "Balance" decimal(18,2) NOT NULL CONSTRAINT "DF_PurchaseInvoices_Balance" DEFAULT 0,
      "DocumentStatus" nvarchar(30) NOT NULL CONSTRAINT "DF_PurchaseInvoices_DocumentStatus" DEFAULT 'draft',
      "PaymentStatus" nvarchar(30) NOT NULL CONSTRAINT "DF_PurchaseInvoices_PaymentStatus" DEFAULT 'unpaid',
      "Remarks" nvarchar(500) NULL,
      "PostedAt" datetime2 NULL,
      "CancelledAt" datetime2 NULL,
      "CancellationReason" nvarchar(500) NULL,
      "ReversedAt" datetime2 NULL,
      "ReversalDate" date NULL,
      "ReversalReason" nvarchar(500) NULL,
      "ReversalNumber" nvarchar(50) NULL,
      CONSTRAINT "PK_PurchaseInvoices" PRIMARY KEY ("Id"),
      CONSTRAINT "UQ_PurchaseInvoices_BusinessId_Number" UNIQUE ("BusinessId", "PurchaseInvoiceNumber")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_PurchaseInvoices_BusinessId" ON "PurchaseInvoices" ("BusinessId")`);
    await queryRunner.query(`CREATE INDEX "IDX_PurchaseInvoices_VendorId" ON "PurchaseInvoices" ("VendorId")`);
    await queryRunner.query(`CREATE INDEX "IDX_PurchaseInvoices_DocumentStatus" ON "PurchaseInvoices" ("DocumentStatus")`);
    await queryRunner.query(`CREATE INDEX "IDX_PurchaseInvoices_PaymentStatus" ON "PurchaseInvoices" ("PaymentStatus")`);
    await queryRunner.query(`ALTER TABLE "PurchaseInvoices" ADD CONSTRAINT "FK_PurchaseInvoices_BusinessId" FOREIGN KEY ("BusinessId") REFERENCES "Businesses"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "PurchaseInvoices" ADD CONSTRAINT "FK_PurchaseInvoices_VendorId" FOREIGN KEY ("VendorId") REFERENCES "Vendors"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "PurchaseInvoices" ADD CONSTRAINT "FK_PurchaseInvoices_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "PurchaseInvoices" ADD CONSTRAINT "FK_PurchaseInvoices_PostedByUserId" FOREIGN KEY ("PostedByUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "PurchaseInvoices" ADD CONSTRAINT "FK_PurchaseInvoices_CancelledByUserId" FOREIGN KEY ("CancelledByUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "PurchaseInvoices" ADD CONSTRAINT "FK_PurchaseInvoices_ReversedByUserId" FOREIGN KEY ("ReversedByUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION`);

    await queryRunner.query(`CREATE TABLE "PurchaseInvoiceItems" (
      "Id" uniqueidentifier NOT NULL CONSTRAINT "DF_PurchaseInvoiceItems_Id" DEFAULT NEWID(),
      "CreatedAt" datetime2 NOT NULL CONSTRAINT "DF_PurchaseInvoiceItems_CreatedAt" DEFAULT GETDATE(),
      "UpdatedAt" datetime2 NOT NULL CONSTRAINT "DF_PurchaseInvoiceItems_UpdatedAt" DEFAULT GETDATE(),
      "PurchaseInvoiceId" uniqueidentifier NOT NULL,
      "ProductId" uniqueidentifier NULL,
      "Description" nvarchar(255) NULL,
      "Quantity" decimal(18,3) NOT NULL,
      "UnitCost" decimal(18,2) NOT NULL,
      "DiscountAmount" decimal(18,2) NOT NULL CONSTRAINT "DF_PurchaseInvoiceItems_DiscountAmount" DEFAULT 0,
      "TaxRate" decimal(18,2) NOT NULL CONSTRAINT "DF_PurchaseInvoiceItems_TaxRate" DEFAULT 0,
      "TaxAmount" decimal(18,2) NOT NULL CONSTRAINT "DF_PurchaseInvoiceItems_TaxAmount" DEFAULT 0,
      "LineSubtotal" decimal(18,2) NOT NULL,
      "LineTotal" decimal(18,2) NOT NULL,
      "IsInventoryItem" bit NOT NULL CONSTRAINT "DF_PurchaseInvoiceItems_IsInventoryItem" DEFAULT 1,
      CONSTRAINT "PK_PurchaseInvoiceItems" PRIMARY KEY ("Id")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_PurchaseInvoiceItems_PurchaseInvoiceId" ON "PurchaseInvoiceItems" ("PurchaseInvoiceId")`);
    await queryRunner.query(`CREATE INDEX "IDX_PurchaseInvoiceItems_ProductId" ON "PurchaseInvoiceItems" ("ProductId")`);
    await queryRunner.query(`ALTER TABLE "PurchaseInvoiceItems" ADD CONSTRAINT "FK_PurchaseInvoiceItems_PurchaseInvoiceId" FOREIGN KEY ("PurchaseInvoiceId") REFERENCES "PurchaseInvoices"("Id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "PurchaseInvoiceItems" ADD CONSTRAINT "FK_PurchaseInvoiceItems_ProductId" FOREIGN KEY ("ProductId") REFERENCES "Products"("Id") ON DELETE SET NULL`);

    await queryRunner.query(`CREATE TABLE "SalesReceipts" (
      "Id" uniqueidentifier NOT NULL CONSTRAINT "DF_SalesReceipts_Id" DEFAULT NEWID(),
      "CreatedAt" datetime2 NOT NULL CONSTRAINT "DF_SalesReceipts_CreatedAt" DEFAULT GETDATE(),
      "UpdatedAt" datetime2 NOT NULL CONSTRAINT "DF_SalesReceipts_UpdatedAt" DEFAULT GETDATE(),
      "BusinessId" uniqueidentifier NOT NULL,
      "CustomerId" uniqueidentifier NOT NULL,
      "CreatedByUserId" uniqueidentifier NOT NULL,
      "PostedByUserId" uniqueidentifier NULL,
      "VoidedByUserId" uniqueidentifier NULL,
      "ReceiptNumber" nvarchar(50) NOT NULL,
      "ReceiptDate" datetime2 NOT NULL CONSTRAINT "DF_SalesReceipts_ReceiptDate" DEFAULT GETDATE(),
      "PostingDate" datetime2 NULL,
      "PaymentMethod" nvarchar(30) NULL,
      "CashOrBankAccountId" uniqueidentifier NULL,
      "Amount" decimal(18,2) NOT NULL CONSTRAINT "DF_SalesReceipts_Amount" DEFAULT 0,
      "ReferenceNumber" nvarchar(100) NULL,
      "Remarks" nvarchar(500) NULL,
      "Status" nvarchar(30) NOT NULL CONSTRAINT "DF_SalesReceipts_Status" DEFAULT 'draft',
      "IsAutomatic" bit NOT NULL CONSTRAINT "DF_SalesReceipts_IsAutomatic" DEFAULT 0,
      "PostedAt" datetime2 NULL,
      "VoidedAt" datetime2 NULL,
      "VoidReason" nvarchar(500) NULL,
      CONSTRAINT "PK_SalesReceipts" PRIMARY KEY ("Id"),
      CONSTRAINT "UQ_SalesReceipts_BusinessId_Number" UNIQUE ("BusinessId", "ReceiptNumber")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_SalesReceipts_BusinessId" ON "SalesReceipts" ("BusinessId")`);
    await queryRunner.query(`CREATE INDEX "IDX_SalesReceipts_CustomerId" ON "SalesReceipts" ("CustomerId")`);
    await queryRunner.query(`CREATE INDEX "IDX_SalesReceipts_Status" ON "SalesReceipts" ("Status")`);
    await queryRunner.query(`ALTER TABLE "SalesReceipts" ADD CONSTRAINT "FK_SalesReceipts_BusinessId" FOREIGN KEY ("BusinessId") REFERENCES "Businesses"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "SalesReceipts" ADD CONSTRAINT "FK_SalesReceipts_CustomerId" FOREIGN KEY ("CustomerId") REFERENCES "Customers"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "SalesReceipts" ADD CONSTRAINT "FK_SalesReceipts_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "SalesReceipts" ADD CONSTRAINT "FK_SalesReceipts_PostedByUserId" FOREIGN KEY ("PostedByUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "SalesReceipts" ADD CONSTRAINT "FK_SalesReceipts_VoidedByUserId" FOREIGN KEY ("VoidedByUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION`);

    await queryRunner.query(`CREATE TABLE "SalesReceiptAllocations" (
      "Id" uniqueidentifier NOT NULL CONSTRAINT "DF_SalesReceiptAllocations_Id" DEFAULT NEWID(),
      "CreatedAt" datetime2 NOT NULL CONSTRAINT "DF_SalesReceiptAllocations_CreatedAt" DEFAULT GETDATE(),
      "UpdatedAt" datetime2 NOT NULL CONSTRAINT "DF_SalesReceiptAllocations_UpdatedAt" DEFAULT GETDATE(),
      "SalesReceiptId" uniqueidentifier NOT NULL,
      "SalesInvoiceId" uniqueidentifier NOT NULL,
      "AllocatedAmount" decimal(18,2) NOT NULL,
      CONSTRAINT "PK_SalesReceiptAllocations" PRIMARY KEY ("Id")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_SalesReceiptAllocations_SalesReceiptId" ON "SalesReceiptAllocations" ("SalesReceiptId")`);
    await queryRunner.query(`CREATE INDEX "IDX_SalesReceiptAllocations_SalesInvoiceId" ON "SalesReceiptAllocations" ("SalesInvoiceId")`);
    await queryRunner.query(`ALTER TABLE "SalesReceiptAllocations" ADD CONSTRAINT "FK_SalesReceiptAllocations_SalesReceiptId" FOREIGN KEY ("SalesReceiptId") REFERENCES "SalesReceipts"("Id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "SalesReceiptAllocations" ADD CONSTRAINT "FK_SalesReceiptAllocations_SalesInvoiceId" FOREIGN KEY ("SalesInvoiceId") REFERENCES "SalesInvoices"("Id") ON DELETE NO ACTION`);

    await queryRunner.query(`CREATE TABLE "PaymentVouchers" (
      "Id" uniqueidentifier NOT NULL CONSTRAINT "DF_PaymentVouchers_Id" DEFAULT NEWID(),
      "CreatedAt" datetime2 NOT NULL CONSTRAINT "DF_PaymentVouchers_CreatedAt" DEFAULT GETDATE(),
      "UpdatedAt" datetime2 NOT NULL CONSTRAINT "DF_PaymentVouchers_UpdatedAt" DEFAULT GETDATE(),
      "BusinessId" uniqueidentifier NOT NULL,
      "VendorId" uniqueidentifier NOT NULL,
      "CreatedByUserId" uniqueidentifier NOT NULL,
      "PostedByUserId" uniqueidentifier NULL,
      "VoidedByUserId" uniqueidentifier NULL,
      "VoucherNumber" nvarchar(50) NOT NULL,
      "PaymentDate" datetime2 NOT NULL CONSTRAINT "DF_PaymentVouchers_PaymentDate" DEFAULT GETDATE(),
      "PostingDate" datetime2 NULL,
      "PaymentMethod" nvarchar(30) NULL,
      "CashOrBankAccountId" uniqueidentifier NULL,
      "Amount" decimal(18,2) NOT NULL CONSTRAINT "DF_PaymentVouchers_Amount" DEFAULT 0,
      "ReferenceNumber" nvarchar(100) NULL,
      "Remarks" nvarchar(500) NULL,
      "Status" nvarchar(30) NOT NULL CONSTRAINT "DF_PaymentVouchers_Status" DEFAULT 'draft',
      "IsAutomatic" bit NOT NULL CONSTRAINT "DF_PaymentVouchers_IsAutomatic" DEFAULT 0,
      "PostedAt" datetime2 NULL,
      "VoidedAt" datetime2 NULL,
      "VoidReason" nvarchar(500) NULL,
      CONSTRAINT "PK_PaymentVouchers" PRIMARY KEY ("Id"),
      CONSTRAINT "UQ_PaymentVouchers_BusinessId_Number" UNIQUE ("BusinessId", "VoucherNumber")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_PaymentVouchers_BusinessId" ON "PaymentVouchers" ("BusinessId")`);
    await queryRunner.query(`CREATE INDEX "IDX_PaymentVouchers_VendorId" ON "PaymentVouchers" ("VendorId")`);
    await queryRunner.query(`CREATE INDEX "IDX_PaymentVouchers_Status" ON "PaymentVouchers" ("Status")`);
    await queryRunner.query(`ALTER TABLE "PaymentVouchers" ADD CONSTRAINT "FK_PaymentVouchers_BusinessId" FOREIGN KEY ("BusinessId") REFERENCES "Businesses"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "PaymentVouchers" ADD CONSTRAINT "FK_PaymentVouchers_VendorId" FOREIGN KEY ("VendorId") REFERENCES "Vendors"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "PaymentVouchers" ADD CONSTRAINT "FK_PaymentVouchers_CreatedByUserId" FOREIGN KEY ("CreatedByUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "PaymentVouchers" ADD CONSTRAINT "FK_PaymentVouchers_PostedByUserId" FOREIGN KEY ("PostedByUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "PaymentVouchers" ADD CONSTRAINT "FK_PaymentVouchers_VoidedByUserId" FOREIGN KEY ("VoidedByUserId") REFERENCES "Users"("Id") ON DELETE NO ACTION`);

    await queryRunner.query(`CREATE TABLE "PaymentVoucherAllocations" (
      "Id" uniqueidentifier NOT NULL CONSTRAINT "DF_PaymentVoucherAllocations_Id" DEFAULT NEWID(),
      "CreatedAt" datetime2 NOT NULL CONSTRAINT "DF_PaymentVoucherAllocations_CreatedAt" DEFAULT GETDATE(),
      "UpdatedAt" datetime2 NOT NULL CONSTRAINT "DF_PaymentVoucherAllocations_UpdatedAt" DEFAULT GETDATE(),
      "PaymentVoucherId" uniqueidentifier NOT NULL,
      "PurchaseInvoiceId" uniqueidentifier NOT NULL,
      "AllocatedAmount" decimal(18,2) NOT NULL,
      CONSTRAINT "PK_PaymentVoucherAllocations" PRIMARY KEY ("Id")
    )`);
    await queryRunner.query(`CREATE INDEX "IDX_PaymentVoucherAllocations_PaymentVoucherId" ON "PaymentVoucherAllocations" ("PaymentVoucherId")`);
    await queryRunner.query(`CREATE INDEX "IDX_PaymentVoucherAllocations_PurchaseInvoiceId" ON "PaymentVoucherAllocations" ("PurchaseInvoiceId")`);
    await queryRunner.query(`ALTER TABLE "PaymentVoucherAllocations" ADD CONSTRAINT "FK_PaymentVoucherAllocations_PaymentVoucherId" FOREIGN KEY ("PaymentVoucherId") REFERENCES "PaymentVouchers"("Id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "PaymentVoucherAllocations" ADD CONSTRAINT "FK_PaymentVoucherAllocations_PurchaseInvoiceId" FOREIGN KEY ("PurchaseInvoiceId") REFERENCES "PurchaseInvoices"("Id") ON DELETE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "PaymentVoucherAllocations"`);
    await queryRunner.query(`DROP TABLE "PaymentVouchers"`);
    await queryRunner.query(`DROP TABLE "SalesReceiptAllocations"`);
    await queryRunner.query(`DROP TABLE "SalesReceipts"`);
    await queryRunner.query(`DROP TABLE "PurchaseInvoiceItems"`);
    await queryRunner.query(`DROP TABLE "PurchaseInvoices"`);
    await queryRunner.query(`DROP TABLE "DocumentCounters"`);

    await queryRunner.query(`ALTER TABLE "InventoryTransactions" DROP COLUMN "ReversalBatchId"`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" DROP COLUMN "ReversalOfTransactionId"`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" DROP COLUMN "IsReversal"`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" DROP COLUMN "SourceNumber"`);
    await queryRunner.query(`ALTER TABLE "InventoryTransactions" DROP COLUMN "SourceId"`);

    await queryRunner.query(`ALTER TABLE "LedgerEntries" DROP COLUMN "ReversalBatchId"`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" DROP COLUMN "ReversalOfEntryId"`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" DROP COLUMN "IsReversal"`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" DROP COLUMN "PostingDate"`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" DROP COLUMN "PostingBatchId"`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" DROP COLUMN "SourceNumber"`);
    await queryRunner.query(`ALTER TABLE "LedgerEntries" DROP COLUMN "SourceId"`);

    await queryRunner.query(`ALTER TABLE "Vendors" DROP COLUMN "Balance"`);
    await queryRunner.query(`ALTER TABLE "SalesInvoices" DROP COLUMN "PaymentStatus"`);
    await queryRunner.query(`ALTER TABLE "SalesInvoices" DROP COLUMN "DocumentStatus"`);
  }
}
