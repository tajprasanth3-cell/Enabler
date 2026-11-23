import React from 'react';
import type { LeadStatus } from '../../types';
import { LEAD_STATUS_CONFIG } from '../../utils/constants';

interface BadgeProps {
  status: LeadStatus;
}

export const StatusBadge: React.FC<BadgeProps> = ({ status }) => {
  const config = LEAD_STATUS_CONFIG[status] || {
    label: status,
    color: '#64748b',
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 10px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 700,
        backgroundColor: `${config.color}18`,
        color: config.color,
        border: `1px solid ${config.color}45`,
        boxShadow: `0 0 10px ${config.color}20`,
      }}
    >
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '9999px',
          backgroundColor: config.color,
          marginRight: '6px',
        }}
      />
      {config.label}
    </span>
  );
};

export default StatusBadge;
