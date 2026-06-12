/**
 * Entity Extractor — Named Entity Recognition for Knowledge Base
 * 
 * Extracts named entities (persons, locations, concepts, etc.) from text
 * using pattern matching and heuristics. No external AI API required.
 */

import type { NamedEntity, EntityType } from './v87Types';

/**
 * Patterns for entity extraction.
 */
const PATTERNS: Record<EntityType, RegExp[]> = {
  person: [
    /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g,  // John Smith
    /\b(Dr\.|Professor|Mr\.|Mrs\.|Ms\.)\s+[A-Z][a-z]+/g,
  ],
  location: [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:City|Town|Village|County|State|Country|Region)/g,
    /\b(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g,
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\b/g,  // City, CA
  ],
  organization: [
    /\b([A-Z][a-z]*(?:\s+[A-Z][a-z]*)*)\s+(?:Inc\.|Corp\.|LLC|Company|Co\.|Ltd\.|L\.P\.|GmbH|PLC)/g,
    /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:University|Institute|School|College|Hospital|Museum)/g,
  ],
  date: [
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g,
    /\b((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4})\b/gi,
    /\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s+\d{4})\b/gi,
    /\b(\d{4})\b/g,  // Year standalone
  ],
  event: [
    /\b(?:the\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Conference|Summit|Symposium|Workshop|Meeting|Event|Festival)/g,
  ],
  concept: [
    // Technology/concept terms
    /\b(AI|ML|NLP|Machine Learning|Deep Learning|Natural Language Processing|Blockchain|Cloud Computing)\b/gi,
    // General concepts in quotes or specific formatting
    /\"\s*([^\"]+)\s*\"/g,
    /\'\s*([^\']+)\s*\'/g,
  ],
};

/**
 * Simple hash-based deduplication.
 */
function simpleHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Extract all named entities from text.
 */
export function extractEntities(text: string): NamedEntity[] {
  const entities: NamedEntity[] = [];
  const seen: Map<string, boolean> = new Map();

  for (const [type, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns) {
      // Reset regex lastIndex
      pattern.lastIndex = 0;
      
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const entityText = (match[1] || match[0]).trim();
        
        // Skip if too short or too long
        if (entityText.length < 2 || entityText.length > 100) continue;
        
        // Skip if already seen (fuzzy dedup)
        const hash = simpleHash(entityText.toLowerCase());
        if (seen.has(hash)) continue;
        seen.set(hash, true);

        entities.push({
          text: entityText,
          type: type as EntityType,
          confidence: calculateConfidence(entityText, type as EntityType, text),
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }
  }

  // Sort by start index
  entities.sort((a, b) => a.startIndex - b.startIndex);

  return entities;
}

/**
 * Calculate confidence score for an entity.
 */
function calculateConfidence(text: string, type: EntityType, context: string): number {
  let confidence = 0.5;

  // Higher confidence if well-formed
  if (type === 'person' && /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(text)) {
    confidence += 0.3;
  }
  if (type === 'location' && /\b[A-Z]/.test(text)) {
    confidence += 0.2;
  }
  if (type === 'date') {
    confidence += 0.3;
  }
  if (type === 'concept') {
    confidence += 0.3;
  }

  // Context-based adjustments
  const lowerContext = context.toLowerCase();
  if (lowerContext.includes(text.toLowerCase() + ' said') ||
      lowerContext.includes(text.toLowerCase() + ' stated') ||
      lowerContext.includes(text.toLowerCase() + ' explained')) {
    if (type === 'person') confidence += 0.1;
  }

  return Math.min(1, confidence);
}

/**
 * Extract unique entity types from a list of entities.
 */
export function groupEntitiesByType(entities: NamedEntity[]): Record<EntityType, NamedEntity[]> {
  const grouped: Record<EntityType, NamedEntity[]> = {
    person: [],
    location: [],
    concept: [],
    organization: [],
    date: [],
    event: [],
  };

  for (const entity of entities) {
    grouped[entity.type].push(entity);
  }

  return grouped;
}

/**
 * Get entity statistics for a document.
 */
export function getEntityStats(entities: NamedEntity[]): {
  total: number;
  byType: Record<EntityType, number>;
  topEntities: Array<{ text: string; type: EntityType; count: number }>;
} {
  const byType: Record<EntityType, number> = {
    person: 0,
    location: 0,
    concept: 0,
    organization: 0,
    date: 0,
    event: 0,
  };

  const entityCounts: Map<string, { text: string; type: EntityType; count: number }> = new Map();

  for (const entity of entities) {
    byType[entity.type]++;
    
    const key = `${entity.type}:${entity.text.toLowerCase()}`;
    const existing = entityCounts.get(key);
    if (existing) {
      existing.count++;
    } else {
      entityCounts.set(key, { text: entity.text, type: entity.type, count: 1 });
    }
  }

  const topEntities = Array.from(entityCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    total: entities.length,
    byType,
    topEntities,
  };
}
