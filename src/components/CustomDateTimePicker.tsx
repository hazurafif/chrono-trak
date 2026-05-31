import React, { useState, useEffect, useRef } from 'react';
import DynamicIcon from './DynamicIcon';

interface CustomDateTimePickerProps {
  value: string; // Format: "YYYY-MM-DDTHH:mm"
  onChange: (value: string) => void;
  required?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CustomDateTimePicker({
  value,
  onChange,
  required = false
}: CustomDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'date' | 'time'>('date');
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value parts
  const parseValue = (val: string) => {
    if (!val) {
      const d = new Date();
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        hour: d.getHours(),
        minute: d.getMinutes(),
      };
    }

    try {
      const parts = val.split('T');
      const dateParts = parts[0].split('-');
      const timeParts = parts[1].split(':');

      return {
        year: parseInt(dateParts[0], 10),
        month: parseInt(dateParts[1], 10) - 1,
        day: parseInt(dateParts[2], 10),
        hour: parseInt(timeParts[0], 10),
        minute: parseInt(timeParts[1], 10),
      };
    } catch (e) {
      const d = new Date();
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate(),
        hour: d.getHours(),
        minute: d.getMinutes(),
      };
    }
  };

  const current = parseValue(value);

  // States to track what is currently visible in the monthly calendar sheet
  const [viewMonth, setViewMonth] = useState(current.month);
  const [viewYear, setViewYear] = useState(current.year);

  // Update view sheet when value is changed by parent or initialization
  useEffect(() => {
    const updated = parseValue(value);
    setViewMonth(updated.month);
    setViewYear(updated.year);
  }, [value]);

  // Click outside listener to collapse
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const formatValue = (y: number, m: number, d: number, h: number, min: number) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${y}-${pad(m + 1)}-${pad(d)}T${pad(h)}:${pad(min)}`;
  };

  const handleUpdate = (updates: Partial<typeof current>) => {
    const next = { ...current, ...updates };
    // Guard day number based on next month/year
    const daysInNextMonth = new Date(next.year, next.month + 1, 0).getDate();
    if (next.day > daysInNextMonth) {
      next.day = daysInNextMonth;
    }
    onChange(formatValue(next.year, next.month, next.day, next.hour, next.minute));
  };

  const setNow = () => {
    const now = new Date();
    onChange(formatValue(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      now.getHours(),
      now.getMinutes()
    ));
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
  };

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Year navigation
  const prevYear = () => setViewYear(prev => prev - 1);
  const nextYear = () => setViewYear(prev => prev + 1);

  // Calendar calculations
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday, 6 is Saturday

  // Readable formatted date display
  const getReadableDisplay = () => {
    if (!value) return 'Select Date & Time...';
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return 'Select Date & Time...';
      const pad = (n: number) => n.toString().padStart(2, '0');
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const monthName = MONTHS[d.getMonth()].substring(0, 3);
      return `${dayName}, ${monthName} ${d.getDate()}, ${d.getFullYear()} — ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return value;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Target input display */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full bg-white text-black font-mono border-[2.5px] border-black p-2 flex items-center justify-between cursor-pointer shadow-[2px_2px_0px_0px_#1A1A1A] select-none hover:bg-amber-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
        id="date-picker-trigger"
        style={{ minHeight: '36px' }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <DynamicIcon name="Calendar" size={13} className="stroke-[2.5px] text-black shrink-0" />
          <span className="text-[10px] sm:text-xs font-bold uppercase text-black truncate">
            {getReadableDisplay()}
          </span>
        </div>
        <div className="p-0.5 bg-black text-white neo-border-sm border-black shrink-0">
          <DynamicIcon name={isOpen ? "ChevronUp" : "ChevronDown"} size={12} />
        </div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          {/* Backdrop closer */}
          <div className="absolute inset-0 cursor-default" onClick={() => setIsOpen(false)} />

          {/* Modal Container */}
          <div 
            className="w-full max-w-[320px] bg-white text-black border-[4px] border-black p-4 shadow-[6px_6px_0px_0px_#000000] relative z-10 flex flex-col space-y-3.5 select-none"
            id="date-picker-overlay"
          >
            {/* Header: Title & Close Button */}
            <div className="flex items-center gap-2 border-b-[2px] border-black pb-2 justify-between">
              <div className="flex items-center gap-1.5 font-mono font-black text-xs uppercase tracking-tight text-black">
                <DynamicIcon name="Calendar" size={13} className="text-black shrink-0" />
                <span>Select Date & Time</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-black/5 border-[1.5px] border-black rounded-none neo-btn-press"
              >
                <DynamicIcon name="X" size={12} />
              </button>
            </div>

            {/* Tabs header for compact switching */}
            <div className="grid grid-cols-2 gap-1 border-b-[2px] border-black pb-1.5 bg-neutral-100 p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('date')}
                className={`py-1.5 text-[10px] font-mono font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'date'
                    ? 'bg-black text-white'
                    : 'bg-transparent text-black/60 hover:text-black hover:bg-white/50'
                }`}
              >
                <DynamicIcon name="Calendar" size={11} />
                <span>DATE</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('time')}
                className={`py-1.5 text-[10px] font-mono font-black uppercase flex items-center justify-center gap-1.5 transition-all ${
                  activeTab === 'time'
                    ? 'bg-black text-white'
                    : 'bg-transparent text-black/60 hover:text-black hover:bg-white/50'
                }`}
              >
                <DynamicIcon name="Clock" size={11} />
                <span>TIME ({current.hour.toString().padStart(2, '0')}:{current.minute.toString().padStart(2, '0')})</span>
              </button>
            </div>

            {activeTab === 'date' ? (
              <div className="space-y-2">
                {/* Header Controls: Month and Year Selectors */}
                <div className="grid grid-cols-2 gap-1.5">
                  {/* Month select + navigation */}
                  <div className="flex items-center bg-white border-[1.5px] border-black shadow-[1.5px_1.5px_0px_0px_#000000] rounded-none">
                    <button
                      type="button"
                      onClick={prevMonth}
                      className="w-6 h-6 bg-white hover:bg-neutral-100 flex items-center justify-center font-mono font-black text-xs border-r-[1.5px] border-black transition-colors shrink-0"
                    >
                      &larr;
                    </button>
                    <select
                      value={viewMonth}
                      onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                      className="w-full bg-white text-black font-mono font-black text-[9px] px-0.5 h-6 outline-none cursor-pointer uppercase tracking-wider text-center"
                    >
                      {MONTHS.map((m, idx) => (
                        <option key={m} value={idx}>
                          {m.substring(0, 3)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={nextMonth}
                      className="w-6 h-6 bg-white hover:bg-neutral-100 flex items-center justify-center font-mono font-black text-xs border-l-[1.5px] border-black transition-colors shrink-0"
                    >
                      &rarr;
                    </button>
                  </div>

                  {/* Year select + navigation */}
                  <div className="flex items-center bg-white border-[1.5px] border-black shadow-[1.5px_1.5px_0px_0px_#000000] rounded-none">
                    <button
                      type="button"
                      onClick={prevYear}
                      className="w-6 h-6 bg-white hover:bg-neutral-100 flex items-center justify-center font-mono font-black text-xs border-r-[1.5px] border-black transition-colors shrink-0"
                    >
                      &lsaquo;
                    </button>
                    <select
                      value={viewYear}
                      onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                      className="w-full bg-white text-black font-mono font-black text-[10px] px-0.5 h-6 outline-none cursor-pointer text-center"
                    >
                      {Array.from({ length: 26 }, (_, i) => {
                        const currentY = new Date().getFullYear();
                        return currentY - 10 + i;
                      }).map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={nextYear}
                      className="w-6 h-6 bg-white hover:bg-neutral-100 flex items-center justify-center font-mono font-black text-xs border-l-[1.5px] border-black transition-colors shrink-0"
                    >
                      &rsaquo;
                    </button>
                  </div>
                </div>

                {/* Days Calendar Sheet Grid */}
                <div>
                  {/* Weekdays indicator row */}
                  <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                    {WEEKDAYS.map((day, idx) => {
                      const isWE = idx === 0 || idx === 6;
                      return (
                        <span 
                          key={day} 
                          className={`text-[9px] font-mono font-black uppercase ${isWE ? 'text-[#fb7185]' : 'text-black/50'}`}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>

                  {/* Calendar Numbers Grid */}
                  <div className="grid grid-cols-7 gap-[1.5px] text-center">
                    {/* Offset days (empty cells) */}
                    {Array.from({ length: firstDayIndex }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="w-full aspect-square"></div>
                    ))}

                    {/* Day numbers */}
                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const dayNum = idx + 1;
                      const isSelected =
                        current.day === dayNum &&
                        current.month === viewMonth &&
                        current.year === viewYear;

                      const todayObj = new Date();
                      const isToday =
                        todayObj.getDate() === dayNum &&
                        todayObj.getMonth() === viewMonth &&
                        todayObj.getFullYear() === viewYear;

                      const dayOfWeek = (idx + firstDayIndex) % 7;
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                      return (
                        <button
                          key={`day-${dayNum}`}
                          type="button"
                          onClick={() => {
                            handleUpdate({ day: dayNum, month: viewMonth, year: viewYear });
                            // UX improvement: when selecting a day, automatically shift to 'time' tab so they can set time right after!
                            setTimeout(() => setActiveTab('time'), 150);
                          }}
                          className={`w-full aspect-square border border-black/80 flex flex-col items-center justify-center font-mono text-[10px] font-bold relative cursor-pointer rounded-none transition-all hover:bg-amber-50 select-none ${
                            isSelected
                              ? 'bg-[#fb923c] text-black font-black font-mono scale-105 border-[1.5px]'
                              : isToday
                              ? 'bg-[#86efac] text-black font-black border-[1.5px]'
                              : isWeekend
                              ? 'bg-neutral-100 text-[#fb7185]'
                              : 'bg-white text-black'
                          }`}
                        >
                          <span>{dayNum}</span>
                          {isToday && !isSelected && (
                            <span className="absolute bottom-0.5 w-1 h-1 bg-black rounded-full"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Time Selector block */
              <div className="bg-[#fffbeb] border-[1.5px] border-black p-2.5 flex flex-col justify-center space-y-2 shadow-[2px_2px_0px_0px_#000000]">
                <div className="flex items-center justify-center gap-1">
                  <DynamicIcon name="Clock" size={11} className="stroke-[2.5px] text-amber-600" />
                  <span className="text-[9px] font-mono font-black uppercase text-black tracking-wider block text-center">
                    Select Time (24h Clock)
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pb-0.5">
                  {/* Hour selection */}
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-mono font-bold text-black/55 mb-0.5">HOUR</span>
                    <div className="flex items-center bg-white border-[1.5px] border-black shadow-[1.5px_1.5px_0px_0px_#000000] rounded-none">
                      <button
                        type="button"
                        onClick={() => {
                          const nextH = (current.hour - 1 + 24) % 24;
                          handleUpdate({ hour: nextH });
                        }}
                        className="w-5 h-5 bg-white hover:bg-neutral-100 flex items-center justify-center font-mono font-black text-xs border-r-[1.5px] border-black transition-colors text-black"
                      >
                        -
                      </button>
                      <select
                        value={current.hour}
                        onChange={(e) => handleUpdate({ hour: parseInt(e.target.value, 10) })}
                        className="bg-white text-black font-mono font-black text-xs px-1.5 h-5 outline-none cursor-pointer text-center appearance-none"
                      >
                        {Array.from({ length: 24 }).map((_, h) => (
                          <option key={h} value={h}>{h.toString().padStart(2, '0')}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const nextH = (current.hour + 1) % 24;
                          handleUpdate({ hour: nextH });
                        }}
                        className="w-5 h-5 bg-white hover:bg-neutral-100 flex items-center justify-center font-mono font-black text-xs border-l-[1.5px] border-black transition-colors text-black"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Minute selection */}
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-mono font-bold text-black/55 mb-0.5">MINUTE</span>
                    <div className="flex items-center bg-white border-[1.5px] border-black shadow-[1.5px_1.5px_0px_0px_#000000] rounded-none">
                      <button
                        type="button"
                        onClick={() => {
                          const nextM = (current.minute - 1 + 60) % 60;
                          handleUpdate({ minute: nextM });
                        }}
                        className="w-5 h-5 bg-white hover:bg-neutral-100 flex items-center justify-center font-mono font-black text-xs border-r-[1.5px] border-black transition-colors text-black"
                      >
                        -
                      </button>
                      <select
                        value={current.minute}
                        onChange={(e) => handleUpdate({ minute: parseInt(e.target.value, 10) })}
                        className="bg-white text-black font-mono font-black text-xs px-1.5 h-5 outline-none cursor-pointer text-center appearance-none"
                      >
                        {Array.from({ length: 60 }).map((_, m) => (
                          <option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const nextM = (current.minute + 1) % 60;
                          handleUpdate({ minute: nextM });
                        }}
                        className="w-5 h-5 bg-white hover:bg-neutral-100 flex items-center justify-center font-mono font-black text-xs border-l-[1.5px] border-black transition-colors text-black"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick shortcuts & Apply footer */}
            <div className="flex gap-2.5 justify-between pt-2 border-t border-black/15">
              <button
                type="button"
                onClick={setNow}
                className="px-2.5 py-1 bg-[#fb923c] hover:bg-[#f77f1e] text-black border-[1.5px] border-black font-mono font-bold text-[10px] uppercase rounded-none transition-all active:translate-y-[0.5px] neo-btn-press"
              >
                Set to Now
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1 bg-black hover:bg-neutral-800 text-white font-mono font-black text-[10px] uppercase rounded-none transition-all active:translate-y-[0.5px] neo-btn-press"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
