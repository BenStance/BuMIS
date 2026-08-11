import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase3SalesFinanceBi1782739100000 implements MigrationInterface {
  name = 'Phase3SalesFinanceBi1782739100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "SalesInvoices" ADD "PaymentMethod" nvarchar(30)`);
    await queryRunner.query(`ALTER TABLE "SalesInvoices" ADD "CancelledAt" datetime2`);
    await queryRunner.query(`ALTER TABLE "SalesInvoices" ADD "CancelledByUserId" uniqueidentifier`);
    await queryRunner.query(`ALTER TABLE "SalesInvoices" ADD "CancellationReason" nvarchar(500)`);
    await queryRunner.query(`CREATE INDEX "IDX_SalesInvoices_PaymentMethod" ON "SalesInvoices" ("PaymentMethod")`);
    await queryRunner.query(`CREATE INDEX "IDX_SalesInvoices_CancelledByUserId" ON "SalesInvoices" ("CancelledByUserId")`);
    await queryRunner.query(`ALTER TABLE "SalesInvoices" ADD CONSTRAINT "FK_SalesInvoices_CancelledByUserId" FOREIGN KEY ("CancelledByUserId") REFERENCES "Users"("Id") ON DELETE SET NULL ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "SalesInvoices" DROP CONSTRAINT "FK_SalesInvoices_CancelledByUserId"`);
    await queryRunner.query(`DROP INDEX "IDX_SalesInvoices_CancelledByUserId" ON "SalesInvoices"`);
    await queryRunner.query(`DROP INDEX "IDX_SalesInvoices_PaymentMethod" ON "SalesInvoices"`);
    await queryRunner.query(`ALTER TABLE "SalesInvoices" DROP COLUMN "CancellationReason"`);
    await queryRunner.query(`ALTER TABLE "SalesInvoices" DROP COLUMN "CancelledByUserId"`);
    await queryRunner.query(`ALTER TABLE "SalesInvoices" DROP COLUMN "CancelledAt"`);
    await queryRunner.query(`ALTER TABLE "SalesInvoices" DROP COLUMN "PaymentMethod"`);
  }
}
