export type BriefingSummary = {
  id: number;
  date: string;
  model: string;
};

export type Briefing = BriefingSummary & {
  session_id: string | null;
  content_markdown: string;
};

export type GenerateBriefingResult = {
  id: number;
  session_id: string;
  content_markdown: string;
  model: string;
  date: string;
  tool_calls: Array<{ name: string; input: Record<string, unknown> }>;
};
