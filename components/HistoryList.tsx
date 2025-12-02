
import React from 'react';
import { HistoryItem } from '../types';
import { Clock, Trash2, ChevronRight, Calendar } from 'lucide-react';

interface HistoryListProps {
  history: HistoryItem[];
  onLoad: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onLoad, onDelete }) => {
  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-12 animate-fade-in">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Clock className="text-slate-400" size={20} />
        Recent Analyses
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {history.map((item) => (
          <div 
            key={item.id}
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition-all group relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold text-white truncate pr-8" title={item.title || item.result.title}>
                {item.title || item.result.title || "Untitled Analysis"}
              </h4>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                className="text-slate-600 hover:text-red-400 p-1 transition-colors"
                title="Delete"
              >
                <Trash2 size={16} />
              </button>
            </div>
            
            <p className="text-slate-400 text-sm line-clamp-2 mb-4 h-10">
              {item.summary || item.result.summary}
            </p>
            
            <div className="flex justify-between items-center mt-auto">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar size={12} />
                {new Date(item.timestamp).toLocaleDateString()}
              </span>
              
              <button
                onClick={() => onLoad(item)}
                className="bg-slate-800 hover:bg-primary-600 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 group-hover:shadow-lg"
              >
                Load Analysis <ChevronRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
