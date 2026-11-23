import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

const generated = new Set(['.git', 'node_modules', '.next', '.cache', 'dist', 'coverage', 'out'])
// Inspect names only. Never open environment files or follow source symlinks.
export async function assertCleanSourceEnvironment(root) {
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (generated.has(entry.name)) continue
      if (entry.name.startsWith('.env') && entry.name !== '.env.example') {
        throw new Error('VERIFY_IN_CLEAN_SNAPSHOT: private environment files are present; their contents were not read.')
      }
      if (entry.isDirectory() && !entry.isSymbolicLink()) await visit(join(directory, entry.name))
    }
  }
  await visit(root)
}
