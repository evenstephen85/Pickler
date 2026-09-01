import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// GitHub Pages serves this app from /<repo-name>/, but a Capacitor-wrapped
// native build loads files from the device's local filesystem and needs
// root-relative asset paths instead. `npm run build:native` sets CAP_BUILD
// to switch modes.
const repoBase = '/Pickler/'

export default defineConfig({
  plugins: [react()],
  base: process.env.CAP_BUILD ? '/' : repoBase,
})
