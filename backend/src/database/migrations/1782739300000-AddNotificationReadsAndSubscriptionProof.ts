import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationReadsAndSubscriptionProof1782739300000 implements MigrationInterface {
  name = 'AddNotificationReadsAndSubscriptionProof1782739300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "NotificationReads" ("Id" uniqueidentifier NOT NULL CONSTRAINT "DF_2f52f22c76b3a760fb8cdde60df" DEFAULT NEWSEQUENTIALID(), "CreatedAt" datetime2 NOT NULL CONSTRAINT "DF_5d5221c41ee3cebb50322ccedba" DEFAULT getdate(), "UpdatedAt" datetime2 NOT NULL CONSTRAINT "DF_2f0f4b9e9c540f5d691114f33bb" DEFAULT getdate(), "UserId" uniqueidentifier NOT NULL, "NotificationId" uniqueidentifier NOT NULL, "ReadAt" datetime2 NOT NULL CONSTRAINT "DF_a7cc86eba48d1061f1b8db2b9d9" DEFAULT GETDATE(), CONSTRAINT "PK_2f52f22c76b3a760fb8cdde60df" PRIMARY KEY ("Id"))`);
    await queryRunner.query(`CREATE INDEX "IDX_NotificationReads_UserId" ON "NotificationReads" ("UserId")`);
    await queryRunner.query(`CREATE INDEX "IDX_NotificationReads_NotificationId" ON "NotificationReads" ("NotificationId")`);
    await queryRunner.query(`ALTER TABLE "NotificationReads" ADD CONSTRAINT "FK_NotificationReads_UserId" FOREIGN KEY ("UserId") REFERENCES "Users"("Id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "NotificationReads" ADD CONSTRAINT "FK_NotificationReads_NotificationId" FOREIGN KEY ("NotificationId") REFERENCES "AuditLogs"("Id") ON DELETE CASCADE ON UPDATE NO ACTION`);

    await queryRunner.query(`ALTER TABLE "Businesses" ADD "SubscriptionProofPath" nvarchar(500)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "Businesses" DROP COLUMN "SubscriptionProofPath"`);
    await queryRunner.query(`ALTER TABLE "NotificationReads" DROP CONSTRAINT "FK_NotificationReads_NotificationId"`);
    await queryRunner.query(`ALTER TABLE "NotificationReads" DROP CONSTRAINT "FK_NotificationReads_UserId"`);
    await queryRunner.query(`DROP INDEX "IDX_NotificationReads_NotificationId" ON "NotificationReads"`);
    await queryRunner.query(`DROP INDEX "IDX_NotificationReads_UserId" ON "NotificationReads"`);
    await queryRunner.query(`DROP TABLE "NotificationReads"`);
  }
}
