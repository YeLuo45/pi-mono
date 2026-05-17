/**
 * SearchAgent - Web and file search agent
 * 
 * Responsibilities:
 * - Execute web searches
 * - Search through indexed content
 * - Provide search results with relevance ranking
 */

import { BaseAgent } from './BaseAgent';
import type { AgentConfig, Task } from './types';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance: number;
  timestamp: number;
}

export class SearchAgent extends BaseAgent {
  private searchHistory: Map<string, SearchResult[]> = new Map();
  private indexSize = 0;

  constructor(config: AgentConfig) {
    super(config);
  }

  protected async onInitialize(): Promise<void> {
    this.log('info', 'SearchAgent initialized');
  }

  protected async onStart(): Promise<void> {
    this.log('info', 'SearchAgent started');
  }

  protected async onPause(): Promise<void> {
    this.log('info', 'SearchAgent paused');
  }

  protected async onResume(): Promise<void> {
    this.log('info', 'SearchAgent resumed');
  }

  protected async onStop(): Promise<void> {
    this.log('info', 'SearchAgent stopped');
  }

  protected async executeTask(task: Task): Promise<void> {
    this.log('info', `SearchAgent executing task: ${task.goal}`);
    // Task execution handled via direct method calls
  }

  /**
   * Execute a web search
   */
  async searchWeb(query: string, limit = 10): Promise<SearchResult[]> {
    this.assertRunning();
    this.recordTaskStart();

    this.log('info', `Searching web for: ${query}`);

    try {
      // Simulated search results for demonstration
      // In production, this would call actual search APIs
      const results: SearchResult[] = [
        {
          title: `Result for: ${query}`,
          url: `https://example.com/search?q=${encodeURIComponent(query)}`,
          snippet: `This is a simulated search result for the query "${query}". In production, this would contain actual search results from a search API.`,
          relevance: 0.95,
          timestamp: Date.now(),
        },
      ];

      // Store in history
      this.searchHistory.set(query, results);
      this.recordTaskComplete(100); // Simulated fast execution
      
      this.log('info', `Search completed for: ${query}`, { resultCount: results.length });
      return results.slice(0, limit);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('error', `Search failed for: ${query}`, { error: errorMsg });
      this.recordTaskFail(100);
      throw error;
    }
  }

  /**
   * Search within indexed content
   */
  async searchIndex(query: string, limit = 10): Promise<SearchResult[]> {
    this.assertRunning();
    this.recordTaskStart();

    this.log('info', `Searching index for: ${query}`);

    try {
      // Simulated index search
      // In production, this would query a search index (e.g., FlexSearch)
      const results: SearchResult[] = [];
      
      this.recordTaskComplete(50);
      return results.slice(0, limit);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.log('error', `Index search failed for: ${query}`, { error: errorMsg });
      this.recordTaskFail(50);
      throw error;
    }
  }

  /**
   * Add content to the search index
   */
  async indexContent(url: string, title: string, content: string): Promise<void> {
    this.assertRunning();
    this.indexSize++;
    this.log('info', `Indexed content: ${title}`, { url, indexSize: this.indexSize });
  }

  /**
   * Get search history for a query
   */
  getSearchHistory(query?: string): Map<string, SearchResult[]> {
    if (query) {
      const results = this.searchHistory.get(query);
      return results ? new Map([[query, results]]) : new Map();
    }
    return new Map(this.searchHistory);
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory.clear();
    this.log('info', 'Search history cleared');
  }

  getIndexSize(): number {
    return this.indexSize;
  }

  private assertRunning(): void {
    if (!this.isRunning()) {
      throw new Error(`SearchAgent ${this.config.id} is not running (status: ${this.status})`);
    }
  }
}