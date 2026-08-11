import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSubscriptionPayments1782739400000 implements MigrationInterface {
  name = 'AddSubscriptionPayments1782739400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "SubscriptionPayments" (
        "Id" uniqueidentifier NOT NULL CONSTRAINT "DF_SubscriptionPayments_Id" DEFAULT NEWSEQUENTIALID(),
        "CreatedAt" datetime2 NOT NULL CONSTRAINT "DF_SubscriptionPayments_CreatedAt" DEFAULT getdate(),
        "UpdatedAt" datetime2 NOT NULL CONSTRAINT "DF_SubscriptionPayments_UpdatedAt" DEFAULT getdate(),
        "SubscriptionId" uniqueidentifier NOT NULL,
        "BusinessId" uniqueidentifier NOT NULL,
        "PlanId" uniqueidentifier NOT NULL,
        "Amount" decimal(18,2) NOT NULL CONSTRAINT "DF_SubscriptionPayments_Amount" DEFAULT 0,
        "PaymentMethod" nvarchar(100),
        "TransactionReference" nvarchar(150),
        "ProofPath" nvarchar(500),
        "Status" nvarchar(30) NOT NULL CONSTRAINT "DF_SubscriptionPayments_Status" DEFAULT 'pending',
        "ReviewedBy" uniqueidentifier,
        "ReviewedAt" datetime2,
        "RejectionReason" nvarchar(500),
        CONSTRAINT "PK_SubscriptionPayments" PRIMARY KEY ("Id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_SubscriptionPayments_SubscriptionId" ON "SubscriptionPayments" ("SubscriptionId")`);
    await queryRunner.query(`CREATE INDEX "IDX_SubscriptionPayments_BusinessId" ON "SubscriptionPayments" ("BusinessId")`);
    await queryRunner.query(`CREATE INDEX "IDX_SubscriptionPayments_PlanId" ON "SubscriptionPayments" ("PlanId")`);
    await queryRunner.query(`CREATE INDEX "IDX_SubscriptionPayments_ReviewedBy" ON "SubscriptionPayments" ("ReviewedBy")`);
    await queryRunner.query(`
      ALTER TABLE "SubscriptionPayments"
      ADD CONSTRAINT "FK_SubscriptionPayments_SubscriptionId"
      FOREIGN KEY ("SubscriptionId") REFERENCES "BusinessSubscriptions"("Id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "SubscriptionPayments"
      ADD CONSTRAINT "FK_SubscriptionPayments_BusinessId"
      FOREIGN KEY ("BusinessId") REFERENCES "Businesses"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "SubscriptionPayments"
      ADD CONSTRAINT "FK_SubscriptionPayments_PlanId"
      FOREIGN KEY ("PlanId") REFERENCES "SubscriptionPlans"("Id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "SubscriptionPayments"
      ADD CONSTRAINT "FK_SubscriptionPayments_ReviewedBy"
      FOREIGN KEY ("ReviewedBy") REFERENCES "Users"("Id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "SubscriptionPayments" DROP CONSTRAINT "FK_SubscriptionPayments_ReviewedBy"`);
    await queryRunner.query(`ALTER TABLE "SubscriptionPayments" DROP CONSTRAINT "FK_SubscriptionPayments_PlanId"`);
    await queryRunner.query(`ALTER TABLE "SubscriptionPayments" DROP CONSTRAINT "FK_SubscriptionPayments_BusinessId"`);
    await queryRunner.query(`ALTER TABLE "SubscriptionPayments" DROP CONSTRAINT "FK_SubscriptionPayments_SubscriptionId"`);
    await queryRunner.query(`DROP INDEX "IDX_SubscriptionPayments_ReviewedBy" ON "SubscriptionPayments"`);
    await queryRunner.query(`DROP INDEX "IDX_SubscriptionPayments_PlanId" ON "SubscriptionPayments"`);
    await queryRunner.query(`DROP INDEX "IDX_SubscriptionPayments_BusinessId" ON "SubscriptionPayments"`);
    await queryRunner.query(`DROP INDEX "IDX_SubscriptionPayments_SubscriptionId" ON "SubscriptionPayments"`);
    await queryRunner.query(`DROP TABLE "SubscriptionPayments"`);
  }
}
