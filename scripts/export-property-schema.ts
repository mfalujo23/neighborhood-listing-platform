import { writeFileSync } from 'node:fs'
import { z } from 'zod'
import { PropertySchema } from '../src/schemas/property'

const schema = z.toJSONSchema(PropertySchema, { target: 'draft-7' })
const destination = new URL('../src/schemas/property.schema.json', import.meta.url)
writeFileSync(destination, `${JSON.stringify(schema, null, 2)}\n`)
console.log('Generated src/schemas/property.schema.json from the canonical Zod contract.')
