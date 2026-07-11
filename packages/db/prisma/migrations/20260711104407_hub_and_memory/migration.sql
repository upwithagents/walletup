-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT,
    "source" TEXT NOT NULL,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HubAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "webhookId" TEXT,
    "webhookToken" TEXT,
    "sessionId" TEXT,
    "tmuxSession" TEXT,
    "adapterPort" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'offline',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChannelMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "discordId" TEXT,
    "channelId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "agentId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChannelMessage_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "HubAgent" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HubAgent_name_key" ON "HubAgent"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelMessage_discordId_key" ON "ChannelMessage"("discordId");

-- CreateIndex
CREATE INDEX "ChannelMessage_channelId_createdAt_idx" ON "ChannelMessage"("channelId", "createdAt");
