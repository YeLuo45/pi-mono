/**
 * RoleTemplateManager - CRUD for role templates with import/export
 */

import type { RoleTemplate, RoleTemplateFilter, RoleTemplateExport } from '../types';
import { createRoleTemplate, validateRoleTemplate, incrementUsageCount } from './RoleTemplate';

const STORAGE_KEY = 'agent_role_templates';

export class RoleTemplateManager {
  private templates: Map<string, RoleTemplate> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  create(data: Omit<RoleTemplate, 'id' | 'version' | 'usageCount' | 'createdAt' | 'updatedAt'>): { template?: RoleTemplate; error?: string } {
    const validation = validateRoleTemplate(data as RoleTemplate);
    if (!validation.valid) {
      return { error: validation.errors.join(', ') };
    }

    const template = createRoleTemplate(data);
    this.templates.set(template.id, template);
    this.saveToStorage();
    return { template };
  }

  get(id: string): RoleTemplate | undefined {
    return this.templates.get(id);
  }

  update(id: string, updates: Partial<RoleTemplate>): { template?: RoleTemplate; error?: string } {
    const existing = this.templates.get(id);
    if (!existing) return { error: 'Template not found' };
    if (existing.isBuiltIn) return { error: 'Cannot modify built-in template' };

    const updated = { ...existing, ...updates, id, updatedAt: Date.now(), version: existing.version + 1 };
    const validation = validateRoleTemplate(updated);
    if (!validation.valid) {
      return { error: validation.errors.join(', ') };
    }

    this.templates.set(id, updated);
    this.saveToStorage();
    return { template: updated };
  }

  delete(id: string): boolean {
    const template = this.templates.get(id);
    if (!template) return false;
    if (template.isBuiltIn) return false;
    this.templates.delete(id);
    this.saveToStorage();
    return true;
  }

  // ===========================================================================
  // Query Operations
  // ===========================================================================

  getAll(): RoleTemplate[] {
    return Array.from(this.templates.values());
  }

  filter(filter: RoleTemplateFilter): RoleTemplate[] {
    let results = Array.from(this.templates.values());

    if (filter.category) {
      results = results.filter(t => t.category === filter.category);
    }

    if (filter.tags && filter.tags.length > 0) {
      results = results.filter(t => filter.tags!.every(tag => t.tags.includes(tag)));
    }

    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      results = results.filter(t =>
        t.name.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (filter.minRating !== undefined) {
      results = results.filter(t => t.rating >= filter.minRating!);
    }

    // Sort
    results.sort((a, b) => {
      let cmp = 0;
      switch (filter.sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'rating': cmp = a.rating - b.rating; break;
        case 'usageCount': cmp = a.usageCount - b.usageCount; break;
        case 'updatedAt': cmp = a.updatedAt - b.updatedAt; break;
      }
      return filter.sortOrder === 'asc' ? cmp : -cmp;
    });

    return results.slice(filter.offset, filter.offset + filter.limit);
  }

  getByCategory(category: RoleTemplate['category']): RoleTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.category === category);
  }

  searchByCapability(capability: string): RoleTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.capabilities.includes(capability));
  }

  // ===========================================================================
  // Usage Tracking
  // ===========================================================================

  recordUsage(id: string): void {
    const template = this.templates.get(id);
    if (template) {
      this.templates.set(id, incrementUsageCount(template));
      this.saveToStorage();
    }
  }

  // ===========================================================================
  // Import/Export
  // ===========================================================================

  exportTemplates(ids?: string[]): RoleTemplateExport {
    const templates = ids
      ? ids.map(id => this.templates.get(id)).filter((t): t is RoleTemplate => !!t)
      : Array.from(this.templates.values()).filter(t => !t.isBuiltIn);

    return {
      version: '1.0',
      exportedAt: Date.now(),
      templates,
    };
  }

  importTemplates(exportData: RoleTemplateExport): { added: number; updated: number; errors: string[] } {
    const errors: string[] = [];
    let added = 0, updated = 0;

    for (const template of exportData.templates) {
      const validation = validateRoleTemplate(template);
      if (!validation.valid) {
        errors.push(`Template "${template.name}": ${validation.errors.join(', ')}`);
        continue;
      }

      const existing = this.templates.get(template.id);
      if (existing) {
        this.templates.set(template.id, { ...template, updatedAt: Date.now() });
        updated++;
      } else {
        this.templates.set(template.id, template);
        added++;
      }
    }

    this.saveToStorage();
    return { added, updated, errors };
  }

  exportToJSON(ids?: string[]): string {
    return JSON.stringify(this.exportTemplates(ids), null, 2);
  }

  importFromJSON(json: string): { added: number; updated: number; errors: string[] } {
    try {
      const data = JSON.parse(json) as RoleTemplateExport;
      if (!data.version || !data.templates || !Array.isArray(data.templates)) {
        return { added: 0, updated: 0, errors: ['Invalid export format'] };
      }
      return this.importTemplates(data);
    } catch (e) {
      return { added: 0, updated: 0, errors: [`Parse error: ${e}`] };
    }
  }

  // ===========================================================================
  // Persistence
  // ===========================================================================

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as RoleTemplate[];
        for (const t of data) {
          this.templates.set(t.id, t);
        }
      }
    } catch { /* ignore */ }
  }

  private saveToStorage(): void {
    try {
      const data = Array.from(this.templates.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* ignore */ }
  }
}
