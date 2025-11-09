'use client';
import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, setHours, getHours, getMinutes } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Image as ImageIcon, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

type ViewMode = 'month' | 'week';

interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  date: Date;
  color: string;
  image?: string;
}

export function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  // Initialize with current time
  const getInitialEventTime = () => {
    const now = new Date();
    const hours = getHours(now);
    const minutes = getMinutes(now);
    // Round up to next 15-minute interval
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    const finalHours = roundedMinutes >= 60 ? hours + 1 : hours;
    const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes;
    const startTime = `${String(finalHours % 24).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
    const endHours = (finalHours + 1) % 24;
    const endTime = `${String(endHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
    return { startTime, endTime };
  };

  const initialTime = getInitialEventTime();
  const [newEvent, setNewEvent] = useState({
    title: '',
    startTime: initialTime.startTime,
    endTime: initialTime.endTime,
    color: '#3b82f6',
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; event: CalendarEvent } | null>(null);

  // Helper function to get current time as HH:MM string, rounded to next 15 minutes
  const getCurrentTimeString = (): string => {
    const now = new Date();
    const hours = getHours(now);
    const minutes = getMinutes(now);
    // Round up to next 15-minute interval
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    const finalHours = roundedMinutes >= 60 ? hours + 1 : hours;
    const finalMinutes = roundedMinutes >= 60 ? 0 : roundedMinutes;
    return `${String(finalHours % 24).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
  };

  // Helper function to add 1 hour to a time string
  const addOneHour = (timeString: string): string => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const newHours = (hours + 1) % 24;
    return `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);
// === GOOGLE CALENDAR FETCH LOGIC ===
    useEffect(() => {
      const fetchGoogleEvents = async () => {
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.provider_token;
        if (!token) {
          setEvents([]);
          return;
        }

        const nowISO = new Date().toISOString();
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?orderBy=startTime&singleEvents=true&timeMin=${nowISO}&maxResults=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          setEvents([]);
          return;
        }
        const gcal = await res.json();
        const eventsFromGoogle: CalendarEvent[] = (gcal.items || []).map(ev => ({
          id: ev.id,
          title: ev.summary || '(No Title)',
          startTime: ev.start?.dateTime?.substring(11, 16) || ev.start?.date?.substring(11, 16) || '00:00',
          endTime: ev.end?.dateTime?.substring(11, 16) || ev.end?.date?.substring(11, 16) || '23:59',
          date: ev.start?.dateTime ? new Date(ev.start.dateTime) : (ev.start?.date ? new Date(ev.start.date) : new Date()),
          color: '#4285F4', // Google Blue
          image: undefined,
        }));
        setEvents(eventsFromGoogle);
      };
      fetchGoogleEvents();
    }, []);
  // Auto-scroll to current time when switching to week view
  useEffect(() => {
    if (viewMode === 'week') {
      // Use a small delay to ensure the DOM is ready
      const timeoutId = setTimeout(() => {
        const scrollContainer = document.getElementById('week-scroll-container');
        if (scrollContainer) {
          const now = new Date();
          const hours = getHours(now);
          const minutes = getMinutes(now);
          const currentTimeInMinutes = hours * 60 + minutes;
          
          // Calculate scroll position to show at least 3 hours before and after current time
          // 3 hours = 180 minutes
          // Container height is 600px = 600 minutes (10 hours) visible
          // To show 3 hours before: scroll to currentTime - 180
          // This ensures:
          // - Top visible: currentTime - 180 minutes (3 hours before) ✓
          // - Current time: 180px from top of visible area
          // - Bottom visible: currentTime + 420 minutes (7 hours after, more than 3 hours) ✓
          // Ensure we don't scroll to negative values
          const minScrollPosition = Math.max(0, currentTimeInMinutes - 180);
          // Also ensure we don't scroll past the end (1440 minutes total - 600 visible = 840 max)
          const maxScrollPosition = 1440 - 600;
          const scrollPosition = Math.min(minScrollPosition, maxScrollPosition);
          
          // Scroll to the position with smooth behavior
          scrollContainer.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          });
        }
      }, 100); // Small delay to ensure DOM is fully rendered
      
      return () => clearTimeout(timeoutId);
    }
  }, [viewMode]); // Only trigger when switching to week view

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(event.date, date));
  };

  const timeSlots = Array.from({ length: 24 }, (_, i) => i);

  const getTimePosition = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60 + minutes) / 60;
  };

  const getEventHeight = (startTime: string, endTime: string) => {
    const start = getTimePosition(startTime);
    const end = getTimePosition(endTime);
    return (end - start) * 60;
  };

  const getEventTop = (startTime: string) => {
    return getTimePosition(startTime) * 60;
  };


  // Get current time position for indicator line
  const getCurrentTimePosition = (day: Date): number | null => {
    if (!isSameDay(day, currentTime)) return null;
    const hours = getHours(currentTime);
    const minutes = getMinutes(currentTime);
    return (hours * 60 + minutes);
  };

  const handleAddEvent = () => {
    if (newEvent.title.trim()) {
      const event: CalendarEvent = {
        id: editingEvent?.id || Date.now().toString(),
        ...newEvent,
        date: selectedDate,
      };
      if (editingEvent) {
        setEvents(events.map(e => e.id === editingEvent.id ? event : e));
      } else {
        setEvents([...events, event]);
      }
      // Reset to current time for next event
      const currentStartTime = getCurrentTimeString();
      setNewEvent({ title: '', startTime: currentStartTime, endTime: addOneHour(currentStartTime), color: '#3b82f6' });
      setEditingEvent(null);
      setShowEventModal(false);
    }
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedDate(event.date);
    setNewEvent({
      title: event.title,
      startTime: event.startTime,
      endTime: event.endTime,
      color: event.color,
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId));
  };

  const handleOpenEventModal = (date?: Date, time?: string) => {
    setEditingEvent(null);
    if (date) setSelectedDate(date);
    // Use current time if no time specified, otherwise use the provided time
    const startTime = time || getCurrentTimeString();
    setNewEvent({ 
      title: '', 
      startTime: startTime, 
      endTime: addOneHour(startTime), 
      color: '#3b82f6' 
    });
    setShowEventModal(true);
  };

  // Handle clicking on time slots to create events
  const handleTimeSlotClick = (e: React.MouseEvent, day: Date) => {
    // Don't create event if clicking on an existing event
    if ((e.target as HTMLElement).closest('.event-block')) {
      return;
    }

    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    // Find the scrollable container
    const scrollContainer = document.getElementById('week-scroll-container');
    const scrollTop = scrollContainer?.scrollTop || 0;
    
    // Calculate relative Y position accounting for scroll
    const relativeY = e.clientY - rect.top + scrollTop;
    
    // Convert to minutes (1px = 1 minute since height is 1440px for 1440 minutes)
    const minutes = Math.max(0, Math.min(1440, relativeY));
    
    // Round to nearest 15-minute interval
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const hours = Math.floor(roundedMinutes / 60);
    const mins = roundedMinutes % 60;
    const timeString = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    
    // Open modal with the clicked time
    handleOpenEventModal(day, timeString);
  };

  // Handle right-click for context menu
  const handleContextMenu = (e: React.MouseEvent, event: CalendarEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      event,
    });
  };


  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    }
  };

  const colorOptions = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigateDate('prev')}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
            {viewMode === 'month' 
              ? format(currentDate, 'MMMM yyyy')
              : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
            }
          </h2>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigateDate('next')}
            className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1 text-sm rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700"
          >
            Today
          </motion.button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'month'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Month
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Week
            </motion.button>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleOpenEventModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </motion.button>
        </div>
      </div>

      {viewMode === 'month' ? (
        <>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-semibold text-zinc-600 dark:text-zinc-400 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {days.map((day, idx) => {
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isSelected = isSameDay(day, selectedDate);
              const dayEvents = getEventsForDate(day);

              return (
                <motion.button
                  key={day.toString()}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.01 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedDate(day)}
                  className={`
                    relative p-2 rounded-lg min-h-[80px] text-left
                    ${isCurrentMonth ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-600'}
                    ${isSelected ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}
                    transition-colors
                  `}
                >
                  <div className="text-sm font-medium mb-1">{format(day, 'd')}</div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(event => (
                      <div
                        key={event.id}
                        className="text-xs px-2 py-1 rounded truncate cursor-pointer"
                        style={{ backgroundColor: event.color + '20', color: event.color }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditEvent(event);
                        }}
                      >
                        {event.startTime} {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">+{dayEvents.length - 2} more</div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
          {/* Day headers - sticky */}
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 sticky top-0 z-30">
            <div className="w-16 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800"></div>
            <div className="flex-1 grid grid-cols-7">
              {weekDays.map((day) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={day.toString()}
                    className={`h-16 border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 p-2 text-center ${
                      isToday ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-1 font-medium">
                      {format(day, 'EEE')}
                    </div>
                    <div
                      className={`text-lg font-semibold w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white'
                          : 'text-zinc-900 dark:text-white'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex h-[600px] overflow-y-auto" id="week-scroll-container">
            {/* Time column */}
            <div className="w-16 flex-shrink-0 border-r border-zinc-200 dark:border-zinc-800 sticky left-0 bg-white dark:bg-zinc-900 z-20">
              <div className="relative h-[1440px]">
                {timeSlots.map(hour => (
                  <div
                    key={hour}
                    className="h-16 border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400 pr-2 text-right pt-1"
                  >
                    {format(setHours(new Date(), hour), 'h a')}
                  </div>
                ))}
              </div>
            </div>

            {/* Days columns */}
            <div className="flex-1 grid grid-cols-7">
              {weekDays.map((day) => {
                const dayEvents = getEventsForDate(day);
                const isToday = isSameDay(day, new Date());
                const currentTimePos = getCurrentTimePosition(day);

                return (
                  <div 
                    key={day.toString()} 
                    className="border-r border-zinc-200 dark:border-zinc-800 last:border-r-0 relative"
                  >
                    {/* Time slots */}
                    <div 
                      className="time-slot-container relative h-[1440px] select-none cursor-pointer"
                      onClick={(e) => handleTimeSlotClick(e, day)}
                    >
                      {/* Hour lines */}
                      {timeSlots.map(hour => (
                        <div
                          key={hour}
                          className="h-16 border-b border-zinc-100 dark:border-zinc-800/50 relative hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                        >
                          {/* Half hour marker */}
                          <div className="absolute top-8 left-0 right-0 h-px border-t border-zinc-100 dark:border-zinc-800/30"></div>
                          {/* Quarter hour markers */}
                          <div className="absolute top-4 left-0 right-0 h-px border-t border-zinc-50 dark:border-zinc-800/20"></div>
                          <div className="absolute top-12 left-0 right-0 h-px border-t border-zinc-50 dark:border-zinc-800/20"></div>
                        </div>
                      ))}

                      {/* Current time indicator */}
                      {currentTimePos !== null && isToday && (
                        <div
                          className="absolute left-0 right-0 z-30 pointer-events-none"
                          style={{ top: `${currentTimePos}px` }}
                        >
                          <div className="flex items-center">
                            <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                            <div className="flex-1 h-0.5 bg-red-500"></div>
                          </div>
                        </div>
                      )}

                      {/* Events */}
                      {dayEvents.map(event => {
                        const top = getEventTop(event.startTime);
                        const height = getEventHeight(event.startTime, event.endTime);

                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02, zIndex: 20 }}
                            className="event-block absolute left-1 right-1 rounded-md px-2 py-1 text-xs cursor-pointer shadow-md hover:shadow-lg transition-all z-10 overflow-hidden"
                            style={{
                              top: `${top}px`,
                              height: `${Math.max(height, 30)}px`,
                              backgroundColor: event.color,
                              color: 'white',
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditEvent(event);
                            }}
                            onContextMenu={(e) => handleContextMenu(e, event)}
                          >
                            <div className="font-semibold truncate text-white">{event.title}</div>
                            {height > 35 && (
                              <div className="text-xs opacity-90 text-white/90">
                                {event.startTime} - {event.endTime}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Right-click Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 z-50 py-1 min-w-[150px]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                handleEditEvent(contextMenu.event);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center gap-2"
            >
              <Edit2 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => {
                handleDeleteEvent(contextMenu.event.id);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Date Events - Only show in month view */}
      {viewMode === 'month' && getEventsForDate(selectedDate).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800"
        >
          <h3 className="text-lg font-semibold mb-4 text-zinc-900 dark:text-white">
            Events for {format(selectedDate, 'MMMM d, yyyy')}
          </h3>
          <div className="space-y-3">
            {getEventsForDate(selectedDate).map(event => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800 group"
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1">
                  <div className="font-medium text-zinc-900 dark:text-white">{event.title}</div>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {event.startTime} - {event.endTime}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleEditEvent(event)}
                    className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
                {event.image && (
                  <ImageIcon className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Add Event Modal */}
      <AnimatePresence>
        {showEventModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Date</label>
                  <input
                    type="date"
                    value={format(selectedDate, 'yyyy-MM-dd')}
                    onChange={(e) => setSelectedDate(new Date(e.target.value))}
                    className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Event title"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">Start Time</label>
                    <input
                      type="time"
                      step="900"
                      value={newEvent.startTime}
                      onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-zinc-700 dark:text-zinc-300">End Time</label>
                    <input
                      type="time"
                      step="900"
                      value={newEvent.endTime}
                      onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-zinc-700 dark:text-zinc-300">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewEvent({ ...newEvent, color })}
                        className={`w-10 h-10 rounded-full border-2 transition-all ${
                          newEvent.color === color 
                            ? 'border-zinc-900 dark:border-white scale-110 ring-2 ring-offset-2 ring-offset-white dark:ring-offset-zinc-800' 
                            : 'border-transparent hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddEvent}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingEvent ? 'Save Changes' : 'Add Event'}
                  </motion.button>
                  {editingEvent && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        handleDeleteEvent(editingEvent.id);
                        setShowEventModal(false);
                        setEditingEvent(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete
                    </motion.button>
                  )}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setShowEventModal(false);
                      setEditingEvent(null);
                      // Reset to current time
                      const currentStartTime = getCurrentTimeString();
                      setNewEvent({ title: '', startTime: currentStartTime, endTime: addOneHour(currentStartTime), color: '#3b82f6' });
                    }}
                    className="flex-1 px-4 py-2 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-600"
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

