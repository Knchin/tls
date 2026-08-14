import { z } from "zod";

import { isValidDateString } from "@/utils/dates";

export const MAX_MONITORING_ACTIVE = 5;
export const MAX_MONITORING_TOTAL = 20;
export const MIN_CHECK_INTERVAL_MINUTES = 5;
export const MAX_CHECK_INTERVAL_MINUTES = 60 * 24;

export const emailSchema = z.string().trim().email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(200, "Password must be at most 200 characters");

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    fullName: z.string().trim().min(1, "Full name is required").max(100),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const dateField = z
  .string()
  .refine(isValidDateString, { message: "Enter a valid date (YYYY-MM-DD)" })
  .optional()
  .nullable();

export const monitoringCreateSchema = z
  .object({
    country: z.string().trim().min(2).max(10).default("TN"),
    destination: z.string().trim().min(2).max(20),
    centre: z.string().trim().min(2).max(20),
    visaCategory: z.string().trim().min(2).max(50),
    earliestDate: dateField,
    latestDate: dateField,
    checkIntervalMinutes: z
      .number()
      .int()
      .min(MIN_CHECK_INTERVAL_MINUTES)
      .max(MAX_CHECK_INTERVAL_MINUTES)
      .default(MIN_CHECK_INTERVAL_MINUTES),
  })
  .refine(
    (data) =>
      !data.earliestDate || !data.latestDate || data.earliestDate <= data.latestDate,
    {
      message: "Earliest date must be on or before the latest date",
      path: ["latestDate"],
    }
  );

export const monitoringUpdateSchema = z
  .object({
    centre: z.string().trim().min(2).max(20).optional(),
    visaCategory: z.string().trim().min(2).max(50).optional(),
    destination: z.string().trim().min(2).max(20).optional(),
    earliestDate: dateField,
    latestDate: dateField,
    checkIntervalMinutes: z
      .number()
      .int()
      .min(MIN_CHECK_INTERVAL_MINUTES)
      .max(MAX_CHECK_INTERVAL_MINUTES)
      .optional(),
  })
  .refine(
    (data) =>
      !data.earliestDate || !data.latestDate || data.earliestDate <= data.latestDate,
    {
      message: "Earliest date must be on or before the latest date",
      path: ["latestDate"],
    }
  );

export const notificationPreferencesSchema = z.object({
  emailEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(false),
});

export type MonitoringCreateInput = z.infer<typeof monitoringCreateSchema>;
export type MonitoringUpdateInput = z.infer<typeof monitoringUpdateSchema>;
