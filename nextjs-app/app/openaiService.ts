import * as dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables from .env file
dotenv.config();

// Configuration constants
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// API configuration
export const API_CONFIG = {
  title: "Screenshot Analysis API",
  description: "API for analyzing screenshots using OpenAI Vision",
  version: "0.1.0"
};

// OpenAI prompt configuration
// export const SYSTEM_PROMPT = "You are a personal assistant that analyzes screenshots taken on a user's phone and creates tasks for a todo list out of them. Provide your analysis in JSON format.";

// export const USER_PROMPT = `Analyze this screenshot. The user took this screenshot on their phone because they thought it would somehow be useful to them. Generate a task for a todo list out of it.
// E.g. 
// - if the screenshot contains a book, the task that should be created is 'order BOOK_NAME', and the \`category\` should be \`books\` (because you can link to a book on Amazon).
// - if the screenshot contains a tweet with a productivity hack, create a task that suggests something the user should do to include that productivity hack in their life. The \`category\` should be \`productivity\`.
// - if the screenshot contains an item that can be bought in a supermarket, the task that should be created is 'add ITEM_NAME to shopping list', and the \`category\` should be \`shopping\`, because it's something that should be bought.
// - if the screenshot contains a meme or something funny, the task that should be created is 'share funny <MEME_DESCRIPTION> with friends', and the \`category\` should be \`share with friends\`.
// - for other cases, think of what the user would like to do with the screenshot, and create a task that suggests something the user should do. The \`category\` should be \`text\`.

// After your analysis, return the result using the exact structure shown below:
// {
//     "task": string,
//     "reason": string,
//     "category": string (one of: "books", "travel", "cooking", "dating", "gadgets", "productivity", "shopping", "receipts", "AI", "home decor", "funny, share with friends", *any other category that doesn't fit the above)
// }
// `;

// ==== SYSTEM ====
export const SYSTEM_PROMPT = `
You are an AI assistant that inspects phone screenshots and turns the *actionable intent* in each image into structured to-do items.
Think privately, then reply with **only** valid JSON that conforms to the schema below — no markdown, no commentary.
`;

// ==== USER ====
export const USER_PROMPT = `
Analyze the screenshot the user just captured.

Rules
-----
1. Infer the *single best* action the user likely wants to remember.
2. If the image offers no useful action, reply with an empty string.
3. Allowed categories (case-sensitive): 
   "books", "travel", "cooking", "dating", "gadgets", "productivity",
   "shopping", "receipts", "AI", "home decor", "funny", "share", "other".
   If none fit, use "other".
4. Think step-by-step but do **not** reveal your chain of thought.
5. Return valid JSON **only** — no leading/trailing text.

Examples (abbreviated)
----------------------
• Book cover of *Atomic Habits*  →  
  [{"task":"Order “Atomic Habits”","reason":"User likely wants to read the book","category":"books"}]
• Tweet about inbox-zero hack →  
  [{"task":"Block 30 min to try inbox-zero routine","reason":"Tweet describes productivity method","category":"productivity"}]
• Grocery flyer showing avocados on sale & recipe screenshot →  
  [
    {"task":"Add avocados to shopping list","reason":"Image shows grocery sale item","category":"shopping"},
    {"task":"Save guacamole recipe","reason":"Recipe screenshot","category":"cooking"}
  ]

Output schema
-------------
{
  "task":        string,   // actionable phrasing starting with a verb
  "reason":      string,   // short justification (< 20 words)
  "category":    string,   // one of the allowed categories
}
`;

// Analysis result interface
export interface AnalysisResult {
  task: string;
  reason: string;
  category: string;
}

// Initialize OpenAI client
const client = new OpenAI({
  apiKey: OPENAI_API_KEY
});

/**
 * Analyzes a screenshot using OpenAI Vision API and extracts structured output
 */
export async function analyzeScreenshot(screenshotUrl: string): Promise<AnalysisResult> {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            {
              type: "image_url",
              image_url: {
                url: screenshotUrl
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      response_format: { type: "json_object" }
    });

    // Extract the response content
    const analysisResult = JSON.parse(response.choices[0].message.content || '{}');

    // Return structured data
    return {
      task: analysisResult.task || "No task identified",
      reason: analysisResult.reason || "No reason provided",
      category: analysisResult.category || "No category provided"
    };
  } catch (e) {
    // Log the error and return a default response
    console.error(`Error analyzing screenshot: ${e instanceof Error ? e.message : String(e)}`);
    return {
      task: "Error analyzing screenshot",
      reason: e instanceof Error ? e.message : String(e),
      category: "error"
    };
  }
} 

