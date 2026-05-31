import React, { useState, useEffect, useRef } from 'react';
import { TrackedEvent, TimeBreakdown } from '../types';
import { calculateTimePassed, displayReadableDate, NEO_COLORS, getEventAchievement } from '../utils';
import DynamicIcon from './DynamicIcon';
import CustomDatePicker from './CustomDatePicker';

interface MilestoneDetailModalProps {
  event: TrackedEvent | null;
  onClose: () => void;
  onEdit: (event: TrackedEvent) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
  onUpdate: (event: TrackedEvent) => void;
}

export default function MilestoneDetailModal({
  event,
  onClose,
  onEdit,
  onDelete,
  onTogglePin,
  onUpdate
}: MilestoneDetailModalProps) {
  if (!event) return null;

  const [now, setNow] = useState(new Date());
  const [ms, setMs] = useState(0);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
  // State for adding sub-milestones
  const [subMilestoneTitle, setSubMilestoneTitle] = useState('');
  const [subMilestoneDate, setSubMilestoneDate] = useState('');

  // States for photo moment uploads
  const [momentCaption, setMomentCaption] = useState('');
  const [momentDate, setMomentDate] = useState('');
  const [momentImage, setMomentImage] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readAndSetImage(file);
    }
  };

  const compressImage = (base64Str: string, callback: (comp: string) => void) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      // Scale down so neither dimension exceeds 1000px, keeping scale proportions
      const MAX_WIDTH = 1000;
      const MAX_HEIGHT = 1000;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((img.width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        // Clean JPEG compression under target quality matching WhatsApp flow
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        callback(compressedBase64);
      } else {
        callback(base64Str);
      }
    };
    img.onerror = () => {
      callback(base64Str);
    };
  };

  const readAndSetImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (png, jpeg, webp, gif, etc.).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        compressImage(e.target.result, (compressed) => {
          setMomentImage(compressed);
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddMoment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!momentImage || !momentDate) return;

    const newMoment = {
      id: 'mom-' + Date.now().toString(36),
      date: momentDate,
      imageUrl: momentImage,
      caption: momentCaption.trim() || 'Milestone captured'
    };

    const updatedEvent = {
      ...event,
      moments: [...(event.moments || []), newMoment].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )
    };

    onUpdate(updatedEvent);
    setMomentCaption('');
    setMomentDate('');
    setMomentImage('');
  };

  const handleDeleteMoment = (mId: string) => {
    const updatedEvent = {
      ...event,
      moments: (event.moments || []).filter(m => m.id !== mId)
    };
    onUpdate(updatedEvent);
  };

  const animationFrameId = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const deleteWarningRef = useRef<HTMLDivElement>(null);

  const handleTriggerDeleteWarning = () => {
    setShowConfirmDelete(true);
    setTimeout(() => {
      if (deleteWarningRef.current) {
        deleteWarningRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
  };

  // Sync state with high precision frame-based ticks
  useEffect(() => {
    const updateTime = () => {
      const current = new Date();
      setNow(current);
      setMs(current.getMilliseconds());
      animationFrameId.current = requestAnimationFrame(updateTime);
    };

    animationFrameId.current = requestAnimationFrame(updateTime);
    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [event.startDate]);

  const handleAddSubMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subMilestoneTitle.trim() || !subMilestoneDate) return;

    // Use noon to avoid timezone shift on local calendars
    const targetDateISO = new Date(subMilestoneDate + 'T12:00:00').toISOString();

    const newMilestone = {
      id: 'sub-' + Date.now().toString(36),
      title: subMilestoneTitle.trim(),
      targetDate: targetDateISO,
      isAchieved: new Date(targetDateISO).getTime() <= now.getTime()
    };

    const updatedEvent = {
      ...event,
      subMilestones: [...(event.subMilestones || []), newMilestone]
    };

    onUpdate(updatedEvent);
    setSubMilestoneTitle('');
    setSubMilestoneDate('');
  };

  const handleDeleteSubMilestone = (mId: string) => {
    const updatedEvent = {
      ...event,
      subMilestones: (event.subMilestones || []).filter(m => m.id !== mId)
    };
    onUpdate(updatedEvent);
  };

  const referenceDate = event.endDate ? new Date(event.endDate) : now;
  const timePassed = calculateTimePassed(event.startDate, referenceDate);
  const colorSpec = NEO_COLORS.find(c => c.value === event.color) || NEO_COLORS[0];

  // Milliseconds formatted as 3-digit string
  const msFormatted = ms.toString().padStart(3, '0');

  // Relative dates wording description
  const isFuture = new Date(event.startDate).getTime() > referenceDate.getTime();

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fade-in" id="milestone-modal-container">
      <div 
        className="w-full max-w-2xl bg-[#F8F6F4] neo-border border-[3px] md:border-[4px] rounded-none shadow-[5px_5px_0px_0px_#1A1A1A] md:shadow-[8px_8px_0px_0px_#1A1A1A] overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        id="milestone-modal-card"
      >
        {/* Modal Header banner with milestone color background */}
        <div className={`p-3 md:p-5 ${colorSpec.bgClass} neo-border border-b-[3px] md:border-b-[4px] flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 bg-white neo-border border-[2px] rounded-none shadow-[1.5px_1.5px_0px_0px_#1A1A1A] shrink-0">
              <DynamicIcon name={event.icon} className="text-black" size={18} />
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-black text-white text-[8px] md:text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 border border-black">
                    {event.category}
                  </span>
                  {event.endDate && (
                    <span className="bg-emerald-650 bg-emerald-500 text-white text-[8px] md:text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 border border-black animate-pulse">
                      🏁 ENDED
                    </span>
                  )}
                </div>
                <h2 className="text-sm md:text-xl font-bold font-sans tracking-tight text-black truncate mt-0.5" title={event.title}>
                  {event.title}
                </h2>
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1 text-black hover:bg-black/10 active:scale-90 border-[2px] border-transparent rounded-none shrink-0"
            aria-label="Close modal"
          >
            <DynamicIcon name="X" size={18} />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div ref={scrollContainerRef} className="p-3.5 md:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Main live-ticker display block */}
          <div className="bg-white neo-border border-[3px] p-4 neo-shadow-sm text-center">
            <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-black/60 block mb-3">
              {event.endDate ? 'CONCLUDED TIME ELAPSED' : isFuture ? 'COUNTDOWN' : 'TIME ELAPSED'}
            </span>
            
            {/* Massive ticking display */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center" id="main-live-ticker">
              <div className="bg-[#F4F2EE] neo-border-sm border-[2px] p-2 flex flex-col justify-center">
                <span className="text-2xl md:text-4xl font-bold font-mono tracking-tight text-black">
                  {Math.abs(timePassed.years)}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-black/60 mt-1">Years</span>
              </div>
              <div className="bg-[#F4F2EE] neo-border-sm border-[2px] p-2 flex flex-col justify-center">
                <span className="text-2xl md:text-4xl font-bold font-mono tracking-tight text-black">
                  {Math.abs(timePassed.months)}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-black/60 mt-1">Months</span>
              </div>
              <div className="bg-[#F4F2EE] neo-border-sm border-[2px] p-2 flex flex-col justify-center">
                <span className="text-2xl md:text-4xl font-bold font-mono tracking-tight text-black">
                  {Math.abs(timePassed.days)}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-black/60 mt-1">Days</span>
              </div>
              <div className="bg-[#F4F2EE] neo-border-sm border-[2px] p-2 flex flex-col justify-center">
                <span className="text-2xl md:text-4xl font-bold font-mono tracking-tight text-black">
                  {Math.abs(timePassed.hours).toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-black/60 mt-1">Hours</span>
              </div>
              <div className="bg-[#F4F2EE] neo-border-sm border-[2px] p-2 flex flex-col justify-center">
                <span className="text-2xl md:text-4xl font-bold font-mono tracking-tight text-black">
                  {Math.abs(timePassed.minutes).toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-black/60 mt-1">Mins</span>
              </div>
              <div className={`neo-border-sm border-[2px] p-2 flex flex-col justify-center ${event.endDate ? 'bg-[#cbd5e1]' : 'bg-[#facc15]'}`}>
                <span className="text-2xl md:text-4xl font-bold font-mono tracking-tight text-black">
                  {Math.abs(timePassed.seconds).toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-black/80 mt-1">Secs</span>
              </div>
            </div>

            {/* Milliseconds running live inside secondary block */}
            {event.endDate ? (
              <div className="mt-3 flex items-center justify-center gap-2 bg-emerald-500/15 p-2 rounded-none neo-border-sm border-[2px] border-emerald-500">
                <span className="text-xs font-mono text-emerald-850 font-black flex items-center gap-1.5">
                  🏁 <span>EVENT COMPLETED & FROZEN AT END DATE</span>
                </span>
              </div>
            ) : (
              <div className="mt-3 flex items-center justify-center gap-2 bg-black/5 p-2 rounded-none neo-border-sm border-[2px]">
                <span className="text-sm font-mono text-black font-semibold">MILLISECOND PULSE:</span>
                <span className="text-lg font-mono font-bold tracking-widest text-[#fb923c] animate-pulse">
                  .{msFormatted}
                </span>
              </div>
            )}
          </div>

          {/* Dynamic Achievement Banner */}
          {(() => {
            const ach = getEventAchievement(timePassed.totalDays, isFuture);
            return (
              <div className={`neo-border border-[3px] ${ach.color} p-4 text-black flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-[4px_4px_0px_0px_#1A1A1A] transition-all`}>
                <div className="flex items-start sm:items-center gap-3">
                  <span className="text-3xl select-none filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.1)]">{ach.emoji}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] font-black uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded-none select-none">
                        {ach.badge} RANK
                      </span>
                      <h4 className="font-extrabold text-sm uppercase tracking-tight text-black">
                        {ach.title}
                      </h4>
                    </div>
                    <p className="text-xs text-black/85 font-medium leading-relaxed mt-1">
                      {ach.desc}
                    </p>
                  </div>
                </div>
                <div className="bg-white/50 border-[1.5px] border-black px-2.5 py-1 text-[10px] font-mono font-bold tracking-tight shrink-0 shadow-[2px_2px_0px_0px_#1A1A1A]">
                  {Math.abs(timePassed.totalDays).toLocaleString()} DAYS TICKED
                </div>
              </div>
            );
          })()}

          {/* Details & description block */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Side A: Target start point config */}
            <div className="bg-[#ffffff] p-4 neo-border border-[3px] space-y-3 flex flex-col justify-between">
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 text-black/60 font-mono text-xs font-bold uppercase mb-1">
                    <DynamicIcon name="Calendar" size={14} />
                    <span>Start Date</span>
                  </div>
                  <p className="text-sm font-bold font-sans text-black leading-tight">
                    {displayReadableDate(event.startDate)}
                  </p>
                </div>

                {event.endDate && (
                  <div className="pt-2 border-t border-black/10">
                    <div className="flex items-center gap-2 text-black/60 font-mono text-xs font-bold uppercase mb-1">
                      <DynamicIcon name="Calendar" size={14} className="text-emerald-700" />
                      <span className="text-emerald-800 font-extrabold">Concluded End Date</span>
                    </div>
                    <p className="text-sm font-bold font-sans text-emerald-950 leading-tight">
                      {displayReadableDate(event.endDate)}
                    </p>
                    <p className="text-[10px] font-mono text-black/45 mt-0.5">
                      Concluded precisely at this date/time.
                    </p>
                  </div>
                )}
              </div>

              {event.description ? (
                <div className="pt-2 border-t border-black/10">
                  <span className="text-[10px] font-mono font-bold uppercase text-black/60 block mb-1">NOTES</span>
                  <p className="text-sm text-black/80 font-sans leading-relaxed">
                    {event.description}
                  </p>
                </div>
              ) : (
                <div className="pt-2 border-t border-black/10">
                  <span className="text-[10px] font-mono font-bold uppercase text-black/40 block mb-1">NOTES</span>
                  <p className="text-xs text-black/40 italic font-sans">
                    No custom description or notes added yet for this tracked milestone.
                  </p>
                </div>
              )}
            </div>

            {/* Side B: Total Cumulative Metrics */}
            <div className="bg-white p-4 neo-border border-[3px] space-y-3">
              <span className="text-xs font-mono font-bold uppercase text-black/60 flex items-center gap-2">
                <DynamicIcon name="Clock" size={14} />
                <span>CUMULATIVE METRICS</span>
              </span>
              
              <ul className="space-y-2 font-mono text-xs md:text-sm">
                <li className="flex justify-between border-b border-black/5 pb-1">
                  <span className="text-black/60">Total Years:</span>
                  <span className="font-bold">{(Math.abs(timePassed.totalDays) / 365).toFixed(2)} yrs</span>
                </li>
                <li className="flex justify-between border-b border-black/5 pb-1">
                  <span className="text-black/60">Total Weeks:</span>
                  <span className="font-bold">{Math.abs(timePassed.totalWeeks).toLocaleString()} wks</span>
                </li>
                <li className="flex justify-between border-b border-black/5 pb-1">
                  <span className="text-black/60">Total Days:</span>
                  <span className="font-bold text-black">{Math.abs(timePassed.totalDays).toLocaleString()} days</span>
                </li>
                <li className="flex justify-between border-b border-black/5 pb-1">
                  <span className="text-black/60">Total Hours:</span>
                  <span className="font-bold">{Math.abs(timePassed.totalHours).toLocaleString()} hrs</span>
                </li>
                <li className="flex justify-between border-b border-black/5 pb-1">
                  <span className="text-black/60">Total Minutes:</span>
                  <span className="font-bold">{Math.abs(timePassed.totalMinutes).toLocaleString()} mins</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-black/60">Total Seconds:</span>
                  <span className="font-bold text-[#fb7185]">{Math.abs(timePassed.totalSeconds).toLocaleString()} s</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 👑 Chronicle Sub-Milestones Section */}
          <div className="bg-white neo-border border-[3px] p-4 space-y-4 shadow-[4px_4px_0px_0px_#1A1A1A]">
            <div className="flex justify-between items-center border-b-[2px] border-black pb-2">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-black flex items-center gap-1.5">
                <DynamicIcon name="Target" size={14} className="text-[#f97316]" />
                <span>SUB-MILESTONES</span>
              </h3>
              <span className="bg-black text-[#ffffff] text-[9px] font-mono font-bold px-1.5 py-0.5 uppercase">
                {event.subMilestones?.length || 0}
              </span>
            </div>

            {/* Sub-Milestones List */}
            {(!event.subMilestones || event.subMilestones.length === 0) ? (
              <div className="text-center py-4 bg-[#F4F2EE] border border-dashed border-black/20 p-4">
                <p className="text-xs font-bold text-black/75 font-sans">No sub-milestones yet.</p>
                <p className="text-[10px] text-black/50 font-sans mt-0.5">Track achievements relative to this event.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                {event.subMilestones.map((milestone) => {
                  const mDateObj = new Date(milestone.targetDate);
                  const isReached = mDateObj.getTime() <= now.getTime();
                  
                  // Time elapsed from the parent event's start to the milestone target date
                  const fromStart = calculateTimePassed(event.startDate, mDateObj);
                  const daysVal = Math.abs(fromStart.totalDays);
                  
                  let durationStr = '';
                  if (daysVal === 0) {
                    durationStr = 'on start day';
                  } else {
                    const yrs = Math.abs(fromStart.years);
                    const mths = Math.abs(fromStart.months);
                    const dys = Math.abs(fromStart.days);
                    const pieces = [];
                    if (yrs > 0) pieces.push(`${yrs}y`);
                    if (mths > 0) pieces.push(`${mths}m`);
                    if (dys > 0) pieces.push(`${dys}d`);
                    durationStr = pieces.length > 0 ? pieces.join(' ') : `${daysVal} days`;
                  }

                  // Time elapsed/countdown relative to Today (Now)
                  const todayBreakdown = calculateTimePassed(milestone.targetDate, now);
                  const daysDiff = Math.abs(todayBreakdown.totalDays);
                  const relativePhrase = isReached 
                    ? (daysDiff === 0 ? 'today' : `${daysDiff.toLocaleString()} days ago`)
                    : `${daysDiff.toLocaleString()} days left`;

                  return (
                    <div 
                      key={milestone.id} 
                      className={`neo-border border-[2px] p-2.5 text-black rounded-none flex justify-between items-center gap-3 transition-colors ${
                        isReached ? 'bg-[#f0fdf4]' : 'bg-[#fffbeb]'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className={`w-5 h-5 border-[1.5px] border-black rounded-none flex items-center justify-center shrink-0 mt-0.5 ${
                          isReached ? 'bg-[#4ade80]' : 'bg-[#fdeb6c]'
                        }`}>
                          <DynamicIcon name={isReached ? "Check" : "Clock"} size={10} className="text-black" />
                        </div>
                        <div className="min-w-0 text-left">
                          <h4 className="font-extrabold text-xs text-black break-words uppercase tracking-tight">
                            {milestone.title}
                          </h4>
                          <span className="font-mono text-[9px] text-black/50 block font-semibold">
                            TARGET DATE: {displayReadableDate(milestone.targetDate).split(' at')[0]}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`text-[9px] font-sans font-black flex items-center gap-1 ${
                              isReached ? 'text-emerald-800' : 'text-amber-800'
                            }`}>
                              {isReached ? 'Took' : 'Target'} <strong className="underline decoration-[1px]">{durationStr}</strong> {isReached ? 'from start' : 'after start'}
                            </span>
                            <span className="text-[9px] text-black/60 font-mono font-medium">
                              ({relativePhrase})
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteSubMilestone(milestone.id)}
                        className="p-1.5 bg-white text-black hover:bg-rose-100 border-[1.5px] border-black rounded-none neo-btn-press shrink-0 transition-colors"
                        title="Delete milestone"
                      >
                        <DynamicIcon name="Trash2" size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Add Sub-milestone Form */}
            <form onSubmit={handleAddSubMilestone} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t-[2px] border-dashed border-black">
              <div className="sm:col-span-2 text-left">
                <label className="block text-[10px] font-mono font-extrabold uppercase text-black/65 mb-1">
                  Goal Name
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Hit 100kg bench" 
                  value={subMilestoneTitle}
                  onChange={(e) => setSubMilestoneTitle(e.target.value)}
                  className="w-full p-2 text-xs bg-[#F4F2EE] border-[2px] border-black rounded-none focus:bg-white focus:outline-none font-sans font-bold placeholder:text-black/40 text-black shadow-[2px_2px_0px_0px_#000000] focus:shadow-none transition-all"
                  required
                />
              </div>
              <div className="text-left">
                <label className="block text-[10px] font-mono font-extrabold uppercase text-black/65 mb-1">
                  Date
                </label>
                <CustomDatePicker 
                  value={subMilestoneDate}
                  onChange={(val) => setSubMilestoneDate(val)}
                />
              </div>
              <div className="sm:col-span-3 flex justify-end pt-1">
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#fb923c] hover:bg-[#f97316] text-[#000000] border-[2px] border-black font-mono font-bold text-xs neo-btn-press rounded-none shadow-[2px_2px_0px_0px_#000000]"
                >
                  ADD GOAL
                </button>
              </div>
            </form>
          </div>

          {/* Photos & Journal Moments Block */}
          <div className="bg-white neo-border border-[3px] p-4 space-y-4 shadow-[4px_4px_0px_0px_#1A1A1A]" id="moments-journal-section">
            <div className="flex justify-between items-center border-b-[2px] border-black pb-2">
              <h3 className="text-xs font-bold font-mono uppercase tracking-wider text-black flex items-center gap-1.5">
                <DynamicIcon name="Camera" size={14} className="text-[#a855f7]" />
                <span>PHOTO DIARY</span>
              </h3>
              <span className="bg-[#a855f7] text-white text-[9px] font-mono font-bold px-1.5 py-0.5 border border-black uppercase shadow-[1px_1px_0px_rgba(0,0,0,1)]">
                {event.moments?.length || 0} PIC
              </span>
            </div>

            {/* Moments Grid or Timeline */}
            {(!event.moments || event.moments.length === 0) ? (
              <div className="text-center py-5 bg-[#F4F2EE] border border-dashed border-black/20 p-4">
                <p className="text-xs font-bold text-black/75 font-sans">No photos yet.</p>
                <p className="text-[10px] text-black/50 font-sans mt-0.5">Upload snapshots to track your journey.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-1 pb-2">
                {[...event.moments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((moment) => {
                  const mDateObj = new Date(moment.date);
                  // Calculate days since event start date
                  const fromStart = calculateTimePassed(event.startDate, mDateObj);
                  const totalDaysDiff = Math.floor(Math.abs(fromStart.totalDays));

                  return (
                    <div 
                      key={moment.id} 
                      className="bg-white border-[2.5px] border-black p-2.5 shadow-[2px_2px_0px_rgba(0,0,0,1)] hover:shadow-[3.5px_3.5px_0px_rgba(0,0,0,1)] transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        {/* Polaroid image container with fixed aspect ratio */}
                        <div className="relative aspect-video bg-neutral-100 border-2 border-black overflow-hidden group">
                          <img 
                            src={moment.imageUrl} 
                            alt={moment.caption} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          {/* Trash overlay */}
                          <div className="absolute top-1.5 right-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => handleDeleteMoment(moment.id)}
                              className="p-1.5 bg-rose-500 hover:bg-rose-600 text-white border-2 border-black neo-btn-press shadow-[1px_1px_0px_rgba(0,0,0,1)]"
                              title="Delete moment"
                            >
                              <DynamicIcon name="Trash2" size={10} />
                            </button>
                          </div>
                        </div>
                        {/* Details */}
                        <div className="text-left space-y-1">
                          <p className="text-xs font-extrabold text-black line-clamp-2 leading-tight">
                            {moment.caption}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="font-mono text-[9px] font-bold text-black/50 flex items-center gap-1">
                              <DynamicIcon name="Calendar" size={10} />
                              <span>{new Date(moment.date).toLocaleDateString()}</span>
                            </span>
                            <span className="font-mono text-[9px] bg-[#fef08a] px-1 py-0.2 border border-black text-yellow-950 font-black">
                              DAY {totalDaysDiff}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add Moment Form (Shorter inline layout matching other forms) */}
            <form onSubmit={handleAddMoment} className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t-[2px] border-dashed border-black items-end text-left">
              {/* Photo Input Selector */}
              <div className="sm:col-span-4 text-left">
                <label className="block text-[10px] font-mono font-extrabold uppercase text-black/65 mb-1">
                  Photo
                </label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      readAndSetImage(file);
                    }
                  }}
                  className={`h-[34px] border-[2px] border-black flex items-center justify-between px-2 cursor-pointer transition-colors shadow-[2px_2px_0px_0px_#000000] active:shadow-none font-sans font-extrabold text-xs select-none ${
                    momentImage 
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900' 
                      : isDragging 
                        ? 'border-amber-500 bg-amber-50 text-amber-900' 
                        : 'border-black bg-[#F4F2EE] hover:bg-neutral-100 text-black/70'
                  }`}
                  title="Drag and drop or click to upload photo"
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*" 
                    className="hidden" 
                  />
                  <div className="flex items-center gap-1.5 min-w-0">
                    {momentImage ? (
                      <>
                        <img 
                          src={momentImage} 
                          referrerPolicy="no-referrer" 
                          alt="preview" 
                          className="w-5 h-5 object-cover border border-black shrink-0" 
                        />
                        <span className="truncate text-emerald-800">Ready</span>
                      </>
                    ) : (
                      <span className="truncate">
                        {isDragging ? "Drop here" : "Choose file..."}
                      </span>
                    )}
                  </div>
                  <DynamicIcon name="Camera" size={14} className="text-black shrink-0 ml-1" />
                </div>
              </div>

              {/* Date Input */}
              <div className="sm:col-span-3 text-left">
                <label className="block text-[10px] font-mono font-extrabold uppercase text-black/65 mb-1">
                  Date
                </label>
                <CustomDatePicker 
                  value={momentDate}
                  onChange={(val) => setMomentDate(val)}
                />
              </div>

              {/* Caption Input */}
              <div className="sm:col-span-3 text-left">
                <label className="block text-[10px] font-mono font-extrabold uppercase text-black/65 mb-1">
                  Caption
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Milestone captured"
                  value={momentCaption}
                  onChange={(e) => setMomentCaption(e.target.value)}
                  className="w-full p-2 text-xs bg-[#F4F2EE] border-[2px] border-black rounded-none focus:bg-white focus:outline-none font-sans font-extrabold placeholder:text-black/40 text-black shadow-[2px_2px_0px_0px_#000000] focus:shadow-none transition-all h-[34px]"
                  required
                />
              </div>

              {/* Submit Button */}
              <div className="sm:col-span-2 flex justify-end">
                <button 
                  type="submit"
                  disabled={!momentImage || !momentDate}
                  className={`w-full h-[34px] border-[2px] border-black font-mono font-black text-[11px] rounded-none transition-all shadow-[2px_2px_0px_0px_#000000] select-none ${
                    (momentImage && momentDate) 
                      ? 'bg-[#a855f7] hover:bg-[#9333ea] text-white neo-btn-press cursor-pointer' 
                      : 'bg-neutral-100 text-neutral-400 cursor-not-allowed shadow-none translate-x-[2px] translate-y-[2px]'
                  }`}
                >
                  ADD MOMENT
                </button>
              </div>
            </form>
          </div>

          {/* Delete confirmation section or general disclaimer */}
          {showConfirmDelete && (
            <div 
              ref={deleteWarningRef}
              className="bg-[#fb7185]/25 neo-border border-[3.5px] border-[#fb7185] p-4 text-black space-y-3 shadow-[4px_4px_0px_0px_#1A1A1A] animate-shake"
            >
              <div className="flex items-center gap-2 text-[#fb7185]">
                <DynamicIcon name="AlertTriangle" size={20} className="stroke-[3px]" />
                <h4 className="font-sans font-black uppercase text-sm tracking-wide">Are you absolutely sure?</h4>
              </div>
              <p className="text-xs font-sans font-semibold leading-relaxed">
                Deleting <strong className="font-bold text-[#fb7185]">"{event.title}"</strong> is permanent and will completely remove this tracker from your database. There is no undo!
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(event.id);
                    onClose();
                  }}
                  className="bg-[#fb7185] text-black font-mono text-xs font-black px-4 py-2 neo-border border-[2px] shadow-[2.5px_2.5px_0px_0px_#1A1A1A] active:translate-x-[2.5px] active:translate-y-[2.5px] active:shadow-none transition-all cursor-pointer"
                >
                  YES, DELETE FOREVER
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="bg-white text-black font-mono text-xs font-black px-4 py-2 neo-border border-[2px] shadow-[2.5px_2.5px_0px_0px_#1A1A1A] active:translate-x-[2.5px] active:translate-y-[2.5px] active:shadow-none transition-all cursor-pointer"
                >
                  NO, CANCEL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Footer buttons */}
        <div className="p-3 md:p-4 bg-[#F4F2EE] neo-border border-t-[3px] md:border-t-[4px] gap-3 flex flex-col md:flex-row justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                onTogglePin(event.id);
              }}
              className={`p-2.5 flex-1 md:flex-none md:px-3.5 neo-border-sm border-[2px] md:border-[2.5px] rounded-none flex items-center justify-center gap-1.5 neo-btn-press text-xs font-mono font-bold ${event.isPinned ? 'bg-[#facc15]' : 'bg-white'}`}
            >
              <DynamicIcon name="Pin" size={13} className={event.isPinned ? 'fill-black' : ''} />
              <span>{event.isPinned ? 'PINNED' : 'PIN TO TOP'}</span>
            </button>
            
            {!showConfirmDelete && (
              <button
                onClick={handleTriggerDeleteWarning}
                className="p-2.5 flex-1 md:flex-none md:px-3.5 bg-[#fb7185] hover:bg-rose-400 text-black neo-border-sm border-[2px] md:border-[2.5px] rounded-none flex items-center justify-center gap-1.5 neo-btn-press text-xs font-mono font-bold"
              >
                <DynamicIcon name="Trash2" size={13} />
                <span>DELETE</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={onClose}
              className="py-2.5 px-4 flex-1 md:flex-none bg-white hover:bg-black/5 text-black neo-border border-[2px] md:border-[3px] rounded-none font-mono font-bold text-xs neo-btn-press"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
