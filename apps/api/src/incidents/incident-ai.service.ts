import { Injectable } from '@nestjs/common';
import { IncidentCategory } from '@prisma/client';

export type IncidentDraft = { draft: string; category: IncidentCategory; missingInformation: string[] };

@Injectable()
export class IncidentAiService {
  /**
   * Provider boundary for an LLM. This safe local implementation keeps the API usable
   * without an AI key; a future provider can implement the same output contract.
   */
  draft(rawDescription: string): IncidentDraft {
    const cleaned = rawDescription.trim().replace(/\s+/g, ' ');
    const lower = cleaned.toLowerCase();
    const category = lower.includes('fare') || lower.includes('overcharg') ? IncidentCategory.OVERCHARGING : lower.includes('harass') ? IncidentCategory.HARASSMENT : lower.includes('accident') || lower.includes('unsafe') || lower.includes('threat') ? IncidentCategory.SAFETY : lower.includes('brake') || lower.includes('vehicle') ? IncidentCategory.VEHICLE : IncidentCategory.OTHER;
    const missingInformation: string[] = [];
    if (!/\b\d{1,2}:\d{2}\b/.test(cleaned)) missingInformation.push('Approximate time of the incident');
    if (!/(plate|pl\.?\s*no|vehicle)/i.test(cleaned)) missingInformation.push('Vehicle plate number or QR verification details');
    if (!/(where|at|near|location|trinidad)/i.test(cleaned)) missingInformation.push('Location where it happened');
    return { draft: `Incident summary: ${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}${/[.!?]$/.test(cleaned) ? '' : '.'}`, category, missingInformation };
  }
}
