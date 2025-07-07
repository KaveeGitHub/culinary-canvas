import { config } from 'dotenv';
config();

import '@/ai/flows/detect-food.ts';
import '@/ai/flows/suggest-recipes.ts';
import '@/ai/flows/generate-recipe.ts';
import '@/ai/flows/generate-steps.ts';
import '@/ai/flows/text-to-speech.ts';
import '@/ai/flows/generate-image.ts';
