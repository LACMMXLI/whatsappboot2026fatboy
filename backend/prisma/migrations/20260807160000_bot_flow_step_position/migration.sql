-- AlterTable
-- Nullable a proposito: NULL = paso sin acomodar visualmente todavia (el
-- frontend le calcula un layout automatico). No usar 0,0 como "sin
-- posicion", es una coordenada valida una vez acomodado.
ALTER TABLE "bot_flow_steps" ADD COLUMN "positionX" DOUBLE PRECISION,
ADD COLUMN "positionY" DOUBLE PRECISION;
