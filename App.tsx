
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Target, Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, 
  Trash2, CheckCircle2, Sparkles, Layers, ArrowRight,
  Heart, Circle, Copy, ChevronUp, ChevronDown,
  History, Binoculars, Cloud, RefreshCcw, LogOut, StickyNote, ArrowDownCircle,
  Edit3
} from 'lucide-react';
import { Priority, Task, Goal, AppData, CoreValue, CoreCategory } from './types';
import { getTodayStr, getMondayOfDate, CORE_CATEGORIES } from './constants';
import { breakdownGoal, getDailyInspiration } from './gemini'; 
import { EditableText } from './EditableText';
import { GoalCard } from './GoalCard';

const USER_STORAGE_KEY = 'metaplan_user_id';
const API_URL = 'https://sheetdb.io/api/v1/e2o0qe239eld6';

export default function App() {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(USER_STORAGE_KEY));
  const [data, setData] = useState<AppData>({ tasks: [], goals: [], coreValues: [] });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  
  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [inspiration, setInspiration] = useState("");
  const [loginInput, setLoginInput] = useState("");
  
  const [navDate, setNavDate] = useState(new Date());
  const [navYear, setNavYear] = useState(new Date().getFullYear());
  const [activeCoreCat, setActiveCoreCat] = useState<CoreCategory>(CoreCategory.SPIRITUAL);

  const [inputs, setInputs] = useState({ today: "", weekly: "", monthly: "", yearly: "", value: "" });
  const [activePriority, setActivePriority] = useState<Priority>(Priority.A);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getDateInfo = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return {
      date: now.toLocaleDateString('sv-SE'),
      year: now.getFullYear().toString(),
      month: (now.getMonth() + 1).toString(),
      day: days[now.getDay()],
      week: getMondayOfDate(now.toLocaleDateString('sv-SE'))
    };
  };

  const loadDataFromDB = async (uid: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/search?user_id=${encodeURIComponent(uid)}`);
      const result = await response.json();
      if (result && result.length > 0) {
        const row = result[result.length - 1]; 
        if (row.corevalue) {
          const parsedData = JSON.parse(row.corevalue);
          setData({
            tasks: parsedData.tasks || [],
            goals: parsedData.goals || [],
            coreValues: parsedData.coreValues || []
          });
        }
        setLastSynced(new Date());
      } else {
        await createNewUserRecord(uid);
      }
    } catch (error) {
      console.error("DB Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const createNewUserRecord = async (uid: string) => {
    const dateInfo = getDateInfo();
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: [{
            id: uid + "_" + Date.now(),
            user_id: uid,
            corevalue: JSON.stringify({ tasks: [], goals: [], coreValues: [] }),
            ...dateInfo
          }]
        })
      });
      setData({ tasks: [], goals: [], coreValues: [] });
      setLastSynced(new Date());
    } catch (error) {
      console.error("DB Create Error:", error);
    }
  };

  const syncDataToDB = useCallback(async (currentData: AppData) => {
    if (!userId) return;
    setSyncing(true);
    const dateInfo = getDateInfo();
    try {
      await fetch(`${API_URL}/user_id/${encodeURIComponent(userId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            corevalue: JSON.stringify(currentData),
            ...dateInfo
          }
        })
      });
      setLastSynced(new Date());
    } catch (error) {
      console.error("DB Sync Error:", error);
    } finally {
      setSyncing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || loading) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => syncDataToDB(data), 1500);
    return () => { if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current); };
  }, [data, userId, syncDataToDB, loading]);

  useEffect(() => {
    if (userId) {
      loadDataFromDB(userId);
      fetchInspiration();
    }
  }, [userId]);

  const fetchInspiration = async () => {
    const coreStrings = data.coreValues.map(v => v.text);
    const quote = await getDailyInspiration(coreStrings);
    setInspiration(quote);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginInput.trim()) {
      const uid = loginInput.trim();
      setUserId(uid);
      localStorage.setItem(USER_STORAGE_KEY, uid);
    }
  };

  const handleLogout = () => {
    setUserId(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    setData({ tasks: [], goals: [], coreValues: [] });
  };

  const weekId = getMondayOfDate(selectedDate);
  const monthId = `${navDate.getFullYear()}.${String(navDate.getMonth() + 1).padStart(2, '0')}`;
  const yearId = `${navYear}`;

  const normalizeGroup = (tasks: Task[], date: string, priority: Priority): Task[] => {
    const otherTasks = tasks.filter(t => t.date !== date || t.importance !== priority);
    const group = tasks.filter(t => t.date === date && t.importance === priority)
      .sort((a, b) => a.sequence - b.sequence || a.id.localeCompare(b.id));
    const normalizedGroup = group.map((t, idx) => ({ ...t, sequence: idx + 1 }));
    return [...otherTasks, ...normalizedGroup];
  };

  const getNextSequence = (tasks: Task[], date: string, priority: Priority) => {
    return tasks.filter(t => t.date === date && t.importance === priority).length + 1;
  };

  const dailyTasks = useMemo(() => {
    return data.tasks
      .filter(t => {
        if (t.date === selectedDate) return true;
        if (t.date < selectedDate && !t.completed) return true;
        return false;
      })
      .sort((a, b) => {
        if (a.importance !== b.importance) return a.importance.localeCompare(b.importance);
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.sequence - b.sequence;
      });
  }, [data.tasks, selectedDate]);

  const weeklyGoals = useMemo(() => data.goals.filter(g => g.type === 'weekly' && g.identifier === weekId), [data.goals, weekId]);
  const monthlyGoals = useMemo(() => data.goals.filter(g => g.type === 'monthly' && g.identifier === monthId), [data.goals, monthId]);
  const yearlyGoals = useMemo(() => data.goals.filter(g => g.type === 'yearly' && g.identifier === yearId), [data.goals, yearId]);

  const addTask = () => {
    if (!inputs.today.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(36),
      text: inputs.today,
      importance: activePriority,
      sequence: getNextSequence(data.tasks, selectedDate, activePriority),
      completed: false,
      date: selectedDate,
      memo: ""
    };
    setData(prev => ({ ...prev, tasks: normalizeGroup([...prev.tasks, newTask], selectedDate, activePriority) }));
    setInputs(p => ({ ...p, today: "" }));
  };

  const moveTask = (taskId: string, direction: 'up' | 'down') => {
    setData(prev => {
      const task = prev.tasks.find(t => t.id === taskId);
      if (!task) return prev;
      
      const sameGroup = prev.tasks
        .filter(t => t.date === task.date && t.importance === task.importance)
        .sort((a, b) => a.sequence - b.sequence);
      
      const index = sameGroup.findIndex(t => t.id === taskId);
      if (direction === 'up' && index > 0) {
        const other = sameGroup[index - 1];
        const newTasks = prev.tasks.map(t => {
          if (t.id === task.id) return { ...t, sequence: other.sequence };
          if (t.id === other.id) return { ...t, sequence: task.sequence };
          return t;
        });
        return { ...prev, tasks: newTasks };
      }
      if (direction === 'down' && index < sameGroup.length - 1) {
        const other = sameGroup[index + 1];
        const newTasks = prev.tasks.map(t => {
          if (t.id === task.id) return { ...t, sequence: other.sequence };
          if (t.id === other.id) return { ...t, sequence: task.sequence };
          return t;
        });
        return { ...prev, tasks: newTasks };
      }
      return prev;
    });
  };

  const cyclePriority = (task: Task) => {
    const priorities = [Priority.A, Priority.B, Priority.C];
    const currentIndex = priorities.indexOf(task.importance);
    const nextPriority = priorities[(currentIndex + 1) % priorities.length];
    
    setData(prev => {
      const updatedTasks = prev.tasks.map(t => 
        t.id === task.id ? { ...t, importance: nextPriority } : t
      );
      let normalized = normalizeGroup(updatedTasks, task.date, task.importance);
      normalized = normalizeGroup(normalized, task.date, nextPriority);
      return { ...prev, tasks: normalized };
    });
  };

  const addGoal = (type: 'weekly' | 'monthly' | 'yearly', text: string, identifier: string) => {
    if (!text.trim()) return;
    const newGoal: Goal = { id: Date.now().toString(36), text, progress: 0, completed: false, type, identifier };
    setData(prev => ({ ...prev, goals: [...prev.goals, newGoal] }));
    setInputs(p => ({ ...p, [type]: "" }));
  };

  const handleCopyToToday = (text: string) => {
    const nextSeq = getNextSequence(data.tasks, selectedDate, activePriority);
    const newTask: Task = {
      id: "copied_" + Date.now(),
      text,
      importance: activePriority,
      sequence: nextSeq,
      completed: false,
      date: selectedDate,
      memo: ""
    };
    setData(prev => ({ 
      ...prev, 
      tasks: normalizeGroup([...prev.tasks, newTask], selectedDate, activePriority) 
    }));
  };

  const handlePromoteGoal = (type: 'monthly' | 'yearly', text: string) => {
    if (type === 'yearly') {
      addGoal('monthly', `[연간] ${text}`, monthId);
    } else if (type === 'monthly') {
      addGoal('weekly', `[월간] ${text}`, weekId);
    }
  };

  const handlePromoteCoreValue = (text: string) => {
    addGoal('yearly', `[핵심가치] ${text}`, yearId);
  };

  const handleAIDivide = async (goal: Goal) => {
    setLoading(true);
    const resultTasks = await breakdownGoal(goal.text);
    setData(prev => {
      let currentTasks = [...prev.tasks];
      resultTasks.forEach((item: any) => {
        const p = (item.priority as Priority) || Priority.A;
        currentTasks.push({
          id: Math.random().toString(36).substr(2, 9),
          text: `[Focus] ${item.task}`,
          importance: p,
          sequence: getNextSequence(currentTasks, selectedDate, p),
          completed: false,
          date: selectedDate,
          memo: ""
        });
      });
      let cleaned = normalizeGroup(currentTasks, selectedDate, Priority.A);
      cleaned = normalizeGroup(cleaned, selectedDate, Priority.B);
      cleaned = normalizeGroup(cleaned, selectedDate, Priority.C);
      return { ...prev, tasks: cleaned };
    });
    setLoading(false);
  };

  const addCoreValue = () => {
    if (!inputs.value.trim()) return;
    const newVal: CoreValue = { id: Date.now().toString(36), text: inputs.value, category: activeCoreCat, progress: 0 };
    setData(prev => ({ ...prev, coreValues: [...prev.coreValues, newVal] }));
    setInputs(p => ({ ...p, value: "" }));
  };

  const inputBaseClass = "flex-1 bg-slate-50/50 border border-slate-100 rounded-[1.2rem] sm:rounded-[1.5rem] px-5 sm:px-8 py-4 sm:py-5 outline-none font-bold text-slate-800 placeholder:text-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-100 transition-all text-base";
  const buttonBaseClass = "w-12 h-12 sm:w-16 sm:h-16 bg-[#121826] text-white rounded-[1.2rem] sm:rounded-[1.5rem] flex items-center justify-center hover:scale-105 active:scale-95 shadow-xl transition-all shrink-0";

  if (!userId) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6 text-slate-900 font-['Plus_Jakarta_Sans']">
        <div className="max-w-md w-full animate-in fade-in zoom-in duration-500">
          <div className="text-center mb-12">
            <div className="inline-flex w-24 h-24 bg-indigo-600 rounded-[2.5rem] items-center justify-center text-white shadow-2xl mb-8 transform rotate-3 animate-bounce-slow">
              <Binoculars size={48} />
            </div>
            <h1 className="text-5xl font-black tracking-tight italic text-slate-800">METAPLAN</h1>
            <p className="text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px] mt-4">Vision & Performance Hub</p>
          </div>
          <div className="bg-white p-10 rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] border border-white space-y-8">
            <form onSubmit={handleLogin} className="space-y-6 text-center">
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-slate-800">Identify Yourself</h2>
                <p className="text-sm text-slate-400 font-medium">Please enter your user ID to synchronize your vision.</p>
              </div>
              <input 
                autoFocus required type="text" placeholder="User ID"
                value={loginInput} onChange={(e) => setLoginInput(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:ring-4 focus:ring-indigo-50 outline-none font-bold text-slate-800 text-center text-lg placeholder:text-slate-200 transition-all"
              />
              <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-100 transition-all">
                Access Workspace <ArrowRight size={22} />
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <header className="flex flex-col items-center py-4 sm:py-6 sticky top-0 bg-[#F8FAFF]/80 backdrop-blur-md z-50 px-4 sm:px-6 border-b border-slate-100">
        <div className="max-w-4xl w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Binoculars className="text-indigo-600 w-6 h-6" />
            <h1 className="text-xl font-black text-slate-800 tracking-tighter italic uppercase">METAPLAN</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full border border-slate-100 shadow-sm">
              {syncing ? <RefreshCcw size={12} className="text-indigo-500 animate-spin" /> : <Cloud size={12} className="text-emerald-500" />}
              <span className="text-[10px] font-bold text-slate-500 tabular-nums">{lastSynced ? lastSynced.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Online'}</span>
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-rose-500 transition-colors"><LogOut size={20} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 space-y-12 mt-8 pb-32">
        
        {/* 1. Weekly Mission */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Target className="text-indigo-600 w-5 h-5" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-indigo-800/80">WEEKLY MISSION</h3>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border border-slate-50 space-y-6">
            <div className="flex gap-2 sm:gap-4">
              <input 
                className={inputBaseClass} 
                placeholder="주간 핵심 성과를 입력하세요..." 
                value={inputs.weekly}
                onChange={e => setInputs({...inputs, weekly: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && addGoal('weekly', inputs.weekly, weekId)}
              />
              <button onClick={() => addGoal('weekly', inputs.weekly, weekId)} className={buttonBaseClass}><Plus size={28} /></button>
            </div>
            <div className="grid gap-4">
              {weeklyGoals.map(g => (
                <GoalCard 
                  key={g.id} goal={g} 
                  onUpdate={(id, up) => setData(p => ({ ...p, goals: p.goals.map(item => item.id === id ? {...item, ...up} : item) }))} 
                  onDelete={(id) => setData(p => ({ ...p, goals: p.goals.filter(item => item.id !== id) }))} 
                  onAIAction={handleAIDivide}
                  onCopyToToday={handleCopyToToday}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 2. Today's Focus */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <CalendarIcon className="text-rose-500 w-5 h-5" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-rose-500">TODAY'S FOCUS</h3>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl border border-slate-50 space-y-6">
            <div className="flex gap-2 sm:gap-4">
              <input 
                className={inputBaseClass} 
                placeholder="오늘 가장 중요한 일은 무엇인가요?" 
                value={inputs.today} 
                onChange={(e) => setInputs({...inputs, today: e.target.value})} 
                onKeyDown={(e) => e.key === 'Enter' && addTask()} 
              />
              <button onClick={addTask} className={buttonBaseClass}><Plus size={28} /></button>
            </div>

            <div className="flex items-center justify-between px-1">
              <div className="flex bg-slate-50 p-1 rounded-xl gap-1">
                {[Priority.A, Priority.B, Priority.C].map(p => (
                  <button key={p} onClick={() => setActivePriority(p)} className={`w-10 sm:w-12 py-2 rounded-lg text-[10px] font-black transition-all ${activePriority === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-300 hover:text-slate-400'}`}>{p}</button>
                ))}
              </div>
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Priority {activePriority}</div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-50">
              {dailyTasks.map((task, idx) => (
                <div key={task.id} className="space-y-2">
                  <div className={`group flex items-start gap-3 sm:gap-4 p-4 rounded-[1.8rem] border transition-all ${task.completed ? 'bg-slate-50/30 opacity-40 border-transparent' : 'bg-white border-slate-100 shadow-sm hover:shadow-lg'}`}>
                    <button onClick={() => setData(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t) }))} className={`shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${task.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-100 bg-white hover:border-rose-200'}`}>
                      {task.completed ? <CheckCircle2 size={18}/> : <Circle className="text-slate-100" size={20}/>}
                    </button>
                    
                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-1 shrink-0 bg-slate-50 p-1 rounded-xl self-start sm:self-center border border-slate-100 shadow-sm">
                        <button 
                          onClick={() => cyclePriority(task)}
                          className={`text-[11px] font-black w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${task.importance === Priority.A ? 'text-rose-500 bg-rose-50' : task.importance === Priority.B ? 'text-amber-500 bg-amber-50' : 'text-blue-500 bg-blue-50'}`}
                        >
                          {task.importance}
                        </button>
                        
                        <div className="flex items-center gap-0.5 border-l border-slate-200 pl-1.5 ml-1">
                          <span className="text-[10px] font-black text-slate-400 tabular-nums w-4 text-center">{task.sequence}</span>
                          <div className="flex flex-col ml-0.5">
                            <button onClick={() => moveTask(task.id, 'up')} className="p-0.5 hover:text-indigo-600 text-slate-300 transition-colors"><ChevronUp size={12} /></button>
                            <button onClick={() => moveTask(task.id, 'down')} className="p-0.5 hover:text-indigo-600 text-slate-300 transition-colors"><ChevronDown size={12} /></button>
                          </div>
                          <button onClick={() => setEditingMemoId(editingMemoId === task.id ? null : task.id)} className={`ml-1 p-1.5 rounded-md transition-all ${task.memo ? 'text-indigo-500 bg-indigo-50' : 'text-slate-300 hover:bg-white hover:text-indigo-500'}`} title="메모 수정"><StickyNote size={14} /></button>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <EditableText 
                            value={task.text} 
                            onSave={(text) => setData(p => ({ ...p, tasks: p.tasks.map(t => t.id === task.id ? {...t, text} : t) }))} 
                            strikethrough={task.completed} 
                            className="text-base font-bold text-slate-800 break-words leading-tight" 
                          />
                          {task.date < selectedDate && (
                            <span className="shrink-0 flex items-center gap-1 text-[8px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-tighter border border-amber-100">
                              <History size={10} /> Roll
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setData(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== task.id) }))} className="p-2 text-slate-200 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100 transition-all"><Trash2 size={18}/></button>
                    </div>
                  </div>
                  {editingMemoId === task.id && (
                    <div className="animate-in slide-in-from-top-2">
                      <textarea 
                        autoFocus
                        placeholder="작업에 대한 상세 내용을 입력하세요..."
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium outline-none min-h-[100px] focus:ring-4 focus:ring-indigo-50 transition-all"
                        value={task.memo || ""}
                        onChange={(e) => setData(p => ({ ...p, tasks: p.tasks.map(t => t.id === task.id ? {...t, memo: e.target.value} : t) }))}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. History & Calendar */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <History className="text-slate-400 w-5 h-5" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-400">HISTORY & CALENDAR</h3>
          </div>
          <CalendarMini selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </section>

        {/* 4. Monthly Mission */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Layers className="text-[#5851db] w-5 h-5" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-[#5851db]">MONTHLY MISSION</h3>
            </div>
            <div className="flex items-center bg-white border border-slate-100 rounded-full px-3 py-1 gap-3 shadow-sm">
              <button onClick={() => setNavDate(new Date(navDate.setMonth(navDate.getMonth() - 1)))}><ChevronLeft size={16}/></button>
              <span className="text-[10px] font-black">{monthId}</span>
              <button onClick={() => setNavDate(new Date(navDate.setMonth(navDate.getMonth() + 1)))}><ChevronRight size={16}/></button>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border border-slate-50 space-y-6">
            <div className="flex gap-2 sm:gap-4">
              <input 
                className={inputBaseClass} 
                placeholder="이번 달 꼭 이루고 싶은 목표..." 
                value={inputs.monthly}
                onChange={e => setInputs({...inputs, monthly: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && addGoal('monthly', inputs.monthly, monthId)}
              />
              <button onClick={() => addGoal('monthly', inputs.monthly, monthId)} className={buttonBaseClass}><Plus size={28} /></button>
            </div>
            <div className="grid gap-4">
              {monthlyGoals.map(g => (
                <GoalCard 
                  key={g.id} goal={g} 
                  onUpdate={(id, up) => setData(p => ({ ...p, goals: p.goals.map(item => item.id === id ? {...item, ...up} : item) }))}
                  onDelete={(id) => setData(p => ({ ...p, goals: p.goals.filter(item => item.id !== id) }))}
                  onAIAction={handleAIDivide}
                  onCopyToToday={handleCopyToToday}
                  onPromoteUp={(text) => handlePromoteGoal('monthly', text)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 5. Yearly Vision */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <Target className="text-[#f43f5e] w-5 h-5" />
              <h3 className="text-[11px] font-black uppercase tracking-[0.15em] text-[#f43f5e]">YEARLY VISION</h3>
            </div>
            <div className="flex items-center bg-white border border-slate-100 rounded-full px-3 py-1 gap-3 shadow-sm">
              <button onClick={() => setNavYear(prev => prev - 1)}><ChevronLeft size={16}/></button>
              <span className="text-[10px] font-black">{yearId}</span>
              <button onClick={() => setNavYear(prev => prev + 1)}><ChevronRight size={16}/></button>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border border-slate-50 space-y-6">
            <div className="flex gap-2 sm:gap-4">
              <input 
                className={inputBaseClass} 
                placeholder="올해의 핵심 비전을 정의하세요..." 
                value={inputs.yearly}
                onChange={e => setInputs({...inputs, yearly: e.target.value})}
                onKeyDown={e => e.key === 'Enter' && addGoal('yearly', inputs.yearly, yearId)}
              />
              <button onClick={() => addGoal('yearly', inputs.yearly, yearId)} className={buttonBaseClass}><Plus size={28} /></button>
            </div>
            <div className="grid gap-4">
              {yearlyGoals.map(g => (
                <GoalCard 
                  key={g.id} goal={g} 
                  onUpdate={(id, up) => setData(p => ({ ...p, goals: p.goals.map(item => item.id === id ? {...item, ...up} : item) }))}
                  onDelete={(id) => setData(p => ({ ...p, goals: p.goals.filter(item => item.id !== id) }))}
                  onCopyToToday={handleCopyToToday}
                  onPromoteUp={(text) => handlePromoteGoal('yearly', text)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* 6. Core Values */}
        <section className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-3">
              <Heart className="text-[#e8810c] w-6 h-6" fill="#e8810c" />
              <h2 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">CORE VALUES</h2>
            </div>
          </div>
          <div className="w-full bg-[#fffef0] rounded-[3rem] p-6 sm:p-10 border border-[#fef9c3]/50 shadow-2xl space-y-8">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 space-y-6">
              <div className="flex flex-wrap justify-center gap-2">
                {CORE_CATEGORIES.map(cat => (
                  <button key={cat.id} onClick={() => setActiveCoreCat(cat.id)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black transition-all ${activeCoreCat === cat.id ? `${cat.bg} ${cat.color} ring-2 ring-current` : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>
                    {cat.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 sm:gap-4 pt-4 border-t border-slate-50">
                <input 
                  className={inputBaseClass} 
                  placeholder="인생에서 지키고 싶은 가치는?" 
                  value={inputs.value}
                  onChange={e => setInputs({...inputs, value: e.target.value})}
                  onKeyDown={e => e.key === 'Enter' && addCoreValue()}
                />
                <button onClick={addCoreValue} className={buttonBaseClass}><Plus size={28} /></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.coreValues.map(v => {
                const cat = CORE_CATEGORIES.find(c => c.id === v.category) || CORE_CATEGORIES[0];
                return (
                  <div key={v.id} className={`group relative p-6 rounded-[2rem] border transition-all ${cat.bg} ${cat.border} shadow-sm space-y-4`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${cat.color}`}>{cat.label}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handlePromoteCoreValue(v.text)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors"><ChevronUp size={18} strokeWidth={3} /></button>
                        <span className={`text-xs font-black tabular-nums ${cat.color}`}>{v.progress}%</span>
                        <button onClick={() => setData(p => ({ ...p, coreValues: p.coreValues.map(cv => cv.id === v.id ? {...cv, progress: Math.min(100, cv.progress + 10)} : cv) }))} className="p-1 text-slate-300 hover:text-slate-600"><Plus size={14}/></button>
                      </div>
                    </div>
                    <EditableText 
                      value={v.text} 
                      onSave={(text) => setData(p => ({ ...p, coreValues: p.coreValues.map(cv => cv.id === v.id ? {...cv, text} : cv) }))}
                      className="text-base font-bold text-slate-800 leading-snug"
                    />
                    <div className="w-full h-1.5 bg-white/50 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${cat.active.split(' ')[0]}`} style={{ width: `${v.progress}%` }} />
                    </div>
                    <button onClick={() => setData(p => ({ ...p, coreValues: p.coreValues.filter(cv => cv.id !== v.id) }))} className="absolute -top-2 -right-2 w-8 h-8 bg-white text-rose-500 rounded-full shadow-lg flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100"><Trash2 size={14} /></button>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI Insights Card */}
        <section className="bg-indigo-600 rounded-[3rem] p-8 sm:p-12 text-white shadow-[0_32px_64px_-16px_rgba(79,70,229,0.3)] relative overflow-hidden">
          <Sparkles className="absolute -top-6 -right-6 w-32 h-32 sm:w-48 sm:h-48 opacity-10 rotate-12" />
          <p className="text-lg sm:text-2xl font-bold italic relative z-10 leading-relaxed text-center">"{inspiration || "Aligning with your vision..."}"</p>
        </section>

      </main>
      
      {/* Status Indicators */}
      {(loading || syncing) && (
        <div className="fixed bottom-10 left-10 bg-white/95 backdrop-blur px-6 py-4 rounded-3xl shadow-2xl border border-slate-100 flex items-center gap-3 z-[1000] animate-in fade-in slide-in-from-bottom-4">
          <RefreshCcw size={18} className="text-indigo-600 animate-spin" />
          <p className="text-sm font-bold text-slate-900">{loading ? "Synchronizing Data..." : "Saving Changes..."}</p>
        </div>
      )}
    </div>
  );
}

function CalendarMini({ selectedDate, onSelectDate }: { selectedDate: string, onSelectDate: (d: string) => void }) {
  const [current, setCurrent] = useState(new Date(selectedDate));
  const daysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const startDay = new Date(current.getFullYear(), current.getMonth(), 1).getDay();
  const days = [];
  for (let i = 0; i < startDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth(current.getFullYear(), current.getMonth()); i++) days.push(i);

  return (
    <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl border border-slate-50">
      <div className="flex items-center justify-between mb-8 px-2">
        <h4 className="font-bold text-xl text-slate-800 tracking-tight">{current.getFullYear()}. {current.getMonth() + 1}</h4>
        <div className="flex gap-2">
          <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() - 1, 1))} className="p-2 text-slate-300 hover:bg-slate-50 rounded-full transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth() + 1, 1))} className="p-2 text-slate-300 hover:bg-slate-50 rounded-full transition-all"><ChevronRight size={20}/></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-2 text-center">
        {['S','M','T','W','T','F','S'].map((d, i) => (
          <div key={d} className={`text-[10px] font-black py-2 ${i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : 'text-slate-300'}`}>{d}</div>
        ))}
        {days.map((day, i) => {
          const dStr = day ? new Date(current.getFullYear(), current.getMonth(), day).toLocaleDateString('sv-SE') : "";
          const isSelected = dStr === selectedDate;
          return (
            <div key={i} className="flex justify-center items-center h-10 sm:h-12">
              {day && (
                <button 
                  onClick={() => onSelectDate(dStr)} 
                  className={`w-9 h-9 sm:w-11 sm:h-11 text-xs sm:text-sm font-bold rounded-xl transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  {day}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
