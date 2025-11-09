'use client';

import { useState, useEffect, useRef } from 'react';
import { callOpenAI } from '../utils/openai';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Bot, User, Loader, Paperclip, X, Trash2, Image, History, Calendar, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  image_url?: string;
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

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat sessions and current session
  useEffect(() => {
    fetchChatSessions();
    fetchEvents();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const fileExt = file.name.split('.').pop();
      const fileName = `${session.user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image size should be less than 5MB');
        return;
      }

      setSelectedImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

const callOpenAI = async (input: string) => {
  try {
    // Convert current messages to the format expected by the API
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
        currentEvents: events
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Get the raw text first to see what we're receiving
    const responseText = await response.text();
    console.log('Raw response:', responseText);

    // Try to parse as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      console.error('Raw response was:', responseText);
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
  // Fallback for environments without crypto.randomUUID
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

    // Check if the response contains calendar actions
    const hasCreateEvent = response.includes('CREATE_EVENT:');
    const hasUpdateEvent = response.includes('UPDATE_EVENT:');
    const hasDeleteEvent = response.includes('DELETE_EVENT:');

    console.log('Action detection:', {
      hasCreateEvent,
      hasUpdateEvent, 
      hasDeleteEvent
    });

    if (!hasCreateEvent && !hasUpdateEvent && !hasDeleteEvent) {
      console.log('No calendar actions found, returning original response');
      return { response };
    }

    const lines = response.split('\n');
    let finalResponse = '';
    const actions: any[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      console.log('Processing line:', trimmedLine);
      
      if (trimmedLine.startsWith('CREATE_EVENT:')) {
        try {
          const jsonStr = trimmedLine.replace('CREATE_EVENT:', '').trim();
          console.log('Creating event with data:', jsonStr);
          
          const eventData = JSON.parse(jsonStr);
          
          // Validate required fields
          if (!eventData.title || !eventData.date || !eventData.start_time || !eventData.end_time) {
            finalResponse += `❌ Missing required fields for event creation. Need title, date, start_time, and end_time.\n`;
            continue;
          }

          console.log('Calling createCalendarEvent with:', eventData);
          const newEvent = await createCalendarEvent(eventData);
          console.log('Event created successfully:', newEvent);
          
          actions.push({ type: 'create', event: newEvent });
          finalResponse += `✅ Created event: "${eventData.title}" on ${eventData.date} from ${eventData.start_time} to ${eventData.end_time}\n`;
          
        } catch (error) {
          console.error('Error creating event:', error);
          finalResponse += `❌ Failed to create event: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
        }
      } 
      else if (trimmedLine.startsWith('UPDATE_EVENT:')) {
        try {
          const jsonStr = trimmedLine.replace('UPDATE_EVENT:', '').trim();
          console.log('Updating event with data:', jsonStr);
          
          const updateData = JSON.parse(jsonStr);
          
          if (!updateData.eventId) {
            finalResponse += `❌ Missing eventId for update.\n`;
            continue;
          }

          await updateCalendarEvent(updateData.eventId, updateData.updates || {});
          actions.push({ type: 'update', eventId: updateData.eventId, updates: updateData.updates });
          finalResponse += `✅ Updated event\n`;
          
        } catch (error) {
          console.error('Error updating event:', error);
          finalResponse += `❌ Failed to update event: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
        }
      } 
      else if (trimmedLine.startsWith('DELETE_EVENT:')) {
        try {
          const jsonStr = trimmedLine.replace('DELETE_EVENT:', '').trim();
          console.log('Deleting event with data:', jsonStr);
          
          const deleteData = JSON.parse(jsonStr);
          
          if (!deleteData.eventId) {
            finalResponse += `❌ Missing eventId for deletion.\n`;
            continue;
          }

          await deleteCalendarEvent(deleteData.eventId);
          actions.push({ type: 'delete', eventId: deleteData.eventId });
          finalResponse += `✅ Deleted event\n`;
          
        } catch (error) {
          console.error('Error deleting event:', error);
          finalResponse += `❌ Failed to delete event: ${error instanceof Error ? error.message : 'Unknown error'}\n`;
        }
      } 
      else {
        // Keep non-action lines as part of the response
        finalResponse += trimmedLine + '\n';
      }
    }

    console.log('Final parsed response:', finalResponse);
    console.log('Actions taken:', actions);

    // Refresh events after modifications
    await fetchEvents();

    return { response: finalResponse.trim(), actions };
  } catch (error) {
    console.error('Error parsing AI response:', error);
    return { response: "I encountered an error while processing your request. Please try again." };
  }
};
  const handleSend = async () => {
    if ((!input.trim() && !selectedImage) || isLoading) return;

    try {
      setIsLoading(true);

      // Create session if none exists
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

      // Upload image if selected
      let imageUrl: string | null = null;
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage);
      }

      const userMessage: Message = {
        id: generateUUID(), 
        role: 'user',
        content: input,
        timestamp: new Date().toISOString(),
        image_url: imageUrl || undefined
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
      removeImage();

      // Get AI response from OpenAI
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
        
        // Update session message count and title
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
const quickActions = [
  { 
    text: 'Schedule meeting', 
    prompt: 'Schedule a team meeting for tomorrow at 2 PM for 1 hour with the title "Team Standup"' 
  },
  { 
    text: 'Add study session', 
    prompt: 'Add a study session for machine learning this Friday from 3-5 PM' 
  },
  { 
    text: 'Plan workout', 
    prompt: 'Schedule a workout session for tomorrow at 7 AM for 45 minutes' 
  },
  { 
    text: 'View my schedule', 
    prompt: 'What events do I have scheduled for this week?' 
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
                {message.image_url && (
                  <div className="mb-3">
                    <img 
                      src={message.image_url} 
                      alt="Attached" 
                      className="max-w-full h-auto rounded-lg max-h-48 object-cover"
                    />
                  </div>
                )}
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
        {/* Image Preview */}
        {imagePreview && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3 relative"
          >
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="h-32 w-auto rounded-lg object-cover"
              />
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={removeImage}
                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full"
              >
                <X className="w-3 h-3" />
              </motion.button>
            </div>
          </motion.div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            title="Attach image"
          >
            <Paperclip className="w-5 h-5" />
          </motion.button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me to schedule events, check availability, or manage your calendar..."
            className="flex-1 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}