-- CreateEnum
CREATE TYPE "BotTemplateKey" AS ENUM ('GREETING', 'CANCEL', 'HUMAN_HANDOFF', 'FALLBACK');

-- CreateEnum
CREATE TYPE "BotIntentType" AS ENUM ('greeting', 'view_menu', 'confirm', 'cancel', 'talk_to_human');

-- CreateTable
CREATE TABLE "bot_response_templates" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "key" "BotTemplateKey" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_response_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_keyword_rules" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "intent" "BotIntentType" NOT NULL,
    "phrase" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bot_keyword_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bot_response_templates_businessId_key_key" ON "bot_response_templates"("businessId", "key");

-- CreateIndex
CREATE INDEX "bot_keyword_rules_businessId_intent_idx" ON "bot_keyword_rules"("businessId", "intent");

-- AddForeignKey
ALTER TABLE "bot_response_templates" ADD CONSTRAINT "bot_response_templates_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_keyword_rules" ADD CONSTRAINT "bot_keyword_rules_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

