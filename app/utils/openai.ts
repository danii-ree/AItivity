// utils/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export interface CalendarEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  date: string;
  color: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Date helper functions
const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

const getTodayDate = () => {
  return new Date().toISOString().split('T')[0];
};

const formatTimeForDisplay = (time24h: string) => {
  const [hours, minutes] = time24h.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

export async function callOpenAI(
  message: string, 
  conversationHistory: ChatMessage[] = [], 
  currentEvents: CalendarEvent[] = []
): Promise<string> {
  try {
    // Create system prompt for calendar management
    const systemPrompt = `You are an AI calendar assistant that can actually CREATE, UPDATE, and DELETE calendar events. You have direct access to the user's calendar.

    USER'S CURRENT EVENTS:
    ${JSON.stringify(currentEvents, null, 2)}

    IMPORTANT INSTRUCTIONS:
    1. When user asks to schedule/create/add an event, you MUST use: CREATE_EVENT: {"title": "Event Name", "date": "YYYY-MM-DD", "start_time": "HH:MM", "end_time": "HH:MM", "color": "#3b82f6"}

    2. When user asks to update/reschedule/move an event, you MUST use: UPDATE_EVENT: {"eventId": "actual-event-id", "updates": {"field": "new-value"}}

    3. When user asks to delete/remove/cancel an event, you MUST use: DELETE_EVENT: {"eventId": "actual-event-id"}

    4. For event IDs, look at the current events provided above and use the actual ID from the "id" field.

    5. Always include BOTH the action command AND a friendly response message.

    6. Time format: Use 24-hour format (e.g., "14:00" for 2 PM)

    7. Date format: Always use YYYY-MM-DD

    EXAMPLES:

    User: "Schedule a team meeting tomorrow at 2pm for 1 hour"
    Response: "I'll schedule that team meeting for you!\nCREATE_EVENT: {\"title\": \"Team Meeting\", \"date\": \"${getTomorrowDate()}\", \"start_time\": \"14:00\", \"end_time\": \"15:00\", \"color\": \"#3b82f6\"}"

    User: "Move my 2pm meeting to 3pm tomorrow"
    Response: "I'll reschedule that meeting for you! First, I need to find the event ID from your calendar, but for now I'll create a new event.\nCREATE_EVENT: {\"title\": \"Meeting\", \"date\": \"${getTomorrowDate()}\", \"start_time\": \"15:00\", \"end_time\": \"16:00\", \"color\": \"#3b82f6\"}"

    User: "Cancel my workout on Friday"
    Response: "I'll cancel that workout for you! I'll remove it from your calendar.\nDELETE_EVENT: {\"eventId\": \"workout-event-id\"}"

    Be proactive and helpful! Always confirm what action you're taking.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: message }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return completion.choices[0]?.message?.content || "I apologize, but I couldn't process your request.";
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    throw new Error(`Failed to get AI response: ${error.message}`);
  }
}