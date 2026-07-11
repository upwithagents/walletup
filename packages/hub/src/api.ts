import http from "node:http";
import type { Client } from "discord.js";
import { prisma } from "@walletup/db";
import { sendAsAgent } from "./discord";
import { env } from "./env";

type OnReady = (agentId: string) => Promise<void>;

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
  });
}

export function startApi(client: Client, onReady: OnReady) {
  const server = http.createServer(async (req, res) => {
    try {
      const match = req.url?.match(/^\/agents\/([^/]+)\/(reply|ready)$/);
      if (!match || req.method !== "POST") {
        res.writeHead(404).end("not found");
        return;
      }
      const [, agentId, action] = match;
      const agent = await prisma.hubAgent.findUnique({ where: { id: agentId } });
      if (!agent) {
        res.writeHead(404).end("unknown agent");
        return;
      }

      if (action === "reply") {
        const { channel_id, content } = JSON.parse(await readBody(req)) as {
          channel_id: string;
          content: string;
        };
        await sendAsAgent(client, agent, channel_id, content);
        await prisma.hubAgent.update({
          where: { id: agent.id },
          data: { status: "ready" },
        });
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      // action === "ready"
      console.log(`[api] agent ${agent.name} adapter ready`);
      await prisma.hubAgent.update({
        where: { id: agent.id },
        data: { status: "ready" },
      });
      await onReady(agent.id);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
    } catch (e) {
      console.error(`[api] error: ${e}`);
      res.writeHead(500).end(String(e));
    }
  });

  server.listen(env.hubPort, "127.0.0.1", () => {
    console.log(`[api] listening on 127.0.0.1:${env.hubPort}`);
  });
  return server;
}
