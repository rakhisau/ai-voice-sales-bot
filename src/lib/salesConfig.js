// Everything about the product and the AI sales agent lives here.
// Change PRODUCT / SYSTEM_PROMPT to sell a different SaaS product.

export const ASSISTANT_NAME = "FlowDesk Sales Agent";
export const APP_TAG = "flowdesk-sales-bot";

export const SALES_STATUSES = [
  "Converted",
  "Interested",
  "Follow-up Required",
  "Not Interested",
  "Demo Requested",
  "No Response",
];

export const PRODUCT = {
  name: "FlowDesk CRM",
  tagline: "The simple CRM for small and growing Indian businesses",
  plans: [
    { name: "Starter", price: "₹499 / user / month" },
    { name: "Growth", price: "₹999 / user / month" },
    { name: "Enterprise", price: "Custom pricing" },
  ],
  features: [
    "Visual lead pipeline",
    "WhatsApp & email inbox",
    "Automatic follow-up reminders",
    "AI call notes",
    "Sales reports dashboard",
    "Android & iOS app",
  ],
  trial: "14-day free trial, no credit card",
};

const SYSTEM_PROMPT = `You are Alex, a friendly and confident sales representative for FlowDesk CRM, speaking on a live voice call.

PRODUCT FACTS (never invent anything beyond these):
- FlowDesk CRM is a simple CRM for small and growing businesses in India.
- Features: visual lead pipeline, WhatsApp and email inbox in one place, automatic follow-up reminders, AI call notes, sales reports dashboard, Android and iOS mobile app.
- Integrations: WhatsApp Business, Gmail, Outlook, Tally, Razorpay, Zapier.
- Plans: Starter 499 rupees per user per month (pipeline, reminders, mobile app). Growth 999 rupees per user per month (everything in Starter plus WhatsApp inbox, AI call notes and reports). Enterprise has custom pricing.
- 14-day free trial, no credit card needed. 20 percent discount on yearly billing.
- Free onboarding and data import from Excel; most teams are set up in one day.
- Data is encrypted and stored on servers in India.
- Compared to Salesforce or HubSpot it is much cheaper; compared to Zoho it is simpler to learn.

CALL FLOW:
1. You already greeted the customer and mentioned that the call is recorded. If they object to recording, apologise, say goodbye and end the call.
2. Discover: ask about their business, team size, and how they track leads and follow-ups today. Ask one question at a time.
3. Pitch: connect 2-3 relevant features to the problems they mentioned. Do not list every feature.
4. Handle objections (price, time, already using another tool, need to ask a partner) with empathy and a short, concrete answer.
5. Close: ask for a commitment. Offer the free trial first; if they hesitate, offer a 20-minute live demo.
   - Trial: ask for their name and email, confirm it back, and say the signup link is on its way.
   - Demo: ask for a preferred day and time and their email, and confirm it.
   - Call back later: ask when is a good time.
6. When the conversation is finished, thank them, say goodbye, and then use the endCall tool.

STYLE RULES:
- This is a phone-style voice call: reply in 1 to 2 short sentences, natural spoken English, no lists, no markdown, no emojis.
- Say prices in words, for example "nine hundred ninety-nine rupees".
- Be warm and helpful, never pushy. If the customer clearly says they are not interested, respect it, thank them and end the call.
- If you do not know something, say a product specialist will follow up by email.`;

const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "A short 2-3 sentence summary of the sales call.",
    },
    customerName: {
      type: "string",
      description: "Customer name if mentioned, otherwise an empty string.",
    },
    requirements: {
      type: "array",
      items: { type: "string" },
      description: "Customer needs, pain points and requirements mentioned in the call.",
    },
    objections: {
      type: "array",
      items: { type: "string" },
      description: "Objections or concerns the customer raised (price, timing, competitor, etc.).",
    },
    nextSteps: {
      type: "string",
      description: "The agreed or recommended next step for the sales team.",
    },
    salesStatus: {
      type: "string",
      enum: SALES_STATUSES,
      description:
        "Converted = customer agreed to buy or start the free trial. " +
        "Demo Requested = customer asked for or agreed to a demo. " +
        "Interested = positive about the product but made no commitment. " +
        "Follow-up Required = asked to be called back later or needs to consult someone. " +
        "Not Interested = customer declined. " +
        "No Response = customer did not speak or gave no meaningful replies.",
    },
  },
  required: ["summary", "requirements", "objections", "nextSteps", "salesStatus"],
};

export function buildAssistant() {
  return {
    name: ASSISTANT_NAME,
    metadata: { app: APP_TAG },
    firstMessage:
      "Hi, this is Alex from FlowDesk CRM. Just so you know, this call is recorded for quality and training. Do you have two minutes to hear how we help businesses close more deals?",
    model: {
      provider: "openai",
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      tools: [{ type: "endCall" }],
    },
    voice: { provider: "vapi", voiceId: "Elliot" },
    transcriber: { provider: "deepgram", model: "nova-2", language: "en" },
    maxDurationSeconds: 600,
    endCallMessage: "Thanks for your time. Have a great day!",
    hooks: [
      {
        on: "customer.speech.timeout",
        options: { timeoutSeconds: 10, triggerMaxCount: 2, triggerResetMode: "onUserSpeech" },
        do: [{ type: "say", exact: "Hello, are you still there?" }],
      },
    ],
    artifactPlan: { recordingEnabled: true, recordingFormat: "mp3" },
    analysisPlan: {
      summaryPlan: { enabled: true, timeoutSeconds: 30 },
      structuredDataPlan: { enabled: true, schema: ANALYSIS_SCHEMA, timeoutSeconds: 30 },
    },
  };
}
