# Blog Generator Enhancement Plan

## Overview
Transform the blog generator to use a multi-AI orchestrated workflow with WordPress integration for image storage.

## Current Architecture
- **Frontend**: Next.js React app with form inputs
- **Backend APIs**:
  - `/api/generate-blog.ts` - Claude API for content
  - `/api/generate-with-gemini.ts` - Gemini API (text only currently)
- **Output**: HTML content + SEO metadata + CSV download

## Proposed Architecture

### Flow Diagram
```
User Input
    ↓
[1] Llama 4 Maverick (Orchestrator)
    - Creates blog outline with section titles
    - Defines image requirements for each section
    - Returns structured plan with image prompts
    ↓
[2] Gemini Imagen (Image Generation)
    - Receives image prompts from Llama
    - Generates unique images for each section
    - Returns base64 image data
    ↓
[3] WordPress Media API (Image Storage)
    - Uploads generated images to WordPress
    - Returns permanent image URLs
    ↓
[4] Claude (Content Writer)
    - Receives outline from Llama
    - Receives image URLs from WordPress
    - Writes full HTML content with images embedded
    - Returns final blog post + SEO data
    ↓
Output (CSV with SEO + HTML with real images)
```

## New Files to Create

### 1. `/pages/api/orchestrate-blog.ts` (Main Orchestrator)
- Coordinates the entire flow
- Calls each AI in sequence
- Handles errors and fallbacks

### 2. `/pages/api/llama-outline.ts` (Llama 4 Maverick)
- Uses Together AI or Groq API for Llama 4 Maverick
- Generates structured outline with:
  - Section titles
  - Key points per section
  - Image prompt for each section (descriptive, specific)
  - Suggested image placement

### 3. `/pages/api/generate-images.ts` (Gemini Imagen)
- Uses Gemini's image generation capabilities
- Takes array of prompts
- Returns array of base64 images

### 4. `/pages/api/wordpress-upload.ts` (WordPress Integration)
- Connects to WordPress REST API
- Uploads images to media library
- Returns image URLs

### 5. `/lib/wordpress.ts` (WordPress Helper)
- WordPress API client
- Authentication handling
- Image upload utilities

## Frontend Changes

### New Settings Section (WordPress Connection)
- WordPress Site URL input
- Username input
- Application Password input (WordPress generates these)
- "Test Connection" button
- Connection status indicator
- Store in localStorage for persistence

### Updated Form
- Remove "AI Provider" dropdown
- Add "Use Orchestrated Flow" toggle (default: on)
- Show progress steps during generation:
  1. "Creating outline with Llama..."
  2. "Generating images with Gemini..."
  3. "Uploading to WordPress..."
  4. "Writing content with Claude..."

### New State
```typescript
interface WordPressSettings {
  siteUrl: string;
  username: string;
  appPassword: string;
  isConnected: boolean;
}

interface GenerationProgress {
  step: 'idle' | 'outline' | 'images' | 'upload' | 'content' | 'complete';
  message: string;
  progress: number; // 0-100
}
```

## Environment Variables (New)
```
# Existing
ANTHROPIC_API_KEY=
GEMINI_API_KEY=

# New
TOGETHER_API_KEY=  # For Llama 4 Maverick (or GROQ_API_KEY)
```

## API Response Structures

### Llama Outline Response
```json
{
  "title": "Blog Title",
  "outline": [
    {
      "section": "Introduction",
      "keyPoints": ["point1", "point2"],
      "imagePrompt": "Professional photo of landscape lighting illuminating a Myers Park estate at dusk, warm amber glow, architectural details visible",
      "imagePlacement": "after_intro"
    },
    {
      "section": "Section 1 Title",
      "keyPoints": ["point1", "point2", "point3"],
      "imagePrompt": "Close-up of LED path lights along a stone walkway in a Charlotte garden, evening ambiance",
      "imagePlacement": "within_section"
    }
  ],
  "seoSuggestions": {
    "primaryKeyword": "...",
    "secondaryKeywords": ["..."]
  }
}
```

### Image Generation Response
```json
{
  "images": [
    {
      "prompt": "...",
      "base64": "data:image/png;base64,...",
      "index": 0
    }
  ]
}
```

### WordPress Upload Response
```json
{
  "uploadedImages": [
    {
      "index": 0,
      "url": "https://yoursite.com/wp-content/uploads/2024/12/image1.png",
      "altText": "Landscape lighting in Myers Park"
    }
  ]
}
```

## WordPress Authentication
WordPress Application Passwords (available since WP 5.6):
1. User goes to WordPress Admin → Users → Profile
2. Scroll to "Application Passwords"
3. Create new application password
4. Use username + app password for REST API auth

API Auth Header:
```
Authorization: Basic base64(username:app_password)
```

## Error Handling Strategy
1. If Llama fails → Use fallback simple outline
2. If Gemini images fail → Use placeholder images
3. If WordPress upload fails → Store images as base64 in output
4. If Claude fails → Return outline with images as partial result

## Dependencies to Add
```json
{
  "groq-sdk": "^0.5.0"  // For Llama 4 Maverick - fast and affordable
}
```

## API Details

### Llama 4 Maverick via Groq
- Model ID: `meta-llama/llama-4-maverick-17b-128e-instruct`
- Pricing: $0.50/M input tokens, $0.77/M output tokens
- Context: 128K tokens
- Multimodal support (text + images)

### Gemini Image Generation
- Model: `gemini-2.5-flash-image` (recommended - stable)
- Alternative: `gemini-2.0-flash-exp` (experimental, free)
- Pricing: $0.039 per image (1290 output tokens)
- Free tier: Up to 500 images/day
- Max resolution: 1024px

### WordPress REST API
- Endpoint: `{site_url}/wp-json/wp/v2/media`
- Auth: Basic auth with Application Password
- Upload: multipart/form-data with image file

## Implementation Order
1. WordPress settings UI + localStorage
2. WordPress upload API endpoint
3. Llama outline API endpoint (via Groq)
4. Gemini image generation endpoint
5. Orchestrator endpoint
6. Frontend progress UI
7. Testing + deployment
