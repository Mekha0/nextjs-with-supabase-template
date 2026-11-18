
//function: V4 
// Take item names, dificulty limit and return prompt text
export function generatePrompt(itemNames: string[], limit: number, difficulty: string, allowExtra: boolean): string {
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
  a link to an instruction set. It does not need to use all of the supplies listed.

  Link requirement (strict):
  - Only include an exact HTTPS URL that you know resolves to a real page containing written or video
    instructions for that specific craft.
  - Never guess or fabricate a URL, product page, search URL, shortened link, tracking link, or placeholder.
  - Do not invent a page path or alter a known URL.
  - If you are not certain that a URL exists and has instructions, set link to null and do not count it
    as one of the suggestions.
  - Prefer stable instruction pages from established craft/tutorial sites.
  - Return exactly ${limit} distinct suggestions. Do not pad the array with uncertain, duplicate,
    or non-HTTPS links.

  For each suggestion, include a link to a website containing instructions for the craft that follows the
  supplies list. ${extraRule} 
  Each item in required_materials must be copied exactly from the user's supplies. 
  required_tools lists the tools the craft uses (empty if none). 
  Descriptions must be 2 sentences or less. 
`;
} //3 def
