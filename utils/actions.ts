"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const openai = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const CalendarEvent = z.object({
  facts: z.array(
    z.object({
      role: z.enum(["Doctor", "Patient"]),
      fact: z.string(),
      verbatimSentenceUsed: z.string(),
    })
  ),
});
/**
 * Converts a ReadableStream to a Buffer.
 * @param {ReadableStream} stream The input stream.
 * @returns {Promise<Buffer>} A promise that resolves with the Buffer.
 */
async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function transcribeAudio(previousState, formData) {
  console.log("it comes here");
  const audioFile = formData.get("audio");

  if (!audioFile || audioFile.size === 0) {
    return {
      message: "Please provide an audio file.",
      transcription: "",
    };
  }

  try {
    // Convert the file to a buffer and then to a base64 string
    const audioBuffer = await streamToBuffer(audioFile.stream());
    const audioBase64 = audioBuffer.toString("base64");

    // Get the generative model
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

    // The prompt to guide the AI for transcription and speaker labeling
    const prompt = `
      Please transcribe the following audio conversation between a doctor and a patient.
      Transcribe the entire conversation in English, maintaining 100% fidelity.
      It is critical to label the speakers accurately as "doctor:" and "patient:".
      The output should be a continuous dialogue script.
    `;

    const audioPart = {
      inlineData: {
        data: audioBase64,
        mimeType: audioFile.type,
      },
    };

    const result = await model.generateContent([prompt, audioPart]);
    const response = await result.response;
    const transcription = response.text();
    console.log(transcription);
    return {
      message: "Transcription successful.",
      transcription: transcription,
    };
  } catch (error) {
    console.error(error);
    return {
      message: "An error occurred during transcription.",
      transcription: "",
    };
  }
}

