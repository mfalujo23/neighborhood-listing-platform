import rawProperties from '../../data/generated/gemini-ai-studio-seed-attempt2.json'
import { PropertySchema, validatePropertyCollection } from '../schemas/property'

export function findSyntheticProperty(propertyId: unknown, input: unknown = rawProperties) {
  const id = PropertySchema.shape.property_id.safeParse(propertyId)
  if (!id.success) return undefined

  const properties = validatePropertyCollection(input)
  if (!properties.success) return undefined

  return properties.data.find(property => property.property_id.toLowerCase() === id.data.toLowerCase())
}

export function syntheticPropertyIds() {
  const properties = validatePropertyCollection(rawProperties)
  return properties.success ? properties.data.map(property => property.property_id) : []
}
