// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Enhanced date helper functions with proper relative date calculation
const getDateFromRelativeTerm = (relativeTerm: string): string => {
  const today = new Date();
  const lowerTerm = relativeTerm.toLowerCase();
  
  switch (lowerTerm) {
    case 'today':
      return formatDateLocal(today);
    
    case 'tomorrow':
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return formatDateLocal(tomorrow);
    
    case 'day after tomorrow':
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(today.getDate() + 2);
      return formatDateLocal(dayAfterTomorrow);
    
    case 'next week':
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      return formatDateLocal(nextWeek);
    
    default:
      // Handle "next Monday", "next Friday", etc.
      if (lowerTerm.startsWith('next ')) {
        const dayName = lowerTerm.replace('next ', '').trim();
        return getNextDayOfWeek(dayName);
      }
      return relativeTerm; // Return as-is for specific dates
  }
};

const getNextDayOfWeek = (dayName: string): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const targetDay = days.indexOf(dayName.toLowerCase());
  
  if (targetDay === -1) return dayName; // Return original if not a valid day
  
  const today = new Date();
  const todayDay = today.getDay();
  
  let daysToAdd = targetDay - todayDay;
  if (daysToAdd <= 0) {
    daysToAdd += 7; // Move to next week
  }
  
  const nextDay = new Date(today);
  nextDay.setDate(today.getDate() + daysToAdd);
  return formatDateLocal(nextDay);
};

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get actual dates for the prompt
const todayDate = formatDateLocal(new Date());
const tomorrowDate = getDateFromRelativeTerm('tomorrow');
const nextMonday = getDateFromRelativeTerm('next monday');
const nextFriday = getDateFromRelativeTerm('next friday');

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [], currentEvents = [], currentTodos = [], currentNotes = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }


    // Enhanced system prompt with smart date calculation examples

    const systemPrompt = `You are an AI productivity assistant that can manage calendar events, tasks, and notes in a real database.

USER'S CURRENT DATA:
- CALENDAR EVENTS: ${JSON.stringify(currentEvents, null, 2)}
- TODOS: ${JSON.stringify(currentTodos, null, 2)}
- NOTES: ${JSON.stringify(currentNotes, null, 2)}

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:

CALENDAR COMMANDS:
1. When user asks to SCHEDULE, CREATE, ADD, PLAN, or BOOK an event → USE CREATE_EVENT
2. When user asks to UPDATE, RESCHEDULE, MOVE, MODIFY, or CHANGE an event → USE UPDATE_EVENT  
3. When user asks to DELETE, REMOVE, CANCEL, or CLEAR an event → USE DELETE_EVENT

TASK COMMANDS:
4. When user asks to ADD, CREATE, or MAKE a task/todo → USE CREATE_TASK
5. When user asks to UPDATE, MODIFY, or CHANGE a task → USE UPDATE_TASK
6. When user asks to DELETE or REMOVE a task → USE DELETE_TASK
7. When user asks to MARK task as complete/done → USE UPDATE_TASK with completed: true
8. When user asks to SET PRIORITY for a task → USE UPDATE_TASK with priority

NOTE COMMANDS:
9. When user asks to CREATE, ADD, or MAKE a note → USE CREATE_NOTE
10. When user asks to UPDATE or EDIT a note → USE UPDATE_NOTE
11. When user asks to DELETE or REMOVE a note → USE DELETE_NOTE

COMMAND FORMATS - USE EXACTLY THESE:
CREATE_EVENT: {"title": "Event Name", "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM", "color": "#3b82f6"}
UPDATE_EVENT: {"eventId": "actual-event-id", "updates": {"field": "new-value"}}
DELETE_EVENT: {"eventId": "actual-event-id"}

CREATE_TASK: {"text": "Task description", "priority": "low|medium|high", "due_date": "YYYY-MM-DD"}
UPDATE_TASK: {"taskId": "actual-task-id", "updates": {"field": "new-value"}}
DELETE_TASK: {"taskId": "actual-task-id"}

CREATE_NOTE: {"title": "Note title", "content": "Note content"}
UPDATE_NOTE: {"noteId": "actual-note-id", "updates": {"field": "new-value"}}
DELETE_NOTE: {"noteId": "actual-note-id"}

PRIORITY LEVELS: "low", "medium", "high"

SMART DATE CALCULATION - YOU MUST CALCULATE DATES CORRECTLY:
- "today" = ${getDateFromRelativeTerm('today')}
- "tomorrow" = ${getDateFromRelativeTerm('tomorrow')}
- "day after tomorrow" = ${getDateFromRelativeTerm('day after tomorrow')}
- "next Monday" = ${getDateFromRelativeTerm('next monday')}
- "next Friday" = ${getDateFromRelativeTerm('next friday')}
- "next week" = ${getDateFromRelativeTerm('next week')}

TIME FORMAT: 24-hour format (e.g., "14:00" for 2 PM, "09:30" for 9:30 AM)

EXAMPLES OF PROPER RESPONSES:

User: "Add a task to finish the report by Friday with high priority"
Response: "I'll add a high priority task to finish the report by Friday!
CREATE_TASK: {\"text\": \"Finish the report\", \"priority\": \"high\", \"due_date\": \"${getDateFromRelativeTerm('next friday')}\"}"

User: "Create a note about meeting notes with the content 'Discussed project timeline and deliverables'"
Response: "I'll create a note for your meeting notes!
CREATE_NOTE: {\"title\": \"Meeting Notes\", \"content\": \"Discussed project timeline and deliverables\"}"

User: "Mark the 'Buy groceries' task as completed"
Response: "I'll mark that task as completed!
UPDATE_TASK: {\"taskId\": \"task-id-here\", \"updates\": {\"completed\": true}}"

User: "Set priority of 'Write documentation' to high"
Response: "I'll update the priority of that task!
UPDATE_TASK: {\"taskId\": \"task-id-here\", \"updates\": {\"priority\": \"high\"}}"

CRITICAL RULES:
1. ALWAYS calculate relative dates by adding the correct number of days
2. For tasks without specific due dates, omit the due_date field
3. For notes, always include both title and content
4. ALWAYS include the calculated date in your response for clarity
5. ALWAYS include the appropriate command on a new line`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const response = completion.choices[0]?.message?.content || "I apologize, but I couldn't process your request.";

    console.log('AI Response:', response);

    return NextResponse.json({ 
      response: response,
      status: 'success'
    });

  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get AI response',
        details: error.message
      },
      { status: 500 }
    );
  }
}