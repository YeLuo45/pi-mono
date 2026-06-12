/**
 * V121 Custom Role Templates - Type Definitions
 */

export interface RoleTemplate {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  compatibleTaskTypes: string[];
  icon?: string;           // Emoji or icon name
  color?: string;           // Hex color code
  category: 'collaboration' | 'tool' | 'analysis' | 'creative' | 'utility';
  tags: string[];
  version: number;
  author?: string;
  isBuiltIn: boolean;
  rating: number;          // 0-5
  usageCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface RoleTemplateValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RoleTemplateExport {
  version: string;
  exportedAt: number;
  templates: RoleTemplate[];
}

export interface RoleTemplateFilter {
  category?: RoleTemplate['category'];
  tags?: string[];
  searchQuery?: string;
  minRating?: number;
  sortBy: 'name' | 'rating' | 'usageCount' | 'updatedAt';
  sortOrder: 'asc' | 'desc';
  limit: number;
  offset: number;
}
