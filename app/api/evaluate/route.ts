import { ChatGroq } from "@langchain/groq";
import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { EvaluationResponse } from "@/lib/types";
import { fetchAirportWeather } from "@/lib/weather";

const requestSchema = z.object({
  departure: z.string().trim().length(4),
  arrival: z.string().trim().length(4),
  altitude: z.coerce.number().int().positive().max(60000),
});

const evaluationSchema = z.object({
  status: z.enum(["APPROVED", "MARGINAL", "REJECTED"]),
  weather_summary: z.string().min(1),
  cfi_feedback: z.string().min(1),
});

const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

const systemPrompt = `You are Shadow CFI, an FAA-minded flight examiner and safety-focused certified flight instructor.

Your job is to review a proposed flight between two airports using the supplied METAR and TAF information.

Operating rules:
- Be conservative and safety-first.
- Treat missing weather data as a material risk and mention it clearly.
- Evaluate the proposed route and altitude for weather, visibility, ceilings, wind, convective risk, and forecast deterioration.
- Consider whether the requested altitude is unrealistic or unsafe for a short route or the conditions presented.
- Point out likely FAA or practical safety concerns in plain English.
- Use a Socratic instructor tone: teach, question assumptions, and explain why.
- Do not invent regulations or weather not present in the input.

Return strict JSON matching this schema exactly:
{
  "status": "APPROVED" | "MARGINAL" | "REJECTED",
  "weather_summary": "short plain-English summary",
  "cfi_feedback": "instructor-style safety analysis"
}`;

function formatWeatherContext(
  departure: Awaited<ReturnType<typeof fetchAirportWeather>>,
  arrival: Awaited<ReturnType<typeof fetchAirportWeather>>,
  altitude: number,
) {
  return JSON.stringify(
    {
      route: {
        departure: departure.icao,
        arrival: arrival.icao,
        planned_altitude_ft: altitude,
      },
      weather: {
        departure,
        arrival,
      },
    },
    null,
    2,
  );
}

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return Response.json(
        { error: "Missing GROQ_API_KEY in environment variables." },
        { status: 500 },
      );
    }

    const body = await request.json();
    const parsedRequest = requestSchema.safeParse(body);

    if (!parsedRequest.success) {
      return Response.json(
        {
          error: "Invalid request payload.",
          details: parsedRequest.error.flatten(),
        },
        { status: 400 },
      );
    }

    const departureIcao = parsedRequest.data.departure.toUpperCase();
    const arrivalIcao = parsedRequest.data.arrival.toUpperCase();
    const altitude = parsedRequest.data.altitude;

    const [departureWeather, arrivalWeather] = await Promise.all([
      fetchAirportWeather(departureIcao),
      fetchAirportWeather(arrivalIcao),
    ]);

    const model = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: GROQ_MODEL,
      temperature: 0.2,
    });

    const structuredModel = model.withStructuredOutput(evaluationSchema, {
      name: "shadow_cfi_evaluation",
    });

    const evaluation = await structuredModel.invoke([
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: `Evaluate this flight plan and return only the required JSON.\n\n${formatWeatherContext(
          departureWeather,
          arrivalWeather,
          altitude,
        )}`,
      },
    ]);

    let savedToLog = false;
    const authHeader = request.headers.get("authorization");
    const accessToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : undefined;

    if (accessToken) {
      const supabase = getSupabaseServerClient(accessToken);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(`Supabase auth failed: ${userError.message}`);
      }

      if (user) {
        const { error: insertError } = await supabase.from("flight_logs").insert({
          user_id: user.id,
          departure_icao: departureIcao,
          arrival_icao: arrivalIcao,
          planned_altitude: altitude,
          raw_weather_data: {
            departure: departureWeather,
            arrival: arrivalWeather,
          },
          ai_evaluation_report: JSON.stringify(evaluation),
        });

        if (insertError) {
          throw new Error(`Flight log save failed: ${insertError.message}`);
        }

        savedToLog = true;
      }
    }

    const responseBody: EvaluationResponse = {
      departure: departureIcao,
      arrival: arrivalIcao,
      altitude,
      weather: {
        departure: departureWeather,
        arrival: arrivalWeather,
      },
      evaluation,
      saved_to_log: savedToLog,
    };

    return Response.json(responseBody, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return Response.json(
      {
        error: "Unable to evaluate flight plan.",
        details: message,
      },
      { status: 500 },
    );
  }
}
