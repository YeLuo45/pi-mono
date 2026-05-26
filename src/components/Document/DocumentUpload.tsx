import React, { useState, useRef } from 'react';
import { MyBox as Box, MyTypography as Typography, MyButton as Button, MyLinearProgress as LinearProgress, MyList as List, MyListItem as ListItem, MyListItemText as ListItemText, MyIconButton as IconButton, MyTextField as TextField, MyCircularProgress as CircularProgress, MyAlert as Alert } from '../MUI替代';
import { Upload as UploadIcon, Delete as DeleteIcon, QuestionAnswer as AskIcon, Article as ArticleIcon } from '@mui/icons-material';
import { useStore } from '../../store';
import { parseDocument, formatFileSize, isFileSizeValid } from '../../utils/documentParser';
import { documentChatCompletion, initModelRegistry } from '../../services/ai/model-registry-adapter';
import { indexDocumentFromContent } from '../../services/rag';
import type { DocumentFile } from '../../types';

export const DocumentUpload: React.FC = () => {
  const documents = useStore((s) => s.documents);
  const models = useStore((s) => s.models);
  const addDocument = useStore((s) => s.addDocument);
  const removeDocument = useStore((s) => s.removeDocument);
  const aiConfig = useStore((s) => s.aiConfig);

  // Initialize model registry when models change
  React.useEffect(() => {
    initModelRegistry(models);
  }, [models]);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDoc, setSelectedDoc] = useState<DocumentFile | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setError('');

    if (!isFileSizeValid(file, 20)) {
      setError('File too large. Maximum size is 20MB.');
      return;
    }

    const allowedExts = ['pdf', 'docx', 'xlsx', 'txt'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!allowedExts.includes(ext)) {
      setError('Unsupported file type. Please upload PDF, DOCX, XLSX, or TXT.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 20, 90));
      }, 200);

      const { content, type } = await parseDocument(file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      const doc: DocumentFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type,
        size: file.size,
        content,
        uploadedAt: new Date().toISOString(),
      };
      addDocument(doc);
      setSelectedDoc(doc);

      // Auto-index for RAG Knowledge Base
      try {
        indexDocumentFromContent(doc);
        console.log('[RAG] Document indexed for knowledge base:', doc.name);
      } catch (err) {
        console.warn('[RAG] Failed to index document:', err);
      }
    } catch (err) {
      setError(`Failed to parse document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAsk = async () => {
    if (!question.trim() || !selectedDoc || !aiConfig.apiKey) {
      setError('Please select a document and enter a question. Also ensure your API Key is set in Settings.');
      return;
    }

    setIsAsking(true);
    setAnswer('');
    setError('');

    try {
      const response = await documentChatCompletion(selectedDoc.content, question, aiConfig);
      setAnswer(response);
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsAsking(false);
    }
  };

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setError('');

    if (!isFileSizeValid(file, 20)) {
      setError('File too large. Maximum size is 20MB.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const allowedExts = ['pdf', 'docx', 'xlsx', 'txt'];
    if (!allowedExts.includes(ext)) {
      setError('Unsupported file type. Please upload PDF, DOCX, XLSX, or TXT.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 20, 90));
      }, 200);

      const { content, type } = await parseDocument(file);
      clearInterval(progressInterval);
      setUploadProgress(100);

      const doc: DocumentFile = {
        id: crypto.randomUUID(),
        name: file.name,
        type,
        size: file.size,
        content,
        uploadedAt: new Date().toISOString(),
      };
      addDocument(doc);
      setSelectedDoc(doc);

      // Auto-index for RAG Knowledge Base
      try {
        indexDocumentFromContent(doc);
        console.log('[RAG] Document indexed for knowledge base:', doc.name);
      } catch (err) {
        console.warn('[RAG] Failed to index document:', err);
      }
    } catch (err) {
      setError(`Failed to parse document: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600 }}>
          📄 Document Q&A
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
          Upload PDF, DOCX, XLSX or TXT (≤ 20MB) and ask questions
        </Typography>
      </Box>

      {/* Upload area with Drag & Drop */}
      <Box
        ref={dropZoneRef}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        sx={{
          p: 2,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          border: isDragging ? '2px dashed rgba(155, 127, 212, 0.6)' : '2px dashed transparent',
          bgcolor: isDragging ? 'rgba(155, 127, 212, 0.08)' : 'transparent',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.xlsx,.txt"
          style={{ display: 'none' }}
          onChange={handleFileUpload}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
          <UploadIcon sx={{ fontSize: 24, color: isDragging ? 'primary.main' : 'text.secondary', opacity: isDragging ? 1 : 0.5 }} />
          <Typography variant="body2" sx={{ fontSize: 12, color: isDragging ? 'primary.light' : 'text.secondary', textAlign: 'center' }}>
            {isDragging
              ? 'Drop file here...'
              : uploading
              ? 'Processing...'
              : 'Drag & drop a file, or click to browse'}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: 10, color: 'text.disabled' }}>
            PDF · DOCX · XLSX · TXT (max 20MB)
          </Typography>
        </Box>
        {uploading && <LinearProgress variant="determinate" value={uploadProgress} sx={{ mt: 1 }} />}
      </Box>

      {error && (
        <Alert severity="error" sx={{ m: 1.5, fontSize: 12 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Document list */}
      <Box sx={{ flex: selectedDoc ? 0 : 1, overflow: 'auto', p: 1 }}>
        <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', px: 1 }}>
          UPLOADED DOCUMENTS
        </Typography>
        <List dense disablePadding>
          {documents.map((doc) => (
            <ListItem
              key={doc.id}
              selected={selectedDoc?.id === doc.id}
              onClick={() => setSelectedDoc(doc)}
              sx={{
                borderRadius: 1,
                mb: 0.5,
                cursor: 'pointer',
                '&.Mui-selected': { bgcolor: 'rgba(255,255,255,0.08)' },
              }}
              secondaryAction={
                <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); removeDocument(doc.id); if (selectedDoc?.id === doc.id) setSelectedDoc(null); }}>
                  <DeleteIcon sx={{ fontSize: 14 }} />
                </IconButton>
              }
            >
              <ArticleIcon sx={{ fontSize: 16, mr: 1, opacity: 0.5 }} />
              <ListItemText
                primary={<Typography variant="body2" sx={{ fontSize: 12 }}>{doc.name}</Typography>}
                secondary={<Typography variant="caption" sx={{ fontSize: 10 }}>{formatFileSize(doc.size)}</Typography>}
              />
            </ListItem>
          ))}
          {documents.length === 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11, px: 1, display: 'block', mt: 1 }}>
              No documents uploaded yet
            </Typography>
          )}
        </List>
      </Box>

      {/* Q&A area */}
      {selectedDoc && (
        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.06)', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, flexShrink: 0 }}>
            <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
              Asking about: <strong>{selectedDoc.name}</strong>
            </Typography>
            <TextField
              fullWidth
              size="small"
              placeholder="Ask a question about this document..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              disabled={isAsking}
              sx={{ mt: 1, '& .MuiInputBase-root': { fontSize: 12 } }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={isAsking ? <CircularProgress size={12} /> : <AskIcon sx={{ fontSize: 14 }} />}
              onClick={handleAsk}
              disabled={isAsking || !question.trim()}
              sx={{ mt: 1, fontSize: 11 }}
              fullWidth
            >
              Ask AI
            </Button>
          </Box>

          {/* Answer area */}
          {answer && (
            <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, bgcolor: 'rgba(0,0,0,0.2)', mx: 1.5, mb: 1.5, borderRadius: 1 }}>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'primary.light', display: 'block', mb: 0.5 }}>
                AI RESPONSE
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {answer}
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default DocumentUpload;
