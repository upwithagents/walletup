/**
 * Wallet (BudgetBakers) provider — the app's read layer for finance data.
 *
 * Speaks MCP over Streamable HTTP to the official remote server (the same
 * one interactive sessions use), authenticated with the API token. This is
 * the ONLY module that knows Wallet specifics; keep other packages
 * provider-agnostic.
 *
 * READ-ONLY by design: no create/patch/delete wrappers exist here on
 * purpose. Mutations flow through the review-queue apply step.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface WalletProviderOptions {
  url?: string;
  token?: string;
}

interface ToolResult {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: unknown;
  isError?: boolean;
}

export class WalletProvider {
  private client: Client | null = null;
  private readonly url: string;
  private readonly token: string;

  constructor(opts: WalletProviderOptions = {}) {
    const url = opts.url ?? process.env.WALLET_MCP_URL;
    const token = opts.token ?? process.env.MCP_TOKEN;
    if (!url || !token) {
      throw new Error("WalletProvider needs WALLET_MCP_URL and MCP_TOKEN (see .env)");
    }
    this.url = url;
    this.token = token;
  }

  private async connect(): Promise<Client> {
    if (this.client) return this.client;
    const client = new Client({ name: "walletup-provider", version: "0.0.1" });
    const transport = new StreamableHTTPClientTransport(new URL(this.url), {
      requestInit: {
        headers: { Authorization: `Bearer ${this.token}` },
      },
    });
    await client.connect(transport);
    this.client = client;
    return client;
  }

  async close(): Promise<void> {
    await this.client?.close();
    this.client = null;
  }

  /** Call a wallet tool; the server returns typed structuredContent. */
  private async call<T>(tool: string, args: Record<string, unknown> = {}): Promise<T> {
    const client = await this.connect();
    const result = (await client.callTool({ name: tool, arguments: args })) as ToolResult;
    const text = result.content?.find((c) => c.type === "text")?.text;
    if (result.isError) {
      throw new Error(`wallet tool ${tool} failed: ${text ?? "unknown error"}`);
    }
    if (result.structuredContent !== undefined) return result.structuredContent as T;
    if (text) return JSON.parse(text) as T;
    throw new Error(`wallet tool ${tool} returned no content`);
  }

  getClientProfile() {
    return this.call<{
      baseCurrency: string;
      syncState: string;
      grantedScopes: string[];
    }>("get_client_profile");
  }

  getAccounts(args: { limit?: number; offset?: number; archived?: boolean } = {}) {
    return this.call<{
      accounts: Array<{
        id: string;
        name: string;
        accountType: string;
        archived: boolean;
        excludeFromStats: boolean;
        isBankSync: boolean;
        balance: { currencyCode: string; currentBalance: number };
        recordStats?: { recordCount: number; lastUpdatedAt?: string };
      }>;
      total: number;
      nextOffset?: number;
      _meta?: { syncedAt?: string };
    }>("get_accounts", { limit: 20, ...args });
  }

  getBudgets(args: { limit?: number; offset?: number; spending?: string } = {}) {
    return this.call<{
      budgets: Array<{
        id: string;
        name: string;
        limit: number | null;
        type: string;
        closed: boolean;
        spending?: {
          current?: {
            period: string;
            limit: number;
            spent: number;
            remaining: number;
            overspent: number;
            progress: number;
          };
        };
      }>;
      total: number;
      nextOffset?: number;
    }>("get_budgets", { limit: 20, spending: "current", ...args });
  }

  getRecordsAggregation(args: Record<string, unknown>) {
    return this.call<{ results: Array<Record<string, unknown>> }>(
      "get_records_aggregation",
      args,
    );
  }

  getRecords(args: Record<string, unknown> = {}) {
    return this.call<{ records: Array<Record<string, unknown>>; total: number }>(
      "get_records",
      args,
    );
  }

  /** Uncategorized backlog since a date — the categorization agent's input. */
  uncategorized(sinceIso: string) {
    return this.getRecords({
      categoryId: ["unknown"],
      recordDate: [`gte.${sinceIso}`],
      limit: 400,
      sortBy: ["-recordDate"],
    });
  }
}
