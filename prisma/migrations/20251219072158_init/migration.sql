-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('GOOGLE_CALENDAR', 'AWS', 'GCP', 'SLACK', 'AZURE', 'OTHER');

-- CreateEnum
CREATE TYPE "Actions" AS ENUM ('START', 'STOP');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('PENDING', 'COMPLETED', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "userID" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "avatar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signal" (
    "id" SERIAL NOT NULL,
    "signalID" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "signalName" TEXT,
    "userID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT NOT NULL,

    CONSTRAINT "Signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compute" (
    "id" SERIAL NOT NULL,
    "computeID" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "computeName" TEXT,
    "provider" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT NOT NULL,

    CONSTRAINT "Compute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trigger" (
    "id" SERIAL NOT NULL,
    "triggerID" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "signalID" TEXT,
    "computeID" TEXT,
    "triggerWord" TEXT NOT NULL,
    "triggerName" TEXT NOT NULL,
    "startOffsetMinutes" INTEGER NOT NULL DEFAULT 5,
    "stopOffsetMinutes" INTEGER NOT NULL DEFAULT 2,
    "timezone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Trigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLogger" (
    "id" SERIAL NOT NULL,
    "userID" TEXT NOT NULL,
    "eventID" TEXT NOT NULL,
    "computeID" TEXT,
    "signalID" TEXT,
    "triggerID" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventDesc" TEXT NOT NULL,
    "eventStart" TIMESTAMP(3) NOT NULL,
    "eventEnd" TIMESTAMP(3) NOT NULL,
    "action" "Actions" NOT NULL,
    "status" "Status" NOT NULL,
    "qstashId" TEXT,

    CONSTRAINT "EventLogger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_userID_key" ON "User"("userID");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Signal_signalID_key" ON "Signal"("signalID");

-- CreateIndex
CREATE UNIQUE INDEX "Compute_computeID_key" ON "Compute"("computeID");

-- CreateIndex
CREATE UNIQUE INDEX "Trigger_triggerID_key" ON "Trigger"("triggerID");

-- CreateIndex
CREATE INDEX "Trigger_triggerWord_idx" ON "Trigger"("triggerWord");

-- CreateIndex
CREATE UNIQUE INDEX "EventLogger_eventID_key" ON "EventLogger"("eventID");

-- AddForeignKey
ALTER TABLE "Signal" ADD CONSTRAINT "Signal_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Compute" ADD CONSTRAINT "Compute_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trigger" ADD CONSTRAINT "Trigger_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trigger" ADD CONSTRAINT "Trigger_signalID_fkey" FOREIGN KEY ("signalID") REFERENCES "Signal"("signalID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trigger" ADD CONSTRAINT "Trigger_computeID_fkey" FOREIGN KEY ("computeID") REFERENCES "Compute"("computeID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLogger" ADD CONSTRAINT "EventLogger_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("userID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLogger" ADD CONSTRAINT "EventLogger_computeID_fkey" FOREIGN KEY ("computeID") REFERENCES "Compute"("computeID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLogger" ADD CONSTRAINT "EventLogger_signalID_fkey" FOREIGN KEY ("signalID") REFERENCES "Signal"("signalID") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLogger" ADD CONSTRAINT "EventLogger_triggerID_fkey" FOREIGN KEY ("triggerID") REFERENCES "Trigger"("triggerID") ON DELETE CASCADE ON UPDATE CASCADE;
