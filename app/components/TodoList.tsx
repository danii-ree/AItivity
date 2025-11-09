'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, Sparkles, Trash2, Clock, Star, Edit2, Save, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  ai_suggested?: boolean;
  created_at: string;
  updated_at: string;
}

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState('');
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions] = useState<string[]>([
    'Prepare presentation slides',
    'Follow up with client',
    'Update project documentation',
    'Review budget allocation',
  ]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTodo, setEditingTodo] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');

  // Load todos from Supabase
  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        console.log('No user session found');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching todos:', error);
        return;
      }

      setTodos(data || []);
    } catch (error) {
      console.error('Error loading todos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addTodo = async () => {
    if (newTodo.trim()) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          alert('Please log in to create todos');
          return;
        }

        const todoData = {
          text: newTodo,
          completed: false,
          priority: 'medium',
          user_id: session.user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('todos')
          .insert([todoData])
          .select();

        if (error) throw error;

        if (data && data.length > 0) {
          setTodos([data[0], ...todos]);
          setNewTodo('');
        }
      } catch (error) {
        console.error('Error creating todo:', error);
        alert('Error creating todo. Please try again.');
      }
    }
  };

  const toggleTodo = async (id: string) => {
    try {
      const todo = todos.find(t => t.id === id);
      if (!todo) return;

      const { error } = await supabase
        .from('todos')
        .update({
          completed: !todo.completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setTodos(todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed, updated_at: new Date().toISOString() } : todo
      ));
    } catch (error) {
      console.error('Error updating todo:', error);
      alert('Error updating todo. Please try again.');
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTodos(todos.filter(todo => todo.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert('Error deleting todo. Please try again.');
    }
  };

  const addAISuggestion = async (suggestion: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Please log in to create todos');
        return;
      }

      const todoData = {
        text: suggestion,
        completed: false,
        priority: 'medium',
        ai_suggested: true,
        user_id: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('todos')
        .insert([todoData])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setTodos([data[0], ...todos]);
      }
    } catch (error) {
      console.error('Error creating AI suggestion todo:', error);
      alert('Error creating todo. Please try again.');
    }
  };

  const startEditing = (todo: Todo) => {
    setEditingTodo(todo.id);
    setEditText(todo.text);
    setEditPriority(todo.priority);
  };

  const saveEdit = async () => {
    if (editingTodo && editText.trim()) {
      try {
        const { error } = await supabase
          .from('todos')
          .update({
            text: editText,
            priority: editPriority,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingTodo);

        if (error) throw error;

        setTodos(todos.map(todo =>
          todo.id === editingTodo 
            ? { ...todo, text: editText, priority: editPriority, updated_at: new Date().toISOString() }
            : todo
        ));
        setEditingTodo(null);
        setEditText('');
        setEditPriority('medium');
      } catch (error) {
        console.error('Error updating todo:', error);
        alert('Error updating todo. Please try again.');
      }
    }
  };

  const cancelEdit = () => {
    setEditingTodo(null);
    setEditText('');
    setEditPriority('medium');
  };

  const updatePriority = async (id: string, priority: 'low' | 'medium' | 'high') => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({
          priority: priority,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setTodos(todos.map(todo =>
        todo.id === id ? { ...todo, priority: priority, updated_at: new Date().toISOString() } : todo
      ));
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Error updating priority. Please try again.');
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return '🔥';
      case 'medium': return '⚡';
      default: return '💤';
    }
  };

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading todos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg p-6 border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Todo List</h2>
      </div>

      {/* Add Todo Input */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="Add a new task..."
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={addTodo}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Todo List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        <AnimatePresence>
          {sortedTodos.map((todo, idx) => (
            <motion.div
              key={todo.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ delay: idx * 0.05 }}
              className={`
                flex items-center gap-3 p-4 rounded-lg border transition-all
                ${todo.completed
                  ? 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-800'
                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700'
                }
              `}
            >
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => toggleTodo(todo.id)}
                className={`
                  w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
                  ${todo.completed
                    ? 'bg-green-500 border-green-500'
                    : 'border-zinc-300 dark:border-zinc-600 hover:border-green-500'
                  }
                `}
              >
                {todo.completed && <Check className="w-4 h-4 text-white" />}
              </motion.button>
              
              <div className="flex-1">
                {editingTodo === todo.id ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-3 py-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                    />
                    <div className="flex gap-2">
                      {(['low', 'medium', 'high'] as const).map(priority => (
                        <button
                          key={priority}
                          onClick={() => setEditPriority(priority)}
                          className={`px-2 py-1 rounded text-xs ${
                            editPriority === priority
                              ? getPriorityColor(priority)
                              : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {priority}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`
                    font-medium
                    ${todo.completed
                      ? 'line-through text-zinc-500 dark:text-zinc-500'
                      : 'text-zinc-900 dark:text-white'
                    }
                  `}>
                    {todo.text}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {/* Priority Selector */}
                  {editingTodo !== todo.id && (
                    <div className="flex gap-1">
                      {(['low', 'medium', 'high'] as const).map(priority => (
                        <button
                          key={priority}
                          onClick={() => updatePriority(todo.id, priority)}
                          className={`text-xs px-2 py-1 rounded transition-all ${
                            todo.priority === priority
                              ? getPriorityColor(priority)
                              : 'opacity-30 hover:opacity-70 bg-zinc-100 dark:bg-zinc-700'
                          }`}
                          title={`Set priority to ${priority}`}
                        >
                          {getPriorityIcon(priority)} {priority}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {todo.ai_suggested && (
                    <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI
                    </span>
                  )}
                  {todo.due_date && (
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {todo.due_date}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-1">
                {editingTodo === todo.id ? (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={saveEdit}
                      className="p-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={cancelEdit}
                      className="p-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => startEditing(todo)}
                      className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteTodo(todo.id)}
                      className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {todos.length === 0 && (
          <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
            <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No todos yet. Add your first task!</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-sm">
        <div className="text-zinc-600 dark:text-zinc-400">
          {todos.filter(t => !t.completed).length} remaining
        </div>
        <div className="text-zinc-600 dark:text-zinc-400">
          {todos.filter(t => t.completed).length} completed
        </div>
      </div>
    </div>
  );
}