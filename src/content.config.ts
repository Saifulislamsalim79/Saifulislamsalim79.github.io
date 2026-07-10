import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { publicationsSchema, eventsSchema } from './content/schemas';

const publications = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/publications' }),
  schema: publicationsSchema,
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: eventsSchema,
});

export const collections = { publications, events };
