import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generatePhoto } from "@/inngest/functions/generate-photo";
import { generateDemo } from "@/inngest/functions/generate-demo";

export const maxDuration = 120;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generatePhoto, generateDemo],
});
