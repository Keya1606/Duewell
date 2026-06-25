import { supabase, isSupabaseConfigured } from "./supabase";
import { Task, Habit, DailyPlan, PriorityType, DifficultyType } from "../types";

// Local Storage Keys
const LOCAL_TASKS_KEY = "lifesaver_tasks_local";
const LOCAL_HABITS_KEY = "lifesaver_habits_local";
const LOCAL_PLAN_KEY = "lifesaver_plan_local";

// Helper to generate IDs
const generateUUID = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// Seed initial tasks for demo/offline mode
const seedLocalTasks = (userId: string): Task[] => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const todayUrgent = new Date();
  todayUrgent.setHours(todayUrgent.getHours() + 2);

  return [
    {
      id: generateUUID(),
      user_id: userId,
      title: "Review biology project final submission",
      description: "Must proofread chapters 1 to 4 and fix citations before midnight.",
      deadline: todayUrgent.toISOString(),
      estimated_minutes: 45,
      priority: "urgent",
      difficulty: "hard",
      status: "pending",
      category: "Academic",
      completed_at: null,
      created_at: new Date().toISOString(),
      aiPriority: "urgent",
      momentumCategory: "Critical: Do Now",
      stressScore: 9,
      aiTip: "Focus solely on the citations first! It's the highest leverage visual fix. Do a 20-minute sprint now."
    },
    {
      id: generateUUID(),
      user_id: userId,
      title: "Renew car insurance policy",
      description: "Expires tomorrow. Rates will go up if done late.",
      deadline: tomorrow.toISOString(),
      estimated_minutes: 20,
      priority: "high",
      difficulty: "easy",
      status: "pending",
      category: "Admin",
      completed_at: null,
      created_at: new Date().toISOString(),
      aiPriority: "high",
      momentumCategory: "Important: Next",
      stressScore: 5,
      aiTip: "This is a quick 10-minute task. Finish this right after lunch to cross it off and build massive momentum!"
    },
    {
      id: generateUUID(),
      user_id: userId,
      title: "Draft weekly marketing email template",
      description: "Needs to outline the new product launch features.",
      deadline: dayAfter.toISOString(),
      estimated_minutes: 60,
      priority: "medium",
      difficulty: "medium",
      status: "pending",
      category: "Work",
      completed_at: null,
      created_at: new Date().toISOString()
    }
  ];
};

// Seed initial habits for demo/offline mode
const seedLocalHabits = (userId: string): Habit[] => {
  return [
    {
      id: generateUUID(),
      user_id: userId,
      name: "Drink 3L of water",
      streak: 3,
      completed_dates: [
        new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
        new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
        new Date(Date.now() - 86400000).toISOString().split('T')[0],
      ],
      created_at: new Date().toISOString()
    },
    {
      id: generateUUID(),
      user_id: userId,
      name: "Stretching break",
      streak: 1,
      completed_dates: [
        new Date(Date.now() - 86400000).toISOString().split('T')[0],
      ],
      created_at: new Date().toISOString()
    }
  ];
};

