
export enum Priority {
  A = 'A',
  B = 'B',
  C = 'C'
}

export enum CoreCategory {
  SPIRITUAL = 'spiritual',
  PHYSICAL = 'physical',
  SOCIAL = 'social',
  MENTAL = 'mental'
}

export interface Task {
  id: string;
  text: string;
  importance: Priority;
  sequence: number;
  completed: boolean;
  date: string;
  memo?: string;
  isRolledOver?: boolean;
}

export interface Goal {
  id: string;
  text: string;
  progress: number;
  completed: boolean;
  identifier: string; // e.g., "2024", "2024-05", "2024-W20"
  type: 'weekly' | 'monthly' | 'yearly';
  memo?: string;
}

export interface CoreValue {
  id: string;
  text: string;
  category: CoreCategory;
  progress: number;
}

export interface AppData {
  tasks: Task[];
  goals: Goal[];
  coreValues: CoreValue[];
}