import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { assertCleanSourceEnvironment } from '../../config/source-preflight.mjs'
const created: string[] = []
async function fixture() { const path = await mkdtemp(join(tmpdir(), 'codex-preflight-')); created.push(path); return path }
afterEach(async () => {
  for (const path of created.splice(0)) {
    if (!resolve(path).startsWith(resolve(tmpdir()) + sep + 'codex-preflight-')) throw Error('UNSAFE_TEMP_CLEANUP')
    await rm(path, { recursive: true, force: true })
  }
})
it('permits safe templates at root and nested source locations', async () => {
  const root = await fixture(); await mkdir(join(root, 'nested'))
  await writeFile(join(root, '.env.example'), 'SAFE_TEMPLATE=\n')
  await writeFile(join(root, 'nested', '.env.example'), 'SAFE_TEMPLATE=\n')
  await expect(assertCleanSourceEnvironment(root)).resolves.toBeUndefined()
})
it('rejects a nested private environment filename without reading its contents', async () => {
  const root = await fixture(); await mkdir(join(root, 'nested'))
  await writeFile(join(root, 'nested', '.env.local'), 'FICTIONAL_SENTINEL=true\n')
  await expect(assertCleanSourceEnvironment(root)).rejects.toThrow('VERIFY_IN_CLEAN_SNAPSHOT')
})
it('does not traverse generated dependency or build directories', async () => {
  const root = await fixture()
  for (const name of ['node_modules', '.next']) { await mkdir(join(root, name)); await writeFile(join(root, name, '.env.local'), 'FICTIONAL_SENTINEL=true\n') }
  await expect(assertCleanSourceEnvironment(root)).resolves.toBeUndefined()
})
