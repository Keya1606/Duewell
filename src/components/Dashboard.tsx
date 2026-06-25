import React, { useState, useEffect } from "react";
import { RouteType, Task, Habit, TimelineSlot, PriorityType, DifficultyType } from "../types";
import { dataService } from "../lib/dataService";
import { isSupabaseConfigured } from "../lib/supabase";
import { 
  Zap, LogOut, Plus, Calendar, Clock, CheckCircle2, Circle, Trash2, 
  Sparkles, ListFilter, AlertTriangle, Check, RefreshCw, Eye, Award, HelpCircle,
  AlertCircle, TrendingUp, Repeat, Mic, MicOff, Mail, Copy, X
} from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import ProfileMenu from "./ProfileMenu";

interface DashboardProps {
  userEmail: string;
  userId: string;
  onLogout: () => void;
  onNavigate: (route: RouteType) => void;
}

interface ParsedTaskInfo {
  title: string;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:MM
  detectedDeadlineText?: string;
}

function parseSpokenText(spokenText: string): ParsedTaskInfo {
  const text = spokenText.trim();
  const keywords = ["due on", "due at", "due", "by tomorrow", "by today", "by", "on", "at"];
  let splitIndex = -1;
  let matchedKeyword = "";
  const lowerText = text.toLowerCase();
  
  for (const kw of keywords) {
    const idx = lowerText.lastIndexOf(" " + kw + " ");
    const startsWithKw = lowerText.startsWith(kw + " ");
    
    if (idx !== -1) {
      if (idx > splitIndex) {
        splitIndex = idx;
        matchedKeyword = kw;
      }
    } else if (startsWithKw && splitIndex === -1) {
      splitIndex = 0;
      matchedKeyword = kw;
    }
  }
  
  if (splitIndex === -1) {
    const relativeKeywords = ["tomorrow", "today", "next week"];
    for (const kw of relativeKeywords) {
      const idx = lowerText.lastIndexOf(" " + kw);
      if (idx !== -1 && idx > splitIndex) {
        splitIndex = idx;
        matchedKeyword = kw;
      }
    }
  }

  let titlePart = text;
  let deadlinePart = "";

  if (splitIndex !== -1) {
    titlePart = text.substring(0, splitIndex).trim();
    if (splitIndex === 0) {
      deadlinePart = text.substring(matchedKeyword.length).trim();
    } else {
      deadlinePart = text.substring(splitIndex + matchedKeyword.length + 1).trim();
      if (["tomorrow", "today", "next week"].includes(matchedKeyword)) {
        deadlinePart = matchedKeyword + " " + deadlinePart;
      }
    }
  }

  const targetDate = new Date();
  let dateFound = false;
  let timeFound = false;
  let parsedDateStr = "";
  let parsedTimeStr = "23:59";
  const dlLower = deadlinePart.toLowerCase().trim();
  
  if (dlLower) {
    if (dlLower.includes("today")) {
      dateFound = true;
      targetDate.setDate(targetDate.getDate());
    } else if (dlLower.includes("tomorrow")) {
      dateFound = true;
      targetDate.setDate(targetDate.getDate() + 1);
    } else if (dlLower.includes("day after tomorrow")) {
      dateFound = true;
      targetDate.setDate(targetDate.getDate() + 2);
    } else {
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      let foundDayIdx = -1;
      for (let i = 0; i < 7; i++) {
        if (dlLower.includes(daysOfWeek[i])) {
          foundDayIdx = i;
          break;
        }
      }
      
      if (foundDayIdx !== -1) {
        dateFound = true;
        const currentDay = targetDate.getDay();
        let daysToAdd = foundDayIdx - currentDay;
        if (daysToAdd <= 0) {
          daysToAdd += 7;
        }
        if (dlLower.includes("next")) {
          if (foundDayIdx - currentDay > 0) {
            daysToAdd += 7;
          }
        }
        targetDate.setDate(targetDate.getDate() + daysToAdd);
      } else {
        const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
        const shortMonths = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        
        let foundMonthIdx = -1;
        for (let i = 0; i < 12; i++) {
          if (dlLower.includes(months[i]) || dlLower.includes(shortMonths[i])) {
            foundMonthIdx = i;
            break;
          }
        }
        
        if (foundMonthIdx !== -1) {
          dateFound = true;
          targetDate.setMonth(foundMonthIdx);
          const dayRegex = /\b(\d{1,2})(st|nd|rd|th)?\b/;
          const match = dlLower.match(dayRegex);
          if (match) {
            targetDate.setDate(parseInt(match[1], 10));
          }
          const yearRegex = /\b(202\d)\b/;
          const yearMatch = dlLower.match(yearRegex);
          if (yearMatch) {
            targetDate.setFullYear(parseInt(yearMatch[1], 10));
          } else {
            const now = new Date();
            if (targetDate.getTime() < now.getTime() - 86400000) {
              targetDate.setFullYear(now.getFullYear() + 1);
            }
          }
        }
      }
    }
    
    if (dlLower.includes("noon")) {
      timeFound = true;
      parsedTimeStr = "12:00";
    } else if (dlLower.includes("midnight")) {
      timeFound = true;
      parsedTimeStr = "00:00";
    } else {
      const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i;
      const timeMatch = dlLower.match(timeRegex);
      if (timeMatch) {
        timeFound = true;
        let hour = parseInt(timeMatch[1], 10);
        const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : "";
        if (ampm === "pm" && hour < 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;
        const hourStr = hour < 10 ? `0${hour}` : `${hour}`;
        const minStr = minute < 10 ? `0${minute}` : `${minute}`;
        parsedTimeStr = `${hourStr}:${minStr}`;
      }
    }
  }

  if (dateFound) {
    const yyyy = targetDate.getFullYear();
    const mm = String(targetDate.getMonth() + 1).padStart(2, "0");
    const dd = String(targetDate.getDate()).padStart(2, "0");
    parsedDateStr = `${yyyy}-${mm}-${dd}`;
  }

  titlePart = titlePart.replace(/\b(by|due|on|at|due on|due at)$/i, "").trim();
  titlePart = titlePart.replace(/\s+/g, " ");

  if (titlePart.length > 0) {
    titlePart = titlePart.charAt(0).toUpperCase() + titlePart.slice(1);
  }

  return {
    title: titlePart,
    date: dateFound ? parsedDateStr : undefined,
    time: timeFound ? parsedTimeStr : undefined,
    detectedDeadlineText: deadlinePart || undefined
  };
}

export default function Dashboard({ userEmail, userId, onLogout, onNavigate }: DashboardProps) {
  // Current Time State
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Data State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [currentPlan, setCurrentPlan] = useState<TimelineSlot[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [satisfyingLine, setSatisfyingLine] = useState("");
  const [planMantra, setPlanMantra] = useState("");
  const [showCalendarView, setShowCalendarView] = useState(false);
  
  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [aiPrioritizing, setAiPrioritizing] = useState(false);
  const [aiPlanning, setAiPlanning] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  
  // Non-happy-path error tracking states
  const [initialLoadError, setInitialLoadError] = useState(false);
  const [aiPrioritizeError, setAiPrioritizeError] = useState(false);
  const [aiPlanningError, setAiPlanningError] = useState(false);
  const [aiDraftError, setAiDraftError] = useState<Record<string, boolean>>({});

  // Filter & Form States
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "ai">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New Task Form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("23:59");
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [priority, setPriority] = useState<PriorityType>("medium");
  const [difficulty, setDifficulty] = useState<DifficultyType>("medium");
  const [category, setCategory] = useState("Work");

  // New Habit Form
  const [newHabitName, setNewHabitName] = useState("");
  const [showHabitForm, setShowHabitForm] = useState(false);
  const [markAsHabitInForm, setMarkAsHabitInForm] = useState(false);
  const [celebration, setCelebration] = useState<{ show: boolean; habitName: string; days: number } | null>(null);

  // Walkthrough Onboarding State
  const [walkthroughStep, setWalkthroughStep] = useState<number | null>(null);

  // Speech Recognition State
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [speechFeedback, setSpeechFeedback] = useState("");

  useEffect(() => {
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      const rec = new SpeechRecognitionAPI();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        setSpeechFeedback("Listening... Speak your task now!");
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
        if (event.error === "not-allowed") {
          setActionError("Microphone permission denied. Please enable mic access.");
          setSpeechFeedback("Permission denied.");
        } else if (event.error === "no-speech") {
          setSpeechFeedback("No speech detected. Please try again.");
        } else {
          setSpeechFeedback(`Speech error: ${event.error}`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSpeechFeedback(`Heard: "${transcript}"`);
          handleSpokenText(transcript);
        }
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) {
      setActionError("Speech recognition is not supported in this browser. Try Chrome, Edge or Safari!");
      return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      setActionError("");
      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start speech recognition", err);
      }
    }
  };

  const handleSpokenText = (transcript: string) => {
    const parsed = parseSpokenText(transcript);
    
    if (parsed.title) {
      setTitle(parsed.title);
    }
    
    if (parsed.date) {
      setDeadlineDate(parsed.date);
      setActionSuccess(`Parsed: "${parsed.title}" due on ${parsed.date}`);
    } else {
      const todayStr = new Date().toISOString().split("T")[0];
      setDeadlineDate(todayStr);
      setActionSuccess(`Parsed: "${parsed.title}" (Deadline not specified, set to today)`);
    }

    if (parsed.time) {
      setDeadlineTime(parsed.time);
    }

    setShowAddForm(true);
  };

  // State for Extension request email drafts
  const [extensionDrafts, setExtensionDrafts] = useState<Record<string, string>>({});
  const [loadingDrafts, setLoadingDrafts] = useState<Record<string, boolean>>({});
  const [copiedDrafts, setCopiedDrafts] = useState<Record<string, boolean>>({});

  const handleGenerateExtensionDraft = async (task: Task) => {
    setLoadingDrafts(prev => ({ ...prev, [task.id]: true }));
    setAiDraftError(prev => ({ ...prev, [task.id]: false }));
    setActionError("");
    try {
      const response = await fetch("/api/generate-extension-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          deadline: task.deadline,
          category: task.category,
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to generate draft");
      }
      const data = await response.json();
      setExtensionDrafts(prev => ({ ...prev, [task.id]: data.draft }));
      setAiDraftError(prev => ({ ...prev, [task.id]: false }));
      setActionSuccess(`Draft extension request for "${task.title}" generated successfully!`);
    } catch (err: any) {
      console.error(err);
      setAiDraftError(prev => ({ ...prev, [task.id]: true }));
      setActionError(`Could not generate an extension draft for "${task.title}". Gemini might be temporarily overloaded.`);
    } finally {
      setLoadingDrafts(prev => ({ ...prev, [task.id]: false }));
    }
  };

  const handleCopyDraft = (taskId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDrafts(prev => ({ ...prev, [taskId]: true }));
    setTimeout(() => {
      setCopiedDrafts(prev => ({ ...prev, [taskId]: false }));
    }, 2000);
  };

  // Tick current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setInitialLoadError(false);
      setActionError("");
      const fetchedTasks = await dataService.getTasks(userId);
      const fetchedHabits = await dataService.getHabits(userId);
      const savedPlan = await dataService.getDailyPlan(userId);
      
      // Restore AI enriched tasks if cached
      const cachedEnriched = localStorage.getItem(`ai_enriched_tasks_${userId}`);
      if (cachedEnriched) {
        const parsed = JSON.parse(cachedEnriched) as Task[];
        // Merge dynamic AI properties into fetched tasks
        const merged = fetchedTasks.map(t => {
          const aiData = parsed.find(pt => pt.id === t.id);
          if (aiData) {
            return {
              ...t,
              aiPriority: aiData.aiPriority,
              momentumCategory: aiData.momentumCategory,
              stressScore: aiData.stressScore,
              aiTip: aiData.aiTip,
              riskStatus: aiData.riskStatus,
              priorityRank: aiData.priorityRank,
              suggestedStartTime: aiData.suggestedStartTime,
              suggestedEndTime: aiData.suggestedEndTime,
              riskLevel: aiData.riskLevel
            };
          }
          return t;
        });
        setTasks(merged);
      } else {
        setTasks(fetchedTasks);
      }

      setHabits(fetchedHabits);
      
      if (savedPlan) {
        if (Array.isArray(savedPlan.plan_data)) {
          setCurrentPlan(savedPlan.plan_data);
          setRecommendations([]);
        } else if (savedPlan.plan_data && typeof savedPlan.plan_data === "object") {
          const planObj = savedPlan.plan_data as any;
          setCurrentPlan(planObj.schedule || []);
          setRecommendations(planObj.recommendations || []);
        }
        setPlanMantra(savedPlan.encouragement);
      }

      // Trigger onboarding walkthrough if first login after signup
      const isFirst = localStorage.getItem("lifesaver_is_first_signup");
      if (isFirst === "true") {
        setWalkthroughStep(1); // Start first step
        localStorage.removeItem("lifesaver_is_first_signup");
      }
    } catch (err: any) {
      console.error(err);
      setInitialLoadError(true);
      setActionError("We had a small hiccup connecting to our database server. You can retry anytime.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial data
  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  // Clean success/error notifications after some time
  useEffect(() => {
    if (actionSuccess || actionError) {
      const t = setTimeout(() => {
        setActionSuccess("");
        setActionError("");
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [actionSuccess, actionError]);

  // Task Actions
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !deadlineDate) {
      setActionError("Please provide a title and due date.");
      return;
    }

    try {
      const combinedDeadline = new Date(`${deadlineDate}T${deadlineTime}`).toISOString();
      const created = await dataService.createTask(userId, {
        title: title.trim(),
        description,
        deadline: combinedDeadline,
        estimated_minutes: estimatedMinutes,
        priority,
        difficulty,
        category
      });

      setTasks(prev => [...prev, created]);
      setActionSuccess(`Added task: "${title}"`);

      // If marked as daily habit, create a habit too
      if (markAsHabitInForm) {
        try {
          const matchingHabit = habits.find(h => h.name.toLowerCase().trim() === title.toLowerCase().trim());
          if (!matchingHabit) {
            const createdHabit = await dataService.createHabit(userId, title.trim());
            setHabits(prev => [...prev, createdHabit]);
          }
        } catch (habitErr) {
          console.error("Failed to auto-create habit for task", habitErr);
        }
      }
      
      // Reset form
      setTitle("");
      setDescription("");
      setDeadlineDate("");
      setDeadlineTime("23:59");
      setEstimatedMinutes(30);
      setPriority("medium");
      setDifficulty("medium");
      setCategory("Work");
      setMarkAsHabitInForm(false);
      setShowAddForm(false);
    } catch (err: any) {
      setActionError("Failed to add task. Try again.");
    }
  };

  const handleToggleTaskStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newStatus = task.status === "completed" ? "pending" : "completed";
    const completedAt = newStatus === "completed" ? new Date().toISOString() : null;

    try {
      const updated = await dataService.updateTask(userId, taskId, {
        status: newStatus,
        completed_at: completedAt
      });

      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t));
      
      if (newStatus === "completed") {
        // Play satisfying moment confetti burst
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!prefersReducedMotion) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.65 },
            colors: ["#FF6B4A", "#4CAF82", "#F2A93B"]
          });
        }
        
        // Randomize a super friendly and satisfying line
        const completionLines = [
          "Nice work — one less thing to worry about.",
          "Momentum is building up! Beautiful execution.",
          "Crossed it off. Feel the weight lifting from your shoulders.",
          "Boom. Done. Breathe in deep and savor the feeling of checking that off."
        ];
        const randomLine = completionLines[Math.floor(Math.random() * completionLines.length)];
        setSatisfyingLine(randomLine);
        // Clear after 6 seconds
        setTimeout(() => setSatisfyingLine(""), 6000);

        setActionSuccess("Excellent win! Momentum increased!");
      } else {
        setActionSuccess("Task set back to pending.");
      }
    } catch (err) {
      setActionError("Could not update task status.");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await dataService.deleteTask(userId, taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setActionSuccess("Task removed successfully.");
    } catch (err) {
      setActionError("Failed to remove task.");
    }
  };

  // Habit Actions
  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    try {
      const created = await dataService.createHabit(userId, newHabitName.trim());
      setHabits(prev => [...prev, created]);
      setActionSuccess(`Habit "${newHabitName}" registered!`);
      setNewHabitName("");
      setShowHabitForm(false);
    } catch (err) {
      setActionError("Failed to record habit.");
    }
  };

  const handleToggleHabitForDate = async (habitId: string, dateStr: string) => {
    try {
      const habitToToggle = habits.find(h => h.id === habitId);
      if (!habitToToggle) return;
      const isCurrentlyCompleted = habitToToggle.completed_dates.includes(dateStr);
      
      const updated = await dataService.toggleHabitForDate(userId, habitId, dateStr);
      setHabits(prev => prev.map(h => h.id === habitId ? updated : h));
      
      // Auto-toggle matching task if date is today
      const todayStr = new Date().toISOString().split("T")[0];
      if (dateStr === todayStr) {
        const matchingTask = tasks.find(t => t.title.toLowerCase().trim() === habitToToggle.name.toLowerCase().trim());
        if (matchingTask) {
          const expectedStatus = !isCurrentlyCompleted ? "completed" : "pending";
          if (matchingTask.status !== expectedStatus) {
            await dataService.updateTask(userId, matchingTask.id, { 
              status: expectedStatus as any,
              completed_at: expectedStatus === "completed" ? new Date().toISOString() : null 
            });
            const updatedTask: Task = { 
              ...matchingTask, 
              status: expectedStatus as any,
              completed_at: expectedStatus === "completed" ? new Date().toISOString() : null 
            };
            setTasks(prev => prev.map(t => t.id === matchingTask.id ? updatedTask : t));
          }
        }
      }

      // If we newly checked it
      if (!isCurrentlyCompleted) {
        if (updated.streak === 3 || updated.streak === 7) {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ["#FF6B4A", "#4CAF82", "#FFD700", "#3B82F6"]
          });
          setCelebration({
            show: true,
            habitName: updated.name,
            days: updated.streak
          });
          
          setTimeout(() => {
            setCelebration(prev => {
              if (prev && prev.days === updated.streak && prev.habitName === updated.name) {
                return null;
              }
              return prev;
            });
          }, 4500);
        }
      }
      
      setActionSuccess("Habit tracked! Keeping that streak alive!");
    } catch (err) {
      setActionError("Failed to toggle habit.");
    }
  };

  const handleToggleHabit = async (habitId: string) => {
    const todayStr = new Date().toISOString().split("T")[0];
    await handleToggleHabitForDate(habitId, todayStr);
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await dataService.deleteHabit(userId, habitId);
      setHabits(prev => prev.filter(h => h.id !== habitId));
      setActionSuccess("Habit deleted.");
    } catch (err) {
      setActionError("Could not delete habit.");
    }
  };

  // AI Actions: 1. Prioritize Tasks
  const handleAIPrioritisation = async () => {
    if (tasks.filter(t => t.status !== 'completed').length === 0) {
      setActionError("Add some pending tasks first before running AI prioritization.");
      return;
    }

    setAiPrioritizing(true);
    setAiPrioritizeError(false);
    setActionError("");

    try {
      const response = await fetch("/api/prioritize-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });

      if (!response.ok) {
        throw new Error("Gemini AI API returned an error.");
      }

      const data = await response.json();
      const aiPrioritizedList = data.prioritizedTasks;
      const coachingMsg = data.coachingQuote;

      // Map the AI-assigned fields back to our tasks list
      const updatedTasks = tasks.map(t => {
        const aiUpdate = aiPrioritizedList.find((aiT: any) => aiT.id === t.id);
        if (aiUpdate) {
          return {
            ...t,
            aiPriority: aiUpdate.aiPriority as PriorityType,
            momentumCategory: aiUpdate.momentumCategory,
            stressScore: aiUpdate.stressScore,
            aiTip: aiUpdate.aiTip
          };
        }
        return t;
      });

      // Save prioritized list to state and local cache
      setTasks(updatedTasks);
      await dataService.savePrioritizedTasks(userId, updatedTasks);
      
      // Auto-set filter to 'ai' to let user see prioritized list
      setFilter("ai");
      setAiPrioritizeError(false);
      setActionSuccess("AI Prioritization complete! Look at your curated list.");
      if (coachingMsg) {
        setPlanMantra(coachingMsg);
      }
    } catch (err: any) {
      console.error(err);
      setAiPrioritizeError(true);
      setActionError("Failed to reach Gemini AI. Please check your internet connection or verify your GEMINI_API_KEY.");
    } finally {
      setAiPrioritizing(false);
    }
  };

  // AI Actions: 2. Generate Daily Plan
  const handleAIGeneratePlan = async () => {
    const pendingTasks = tasks.filter(t => t.status !== 'completed');
    if (pendingTasks.length === 0) {
      setActionError("Please register at least one task before building a daily schedule.");
      return;
    }

    setAiPlanning(true);
    setAiPlanningError(false);
    setActionError("");

    try {
      const currentTimeStr = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const response = await fetch("/api/generate-daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: pendingTasks,
          habits,
          currentTimeStr
        })
      });

      if (!response.ok) {
        throw new Error("Daily scheduler API failed.");
      }

      const data = await response.json();
      setCurrentPlan(data.timeline || []);
      setPlanMantra(data.mantra || "");
      setRecommendations(data.recommendations || []);

      // If the AI returned tasks metadata, enrich task objects
      let nextTasks = [...tasks];
      if (data.tasks && Array.isArray(data.tasks)) {
        nextTasks = tasks.map(t => {
          const update = data.tasks.find((tu: any) => tu.task_id === t.id);
          if (update) {
            let riskStatus: "On Track" | "Tight" | "Overdue Risk" = "On Track";
            if (update.risk_level === "high") {
              riskStatus = "Overdue Risk";
            } else if (update.risk_level === "medium") {
              riskStatus = "Tight";
            } else {
              riskStatus = "On Track";
            }

            return {
              ...t,
              riskStatus,
              aiTip: update.one_sentence_tip,
              priorityRank: update.priority_rank,
              suggestedStartTime: update.suggested_start_time,
              suggestedEndTime: update.suggested_end_time,
              riskLevel: update.risk_level
            };
          }
          return t;
        });
        setTasks(nextTasks);
        await dataService.savePrioritizedTasks(userId, nextTasks);
      }

      // Save daily plan with schedule and recommendations in plan_data
      await dataService.saveDailyPlan(userId, {
        plan_data: { schedule: data.timeline || [], recommendations: data.recommendations || [] } as any,
        encouragement: data.mantra || "",
        plan_date: new Date().toISOString().split("T")[0]
      });

      setAiPlanningError(false);
      setActionSuccess("Your personalized daily plan, recommendations, and risk tips are ready!");
    } catch (err) {
      console.error(err);
      setAiPlanningError(true);
      setActionError("Failed to design your daily schedule. Gemini might be sleeping. Let's try again!");
    } finally {
      setAiPlanning(false);
    }
  };

  const getTaskRiskStatus = (task: Task): "On Track" | "Tight" | "Overdue Risk" => {
    if (task.status === "completed") return "On Track";
    if (task.riskStatus) return task.riskStatus;
    
    const now = currentTime.getTime();
    const deadline = new Date(task.deadline).getTime();
    const diffTime = deadline - now;
    const diffHours = diffTime / (1000 * 60 * 60);

    if (diffTime < 0) {
      return "Overdue Risk";
    } else if (diffHours < 6) {
      return "Tight";
    }
    return "On Track";
  };

  const parseTimeStr = (timeStr: string): { hour: number; minute: number } | null => {
    if (!timeStr) return null;
    const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return null;
    let hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    const ampm = match[3].toUpperCase();
    if (ampm === "PM" && hour < 12) hour += 12;
    if (ampm === "AM" && hour === 12) hour = 0;
    return { hour, minute };
  };

  const get7DayWindow = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { weekday: "short" });
      const singleChar = label.substring(0, 1);
      days.push({ dateStr, label, singleChar });
    }
    return days;
  };

  // Calculations for Momentum Ring
  const totalTasksToday = tasks.length;
  const completedTasksToday = tasks.filter(t => t.status === "completed").length;
  const taskCompletionPercent = totalTasksToday > 0 
    ? Math.round((completedTasksToday / totalTasksToday) * 100) 
    : 0;

  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const mostUrgentTask = pendingTasks.length > 0
    ? [...pendingTasks].sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())[0]
    : null;

  // Render prioritized or filtered task lists
  const getFilteredTasks = () => {
    if (filter === "pending") return tasks.filter(t => t.status === "pending");
    if (filter === "completed") return tasks.filter(t => t.status === "completed");
    if (filter === "ai") {
      // Sort tasks by momentumCategory priority: Critical first, then Important, then Malleable
      const categoryOrder = {
        "Critical: Do Now": 1,
        "Important: Next": 2,
        "Malleable: Squeeze In": 3,
        "undefined": 4
      };
      return [...tasks].sort((a, b) => {
        const orderA = categoryOrder[a.momentumCategory || "undefined"];
        const orderB = categoryOrder[b.momentumCategory || "undefined"];
        return orderA - orderB;
      });
    }
    return tasks;
  };

  // Format datetimes friendly
  const formatDeadline = (dateStr: string) => {
    const date = new Date(dateStr);
    const diffTime = date.getTime() - currentTime.getTime();
    const diffHours = diffTime / (1000 * 60 * 60);

    // Dynamic warning labels
    let urgencyClass = "text-gray-500 bg-gray-50";
    let urgencyLabel = "";

    if (taskCompletionPercent === 100) {
      urgencyLabel = "Done";
    }

    if (diffTime < 0) {
      urgencyClass = "text-white bg-[#E2574C]";
      urgencyLabel = "OVERDUE";
    } else if (diffHours < 3) {
      urgencyClass = "text-white bg-[#FF6B4A] animate-pulse";
      urgencyLabel = "DUE SOON";
    } else if (diffHours < 24) {
      urgencyClass = "text-[#232323] bg-[#F2A93B]/20 border border-[#F2A93B]/40";
      urgencyLabel = "DUE TODAY";
    }

    const options: Intl.DateTimeFormatOptions = { 
      month: "short", 
      day: "numeric", 
      hour: "2-digit", 
      minute: "2-digit" 
    };
    return {
      formatted: date.toLocaleDateString([], options),
      urgencyClass,
      urgencyLabel,
      isOverdue: diffTime < 0
    };
  };

  // Check if habit is completed today
  const isHabitDoneToday = (habit: Habit) => {
    const todayStr = new Date().toISOString().split("T")[0];
    return habit.completed_dates.includes(todayStr);
  };

  return (
    <div className="min-h-screen bg-transparent text-[#232323] flex flex-col font-sans pb-16 relative">
      
      {/* Onboarding walkthrough overlays */}
      {walkthroughStep !== null && (
        <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white/80 backdrop-blur-xl p-7 max-w-sm rounded-2xl border border-white/40 shadow-xl text-center relative animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-[#FF6B4A]/10 text-[#FF6B4A] flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            
            {walkthroughStep === 1 && (
              <>
                <h3 className="font-outfit text-xl font-bold mb-2">1. Add your tasks</h3>
                <p className="text-sm text-gray-500 leading-relaxed font-light mb-6">
                  Add high-stakes items with deadlines and estimated effort here. Our clean design lets you quickly catalog everything that's stressing you.
                </p>
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setWalkthroughStep(null)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Skip guide
                  </button>
                  <button 
                    onClick={() => setWalkthroughStep(2)}
                    className="px-4 py-2 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-xs font-semibold custom-btn shadow-sm"
                  >
                    Next tip
                  </button>
                </div>
              </>
            )}

            {walkthroughStep === 2 && (
              <>
                <h3 className="font-outfit text-xl font-bold mb-2">2. Autopilot Your Day</h3>
                <p className="text-sm text-gray-500 leading-relaxed font-light mb-6">
                  Unsure where to start? Use the <span className="font-semibold text-[#FF6B4A]">Generate Today's Plan</span> button. Gemini AI builds a balanced hourly timeline, adding buffers and breaks.
                </p>
                <div className="flex justify-between items-center">
                  <button 
                    onClick={() => setWalkthroughStep(1)}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Back
                  </button>
                  <button 
                    onClick={() => setWalkthroughStep(3)}
                    className="px-4 py-2 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-xs font-semibold custom-btn shadow-sm"
                  >
                    Next tip
                  </button>
                </div>
              </>
            )}

            {walkthroughStep === 3 && (
              <>
                <h3 className="font-outfit text-xl font-bold mb-2">3. Fuel Your Momentum</h3>
                <p className="text-sm text-gray-500 leading-relaxed font-light mb-6">
                  Your <span className="font-semibold text-[#FF6B4A]">Momentum Ring</span> at the top tracks progress. Watch it ignite with coral-orange color as you mark items done!
                </p>
                <button 
                  onClick={() => setWalkthroughStep(null)}
                  className="w-full py-2.5 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-xs font-semibold custom-btn shadow-sm"
                >
                  Let's get started!
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/45 backdrop-blur-md border-b border-white/30 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate("/")}>
            <div className="w-8 h-8 rounded-full bg-[#FF6B4A] flex items-center justify-center text-white shadow-sm">
              <Zap className="w-4 h-4 fill-white stroke-none" />
            </div>
            <span className="font-outfit text-lg font-bold tracking-tight">Last-Minute Life Saver</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <div className="px-3 py-1.5 bg-[#FAFAF9] border border-[#ECE9E3] rounded-full text-gray-600 tabular-nums font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#FF6B4A]" />
              {currentTime.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} &bull; {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>

            <div className="text-gray-500">
              Logged in: <span className="font-medium text-[#232323]">{userEmail}</span>
            </div>

            <button
              onClick={() => setWalkthroughStep(1)}
              className="p-1.5 text-gray-400 hover:text-[#FF6B4A] transition-colors"
              title="Show Guide"
              id="guide-btn"
            >
              <HelpCircle className="w-4 h-4" />
            </button>

            <ProfileMenu onNavigate={onNavigate} onLogout={onLogout} userEmail={userEmail} />
          </div>
        </div>
      </header>

      {/* Top Banner alert (if local mock mode) */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border-b border-amber-200 py-2.5 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs text-amber-800">
            <span className="flex items-center gap-2 font-light">
              <AlertTriangle className="w-4 h-4 text-[#F2A93B] shrink-0" />
              <span>You are currently in offline Sandbox Mode. To enable secure cloud backup, configure <strong className="font-semibold text-amber-950">VITE_SUPABASE_URL</strong> and <strong className="font-semibold text-amber-950">VITE_SUPABASE_ANON_KEY</strong> in your Secrets.</span>
            </span>
            <button 
              onClick={() => {
                // Copy sql instructions placeholder
                setActionSuccess("Copied database schema link reference!");
              }} 
              className="underline text-amber-950 hover:text-amber-800 font-semibold"
            >
              How to setup Database?
            </button>
          </div>
        </div>
      )}

      {/* Alerts */}
      {actionError && (
        <div className="fixed top-20 right-6 bg-red-50 border border-red-200 text-xs text-red-700 px-4 py-3 rounded-xl shadow-lg z-40 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#E2574C]" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="fixed top-20 right-6 bg-emerald-50 border border-emerald-200 text-xs text-[#4CAF82] px-4 py-3 rounded-xl shadow-lg z-40 flex items-center gap-2">
          <Check className="w-4 h-4 text-[#4CAF82]" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Main Content Dashboard */}
      <main className="max-w-7xl mx-auto px-6 py-8 w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* UPPER ROW: Momentum Ring Header Card & Motivation */}
        <section className="lg:col-span-12" id="momentum-section">
          <div className="custom-card p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-3 text-center md:text-left max-w-xl">
              <div className="inline-block px-3 py-1 bg-orange-50 border border-orange-100 rounded-full text-xs font-semibold text-[#FF6B4A]">
                🎯 Today's Target
              </div>
              <h2 className="font-outfit text-3xl font-extrabold tracking-tight">Your Momentum Hub</h2>
              
              <p className="text-gray-500 font-light text-sm md:text-base leading-relaxed">
                {planMantra || "No pressure, just progress. Every small action you complete right now chips away at the deadline anxiety."}
              </p>

              {/* AI Actions Quick Row */}
              <div className="pt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button
                  onClick={handleAIPrioritisation}
                  disabled={aiPrioritizing || loading}
                  className="px-4 py-2 bg-white hover:bg-orange-50 text-[#FF6B4A] hover:text-[#ff5631] border border-[#FF6B4A]/40 text-xs font-semibold custom-btn shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                  id="btn-ai-prioritize"
                >
                  {aiPrioritizing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sorting chaos...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" /> Curate AI Priorities
                    </>
                  )}
                </button>

                <button
                  onClick={handleAIGeneratePlan}
                  disabled={aiPlanning || loading}
                  className="px-4 py-2 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-xs font-semibold custom-btn shadow-sm hover:shadow flex items-center gap-1.5 disabled:opacity-50"
                  id="btn-generate-plan"
                >
                  {aiPlanning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Structuring day...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3.5 h-3.5" /> Generate Today's Plan
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Momentum Ring Signature Element */}
            <div className="flex flex-col items-center shrink-0 w-full md:w-auto" id="momentum-ring-container">
              <div className="relative w-32 h-32 flex items-center justify-center">
                {/* SVG Circular Progress Ring */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    stroke="#ECE9E3"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="52"
                    stroke="#FF6B4A"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 52}
                    strokeDashoffset={2 * Math.PI * 52 * (1 - taskCompletionPercent / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                {/* Inner textual score */}
                <div className="absolute text-center">
                  <span className="font-outfit text-3xl font-bold text-[#232323] tabular-nums">
                    {taskCompletionPercent}%
                  </span>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">Momentum</p>
                </div>
              </div>

              {/* Brief encouraging line below */}
              <p className="text-xs text-gray-600 font-medium mt-3 text-center max-w-[180px]">
                {totalTasksToday === 0 
                  ? "No tasks registered yet!" 
                  : `${completedTasksToday} of ${totalTasksToday} done — ${
                      taskCompletionPercent === 100 
                        ? "absolutely incredible job!" 
                        : taskCompletionPercent > 60 
                        ? "almost there, keep pushin'!" 
                        : "building steady flow!"
                    }`}
              </p>
            </div>
          </div>
        </section>

        {/* Most Urgent Reminder Banner */}
        {mostUrgentTask && (
          <section className="lg:col-span-12" id="urgent-reminder-banner">
            <div className="bg-gradient-to-r from-[#FF6B4A]/10 to-[#F2A93B]/10 border border-[#FF6B4A]/30 backdrop-blur-md rounded-2xl p-4 md:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs relative overflow-hidden">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-[#FF6B4A]/5 pointer-events-none">
                <AlertCircle className="w-48 h-48" />
              </div>
              
              <div className="flex items-start gap-3.5 relative z-10">
                <div className="p-2 bg-[#FF6B4A]/10 text-[#FF6B4A] rounded-xl flex-shrink-0 mt-0.5 animate-pulse">
                  <AlertCircle className="w-5.5 h-5.5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[#FF6B4A] uppercase tracking-wider bg-orange-100/60 px-2 py-0.5 rounded-full">
                      🔥 Rescue Target
                    </span>
                    <span className="text-[10px] text-gray-500 font-semibold tabular-nums">
                      Due: {formatDeadline(mostUrgentTask.deadline).formatted}
                    </span>
                  </div>
                  <h4 className="font-outfit text-base font-extrabold text-[#232323]">
                    {mostUrgentTask.title}
                  </h4>
                  {mostUrgentTask.aiTip ? (
                    <p className="text-xs text-gray-600 italic font-light">
                      💡 &ldquo;{mostUrgentTask.aiTip}&rdquo;
                    </p>
                  ) : (
                    <p className="text-xs text-gray-600 italic font-light">
                      💡 No pressure. Break it into 3 small parts and just start the first part for 15 minutes!
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 relative z-10 w-full md:w-auto justify-end">
                <button
                  onClick={() => handleToggleTaskStatus(mostUrgentTask.id)}
                  className="w-full md:w-auto px-4 py-2 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-xs font-bold custom-btn shadow-sm flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  id="complete-urgent-task"
                >
                  <Check className="w-4 h-4 stroke-[3]" /> Defuse Now
                </button>
              </div>
            </div>
          </section>
        )}

        {/* BOTTOM ROW: LEFT (Tasks Column - lg:col-span-8), RIGHT (Daily plan & habits Column - lg:col-span-4) */}
        
        {/* Tasks Section */}
        <section className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="font-outfit text-2xl font-bold tracking-tight flex items-center gap-2">
              <span>Your Rescue Station</span>
              <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-full text-gray-500 tabular-nums">{tasks.filter(t => t.status === 'pending').length} pending</span>
            </h3>

            {/* Navigation & Add trigger */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Tabs */}
              <div className="bg-white border border-[#ECE9E3] rounded-lg p-0.5 flex gap-0.5">
                <button
                  onClick={() => setFilter("all")}
                  className={`px-3 py-1.5 text-xs font-semibold custom-btn ${filter === "all" ? "bg-[#FAFAF9] text-[#232323]" : "text-gray-500 hover:text-gray-900"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter("pending")}
                  className={`px-3 py-1.5 text-xs font-semibold custom-btn ${filter === "pending" ? "bg-[#FAFAF9] text-[#232323]" : "text-gray-500 hover:text-gray-900"}`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setFilter("completed")}
                  className={`px-3 py-1.5 text-xs font-semibold custom-btn ${filter === "completed" ? "bg-[#FAFAF9] text-[#232323]" : "text-gray-500 hover:text-gray-900"}`}
                >
                  Done
                </button>
                <button
                  onClick={() => setFilter("ai")}
                  className={`px-3 py-1.5 text-xs font-semibold custom-btn flex items-center gap-1 ${filter === "ai" ? "bg-orange-50 text-[#FF6B4A]" : "text-gray-500 hover:text-[#FF6B4A]"}`}
                >
                  <Sparkles className="w-3 h-3" /> AI Prioritized
                </button>
              </div>

              {/* Add Task Button */}
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-4 py-2 bg-[#232323] hover:bg-gray-800 text-white text-xs font-semibold custom-btn shadow-xs flex items-center gap-1"
                id="add-task-toggle"
              >
                <Plus className="w-3.5 h-3.5" /> Add Task
              </button>

              {/* Voice Add Button */}
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(true);
                  toggleListening();
                }}
                className={`px-3 py-2 text-xs font-semibold custom-btn shadow-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                  isListening 
                    ? "bg-red-50 text-red-600 border-red-200 animate-pulse" 
                    : "bg-white hover:bg-orange-50 text-[#FF6B4A] hover:text-[#ff5631] border-[#FF6B4A]/40"
                }`}
                title="Speak to add a task"
                id="speech-recognition-btn-header"
              >
                {isListening ? <MicOff className="w-3.5 h-3.5 text-red-500 animate-pulse" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isListening ? "Listening..." : "Speak Task"}</span>
              </button>
            </div>
          </div>

          {/* Add Task Expandable Form */}
          {showAddForm && (
            <div className="custom-card p-6 animate-fade-in" id="add-task-form-container">
              <h4 className="font-outfit font-bold text-lg mb-2 text-[#FF6B4A]">Register a High-Stakes Deadline</h4>
              
              {speechFeedback && (
                <div className="text-xs font-semibold px-3 py-1.5 bg-orange-50 border border-orange-100 rounded-lg text-[#FF6B4A] flex items-center gap-2 animate-pulse mb-4">
                  <span className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-ping' : 'bg-orange-400'}`}></span>
                  <span>{speechFeedback}</span>
                </div>
              )}

              <form onSubmit={handleCreateTask} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Title */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Task Title</label>
                      <span className="text-[10px] text-gray-400 italic">Try speaking: "Finish chemistry paper by tomorrow at 5 PM"</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Finish final chemistry paper citations"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="flex-1 px-4 py-2 bg-[#FAFAF9] border border-[#ECE9E3] focus:border-[#FF6B4A] outline-none text-sm rounded-lg"
                        required
                      />
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`px-3.5 py-2 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                          isListening 
                            ? "bg-red-50 text-red-600 border-red-200 animate-pulse" 
                            : "bg-[#FAFAF9] border-[#ECE9E3] text-gray-500 hover:text-[#FF6B4A] hover:border-[#FF6B4A]/50"
                        }`}
                        title="Speak to add task"
                        id="speech-recognition-btn-form"
                      >
                        {isListening ? <MicOff className="w-4 h-4 text-red-500 animate-pulse" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Brief details or subtasks</label>
                    <textarea
                      placeholder="Describe parts to tackle so the AI can build dynamic tips..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2 bg-[#FAFAF9] border border-[#ECE9E3] focus:border-[#FF6B4A] outline-none text-sm rounded-lg h-20 resize-none"
                    />
                  </div>

                  {/* Deadline Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Due Date</label>
                    <input
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      className="w-full px-4 py-2 bg-[#FAFAF9] border border-[#ECE9E3] focus:border-[#FF6B4A] outline-none text-sm rounded-lg"
                      required
                    />
                  </div>

                  {/* Deadline Time */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Due Time</label>
                    <input
                      type="time"
                      value={deadlineTime}
                      onChange={(e) => setDeadlineTime(e.target.value)}
                      className="w-full px-4 py-2 bg-[#FAFAF9] border border-[#ECE9E3] focus:border-[#FF6B4A] outline-none text-sm rounded-lg"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-4 py-2 bg-[#FAFAF9] border border-[#ECE9E3] focus:border-[#FF6B4A] outline-none text-sm rounded-lg"
                    >
                      <option value="Academic">Academic</option>
                      <option value="Work">Work</option>
                      <option value="Personal">Personal</option>
                      <option value="Admin">Admin</option>
                      <option value="Health">Health</option>
                    </select>
                  </div>

                  {/* Estimated Minutes Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Effort Estimate</label>
                    <select
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                      className="w-full px-4 py-2 bg-[#FAFAF9] border border-[#ECE9E3] focus:border-[#FF6B4A] outline-none text-sm rounded-lg"
                    >
                      <option value={15}>15min (Quick Win)</option>
                      <option value={30}>30min (Focused Block)</option>
                      <option value={60}>1hr (Deep Dive)</option>
                      <option value={120}>2hr+ (Heavy Sprint)</option>
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as PriorityType)}
                      className="w-full px-4 py-2 bg-[#FAFAF9] border border-[#ECE9E3] focus:border-[#FF6B4A] outline-none text-sm rounded-lg"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent / S.O.S</option>
                    </select>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Difficulty level</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value as DifficultyType)}
                      className="w-full px-4 py-2 bg-[#FAFAF9] border border-[#ECE9E3] focus:border-[#FF6B4A] outline-none text-sm rounded-lg"
                    >
                      <option value="easy">Easy (quick win)</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard (heavy sprint)</option>
                    </select>
                  </div>

                  {/* Mark as Daily Habit Checkbox */}
                  <div className="md:col-span-2 flex items-center gap-2 pt-2 border-t border-[#ECE9E3]/50">
                    <input
                      type="checkbox"
                      id="markAsHabitInForm"
                      checked={markAsHabitInForm}
                      onChange={(e) => setMarkAsHabitInForm(e.target.checked)}
                      className="w-4 h-4 text-[#FF6B4A] focus:ring-[#FF6B4A] border-gray-300 rounded cursor-pointer accent-[#FF6B4A]"
                    />
                    <label htmlFor="markAsHabitInForm" className="text-xs font-bold text-gray-700 cursor-pointer select-none flex items-center gap-1.5">
                      <Repeat className="w-3.5 h-3.5 text-[#FF6B4A]" />
                      <span>Mark as Daily Habit (also creates a sustained 7-day tracker)</span>
                    </label>
                  </div>

                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium custom-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-xs font-bold custom-btn shadow-sm"
                    id="add-task-submit"
                  >
                    Rescue This Deadline
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Loader or Placeholder state for task empty list */}
          {initialLoadError ? (
            <div className="custom-card p-8 border border-red-200 bg-red-50/50 text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500">
                <AlertCircle className="w-6 h-6 animate-bounce" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <h4 className="font-outfit text-base font-bold text-gray-800">We couldn't reach your Rescue Desk data</h4>
                <p className="text-xs text-gray-500 font-light leading-relaxed">
                  There was a minor hiccup loading your tasks. Don't worry, your progress is safe. Let's try refreshing the connection!
                </p>
              </div>
              <button
                onClick={loadDashboardData}
                className="px-5 py-2 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-xs font-bold custom-btn shadow-sm"
              >
                Retry Loading Records
              </button>
            </div>
          ) : loading ? (
            <div className="custom-card p-12 text-center bg-white/45 backdrop-blur-md border border-white/30 space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-[#FF6B4A]/20 border-t-[#FF6B4A] animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-[#F2A93B]/20 border-b-[#F2A93B] animate-spin" style={{ animationDirection: 'reverse' }} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-700 animate-pulse">Setting up your Rescue Station...</p>
                <p className="text-xs text-gray-400 font-light">Calmly fetching your high-stakes tasks and habits.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Calm loader while Gemini is prioritizing tasks */}
              {aiPrioritizing && (
                <div className="custom-card p-6 border border-[#FF6B4A]/30 bg-[#FF6B4A]/5 relative overflow-hidden animate-pulse mb-6">
                  <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-orange-400 via-[#FF6B4A] to-amber-500 animate-[shimmer_2s_infinite]" style={{ width: "200%" }} />
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/80 rounded-full text-[#FF6B4A] shadow-xs flex items-center justify-center animate-spin">
                      <Sparkles className="w-5 h-5 fill-[#FF6B4A] stroke-none animate-pulse" />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-outfit text-sm font-bold text-gray-800">Gemini is calmly reviewing your high-stakes tasks...</h4>
                      <p className="text-xs text-gray-500 font-light leading-relaxed">
                        Take a deep breath. We are analyzing deadlines, estimated workloads, and finding the best "quick-win" momentum items to clear your head.
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#FF6B4A] uppercase tracking-wider">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Curating stress-reducing priorities</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Retry-able Prioritization Error banner */}
              {aiPrioritizeError && (
                <div className="custom-card p-5 border border-red-200 bg-red-50/40 mb-6 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                  <div className="flex gap-3 text-left">
                    <div className="p-1.5 bg-red-100 text-red-500 rounded-lg shrink-0 h-8 w-8 flex items-center justify-center">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-outfit text-xs font-bold text-gray-800">Gemini Prioritization timed out</h4>
                      <p className="text-[11px] text-gray-500 font-light leading-relaxed mt-0.5">
                        We couldn't organize your task list with AI. You can still manage them normally, or retry.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => setAiPrioritizeError(false)}
                      className="px-2.5 py-1.5 bg-white border border-gray-200 text-gray-500 hover:text-gray-700 text-[11px] font-semibold custom-btn"
                    >
                      Dismiss
                    </button>
                    <button
                      onClick={handleAIPrioritisation}
                      className="px-3 py-1.5 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-[11px] font-bold custom-btn flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Retry sorting
                    </button>
                  </div>
                </div>
              )}

              {getFilteredTasks().length === 0 ? (
                <div className="custom-card p-10 text-center bg-white/40 border border-[#ECE9E3]/50 space-y-4">
                  <div className="w-14 h-14 bg-emerald-50 text-[#4CAF82] rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div className="space-y-1.5 max-w-sm mx-auto">
                    <h4 className="font-outfit text-base font-bold text-gray-800">Rescue Zone Clear!</h4>
                    <p className="text-xs text-gray-500 font-light leading-relaxed">
                      All quiet on the deadline front! Use the spacing to restore your energy, or register a new priority task to take steady command of your day.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-xs font-semibold custom-btn shadow-xs"
                  >
                    Add High-Stakes Task
                  </button>
                </div>
              ) : (
                /* Tasks List rendering */
                <div className="space-y-4" id="tasks-list">
              {getFilteredTasks().map((task) => {
                const deadlineData = formatDeadline(task.deadline);
                
                return (
                  <div 
                    key={task.id} 
                    className={`custom-card p-5 transition-all border-l-4 hover:border-l-8 ${
                      task.status === "completed" 
                        ? "border-l-[#4CAF82] opacity-75" 
                        : task.priority === "urgent"
                        ? "border-l-[#FF6B4A]"
                        : task.priority === "high"
                        ? "border-l-[#F2A93B]"
                        : "border-l-[#ECE9E3]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      
                      {/* Checkbox trigger & Title info */}
                      <div className="flex items-start gap-3">
                        <button 
                          onClick={() => handleToggleTaskStatus(task.id)}
                          className="mt-1 transition-transform transform active:scale-95 text-[#232323] cursor-pointer"
                          id={`toggle-task-${task.id}`}
                        >
                          {task.status === "completed" ? (
                            <CheckCircle2 className="w-5.5 h-5.5 text-[#4CAF82] fill-emerald-50 stroke-2" />
                          ) : (
                            <Circle className="w-5.5 h-5.5 text-gray-300 hover:text-[#FF6B4A] stroke-2" />
                          )}
                        </button>

                        <div>
                          <h4 className={`font-outfit text-base font-bold ${task.status === "completed" ? "line-through text-gray-400" : "text-[#232323]"}`}>
                            {task.title}
                          </h4>
                          
                          {task.description && (
                            <p className="text-xs text-gray-500 font-light mt-1 max-w-xl leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Attribute badges */}
                          <div className="flex flex-wrap items-center gap-2 mt-3.5">
                            <span className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                              {task.category}
                            </span>
                            
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              task.priority === "urgent" 
                                ? "bg-red-50 text-[#E2574C] border border-red-100" 
                                : task.priority === "high"
                                ? "bg-amber-50 text-[#F2A93B] border border-amber-100"
                                : "bg-gray-50 text-gray-500 border border-gray-100"
                            }`}>
                              Priority: {task.priority}
                            </span>

                            <span className="px-2 py-0.5 bg-gray-50 border border-gray-100 rounded text-[10px] font-medium text-gray-500 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#FF6B4A]" /> {task.estimated_minutes} min effort
                            </span>

                            {/* Risk Status Badge */}
                            {(() => {
                              const rStatus = getTaskRiskStatus(task);
                              let rClass = "";
                              if (rStatus === "Overdue Risk") rClass = "bg-red-50 text-red-600 border border-red-100";
                              else if (rStatus === "Tight") rClass = "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse";
                              else rClass = "bg-emerald-50 text-emerald-600 border border-emerald-100";
                              
                              return (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold flex items-center gap-1 uppercase tracking-wider ${rClass}`}>
                                  {rStatus === "Overdue Risk" && <AlertTriangle className="w-2.5 h-2.5" />}
                                  {rStatus === "Tight" && <Clock className="w-2.5 h-2.5" />}
                                  {rStatus === "On Track" && <Check className="w-2.5 h-2.5" />}
                                  {rStatus}
                                </span>
                              );
                            })()}

                            {/* Draft Extension Request Button for Overdue Risk */}
                            {getTaskRiskStatus(task) === "Overdue Risk" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (extensionDrafts[task.id]) {
                                    // Toggle off if already open
                                    setExtensionDrafts(prev => {
                                      const copy = { ...prev };
                                      delete copy[task.id];
                                      return copy;
                                    });
                                  } else {
                                    handleGenerateExtensionDraft(task);
                                  }
                                }}
                                disabled={loadingDrafts[task.id]}
                                className="px-2 py-0.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 rounded text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                                title="Draft extension request using Gemini AI"
                                id={`draft-extension-btn-${task.id}`}
                              >
                                {loadingDrafts[task.id] ? (
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                ) : (
                                  <Mail className="w-2.5 h-2.5" />
                                )}
                                {loadingDrafts[task.id] ? "Drafting..." : extensionDrafts[task.id] ? "Hide Draft" : "Draft Extension"}
                              </button>
                            )}

                            {/* Dynamic Urgency Label Badge */}
                            {deadlineData.urgencyLabel && (
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest tabular-nums ${deadlineData.urgencyClass}`}>
                                {deadlineData.urgencyLabel}
                              </span>
                            )}

                            {/* Daily Habit integration */}
                            {(() => {
                              const matchingHabit = habits.find(h => h.name.toLowerCase().trim() === task.title.toLowerCase().trim());
                              if (matchingHabit) {
                                return (
                                  <span className="px-2 py-0.5 bg-orange-50 border border-orange-100 text-[#FF6B4A] rounded text-[10px] font-bold flex items-center gap-1">
                                    <Repeat className="w-2.5 h-2.5" /> Daily Habit
                                  </span>
                                );
                              } else {
                                return (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      try {
                                        const created = await dataService.createHabit(userId, task.title);
                                        setHabits(prev => [...prev, created]);
                                        setActionSuccess(`"${task.title}" is now tracked as a daily habit!`);
                                      } catch (err) {
                                        setActionError("Failed to register habit.");
                                      }
                                    }}
                                    className="px-2 py-0.5 hover:bg-orange-50 hover:text-[#FF6B4A] text-gray-400 border border-gray-200 hover:border-orange-200 rounded text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer"
                                    title="Mark as a daily repeating habit"
                                    id={`mark-habit-task-${task.id}`}
                                  >
                                    <Plus className="w-2.5 h-2.5" /> Mark as Daily Habit
                                  </button>
                                );
                              }
                            })()}
                          </div>
                        </div>
                      </div>

                      {/* Right Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1.5 text-gray-400 hover:text-[#E2574C] rounded-lg hover:bg-gray-50 transition-all cursor-pointer"
                          title="Delete task"
                          id={`delete-task-${task.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                    </div>

                    {/* If it's a daily habit, render the 7-day tracker */}
                    {(() => {
                      const matchingHabit = habits.find(h => h.name.toLowerCase().trim() === task.title.toLowerCase().trim());
                      if (matchingHabit) {
                        return (
                          <div className="mt-4 pt-3 border-t border-gray-100/60" id={`task-habit-tracker-${task.id}`}>
                            <div className="text-[10px] text-gray-400 font-semibold mb-2 flex items-center justify-between">
                              <span>WEEKLY HABIT PROGRESS</span>
                              <span className="text-[#FF6B4A] tabular-nums font-bold flex items-center gap-1">
                                <Repeat className="w-3 h-3" />
                                {matchingHabit.streak} day streak
                              </span>
                            </div>
                            <div className="flex items-center justify-start gap-4">
                              {get7DayWindow().map(({ dateStr, label, singleChar }) => {
                                const isCompleted = matchingHabit.completed_dates.includes(dateStr);
                                const isToday = dateStr === new Date().toISOString().split("T")[0];
                                return (
                                  <button
                                    key={dateStr}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleHabitForDate(matchingHabit.id, dateStr);
                                    }}
                                    className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
                                    title={`${label} (${dateStr}): ${isCompleted ? 'Done' : 'Not done'}`}
                                  >
                                    <span className={`text-[9px] font-bold ${isToday ? "text-[#FF6B4A]" : "text-gray-400"} uppercase`}>
                                      {singleChar}
                                    </span>
                                    <div 
                                      className={`w-3.5 h-3.5 rounded-full transition-all duration-200 flex items-center justify-center ${
                                        isCompleted 
                                          ? "bg-[#FF6B4A] shadow-xs scale-110" 
                                          : "border-1.5 border-gray-300 bg-transparent group-hover:border-[#FF6B4A]"
                                      }`}
                                    >
                                      {isCompleted && <Check className="w-2.5 h-2.5 text-white stroke-3" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* AI Enriched Section (Only displays if AI prioritized has run) */}
                    {(task.aiTip || task.momentumCategory || task.stressScore || task.priorityRank || task.suggestedStartTime || task.riskLevel) && task.status !== "completed" && (
                      <div className="mt-4 pt-4 border-t border-dashed border-gray-100 bg-[#FAFAF9]/60 p-3 rounded-xl">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#FF6B4A]">
                            <Sparkles className="w-3.5 h-3.5 fill-[#FF6B4A] stroke-none" />
                            <span>AI Companion Insights</span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            {task.priorityRank !== undefined && (
                              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full text-[10px] font-bold flex items-center gap-1">
                                <Award className="w-3 h-3" /> Rank #{task.priorityRank}
                              </span>
                            )}

                            {task.suggestedStartTime && task.suggestedEndTime && (
                              <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-[10px] font-semibold flex items-center gap-1">
                                <Clock className="w-3 h-3 text-indigo-500" /> {task.suggestedStartTime} &ndash; {task.suggestedEndTime}
                              </span>
                            )}

                            {task.riskLevel && (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                                task.riskLevel === "high"
                                  ? "bg-red-50 text-red-700 border-red-100 animate-pulse"
                                  : task.riskLevel === "medium"
                                  ? "bg-amber-50 text-amber-700 border-amber-100"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-100"
                              }`}>
                                Risk: {task.riskLevel.toUpperCase()}
                              </span>
                            )}

                            {task.momentumCategory && (
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                task.momentumCategory === "Critical: Do Now"
                                  ? "bg-red-50 text-[#E2574C]"
                                  : "bg-orange-50 text-[#FF6B4A]"
                              }`}>
                                {task.momentumCategory}
                              </span>
                            )}

                            {task.stressScore !== undefined && (
                              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                <span className="font-semibold text-gray-800">Anxiety level:</span> 
                                <span className="font-extrabold text-[#FF6B4A]">{task.stressScore}/10</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {task.aiTip && (
                          <p className="text-xs text-gray-600 font-light italic leading-normal">
                            &ldquo;{task.aiTip}&rdquo;
                          </p>
                        )}
                      </div>
                    )}

                    {/* Retry-able Drafting Error block */}
                    {aiDraftError[task.id] && (
                      <div className="mt-4 pt-4 border-t border-red-100 bg-red-50/20 p-3 rounded-xl animate-fade-in flex flex-col sm:flex-row items-center sm:items-start justify-between gap-3" id={`draft-error-${task.id}`}>
                        <div className="flex gap-2 text-left">
                          <AlertCircle className="w-4 h-4 text-[#E2574C] mt-0.5 shrink-0 animate-bounce" />
                          <div>
                            <h5 className="text-xs font-bold text-gray-800">Drafting assistance failed</h5>
                            <p className="text-[10px] text-gray-500 font-light leading-relaxed mt-0.5">
                              Gemini was unable to design your extension email. Want to try once more?
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleGenerateExtensionDraft(task)}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-bold shrink-0 flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                        >
                          <RefreshCw className="w-2.5 h-2.5" /> Retry Draft
                        </button>
                      </div>
                    )}

                    {/* Generated Extension Request Draft Block */}
                    {extensionDrafts[task.id] && (
                      <div className="mt-4 pt-4 border-t border-red-100 bg-red-50/10 p-4 rounded-xl animate-fade-in" id={`extension-draft-box-${task.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-600">
                            <Mail className="w-3.5 h-3.5" />
                            <span>Gemini Draft Extension Request</span>
                          </div>
                          <button
                            onClick={() => {
                              setExtensionDrafts(prev => {
                                const copy = { ...prev };
                                delete copy[task.id];
                                return copy;
                              });
                            }}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 cursor-pointer"
                            title="Close Draft"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        
                        <p className="text-[11px] text-gray-500 mb-2">
                          Here is a polite request draft prepared for your deadline. Feel free to tweak it before copying!
                        </p>

                        <textarea
                          value={extensionDrafts[task.id]}
                          onChange={(e) => {
                            const newText = e.target.value;
                            setExtensionDrafts(prev => ({ ...prev, [task.id]: newText }));
                          }}
                          rows={6}
                          className="w-full text-xs font-mono p-3 bg-white border border-red-100 focus:border-red-400 outline-none rounded-lg text-gray-700 leading-relaxed resize-y"
                          id={`extension-draft-textarea-${task.id}`}
                        />

                        <div className="flex items-center justify-between mt-3">
                          <span className="text-[10px] text-gray-400 italic">
                            * Remember to customize [Your Name]
                          </span>
                          <button
                            onClick={() => handleCopyDraft(task.id, extensionDrafts[task.id])}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                            id={`copy-draft-btn-${task.id}`}
                          >
                            {copiedDrafts[task.id] ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-3" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copy Draft</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* RIGHT COLUMN: Habits & Plan Timeline (lg:col-span-4) */}
        <section className="lg:col-span-4 space-y-8">
          
          {/* Habits Section */}
          <div className="space-y-4" id="habits-section">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit text-xl font-bold tracking-tight">Sustained Habits</h3>
              <button
                onClick={() => setShowHabitForm(!showHabitForm)}
                className="p-1.5 bg-white border border-[#ECE9E3] hover:bg-gray-50 rounded-lg text-gray-600 text-xs font-semibold shadow-xs flex items-center gap-1 cursor-pointer"
                id="add-habit-toggle"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add Habit Tiny Form */}
            {showHabitForm && (
              <form onSubmit={handleCreateHabit} className="custom-card p-4 animate-fade-in space-y-3">
                <input
                  type="text"
                  placeholder="e.g. 5-minute deep breathing, Water check"
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAFAF9] border border-[#ECE9E3] focus:border-[#FF6B4A] outline-none text-xs rounded-lg"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHabitForm(false)}
                    className="px-3 py-1 bg-gray-50 hover:bg-gray-100 text-gray-500 text-[10px] font-medium rounded-md"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-[10px] font-bold rounded-md"
                    id="add-habit-submit"
                  >
                    Install Habit
                  </button>
                </div>
              </form>
            )}

            {/* Habits List */}
            {habits.length === 0 ? (
              <div className="custom-card p-5 text-center bg-white/45 backdrop-blur-md border border-[#ECE9E3]/40 space-y-3.5" id="habits-empty-state">
                <Repeat className="w-8 h-8 text-[#FF6B4A]/50 mx-auto animate-pulse" />
                <div className="space-y-1">
                  <h4 className="font-outfit text-xs font-bold text-gray-800">Support Routine is Empty</h4>
                  <p className="text-[11px] text-gray-400 font-light leading-relaxed">
                    Under high pressure, tiny anchors keep you grounded. Install a simple daily mini-habit to safeguard your energy.
                  </p>
                </div>
                <div className="pt-1 flex flex-wrap justify-center gap-1.5">
                  <button
                    onClick={async () => {
                      try {
                        const created = await dataService.createHabit(userId, "5-min Deep Breathing");
                        setHabits(prev => [...prev, created]);
                        setActionSuccess("Created '5-min Deep Breathing' habit!");
                      } catch (err) {
                        setActionError("Could not add habit.");
                      }
                    }}
                    className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-[#FF6B4A] rounded text-[10px] font-semibold transition-all cursor-pointer"
                  >
                    + Quick Add "Deep Breathing"
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const created = await dataService.createHabit(userId, "Drink Water Break");
                        setHabits(prev => [...prev, created]);
                        setActionSuccess("Created 'Drink Water Break' habit!");
                      } catch (err) {
                        setActionError("Could not add habit.");
                      }
                    }}
                    className="px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-[#FF6B4A] rounded text-[10px] font-semibold transition-all cursor-pointer"
                  >
                    + Quick Add "Drink Water"
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {habits.map((habit) => {
                  const done = isHabitDoneToday(habit);
                  return (
                    <div key={habit.id} className="custom-card p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            onClick={() => handleToggleHabit(habit.id)}
                            className="transition-transform transform active:scale-90 shrink-0 cursor-pointer"
                            id={`toggle-habit-${habit.id}`}
                          >
                            {done ? (
                              <div className="w-5 h-5 rounded-md bg-[#4CAF82] flex items-center justify-center text-white">
                                <Check className="w-3.5 h-3.5 stroke-2" />
                              </div>
                            ) : (
                              <div className="w-5 h-5 rounded-md border-2 border-gray-200 hover:border-[#FF6B4A]" />
                            )}
                          </button>
                          
                          <div className="min-w-0">
                            <span className={`text-xs font-semibold block truncate ${done ? "line-through text-gray-400" : "text-[#232323]"}`}>
                              {habit.name}
                            </span>
                            <span className="text-[10px] text-gray-400 font-medium block">
                              Streak: <span className="text-[#FF6B4A] font-bold tabular-nums">{habit.streak} days</span>
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteHabit(habit.id)}
                          className="p-1 text-gray-300 hover:text-[#E2574C] rounded cursor-pointer"
                          title="Delete habit"
                          id={`delete-habit-${habit.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 7-day streak dots */}
                      <div className="pt-2.5 border-t border-gray-100/60">
                        <div className="flex items-center justify-between px-0.5">
                          {get7DayWindow().map(({ dateStr, label, singleChar }) => {
                            const isCompleted = habit.completed_dates.includes(dateStr);
                            const isToday = dateStr === new Date().toISOString().split("T")[0];
                            return (
                              <button
                                key={dateStr}
                                onClick={() => handleToggleHabitForDate(habit.id, dateStr)}
                                className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
                                title={`${label} (${dateStr}): ${isCompleted ? 'Done' : 'Not done'}`}
                              >
                                <span className={`text-[9px] font-bold ${isToday ? "text-[#FF6B4A]" : "text-gray-400"} uppercase`}>
                                  {singleChar}
                                </span>
                                <div 
                                  className={`w-3 h-3 rounded-full transition-all duration-200 flex items-center justify-center ${
                                    isCompleted 
                                      ? "bg-[#FF6B4A] shadow-xs scale-110" 
                                      : "border-1.5 border-gray-300 bg-transparent group-hover:border-[#FF6B4A]"
                                  }`}
                                >
                                  {isCompleted && <Check className="w-2 h-2 text-white stroke-3" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recommendations Panel */}
          <div className="space-y-4" id="recommendations-section">
            <h3 className="font-outfit text-xl font-bold tracking-tight flex items-center gap-1.5 text-[#FF6B4A]">
              <Sparkles className="w-5 h-5 fill-[#FF6B4A] stroke-none animate-pulse" />
              <span>Recommendations</span>
            </h3>
            <div className="custom-card p-5 bg-white/45 backdrop-blur-md border border-white/40 space-y-3">
              {aiPlanning ? (
                <div className="space-y-2.5 py-2 animate-pulse" id="recommendations-loading">
                  <div className="h-3.5 bg-gray-200 rounded w-1/3 mb-4" />
                  <div className="h-3 bg-gray-200/80 rounded w-full" />
                  <div className="h-3 bg-gray-200/60 rounded w-11/12" />
                  <div className="h-3 bg-gray-200/40 rounded w-5/6" />
                </div>
              ) : recommendations.length === 0 ? (
                <div className="text-center py-4 text-gray-400 space-y-2" id="recommendations-empty">
                  <TrendingUp className="w-8 h-8 mx-auto text-gray-300 animate-pulse" />
                  <p className="text-[11px] font-light leading-relaxed text-gray-400 max-w-xs mx-auto">
                    Let Gemini review your tasks to offer stress management quick wins, priority order, and rest suggestions.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed font-light">
                      <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#FF6B4A]" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Daily Schedule Timeline Section */}
          <div className="space-y-4" id="timeline-section">
            <div className="flex items-center justify-between">
              <h3 className="font-outfit text-xl font-bold tracking-tight">Today's Schedule</h3>
              <button
                onClick={() => setShowCalendarView(!showCalendarView)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                  showCalendarView 
                    ? "bg-[#FF6B4A]/10 text-[#FF6B4A] border-[#FF6B4A]/30" 
                    : "bg-white text-gray-500 border-[#ECE9E3] hover:text-[#FF6B4A]"
                }`}
                id="toggle-calendar-view"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{showCalendarView ? "Hide Calendar" : "View as Calendar"}</span>
              </button>
            </div>
            
            {aiPlanningError ? (
              <div className="custom-card p-5 border border-red-200 bg-red-50/40 text-center space-y-3" id="timeline-error">
                <AlertCircle className="w-8 h-8 text-[#E2574C] mx-auto animate-pulse" />
                <div className="space-y-1">
                  <h4 className="font-outfit text-xs font-bold text-gray-800">Timeline Generation Failed</h4>
                  <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                    We had some difficulty building your customized timeline plan with Gemini. Don't let it stress you out — you can try once more!
                  </p>
                </div>
                <button
                  onClick={handleAIGeneratePlan}
                  className="px-4 py-1.5 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-xs font-bold custom-btn flex items-center justify-center gap-1.5 mx-auto cursor-pointer transition-all active:scale-95 shadow-sm"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Scheduling
                </button>
              </div>
            ) : aiPlanning ? (
              <div className="custom-card p-6 border border-[#FF6B4A]/20 bg-[#FAFAF9] relative overflow-hidden animate-pulse" id="timeline-loading">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-[#FF6B4A]/10 text-[#FF6B4A] rounded-xl flex-shrink-0 animate-bounce">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="space-y-3 w-full">
                    <h4 className="font-outfit text-sm font-bold text-gray-800">Structuring your realistic timeline...</h4>
                    <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                      Gemini is organizing deadlines, allocating study blocks, and scheduling healthy breathing intervals. Just sit back and relax.
                    </p>
                    
                    {/* Animated pulse bars */}
                    <div className="space-y-2 pt-2">
                      <div className="h-5 bg-gray-200/70 rounded-md w-11/12" />
                      <div className="h-5 bg-gray-200/50 rounded-md w-9/12" />
                      <div className="h-5 bg-gray-200/30 rounded-md w-10/12" />
                    </div>
                  </div>
                </div>
              </div>
            ) : currentPlan.length === 0 ? (
              <div className="custom-card p-6 text-center border-2 border-dashed border-[#ECE9E3] bg-[#FAFAF9]/40 space-y-4" id="timeline-empty">
                <div className="w-12 h-12 bg-[#FF6B4A]/10 text-[#FF6B4A] rounded-full flex items-center justify-center mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="space-y-1 max-w-xs mx-auto">
                  <h4 className="font-outfit text-xs font-bold text-gray-800">No Daily Agenda Generated</h4>
                  <p className="text-[11px] text-gray-500 font-light leading-relaxed">
                    Let Gemini evaluate your high-stakes workload, split deadlines into hourly goals, and construct a highly realistic daily agenda with buffers.
                  </p>
                </div>
                <button
                  onClick={handleAIGeneratePlan}
                  disabled={aiPlanning || loading}
                  className="px-4 py-2 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-xs font-bold custom-btn w-full shadow-sm cursor-pointer"
                  id="btn-generate-plan-placeholder"
                >
                  Generate Daily Schedule
                </button>
              </div>
            ) : (
              <div className={showCalendarView ? "grid grid-cols-1 xl:grid-cols-2 gap-6" : "space-y-4"}>
                {/* Timeline Panel */}
                <div className="space-y-4">
                  <div className="relative pl-4 border-l-2 border-[#ECE9E3] space-y-4">
                    {currentPlan.map((slot, index) => (
                      <div key={index} className="relative group">
                        {/* Ring Node indicator */}
                        <div className={`absolute -left-[21px] top-1.5 w-3 h-3 rounded-full border-2 bg-white ${
                          slot.type === "task" 
                            ? "border-[#FF6B4A]" 
                            : slot.type === "break"
                            ? "border-[#4CAF82]"
                            : "border-gray-300"
                        }`} />

                        <div className="bg-white/45 backdrop-blur-md p-3 rounded-xl border border-white/40 shadow-xs">
                          <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold mb-1.5 uppercase tracking-wide tabular-nums">
                            <span>{slot.startTime} &ndash; {slot.endTime}</span>
                            <span className={`px-1.5 py-0.5 rounded ${
                              slot.type === "task"
                                ? "bg-orange-50 text-[#FF6B4A]"
                                : slot.type === "break"
                                ? "bg-emerald-50 text-[#4CAF82]"
                                : "bg-gray-100 text-gray-600"
                            }`}>{slot.type}</span>
                          </div>

                          <h5 className="font-outfit text-xs font-bold text-gray-800 leading-tight">
                            {slot.label}
                          </h5>

                          {slot.advice && (
                            <p className="text-[10px] text-gray-500 mt-1 font-light italic leading-normal">
                              &ldquo;{slot.advice}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Reset schedule trigger */}
                    <button
                      onClick={handleAIGeneratePlan}
                      disabled={aiPlanning}
                      className="w-full text-center py-2 text-xs text-gray-400 hover:text-[#FF6B4A] transition-all flex items-center justify-center gap-1"
                      id="rebuild-timeline"
                    >
                      <RefreshCw className={`w-3 h-3 ${aiPlanning ? "animate-spin" : ""}`} /> 
                      Rebuild schedule
                    </button>
                  </div>
                </div>

                {/* Calendar Grid View (rendered alongside) */}
                {showCalendarView && (
                  <div className="space-y-4" id="calendar-grid-view">
                    {(() => {
                      const parsedTasks = tasks
                        .filter(t => t.suggestedStartTime && t.suggestedEndTime)
                        .map(t => {
                          const start = parseTimeStr(t.suggestedStartTime!);
                          const end = parseTimeStr(t.suggestedEndTime!);
                          return { task: t, start, end };
                        })
                        .filter(item => item.start !== null && item.end !== null) as {
                          task: Task;
                          start: { hour: number; minute: number };
                          end: { hour: number; minute: number };
                        }[];

                      let minHour = 8;
                      let maxHour = 18;
                      if (parsedTasks.length > 0) {
                        const hours = parsedTasks.flatMap(pt => [pt.start.hour, pt.end.hour]);
                        minHour = Math.max(0, Math.min(...hours) - 1);
                        maxHour = Math.min(23, Math.max(...hours) + 1);
                      }

                      if (maxHour - minHour < 4) {
                        maxHour = Math.min(23, minHour + 8);
                      }

                      const hoursRange: number[] = [];
                      for (let h = minHour; h <= maxHour; h++) {
                        hoursRange.push(h);
                      }

                      const formatHourLabel = (h: number) => {
                        const ampm = h >= 12 ? "PM" : "AM";
                        const displayHour = h % 12 === 0 ? 12 : h % 12;
                        return `${displayHour}:00 ${ampm}`;
                      };

                      return (
                        <div className="custom-card p-4 bg-white/45 backdrop-blur-md border border-white/40 space-y-4">
                          <div className="flex items-center justify-between border-b border-[#ECE9E3] pb-3">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-[#FF6B4A]/10 text-[#FF6B4A] rounded-lg">
                                <Calendar className="w-4 h-4" />
                              </div>
                              <div>
                                <h4 className="font-outfit text-sm font-bold text-gray-800">Day Grid view</h4>
                                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Scheduled Tasks</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 bg-[#FAFAF9] px-2 py-0.5 rounded-full border border-[#ECE9E3] tabular-nums">
                              {parsedTasks.length} Task{parsedTasks.length !== 1 ? 's' : ''}
                            </span>
                          </div>

                          {parsedTasks.length === 0 ? (
                            <div className="text-center py-10 text-gray-400">
                              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                              <p className="text-xs font-light leading-relaxed">
                                No task times allocated on calendar yet.<br />
                                Please click <strong className="text-[#FF6B4A]">Generate Daily Plan</strong> to schedule!
                              </p>
                            </div>
                          ) : (
                            <div className="relative overflow-x-auto max-h-[500px] overflow-y-auto pr-1">
                              <div className="relative min-w-[280px]" style={{ height: `${hoursRange.length * 64}px` }}>
                                {/* Hour Rows */}
                                {hoursRange.map((h, idx) => (
                                  <div 
                                    key={h} 
                                    className="absolute left-0 right-0 border-t border-dashed border-[#ECE9E3]/60 flex items-start"
                                    style={{ 
                                      top: `${idx * 64}px`, 
                                      height: '64px' 
                                    }}
                                  >
                                    {/* Hour label */}
                                    <span className="w-14 shrink-0 text-[10px] text-gray-400 font-bold tabular-nums -mt-2 bg-transparent select-none pr-1.5 text-right">
                                      {formatHourLabel(h)}
                                    </span>
                                    {/* Grid line background */}
                                    <div className="flex-1 h-full border-l border-[#ECE9E3]/30 bg-[#FAFAF9]/20" />
                                  </div>
                                ))}

                                {/* Task Cards placed absolutely */}
                                {parsedTasks.map(({ task, start, end }) => {
                                  // Calculate start offset & height
                                  const startOffsetMin = (start.hour - minHour) * 60 + start.minute;
                                  const topPx = (startOffsetMin / 60) * 64;
                                  
                                  let durationMin = (end.hour - start.hour) * 60 + (end.minute - start.minute);
                                  if (durationMin <= 0) durationMin = 30; // 30 mins default
                                  const heightPx = (durationMin / 60) * 64;

                                  // Style based on priority rank or risk level
                                  let cardBg = "bg-orange-50/90 border-[#FF6B4A]/30 text-[#FF6B4A]";
                                  let tagBg = "bg-[#FF6B4A]/10 text-[#FF6B4A]";
                                  if (task.riskLevel === "high") {
                                    cardBg = "bg-red-50/95 border-red-200 text-red-700 shadow-xs";
                                    tagBg = "bg-red-100 text-red-800";
                                  } else if (task.riskLevel === "medium") {
                                    cardBg = "bg-amber-50/95 border-amber-200 text-amber-700 shadow-xs";
                                    tagBg = "bg-amber-100 text-amber-800";
                                  } else if (task.status === "completed") {
                                    cardBg = "bg-emerald-50/80 border-emerald-200/50 text-emerald-800 line-through opacity-75";
                                    tagBg = "bg-emerald-100 text-emerald-800";
                                  } else {
                                    cardBg = "bg-indigo-50/90 border-indigo-100 text-indigo-800";
                                    tagBg = "bg-indigo-100 text-indigo-800";
                                  }

                                  // Distribute multiple overlapping tasks slightly on left/right columns if they start at the same time to prevent complete overlay
                                  const overlapping = parsedTasks.filter(pt => {
                                    if (pt.task.id === task.id) return false;
                                    // Overlaps if start time is the same
                                    return pt.start.hour === start.hour && pt.start.minute === start.minute;
                                  });
                                  const isOverlapping = overlapping.length > 0;
                                  const myIndex = parsedTasks.filter(pt => pt.start.hour === start.hour && pt.start.minute === start.minute).findIndex(pt => pt.task.id === task.id);
                                  const leftPercent = isOverlapping ? (myIndex * (75 / (overlapping.length + 1))) + 22 : 22;
                                  const widthPercent = isOverlapping ? (75 / (overlapping.length + 1)) : 75;

                                  return (
                                    <div
                                      key={task.id}
                                      className={`absolute rounded-xl border p-2 flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md hover:z-20 transition-all group ${cardBg}`}
                                      style={{
                                        top: `${topPx + 2}px`,
                                        height: `${heightPx - 4}px`,
                                        left: `${leftPercent}%`,
                                        width: `${widthPercent}%`,
                                        minHeight: '40px'
                                      }}
                                    >
                                      <div className="space-y-0.5">
                                        <div className="flex items-center justify-between gap-1 flex-wrap">
                                          <span className={`text-[8px] font-extrabold uppercase tracking-wider px-1 py-0.5 rounded ${tagBg} tabular-nums`}>
                                            {task.suggestedStartTime} &ndash; {task.suggestedEndTime}
                                          </span>
                                          {task.priorityRank && (
                                            <span className="text-[8px] font-bold text-gray-500 bg-white/60 px-0.5 rounded">
                                              #{task.priorityRank}
                                            </span>
                                          )}
                                        </div>
                                        <h5 className="font-outfit text-[11px] font-extrabold line-clamp-1 leading-snug">
                                          {task.title}
                                        </h5>
                                      </div>

                                      {/* Complete Action Button */}
                                      {task.status !== "completed" && (
                                        <button
                                          onClick={() => handleToggleTaskStatus(task.id)}
                                          className="mt-1 self-end bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-emerald-300 text-gray-700 hover:text-emerald-700 p-0.5 rounded transition-all shadow-xs flex items-center gap-0.5 cursor-pointer"
                                          title="Mark Completed"
                                        >
                                          <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                                          <span className="text-[8px] font-bold px-0.5">Defuse</span>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

        </section>

      </main>

      {/* Satisfying Moment Toast */}
      {satisfyingLine && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-[#232323]/90 backdrop-blur-md text-white px-6 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 border border-white/10 animate-slide-up max-w-md w-11/12">
          <div className="p-1 bg-[#4CAF82] text-white rounded-full flex-shrink-0">
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div className="text-sm font-semibold leading-snug">
            {satisfyingLine}
          </div>
        </div>
      )}

      {/* Celebration Milestones Popover */}
      <AnimatePresence>
        {celebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.8, y: -20, x: "-50%" }}
            transition={{ type: "spring", damping: 15 }}
            className="fixed bottom-10 left-1/2 z-50 bg-gradient-to-br from-[#232323] via-[#1a1a1a] to-[#2c1d19] text-white p-6 rounded-3xl shadow-2xl flex flex-col items-center text-center border-2 border-[#FF6B4A]/60 max-w-sm w-11/12"
          >
            <div className="w-14 h-14 bg-[#FF6B4A]/20 border border-[#FF6B4A]/40 rounded-full flex items-center justify-center text-3xl mb-3.5 animate-bounce">
              {celebration.days === 7 ? "🏆" : "🚀"}
            </div>
            
            <h4 className="font-outfit text-lg font-extrabold tracking-tight bg-gradient-to-r from-[#FF9F43] to-[#FF6B4A] bg-clip-text text-transparent">
              {celebration.days}-Day Streak Achieved!
            </h4>
            
            <p className="text-xs text-[#ECE9E3] mt-2 font-medium">
              Your daily habit <span className="text-[#FF6B4A] font-extrabold">"{celebration.habitName}"</span> is burning bright!
            </p>
            
            <p className="text-[11px] text-gray-400 font-light mt-2 leading-relaxed">
              {celebration.days === 7 
                ? "Perfect Week! You've maintained complete consistency. You are a legendary master of momentum!" 
                : "3 days of consecutive victory! Momentum is officially building. Keep going!"
              }
            </p>
            
            <button
              onClick={() => setCelebration(null)}
              className="mt-4 px-5 py-1.5 bg-[#FF6B4A] hover:bg-[#ff5631] text-white text-[11px] font-bold rounded-full transition-transform active:scale-95 cursor-pointer shadow-md"
            >
              Continue My Streak
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
