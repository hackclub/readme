import { defineMiddleware } from "astro:middleware";
import { negotiateResponse } from "./lib/negotiation";

export const onRequest = defineMiddleware((context, next) => {
  if (context.isPrerendered) return next();
  return negotiateResponse(context.request, () => Promise.resolve(next()));
});
