ALTER TYPE "ActivityType" ADD VALUE IF NOT EXISTS 'CONTACT';

CREATE TYPE "ContactRole" AS ENUM ('PURCHASER', 'VENDOR', 'TENANT', 'LANDLORD', 'COMPANY_VENDOR', 'HIGH_URGENCY');
CREATE TYPE "PendingTone" AS ENUM ('DANGER', 'WARNING', 'SUCCESS', 'NEUTRAL');
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

CREATE TABLE "Contact" (
  "id" TEXT NOT NULL,
  "slug" VARCHAR(160) NOT NULL,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "mobile" VARCHAR(40),
  "role" "ContactRole" NOT NULL DEFAULT 'PURCHASER',
  "secondaryRoles" "ContactRole"[] NOT NULL DEFAULT ARRAY[]::"ContactRole"[],
  "company" VARCHAR(180),
  "address" TEXT,
  "city" VARCHAR(120),
  "postcode" VARCHAR(20),
  "country" TEXT NOT NULL DEFAULT 'United Kingdom',
  "notes" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "avatarUrl" TEXT,
  "assignedAgentId" TEXT,
  "lastActivityAt" TIMESTAMP(3),
  "lastActivityNote" TEXT,
  "pendingAction" TEXT NOT NULL DEFAULT 'None Pending',
  "pendingTone" "PendingTone" NOT NULL DEFAULT 'NEUTRAL',
  "deletedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SellIntent" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "propertyTitle" VARCHAR(180) NOT NULL DEFAULT 'The Glass House',
  "propertyAddress" TEXT NOT NULL DEFAULT '14 Cheltenham Place, Wilmslow, SK9 4AA',
  "askingPrice" DECIMAL(14,2),
  "instruction" VARCHAR(120) NOT NULL DEFAULT 'Sole Agency - Signed',
  "marketingStatus" VARCHAR(120) NOT NULL DEFAULT 'Valuation pending',
  "targetExchange" VARCHAR(120) NOT NULL DEFAULT 'Q1 (12-week window)',
  "currentStage" VARCHAR(120) NOT NULL DEFAULT 'Property Valuation',
  "stages" JSONB NOT NULL,
  "checklist" JSONB NOT NULL,
  "propertyInfo" JSONB,
  "nextActions" JSONB,
  "workflowProgress" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SellIntent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ValuationAppointment" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "sellIntentId" TEXT,
  "agentId" TEXT,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 60,
  "status" "AppointmentStatus" NOT NULL DEFAULT 'CONFIRMED',
  "notes" TEXT,
  "competingAgents" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ValuationAppointment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactTimelineEntry" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "step" VARCHAR(120) NOT NULL,
  "activity" VARCHAR(180) NOT NULL,
  "description" TEXT NOT NULL,
  "agentName" VARCHAR(160),
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "ContactTimelineEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactAiInsight" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" TEXT NOT NULL,
  "icon" VARCHAR(40) NOT NULL DEFAULT 'zap',
  "tone" VARCHAR(40) NOT NULL DEFAULT 'green',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactAiInsight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactAiChatMessage" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "role" VARCHAR(40) NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactAiChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContactDocument" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "url" TEXT NOT NULL,
  "type" VARCHAR(80),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Contact_slug_key" ON "Contact"("slug");
CREATE UNIQUE INDEX "Contact_email_key" ON "Contact"("email");
CREATE INDEX "Contact_role_idx" ON "Contact"("role");
CREATE INDEX "Contact_assignedAgentId_idx" ON "Contact"("assignedAgentId");
CREATE INDEX "Contact_city_idx" ON "Contact"("city");
CREATE INDEX "Contact_postcode_idx" ON "Contact"("postcode");
CREATE INDEX "Contact_deletedAt_idx" ON "Contact"("deletedAt");
CREATE INDEX "SellIntent_contactId_idx" ON "SellIntent"("contactId");
CREATE INDEX "ValuationAppointment_contactId_idx" ON "ValuationAppointment"("contactId");
CREATE INDEX "ValuationAppointment_sellIntentId_idx" ON "ValuationAppointment"("sellIntentId");
CREATE INDEX "ValuationAppointment_agentId_idx" ON "ValuationAppointment"("agentId");
CREATE INDEX "ValuationAppointment_scheduledAt_idx" ON "ValuationAppointment"("scheduledAt");
CREATE INDEX "ContactTimelineEntry_contactId_idx" ON "ContactTimelineEntry"("contactId");
CREATE INDEX "ContactTimelineEntry_occurredAt_idx" ON "ContactTimelineEntry"("occurredAt");
CREATE INDEX "ContactAiInsight_contactId_idx" ON "ContactAiInsight"("contactId");
CREATE INDEX "ContactAiChatMessage_contactId_idx" ON "ContactAiChatMessage"("contactId");
CREATE INDEX "ContactDocument_contactId_idx" ON "ContactDocument"("contactId");

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SellIntent" ADD CONSTRAINT "SellIntent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ValuationAppointment" ADD CONSTRAINT "ValuationAppointment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ValuationAppointment" ADD CONSTRAINT "ValuationAppointment_sellIntentId_fkey" FOREIGN KEY ("sellIntentId") REFERENCES "SellIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ValuationAppointment" ADD CONSTRAINT "ValuationAppointment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ContactTimelineEntry" ADD CONSTRAINT "ContactTimelineEntry_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactAiInsight" ADD CONSTRAINT "ContactAiInsight_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactAiChatMessage" ADD CONSTRAINT "ContactAiChatMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ContactDocument" ADD CONSTRAINT "ContactDocument_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
