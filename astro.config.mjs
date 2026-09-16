// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';

const adapter = process.env.VERCEL
  ? vercel()
  : node({ mode: 'standalone' });

// https://astro.build/config
export default defineConfig({
  site: 'https://readme.hackclub.com',
  output: 'server',
  adapter,
  session: false,
  integrations: [mdx()],

  vite: {
    plugins: [tailwindcss()],
  },
});
