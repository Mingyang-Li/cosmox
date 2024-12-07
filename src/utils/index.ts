import { z } from 'zod';

export const isString = (args: unknown): args is string => {
  return z.string().safeParse(args).success;
};

export const isNonEmptyString = (args: unknown): args is string => {
  return z.string().min(1).safeParse(args).success;
};

export const isBoolean = (args: unknown): args is boolean => {
  return z.boolean().safeParse(args).success;
};

export const isNumber = (args: unknown): args is Number => {
  return z.number().safeParse(args).success;
};

export const isDate = (args: unknown): args is Date => {
  return z.date().safeParse(args).success;
};

export const isUndefined = (args: unknown): args is undefined => {
  return args === undefined || typeof args === 'undefined';
};

export const isNull = (args: unknown): args is null => {
  return args === null;
};

export const isObject = (args: unknown): args is Record<string, unknown> => {
  return z.object({}).safeParse(args).success;
};

export const objectIsEmpty = (args: Record<string, unknown>): boolean => {
  return Object.keys(args).length === 0;
};

export const isEmptyArray = (args: unknown): args is [] => {
  return z.any().array().max(0).safeParse(args).success;
};
