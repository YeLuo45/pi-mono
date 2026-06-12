/**
 * ChainStatus Component
 * V108: Skill Chaining stub
 */

import React from 'react';
import { MyCard as Card, MyTypography as Typography, MyChip as Chip, MyLinearProgress as LinearProgress, MyBox as Box , MyCardContent as CardContent } from '../MUI替代';

export const ChainStatus: React.FC = () => {
  return (
    <Card sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600, mb: 2 }}>
          Chain Status
        </Typography>

        <Box sx={{ mb: 2 }}>
          <Chip label="completed" color="success" size="small" />
        </Box>

        <LinearProgress
          variant="determinate"
          value={100}
          sx={{ mb: 2, height: 6, borderRadius: 3 }}
        />

        <Typography variant="body2" color="text.secondary">
          No active execution
        </Typography>
      </CardContent>
    </Card>
  );
};