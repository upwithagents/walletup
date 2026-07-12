-- CreateTable
CREATE TABLE "MonthEvaluation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" TEXT NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incomeTotal" REAL NOT NULL,
    "expenseTotal" REAL NOT NULL,
    "balance" REAL NOT NULL,
    "budgetPoints" INTEGER,
    "pointsMethod" TEXT
);

-- CreateTable
CREATE TABLE "EvaluationRow" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "evaluationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "aim" REAL,
    "actual" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'CZK',
    "progress" REAL,
    CONSTRAINT "EvaluationRow_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "MonthEvaluation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MonthEvaluation_month_key" ON "MonthEvaluation"("month");
