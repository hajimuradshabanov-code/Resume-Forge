import { ok } from "@/lib/api";
import { isAiConfigured } from "@/server/ai";

export async function GET() {
  return ok({ configured: isAiConfigured() });
}
