# 🎨 AI Blog Generator for Landscape Lighting & Real Estate

A powerful Next.js web app that generates high-quality, conversion-focused blog posts using Claude AI and Google Gemini APIs. Perfect for real estate, landscape lighting, home improvement, and service-based businesses in Charlotte, NC and beyond.

## ✨ Features

- **AI-Powered Content Generation**: Uses Claude or Google Gemini for intelligent, engaging content
- **Professional HTML Output**: Pre-formatted, ready-to-publish blog posts with semantic HTML
- **Charlotte-Specific Content**: Quick-select neighborhood buttons (Myers Park, Lake Wylie, Mooresville, Huntersville, etc.)
- **Location-Aware Generation**: Automatically incorporates local landmarks, parks, and community character
- **Conversion Optimized**: Includes CTAs and benefit-driven copy structure
- **Multiple Blog Types**: Neighborhood guides, how-to guides, trend reports, property showcases, expert tips, season-specific guides
- **Image Placeholder Integration**: Automatically includes spaces for hero images and section images with vivid descriptions
- **One-Click Editing**: Copy HTML to clipboard or download as file
- **Fast & Responsive**: Built with Next.js 14 for optimal performance
- **Multiple AI Providers**: Switch between Claude, Gemini, or run both for comparison

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- API Keys:
  - [Anthropic Claude API](https://console.anthropic.com)
  - [Google Gemini API](https://ai.google.dev)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   # Copy the example file
   cp .env.example .env.local
   
   # Edit .env.local with your API keys
   ANTHROPIC_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🌐 Deploy to Vercel

1. Push to GitHub
2. Import to Vercel
3. Add environment variables in Vercel dashboard:
   - `ANTHROPIC_API_KEY`
   - `GEMINI_API_KEY`
4. Deploy!

## 📄 License

MIT License
