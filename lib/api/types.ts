export type CraftStatus = "todo" | "in_progress" | "complete";
export type Difficulty = "any" | "beginner" | "intermediate" | "advanced";

export type Item = {
  id: string;
  name: string;
  quantity: number;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Craft = {
  id: string;
  title: string;
  description: string | null;
  status: CraftStatus;
  photo_url: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UserProgress = { xp: number; level: number };
export type Me = UserProgress & {
  id: string;
  username: string;
  name: string;
  last_name: string;
};

export type ScanCandidate = { name: string; confidence: number };

export type Suggestion = {
  title: string;
  description: string;
  link: string | null;
  required_materials: string[]; // ones the user owns
  required_tools: string[];
  missing_materials: string[]; // ones they'd need to buy
  source: "llm";
};