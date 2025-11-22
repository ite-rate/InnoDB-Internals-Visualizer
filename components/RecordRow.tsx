import React, { useEffect, useState } from 'react';
import { RecordData } from '../types';

interface Props {
  record: RecordData;
  isSecondary?: boolean;
}

export const RecordRow: React.FC<Props> = ({ record, isSecondary }) => {
  const [highlight, setHighlight] = useState(false);

  useEffect(() => {
    if (record.isNew) {
      setHighlight(true);
      const timer = setTimeout(() => setHighlight(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [record.isNew]);

  const isActive = highlight || record.isHighlighted;

  return (
    <div className={`
      flex items-center justify-between px-1.5 py-0.5 rounded border-[0.5px] text-[9px] font-mono transition-all duration-300 mb-0.5
      ${isActive
        ? 'bg-yellow-500/30 border-yellow-500 text-yellow-200 font-bold scale-105 z-10' 
        : 'bg-slate-800/40 border-slate-700/50 text-slate-400 hover:bg-slate-700/50'}
    `}>
      <div className="flex items-center gap-1 min-w-0">
        {isSecondary ? (
             // Secondary: Show Value first, then PK
             <>
                <span className={`truncate max-w-[50px] ${isActive ? "text-yellow-200" : "text-purple-300"}`}>{record.value}</span>
             </>
        ) : (
             // Primary: Show PK
             <span className={isActive ? "text-yellow-200" : "text-blue-300"}>{record.id}</span>
        )}
      </div>
      
      <div className="flex items-center gap-1 border-l border-slate-700/50 pl-1.5 ml-1">
         {isSecondary ? (
            <span className="text-[8px] text-slate-500">id:<span className="text-blue-400">{record.id}</span></span>
         ) : (
            <span className="truncate max-w-[50px] text-[8px] text-slate-500">{record.value}</span>
         )}
      </div>
    </div>
  );
};