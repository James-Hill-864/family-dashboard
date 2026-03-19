-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trackingNumber" TEXT NOT NULL,
    "carrier" TEXT NOT NULL DEFAULT 'auto',
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastUpdate" TEXT,
    "estimatedDelivery" TEXT,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "addedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