export const dataService = {
  // 1. Fetch Tasks
  async getTasks(userId: string): Promise<Task[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("deadline", { ascending: true });
      if (error) throw error;
      return data || [];
    } else {
      const cached = localStorage.getItem(`${LOCAL_TASKS_KEY}_${userId}`);
      if (cached) {
        return JSON.parse(cached);
      } else {
        const seeded = seedLocalTasks(userId);
        localStorage.setItem(`${LOCAL_TASKS_KEY}_${userId}`, JSON.stringify(seeded));
        return seeded;
      }
    }
  },

  // 2. Create Task
  async createTask(userId: string, task: Omit<Task, "id" | "user_id" | "status" | "completed_at" | "created_at">): Promise<Task> {
    const newTask: Task = {
      ...task,
      id: generateUUID(),
      user_id: userId,
      status: "pending",
      completed_at: null,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          title: task.title,
          description: task.description,
          deadline: task.deadline,
          estimated_minutes: task.estimated_minutes,
          priority: task.priority,
          difficulty: task.difficulty,
          category: task.category,
          user_id: userId
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const current = await this.getTasks(userId);
      current.push(newTask);
      localStorage.setItem(`${LOCAL_TASKS_KEY}_${userId}`, JSON.stringify(current));
      return newTask;
    }
  },

  // 3. Update Task (complete/incomplete or details)
  async updateTask(userId: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", taskId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const current = await this.getTasks(userId);
      const idx = current.findIndex((t) => t.id === taskId);
      if (idx !== -1) {
        current[idx] = { ...current[idx], ...updates };
        localStorage.setItem(`${LOCAL_TASKS_KEY}_${userId}`, JSON.stringify(current));
        return current[idx];
      }
      throw new Error("Task not found locally");
    }
  },

  // 4. Update Multiple Tasks (for storing AI prioritized tasks order/data)
  async savePrioritizedTasks(userId: string, prioritizedTasksList: Task[]): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      // Supabase batch updates can be done or we update one-by-one
      // To keep it simple and robust, we do singular updates
      for (const t of prioritizedTasksList) {
        await supabase
          .from("tasks")
          .update({
            priority: t.aiPriority || t.priority,
            // Since we might not have specific columns for dynamic attributes in base table, we can either
            // update standard ones, or if the user used our schema.sql, we have custom columns:
            // or we store AI data inside description or a metadata JSON column if exists.
            // Oh, our schema has columns for: priority TEXT, and we can store AI tips inside description or 
            // we can just update local storage if we want a fast experience, or save them directly!
            // Wait, our schema in schema.sql does NOT have columns for stress_score or ai_tip directly, but we can easily save them!
            // Actually, we can update them in the local states and we can just use the memory/localStorage for rich AI metadata,
            // or let's double check schema.sql.
            // In our schema.sql:
            // id UUID, user_id UUID, title TEXT, description TEXT, deadline TIMESTAMPTZ, estimated_minutes INTEGER, 
            // priority TEXT CHECK (priority IN ('high', 'medium', 'low', 'urgent')), difficulty TEXT, status TEXT, category TEXT, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ
            // Since there is no explicit `stress_score` or `ai_tip` columns in standard schema (or wait, did we create them? Let's check schema.sql).
            // Yes! Our schema.sql did NOT have stress_score or ai_tip, wait, wait, yes, it didn't! That is fine, we can update the description
            // to append the tip or we can just maintain it in the app's state, and cache the complete prioritized objects locally!
            // Let's also update the database with priority/difficulty if they changed.
          })
          .eq("id", t.id);
      }
    }
    
    // Always sync with localStorage as a local cache of AI-enriched state!
    localStorage.setItem(`ai_enriched_tasks_${userId}`, JSON.stringify(prioritizedTasksList));
  },

  // 5. Delete Task
  async deleteTask(userId: string, taskId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
    } else {
      const current = await this.getTasks(userId);
      const filtered = current.filter((t) => t.id !== taskId);
      localStorage.setItem(`${LOCAL_TASKS_KEY}_${userId}`, JSON.stringify(filtered));
    }
  },

  // 6. Fetch Habits
  async getHabits(userId: string): Promise<Habit[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    } else {
      const cached = localStorage.getItem(`${LOCAL_HABITS_KEY}_${userId}`);
      if (cached) {
        return JSON.parse(cached);
      } else {
        const seeded = seedLocalHabits(userId);
        localStorage.setItem(`${LOCAL_HABITS_KEY}_${userId}`, JSON.stringify(seeded));
        return seeded;
      }
    }
  },

  // 7. Create Habit
  async createHabit(userId: string, name: string): Promise<Habit> {
    const newHabit: Habit = {
      id: generateUUID(),
      user_id: userId,
      name,
      streak: 0,
      completed_dates: [],
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("habits")
        .insert({
          name,
          user_id: userId,
          streak: 0,
          completed_dates: []
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const current = await this.getHabits(userId);
      current.push(newHabit);
      localStorage.setItem(`${LOCAL_HABITS_KEY}_${userId}`, JSON.stringify(current));
      return newHabit;
    }
  },

  // 8. Toggle Habit Completion for Today
  async toggleHabitForToday(userId: string, habitId: string): Promise<Habit> {
    const todayStr = new Date().toISOString().split("T")[0];
    return this.toggleHabitForDate(userId, habitId, todayStr);
  },

  // 8b. Toggle Habit Completion for Specific Date
  async toggleHabitForDate(userId: string, habitId: string, dateStr: string): Promise<Habit> {
    const habits = await this.getHabits(userId);
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) throw new Error("Habit not found");

    let updatedCompletedDates = [...habit.completed_dates];
    if (updatedCompletedDates.includes(dateStr)) {
      // Uncheck
      updatedCompletedDates = updatedCompletedDates.filter((d) => d !== dateStr);
    } else {
      // Check
      updatedCompletedDates.push(dateStr);
    }

    // Helper to calculate streak consecutively ending today or yesterday
    const calculateStreak = (completedDates: string[]): number => {
      if (!completedDates || completedDates.length === 0) return 0;
      const datesSet = new Set(completedDates);
      
      const todayStr = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      
      let startRefDate = new Date();
      if (datesSet.has(todayStr)) {
        startRefDate = new Date();
      } else if (datesSet.has(yesterdayStr)) {
        startRefDate = yesterday;
      } else {
        return 0; // streak broken if neither today nor yesterday is completed
      }
      
      let streak = 0;
      let checkDate = new Date(startRefDate);
      
      // Infinite loop guard, check up to 365 days max
      for (let i = 0; i < 365; i++) {
        const checkStr = checkDate.toISOString().split("T")[0];
        if (datesSet.has(checkStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      return streak;
    };

    const updatedStreak = calculateStreak(updatedCompletedDates);

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("habits")
        .update({
          completed_dates: updatedCompletedDates,
          streak: updatedStreak
        })
        .eq("id", habitId)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const idx = habits.findIndex((h) => h.id === habitId);
      if (idx !== -1) {
        habits[idx] = { ...habits[idx], completed_dates: updatedCompletedDates, streak: updatedStreak };
        localStorage.setItem(`${LOCAL_HABITS_KEY}_${userId}`, JSON.stringify(habits));
        return habits[idx];
      }
      throw new Error("Habit not found");
    }
  },

  // 9. Delete Habit
  async deleteHabit(userId: string, habitId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from("habits").delete().eq("id", habitId);
      if (error) throw error;
    } else {
      const current = await this.getHabits(userId);
      const filtered = current.filter((h) => h.id !== habitId);
      localStorage.setItem(`${LOCAL_HABITS_KEY}_${userId}`, JSON.stringify(filtered));
    }
  },

  // 10. Daily plan save and load
  async getDailyPlan(userId: string): Promise<DailyPlan | null> {
    const todayStr = new Date().toISOString().split("T")[0];
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("daily_plans")
        .select("*")
        .eq("plan_date", todayStr)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error; // ignore no-row error
      return data;
    } else {
      const cached = localStorage.getItem(`${LOCAL_PLAN_KEY}_${userId}`);
      if (cached) {
        const plan: DailyPlan = JSON.parse(cached);
        if (plan.plan_date === todayStr) {
          return plan;
        }
      }
      return null;
    }
  },

  async saveDailyPlan(userId: string, planData: Omit<DailyPlan, "user_id" | "created_at">): Promise<DailyPlan> {
    const todayStr = new Date().toISOString().split("T")[0];
    const newPlan: DailyPlan = {
      ...planData,
      user_id: userId,
      plan_date: todayStr,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("daily_plans")
        .upsert({
          user_id: userId,
          plan_date: todayStr,
          plan_data: planData.plan_data,
          encouragement: planData.encouragement
        }, { onConflict: "user_id,plan_date" })
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      localStorage.setItem(`${LOCAL_PLAN_KEY}_${userId}`, JSON.stringify(newPlan));
      return newPlan;
    }
  }
};
