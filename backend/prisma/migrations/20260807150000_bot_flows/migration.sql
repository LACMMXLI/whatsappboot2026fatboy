-- CreateTable
CREATE TABLE "bot_flows" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggers" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_flows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bot_flow_steps" (
    "id" TEXT NOT NULL,
    "flowId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "bot_flow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_flows_businessId_idx" ON "bot_flows"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "bot_flow_steps_flowId_order_key" ON "bot_flow_steps"("flowId", "order");

-- AddForeignKey
ALTER TABLE "bot_flows" ADD CONSTRAINT "bot_flows_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_flow_steps" ADD CONSTRAINT "bot_flow_steps_flowId_fkey" FOREIGN KEY ("flowId") REFERENCES "bot_flows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
