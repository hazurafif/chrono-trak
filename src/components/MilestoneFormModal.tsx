import React, { useState, useEffect } from 'react';
import { TrackedEvent, NeoColor } from '../types';
import { NEO_COLORS, ICON_OPTIONS } from '../utils';
import DynamicIcon from './DynamicIcon';
import CustomDateTimePicker from './CustomDateTimePicker';

interface MilestoneFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (eventData: Omit<TrackedEvent, 'id' | 'isPinned'> & { id?: string, isPinned?: boolean }) => void;
  editingEvent: TrackedEvent | null;
}

const PRESET_CATEGORIES = ['Career', 'Fitness', 'Habit', 'Relationship', 'Education', 'Travel', 'Hobbies', 'Life'];

export default function MilestoneFormModal({
  isOpen,
  onClose,
  onSubmit,
  editingEvent
}: MilestoneFormModalProps) {
  if (!isOpen) return null;

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [hasEnded, setHasEnded] = useState(false);
  const [endDate, setEndDate] = useState('');
  const [icon, setIcon] = useState('Calendar');
  const [color, setColor] = useState<NeoColor>('neo-yellow');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [unitPreference, setUnitPreference] = useState<'detailed' | 'days' | 'hours' | 'seconds'>('detailed');
  
  const [validationError, setValidationError] = useState('');

  // Handle initialization/editing state sync
  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      // Format ISO offset back to standard datetime-local picker value format: YYYY-MM-DDTHH:mm
      try {
        const d = new Date(editingEvent.startDate);
        // Correctly format to datetime-local input acceptable format (YYYY-MM-DDTHH:MM)
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setStartDate(formatted);
      } catch (err) {
        setStartDate(editingEvent.startDate.substring(0, 16));
      }

      if (editingEvent.endDate) {
        setHasEnded(true);
        try {
          const d = new Date(editingEvent.endDate);
          const pad = (n: number) => n.toString().padStart(2, '0');
          const formatted = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setEndDate(formatted);
        } catch (err) {
          setEndDate(editingEvent.endDate.substring(0, 16));
        }
      } else {
        setHasEnded(false);
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const formattedNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
        setEndDate(formattedNow);
      }

      setIcon(editingEvent.icon);
      setColor(editingEvent.color);
      setCategory(editingEvent.category);
      setDescription(editingEvent.description || '');
      setUnitPreference(editingEvent.unitPreference || 'detailed');
    } else {
      // Default baseline values for standard creation
      setTitle('');
      // Set to current date as local string
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const formattedNow = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      setStartDate(formattedNow);
      setHasEnded(false);
      setEndDate(formattedNow);
      setIcon('Calendar');
      setColor('neo-yellow');
      setCategory('Life');
      setDescription('');
      setUnitPreference('detailed');
    }
    setValidationError('');
  }, [editingEvent, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!title.trim()) {
      setValidationError('Please specify a title or milestone name!');
      return;
    }
    if (!startDate) {
      setValidationError('Please select a valid start date & precise time!');
      return;
    }
    if (hasEnded) {
      if (!endDate) {
        setValidationError('Please select a valid end date & precise time!');
        return;
      }
      if (new Date(endDate).getTime() < new Date(startDate).getTime()) {
        setValidationError('End date cannot be before the start date!');
        return;
      }
    }
    if (!category.trim()) {
      setValidationError('Category tag is required (e.g. Work, Gym, Health)!');
      return;
    }

    // Submit payload
    onSubmit({
      id: editingEvent?.id,
      title: title.trim(),
      startDate: new Date(startDate).toISOString(),
      endDate: hasEnded ? new Date(endDate).toISOString() : undefined,
      icon,
      color,
      category: category.trim(),
      description: description.trim(),
      isPinned: editingEvent ? editingEvent.isPinned : false,
      unitPreference
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm animate-fade-in" id="form-modal-container">
      <div 
        className="w-full max-w-xl bg-[#F8F6F4] neo-border border-[3px] md:border-[4px] rounded-none shadow-[5px_5px_0px_0px_#1A1A1A] md:shadow-[8px_8px_0px_0px_#1A1A1A] overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
        id="form-modal-card"
      >
        {/* Header */}
        <div className="bg-[#1A1A1A] text-white p-3.5 md:p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-[#fb923c] text-black rounded-none neo-border-sm border-white shrink-0">
              <DynamicIcon name={editingEvent ? "Edit2" : "Plus"} size={14} />
            </div>
            <h2 className="text-sm md:text-base font-black font-sans uppercase tracking-wider">
              {editingEvent ? 'Edit Tracker' : 'New Tracker'}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-white hover:bg-white/10 active:scale-95 shrink-0"
            aria-label="Close"
          >
            <DynamicIcon name="X" size={20} />
          </button>
        </div>

        {/* Content Form Scroll area */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4 text-left">
          
          {/* Validation Alert */}
          {validationError && (
            <div className="bg-[#fb7185]/20 text-black border-[2px] border-[#fb7185] p-2.5 rounded-none font-mono text-xs flex items-center gap-2">
              <DynamicIcon name="AlertTriangle" size={14} className="text-[#fb7185]" />
              <span className="font-bold">{validationError}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-mono font-black uppercase tracking-wider text-black mb-1.5">
              Title <span className="text-[#fb7185]">*</span>
            </label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Started my first job"
              className="w-full bg-white text-black font-sans neo-border border-[3px] p-2 focus:outline-none focus:ring-1 focus:ring-black rounded-none placeholder-black/40 text-xs font-semibold"
              maxLength={60}
              required
            />
          </div>

          {/* Custom Date & Time Picker */}
          <div>
            <label className="block text-xs font-mono font-black uppercase tracking-wider text-black mb-1.5">
              Start Date <span className="text-[#fb7185]">*</span>
            </label>
            <CustomDateTimePicker 
              value={startDate}
              onChange={(val) => setStartDate(val)}
            />
          </div>

          {/* Event Ended Option */}
          <div className="bg-[#fffbeb] border-[2px] border-black p-3 space-y-2.5 shadow-[1.5px_1.5px_0_0_#000000]">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="has-ended-checkbox"
                checked={hasEnded}
                onChange={(e) => setHasEnded(e.target.checked)}
                className="w-4 h-4 text-amber-500 border-2 border-black rounded-none cursor-pointer"
              />
              <label htmlFor="has-ended-checkbox" className="text-xs font-mono font-black uppercase text-black cursor-pointer select-none">
                Ended
              </label>
            </div>
            {hasEnded && (
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-black/70">
                  End Date <span className="text-[#fb7185]">*</span>
                </label>
                <CustomDateTimePicker 
                  value={endDate}
                  onChange={(val) => setEndDate(val)}
                />
                <p className="text-[9px] font-mono text-black/50">
                  Tracking calculations will freeze at this end point.
                </p>
              </div>
            )}
          </div>

          {/* Grid for Preset category tags and Category input */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono font-black uppercase tracking-wider text-black mb-1.5">
                Category <span className="text-[#fb7185]">*</span>
              </label>
              <input 
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Fitness, Work"
                className="w-full bg-white text-black font-sans neo-border border-[3px] p-2 focus:outline-none focus:ring-1 focus:ring-black rounded-none text-xs font-bold"
                maxLength={20}
                required
              />
            </div>
            
            {/* Quick recommend presets */}
            <div className="flex flex-col justify-end">
              <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-black/50 mb-1">
                Presets:
              </span>
              <div className="flex flex-wrap gap-1">
                {PRESET_CATEGORIES.map(cat => (
                  <button
                    type="button"
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 border-[1.5px] border-black hover:bg-black hover:text-white transition-colors rounded-none ${category?.toLowerCase() === cat.toLowerCase() ? 'bg-black text-white' : 'bg-white text-black'}`}
                  >
                    #{cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Display Unit Preference */}
          <div>
            <label className="block text-xs font-mono font-black uppercase tracking-wider text-black mb-1.5">
              Format
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
              {[
                { value: 'detailed', label: 'Breakdown' },
                { value: 'days', label: 'Only Days' },
                { value: 'hours', label: 'In Hours' },
                { value: 'seconds', label: 'In Seconds' }
              ].map(opt => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setUnitPreference(opt.value as any)}
                  className={`p-1.5 border-[2px] border-black font-mono text-[10px] md:text-xs font-bold neo-btn-press ${unitPreference === opt.value ? 'bg-[#facc15]' : 'bg-white'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color choice Palette with beautiful Neobrutalist design */}
          <div>
            <label className="block text-xs font-mono font-black uppercase tracking-wider text-black mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-1.5">
              {NEO_COLORS.map(c => {
                const isSelected = color === c.value;
                return (
                  <button
                     type="button"
                     key={c.value}
                     onClick={() => setColor(c.value)}
                     className={`w-8 h-8 md:w-9 md:h-9 ${c.bgClass} neo-border border-[2px] rounded-none shadow-sm flex items-center justify-center transition-transform hover:scale-105 active:scale-95 ${isSelected ? 'ring-2 ring-offset-1 ring-black scale-105' : ''}`}
                     title={c.label}
                  >
                    {isSelected && (
                      <div className="bg-black p-0.5 border border-white">
                        <DynamicIcon name="Check" size={8} className="text-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Icon Picker list with layout filter */}
          <div>
            <label className="block text-xs font-mono font-black uppercase tracking-wider text-black mb-2">
              Icon
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 bg-white neo-border border-[2.5px] p-2 max-h-[140px] overflow-y-auto">
              {ICON_OPTIONS.map(opt => {
                const isSelected = icon === opt.name;
                return (
                  <button
                    type="button"
                    key={opt.name}
                    onClick={() => setIcon(opt.name)}
                    className={`p-1.5 rounded-none border-[1.5px] flex flex-col items-center gap-1 hover:bg-[#F4F2EE] ${isSelected ? 'bg-black text-white hover:bg-black border-black shadow-[1.5px_1.5px_0px_0px_#fb923c]' : 'bg-white text-black border-black/10'}`}
                    title={opt.label}
                  >
                    <DynamicIcon name={opt.name} size={14} />
                    <span className="text-[8px] font-mono leading-none truncate max-w-full font-bold">
                      {opt.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional notes/description */}
          <div>
            <label className="block text-xs font-mono font-black uppercase tracking-wider text-black mb-1.5">
              Notes
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any memories or details..."
              className="w-full bg-white text-black font-sans neo-border border-[3px] p-2 focus:outline-none focus:ring-1 focus:ring-black rounded-none text-xs font-medium placeholder-black/40 min-h-[60px] max-h-[120px]"
              maxLength={250}
            />
          </div>

        </form>

        {/* Footer */}
        <div className="p-3 bg-[#F4F2EE] neo-border border-t-[2.5px] md:border-t-[3px] gap-2 md:gap-3 flex flex-row items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 md:flex-none px-4 py-2 bg-white hover:bg-black/5 text-black border-[2px] border-black rounded-none font-mono font-bold text-xs neo-btn-press"
          >
            Cancel
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            className="flex-1 md:flex-none px-4 py-2 bg-[#4ade80] hover:bg-[#22c55e] text-black border-[2px] border-black rounded-none font-mono font-bold text-xs neo-btn-press flex items-center justify-center gap-1.5"
          >
            <DynamicIcon name="Check" size={12} />
            <span>{editingEvent ? 'Save' : 'Create'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
