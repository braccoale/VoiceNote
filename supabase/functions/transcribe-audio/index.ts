import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-function-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // ─── SECURITY: verifica il segreto condiviso ─────────────────────────────
    const functionSecret = Deno.env.get('FUNCTION_SECRET');
    if (functionSecret) {
      const clientSecret = req.headers.get('x-function-secret');
      if (clientSecret !== functionSecret) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { method } = req;
    if (method !== 'POST') throw new Error(`Method ${method} not allowed`);

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) throw new Error('No file uploaded');

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) throw new Error('Missing OPENAI_API_KEY');

    // 1. TRASCRIZIONE (Whisper)
    const openAIFormData = new FormData();
    openAIFormData.append('file', file);
    openAIFormData.append('model', 'whisper-1');
    openAIFormData.append('language', 'it');

    console.log("Transcribing...");
    const transResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: openAIFormData,
    });

    if (!transResponse.ok) {
      const err = await transResponse.text();
      throw new Error(`Whisper error (${transResponse.status}): ${err}`);
    }

    const transResult = await transResponse.json();
    const transcribedText: string = transResult.text;
    if (!transcribedText?.trim()) throw new Error('Trascrizione vuota. Riprova con audio più chiaro.');
    console.log("Originale:", transcribedText);

    // 2. FORMALIZZAZIONE TECNICA (GPT-4o)
    const currentDate = new Date().toLocaleDateString('it-IT', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Leggi template opzionale dal form
    const templateType = (formData.get('template') as string) ?? 'cantiere';
    const templateInstructions: Record<string, string> = {
      cantiere: 'giornale di cantiere (stile Perizia CTU)',
      sopralluogo: 'verbale di sopralluogo tecnico',
      verbale: 'verbale di riunione di cantiere',
      manutenzione: 'rapporto di manutenzione straordinaria',
    };
    const docStyle = templateInstructions[templateType] ?? templateInstructions.cantiere;

    const messages = [
      {
        role: "system",
        content: `Sei un Traduttore Tecnico-Legale specializzato in edilizia e costruzioni.
Il tuo compito è TRADURRE input gergali/dialettali in Italiano Burocratico Formale stile ${docStyle}.
Non riassumere: riscrivi tutto in forma elevata e tecnica.`,
      },
      {
        role: "user",
        content: `Esegui una traduzione formale del seguente testo.

INPUT (Linguaggio da cantiere grezzo):
"""
${transcribedText}
"""

ISTRUZIONI:
1. Usa solo terminologia tecnica e aulica.
2. Esempio: "casino coi tubi" → "Criticità sistemiche nell'impianto idraulico".
3. Esempio: "ho detto di no" → "Espresso parere tecnico negativo e ordinata sospensione".

Output atteso (JSON valido, nessun testo fuori dal JSON):
{
  "meta": {
    "date": "${currentDate}",
    "title": "Titolo sintetico di 3-5 parole",
    "weather": "Condizioni meteo formali (o 'Non rilevato' se non menzionato)"
  },
  "content": {
    "formal_translation": "Testo completo riscritto in forma professionale e dettagliata.",
    "key_activities": ["Attività 1 formale", "Attività 2 formale"],
    "issues_detected": [
      { "problem": "Descrizione tecnica del problema", "severity": "HIGH|MEDIUM|LOW" }
    ],
    "directives": ["Ordine o direttiva impartita"]
  }
}`,
      },
    ];

    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages,
        temperature: 0.7,
      }),
    });

    if (!analysisResponse.ok) {
      const err = await analysisResponse.text();
      throw new Error(`GPT-4o error (${analysisResponse.status}): ${err}`);
    }

    const analysisResult = await analysisResponse.json();
    const structuredData = JSON.parse(analysisResult.choices[0].message.content);

    // 3. MAPPING → formato legacy frontend
    const title = structuredData.meta?.title || "Report Lavori";
    const weather = structuredData.meta?.weather || "-";
    const personnel = "Vedi relazione tecnica";
    const activities = structuredData.content?.formal_translation || "Nessuna rielaborazione disponibile";

    const issuesList: Array<{ problem: string; severity: string }> = structuredData.content?.issues_detected ?? [];
    const issues = issuesList.length > 0
      ? issuesList.map((i) => `[${i.severity}] ${i.problem}`).join("\n")
      : "Nessuna criticità rilevata";

    const dirList: string[] = structuredData.content?.directives ?? [];
    const directives = dirList.length > 0
      ? dirList.map((d) => `• ${d}`).join("\n")
      : "-";

    return new Response(JSON.stringify({
      text: transcribedText,
      data: { title, weather, personnel, activities, issues, directives, _raw: structuredData },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
