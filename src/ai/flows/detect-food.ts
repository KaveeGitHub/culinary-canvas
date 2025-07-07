// src/ai/flows/detect-food.ts
'use server';
/**
 * @fileOverview This file defines a Genkit flow for detecting food items from a webcam feed.
 *
 * - detectFood - Detects ingredients and food items from a live webcam feed using AI.
 * - DetectFoodInput - The input type for the detectFood function.
 * - DetectFoodOutput - The return type for the detectFood function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DetectFoodInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo from the webcam feed, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type DetectFoodInput = z.infer<typeof DetectFoodInputSchema>;

const DetectFoodOutputSchema = z.object({
  foodItems: z.array(z.string()).describe('A list of food items detected in the image.'),
});
export type DetectFoodOutput = z.infer<typeof DetectFoodOutputSchema>;

export async function detectFood(input: DetectFoodInput): Promise<DetectFoodOutput> {
  return detectFoodFlow(input);
}

const prompt = ai.definePrompt({
  name: 'detectFoodPrompt',
  input: {schema: DetectFoodInputSchema},
  output: {schema: DetectFoodOutputSchema},
  prompt: `You are an AI vision model that specializes in food recognition.

  Analyze the image provided and identify all food items present.  Return a list of food items detected in the image.
  Respond with ONLY the detected food items as a JSON array.

  Image: {{media url=photoDataUri}}`,
});

const detectFoodFlow = ai.defineFlow(
  {
    name: 'detectFoodFlow',
    inputSchema: DetectFoodInputSchema,
    outputSchema: DetectFoodOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
