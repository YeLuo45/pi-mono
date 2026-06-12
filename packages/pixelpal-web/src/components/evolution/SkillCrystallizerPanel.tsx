/**
 * V154: SkillCrystallizerPanel - Skill crystallization progress and management
 * 
 * Displays crystallized skills with progress bars, lock/unlock functionality,
 * and detailed views of crystallization parameters.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MyBox,
  MyTypography,
  MyPaper,
  MyButton,
  MyLinearProgress,
  MyChip,
  MyStack,
  MyIconButton,
  MyTooltip,
  MyCollapse,
  MyCard,
  MyCardHeader,
  MyCardContent,
} from '../MUI替代';
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as PendingIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import type { CrystallizedSkill } from '../../evolution/types';

interface CrystallizingSkill {
  id: string;
  condition: string;
  action: string;
  progress: number; // 0-100
  estimatedTime?: string;
  patternIds: string[];
}

interface SkillCrystallizerPanelProps {
  /** Fully crystallized skills */
  crystallizedSkills: CrystallizedSkill[];
  /** Skills currently being crystallized */
  crystallizingSkills: CrystallizingSkill[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when a skill is locked */
  onLockSkill?: (skillId: string) => void;
  /** Callback when a skill is unlocked */
  onUnlockSkill?: (skillId: string) => void;
  /** Callback when details are requested */
  onViewDetails?: (skill: CrystallizedSkill) => void;
}

interface SkillCardProps {
  skill: CrystallizedSkill;
  isLocked: boolean;
  onToggleLock: () => void;
  onViewDetails: () => void;
}

const SkillCard: React.FC<SkillCardProps> = ({
  skill,
  isLocked,
  onToggleLock,
  onViewDetails,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <MyPaper
      sx={{
        p: 0,
        overflow: 'hidden',
        borderLeft: '4px solid #82ca9d',
      }}
    >
      <MyBox
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          cursor: 'pointer',
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <MyBox sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
          <CheckCircleIcon color="success" fontSize="small" />
          <MyBox>
            <MyTypography variant="body2" sx={{ fontWeight: 500 }}>
              {skill.action}
            </MyTypography>
            <MyTypography variant="caption" color="text.secondary">
              Condition: {skill.condition}
            </MyTypography>
          </MyBox>
        </MyBox>

        <MyStack direction="row" spacing={1} alignItems="center">
          <MyChip
            label={`v${skill.version}`}
            size="small"
            sx={{ bgcolor: 'action.hover' }}
          />
          <MyIconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock();
            }}
            color={isLocked ? 'primary' : 'default'}
          >
            {isLocked ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
          </MyIconButton>
          <MyIconButton size="small">
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </MyIconButton>
        </MyStack>
      </MyBox>

      <MyCollapse in={expanded}>
        <MyBox sx={{ px: 2, pb: 2 }}>
          <MyTypography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            <InfoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
            Expected Result: {skill.expected_result}
          </MyTypography>
          <MyTypography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Patterns: {skill.pattern_ids.join(', ') || 'None'}
          </MyTypography>
          <MyButton size="small" variant="outlined" onClick={onViewDetails}>
            View Details
          </MyButton>
        </MyBox>
      </MyCollapse>
    </MyPaper>
  );
};

interface CrystallizingCardProps {
  skill: CrystallizingSkill;
  onCancel?: () => void;
}

const CrystallizingCard: React.FC<CrystallizingCardProps> = ({ skill, onCancel }) => {
  return (
    <MyPaper
      sx={{
        p: 2,
        borderLeft: '4px solid #ffc658',
      }}
    >
      <MyBox sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <MyBox sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PendingIcon color="warning" fontSize="small" />
          <MyBox>
            <MyTypography variant="body2" sx={{ fontWeight: 500 }}>
              {skill.action}
            </MyTypography>
            <MyTypography variant="caption" color="text.secondary">
              {skill.estimatedTime && `Estimated time: ${skill.estimatedTime}`}
            </MyTypography>
          </MyBox>
        </MyBox>
        <MyChip
          label={`${Math.round(skill.progress)}%`}
          size="small"
          color="warning"
        />
      </MyBox>

      <MyLinearProgress
        variant="determinate"
        value={skill.progress}
        sx={{ height: 6, borderRadius: 1 }}
      />

      <MyTypography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Condition: {skill.condition}
      </MyTypography>
    </MyPaper>
  );
};

