import "server-only";
import createClient, { type Client } from "openapi-fetch";
import type { paths } from "./schema";

let client: Client<paths> | undefined;

/**
 * FastAPI client, created on first use. Checking the URL here rather than at
 * import keeps `next build` working, since compose sets it only at runtime.
 */
export function api(): Client<paths> {
  if (!client) {
    // Server-to-server address of FastAPI (http://api:8000 inside compose). Never
    // NEXT_PUBLIC_: the browser reaches FastAPI only through the message WebSocket.
    const baseUrl = process.env.API_INTERNAL_URL;
    if (!baseUrl) {
      throw new Error("API_INTERNAL_URL is not set");
    }
    client = createClient<paths>({ baseUrl });
  }
  return client;
}
