import { TrackedEvent, TimeBreakdown, NeoColorOption, IconOption } from './types';

export interface Achievement {
  title: string;
  badge: string;
  color: string;
  borderClass: string;
  emoji: string;
  desc: string;
}

/**
 * Calculates the achievement classification of an event relative to total days elapsed.
 */
export function getEventAchievement(totalDays: number, isFuture: boolean): Achievement {
  const absDays = Math.abs(totalDays);
  if (isFuture) {
    return {
      title: "Vision of Tomorrow",
      badge: "Visionary",
      color: "bg-fuchsia-50 text-fuchsia-700",
      borderClass: "border-fuchsia-300",
      emoji: "⏳",
      desc: "An upcoming milestone that keeps you looking ahead."
    };
  }
  if (absDays < 1) {
    return {
      title: "Day One Catalyst",
      badge: "Novice",
      color: "bg-emerald-50 text-emerald-800",
      borderClass: "border-emerald-300",
      emoji: "🌱",
      desc: "You started! The journey of a thousand leagues begins now."
    };
  }
  if (absDays >= 1 && absDays < 7) {
    return {
      title: "Day-to-Day Consistency",
      badge: "Iron",
      color: "bg-orange-50 text-orange-850",
      borderClass: "border-orange-300",
      emoji: "🔥",
      desc: "First 24 hours crossed. Keep the momentum strong."
    };
  }
  if (absDays >= 7 && absDays < 30) {
    return {
      title: "Weekly Habit Cultivator",
      badge: "Bronze",
      color: "bg-amber-50 text-amber-900",
      borderClass: "border-amber-400",
      emoji: "🛡️",
      desc: "One full week. Your routine is becoming concrete."
    };
  }
  if (absDays >= 30 && absDays < 90) {
    return {
      title: "Dedicated Guardian",
      badge: "Silver",
      color: "bg-slate-100 text-slate-800",
      borderClass: "border-slate-400",
      emoji: "⚔️",
      desc: "30+ Days! Deep roots have formed. Consistent dedication pays off."
    };
  }
  if (absDays >= 90 && absDays < 180) {
    return {
      title: "Quarterly Excellence Medal",
      badge: "Gold",
      color: "bg-yellow-50 text-yellow-800",
      borderClass: "border-yellow-400",
      emoji: "👑",
      desc: "90+ Days! Three full months of resilience. Simply outstanding."
    };
  }
  if (absDays >= 180 && absDays < 365) {
    return {
      title: "Semi-Annual Fortress",
      badge: "Platinum",
      color: "bg-cyan-50 text-cyan-800",
      borderClass: "border-cyan-400",
      emoji: "💎",
      desc: "180+ Days! Over half a year on this track. You belong to the elite tier."
    };
  }
  if (absDays >= 365 && absDays < 1000) {
    return {
      title: "One Year Orbital Cycle",
      badge: "Cosmic",
      color: "bg-violet-50 text-violet-800",
      borderClass: "border-violet-400",
      emoji: "🌌",
      desc: "365+ Days! A complete, magnificent trip around the sun. Inspiring."
    };
  }
  return {
    title: "Epochal Eternal Legend",
    badge: "Ascended",
    color: "bg-lime-50 text-lime-900",
    borderClass: "border-lime-400",
    emoji: "🧙‍♂️",
    desc: "1000+ Days! An incredible, timeless legacy established indefinitely."
  };
}

/**
 * Calculates the exact breakdown of time passed from startDate to referenceDate.
 * Handles exact calendar boundary transitions for Years, Months, and Days,
 * and standard conversions for sub-day granularities.
 */
