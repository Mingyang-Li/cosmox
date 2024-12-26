import { z } from 'zod';

// ===== QueryMode =====
export const QueryModeSchema = z.enum(['SENSITIVE', 'INSENSITIVE']);
export type QueryMode = z.infer<typeof QueryModeSchema>;

// ===== StringFilter =====
export const StringFilterSchema = z
  .object({
    equals: z.string().optional(),
    contains: z.string().optional(),
    startsWith: z.string().optional(),
    endsWith: z.string().optional(),
    not: z.string().optional(),
    notIn: z.array(z.string()).optional(),
    mode: QueryModeSchema.optional(),
  })
  .strict();
export type StringFilter = z.infer<typeof StringFilterSchema>;
export const isStringFilter = (args: unknown): args is StringFilter => {
  return StringFilterSchema.safeParse(args).success;
};

// ===== BooleanFilter =====
export const BooleanFilterSchema = z
  .object({
    equals: z.boolean().optional(),
    not: z.boolean().optional(),
  })
  .strict();
export type BooleanFilter = z.infer<typeof BooleanFilterSchema>;
export const isBooleanFilter = (args: unknown): args is BooleanFilter => {
  return BooleanFilterSchema.safeParse(args).success;
};

// ===== NumberFilter =====
export const NumberFilterSchema = z
  .object({
    equals: z.number().optional(),
    in: z.array(z.number()).optional(),
    notIn: z.array(z.number()).optional(),
    lt: z.number().optional(),
    lte: z.number().optional(),
    gt: z.number().optional(),
    gte: z.number().optional(),
    not: z.number().optional(),
  })
  .strict();
export type NumberFilter = z.infer<typeof NumberFilterSchema>;
export const isNumberFilter = (args: unknown): args is NumberFilter => {
  return NumberFilterSchema.safeParse(args).success;
};

// ===== DateFilter =====
export const DateFilterSchema = z
  .object({
    equals: z.date().optional(),
    in: z.array(z.date()).optional(),
    notIn: z.array(z.date()).optional(),
    lt: z.date().optional(),
    lte: z.date().optional(),
    gt: z.date().optional(),
    gte: z.date().optional(),
    not: z.date().optional(),
  })
  .strict();
export type DateFilter = z.infer<typeof DateFilterSchema>;
export const isDateFilter = (args: unknown): args is DateFilter => {
  return DateFilterSchema.safeParse(args).success;
};
