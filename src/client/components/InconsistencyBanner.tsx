import React, { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle, ArrowRight } from 'lucide-react';
import { InconsistencyWarning } from '../../core/types.js';

interface InconsistencyBannerProps {
  warnings: InconsistencyWarning[];
  onOpenAudit?: (itemId?: string) => void;
}

export const InconsistencyBanner: React.FC<InconsistencyBannerProps> = ({
  warnings,
  onOpenAudit,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="mb-6 rounded-2xl bg-amber-50 border border-amber-200/80 p-4 shadow-sm transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-amber-900">
              {warnings.length} Inconsistency Warning{warnings.length > 1 ? 's' : ''} Detected
            </h4>
            <p className="text-xs text-amber-700">
              {warnings[0].title} — {warnings[0].description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {warnings.length > 1 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1 bg-amber-200/60 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              {isExpanded ? 'Hide details' : `View all ${warnings.length}`}
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {isExpanded && warnings.length > 1 && (
        <div className="mt-4 pt-3 border-t border-amber-200/60 space-y-2">
          {warnings.slice(1).map((w) => (
            <div
              key={w.id}
              className="flex items-start justify-between bg-white/70 p-3 rounded-xl border border-amber-200/40 text-xs"
            >
              <div>
                <span className="font-bold text-amber-950 block">{w.title}</span>
                <span className="text-amber-800">{w.description}</span>
                {w.suggestedAction && (
                  <span className="block mt-1 font-semibold text-amber-700">
                    💡 Action: {w.suggestedAction}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
