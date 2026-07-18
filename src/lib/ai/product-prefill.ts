import { generateObject } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai/provider";

const prefillSchema = z.object({
  name: z.string().describe("A concise product/company name, taken from the page — don't invent one."),
  description: z
    .string()
    .describe(
      "1-3 sentences on the product's core value proposition, written in the founder's voice " +
        '(e.g. "We build..."), ready to paste directly into an onboarding form.'
    ),
  targetCustomer: z
    .string()
    .describe('Who the product is actually for, e.g. "Backend engineers at early-stage startups".'),
});

export interface ProductPrefill {
  name: string;
  description: string;
  targetCustomer: string;
}

export async function extractProductFromPageText({
  url,
  pageTitle,
  pageText,
}: {
  url: string;
  pageTitle: string;
  pageText: string;
}): Promise<ProductPrefill> {
  const { object } = await generateObject({
    model: getModel("websitePrefill"),
    schema: prefillSchema,
    prompt: [
      "A founder is onboarding to Getrive and gave this URL for their product's website:",
      url,
      pageTitle ? `Page title: ${pageTitle}` : null,
      "",
      "Scraped page content (may include nav/footer/legal noise — ignore anything that isn't actually",
      "about the product):",
      pageText,
      "",
      "Extract the product name, a concise description of its core value proposition, and who its",
      "target customer actually is. If the page doesn't give enough to infer one of these confidently,",
      "make your best reasonable guess from context rather than leaving it generic.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  return object;
}
