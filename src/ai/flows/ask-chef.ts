'use server';
/**
 * @fileOverview A conversational AI agent that answers questions about a specific recipe.
 *
 * - askChef - A function that handles the conversational process.
 * - AskChefInput - The input type for the askChef function.
 * - AskChefOutput - The return type for the askChef function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRecipeOutputSchema = z.object({
  recipeName: z.string().describe('The name of the generated recipe.'),
  ingredients: z.array(z.string()).describe('A list of ingredients required for the recipe.'),
  instructions: z.array(z.string()).describe('Step-by-step instructions for preparing the recipe.'),
  nutritionalInformation: z.string().optional().describe('Nutritional information for the recipe, if available.'),
});

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

const AskChefInputSchema = z.object({
  recipe: GenerateRecipeOutputSchema.describe('The full recipe object that the user is asking about.'),
  question: z.string().describe("The user's most recent question about the recipe."),
  history: z.array(ChatMessageSchema).optional().describe('The previous conversation history.'),
});
export type AskChefInput = z.infer<typeof AskChefInputSchema>;

const AskChefOutputSchema = z.object({
  answer: z.string().describe("The AI chef's answer to the user's question."),
});
export type AskChefOutput = z.infer<typeof AskChefOutputSchema>;

export async function askChef(input: AskChefInput): Promise<AskChefOutput> {
  return askChefFlow(input);
}

const prompt = ai.definePrompt({
  name: 'askChefPrompt',
  input: {schema: AskChefInputSchema},
  output: {schema: AskChefOutputSchema},
  prompt: `You are an expert chef and culinary assistant. A user is asking a question about a recipe you have provided.

Your personality is helpful, friendly, and encouraging. Your goal is to provide clear, concise, and safe cooking advice. To make your answers easy to read, please use Markdown for formatting. For example, use **bold text** for important terms or ingredients, and use newlines to separate steps or list items.

Here is the full recipe context:
Recipe Name: {{{recipe.recipeName}}}
Ingredients:
{{#each recipe.ingredients}}
- {{{this}}}
{{/each}}

Instructions:
{{#each recipe.instructions}}
{{@index_1}}. {{{this}}}
{{/each}}

{{#if recipe.nutritionalInformation}}
Nutritional Information: {{{recipe.nutritionalInformation}}}
{{/if}}

Here is the conversation history so far. The 'model' role represents your previous responses as the Chef, and the 'user' role is the person asking questions. The user's last message is the one you need to respond to.
{{#each history}}
{{this.role}}: {{{this.content}}}
{{/each}}

User's current question: {{{question}}}

Please answer the user's question based on the recipe context and your expert knowledge. If the question is unrelated to the recipe or cooking, politely steer the conversation back to the recipe.
`,
});

const askChefFlow = ai.defineFlow(
  {
    name: 'askChefFlow',
    inputSchema: AskChefInputSchema,
    outputSchema: AskChefOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
