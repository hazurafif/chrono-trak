import React from 'react';
import { TrackedEvent } from '../types';
import { calculateTimePassed } from '../utils';
import DynamicIcon from './DynamicIcon';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: TrackedEvent[];
  coffeeCount: number;
}

interface AchievementDef {
  key: string;
  title: string;
  badgeName: string;
  emoji: string;
  requirementDesc: string;
  bgUnlocked: string;
  textUnlocked: string;
  badgeColor: string;
  checkFn?: (absDays: number, isFuture: boolean) => boolean;
  coffeeCheckFn?: (coffeeCount: number) => boolean;
}

const ACHIEVEMENT_DEFS: AchievementDef[] = [
  {
    key: 'visionary',
    title: 'Vision of Tomorrow',
    badgeName: 'Visionary',
    emoji: '⏳',
    requirementDesc: 'Have at least one countdown tracker set in the future.',
    bgUnlocked: 'bg-[#faf5ff] border-purple-500 text-purple-950',
    textUnlocked: 'text-purple-950',
    badgeColor: 'bg-purple-600 text-white',
    checkFn: (_, isFuture) => isFuture
  },
  {
    key: 'coffee_first',
    title: 'Warm Caffeinated Sip',
    badgeName: 'Espresso Start',
    emoji: '☕',
    requirementDesc: 'Drink your first cup of delicious milestone tracking fuel.',
    bgUnlocked: 'bg-[#fffbeb] border-amber-400 text-[#78350f]',
    textUnlocked: 'text-[#78350f]',
    badgeColor: 'bg-amber-600 text-white',
    coffeeCheckFn: (count) => count >= 1
  },
  {
    key: 'novice',
    title: 'Day One Catalyst',
    badgeName: 'Novice',
    emoji: '🌱',
    requirementDesc: 'Have a tracker that has been running for less than 24 hours.',
    bgUnlocked: 'bg-[#f0fdf4] border-emerald-500 text-emerald-950',
    textUnlocked: 'text-emerald-950',
    badgeColor: 'bg-emerald-600 text-white',
    checkFn: (absDays, isFuture) => !isFuture && absDays < 1
  },
  {
    key: 'coffee_buzz',
    title: 'Tracking Coffee Rush',
    badgeName: 'Caffeine Buzz',
    emoji: '⚡',
    requirementDesc: 'Drink at least 5 cups of delicious tracking fuel.',
    bgUnlocked: 'bg-[#fefce8] border-yellow-400 text-yellow-950',
    textUnlocked: 'text-yellow-905',
    badgeColor: 'bg-yellow-500 text-black',
    coffeeCheckFn: (count) => count >= 5
  },
  {
    key: 'iron',
    title: 'Day-to-Day Consistency',
    badgeName: 'Iron',
    emoji: '🔥',
    requirementDesc: 'Track a milestone for at least 1 day.',
    bgUnlocked: 'bg-[#fef2f2] border-rose-500 text-[#7f1d1d]',
    textUnlocked: 'text-[#4c0519]',
    badgeColor: 'bg-rose-600 text-white',
    checkFn: (absDays, isFuture) => !isFuture && absDays >= 1
  },
  {
    key: 'bronze',
    title: 'Weekly Habit Cultivator',
    badgeName: 'Bronze',
    emoji: '🛡️',
    requirementDesc: 'Track a milestone for at least 7 days.',
    bgUnlocked: 'bg-[#fffbeb] border-amber-500 text-amber-950',
    textUnlocked: 'text-amber-955',
    badgeColor: 'bg-amber-600 text-black',
    checkFn: (absDays, isFuture) => !isFuture && absDays >= 7
  },
  {
    key: 'coffee_master',
    title: 'Chrono-Barista',
    badgeName: 'Barista Scholar',
    emoji: '🧪',
    requirementDesc: 'Drink at least 15 cups of delicious tracking fuel.',
    bgUnlocked: 'bg-[#eff6ff] border-blue-400 text-blue-950',
    textUnlocked: 'text-blue-950',
    badgeColor: 'bg-blue-600 text-white',
    coffeeCheckFn: (count) => count >= 15
  },
  {
    key: 'silver',
    title: 'Dedicated Guardian',
    badgeName: 'Silver',
    emoji: '⚔️',
    requirementDesc: 'Track a milestone for at least 30 days (1 month).',
    bgUnlocked: 'bg-[#f8fafc] border-slate-500 text-slate-955',
    textUnlocked: 'text-slate-950',
    badgeColor: 'bg-slate-600 text-white',
    checkFn: (absDays, isFuture) => !isFuture && absDays >= 30
  },
  {
    key: 'gold',
    title: 'Quarterly Excellence Medal',
    badgeName: 'Gold',
    emoji: '👑',
    requirementDesc: 'Track a milestone for at least 90 days (3 months).',
    bgUnlocked: 'bg-[#fefce8] border-yellow-500 text-yellow-955',
    textUnlocked: 'text-yellow-955',
    badgeColor: 'bg-yellow-500 text-black',
    checkFn: (absDays, isFuture) => !isFuture && absDays >= 90
  },
  {
    key: 'platinum',
    title: 'Semi-Annual Fortress',
    badgeName: 'Platinum',
    emoji: '💎',
    requirementDesc: 'Track a milestone for at least 180 days (6 months).',
    bgUnlocked: 'bg-[#ecfeff] border-cyan-500 text-cyan-955',
    textUnlocked: 'text-cyan-950',
    badgeColor: 'bg-cyan-600 text-white',
    checkFn: (absDays, isFuture) => !isFuture && absDays >= 180
  },
  {
    key: 'coffee_god',
    title: 'Supreme Caffeinated Entity',
    badgeName: 'Coffee Deity',
    emoji: '🚀',
    requirementDesc: 'Drink at least 30 cups of delicious life tracking energy.',
    bgUnlocked: 'bg-[#fdf2f8] border-pink-400 text-pink-950',
    textUnlocked: 'text-pink-950',
    badgeColor: 'bg-pink-600 text-white',
    coffeeCheckFn: (count) => count >= 30
  },
  {
    key: 'cosmic',
    title: 'One Year Orbital Cycle',
    badgeName: 'Cosmic',
    emoji: '🌌',
    requirementDesc: 'Track a milestone for at least 365 days (1 year).',
    bgUnlocked: 'bg-[#f5f3ff] border-violet-500 text-violet-955',
    textUnlocked: 'text-violet-950',
    badgeColor: 'bg-violet-600 text-white',
    checkFn: (absDays, isFuture) => !isFuture && absDays >= 365
  },
  {
    key: 'ascended',
    title: 'Epochal Eternal Legend',
    badgeName: 'Ascended',
    emoji: '💫',
    requirementDesc: 'Track a milestone for at least 1,000 days.',
    bgUnlocked: 'bg-[#f0fdf4] border-lime-500 text-lime-955',
    textUnlocked: 'text-lime-950',
    badgeColor: 'bg-lime-600 text-black',
    checkFn: (absDays, isFuture) => !isFuture && absDays >= 1000
  }
];

