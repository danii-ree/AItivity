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
    const { message, conversationHistory = [], currentEvents = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Enhanced system prompt with smart date calculation examples
    const systemPrompt = `You are an AI calendar assistant that can ACTUALLY CREATE, UPDATE, and DELETE calendar events in a real database.

USER'S CURRENT CALENDAR EVENTS:
${JSON.stringify(currentEvents, null, 2)}

CRITICAL INSTRUCTIONS - YOU MUST FOLLOW THESE:
1. When user asks to SCHEDULE, CREATE, ADD, PLAN, or BOOK an event → USE CREATE_EVENT
2. When user asks to UPDATE, RESCHEDULE, MOVE, MODIFY, or CHANGE an event → USE UPDATE_EVENT  
3. When user asks to DELETE, REMOVE, CANCEL, or CLEAR an event → USE DELETE_EVENT

COMMAND FORMATS - USE EXACTLY THESE:
CREATE_EVENT: {"title": "Event Name", "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM", "color": "#3b82f6"}
UPDATE_EVENT: {"eventId": "actual-event-id", "updates": {"field": "new-value"}}
DELETE_EVENT: {"eventId": "actual-event-id"}

SMART DATE CALCULATION - YOU MUST CALCULATE DATES CORRECTLY:
- "today" = ${todayDate}
- "tomorrow" = ${tomorrowDate} (today + 1 day)
- "day after tomorrow" = ${getDateFromRelativeTerm('day after tomorrow')} (today + 2 days)
- "next Monday" = ${nextMonday}
- "next Friday" = ${nextFriday}
- "next week" = ${getDateFromRelativeTerm('next week')} (today + 7 days)

For specific dates like "December 25th", use "2023-12-25"
For relative dates, CALCULATE THE ACTUAL DATE by adding the appropriate number of days.

TIME FORMAT: 24-hour format (e.g., "14:00" for 2 PM, "09:30" for 9:30 AM)

EXAMPLES OF PROPER RESPONSES WITH DATE CALCULATION:

User: "Schedule a team meeting tomorrow at 2pm for 1 hour"
AI Thinks: "tomorrow" = today + 1 day = ${tomorrowDate}
Response: "I'll schedule your team meeting for tomorrow (${tomorrowDate}) at 2 PM!
CREATE_EVENT: {\"title\": \"Team Meeting\", \"date\": \"${tomorrowDate}\", \"start_time\": \"14:00\", \"end_time\": \"15:00\", \"color\": \"#3b82f6\"}"

User: "Add a meeting next Monday at 10am for 2 hours"
AI Thinks: "next Monday" = ${nextMonday}
Response: "I'll add your meeting for next Monday (${nextMonday}) at 10 AM!
CREATE_EVENT: {\"title\": \"Meeting\", \"date\": \"${nextMonday}\", \"start_time\": \"10:00\", \"end_time\": \"12:00\", \"color\": \"#3b82f6\"}"

User: "Create a workout session day after tomorrow at 6pm for 45 minutes"
AI Thinks: "day after tomorrow" = today + 2 days = ${getDateFromRelativeTerm('day after tomorrow')}
Response: "I'll create your workout session for day after tomorrow (${getDateFromRelativeTerm('day after tomorrow')}) at 6 PM!
CREATE_EVENT: {\"title\": \"Workout\", \"date\": \"${getDateFromRelativeTerm('day after tomorrow')}\", \"start_time\": \"18:00\", \"end_time\": \"18:45\", \"color\": \"#10b981\"}"

User: "Schedule a project review next week at 3pm for 1 hour"
AI Thinks: "next week" = today + 7 days = ${getDateFromRelativeTerm('next week')}
Response: "I'll schedule your project review for next week (${getDateFromRelativeTerm('next week')}) at 3 PM!
CREATE_EVENT: {\"title\": \"Project Review\", \"date\": \"${getDateFromRelativeTerm('next week')}\", \"start_time\": \"15:00\", \"end_time\": \"16:00\", \"color\": \"#8b5cf6\"}"

User: "Add a dentist appointment on December 25th at 9am for 1 hour"
Response: "I'll add your dentist appointment for December 25th!
CREATE_EVENT: {\"title\": \"Dentist Appointment\", \"date\": \"2023-12-25\", \"start_time\": \"09:00\", \"end_time\": \"10:00\", \"color\": \"#ef4444\"}"

CRITICAL RULES:
1. ALWAYS calculate relative dates by adding the correct number of days
2. "tomorrow" = today + 1 day
3. "day after tomorrow" = today + 2 days  
4. "next [day]" = calculate the next occurrence of that day
5. "next week" = today + 7 days
6. ALWAYS include the calculated date in your response for clarity
7. ALWAYS include the CREATE_EVENT command on a new line`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 600,
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

export async function GET() {
  return NextResponse.json({ 
    message: 'Calendar Chat API is working!',
    status: 'active',
    today: todayDate,
    tomorrow: tomorrowDate,
    nextMonday: nextMonday,
    nextFriday: nextFriday
  });
}