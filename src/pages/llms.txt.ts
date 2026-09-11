import type { APIRoute } from "astro";
import { llmsTxt } from "../lib/docs";

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(llmsTxt(), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
