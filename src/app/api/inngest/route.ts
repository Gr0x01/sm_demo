import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { generatePhoto } from "@/inngest/functions/generate-photo";
import { generatePhotoMultipass } from "@/inngest/functions/generate-photo-multipass";
import { generateDemo } from "@/inngest/functions/generate-demo";
import { notifyPilotLead } from "@/inngest/functions/notify-pilot-lead";

export const maxDuration = 120;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generatePhoto, generatePhotoMultipass, generateDemo, notifyPilotLead],
});
