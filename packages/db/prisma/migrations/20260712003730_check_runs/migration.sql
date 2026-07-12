-- CreateTable
CREATE TABLE "CheckRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CheckResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "runId" TEXT NOT NULL,
    "checkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "remedy" TEXT,
    CONSTRAINT "CheckResult_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CheckRun" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
