import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: NextRequest) {
    console.log('[Perspective API] Request received');
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error('[Perspective API] Missing API Key');
        return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    try {
        const { imageData } = await request.json();

        if (!imageData) {
            return NextResponse.json({ error: 'No image data provided' }, { status: 400 });
        }

        const base64Image = imageData.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

        const ai = new GoogleGenAI({ apiKey });

        const model = 'gemini-2.0-flash-exp';

        const config = {
            responseModalities: ['IMAGE'] as any[],
        };

        const contents = [
            {
                role: 'user',
                parts: [
                    { text: "Transforme cette capture d'écran 3D filaire en une image photoréaliste. Garde la même perspective, les mêmes formes de bâtiments, mais ajoute des textures réalistes (briques, verre, toits), de la végétation, de l'éclairage naturel et un ciel réaliste. C'est pour une présentation architecturale." },
                    {
                        inlineData: {
                            mimeType: 'image/png',
                            data: base64Image
                        }
                    }
                ],
            },
        ];

        console.log(`[Perspective API] Calling model ${model}...`);

        const response = await ai.models.generateContentStream({
            model,
            config,
            contents,
        });

        let generatedImageBase64 = null;

        for await (const chunk of response) {
            if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
                generatedImageBase64 = chunk.candidates[0].content.parts[0].inlineData.data;
                break;
            }
        }

        if (generatedImageBase64) {
            console.log('[Perspective API] Image generated successfully');
            return NextResponse.json({
                description: "Image générée par IA",
                generatedImage: `data:image/png;base64,${generatedImageBase64}`
            });
        } else {
            console.warn('[Perspective API] No image data in response');
            return NextResponse.json({ error: 'Generation failed to produce an image' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[Perspective API] Error:', error);
        return NextResponse.json({
            error: 'Failed to process request',
            details: error.message
        }, { status: 500 });
    }
}
