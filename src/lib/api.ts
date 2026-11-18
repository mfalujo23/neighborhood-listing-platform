import { PropertySchema } from '../schemas/property'

export { PropertySchema } from '../schemas/property'

export function parsePropertyPayload(data: unknown) {
  return PropertySchema.parse(data)
}
