ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'COMPLETED';

ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "mobile" VARCHAR(40);
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "role" "ContactRole" NOT NULL DEFAULT 'PURCHASER';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "secondaryRoles" "ContactRole"[] NOT NULL DEFAULT ARRAY[]::"ContactRole"[];
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "company" VARCHAR(180);
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'United Kingdom';
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Contact" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Contact'
      AND column_name = 'phone'
  ) THEN
    EXECUTE '
      UPDATE "Contact"
      SET
        "mobile" = COALESCE(NULLIF("mobile", ''''), NULLIF("phone", '''')),
        "role" = COALESCE("type"::TEXT::"ContactRole", "role"),
        "address" = COALESCE(NULLIF("address", ''''), NULLIF("propertyAddress", '''')),
        "notes" = COALESCE(NULLIF("notes", ''''), NULLIF("aiSummary", '''')),
        "avatarUrl" = COALESCE(NULLIF("avatarUrl", ''''), NULLIF("profileImageUrl", '''')),
        "country" = COALESCE(NULLIF("country", ''''), ''United Kingdom'')
    ';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Contact'
      AND column_name = 'pendingTone'
      AND udt_name <> 'PendingTone'
  ) THEN
    ALTER TABLE "Contact"
      ALTER COLUMN "pendingTone" TYPE "PendingTone"
      USING (
        CASE UPPER(COALESCE("pendingTone"::TEXT, 'NEUTRAL'))
          WHEN 'DANGER' THEN 'DANGER'::"PendingTone"
          WHEN 'WARNING' THEN 'WARNING'::"PendingTone"
          WHEN 'SUCCESS' THEN 'SUCCESS'::"PendingTone"
          ELSE 'NEUTRAL'::"PendingTone"
        END
      );
  END IF;
END $$;

ALTER TABLE "Contact" ALTER COLUMN "pendingTone" SET DEFAULT 'NEUTRAL';
ALTER TABLE "Contact" ALTER COLUMN "pendingTone" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "Contact_email_key" ON "Contact"("email");
CREATE INDEX IF NOT EXISTS "Contact_role_idx" ON "Contact"("role");

CREATE TABLE IF NOT EXISTS "SellIntent" (
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

CREATE TABLE IF NOT EXISTS "ValuationAppointment" (
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

CREATE TABLE IF NOT EXISTS "ContactTimelineEntry" (
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

CREATE TABLE IF NOT EXISTS "ContactAiInsight" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "body" TEXT NOT NULL,
  "icon" VARCHAR(40) NOT NULL DEFAULT 'zap',
  "tone" VARCHAR(40) NOT NULL DEFAULT 'green',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactAiInsight_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ContactAiChatMessage" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "role" VARCHAR(40) NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactAiChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ContactDocument" (
  "id" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "url" TEXT NOT NULL,
  "type" VARCHAR(80),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "SellIntent_contactId_idx" ON "SellIntent"("contactId");
CREATE INDEX IF NOT EXISTS "ValuationAppointment_contactId_idx" ON "ValuationAppointment"("contactId");
CREATE INDEX IF NOT EXISTS "ValuationAppointment_sellIntentId_idx" ON "ValuationAppointment"("sellIntentId");
CREATE INDEX IF NOT EXISTS "ValuationAppointment_agentId_idx" ON "ValuationAppointment"("agentId");
CREATE INDEX IF NOT EXISTS "ValuationAppointment_scheduledAt_idx" ON "ValuationAppointment"("scheduledAt");
CREATE INDEX IF NOT EXISTS "ContactTimelineEntry_contactId_idx" ON "ContactTimelineEntry"("contactId");
CREATE INDEX IF NOT EXISTS "ContactTimelineEntry_occurredAt_idx" ON "ContactTimelineEntry"("occurredAt");
CREATE INDEX IF NOT EXISTS "ContactAiInsight_contactId_idx" ON "ContactAiInsight"("contactId");
CREATE INDEX IF NOT EXISTS "ContactAiChatMessage_contactId_idx" ON "ContactAiChatMessage"("contactId");
CREATE INDEX IF NOT EXISTS "ContactDocument_contactId_idx" ON "ContactDocument"("contactId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Contact_assignedAgentId_fkey') THEN
    ALTER TABLE "Contact" ADD CONSTRAINT "Contact_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SellIntent_contactId_fkey') THEN
    ALTER TABLE "SellIntent" ADD CONSTRAINT "SellIntent_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ValuationAppointment_contactId_fkey') THEN
    ALTER TABLE "ValuationAppointment" ADD CONSTRAINT "ValuationAppointment_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ValuationAppointment_sellIntentId_fkey') THEN
    ALTER TABLE "ValuationAppointment" ADD CONSTRAINT "ValuationAppointment_sellIntentId_fkey" FOREIGN KEY ("sellIntentId") REFERENCES "SellIntent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ValuationAppointment_agentId_fkey') THEN
    ALTER TABLE "ValuationAppointment" ADD CONSTRAINT "ValuationAppointment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContactTimelineEntry_contactId_fkey') THEN
    ALTER TABLE "ContactTimelineEntry" ADD CONSTRAINT "ContactTimelineEntry_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContactAiInsight_contactId_fkey') THEN
    ALTER TABLE "ContactAiInsight" ADD CONSTRAINT "ContactAiInsight_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContactAiChatMessage_contactId_fkey') THEN
    ALTER TABLE "ContactAiChatMessage" ADD CONSTRAINT "ContactAiChatMessage_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ContactDocument_contactId_fkey') THEN
    ALTER TABLE "ContactDocument" ADD CONSTRAINT "ContactDocument_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
