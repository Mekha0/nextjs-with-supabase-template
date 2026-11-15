
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
  a link to an instruction set. It does not need to use all of the supplies listed. For each 
  suggestion, include a link to a website containing instructions for the craft that follows the 
  supplies list. ${extraRule} Ensure no links are null.
  Each item in required_materials must be copied exactly from the user's supplies. 
  required_tools lists the tools the craft uses (empty if none). 
  Descriptions must be 2 sentences or less. 
`;
} //3 def
