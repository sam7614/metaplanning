
import React from 'react';
import { MinusCircle, PlusCircle, Trash2, Wand2, ChevronUp, ArrowDownCircle } from 'lucide-react';
import { Goal } from './types';
import { EditableText } from './EditableText';

interface GoalCardProps {
  goal: Goal;
  onUpdate: (id: string, updates: Partial<Goal>) => void;
  onDelete: (id: string) => void;
  onAIAction?: (goal: Goal) => void;
  onCopyToToday?: (text: string) => void;
  onPromoteUp?: (text: string) => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ 
  goal, 
  onUpdate, 
  onDelete, 
  onAIAction, 
  onCopyToToday,
  onPromoteUp 
}) => {
  const updateProgress = (delta: number) => {
    const next = Math.max(0, Math.min(100, (goal.progress || 0) + delta));
    onUpdate(goal.id, { progress: next, completed: next === 100 });
  };

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-all">
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <EditableText 
              value={goal.text} 
              onSave={(text) => onUpdate(goal.id, { text })} 
              strikethrough={goal.completed}
              className="text-lg font-black leading-tight text-slate-800"
            />
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50/80 p-1 rounded-xl border border-slate-100">
               {onPromoteUp && (
                 <button 
                   onClick={() => onPromoteUp(goal.text)}
                   className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"
                   title="상위 목표로 이동/복사"
                 >
                   <ChevronUp size={18} strokeWidth={2.5} />
                 </button>
               )}
               {onCopyToToday && (
                 <button 
                   onClick={() => onCopyToToday(`[Focus] ${goal.text}`)}
                   className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"
                   title="오늘의 할 일로 복사"
                 >
                   <ArrowDownCircle size={18} strokeWidth={2.5} />
                 </button>
               )}
               <div className="w-px h-4 bg-slate-200 mx-1" />
               <button onClick={() => updateProgress(-10)} className="p-1.5 text-slate-300 hover:text-rose-500 transition-colors"><MinusCircle size={18}/></button>
               <span className="text-xs font-black text-indigo-600 tabular-nums w-8 text-center">{goal.progress}%</span>
               <button onClick={() => updateProgress(10)} className="p-1.5 text-slate-300 hover:text-emerald-500 transition-colors"><PlusCircle size={18}/></button>
            </div>
            
            <div className="flex items-center gap-1">
              {onAIAction && (
                <button 
                  onClick={() => onAIAction(goal)}
                  className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"
                  title="AI로 단계 나누기"
                >
                  <Wand2 size={18} />
                </button>
              )}
              <button 
                onClick={() => onDelete(goal.id)} 
                className="p-1.5 text-slate-100 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                title="삭제"
              >
                <Trash2 size={18}/>
              </button>
            </div>
          </div>
        </div>
        
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-out rounded-full ${goal.completed ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
            style={{ width: `${goal.progress}%` }} 
          />
        </div>
      </div>
    </div>
  );
};