export const SkillCrystallizerPanel: React.FC<SkillCrystallizerPanelProps> = ({
  crystallizedSkills,
  crystallizingSkills,
  isLoading = false,
  onLockSkill,
  onUnlockSkill,
  onViewDetails,
}) => {
  const { t } = useTranslation();
  const [lockedSkills, setLockedSkills] = useState<Set<string>>(new Set());
  const [selectedSkill, setSelectedSkill] = useState<CrystallizedSkill | null>(null);

  const handleToggleLock = (skillId: string) => {
    if (lockedSkills.has(skillId)) {
      setLockedSkills((prev) => {
        const newSet = new Set(prev);
        newSet.delete(skillId);
        return newSet;
      });
      onUnlockSkill?.(skillId);
    } else {
      setLockedSkills((prev) => new Set(prev).add(skillId));
      onLockSkill?.(skillId);
    }
  };

  const handleViewDetails = (skill: CrystallizedSkill) => {
    setSelectedSkill(skill);
    onViewDetails?.(skill);
  };

  if (isLoading) {
    return (
      <MyBox sx={{ p: 2 }}>
        <MyTypography>Loading skills...</MyTypography>
      </MyBox>
    );
  }

  const totalSkills = crystallizedSkills.length + crystallizingSkills.length;
  const crystallizedCount = crystallizedSkills.length;
  const crystallizingCount = crystallizingSkills.length;

  return (
    <MyBox sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header Stats */}
      <MyBox sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <MyCard sx={{ flex: 1 }}>
          <MyCardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <MyTypography variant="h4" color="success.main">
              {crystallizedCount}
            </MyTypography>
            <MyTypography variant="caption" color="text.secondary">
              Crystallized
            </MyTypography>
          </MyCardContent>
        </MyCard>
        <MyCard sx={{ flex: 1 }}>
          <MyCardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <MyTypography variant="h4" color="warning.main">
              {crystallizingCount}
            </MyTypography>
            <MyTypography variant="caption" color="text.secondary">
              Crystallizing
            </MyTypography>
          </MyCardContent>
        </MyCard>
        <MyCard sx={{ flex: 1 }}>
          <MyCardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
            <MyTypography variant="h4">
              {totalSkills}
            </MyTypography>
            <MyTypography variant="caption" color="text.secondary">
              Total
            </MyTypography>
          </MyCardContent>
        </MyCard>
      </MyBox>

      {/* Crystallized Skills */}
      <MyTypography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
        <CheckCircleIcon color="success" fontSize="small" />
        Crystallized Skills
      </MyTypography>
      <MyBox sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
        <MyStack spacing={1}>
          {crystallizedSkills.map((skill) => (
            <SkillCard
              key={skill.id}
              skill={skill}
              isLocked={lockedSkills.has(skill.id)}
              onToggleLock={() => handleToggleLock(skill.id)}
              onViewDetails={() => handleViewDetails(skill)}
            />
          ))}
          {crystallizedSkills.length === 0 && (
            <MyBox sx={{ textAlign: 'center', py: 2 }}>
              <MyTypography color="text.secondary" variant="body2">
                No crystallized skills yet. Skills crystallize from high-confidence patterns.
              </MyTypography>
            </MyBox>
          )}
        </MyStack>
      </MyBox>

      {/* Crystallizing Skills */}
      {crystallizingSkills.length > 0 && (
        <>
          <MyTypography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PendingIcon color="warning" fontSize="small" />
            In Progress ({crystallizingSkills.length})
          </MyTypography>
          <MyBox sx={{ maxHeight: 200, overflow: 'auto' }}>
            <MyStack spacing={1}>
              {crystallizingSkills.map((skill) => (
                <CrystallizingCard key={skill.id} skill={skill} />
              ))}
            </MyStack>
          </MyBox>
        </>
      )}

      {/* Empty state */}
      {totalSkills === 0 && (
        <MyBox sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MyTypography color="text.secondary">
            Skills will appear here as patterns are analyzed and crystallized.
          </MyTypography>
        </MyBox>
      )}
    </MyBox>
  );
};

export default SkillCrystallizerPanel;