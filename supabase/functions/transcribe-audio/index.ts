import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

serve(async req => {
  try {
    const { audio } = await req.json();
    if (!audio) throw new Error("no audio");

    const binary = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    const resp = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-3&smart_format=true",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${Deno.env.get("DEEPGRAM_API_KEY")}`,
          "Content-Type": "audio/webm"
        },
        body: binary
      }
    );

    if (!resp.ok) {
      return new Response(
        JSON.stringify({ error: await resp.text() }),
        { status: resp.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const dg = await resp.json();
    const text =
      dg?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || "";

    return new Response(JSON.stringify({ text }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});