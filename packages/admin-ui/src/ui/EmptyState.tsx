import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'ghost';
  };
  compact?: boolean;
}

export function EmptyState({ icon, title, message, action, compact }: EmptyStateProps) {
  return (
    <div className={compact ? 'emptyState emptyState--compact' : 'emptyState'}>
      {icon ? <div className="emptyStateIcon">{icon}</div> : null}
      {title ? <div className="emptyStateTitle">{title}</div> : null}
      <div className="emptyStateMessage">{message}</div>
      {action ? (
        <button
          type="button"
          className={`btn btn--${action.variant ?? 'primary'}`}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
