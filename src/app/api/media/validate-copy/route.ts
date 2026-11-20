import { fictionalSponsorBrief } from '../../../../media/copy-drafts'
import { validateCopyRequest } from '../../../../media/http'

export async function POST(request: Request) { return validateCopyRequest(request, fictionalSponsorBrief) }
