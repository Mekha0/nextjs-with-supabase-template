
//function: V4 
// Take item names, dificulty limit and return prompt text
export function generatePromptV4(itemNames: string[], limit: number, difficulty: string, allowExtra: boolean): string {
  const itemList = itemNames.join(", ");

  // what to do when there are not enough projects with only the owned supplies
  const extraRule = allowExtra
    ? `If you fail to find ${limit} links to instruction sets, then you may add at most 3 additional supplies 
    (that are easy to purchase) and list them in missing_materials.`
    : `Do not use any other supplies, and leave missing_materials empty.`;

  return `
  You are a craft project suggester. The user owns exactly these supplies: ${itemList} and desires 
  ${difficulty} complexity of craft construction. Assume the user has common 
  stock items (paper, glue, tape, ruler, etc.) and crafting tools (e.g. crochet hooks, needles, brushes,
  etc.). Suggest ${limit} distinct craft projects that can be made using only these supplies and provide
  a link to an instruction set. It does not need to use all of the supplies listed. For each 
  suggestion, include a link to a website containing instructions for the craft that follows the 
  supplies list. ${extraRule} Ensure no links are null 
  Each item in required_materials must be copied exactly from the user's supplies. 
  required_tools lists the tools the craft uses (empty if none). 
  Descriptions must be 2 sentences or less. 
`;
} //3 def

// V5: same as V4, but links may be null (no more invented URLs) and adds search_query as a fallback
export function generatePrompt(itemNames: string[], limit: number, difficulty: string, allowExtra: boolean): string {
  const itemList = itemNames.join(", ");

  const extraRule = allowExtra
    ? `If you fail to find ${limit} links to instruction sets, then you may add at most 3 additional supplies
    (that are easy to purchase) and list them in missing_materials.`
    : `Do not use any other supplies, and leave missing_materials empty.`;

  return `
  You are a craft project suggester. The user owns exactly these supplies: ${itemList} and desires
  ${difficulty} complexity of craft construction. Assume the user has common
  stock items (paper, glue, tape, ruler, etc.) and crafting tools (e.g. crochet hooks, needles, brushes,
  etc.). Suggest ${limit} distinct craft projects that can be made using only these supplies.
  It does not need to use all of the supplies listed. For each suggestion, include a link to a website
  containing instructions for the craft only if you are certain it exists. Prefer well-known sites
  (YouTube, Instructables, etc.). Never guess a URL path; if unsure, set link to null.
  Never link to a specific YouTube video (watch or youtu.be URLs); use null instead.
  Also give search_query: 3-6 words that would find a tutorial for this craft. ${extraRule}
  Each item in required_materials must be copied exactly from the user's supplies.
  required_tools lists the tools the craft uses (empty if none).
  Descriptions must be 2 sentences or less.
`;
}

//Only include a URL if you are certain it exists. Prefer well-known sites (YouTube, Instructables, Pinterest, etc.). Never guess a URL path
