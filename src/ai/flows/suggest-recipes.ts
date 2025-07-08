// src/ai/flows/suggest-recipes.ts
'use server';
/**
 * @fileOverview Suggests recipes based on available ingredients.
 *
 * - suggestRecipes - Suggests 5-10 recipe ideas.
 * - SuggestRecipesInput - The input type for the suggestRecipes function.
 * - SuggestRecipesOutput - The return type for the suggestRecipes function.
 * - RecipeSuggestion - The type for a single recipe suggestion.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRecipesInputSchema = z.object({
  ingredients: z.array(z.string()).describe('A list of ingredients available.'),
  dietaryRestrictions: z.string().describe('Any dietary restrictions to consider.'),
  preferredCuisines: z.string().describe('The preferred cuisines for the recipe.'),
});
export type SuggestRecipesInput = z.infer<typeof SuggestRecipesInputSchema>;

const RecipeSuggestionSchema = z.object({
  recipeName: z.string().describe('The name of the recipe suggestion.'),
  description: z.string().describe('A short, enticing description of the recipe.'),
});
export type RecipeSuggestion = z.infer<typeof RecipeSuggestionSchema>;

const SuggestRecipesOutputSchema = z.object({
  recipes: z.array(RecipeSuggestionSchema).describe('An array of 5 to 10 recipe suggestions.'),
});
export type SuggestRecipesOutput = z.infer<typeof SuggestRecipesOutputSchema>;

export async function suggestRecipes(input: SuggestRecipesInput): Promise<SuggestRecipesOutput> {
  return suggestRecipesFlow(input);
}

const suggestRecipesFlow = ai.defineFlow(
  {
    name: 'suggestRecipesFlow',
    inputSchema: SuggestRecipesInputSchema,
    outputSchema: SuggestRecipesOutputSchema,
  },
  async input => {
    const {output} = await ai.generate({
      prompt: `You are a creative chef who inspires people to cook with what they have.
  
      Based on the following ingredients, suggest 5-10 diverse and interesting recipes that can be made *only* with the provided ingredients (plus basic pantry items like oil, salt, pepper, water). For each recipe, provide a name and a short (1-2 sentence) description.
    
      Available Ingredients: ${input.ingredients.join(', ')}
      Dietary Restrictions: ${input.dietaryRestrictions || 'None'}
      Preferred Cuisines: ${input.preferredCuisines || 'Any'}
    
      Make sure the recipe names are distinct and sound appetizing.
      Return the result in the requested JSON format.
    `,
      output: {
        schema: SuggestRecipesOutputSchema,
      },
    });

    return output!;
  }
);