export function calculateTimePassed(startDateStr: string, referenceDate: Date = new Date()): TimeBreakdown {
  const startDate = new Date(startDateStr);
  const now = referenceDate;

  // Safeguard for dates in the future (count up anyway, but limit negative math gracefully or keep negative values)
  const isFuture = startDate.getTime() > now.getTime();
  const diffMs = Math.abs(now.getTime() - startDate.getTime());

  // Direct raw metrics
  const totalSeconds = Math.floor(diffMs / 1000);
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const totalWeeks = Number((totalDays / 7).toFixed(1));

  // Calendar calculations (Years, Months, Days breakdown)
  // We'll iterate forward chronologically from the earlier to the later date
  const start = isFuture ? now : startDate;
  const end = isFuture ? startDate : now;

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  let hours = end.getHours() - start.getHours();
  let minutes = end.getMinutes() - start.getMinutes();
  let seconds = end.getSeconds() - start.getSeconds();

  // Adjust seconds
  if (seconds < 0) {
    seconds += 60;
    minutes--;
  }

  // Adjust minutes
  if (minutes < 0) {
    minutes += 60;
    hours--;
  }

  // Adjust hours
  if (hours < 0) {
    hours += 24;
    days--;
  }

  // Adjust days using appropriate calendar months
  if (days < 0) {
    // Get total days in the previous month of the target datetime
    const prevMonthDate = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonthDate.getDate();
    months--;
  }

  // Adjust months
  if (months < 0) {
    months += 12;
    years--;
  }

  // Safeguard: if any calculation produced negative results (can happen with timezone borders)
  const resultYears = Math.max(0, years) * (isFuture ? -1 : 1);
  const resultMonths = Math.max(0, months) * (isFuture ? -1 : 1);
  const resultDays = Math.max(0, days) * (isFuture ? -1 : 1);
  const resultHours = Math.max(0, hours) * (isFuture ? -1 : 1);
  const resultMinutes = Math.max(0, minutes) * (isFuture ? -1 : 1);
  const resultSeconds = Math.max(0, seconds) * (isFuture ? -1 : 1);

  return {
    years: resultYears,
    months: resultMonths,
    days: resultDays,
    hours: resultHours,
    minutes: resultMinutes,
    seconds: resultSeconds,
    totalDays: totalDays * (isFuture ? -1 : 1),
    totalHours: totalHours * (isFuture ? -1 : 1),
    totalWeeks: totalWeeks * (isFuture ? -1 : 1),
    totalMinutes: totalMinutes * (isFuture ? -1 : 1),
    totalSeconds: totalSeconds * (isFuture ? -1 : 1),
  };
}

/**
 * Standard colors defined in neobrutalism UI style
 */
export const NEO_COLORS: NeoColorOption[] = [
  { value: 'neo-yellow', label: 'Canary Yellow', bgClass: 'bg-[#facc15]', hex: '#facc15' },
  { value: 'neo-mint', label: 'Neon Mint', bgClass: 'bg-[#4ade80]', hex: '#4ade80' },
  { value: 'neo-blue', label: 'Electric Cyan', bgClass: 'bg-[#60a5fa]', hex: '#60a5fa' },
  { value: 'neo-coral', label: 'Hot Coral', bgClass: 'bg-[#fb7185]', hex: '#fb7185' },
  { value: 'neo-purple', label: 'Soft Purple', bgClass: 'bg-[#c084fc]', hex: '#c084fc' },
  { value: 'neo-orange', label: 'Safety Orange', bgClass: 'bg-[#fb923c]', hex: '#fb923c' },
  { value: 'neo-white', label: 'Simple White', bgClass: 'bg-[#ffffff]', hex: '#ffffff' },
];

/**
 * Available Lucide icons mapped to label
 */