export async function pullAllTheFacts(previousInput, formData) {
  const transcript = formData.get("transcript");
  const prompt = `You are an information-extraction assistant. Extract every concrete fact stated in the labeled transcript between a Doctor and a Patient, and return ONLY a single valid JSON object matching the exact structure below. Do not include any commentary or formatting outside the JSON.

Output JSON structure (use these exact keys and values):
{
  "facts": [
    {
      "role": "Doctor" or "Patient",
      "fact": "Paraphrase of the single fact, concise and unambiguous.",
      "verabtimSentenceUsed": "Exact verbatim sentence quoted from the speaker that supports this fact."
    }
  ]
}

Strict instructions:
- role must be exactly "Doctor" or "Patient" matching the labeled speaker on the quoted sentence.
- verabtimSentenceUsed must be one single sentence copied verbatim from the transcript (preserve original wording, punctuation, typos, units, and negations).
- fact must be a concise paraphrase of exactly one fact supported by that quoted sentence. Include negations (e.g., “denies fever”) and key details (who, what, when, how much).
- Split multi-fact sentences into multiple items, each with the same verbatim sentence but different fact paraphrases.
- Include facts such as: symptoms, onset/duration/frequency/severity, relevant negatives (denies X), medications and doses, allergies, past history, habits, exam findings, vitals, labs/imaging, diagnoses, assessments, recommendations/plans, instructions, follow-up, referrals, risks/benefits, consents, and scheduling details.
- Exclude greetings, small talk, empathy, fillers, clarifying repeats, and pure questions unless the question itself asserts a fact (e.g., “You said it started yesterday?” does not count; “Let’s start you on amoxicillin” does).
- Do not infer or hallucinate beyond what’s stated. If uncertain or conditional, capture it as stated (e.g., “Doctor suspects strep”).
- Deduplicate exact repeats by the same role; if the same fact is asserted by both Doctor and Patient, include both (once per role).
- Preserve the conversation order in the facts array.
- If there are no facts, return {"facts": []}.
- Return valid JSON only: double quotes, no trailing commas, UTF-8.

Transcript:
${transcript}`;

  const promptForReport = `You are an expert clinical scribe and patient-education writer. You will read a labeled doctor–patient transcript and produce a comprehensive, patient-friendly visit report. The transcript lines are labeled (e.g., “Doctor:” and “Patient:”). Use only information present in the transcript. Do not guess or add outside facts. If something is not mentioned, write “Not discussed” or “Not specified.” Use clear, plain language (about an 8th-grade reading level). Spell out abbreviations on first use. Quote the patient when helpful. Be concise but complete.

Your tasks:
1) Extract and organize:
- Patient’s own statements: symptoms, timeline, severity, aggravating/relieving factors, prior treatments, medication adherence, allergies, relevant past medical/surgical history, social history (smoking, alcohol, sleep, diet, exercise), family history, goals/concerns.
- Key Q&A: Map important question-and-answer exchanges between doctor and patient into concise pairs.
- Assessment: Diagnoses (confirmed, suspected, or ruled out), clinical reasoning if discussed, severity, differentials, and any uncertainties.
- Plan:
  - Medications (name, dose, form, route, frequency, duration, purpose, special instructions, cautions).
  - Non-drug recommendations (diet, activity, sleep, stress, home care).
  - Tests and imaging (names, purpose, timing, preparation, fasting requirements).
  - Procedures or vaccinations.
  - Referrals or consults (to whom and why).
  - Follow-up plans (timeframe, scheduled date/time/provider if available).
  - Patient education provided, risks/benefits/alternatives discussed, and red-flag/return precautions.
- Logistics: Pharmacy, lab, or appointment details if explicitly mentioned.
- Contradictions: Note if the transcript contains conflicting information.

2) Output format and order:
- Start with the two sections below, then include Parts 1–4 exactly with these headings. If a subsection does not apply, write “Not discussed.”. **The output should be in markdown**

Section: What You Told Us (in your words)
- Key statements you made:
  - “...” (quote brief, important patient statements)
- Summary of your concerns and history (concise bullets):
  - Main symptoms and timeline
  - Severity and impact on daily life
  - Relevant past history, medications, allergies
  - Goals or worries expressed

Section: Key Questions & Answers
- Q: [Doctor’s question in plain language]
  A: [Patient’s answer]
- Q: [...]
  A: [...]

Part 1: Your Visit Summary at a Glance
This is a brief overview of our conversation. More details are in the sections below.
DIAGNOSIS: [Confirmed diagnosis or “Working diagnosis(es)” if not finalized]
ACTION PLAN: [Top 2–4 actions the patient will take]
NEXT STEPS: [Immediate next steps and timeframe]

Part 2: Our Assessment (What We Found)
Diagnosis: [Each condition, one by one if multiple]
What This Means for You (in simple terms):
- [Plain-language explanation of the condition’s significance and how it relates to the patient’s symptoms]
Other Considerations:
- Severity/Red flags discussed: [If any]
- Differential diagnoses under consideration: [If any]
- Rationale (if discussed): [Brief summary of reasoning]

Part 3: Your Action Plan (What You Need to Do)
A. Prescribed Medication
- Medication: [Generic (Brand if mentioned)]
  Purpose: [Why it’s prescribed]
  Instructions: [Dose, route, frequency, timing, duration]
  Special Notes: [Take with food/avoid alcohol/interactions/monitoring, pregnancy/breastfeeding notes, cautions, start/stop dates]
[Repeat for each medication]

B. Lifestyle and Self-Care Recommendations
DIET:
- [Specific, actionable diet guidance tied to the condition(s)]
ACTIVITY & LIFESTYLE:
- [Exercise/activity, sleep, sun exposure, ergonomics, stress reduction]
OTHER HOME CARE:
- [Home monitoring (e.g., BP, glucose), symptom diary, supportive measures]
EDUCATION:
- [Key counseling points, risks/benefits/alternatives if discussed]
WHEN TO SEEK HELP:
- [Clear red-flag symptoms and where to go (urgent care/ER)]

Part 4: What Happens Next
Lab Tests Ordered:
- Test: [Name and purpose]
  Instructions: [Timing, fasting/prep, location if stated]
Procedures/Imaging:
- [Name, purpose, prep, timing]
Referrals:
- [Specialist/service and reason]
Your Next Appointment:
- Purpose: [Follow-up reason]
- When: [Date/time if scheduled, or timeframe if not]
- With: [Clinician name/title if stated]
- Notes: [Any prep or items to bring]
Administrative/Logistics:
- [Pharmacy/lab/location details if mentioned; portal messages; work/school notes]

Rules and style:
- Do not fabricate information. If missing, write “Not discussed” or “Not specified.”
- Use the exact section titles and order shown above.
- If multiple diagnoses or medications, list each clearly and separately.
- Normalize medication instructions into patient-friendly steps (dose, timing, duration).
- Use consistent units and plain terms; define medical jargon briefly if it appears in the transcript.
- If the transcript contains conflicting information, note it briefly under “Other Considerations” or “Administrative/Logistics.”
- End with this one-line note: “This summary reflects what we discussed today; contact your clinic or seek urgent care if symptoms worsen or new red-flag symptoms appear.”

Transcript:
${transcript}`;
  const response = openai.chat.completions.parse({
    model: "gemini-2.5-pro",
    messages: [{ role: "user", content: prompt }],
    response_format: zodResponseFormat(CalendarEvent, "event"),
  });
  const response2 = openai.chat.completions.create({
    model: "gemini-2.5-pro",
    messages: [{ role: "user", content: promptForReport }],
  });

  const [factData, report] = await Promise.all([response, response2]);
  const event = factData.choices[0].message.parsed;
  console.log(event);
  return {
    factData: event,
    report: report.choices[0].message.content,
  };
}
