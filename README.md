## Inspiration
After finishing a craft, you're left with a bunch of extra items that you don't know how to get rid of; watching them pile up, no purpose in sight, can feel rather daunting. We introduce Scraps: Turn Your Scraps Into Crafts, an app that breathes life into these leftover "scrap" items by suggesting craft ideas that use what you have.

## What it does
Users can take pictures of what they have---or manually enter them---save them into their inventory, and receive suggestions on what crafts they can build with them. Presented is a charming panel with a short description of the craft, the items required to build it, and an instructions set included (if one exists). Additionally, users own their own 'room' where they can display pictures of their crafts and keep track of the crafts they've completed and those in progress. With every step towards completing their craft, they gain XP and can level up, gaining a new title and rewards. By gamifying the Scraps-Into-Crafts pipeline, we want users to feel excitement towards the potential of their 'scraps,' rather than dreading the disposal of their excess supplies. 

## How we built it
- Nextjs (Framework)
- Supabase (Database) - Image storage and database.
- Roboflow (vision model) - We collected a dataset, combining preexisting datasets and hand-collecting our own images, and trained a YOLOv11S model on it.
- Vercel (deployment)

## Challenges we ran into
- Training our vision model took a lot of troubleshooting and was time consuming. There was a big learning curve for gathering the right images, annotating each material in each image, training the model, and testing
- Getting Gemini API to not return hallucinated links or links that no longer exist. We refined our prompt to include strict link requirements and wrote a function to check if the returned URL exists. We retry max three times if we cannot find a valid link. If no valid links are found, we display the craft with no included link (just the description).

## Accomplishments that we're proud of
- Functional website that is deployed and accessible
- Pretty UI with a cozy room theme
- Working API and suggested crafts function
- Vision model finetuned for crafts materials

## What we learned
- Prompt engineering and how to use open source AI models (including adding filters, parameters, hallucination-handling, safety, rate limits, libraries, etc)
- How Zod (validation library for TypeScript) works
- Using Figma and an MCP server to integrate UI functionality

## What's next for Scraps
- Improved object detection model to improve accuracy and broaden the variety of materials
- Community board feature to share projects and ideas
- Friends feature that lets users display their crafts amongst their circles and keep a leaderboard of high-achieving crafters
- For-you-page that features user-made video tutorials on how to complete a craft
