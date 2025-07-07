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
    const {media} = await ai.generate({
      model: googleAI.model('gemini-2.0-flash-preview-image-generation'),
      prompt: `A vibrant, photorealistic image of a freshly prepared "${recipeName}", beautifully plated and ready to eat. The lighting should be bright and natural, highlighting the textures and colors of the food. The background should be a clean, modern kitchen setting, slightly out of focus.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });

    if (!media?.url) {
      throw new Error('Image generation failed.');
    }

    return {imageUrl: media.url};
  }
);
