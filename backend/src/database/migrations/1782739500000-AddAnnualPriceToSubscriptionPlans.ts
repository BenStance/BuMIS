import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAnnualPriceToSubscriptionPlans1782739500000 implements MigrationInterface {
  name = 'AddAnnualPriceToSubscriptionPlans1782739500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "SubscriptionPlans"
      ADD "AnnualPrice" decimal(18,2) NOT NULL CONSTRAINT "DF_SubscriptionPlans_AnnualPrice" DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "SubscriptionPlans"
      DROP CONSTRAINT "DF_SubscriptionPlans_AnnualPrice"
    `);
    await queryRunner.query(`ALTER TABLE "SubscriptionPlans" DROP COLUMN "AnnualPrice"`);
  }
}