export default function AchievementsModal({ isOpen, onClose, events, coffeeCount }: AchievementsModalProps) {
  if (!isOpen) return null;

  // Compute unlock references
  const achievementsWithEvents = ACHIEVEMENT_DEFS.map(def => {
    let isUnlocked = false;
    let unlockingEvents: TrackedEvent[] = [];

    if (def.coffeeCheckFn) {
      isUnlocked = def.coffeeCheckFn(coffeeCount);
    } else if (def.checkFn) {
      unlockingEvents = events.filter(evt => {
        const referenceDate = evt.endDate ? new Date(evt.endDate) : new Date();
        const timePassed = calculateTimePassed(evt.startDate, referenceDate);
        const isFuture = new Date(evt.startDate).getTime() > referenceDate.getTime();
        return def.checkFn!(timePassed.totalDays, isFuture);
      });
      isUnlocked = unlockingEvents.length > 0;
    }

    return {
      ...def,
      isUnlocked,
      unlockingEvents
    };
  });

  const totalUnlockedCount = achievementsWithEvents.filter(a => a.isUnlocked).length;
  const percentage = Math.round((totalUnlockedCount / ACHIEVEMENT_DEFS.length) * 100);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fade-in" id="achievements-modal-container">
      <div 
        className="w-full max-w-2xl bg-[#F8F6F4] neo-border border-[3px] md:border-[4px] rounded-none shadow-[5px_5px_0px_0px_#1A1A1A] md:shadow-[8px_8px_0px_0px_#1A1A1A] overflow-hidden flex flex-col max-h-[92vh]"
        id="achievements-modal-card"
      >
        {/* Header */}
        <div className="p-4 md:p-5 bg-[#c084fc] neo-border border-b-[3px] md:border-b-[4px] flex items-center justify-between gap-3 text-black">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white neo-border border-[2px] rounded-none shadow-[1.5px_1.5px_0px_0px_#1A1A1A] flex items-center justify-center">
              <DynamicIcon name="Award" className="text-black animate-pulse" size={18} />
            </div>
            <div>
              <h2 className="text-sm md:text-lg font-bold font-sans uppercase tracking-tight">
                HALL OF ACHIEVEMENTS
              </h2>
              <p className="text-[10px] sm:text-xs font-semibold text-black/70 font-sans">
                Build long-term disciplines or countdowns to unlock milestone trophies
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-black hover:bg-black/10 active:scale-90 border-[2px] border-transparent rounded-none"
            aria-label="Close modal"
          >
            <DynamicIcon name="X" size={18} />
          </button>
        </div>

        {/* Progress gauge banner */}
        <div className="bg-white border-b-[3px] border-black p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-center text-xs font-mono font-bold mb-1.5 text-black">
              <span>UNLOCKED TROPHIES</span>
              <span>{totalUnlockedCount} / {ACHIEVEMENT_DEFS.length} ({percentage}%)</span>
            </div>
            <div className="w-full bg-[#F4F2EE] border-[2px] border-black h-5 relative rounded-none p-0.5">
              <div 
                className="bg-[#4ade80] h-full border-r-[2px] border-black transition-all duration-500" 
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold text-black border-[2px] border-black p-2 bg-[#F4F2EE] shrink-0 shadow-[2px_2px_0px_0px_#000000]">
            <DynamicIcon name="Trophy" size={14} className="text-[#f97316]" />
            <span>RANK: {totalUnlockedCount >= 7 ? 'ASCENDED MASTER' : totalUnlockedCount >= 4 ? 'ELITE GUARDIAN' : 'INITIATE'}</span>
          </div>
        </div>

        {/* Scrollable list */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {achievementsWithEvents.map((ach) => {
              return (
                <div 
                  key={ach.key}
                  className={`border-[2.5px] border-black p-3.5 flex flex-col justify-between shadow-[3px_3px_0px_0px_#1A1A1A] transition-all relative rounded-none ${
                    ach.isUnlocked ? `${ach.bgUnlocked}` : 'bg-[#e5e5e5]/30 border-black/35 opacity-60'
                  }`}
                >
                  <div>
                    {/* Badge Category Header */}
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-[8px] font-mono font-black uppercase tracking-widest px-1.5 py-0.5 border border-black ${
                        ach.isUnlocked ? ach.badgeColor : 'bg-black/10 text-black/45 border-black/20'
                      }`}>
                        {ach.badgeName}
                      </span>
                      {ach.isUnlocked ? (
                        <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-800">
                          <DynamicIcon name="Check" size={11} className="stroke-[3]" />
                          <span>UNLOCKED</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[9px] font-mono font-bold text-black/40">
                          <DynamicIcon name="Lock" size={10} />
                          <span>LOCKED</span>
                        </div>
                      )}
                    </div>

                    {/* Achievement Details */}
                    <div className="flex items-start gap-2.5 mt-2">
                      <span className="text-2.5xl select-none filter drop-shadow-[1px_1px_0px_rgba(0,0,0,0.15)] shrink-0">
                        {ach.isUnlocked ? ach.emoji : '🔒'}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-sans font-black text-xs sm:text-sm text-black tracking-tight leading-tight uppercase">
                          {ach.title}
                        </h4>
                        <p className="text-[10px] text-black/65 font-medium mt-1 leading-relaxed">
                          {ach.requirementDesc}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Trigger events listing footer */}
                  {ach.isUnlocked && (
                    <div className="mt-3.5 pt-2 border-t border-black/10">
                      <span className="text-[8px] font-mono font-extrabold uppercase text-black/50 block mb-1">
                        UNLOCKED BY ({ach.unlockingEvents.length}):
                      </span>
                      <div className="space-y-1 max-h-[55px] overflow-y-auto pr-1">
                        {ach.unlockingEvents.map(evt => {
                          const referenceDate = evt.endDate ? new Date(evt.endDate) : new Date();
                          const el = calculateTimePassed(evt.startDate, referenceDate);
                          return (
                            <div key={evt.id} className="flex justify-between items-center text-[9px] font-mono font-bold text-black/85 bg-black/5 px-1.5 py-0.5 border border-black/5">
                              <span className="truncate max-w-[120px]">{evt.title}</span>
                              <span className="shrink-0 text-right font-black text-black">
                                {new Date(evt.startDate).getTime() > referenceDate.getTime() ? '⏳ FUTURE' : `${Math.abs(el.totalDays).toLocaleString()}d`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 md:p-4 bg-[#F4F2EE] neo-border border-t-[3px] md:border-t-[4px] flex justify-end">
          <button
            onClick={onClose}
            className="py-2.5 px-6 bg-white hover:bg-black/5 text-black neo-border border-[2.5px] rounded-none font-mono font-bold text-xs neo-btn-press shadow-[2.5px_2.5px_0px_0px_#000000] focus:shadow-none transition-all"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
