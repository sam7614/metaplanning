
import React from 'react';
import { Flame, Activity, Heart, Brain, Zap, Info } from 'lucide-react';
import { CoreCategory, Priority } from './types';

export const CORE_CATEGORIES = [
  { 
    id: CoreCategory.SPIRITUAL, 
    label: '영적', 
    icon: <Flame size={16}/>, 
    color: 'text-purple-600', 
    bg: 'bg-purple-50', 
    border: 'border-purple-100', 
    active: 'bg-purple-600 text-white' 
  },
  { 
    id: CoreCategory.PHYSICAL, 
    label: '신체적', 
    icon: <Activity size={16}/>, 
    color: 'text-emerald-600', 
    bg: 'bg-emerald-50', 
    border: 'border-emerald-100', 
    active: 'bg-emerald-600 text-white' 
  },
  { 
    id: CoreCategory.SOCIAL, 
    label: '사회정서적', 
    icon: <Heart size={16}/>, 
    color: 'text-rose-600', 
    bg: 'bg-rose-50', 
    border: 'border-rose-100', 
    active: 'bg-rose-600 text-white' 
  },
  { 
    id: CoreCategory.MENTAL, 
    label: '정신적', 
    icon: <Info size={16}/>, 
    color: 'text-blue-600', 
    bg: 'bg-blue-50', 
    border: 'border-blue-100', 
    active: 'bg-blue-600 text-white' 
  },
];

export const PRIORITIES = [
  { id: Priority.A, label: 'A (High)', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200' },
  { id: Priority.B, label: 'B (Medium)', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { id: Priority.C, label: 'C (Low)', color: 'text-sky-600', bg: 'bg-sky-50', border: 'border-sky-200' },
];

export const getTodayStr = () => new Date().toLocaleDateString('sv-SE');

export const getMondayOfDate = (dateStr: string) => {
  const d = new Date(dateStr);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toLocaleDateString('sv-SE');
};
