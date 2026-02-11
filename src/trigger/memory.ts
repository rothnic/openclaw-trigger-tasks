import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

export const InterestSchema = z.object({
  topic: z.string(),
  description: z.string().optional(),
  level: z.enum(["low", "medium", "high"]).optional(),
});

export const PersonSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["kid", "teacher", "parent", "other"]),
  interests: z.array(InterestSchema).default([]),
  notes: z.array(z.string()).default([]),
  subjects: z.array(z.string()).optional(),
  giftIdeas: z.array(z.string()).optional(),
});

export type Person = z.infer<typeof PersonSchema>;

export const MemorySchema = z.object({
  people: z.array(PersonSchema).default([]),
});

export type Memory = z.infer<typeof MemorySchema>;

const MEMORY_FILE = path.join(process.cwd(), "memory.json");

export async function loadMemory(): Promise<Memory> {
  try {
    const data = await fs.readFile(MEMORY_FILE, "utf-8");
    return MemorySchema.parse(JSON.parse(data));
  } catch (error) {
    return { people: [] };
  }
}

export async function saveMemory(memory: Memory): Promise<void> {
  await fs.writeFile(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

export async function upsertPerson(memory: Memory, person: Partial<Person> & { name: string }): Promise<Person> {
  const existingIndex = memory.people.findIndex(p => p.name.toLowerCase() === person.name.toLowerCase());
  
  if (existingIndex >= 0) {
    const existing = memory.people[existingIndex];
    const updated = {
      ...existing,
      ...person,
      interests: [...existing.interests, ...(person.interests || [])],
      notes: [...existing.notes, ...(person.notes || [])],
      giftIdeas: [...(existing.giftIdeas || []), ...(person.giftIdeas || [])],
    };
    memory.people[existingIndex] = updated as Person;
    return updated as Person;
  } else {
    const newPerson: Person = {
        id: person.name.toLowerCase().replace(/\s+/g, "-"),
        role: "other",
        ...person,
        interests: person.interests || [],
        notes: person.notes || [],
    } as Person;
    memory.people.push(newPerson);
    return newPerson;
  }
}
