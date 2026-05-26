// NewsPlugin — RSS feed reader
import React from 'react';
import { MyTypography as Typography, MyTextField as TextField, MyChip as Chip, MyIconButton as IconButton, MyCircularProgress as CircularProgress, MyList as List, MyListItem as ListItem, MyListItemText as ListItemText, MyDivider as Divider , MySelect as Select } from '../../components/MUI替代';
import { Box } from '../../components/ui/Box';
import { OpenInNew as OpenIcon, Add as AddIcon } from '@mui/icons-material';
import { createPluginStorage } from './pluginStorage';
import type { Plugin } from './types';

async function parseFeed(url: string): Promise<{ title: string; items: Array<{ title: string; link: string; pubDate: string; contentSnippet?: string }> }> {
  const RSSParser = (await import('rss-parser')).default;
  const parser = new RSSParser({ timeout: 10000, headers: { 'User-Agent': 'PixelPal/1.0' } });
  const feed = await parser.parseURL(url);
  return {
    title: feed.title || 'RSS Feed',
    items: (feed.items || []).slice(0, 20).map((item) => ({
      title: item.title || 'No title',
      link: item.link || '',
      pubDate: item.pubDate || '',
      contentSnippet: item.contentSnippet || item.content || '',
    })),
  };
}

interface FeedEntry {
  url: string;
  name: string;
}

export const NewsPanel: React.FC<{ pluginId: string }> = ({ pluginId }) => {
  const storage = createPluginStorage(pluginId);
  const [feeds, setFeeds] = React.useState<FeedEntry[]>([
    { url: 'https://hnrss.org/frontpage', name: 'Hacker News' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', name: 'NY Times' },
  ]);
  const [newFeedUrl, setNewFeedUrl] = React.useState('');
  const [selectedFeed, setSelectedFeed] = React.useState(0);
  const [articles, setArticles] = React.useState<Array<{ title: string; link: string; pubDate: string; contentSnippet?: string }>>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [addingFeed, setAddingFeed] = React.useState(false);

  React.useEffect(() => {
    storage.get<FeedEntry[]>('feeds').then((saved) => {
      if (saved && saved.length > 0) setFeeds(saved);
    });
    if (feeds.length > 0) {
      fetchArticles(feeds[0].url, 0);
    }
  }, []);

  const fetchArticles = async (url: string, index: number) => {
    if (!url) return;
    setLoading(true);
    setError('');
    try {
      const data = await parseFeed(url);
      setArticles(data.items);
      setSelectedFeed(index);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed');
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim()) return;
    setAddingFeed(true);
    try {
      const data = await parseFeed(newFeedUrl.trim());
      const newFeed: FeedEntry = { url: newFeedUrl.trim(), name: data.title };
      const updated = [...feeds, newFeed];
      setFeeds(updated);
      await storage.set('feeds', updated);
      setNewFeedUrl('');
      await fetchArticles(newFeed.url, updated.length - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add feed');
    } finally {
      setAddingFeed(false);
    }
  };

  const handleDeleteFeed = async (index: number) => {
    const updated = feeds.filter((_, i) => i !== index);
    setFeeds(updated);
    await storage.set('feeds', updated);
    if (selectedFeed >= updated.length) {
      setSelectedFeed(Math.max(0, updated.length - 1));
      if (updated.length > 0) fetchArticles(updated[updated.length - 1].url, updated.length - 1);
      else setArticles([]);
    } else {
      fetchArticles(updated[index]?.url || '', index);
    }
  };

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontSize: 13, fontWeight: 600 }}>
        News Reader
      </Typography>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
        {feeds.map((feed, i) => (
          <Chip
            key={i}
            label={feed.name}
            size="small"
            onClick={() => fetchArticles(feed.url, i)}
            variant={selectedFeed === i ? 'filled' : 'outlined'}
            onDelete={() => handleDeleteFeed(i)}
            sx={{ fontSize: 9, height: 20, cursor: 'pointer' }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="RSS feed URL..."
          value={newFeedUrl}
          onChange={(e) => setNewFeedUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddFeed()}
          sx={{ flex: 1, '& input': { fontSize: 11 } }}
        />
        <IconButton
          size="small"
          onClick={handleAddFeed}
          disabled={addingFeed || !newFeedUrl.trim()}
          sx={{ p: 0.5 }}
        >
          {addingFeed ? <CircularProgress size={14} /> : <AddIcon sx={{ fontSize: 16 }} />}
        </IconButton>
      </Box>

      {error && (
        <Typography variant="caption" sx={{ fontSize: 10, color: 'error.main' }}>
          {error}
        </Typography>
      )}

      {loading && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <CircularProgress size={20} />
        </Box>
      )}

      {!loading && articles.length > 0 && (
        <List dense sx={{ py: 0, maxHeight: 400, overflow: 'auto' }}>
          {articles.map((article, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Divider sx={{ opacity: 0.1 }} />}
              <ListItem
                disablePadding
                secondaryAction={
                  article.link ? (
                    <IconButton
                      size="small"
                      href={article.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ p: 0.25 }}
                    >
                      <OpenIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  ) : undefined
                }
                sx={{ py: 0.5 }}
              >
                <ListItemText
                  primary={article.title}
                  secondary={article.pubDate ? new Date(article.pubDate).toLocaleDateString() : ''}
                  primaryTypographyProps={{ sx: { fontSize: 11, fontWeight: 500, lineHeight: 1.3 } }}
                  secondaryTypographyProps={{ sx: { fontSize: 9 } }}
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}

      {!loading && articles.length === 0 && !error && (
        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', textAlign: 'center', py: 1 }}>
          Select a feed or add a new RSS URL
        </Typography>
      )}
    </Box>
  );
};

export const NewsPlugin: Plugin = {
  id: 'news',
  name: 'News Reader',
  version: '1.0.0',
  icon: '📰',
  panel: NewsPanel,
  capabilities: [
    { type: 'panel' },
    { type: 'ai_tool', name: 'get_news' },
  ],
  configSchema: {
    type: 'object',
    properties: {
      defaultFeeds: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of default RSS feed URLs',
      },
    },
  },
  onInit: () => {
    console.log('[NewsPlugin] Initialized');
  },
};
