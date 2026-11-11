import { build } from 'esbuild';

// Bundles the console into public/, which `twenty apply` uploads with the app.
build({
  entryPoints: ['console/main.tsx'],
  outfile: 'public/console/app.js',
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2020',
  jsx: 'automatic',
  loader: { '.css': 'text' },
  alias: { 'node:crypto': './console/crypto-shim.ts' },
  define: { 'process.env.NODE_ENV': '"production"' },
  logLevel: 'info',
}).catch(() => process.exit(1));
