/*
  Warnings:

  - The primary key for the `AuthState` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AuthState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_AuthState" ("createdAt", "expiresAt", "id", "sessionId", "token") SELECT "createdAt", "expiresAt", "id", "sessionId", "token" FROM "AuthState";
DROP TABLE "AuthState";
ALTER TABLE "new_AuthState" RENAME TO "AuthState";
CREATE UNIQUE INDEX "AuthState_token_key" ON "AuthState"("token");
CREATE UNIQUE INDEX "AuthState_sessionId_key" ON "AuthState"("sessionId");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
