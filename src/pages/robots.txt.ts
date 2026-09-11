import type { APIRoute } from "astro";
import { robotsTxt } from "../lib/docs";

export const prerender = true;

export const GET: APIRoute = () =>
  new Response(robotsTxt(), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
