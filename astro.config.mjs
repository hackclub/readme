// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from "@tailwindcss/vite";
import mdx from '@astrojs/mdx';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://readme.hackclub.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  session: false,
  integrations: [mdx()],

  vite: {
    plugins: [tailwindcss()],
  },
});