export const ICON_OPTIONS: IconOption[] = [
  { name: 'Briefcase', label: 'Work / Career' },
  { name: 'Dumbbell', label: 'Gym / Fitness' },
  { name: 'Heart', label: 'Love / Relationship' },
  { name: 'GraduationCap', label: 'Education / Academy' },
  { name: 'Flame', label: 'Quit Habits / Burn' },
  { name: 'Coffee', label: 'Daily Habits / Cafe' },
  { name: 'Home', label: 'Living / Relocation' },
  { name: 'Trophy', label: 'Achievement' },
  { name: 'Sparkles', label: 'Self Growth' },
  { name: 'Plane', label: 'Travel / Trip' },
  { name: 'Gamepad2', label: 'Hobbies / Game' },
  { name: 'Guitar', label: 'Music / Creative' },
  { name: 'Users', label: 'Friends / Family' },
  { name: 'Milestone', label: 'Milestone' },
  { name: 'Calendar', label: 'Calendar Event' },
];

/**
 * Format string outputs
 */
export function formatBreakdownText(breakdown: TimeBreakdown): string {
  const parts: string[] = [];
  if (breakdown.years > 0) parts.push(`${breakdown.years} year${breakdown.years > 1 ? 's' : ''}`);
  if (breakdown.months > 0) parts.push(`${breakdown.months} month${breakdown.months > 1 ? 's' : ''}`);
  if (breakdown.days > 0) parts.push(`${breakdown.days} day${breakdown.days > 1 ? 's' : ''}`);
  return parts.length > 0 ? parts.join(', ') : '0 days';
}

/**
 * Initial standard starter events for a slick default experience.
 * Tailored beautifully so the user understands the exact utility immediately.
 */
export const DEFAULT_TRACKED_EVENTS: TrackedEvent[] = [
  {
    id: 'starter-1',
    title: 'My First Professional Job',
    startDate: '2022-01-10T09:00:00', // Accurate date/time
    icon: 'Briefcase',
    color: 'neo-mint',
    category: 'Career',
    description: 'Began working as an Associate Developer. Taking my first steps into the industry.',
    isPinned: true,
    unitPreference: 'detailed',
    subMilestones: [
      { id: 'sub-c1', title: 'Passed Probation Period', targetDate: '2022-04-10T09:00:00', isAchieved: true },
      { id: 'sub-c2', title: 'First Promotion to Mid-Level', targetDate: '2023-06-15T10:00:00', isAchieved: true }
    ]
  },
  {
    id: 'starter-2',
    title: 'When I First Got Gym Membership',
    startDate: '2024-03-15T18:30:00',
    icon: 'Dumbbell',
    color: 'neo-coral',
    category: 'Fitness',
    description: 'Committed to a healthier life and started heavy resistance lifting routing in gym.',
    isPinned: false,
    unitPreference: 'detailed',
    subMilestones: [
      { id: 'sub-g1', title: 'First 10K Run Under 50 Mins', targetDate: '2024-07-20T19:00:00', isAchieved: true },
      { id: 'sub-g2', title: 'Hit 100kg Bench Press PR', targetDate: '2025-01-12T17:30:00', isAchieved: true }
    ]
  },
  {
    id: 'starter-3',
    title: 'Adopted My Little Golden Cat',
    startDate: '2023-08-22T14:15:00',
    icon: 'Heart',
    color: 'neo-yellow',
    category: 'Life',
    description: 'Found my favorite orange companion Mochi. Brings infinite joy to the household.',
    isPinned: false,
    unitPreference: 'detailed',
    subMilestones: [
      { id: 'sub-m1', title: 'First Vet Vaccination Cleared', targetDate: '2023-09-05T11:00:00', isAchieved: true },
      { id: 'sub-m2', title: 'Taught Mochi to High-Five', targetDate: '2024-02-14T20:00:00', isAchieved: true }
    ]
  },
  {
    id: 'starter-4',
    title: 'Quit High-Sugar Soft Drinks',
    startDate: '2026-01-01T00:00:00',
    icon: 'Flame',
    color: 'neo-blue',
    category: 'Habits',
    description: 'No more soda, carbonated energy juices, or unrefined sugar cans.',
    isPinned: false,
    unitPreference: 'days',
    subMilestones: []
  }
];

/**
 * Helper to compute nice simple date stamp display
 */
export function displayReadableDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (e) {
    return dateStr;
  }
}
