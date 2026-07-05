import { defineCollection, z } from 'astro:content';
import { biasLoader } from './loaders/biases';

const CATEGORIES = ['суждение', 'память', 'само', 'социальное', 'внимание', 'вероятность'] as const;

const biases = defineCollection({
  loader: biasLoader(),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z.enum(CATEGORIES),
    aliases: z.array(z.string()).default([]),
    date: z.string().optional(),
  }),
});

export const collections = { biases };
export { CATEGORIES };
