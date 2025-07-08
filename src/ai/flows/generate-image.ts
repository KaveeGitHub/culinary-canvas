'use server';
/**
 * @fileOverview Generates an image for a recipe.
 *
 * - generateImage - A function that handles the image generation process.
 * - GenerateImageInput - The input type for the generateImage function.
 * - GenerateImageOutput - The return type for the generateImage function.
 */

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';

const GenerateImageInputSchema = z.object({
  recipeName: z.string().describe('The name of the recipe to generate an image for.'),
});
export type GenerateImageInput = z.infer<typeof GenerateImageInputSchema>;

const GenerateImageOutputSchema = z.object({
  imageUrl: z
    .string()
    .optional()
    .describe(
      "The generated image as a data URI. Expected format: 'data:image/png;base64,<encoded_data>'."
    ),
});
export type GenerateImageOutput = z.infer<typeof GenerateImageOutputSchema>;

export async function generateImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
  return generateImageFlow(input);
}

const generateImageFlow = ai.defineFlow(
  {
    name: 'generateImageFlow',
    inputSchema: GenerateImageInputSchema,
    outputSchema: GenerateImageOutputSchema,
  },
  async ({recipeName}) => {
    try {
      const {media} = await ai.generate({
        model: googleAI.model('gemini-2.0-flash-preview-image-generation'),
        prompt: `A professional, photorealistic photograph of a finished dish of "${recipeName}".`,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          safetySettings: [
            {category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE'},
            {category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE'},
            {category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE'},
            {category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE'},
          ],
        },
      });

      if (!media?.url) {
        return {imageUrl: undefined};
      }

      return {imageUrl: media.url};
    } catch (error) {
      console.error('Image generation failed:', error);
      // Fail gracefully by returning undefined, preventing a crash.
      return {imageUrl: undefined};
    }
  }
);
