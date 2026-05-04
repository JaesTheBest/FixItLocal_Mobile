import * as FileSystem from 'expo-file-system';
import { ReportSeverity, UserRole } from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

export interface AIReportAnalysis {
  title: string;
  description: string;
  category: string;
  severity: ReportSeverity;
  suggestedTeamRole: UserRole;
  confidence: number; // 0-1
  reasoning: string;
}

const SYSTEM_PROMPT = `You are an AI assistant for FixItLocal, a civic incident reporting app.
Your job is to analyze photos of local infrastructure issues and generate structured report data.

You must respond with ONLY a valid JSON object — no markdown, no explanation outside the JSON.

The JSON must follow this exact structure:
{
  "title": "Short, specific title (max 80 chars)",
  "description": "Clear description of what is visible in the image and the nature of the problem (2-4 sentences)",
  "category": "One of: Pothole, Fallen Tree, Water Leak, Graffiti, Broken Street Light, Damaged Road Sign, Flooding, Abandoned Vehicle, Illegal Dumping, Animal Issue, Other",
  "severity": "High, Medium, or Low",
  "suggestedTeamRole": "One of: road_maintenance, sanitation, safety, electrical, animal_control, drainage, water_services",
  "confidence": 0.0 to 1.0 (how confident you are in the analysis),
  "reasoning": "One sentence explaining your severity and team assignment decision"
}

Severity guidelines:
- High: Immediate safety risk, blocking traffic, major infrastructure failure, flooding
- Medium: Non-urgent but needs attention, aesthetic damage, minor obstruction
- Low: Minor issue, cosmetic damage, low impact

Team assignment guidelines:
- road_maintenance: potholes, road damage, fallen trees blocking roads, road signs
- sanitation: illegal dumping, overflowing bins, graffiti, general waste
- safety: general safety hazards, barriers, fencing issues
- electrical: broken street lights, downed power lines, electrical hazards
- animal_control: stray or injured animals, animal-related issues
- drainage: flooding, blocked drains, standing water
- water_services: water leaks, burst pipes, water main issues`;

export async function analyzeReportImage(imageUri: string): Promise<AIReportAnalysis> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Missing EXPO_PUBLIC_ANTHROPIC_API_KEY in environment variables.');
  }

  // Read image as base64
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Detect media type from URI extension
  const ext = imageUri.split('.').pop()?.toLowerCase();
  const mediaType =
    ext === 'png' ? 'image/png' :
    ext === 'gif' ? 'image/gif' :
    ext === 'webp' ? 'image/webp' :
    'image/jpeg';

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: 'Analyze this incident photo and generate the structured report data as JSON.',
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI analysis failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  const rawText: string = data.content?.[0]?.text ?? '';

  // Extract JSON from the response (handle any accidental wrapping)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI returned an unexpected response format.');

  const parsed = JSON.parse(jsonMatch[0]) as AIReportAnalysis;
  return parsed;
}
