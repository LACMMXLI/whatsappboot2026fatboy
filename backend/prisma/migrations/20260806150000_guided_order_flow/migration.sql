-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ConversationStatus" ADD VALUE 'ASKING_NAME';
ALTER TYPE "ConversationStatus" ADD VALUE 'ASKING_PROMOTIONS';
ALTER TYPE "ConversationStatus" ADD VALUE 'BROWSING_PROMOTIONS';
ALTER TYPE "ConversationStatus" ADD VALUE 'BROWSING_CATEGORIES';

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "pickupAddress" TEXT;

-- AlterTable
ALTER TABLE "promotions" ADD COLUMN     "price" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "promotionId" TEXT;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
