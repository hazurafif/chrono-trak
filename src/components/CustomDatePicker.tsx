import React, { useState, useEffect, useRef } from 'react';
import DynamicIcon from './DynamicIcon';

interface CustomDatePickerProps {
  value: string; // Format: "YYYY-MM-DD"
  onChange: (value: string) => void;
  required?: boolean;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CustomDatePicker({
  value,
  onChange,
  required = false
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current value string: "YYYY-MM-DD"
  const parseValue = (val: string) => {
    if (!val) {
      const d = new Date();
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate()
      };
    }

    try {
      const parts = val.split('-');
      return {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10) - 1,
        day: parseInt(parts[2], 10)
      };
    } catch (e) {
      const d = new Date();
      return {
        year: d.getFullYear(),
        month: d.getMonth(),
        day: d.getDate()
      };
    }
  };

  const current = parseValue(value);

  // Track the viewed month/year in the custom calendar template sheets
  const [viewMonth, setViewMonth] = useState(current.month);
  const [viewYear, setViewYear] = useState(current.year);

  // Sync state if value is initialized or modified from parent
  useEffect(() => {
    const updated = parseValue(value);
    setViewMonth(updated.month);
    setViewYear(updated.year);
  }, [value]);

  // Click outside detection
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

  const formatValue = (y: number, m: number, d: number) => {
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  };

  const handleUpdate = (updates: Partial<typeof current>) => {
    const next = { ...current, ...updates };
    // Adjust day if exceeding max days of month
    const daysInNextMonth = new Date(next.year, next.month + 1, 0).getDate();
    if (next.day > daysInNextMonth) {
      next.day = daysInNextMonth;
    }
    onChange(formatValue(next.year, next.month, next.day));
  };

  const setToday = () => {
    const now = new Date();
    onChange(formatValue(now.getFullYear(), now.getMonth(), now.getDate()));
    setViewMonth(now.getMonth());
    setViewYear(now.getFullYear());
    setIsOpen(false);
  };

  // Navigate calendar sheets
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

  const prevYear = () => setViewYear(prev => prev - 1);
  const nextYear = () => setViewYear(prev => prev + 1);

  // Calendar logic
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();

  // Short formatted readable text for preview triggering button
  const getReadableDisplay = () => {
    if (!value) return 'Select Date...';
    try {
      const d = new Date(value + 'T00:00:00');
      if (isNaN(d.getTime())) return 'Select Date...';
      const monthName = MONTHS[d.getMonth()].substring(0, 3);
      return `${monthName} ${d.getDate()}, ${d.getFullYear()}`;
    } catch {
      return value;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Visual Input trigger area */}
      <div
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full bg-[#fcfbf9] text-black font-semibold border-[2.5px] border-black p-2 flex items-center justify-between cursor-pointer shadow-[2px_2px_0px_0px_#1A1A1A] hover:bg-neutral-50 active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all select-none"
        style={{ minHeight: '36px' }}
      >
        <span className="text-[11px] font-mono font-bold uppercase text-black leading-none">
          {getReadableDisplay()}
        </span>
        <DynamicIcon name="Calendar" size={12} className="text-black stroke-[2.5px]" />
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          {/* Backdrop closer */}
          <div className="absolute inset-0 cursor-default" onClick={() => setIsOpen(false)} />

          {/* Modal Container */}
          <div 
            className="w-full max-w-[280px] bg-white text-black border-[4px] border-black p-4 shadow-[6px_6px_0px_0px_#000000] relative z-10 flex flex-col space-y-3.5 select-none"
            id="date-picker-single-overlay"
          >
            {/* Header: Title */}
            <div className="flex items-center gap-2 border-b-[2.5px] border-black pb-2 justify-between">
              <div className="flex items-center gap-1.5 font-mono font-black text-xs uppercase tracking-tight text-black">
                <DynamicIcon name="Calendar" size={13} className="text-black shrink-0" />
                <span>Select Date</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-black/5 border-[1.5px] border-black rounded-none neo-btn-press"
              >
                <DynamicIcon name="X" size={12} />
              </button>
            </div>

            {/* Header Controls: Month and Year Selectors */}
            <div className="grid grid-cols-2 gap-1.5 pb-1">
              {/* Month select + navigation */}
              <div className="flex items-center bg-white border-[1.5px] border-black shadow-[1.5px_1.5px_0px_0px_#000000] rounded-none">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-6 h-6 bg-white hover:bg-neutral-100 flex items-center justify-center font-mono font-black text-xs border-r-[1.5px] border-black transition-colors shrink-0"
                  title="Previous Month"
                >
                  &larr;
                </button>
                <select
                  value={viewMonth}
                  onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
                  className="w-full bg-white text-black font-mono font-black text-[10px] px-1 h-6 outline-none cursor-pointer uppercase tracking-wider text-center"
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
                  title="Next Month"
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
                  title="Previous Year"
                >
                  &lsaquo;
                </button>
                <select
                  value={viewYear}
                  onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
                  className="w-full bg-white text-black font-mono font-black text-[10px] px-1 h-6 outline-none cursor-pointer text-center"
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
                  title="Next Year"
                >
                  &rsaquo;
                </button>
              </div>
            </div>

            {/* Monthly Calendar Grid row of numbers */}
            <div>
              <div className="grid grid-cols-7 gap-0.5 text-center mb-1.5">
                {WEEKDAYS.map((day, idx) => {
                  const isWE = idx === 0 || idx === 6;
                  return (
                    <span 
                      key={day} 
                      className={`text-[10px] font-mono font-extrabold uppercase ${isWE ? 'text-[#fb7185]' : 'text-black/50'}`}
                    >
                      {day}
                    </span>
                  )
                })}
              </div>

              <div className="grid grid-cols-7 gap-[1.5px] text-center font-bold">
                {Array.from({ length: firstDayIndex }).map((_, idx) => (
                  <div key={`empty-cell-${idx}`} className="w-full aspect-square"></div>
                ))}

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
                        setIsOpen(false);
                      }}
                      className={`w-full aspect-square border border-black/80 flex flex-col items-center justify-center font-mono text-[10px] font-bold cursor-pointer rounded-none relative transition-all hover:bg-amber-50 select-none ${
                        isSelected
                          ? 'bg-[#fb923c] text-black font-black font-mono scale-105 border-[1.5px]'
                          : isToday
                          ? 'bg-[#86efac] text-black border-[1.5px]'
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

            {/* Actions footer */}
            <div className="flex gap-2.5 items-center justify-between pt-2 border-t border-black/15">
              <button
                type="button"
                onClick={setToday}
                className="px-3 py-1 bg-[#4ade80] hover:bg-[#22c55e] border border-black text-black font-mono font-bold text-[10px] uppercase transition-all neo-btn-press"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1 bg-black hover:bg-neutral-800 text-white font-mono font-bold text-[10px] uppercase transition-all neo-btn-press"
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
