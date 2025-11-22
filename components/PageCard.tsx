import React from 'react';
import { PageData, PAGE_CAPACITY } from '../types';
import { RecordRow } from './RecordRow';
import { ArrowRight } from 'lucide-react';

interface Props {
  page: PageData;
  isHead: boolean;
  isTail: boolean;
}

export const PageCard: React.FC<Props> = ({ page, isHead, isTail }) => {
  const fillPercentage = (page.records.length / PAGE_CAPACITY) * 100;
  const isFull = page.records.length >= PAGE_CAPACITY;
  const isPrimary = page.indexType === 'PRIMARY';

  // Theme Colors
  const borderColor = page.isHighlighted 
    ? 'border-yellow-400 ring-2 ring-yellow-400/50' 
    : page.isSplitting 
        ? 'border-red-500 ring-2 ring-red-500/50 animate-pulse' 
        : isPrimary ? 'border-blue-800' : 'border-purple-800';
        
  const bgColor = page.isHighlighted ? 'bg-slate-800' : 'bg-slate-900';
  const headerColor = isPrimary ? 'bg-blue-900/30 text-blue-200' : 'bg-purple-900/30 text-purple-200';

  return (
    <div className="flex items-center">
      <div className={`
        relative flex flex-col w-36 border rounded-md shadow-lg transition-all duration-500
        ${borderColor} ${bgColor}
        ${page.isDirty ? 'scale-105' : ''}
      `}>
        
        {/* Mini Header */}
        <div className={`
          px-2 py-1 rounded-t-[5px] flex items-center justify-between border-b border-slate-800
          ${headerColor}
        `}>
          <span className="font-bold text-[9px] font-mono">
             PG#{page.id}
          </span>
          <div className="flex gap-0.5">
             {[...Array(PAGE_CAPACITY)].map((_, i) => (
                 <div key={i} className={`w-1 h-1 rounded-full ${i < page.records.length ? (isFull ? 'bg-orange-400' : 'bg-emerald-400') : 'bg-slate-700'}`} />
             ))}
          </div>
        </div>

        {/* Records Container */}
        <div className="p-1 flex-1 flex flex-col min-h-[80px] bg-slate-950/30">
          {page.records.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-700 text-[8px] italic">
                  Empty
              </div>
          ) : (
              page.records.map(record => (
                  <RecordRow 
                    key={`${page.id}-${record.id}`} 
                    record={record} 
                    isSecondary={!isPrimary}
                  />
              ))
          )}
        </div>

        {/* Mini Footer */}
        <div className="px-2 py-0.5 bg-slate-950 rounded-b-[5px] border-t border-slate-800 flex justify-between items-center">
             <span className="text-[7px] text-slate-600 font-mono">PTR:{page.nextPageId ?? 'NIL'}</span>
        </div>
      </div>

      {/* Linked List Arrow Visual */}
      {!isTail && (
        <div className="flex items-center justify-center w-8 text-slate-600">
            <div className="h-[2px] w-full bg-slate-700/50 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <ArrowRight size={12} className="text-slate-500" />
                </div>
            </div>
        </div>
      )}
    </div>
  );
};