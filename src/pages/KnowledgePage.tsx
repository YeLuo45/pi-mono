/**
 * KnowledgePage - Main knowledge base page with RAG features
 *
 * Layout:
 * - Left panel: SourceList with add/delete/search
 * - Center: RetrievalPanel (query input + results)
 * - Right/below: DocumentPreview
 */

import React, { useState, useEffect, useCallback } from 'react';
import { MyList as List, MyMenu as Menu } from '../components/MUI替代';
import { useMediaQuery } from '../components/MUI替代/useMediaQuery';
import { MyTypography as Typography, MyIconButton as IconButton, MyTooltip as Tooltip } from '../components/MUI替代';
import { Box } from '../components/ui/Box';
import {
  Menu as MenuIcon,
  RefreshCw as SyncIcon,
  Settings as SettingsIcon,
} from 'lucide-react';
import { SourceList } from '../components/Knowledge/SourceList';
import { RetrievalPanel } from '../components/Knowledge/RetrievalPanel';
import { DocumentPreview } from '../components/Knowledge/DocumentPreview';
import { initializeSampleKnowledge } from '../data/sampleKnowledge';
import { getAllSources } from '../services/rag/sourceStorage';
import type { KnowledgeSource } from '../services/rag/types';

interface KnowledgePageProps {
  onMenuClick?: () => void;
}

export const KnowledgePage: React.FC<KnowledgePageProps> = ({ onMenuClick }) => {
  const isMobile = useMediaQuery('(max-width: 900px)');
  
  const [selectedSource, setSelectedSource] = useState<KnowledgeSource | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize sample data on first load
  useEffect(() => {
    const init = async () => {
      const sources = await getAllSources();
      if (sources.length === 0) {
        await initializeSampleKnowledge();
      }
      setIsInitialized(true);
      setRefreshKey(k => k + 1);
    };
    init();
  }, []);

  const handleSelectSource = useCallback((source: KnowledgeSource | null) => {
    setSelectedSource(source);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  const handleSourceDeleted = useCallback(() => {
    setSelectedSource(null);
    setRefreshKey(k => k + 1);
  }, []);

  if (!isInitialized) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <Typography>Loading knowledge base...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: 'background.default' }}>
      {/* Header */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        {isMobile && (
          <IconButton size="small" onClick={onMenuClick}>
            <MenuIcon fontSize="small" />
          </IconButton>
        )}
        
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600, flex: 1 }}>
          📚 Knowledge Base
        </Typography>
        
        <Tooltip title="Refresh">
          <IconButton size="small" onClick={handleRefresh}>
            <SyncIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {isMobile ? (
          // Mobile: stacked layout
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ maxHeight: '40%', overflow: 'auto', borderBottom: '1px solid', borderColor: 'divider' }}>
              <SourceList
                key={`sources-${refreshKey}`}
                onSelectSource={handleSelectSource}
                selectedSource={selectedSource}
                onSourceDeleted={handleSourceDeleted}
              />
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <RetrievalPanel
                key={`retrieval-${refreshKey}`}
                onSelectSource={handleSelectSource}
              />
            </Box>
            {selectedSource && (
              <Box sx={{ maxHeight: '30%', overflow: 'auto', borderTop: '1px solid', borderColor: 'divider' }}>
                <DocumentPreview source={selectedSource} />
              </Box>
            )}
          </Box>
        ) : (
          // Desktop: 3-column layout
          <>
            {/* Left: Source List */}
            <Box
              sx={{
                width: 280,
                borderRight: '1px solid',
                borderColor: 'divider',
                overflow: 'auto',
                flexShrink: 0,
              }}
            >
              <SourceList
                key={`sources-${refreshKey}`}
                onSelectSource={handleSelectSource}
                selectedSource={selectedSource}
                onSourceDeleted={handleSourceDeleted}
              />
            </Box>

            {/* Center: Retrieval Panel */}
            <Box sx={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
              <RetrievalPanel
                key={`retrieval-${refreshKey}`}
                onSelectSource={handleSelectSource}
              />
            </Box>

            {/* Right: Document Preview */}
            {selectedSource && (
              <Box
                sx={{
                  width: 320,
                  borderLeft: '1px solid',
                  borderColor: 'divider',
                  overflow: 'auto',
                  flexShrink: 0,
                }}
              >
                <DocumentPreview source={selectedSource} />
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
};

export default KnowledgePage;
