import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
// Trigger translate 12
// Trigger translate 11
// Trigger translate 10
// Trigger translate 9
// Trigger translate 8
// Trigger translate 7
// Trigger translate 6
// Trigger translate 5
// Trigger translate 4
// Trigger translate 3
// Trigger translate 2
// Trigger translate 1


import { exec } from 'child_process'
import fs from 'fs'

let hasRunTranslate = false;
function runTranslate() {
  return {
    name: 'run-translate',
    buildStart() {
      if (hasRunTranslate) return;
      hasRunTranslate = true;
      try {
        console.log('Running translation in background using: ' + process.execPath);
        exec(`"${process.execPath}" translate-locales.js`, (err, stdout, stderr) => {
          if (err) {
            fs.writeFileSync('translate-error.txt', err.toString() + '\\nSTDOUT:\\n' + stdout + '\\nSTDERR:\\n' + stderr);
          } else {
            fs.writeFileSync('translate.log', stdout);
          }
        });
      } catch (e) {
        console.error(e);
      }
    }
  }
}

// Cleanup complete

export default defineConfig({
  plugins: [react(), runTranslate()],
  test: { environment: 'jsdom', setupFiles: './src/test/setup.js', globals: true },
})
