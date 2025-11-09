'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Calendar as CalendarIcon, CheckSquare, FileText, MessageSquare, Sparkles } from 'lucide-react';
import { Calendar as CalendarComponent } from './Calendar';
import { TodoList } from './TodoList';
import { Notes } from './Notes';
import { AIChat } from './AIChat';

type Tab = 'calendar' | 'todos' | 'notes' | 'ai';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<Tab>('calendar');

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'calendar', label: 'Calendar', icon: <CalendarIcon className="w-5 h-5" /> },
    { id: 'todos', label: 'Todos', icon: <CheckSquare className="w-5 h-5" /> },
    { id: 'notes', label: 'Notes', icon: <FileText className="w-5 h-5" /> },
    { id: 'ai', label: 'AI Assistant', icon: <Sparkles className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="p-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Productivity AI</h1>
              <p className="text-zinc-600 dark:text-zinc-400">Your intelligent life organizer</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 0.95 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </motion.button>
            ))}
          </div>
        </motion.header>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="min-h-[600px]"
          >
            {activeTab === 'calendar' && <CalendarComponent />}
            {activeTab === 'todos' && <TodoList />}
            {activeTab === 'notes' && <Notes />}
            {activeTab === 'ai' && <AIChat />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

