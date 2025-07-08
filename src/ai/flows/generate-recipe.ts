// src/ai/flows/generate-recipe.ts
'use server';
/**
 * @fileOverview A recipe generation AI agent.
 *
 * - generateRecipe - A function that handles the recipe generation process.
 * - GenerateRecipeInput - The input type for the generateRecipe function.
 * - GenerateRecipeOutput - The return type for the generateRecipe function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRecipeInputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe to generate.'),
  ingredients: z.array(z.string()).describe('A list of ingredients available to use in the recipe.'),
  dietaryRestrictions: z.string().describe('Any dietary restrictions the recipe should adhere to.'),
});
export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;

const GenerateRecipeOutputSchema = z.object({
  recipeName: z.string().describe('The name of the generated recipe.'),
  ingredients: z.array(z.string()).describe('A list of ingredients required for the recipe.'),
  instructions: z.array(z.string()).describe('Step-by-step instructions for preparing the recipe.'),
  nutritionalInformation: z.string().optional().describe('Nutritional information for the recipe, if available.'),
});
export type GenerateRecipeOutput = z.infer<typeof GenerateRecipeOutputSchema>;

export async function generateRecipe(input: GenerateRecipeInput): Promise<GenerateRecipeOutput> {
  return generateRecipeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRecipePrompt',
  input: {schema: GenerateRecipeInputSchema},
  output: {schema: GenerateRecipeOutputSchema},
  prompt: `You are a world-class chef. A user wants to cook "{{recipeName}}".

  Generate a full recipe for "{{recipeName}}" using only the following available ingredients. You can assume basic pantry items like oil, salt, and pepper are available.

  Available Ingredients: {{#each ingredients}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  Dietary Restrictions: {{{dietaryRestrictions}}}

  The generated recipe should include:
  1. The exact recipe name: "{{recipeName}}".
  2. A list of ingredients with quantities, using only the available ingredients.
  3. Clear, numbered, step-by-step instructions.
  4. If possible, nutritional information.

  Respond in the requested JSON format.
`,
});

const generateRecipeFlow = ai.defineFlow(
  {
    name: 'generateRecipeFlow',
    inputSchema: GenerateRecipeInputSchema,
    outputSchema: GenerateRecipeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output) {
      output.recipeName = input.recipeName;
    }
    return output!;
  }
);
