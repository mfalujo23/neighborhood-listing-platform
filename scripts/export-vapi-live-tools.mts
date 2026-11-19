import { mkdir, writeFile } from 'node:fs/promises'
import { liveToolDefinitions } from '../src/voice/live/contracts.ts'

const tools = liveToolDefinitions.map(({ name, description, parameters }) => {
  const { $schema: _draft, ...providerParameters } = parameters
  void _draft
  return {
    type: 'function', async: false,
    function: { name, description, strict: true, parameters: providerParameters },
    server: {
      url: 'https://replace-with-your-public-host.example/api/voice/tools',
      credentialId: 'REPLACE_WITH_ACTUAL_SAVED_CREDENTIAL_ID',
      timeoutSeconds: 10,
    },
  }
})
await mkdir('config', { recursive: true })
await writeFile('config/mfalujo23-vapi-live-tools.json', JSON.stringify(tools, null, 2) + '\n')
console.log('Exported3strict live tool templates; server URL and credential ID still require real configuration.')
