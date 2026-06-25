// Last-Minute Life Saver Shared Types

export type PriorityType = "urgent" | "high" | "medium" | "low";
export type DifficultyType = "easy" | "medium" | "hard";
export type TaskStatusType = "pending" | "completed";

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description: string;
  deadline: string; // ISO datetime string
  estimated_minutes: number;
  priority: PriorityType;
  difficulty: DifficultyType;
  status: TaskStatusType;
  category: string;
  completed_at: string | null;
  created_at: string;
  
  // AI-Assigned attributes from prioritization endpoint
  aiPriority?: PriorityType;
  momentumCategory?: "Critical: Do Now" | "Important: Next" | "Malleable: Squeeze In";
  stressScore?: number; // 1 to 10
  aiTip?: string;
  riskStatus?: "On Track" | "Tight" | "Overdue Risk";
  priorityRank?: number;
  suggestedStartTime?: string;
  suggestedEndTime?: string;
  riskLevel?: "low" | "medium" | "high";
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  streak: number;
  completed_dates: string[]; // List of YYYY-MM-DD date strings when completed
  created_at: string;
}

export interface TimelineSlot {
  startTime: string;
  endTime: string;
  label: string;
  type: "task" | "break" | "habit" | "buffer";
  relatedTaskId?: string;
  advice?: string;
}

export interface DailyPlan {
  id?: string;
  user_id: string;
  plan_date: string; // YYYY-MM-DD
  plan_data: TimelineSlot[];
  encouragement: string;
  created_at: string;
}

export type RouteType = "/" | "/signin" | "/signup" | "/app" | "/profile";
