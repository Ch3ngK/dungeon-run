import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, atk, hp, biome } = body;

    const prompt = `
Pixel art RPG enemy.
Name: ${name}
Biome: ${biome}
Attack: ${atk}
HP: ${hp}
Style: 2D pixel sprite, retro game, transparent background, high contrast, centered character.
`;

    const image = await openai.images.generate({
      model: "gpt-image-1",
      prompt,
      size: "512x512",
    });

    return NextResponse.json({
      imageUrl: image.data[0].url,
    });
  } catch (error) {
    console.error("IMAGE API ERROR:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}


