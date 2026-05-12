/**
 * Workflow Diagram Component - V99
 * 
 * Visualizes the Agent workflow as an SVG diagram.
 */

import React from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, Paper } from '@mui/material';
import type { WorkflowDefinition, WorkflowTemplate, WorkflowStep } from '../../types/agentBuilder';
import { TEMPLATE_ICONS } from '../../types/agentBuilder';

interface WorkflowDiagramProps {
  workflow: WorkflowDefinition;
  onTemplateChange?: (template: WorkflowTemplate) => void;
  readOnly?: boolean;
}

const NODE_COLORS: Record<string, string> = {
  planner: '#f59e0b',
  executor: '#10b981',
  critic: '#ef4444',
  creative: '#8b5cf6',
  general: '#6b7280',
  default: '#3b82f6',
};

const TEMPLATE_LABELS: Record<WorkflowTemplate, string> = {
  sequential: 'Sequential (Step by Step)',
  parallel: 'Parallel (Multiple at Once)',
  hierarchical: 'Hierarchical (Manager + Workers)',
  reflective: 'Reflective (Iterative Improvement)',
  custom: 'Custom Workflow',
};

export const WorkflowDiagram: React.FC<WorkflowDiagramProps> = ({
  workflow,
  onTemplateChange,
  readOnly = false,
}) => {
  const svgWidth = 600;
  const svgHeight = Math.max(200, workflow.steps.length * 80 + 60);

  const getNodeColor = (step: WorkflowStep): string => {
    if (step.agentRole) {
      return NODE_COLORS[step.agentRole] || NODE_COLORS.default;
    }
    return NODE_COLORS.default;
  };

  const renderNodes = () => {
    return workflow.steps.map((step, idx) => {
      const y = 50 + idx * 80;
      const x = 80;
      const nodeColor = getNodeColor(step);
      const hasDependencies = step.dependsOn.length > 0;

      return (
        <g key={step.id}>
          {/* Connection lines from dependencies */}
          {step.dependsOn.map((depId) => {
            const depIdx = workflow.steps.findIndex((s) => s.id === depId);
            if (depIdx === -1) return null;
            const depY = 50 + depIdx * 80 + 40;
            return (
              <line
                key={depId}
                x1={x + 70}
                y1={depY}
                x2={x}
                y2={y + 20}
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            );
          })}

          {/* Node background */}
          <rect
            x={x}
            y={y}
            width={120}
            height={50}
            rx={8}
            fill={nodeColor}
            opacity={0.15}
          />
          <rect
            x={x}
            y={y}
            width={120}
            height={50}
            rx={8}
            fill="none"
            stroke={nodeColor}
            strokeWidth={2}
          />

          {/* Step number */}
          <circle cx={x + 20} cy={y + 25} r={12} fill={nodeColor} />
          <text
            x={x + 20}
            y={y + 29}
            textAnchor="middle"
            fill="white"
            fontSize={12}
            fontWeight="bold"
          >
            {idx + 1}
          </text>

          {/* Step name */}
          <text x={x + 40} y={y + 22} fill="#e5e7eb" fontSize={13} fontWeight={500}>
            {step.name}
          </text>

          {/* Step description */}
          <text x={x + 40} y={y + 38} fill="#9ca3af" fontSize={10}>
            {step.description.length > 20
              ? step.description.slice(0, 20) + '...'
              : step.description}
          </text>

          {/* Arrow to next step */}
          {idx < workflow.steps.length - 1 && (
            <polygon
              points={`${x + 60},${y + 55} ${x + 55},${y + 62} ${x + 65},${y + 62}`}
              fill="#6b7280"
            />
          )}
        </g>
      );
    });
  };

  return (
    <Box>
      {/* Template selector */}
      {!readOnly && onTemplateChange && (
        <Box sx={{ mb: 2 }}>
          <FormControl size="small" sx={{ minWidth: 250 }}>
            <InputLabel>Workflow Template</InputLabel>
            <Select
              value={workflow.template}
              label="Workflow Template"
              onChange={(e) => onTemplateChange(e.target.value as WorkflowTemplate)}
            >
              {Object.entries(TEMPLATE_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {TEMPLATE_ICONS[value as WorkflowTemplate]} {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* SVG Diagram */}
      <Paper sx={{ p: 2, bgcolor: 'rgba(15, 17, 23, 0.95)' }}>
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          {/* Background */}
          <rect width={svgWidth} height={svgHeight} fill="#0f1117" rx={8} />

          {/* Title */}
          <text x={svgWidth / 2} y={25} textAnchor="middle" fill="#e5e7eb" fontSize={16} fontWeight={600}>
            {workflow.name}
          </text>

          {/* Nodes */}
          {renderNodes()}

          {/* Legend */}
          <g transform={`translate(${svgWidth - 180}, 30)`}>
            <text x={0} y={0} fill="#9ca3af" fontSize={10}>
              Legend:
            </text>
            {Object.entries(NODE_COLORS).slice(0, 5).map(([role, color], idx) => (
              <g key={role} transform={`translate(0, ${15 + idx * 16})`}>
                <rect width={10} height={10} fill={color} rx={2} />
                <text x={15} y={9} fill="#9ca3af" fontSize={9}>
                  {role}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </Paper>

      {/* Step details */}
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Workflow Steps
        </Typography>
        {workflow.steps.map((step, idx) => (
          <Box
            key={step.id}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              mb: 0.5,
              p: 1,
              bgcolor: 'background.paper',
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600, minWidth: 20 }}>
              {idx + 1}.
            </Typography>
            <Typography variant="body2" sx={{ flex: 1 }}>
              {step.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {step.input} → {step.output}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default WorkflowDiagram;
