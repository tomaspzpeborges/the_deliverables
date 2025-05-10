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
export const SYSTEM_PROMPT = "You are a personal assistant that analyzes screenshots taken on a user's phone and creates tasks out of them. Provide your analysis in JSON format.";

export const USER_PROMPT = `Analyze this screenshot. The user took this screenshot on their phone because they thought it would somehow be useful to them. 
E.g. 
- if the screenshot contains a book, the task that should be created is 'order BOOK_NAME', and the \`category\` should be \`books\` (because you can link to a book on Amazon).
- if the screenshot contains a tweet with a productivity hack, create a task that suggests something the user should do to include that productivity hack in their life. The \`category\` should be \`productivity\`.
- if the screenshot contains an item that can be bought in a supermarket, the task that should be created is 'add ITEM_NAME to shopping list', and the \`category\` should be \`shopping\`, because it's something that should be bought.
- if the screenshot contains a meme or something funny, the task that should be created is 'share funny <MEME_DESCRIPTION> with friends', and the \`category\` should be \`share with friends\`.
- for other cases, think of what the user would like to do with the screenshot, and create a task that suggests something the user should do. The \`category\` should be \`text\`.

After your analysis, return the result using the exact structure shown below:
{
    "task": string,
    "reason": string,
    "category": string (one of: "books", "travel", "cooking", "dating", "gadgets", "productivity", "shopping", "receipts", "AI", "home decor", "funny, share with friends", *any other category that doesn't fit the above)
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

const result = await analyzeScreenshot("https://media.newyorker.com/photos/6665efc15be45e17478f767f/master/w_1000,c_limit/The%20Achilles%20Trap.jpg");
console.log('result', result)
