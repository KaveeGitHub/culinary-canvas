// src/ai/schemas.ts
/**
 * @fileOverview This file contains all the Zod schemas and TypeScript types for the AI flows.
 * By centralizing schemas here, we avoid "use server" violations in our flow files.
 */
import {z} from 'genkit';

// From detect-food.ts
export const DetectFoodInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo from the webcam feed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DetectFoodInput = z.infer<typeof DetectFoodInputSchema>;

export const DetectFoodOutputSchema = z.object({
  foodItems: z.array(z.string()).describe('A list of food items detected in the image.'),
});
export type DetectFoodOutput = z.infer<typeof DetectFoodOutputSchema>;


// From suggest-recipes.ts
export const SuggestRecipesInputSchema = z.object({
  ingredients: z.array(z.string()).describe('A list of ingredients available.'),
  dietaryRestrictions: z.string().describe('Any dietary restrictions to consider.'),
  preferredCuisines: z.string().describe('The preferred cuisines for the recipe.'),
});
export type SuggestRecipesInput = z.infer<typeof SuggestRecipesInputSchema>;

export const RecipeSuggestionSchema = z.object({
  recipeName: z.string().describe('The name of the recipe suggestion.'),
  description: z.string().describe('A short, enticing description of the recipe.'),
});
export type RecipeSuggestion = z.infer<typeof RecipeSuggestionSchema>;

export const SuggestRecipesOutputSchema = z.object({
  recipes: z.array(RecipeSuggestionSchema).describe('An array of 5 to 10 recipe suggestions.'),
});
export type SuggestRecipesOutput = z.infer<typeof SuggestRecipesOutputSchema>;


// From generate-recipe.ts
export const GenerateRecipeInputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe to generate.'),
  ingredients: z.array(z.string()).describe('A list of ingredients available to use in the recipe.'),
  dietaryRestrictions: z.string().describe('Any dietary restrictions the recipe should adhere to.'),
});
export type GenerateRecipeInput = z.infer<typeof GenerateRecipeInputSchema>;

export const GenerateRecipeOutputSchema = z.object({
  recipeName: z.string().describe('The name of the generated recipe.'),
  ingredients: z.array(z.string()).describe('A list of ingredients required for the recipe.'),
  instructions: z.array(z.string()).describe('Step-by-step instructions for preparing the recipe.'),
  nutritionalInformation: z.string().optional().describe('Nutritional information for the recipe, if available.'),
});
export type GenerateRecipeOutput = z.infer<typeof GenerateRecipeOutputSchema>;


// From generate-image.ts
export const GenerateImageInputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe to generate an image for.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

export const GenerateImageOutputSchema = z.object({
  imageUrl: z
    .string()
    .optional()
    .describe(
      "The generated image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."
    ),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;


// From generate-steps.ts
export const GenerateStepsInputSchema = z.object({
  recipe: z.string().describe('The recipe to generate step-by-step instructions from.'),
});
export type GenerateStepsInput = z.infer<typeof GenerateStepsInputSchema>;

export const GenerateStepsOutputSchema = z.object({
  steps: z.string().describe('The step-by-step instructions for the recipe.'),
});
export type GenerateStepsOutput = z.infer<typeof GenerateStepsOutputSchema>;


// From ask-chef.ts
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const AskChefInputSchema = z.object({
  recipe: GenerateRecipeOutputSchema.describe('The full recipe object that the user is asking about.'),
  question: z.string().describe("The user's most recent question about the recipe."),
  history: z.array(ChatMessageSchema).optional().describe('The previous conversation history.'),
});
export type AskChefInput = z.infer<typeof AskChefInputSchema>;

export const AskChefOutputSchema = z.object({
  answer: z.string().describe("The AI chef's answer to the user's question."),
});
export type AskChefOutput = z.infer<typeof AskChefOutputSchema>;
