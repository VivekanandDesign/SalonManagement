-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MessageType" ADD VALUE 'RESCHEDULE';
ALTER TYPE "MessageType" ADD VALUE 'CANCELLATION';
ALTER TYPE "MessageType" ADD VALUE 'NO_SHOW_FOLLOWUP';

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "cancellationTemplate" TEXT,
ADD COLUMN     "confirmationTemplate" TEXT,
ADD COLUMN     "noShowFollowupTemplate" TEXT,
ADD COLUMN     "rescheduleTemplate" TEXT;
