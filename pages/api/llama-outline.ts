// pages/api/llama-outline.ts
import Groq from "groq-sdk";
import type { NextApiRequest, NextApiResponse } from "next";

interface OutlineRequest {
  topic: string;
  location: string;
  blogType: string;
  numberOfSections?: number;
  tone?: string;
}

interface OutlineSection {
  title: string;
  keyPoints: string[];
  imagePrompt: string;
  imagePlacement: "before" | "after" | "within";
}

interface OutlineResponse {
  success: boolean;
  outline?: {
    blogTitle: string;
    introduction: {
      hook: string;
      keyPoints: string[];
      imagePrompt: string;
    };
    sections: OutlineSection[];
    conclusion: {
      summary: string;
      callToAction: string;
    };
    seo: {
      primaryKeyword: string;
      secondaryKeywords: string[];
      metaTitle: string;
      metaDescription: string;
    };
  };
  error?: string;
}

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<OutlineResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({
      success: false,
      error: "GROQ_API_KEY not configured",
    });
  }

  try {
    const request = req.body as OutlineRequest;

    if (!request.topic || !request.location || !request.blogType) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: topic, location, blogType",
      });
    }

    const { topic, location, blogType, numberOfSections = 5, tone = "professional yet friendly" } = request;

    const prompt = `You are an expert content strategist and SEO specialist. Create a detailed blog post outline for a landscape lighting company targeting the Charlotte, NC area.

BLOG SPECIFICATIONS:
- Topic: ${topic}
- Location: ${location}
- Blog Type: ${blogType}
- Number of Sections: ${numberOfSections}
- Tone: ${tone}

Your task is to create a structured outline that will guide the content writer. For each section, provide a detailed image prompt that will be used to generate a unique, professional image.

IMAGE PROMPT GUIDELINES:
- Each image prompt should be highly specific and descriptive
- Include details about: lighting conditions, time of day, architectural style, atmosphere
- Mention specific elements like: LED lights, path lights, uplighting, accent lighting
- Reference the location naturally (Charlotte, NC area aesthetics)
- Aim for photorealistic, professional marketing imagery
- Avoid generic descriptions - make each prompt unique to its section

Respond with ONLY valid JSON in this exact format:
{
  "blogTitle": "Compelling H1 title mentioning ${location} and ${topic}",
  "introduction": {
    "hook": "Opening hook that addresses homeowner pain points or aspirations",
    "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
    "imagePrompt": "Detailed prompt for hero image: Professional photograph of [specific scene with landscape lighting in ${location}, include time of day, lighting style, architectural details, atmosphere]"
  },
  "sections": [
    {
      "title": "Section H2 title specific to ${location}",
      "keyPoints": ["Detailed point 1", "Detailed point 2", "Detailed point 3"],
      "imagePrompt": "Detailed prompt: Professional photograph of [specific landscape lighting scene, be very descriptive about the lighting fixtures, their placement, the home style, vegetation, time of day, mood]",
      "imagePlacement": "after"
    }
  ],
  "conclusion": {
    "summary": "Key takeaways summary",
    "callToAction": "Compelling CTA for landscape lighting consultation"
  },
  "seo": {
    "primaryKeyword": "3-5 word primary keyword phrase with location",
    "secondaryKeywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4", "keyword 5"],
    "metaTitle": "SEO title under 60 characters",
    "metaDescription": "Compelling meta description 150-160 characters with primary keyword"
  }
}

Generate exactly ${numberOfSections} sections. Make each image prompt unique and specific to that section's content.`;

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct",
      messages: [
        {
          role: "system",
          content: "You are an expert content strategist. Always respond with valid JSON only, no markdown formatting or code blocks.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content || "";

    // Clean up response
    let cleanedResponse = responseText.trim();
    if (cleanedResponse.startsWith("```json")) {
      cleanedResponse = cleanedResponse.slice(7);
    }
    if (cleanedResponse.startsWith("```")) {
      cleanedResponse = cleanedResponse.slice(3);
    }
    if (cleanedResponse.endsWith("```")) {
      cleanedResponse = cleanedResponse.slice(0, -3);
    }
    cleanedResponse = cleanedResponse.trim();

    const outline = JSON.parse(cleanedResponse);

    return res.status(200).json({
      success: true,
      outline,
    });
  } catch (error) {
    console.error("Llama outline error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate outline",
    });
  }
}
