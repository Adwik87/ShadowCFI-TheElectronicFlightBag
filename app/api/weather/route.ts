import { z } from "zod";

import { fetchAirportWeather } from "@/lib/weather";

const querySchema = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((airport) => airport.trim().toUpperCase())
      .filter(Boolean),
  )
  .refine((items) => items.length > 0 && items.length <= 6, {
    message: "Provide between 1 and 6 ICAO identifiers.",
  })
  .refine((items) => items.every((item) => item.length === 4), {
    message: "Each ICAO code must be exactly 4 characters.",
  });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse(searchParams.get("airports") ?? "");

    if (!parsed.success) {
      return Response.json(
        { error: "Invalid airport query.", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const airports = await Promise.all(
      parsed.data.map((airport) => fetchAirportWeather(airport)),
    );

    return Response.json({ airports });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected weather lookup failure.";

    return Response.json(
      { error: "Unable to fetch airport weather.", details: message },
      { status: 500 },
    );
  }
}
