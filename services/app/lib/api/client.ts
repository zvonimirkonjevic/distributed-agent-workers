import "server-only";
import createClient from "openapi-fetch";
import type { paths } from "./schema";

// Server-to-server address of FastAPI (http://api:8000 inside compose). Read at
// runtime and never NEXT_PUBLIC_, since the browser must not call FastAPI directly.
const baseUrl = process.env.API_INTERNAL_URL;
if (!baseUrl) {
  throw new Error("API_INTERNAL_URL is not set");
}

export const api = createClient<paths>({ baseUrl });
