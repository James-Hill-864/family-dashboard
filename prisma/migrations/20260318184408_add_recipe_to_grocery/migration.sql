-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_GroceryItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "quantity" TEXT,
    "unit" TEXT,
    "category" TEXT NOT NULL DEFAULT 'Other',
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "addedBy" TEXT,
    "mealPlanId" TEXT,
    "recipeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroceryItem_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_GroceryItem" ("addedBy", "category", "checked", "createdAt", "id", "mealPlanId", "name", "quantity", "unit", "updatedAt") SELECT "addedBy", "category", "checked", "createdAt", "id", "mealPlanId", "name", "quantity", "unit", "updatedAt" FROM "GroceryItem";
DROP TABLE "GroceryItem";
ALTER TABLE "new_GroceryItem" RENAME TO "GroceryItem";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
