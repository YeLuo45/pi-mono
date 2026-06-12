/**
 * AddSourceDialog - Dialog for adding new knowledge sources
 *
 * Tabs: Text | File | URL | Note
 */

import React, { useState, useRef } from 'react';
import { MyDialog as Dialog , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle, MyTab as Tab } from '../MUI替代';
import { MyButton as Button, MyTextField as TextField, MyBox as Box, MyTypography as Typography, MyTabs as Tabs, MyChip as Chip, MyIconButton as IconButton, MyLinearProgress as LinearProgress, MyAlert as Alert } from '../MUI替代';
import {
  Close as CloseIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { addSource } from '../../services/rag/sourceStorage';
import { indexSource } from '../../services/rag/knowledgeBase';
import type { KnowledgeSource } from '../../services/rag/types';

interface AddSourceDialogProps {
  open: boolean;
  onClose: () => void;
  onSourceAdded: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ py: 2 }}>{children}</Box> : null;
}

export const AddSourceDialog: React.FC<AddSourceDialogProps> = ({
  open,
  onClose,
  onSourceAdded,
}) => {
  const [tab, setTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Text tab state
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [textTags, setTextTags] = useState<string[]>([]);
  const [textTagInput, setTextTagInput] = useState('');
  
  // File tab state
  const [fileTitle, setFileTitle] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileTags, setFileTags] = useState<string[]>([]);
  const [fileTagInput, setFileTagInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // URL tab state
  const [urlTitle, setUrlTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlTags, setUrlTags] = useState<string[]>([]);
  const [urlTagInput, setUrlTagInput] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  
  // Note tab state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteTags, setNoteTags] = useState<string[]>([]);
  const [noteTagInput, setNoteTagInput] = useState('');

  const resetForm = () => {
    setTab(0);
    setError('');
    setTextTitle('');
    setTextContent('');
    setTextTags([]);
    setTextTagInput('');
    setFileTitle('');
    setFileContent('');
    setFileTags([]);
    setFileTagInput('');
    setUrlTitle('');
    setUrlInput('');
    setUrlTags([]);
    setUrlTagInput('');
    setNoteTitle('');
    setNoteContent('');
    setNoteTags([]);
    setNoteTagInput('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const addTag = (tag: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const trimmed = tag.trim().toLowerCase();
    if (trimmed && !tag.includes(',')) {
      setter((prev) => [...prev, trimmed]);
    }
  };

  const handleAddTagFromInput = (
    input: string,
    setterInput: React.Dispatch<React.SetStateAction<string>>,
    setterTags: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    if (input.includes(',')) {
      const parts = input.split(',').map((s) => s.trim()).filter(Boolean);
      setterTags((prev) => [...new Set([...prev, ...parts])]);
      setterInput('');
    } else {
      addTag(input, setterTags);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError('');

    try {
      const text = await file.text();
      const title = file.name.replace(/\.[^/.]+$/, '');
      setFileTitle(title);
      setFileContent(text);
    } catch (err) {
      setError('Failed to read file');
    } finally {
      setIsLoading(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const fetchUrlContent = async () => {
    if (!urlInput.trim()) return;

    setIsFetchingUrl(true);
    setError('');

    try {
      // Use a CORS proxy for browser fetch limitations
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlInput)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch URL');
      }

      const html = await response.text();
      
      // Simple HTML text extraction
      const text = html
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<style[^>]*>.*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      setUrlTitle(new URL(urlInput).hostname);
      // Store in a temporary field for the content
      setFileContent(text);
    } catch (err) {
      setError('Failed to fetch URL content. The site may block CORS.');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const createAndIndexSource = async (
    type: KnowledgeSource['type'],
    title: string,
    content: string,
    source?: string,
    tags: string[] = []
  ) => {
    const newSource: KnowledgeSource = {
      id: crypto.randomUUID(),
      type,
      title: title || (type === 'note' ? 'Untitled Note' : 'Untitled'),
      content,
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source,
        tags,
        size: content.length,
      },
    };

    await addSource(newSource);
    await indexSource(newSource);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError('');

    try {
      switch (tab) {
        case 0: // Text
          if (!textContent.trim()) {
            setError('Please enter some content');
            return;
          }
          await createAndIndexSource('text', textTitle, textContent, undefined, textTags);
          break;

        case 1: // File
          if (!fileContent.trim()) {
            setError('Please upload a file first');
            return;
          }
          await createAndIndexSource('file', fileTitle, fileContent, fileTitle, fileTags);
          break;

        case 2: // URL
          if (!urlInput.trim()) {
            setError('Please enter a URL');
            return;
          }
          if (!fileContent.trim()) {
            setError('Please fetch the URL content first');
            return;
          }
          await createAndIndexSource('url', urlTitle, fileContent, urlInput, urlTags);
          break;

        case 3: // Note
          if (!noteContent.trim()) {
            setError('Please enter some content');
            return;
          }
          await createAndIndexSource('note', noteTitle, noteContent, undefined, noteTags);
          break;
      }

      handleClose();
      onSourceAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save source');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTagInput = (
    tagInput: string,
    setTagInput: React.Dispatch<React.SetStateAction<string>>,
    tags: string[],
    setTags: React.Dispatch<React.SetStateAction<string[]>>
  ) => (
    <Box sx={{ mb: 2 }}>
      <TextField
        size="small"
        fullWidth
        placeholder="Add tags (comma separated)"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            handleAddTagFromInput(tagInput, setTagInput, setTags);
          }
        }}
        InputProps={{
          endAdornment: (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  onDelete={() => setTags(tags.filter((t) => t !== tag))}
                  sx={{ height: 20, '& .MuiChip-label': { fontSize: 10 } }}
                />
              ))}
            </Box>
          ),
        }}
        sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
      />
    </Box>
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Add Knowledge Source
        </Typography>
        <IconButton size="small" onClick={handleClose}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Text" sx={{ fontSize: 12 }} />
          <Tab label="File" sx={{ fontSize: 12 }} />
          <Tab label="URL" sx={{ fontSize: 12 }} />
          <Tab label="Note" sx={{ fontSize: 12 }} />
        </Tabs>

        {error && (
          <Alert severity="error" sx={{ mt: 2, fontSize: 12 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {isLoading && <LinearProgress sx={{ mt: 1 }} />}

        <TabPanel value={tab} index={0}>
          <TextField
            size="small"
            fullWidth
            label="Title"
            value={textTitle}
            onChange={(e) => setTextTitle(e.target.value)}
            sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 13 } }}
          />
          <TextField
            size="small"
            fullWidth
            multiline
            rows={6}
            label="Content"
            placeholder="Paste your text content here..."
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 12 } }}
          />
          {renderTagInput(textTagInput, setTextTagInput, textTags, setTextTags)}
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <input
            type="file"
            ref={fileInputRef}
            accept=".txt,.md,.text"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <Button
            fullWidth
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            sx={{ mb: 2, fontSize: 12 }}
          >
            Upload Text File (.txt, .md)
          </Button>
          {fileContent && (
            <>
              <TextField
                size="small"
                fullWidth
                label="Title"
                value={fileTitle}
                onChange={(e) => setFileTitle(e.target.value)}
                sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 13 } }}
              />
              <TextField
                size="small"
                fullWidth
                multiline
                rows={4}
                label="Content Preview"
                value={fileContent.slice(0, 500) + (fileContent.length > 500 ? '...' : '')}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 12 } }}
              />
              {renderTagInput(fileTagInput, setFileTagInput, fileTags, setFileTags)}
            </>
          )}
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              size="small"
              fullWidth
              label="URL"
              placeholder="https://example.com/article"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              sx={{ '& .MuiInputBase-input': { fontSize: 12 } }}
            />
            <Button
              variant="outlined"
              onClick={fetchUrlContent}
              disabled={!urlInput.trim() || isFetchingUrl}
              sx={{ fontSize: 12, whiteSpace: 'nowrap' }}
            >
              {isFetchingUrl ? 'Fetching...' : 'Fetch'}
            </Button>
          </Box>
          {fileContent && (
            <>
              <TextField
                size="small"
                fullWidth
                label="Title"
                value={urlTitle}
                onChange={(e) => setUrlTitle(e.target.value)}
                sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 13 } }}
              />
              <TextField
                size="small"
                fullWidth
                multiline
                rows={4}
                label="Content Preview"
                value={fileContent.slice(0, 500) + (fileContent.length > 500 ? '...' : '')}
                InputProps={{ readOnly: true }}
                sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 12 } }}
              />
              {renderTagInput(urlTagInput, setUrlTagInput, urlTags, setUrlTags)}
            </>
          )}
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <TextField
            size="small"
            fullWidth
            label="Title"
            placeholder="Note title"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 13 } }}
          />
          <TextField
            size="small"
            fullWidth
            multiline
            rows={6}
            label="Content"
            placeholder="Write your note here..."
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            sx={{ mb: 2, '& .MuiInputBase-input': { fontSize: 12 } }}
          />
          {renderTagInput(noteTagInput, setNoteTagInput, noteTags, setNoteTags)}
        </TabPanel>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2 }}>
        <Button onClick={handleClose} size="small">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isLoading}
          size="small"
        >
          Save & Index
        </Button>
      </DialogActions>
    </Dialog>
  );
};
