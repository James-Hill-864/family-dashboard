-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ingredients" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "prepTime" INTEGER,
    "cookTime" INTEGER,
    "servings" INTEGER,
    "category" TEXT NOT NULL DEFAULT 'dinner',
    "imageUrl" TEXT,
    "sourceUrl" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT,
    "addedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "FamilyMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SentEmail" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "sentAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FamilyMember" ("color", "createdAt", "emoji", "googleAccessToken", "googleCalendarId", "googleRefreshToken", "googleTokenExpiry", "id", "name", "notificationPrefs", "phoneNumber", "role", "updatedAt") SELECT "color", "createdAt", "emoji", "googleAccessToken", "googleCalendarId", "googleRefreshToken", "googleTokenExpiry", "id", "name", "notificationPrefs", "phoneNumber", "role", "updatedAt" FROM "FamilyMember";
DROP TABLE "FamilyMember";
ALTER TABLE "new_FamilyMember" RENAME TO "FamilyMember";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "SentEmail_key_key" ON "SentEmail"("key");
