import { z } from 'zod';

export const isString = (args: unknown): args is string => {
  return z.string().safeParse(args).success;
};

export const isBoolean = (args: unknown): args is boolean => {
  return z.boolean().safeParse(args).success;
};
