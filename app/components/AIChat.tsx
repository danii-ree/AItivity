'use client';

import { useState, useEffect, useRef } from 'react';
import { callOpenAI } from '../utils/openai';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Bot, User, Loader, Mic, X, Trash2, History, Calendar, Plus, Square } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  date: string;
  color: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string;
  created_at: string;
  updated_at: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);

  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Check if speech recognition is supported
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSpeechSupported(!!SpeechRecognition);
    
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        setTranscript(finalTranscript + interimTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          alert('Microphone access denied. Please allow microphone access to use speech recognition.');
        }
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          // Restart recognition if it ended unexpectedly
          recognitionRef.current.start();
        }
      };
    }
  }, []);

  // Load chat sessions and current session
  useEffect(() => {
    fetchChatSessions();
    fetchEvents();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Speech recognition functions
  const startListening = () => {
    if (!isSpeechSupported) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setTranscript('');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Use the transcript as input and auto-submit if there's content
      if (transcript.trim()) {
        setInput(transcript.trim());
        // Auto-submit after a short delay
        setTimeout(() => {
          handleSend();
        }, 500);
      }
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const fetchChatSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('chat_sessions')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setChatSessions(data || []);
    } catch (error) {
      console.error('Error fetching chat sessions:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
      setCurrentSessionId(sessionId);
      setShowHistory(false);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };
  const fetchTodos = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  const fetchNotes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const createNewSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from('chat_sessions')
        .insert([{
          title: 'New Chat',
          user_id: session.user.id,
          message_count: 0
        }])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setCurrentSessionId(data[0].id);
        setMessages([]);
        setShowHistory(false);
        await fetchChatSessions();
      }
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
      await fetchChatSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };
    // Task management functions
  const createTask = async (taskData: {
    text: string;
    priority?: 'low' | 'medium' | 'high';
    due_date?: string;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const task = {
        text: taskData.text,
        priority: taskData.priority || 'medium',
        due_date: taskData.due_date || null,
        completed: false,
        user_id: session.user.id,
      };

      const { data, error } = await supabase
        .from('todos')
        .insert([task])
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  };

  const updateTask = async (taskId: string, updates: Partial<Todo>) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', taskId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  // Note management functions
  const createNote = async (noteData: {
    title: string;
    content: string;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const note = {
        title: noteData.title,
        content: noteData.content,
        user_id: session.user.id,
      };

      const { data, error } = await supabase
        .from('notes')
        .insert([note])
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  };

  const updateNote = async (noteId: string, updates: Partial<Note>) => {
    try {
      const { error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', noteId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  };


  const callOpenAI = async (input: string) => {
    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));

      console.log('Sending request to /api/chat...');
      
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversationHistory,
          currentEvents: events,
          currentTodos: todos,
          currentNotes: notes
        }),
      });

      console.log('Response status:', response.status);

      const responseText = await response.text();
      console.log('Raw response:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON:', parseError);
        throw new Error(`API returned non-JSON response: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} - ${data.error || 'Unknown error'}`);
      }

      return data.response;
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw error;
    }
  };


  const createCalendarEvent = async (eventData: {
    title: string;
    date: string;
    start_time: string;
    end_time: string;
    color?: string;
  }) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const event = {
        title: eventData.title,
        date: eventData.date,
        start_time: eventData.start_time,
        end_time: eventData.end_time,
        color: eventData.color || '#3b82f6',
        user_id: session.user.id,
      };

      const { data, error } = await supabase
        .from('events')
        .insert([event])
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  };

  const updateCalendarEvent = async (eventId: string, updates: Partial<CalendarEvent>) => {
    try {
      const { error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  };

  const deleteCalendarEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  };

  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const parseAIResponse = async (response: string): Promise<{ response: string; actions?: any[] }> => {
    try {
      console.log('=== PARSING AI RESPONSE ===');
      console.log('Raw AI response:', response);

      const commands = [
        'CREATE_EVENT:', 'UPDATE_EVENT:', 'DELETE_EVENT:',
        'CREATE_TASK:', 'UPDATE_TASK:', 'DELETE_TASK:',
        'CREATE_NOTE:', 'UPDATE_NOTE:', 'DELETE_NOTE:'
      ];

      const hasCommand = commands.some(cmd => response.includes(cmd));

      if (!hasCommand) {
        return { response };
      }

      const lines = response.split('\n');
      let finalResponse = '';
      const actions: any[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Calendar events (existing code)
        if (trimmedLine.startsWith('CREATE_EVENT:')) {
          try {
            const jsonStr = trimmedLine.replace('CREATE_EVENT:', '').trim();
            const eventData = JSON.parse(jsonStr);
            
            if (!eventData.title || !eventData.date || !eventData.start_time || !eventData.end_time) {
              finalResponse += `❌ Missing required fields for event creation.\n`;
              continue;
            }

            const newEvent = await createCalendarEvent(eventData);
            actions.push({ type: 'create_event', event: newEvent });
            finalResponse += `✅ Created event: "${eventData.title}" on ${eventData.date} from ${eventData.start_time} to ${eventData.end_time}\n`;
            
          } catch (error) {
            console.error('Error creating event:', error);
            finalResponse += `❌ Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
          }
        } 
        else if (trimmedLine.startsWith('UPDATE_EVENT:')) {
          try {
            const jsonStr = trimmedLine.replace('UPDATE_EVENT:', '').trim();
            const updateData = JSON.parse(jsonStr);
            
            if (!updateData.eventId) {
              finalResponse += `❌ Missing eventId for update.\n`;
              continue;
            }

            await updateCalendarEvent(updateData.eventId, updateData.updates || {});
            actions.push({ type: 'update_event', eventId: updateData.eventId, updates: updateData.updates });
            finalResponse += `✅ Updated event\n`;
            
          } catch (error) {
            console.error('Error updating event:', error);
            finalResponse += `❌ Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
          }
        } 
        else if (trimmedLine.startsWith('DELETE_EVENT:')) {
          try {
            const jsonStr = trimmedLine.replace('DELETE_EVENT:', '').trim();
            const deleteData = JSON.parse(jsonStr);
            
            if (!deleteData.eventId) {
              finalResponse += `❌ Missing eventId for deletion.\n`;
              continue;
            }

            await deleteCalendarEvent(deleteData.eventId);
            actions.push({ type: 'delete_event', eventId: deleteData.eventId });
            finalResponse += `✅ Deleted event\n`;
            
          } catch (error) {
            console.error('Error deleting event:', error);
            finalResponse += `❌ Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
          }
        }
        // Task commands
        else if (trimmedLine.startsWith('CREATE_TASK:')) {
          try {
            const jsonStr = trimmedLine.replace('CREATE_TASK:', '').trim();
            const taskData = JSON.parse(jsonStr);
            
            if (!taskData.text) {
              finalResponse += `❌ Missing task description.\n`;
              continue;
            }

            const newTask = await createTask(taskData);
            actions.push({ type: 'create_task', task: newTask });
            finalResponse += `✅ Created task: "${taskData.text}" with ${taskData.priority || 'medium'} priority\n`;
            
          } catch (error) {
            console.error('Error creating task:', error);
            finalResponse += `❌ Failed to create task: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
          }
        }
        else if (trimmedLine.startsWith('UPDATE_TASK:')) {
          try {
            const jsonStr = trimmedLine.replace('UPDATE_TASK:', '').trim();
            const updateData = JSON.parse(jsonStr);
            
            if (!updateData.taskId) {
              finalResponse += `❌ Missing taskId for update.\n`;
              continue;
            }

            await updateTask(updateData.taskId, updateData.updates || {});
            actions.push({ type: 'update_task', taskId: updateData.taskId, updates: updateData.updates });
            finalResponse += `✅ Updated task\n`;
            
          } catch (error) {
            console.error('Error updating task:', error);
            finalResponse += `❌ Failed to update task: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
          }
        }
        else if (trimmedLine.startsWith('DELETE_TASK:')) {
          try {
            const jsonStr = trimmedLine.replace('DELETE_TASK:', '').trim();
            const deleteData = JSON.parse(jsonStr);
            
            if (!deleteData.taskId) {
              finalResponse += `❌ Missing taskId for deletion.\n`;
              continue;
            }

            await deleteTask(deleteData.taskId);
            actions.push({ type: 'delete_task', taskId: deleteData.taskId });
            finalResponse += `✅ Deleted task\n`;
            
          } catch (error) {
            console.error('Error deleting task:', error);
            finalResponse += `❌ Failed to delete task: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
          }
        }
        // Note commands
        else if (trimmedLine.startsWith('CREATE_NOTE:')) {
          try {
            const jsonStr = trimmedLine.replace('CREATE_NOTE:', '').trim();
            const noteData = JSON.parse(jsonStr);
            
            if (!noteData.title || !noteData.content) {
              finalResponse += `❌ Missing title or content for note creation.\n`;
              continue;
            }

            const newNote = await createNote(noteData);
            actions.push({ type: 'create_note', note: newNote });
            finalResponse += `✅ Created note: "${noteData.title}"\n`;
            
          } catch (error) {
            console.error('Error creating note:', error);
            finalResponse += `❌ Failed to create note: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
          }
        }
        else if (trimmedLine.startsWith('UPDATE_NOTE:')) {
          try {
            const jsonStr = trimmedLine.replace('UPDATE_NOTE:', '').trim();
            const updateData = JSON.parse(jsonStr);
            
            if (!updateData.noteId) {
              finalResponse += `❌ Missing noteId for update.\n`;
              continue;
            }

            await updateNote(updateData.noteId, updateData.updates || {});
            actions.push({ type: 'update_note', noteId: updateData.noteId, updates: updateData.updates });
            finalResponse += `✅ Updated note\n`;
            
          } catch (error) {
            console.error('Error updating note:', error);
            finalResponse += `❌ Failed to update note: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
          }
        }
        else if (trimmedLine.startsWith('DELETE_NOTE:')) {
          try {
            const jsonStr = trimmedLine.replace('DELETE_NOTE:', '').trim();
            const deleteData = JSON.parse(jsonStr);
            
            if (!deleteData.noteId) {
              finalResponse += `❌ Missing noteId for deletion.\n`;
              continue;
            }

            await deleteNote(deleteData.noteId);
            actions.push({ type: 'delete_note', noteId: deleteData.noteId });
            finalResponse += `✅ Deleted note\n`;
            
          } catch (error) {
            console.error('Error deleting note:', error);
            finalResponse += `❌ Failed to delete note: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
          }
        }
        else {
          finalResponse += trimmedLine + '\n';
        }
      }

      // Refresh all data
      await Promise.all([fetchEvents(), fetchTodos(), fetchNotes()]);
      return { response: finalResponse.trim(), actions };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return { response: "I encountered an error while processing your request. Please try again." };
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    try {
      setIsLoading(true);

      let sessionId = currentSessionId;
      if (!sessionId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          alert('Please log in to send messages');
          return;
        }

        const { data, error } = await supabase
          .from('chat_sessions')
          .insert([{
            title: input.substring(0, 50) || 'New Chat',
            user_id: session.user.id,
            message_count: 0
          }])
          .select();

        if (error) throw error;
        if (data && data.length > 0) {
          sessionId = data[0].id;
          setCurrentSessionId(sessionId);
        }
      }

      const userMessage: Message = {
        id: generateUUID(), 
        role: 'user',
        content: input,
        timestamp: new Date().toISOString(),
      };

      const { error: userMessageError } = await supabase
        .from('chat_messages')
        .insert([{
          ...userMessage,
          session_id: sessionId
        }]);

      if (userMessageError) throw userMessageError;

      setMessages(prev => [...prev, userMessage]);
      setInput('');

      try {
        const aiResponse = await callOpenAI(input);
        const { response: finalResponse, actions } = await parseAIResponse(aiResponse);

        const assistantMessage: Message = {
          id: generateUUID(), 
          role: 'assistant',
          content: finalResponse,
          timestamp: new Date().toISOString(),
        };

        const { error: assistantMessageError } = await supabase
          .from('chat_messages')
          .insert([{
            ...assistantMessage,
            session_id: sessionId
          }]);

        if (assistantMessageError) throw assistantMessageError;

        setMessages(prev => [...prev, assistantMessage]);
        
        await supabase
          .from('chat_sessions')
          .update({ 
            message_count: messages.length + 2,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        await fetchChatSessions();

      } catch (error) {
        console.error('Error getting AI response:', error);
        
        const fallbackMessage: Message = {
          id: generateUUID(), 
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment.",
          timestamp: new Date().toISOString(),
        };

        const { error: fallbackError } = await supabase
          .from('chat_messages')
          .insert([{
            ...fallbackMessage,
            session_id: sessionId
          }]);

        if (!fallbackError) {
          setMessages(prev => [...prev, fallbackMessage]);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

// Update the quickActions array in the AIChat component
const quickActions = [
  { 
    text: 'Schedule meeting', 
    prompt: 'Schedule a team meeting for tomorrow at 2 PM for 1 hour with the title "Team Standup"' 
  },
  { 
    text: 'Add high priority task', 
    prompt: 'Add a high priority task to finish the project report by Friday' 
  },
  { 
    text: 'Create meeting notes', 
    prompt: 'Create a note titled "Meeting Notes" with the content "Discussed project timeline and deliverables. Action items: 1. Finish report 2. Schedule follow-up"' 
  },
  { 
    text: 'Complete task', 
    prompt: 'Mark the task "Buy groceries" as completed' 
  },
  { 
    text: 'Set task priority', 
    prompt: 'Set the priority of "Write documentation" task to high' 
  },
  { 
    text: 'View my week', 
    prompt: 'What events, tasks, and notes do I have for this week?' 
  },
];

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">AI Assistant</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">Calendar & Productivity Manager</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <History className="w-4 h-4" />
              History
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={createNewSession}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 transition-colors"
            >
              New Chat
            </motion.button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action, idx) => (
            <motion.button
              key={idx}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setInput(action.prompt);
                setTimeout(() => handleSend(), 100);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              <Calendar className="w-3 h-3" />
              {action.text}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Chat History Sidebar */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className="absolute left-0 top-0 bottom-0 w-80 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 z-10"
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
              <h3 className="font-semibold text-zinc-900 dark:text-white">Chat History</h3>
            </div>
            <div className="p-4 space-y-2 overflow-y-auto max-h-[calc(100vh-200px)]">
              {chatSessions.map((session) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    currentSessionId === session.id
                      ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                      : 'bg-zinc-50 dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-600'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div 
                      className="flex-1 min-w-0"
                      onClick={() => fetchMessages(session.id)}
                    >
                      <p className="font-medium text-zinc-900 dark:text-white truncate">
                        {session.title}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        {formatDate(session.updated_at)} • {session.message_count} messages
                      </p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => deleteSession(session.id)}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 ml-2"
                    >
                      <Trash2 className="w-3 h-3" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
              {chatSessions.length === 0 && (
                <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No chat history yet</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
        {messages.length === 0 && !currentSessionId && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-zinc-500 dark:text-zinc-400">
              <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Start a conversation with your AI assistant!</p>
              <p className="text-sm mt-2">I can help you manage your calendar, schedule events, and optimize your time.</p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {quickActions.map((action, idx) => (
                  <motion.button
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setInput(action.prompt);
                      setTimeout(() => handleSend(), 100);
                    }}
                    className="px-3 py-2 text-xs rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {action.text}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        <AnimatePresence>
          {messages.map((message, idx) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: idx === messages.length - 1 ? 0.1 : 0 }}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {/* Assistant Avatar */}
              {message.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}

              {/* Message Content */}
              <div
                className={`
                  max-w-[70%] rounded-2xl px-4 py-3
                  ${message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                  }
                `}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-400'}`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>

              {/* User Avatar */}
              {message.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-4 justify-start"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3">
              <Loader className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        {/* Speech recognition indicator */}
        {isListening && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-3 p-3 bg-red-100 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
          >
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Listening... {transcript && `"${transcript}"`}</span>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Speak now. Click the stop button or wait for auto-submit.
            </p>
          </motion.div>
        )}

        <div className="flex gap-2">
          {/* Microphone button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleListening}
            className={`px-3 py-3 rounded-lg transition-colors ${
              isListening 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice input'}
            disabled={!isSpeechSupported}
          >
            {isListening ? <Square className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </motion.button>

          <input
            type="text"
            value={isListening ? transcript : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={
              isListening 
                ? "Speaking..." 
                : "Ask me to schedule events, check availability, or manage your calendar..."
            }
            className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            readOnly={isListening}
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isListening}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Browser support notice */}
        {!isSpeechSupported && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
            Voice input is supported in Chrome, Edge, and Safari. Please use a supported browser.
          </p>
        )}
      </div>
    </div>
  );
}