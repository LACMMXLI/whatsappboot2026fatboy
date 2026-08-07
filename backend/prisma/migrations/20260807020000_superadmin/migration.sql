-- CreateEnum
CREATE TYPE "WhatsappConnectionStatus" AS ENUM ('PENDING', 'CONNECTING', 'CONNECTED', 'DISCONNECTED', 'ERROR');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "whatsappConnectionError" TEXT,
ADD COLUMN     "whatsappConnectionStatus" "WhatsappConnectionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;

-- Marca al dueño de la plataforma como superadmin. Si el usuario todavia no
-- existe (por ejemplo en un ambiente nuevo), esto simplemente no afecta filas.
UPDATE "users" SET "isSuperAdmin" = true WHERE "email" = 'alonzo@fatboy.com';

-- Cualquier negocio que ya tenga una instancia de WhatsApp configurada
-- (whatsappInstanceId no nulo) se considera conectado; el resto queda
-- PENDING (default), a la espera de que el superadmin la cree.
UPDATE "businesses" SET "whatsappConnectionStatus" = 'CONNECTED' WHERE "whatsappInstanceId" IS NOT NULL;
