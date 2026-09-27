import React from 'react';
import { getAvatarColor, getInitials } from '../utils/formatters.js';

interface AvatarProps {
  name: string;
  id?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
  badgeType?: 'check' | 'warning' | 'payer';
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  id,
  size = 'md',
  className = '',
  showBadge = false,
  badgeType = 'check',
}) => {
  const initials = getInitials(name);
  const colorClass = getAvatarColor(id || name);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 text-xs font-bold',
    lg: 'w-10 h-10 text-sm font-bold',
    xl: 'w-12 h-12 text-base font-bold',
  }[size];

  return (
    <div className={`relative inline-flex items-center justify-center rounded-full ${sizeClasses} ${colorClass} ${className} flex-shrink-0 shadow-sm select-none`}>
      <span>{initials}</span>

      {showBadge && badgeType === 'check' && (
        <span className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] ring-2 ring-white">
          ✓
        </span>
      )}
      {showBadge && badgeType === 'payer' && (
        <span className="absolute -bottom-1 -right-1 bg-amber-500 text-white rounded-full px-1 py-0.2 text-[8px] font-bold ring-1 ring-white">
          P
        </span>
      )}
    </div>
  );
};

interface AvatarStackProps {
  members: Array<{ id: string; displayName: string }>;
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  members,
  max = 4,
  size = 'sm',
  className = '',
}) => {
  const visible = members.slice(0, max);
  const remainder = members.length - max;

  return (
    <div className={`flex items-center -space-x-2 overflow-hidden ${className}`}>
      {visible.map((m) => (
        <div key={m.id} className="ring-2 ring-white rounded-full">
          <Avatar name={m.displayName} id={m.id} size={size} />
        </div>
      ))}
      {remainder > 0 && (
        <div
          className={`flex items-center justify-center rounded-full bg-slate-800 text-white font-bold ring-2 ring-white select-none ${
            size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs'
          }`}
        >
          +{remainder}
        </div>
      )}
    </div>
  );
};
