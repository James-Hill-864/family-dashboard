-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FamilyMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleCalendarId" TEXT,
    "googleTokenExpiry" DATETIME,
    "phoneNumber" TEXT,
    "notificationPrefs" TEXT DEFAULT '{}',
    "email" TEXT,
    "agendaEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "agendaEmailTime" TEXT DEFAULT '07:00',
    "eventReminderMinutes" INTEGER NOT NULL DEFAULT 30,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FamilyMember" ("agendaEmailEnabled", "agendaEmailTime", "color", "createdAt", "email", "emoji", "googleAccessToken", "googleCalendarId", "googleRefreshToken", "googleTokenExpiry", "id", "name", "notificationPrefs", "phoneNumber", "role", "sortOrder", "updatedAt") SELECT "agendaEmailEnabled", "agendaEmailTime", "color", "createdAt", "email", "emoji", "googleAccessToken", "googleCalendarId", "googleRefreshToken", "googleTokenExpiry", "id", "name", "notificationPrefs", "phoneNumber", "role", "sortOrder", "updatedAt" FROM "FamilyMember";
DROP TABLE "FamilyMember";
ALTER TABLE "new_FamilyMember" RENAME TO "FamilyMember";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
