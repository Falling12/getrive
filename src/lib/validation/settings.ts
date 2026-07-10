import { z } from "zod";

function emptyToUndefined(value: unknown) {
  return value === "" ? undefined : value;
}

export const productDetailsSchema = z.object({
  name: z.string().trim().min(1, "Product name is required.").max(100),
  description: z
    .string()
    .trim()
    .min(20, "Give a bit more detail — at least a sentence or two.")
    .max(2000),
  targetCustomer: z.preprocess(emptyToUndefined, z.string().trim().max(300).optional()),
  websiteUrl: z.preprocess(
    emptyToUndefined,
    z.string().trim().url("Enter a valid URL, e.g. https://example.com").max(300).optional()
  ),
  signupGoal: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  currentSignupCount: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),
});

export type ProductDetailsInput = z.infer<typeof productDetailsSchema>;
