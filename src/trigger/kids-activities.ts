import { task } from "@trigger.dev/sdk/v3";
import { google } from "googleapis";
import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { loadMemory, saveMemory, upsertPerson } from "./memory";

// Initialize OpenAI-compatible client (points to 9router via OPENAI_BASE_URL env var)
const openai = new OpenAI();

// Initialize Google Auth
const auth = new google.auth.GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/calendar'],
});
const calendar = google.calendar({ version: 'v3', auth });

const EventSchema = z.object({
  summary: z.string(),
  start: z.string().describe("ISO 8601 date string"),
  end: z.string().describe("ISO 8601 date string"),
  description: z.string().optional(),
  location: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
});

const PersonUpdateSchema = z.object({
  name: z.string(),
  role: z.enum(["kid", "teacher", "parent", "other"]).optional(),
  interests: z.array(z.string()).describe("List of interests or hobbies").optional(),
  notes: z.array(z.string()).describe("General notes or facts").optional(),
  giftIdeas: z.array(z.string()).describe("Gift ideas mentioned").optional(),
});

const EventsResponse = z.object({
  events: z.array(EventSchema),
  people_updates: z.array(PersonUpdateSchema).optional(),
  feedback_questions: z.array(z.string()).describe("Questions to ask the user for clarification"),
});

export const kidsActivitiesSync = task({
  id: "kids-activities-sync",
  run: async (payload: { text: string, source?: string }) => {
    console.log(`Processing text from ${payload.source || "unknown"}`);

    // 0. Load Memory
    const memory = await loadMemory();
    const memoryContext = memory.people.map(p => ({ 
      name: p.name, 
      role: p.role, 
      interests: p.interests.map(i => i.topic).join(", ") 
    }));

    // 1. Extract Events using LLM
    const completion = await openai.chat.completions.create({
      model: "balance",
      messages: [
        { role: "system", content: `You are a helpful assistant that extracts calendar events from text. 
You also identify if any clarification is needed (e.g., missing times, ambiguous dates). 
If the user mentions 'study for test', create a study event for the night before.

You also track people and their interests in our memory.
Current known people: ${JSON.stringify(memoryContext, null, 2)}

If you find NEW info about people (interests, roles, gift ideas), extract it in 'people_updates'.
Merge with existing info if possible.` },
        { role: "user", content: payload.text },
      ],
      response_format: zodResponseFormat(EventsResponse, "events_response"),
    });

    const result = completion.choices[0].message.parsed;
    if (!result) throw new Error("Failed to parse LLM response");

    // 2. Process Events
    const createdEvents = [];
    
    // In a real agentic workflow, if 'feedback_questions' is not empty, 
    // we might trigger a 'ask-user' task instead of creating events immediately.
    // For now, we'll create what we can.

    for (const event of result.events) {
       console.log(`Creating event: ${event.summary}`);
       // await calendar.events.insert({ ... })
       createdEvents.push(event);
    }

    // 3. Process Memory Updates
    const updatedPeople = [];
    if (result.people_updates) {
      for (const update of result.people_updates) {
        console.log(`Updating person: ${update.name}`);
        const personUpdate = {
            ...update,
            interests: update.interests?.map(topic => ({ topic }))
        };
        const p = await upsertPerson(memory, personUpdate);
        updatedPeople.push(p.name);
      }
      await saveMemory(memory);
    }

    return { 
      success: true, 
      events: createdEvents,
      updated_people: updatedPeople,
      questions: result.feedback_questions 
    };
  },
});
