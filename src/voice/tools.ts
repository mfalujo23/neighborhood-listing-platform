import { z } from 'zod';
import { demoProperties, demoSponsors, FACTS_VERSION, sponsorCategories, type DemoProperty, type DemoSponsor } from './fixtures';

const propertyId = z.string().regex(/^demo-\d{3}$/);
export const propertyDetailsInput = z.union([
  z.strictObject({ property_id: propertyId }),
  z.strictObject({ address: z.string().trim().min(4).max(160) }),
]);
export const nearbySponsorsInput = z.strictObject({
  zip: z.string().regex(/^\d{5}$/), category: z.enum(sponsorCategories).optional(),
});
export const agentFollowupInput = z.strictObject({
  consent: z.literal(true), property_id: propertyId,
  preferred_channel: z.enum(['email', 'phone']),
});

export const toolNames = ['get_property_details', 'get_nearby_sponsors', 'request_agent_followup'] as const;
export type ToolName = typeof toolNames[number];
export type Fault = 'none' | 'tool-timeout' | 'provider-unavailable' | 'human-unavailable';
export type ToolData =
  | { kind: 'property'; property: DemoProperty; factsVersion: string }
  | { kind: 'sponsors'; sponsors: DemoSponsor[]; disclosure: string; factsVersion: string }
  | { kind: 'followup-draft'; submitted: false; property_id: string; consent: true; preferred_channel: 'email' | 'phone' };
export type ToolResult =
  | { ok: true; data: ToolData }
  | { ok: false; error: { code: 'INVALID_ARGUMENTS' | 'NOT_FOUND' | 'TIMEOUT' | 'PROVIDER_UNAVAILABLE' | 'HUMAN_UNAVAILABLE'; message: string } };

// JSON Schema comes from the exact runtime validators, including strict object
// boundaries. The property union accepts an ID OR address, never both.
export const toolDefinitions = [
  { name: 'get_property_details', description: 'Return only a fictional approved listing, by exact ID or address.', parameters: z.toJSONSchema(propertyDetailsInput) },
  { name: 'get_nearby_sponsors', description: 'Return labeled fictional sponsored content for a five-digit ZIP and optional category.', parameters: z.toJSONSchema(nearbySponsorsInput) },
  { name: 'request_agent_followup', description: 'Validate an explicitly consented fictional follow-up draft. Never submits or contacts anyone.', parameters: z.toJSONSchema(agentFollowupInput) },
];

function failure(code: Extract<ToolResult, { ok: false }>['error']['code'], message: string): ToolResult {
  return { ok: false, error: { code, message } };
}

export function executeMockTool(name: ToolName, args: unknown, fault: Fault = 'none'): ToolResult {
  if (!toolNames.includes(name)) return failure('INVALID_ARGUMENTS', 'This tool name is outside the approved mock tool list.');
  if (fault === 'tool-timeout') return failure('TIMEOUT', 'Simulated tool timeout; no network request was attempted.');
  if (fault === 'provider-unavailable') return failure('PROVIDER_UNAVAILABLE', 'Simulated provider outage; no provider is connected.');

  if (name === 'get_property_details') {
    const parsed = propertyDetailsInput.safeParse(args);
    if (!parsed.success) return failure('INVALID_ARGUMENTS', 'Provide a property ID or an address, without extra fields.');
    const input = parsed.data;
    const property = demoProperties.find((item) => 'property_id' in input
      ? item.id === input.property_id
      : item.address.toLowerCase() === input.address.toLowerCase());
    return property ? { ok: true, data: { kind: 'property', property, factsVersion: FACTS_VERSION } }
      : failure('NOT_FOUND', 'This property is not in the fictional approved fact set.');
  }
  if (name === 'get_nearby_sponsors') {
    const parsed = nearbySponsorsInput.safeParse(args);
    if (!parsed.success) return failure('INVALID_ARGUMENTS', 'Provide a five-digit ZIP and an optional allowed category.');
    const { zip, category } = parsed.data;
    return {
      ok: true,
      data: {
        kind: 'sponsors', sponsors: demoSponsors.filter((item) => item.zip === zip && (!category || item.category === category)),
        disclosure: 'Sponsored: these fictional placements are advertising examples, separate from property facts.',
        factsVersion: FACTS_VERSION,
      },
    };
  }
  const parsed = agentFollowupInput.safeParse(args);
  if (!parsed.success) return failure('INVALID_ARGUMENTS', 'Explicit consent, a property ID, and a preferred channel are required.');
  if (!demoProperties.some((item) => item.id === parsed.data.property_id)) return failure('NOT_FOUND', 'Unknown fictional property.');
  if (fault === 'human-unavailable') return failure('HUMAN_UNAVAILABLE', 'Simulated human unavailability; no transfer or callback was placed.');
  return { ok: true, data: { kind: 'followup-draft', submitted: false, ...parsed.data } };
}
