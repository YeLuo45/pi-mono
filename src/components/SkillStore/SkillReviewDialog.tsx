/**
 * V78: SkillReviewDialog Component
 * Star rating selector and text review dialog.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  alpha,
} from '@mui/material';
import { Close as CloseIcon, Star as StarIcon } from '@mui/icons-material';
import type { MarketplaceSkill } from '../../data/sampleMarketplaceSkills';
import type { SkillRating } from '../../data/sampleMarketplaceSkills';

interface SkillReviewDialogProps {
  open: boolean;
  onClose: () => void;
  skill: MarketplaceSkill | null;
  onSubmit?: (rating: SkillRating) => void;
}

export const SkillReviewDialog: React.FC<SkillReviewDialogProps> = ({
  open,
  onClose,
  skill,
  onSubmit,
}) => {
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [review, setReview] = useState('');

  const handleSubmit = () => {
    if (!skill) return;
    
    const ratingData: SkillRating = {
      userId: `user_${Date.now()}`,
      rating,
      review: review.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    
    onSubmit?.(ratingData);
    setRating(5);
    setReview('');
    onClose();
  };

  const handleClose = () => {
    setRating(5);
    setReview('');
    onClose();
  };

  if (!skill) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#FFFFFF',
          borderRadius: 3,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="h6" sx={{ fontSize: 16 }}>
            {skill.icon}
          </Typography>
          <Typography variant="subtitle1" sx={{ fontSize: 14, fontWeight: 700, color: '#1E293B' }}>
            评价 {skill.name}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} sx={{ color: '#64748B' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Star Rating */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="body2" sx={{ fontSize: 12, color: '#64748B', mb: 1.5 }}>
            点击选择评分
          </Typography>
          <Stack direction="row" spacing={0.5} justifyContent="center">
            {[1, 2, 3, 4, 5].map((star) => (
              <Box
                key={star}
                onClick={() => setRating(star as 1 | 2 | 3 | 4 | 5)}
                sx={{
                  cursor: 'pointer',
                  p: 0.5,
                  borderRadius: 1,
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: alpha('#F59E0B', 0.1),
                    transform: 'scale(1.1)',
                  },
                }}
              >
                <StarIcon
                  sx={{
                    fontSize: 32,
                    color: star <= rating ? '#F59E0B' : '#E5E7EB',
                    transition: 'color 0.15s ease',
                  }}
                />
              </Box>
            ))}
          </Stack>
          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: '#1E293B', mt: 1 }}>
            {rating === 5 && '太棒了！'}
            {rating === 4 && '很好'}
            {rating === 3 && '还不错'}
            {rating === 2 && '需要改进'}
            {rating === 1 && '很差'}
          </Typography>
        </Box>

        {/* Review Text */}
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="分享你的使用体验...（可选）"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': {
              bgcolor: '#F8FAFC',
              borderRadius: 2,
              fontSize: 13,
              '& fieldset': {
                borderColor: '#E5E7EB',
              },
              '&:hover fieldset': {
                borderColor: '#CBD5E1',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#6366F1',
                borderWidth: 1.5,
              },
            },
          }}
        />

        {/* Actions */}
        <Stack direction="row" spacing={1.5}>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleClose}
            sx={{
              height: 40,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 2,
              textTransform: 'none',
              borderColor: '#E5E7EB',
              color: '#64748B',
            }}
          >
            取消
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            sx={{
              height: 40,
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 2,
              textTransform: 'none',
              bgcolor: '#6366F1',
              '&:hover': { bgcolor: '#4F46E5' },
            }}
          >
            提交评价
          </Button>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default SkillReviewDialog;
