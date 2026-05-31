/**
 * Type declarations for ChronoTrak.
 */

export interface SubMilestone {
  id: string;
  title: string;
  targetDate: string; // ISO string representing when this milestone was/will be met
  isAchieved?: boolean; // explicit flag, or default calculated by relative time
}

export interface TrackerMoment {
  id: string;
  date: string;       // ISO string e.g., YYYY-MM-DD
  imageUrl: string;   // Base64-encoded image data URL or direct link
  caption: string;    // Brief caption for this moment along the way
}

export interface TrackedEvent {
  id: string;
  title: string;
  startDate: string; // ISO String (UTC or local with timezone)
  icon: string;      // Lucide icon key
  color: NeoColor;   // Selected background color variant
  category: string;  // Category name e.g., Work, Gym, Personal
  description?: string;
  isPinned: boolean;
  unitPreference?: 'detailed' | 'days' | 'hours' | 'seconds'; // user visual configuration
  userId?: string;
  createdAt?: any;
  updatedAt?: any;
  endDate?: string; // ISO string representing when this event completed or ended
  subMilestones?: SubMilestone[]; // Sub-milestones inside this event
  moments?: TrackerMoment[]; // Photo journal moments along the way
}

export type NeoColor = 'neo-mint' | 'neo-blue' | 'neo-yellow' | 'neo-coral' | 'neo-purple' | 'neo-orange' | 'neo-white';

export interface NeoColorOption {
  value: NeoColor;
  label: string;
  bgClass: string;
  hex: string;
}

export interface IconOption {
  name: string;
  label: string;
}

export interface TimeBreakdown {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
  totalHours: number;
  totalWeeks: number;
  totalMinutes: number;
  totalSeconds: number;
}

