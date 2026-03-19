-- AlterTable: Add Google Calendar fields to FamilyMember
ALTER TABLE "FamilyMember" ADD COLUMN "googleAccessToken" TEXT;
ALTER TABLE "FamilyMember" ADD COLUMN "googleRefreshToken" TEXT;
ALTER TABLE "FamilyMember" ADD COLUMN "googleCalendarId" TEXT;
ALTER TABLE "FamilyMember" ADD COLUMN "googleTokenExpiry" DATETIME;

-- AlterTable: Add Google Calendar tracking to CalendarEvent
ALTER TABLE "CalendarEvent" ADD COLUMN "googleEventId" TEXT;
ALTER TABLE "CalendarEvent" ADD COLUMN "source" TEXT DEFAULT 'local';
