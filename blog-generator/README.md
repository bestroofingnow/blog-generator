# 🎨 AI Blog Generator for Landscape Lighting & Real Estate

A powerful Next.js web app that generates high-quality, conversion-focused blog posts using Claude AI and Google Gemini APIs. Perfect for real estate, landscape lighting, home improvement, and service-based businesses in Charlotte, NC and beyond.

## ✨ Features

- **AI-Powered Content Generation**: Uses Claude Opus 4 or Google Gemini for intelligent, engaging content
- **Professional HTML Output**: Pre-formatted, ready-to-publish blog posts with semantic HTML
- **Charlotte-Specific Content**: Quick-select neighborhood buttons (Myers Park, Lake Wylie, Mooresville, Huntersville, etc.)
- **Location-Aware Generation**: Automatically incorporates local landmarks, parks, and community character
- **Conversion Optimized**: Includes CTAs and benefit-driven copy structure
- **Multiple Blog Types**: Neighborhood guides, how-to guides, trend reports, property showcases, expert tips, season-specific guides
- **Image Placeholder Integration**: Automatically includes spaces for hero images and section images with vivid descriptions
- **One-Click Editing**: Copy HTML to clipboard or download as file
- **Fast & Responsive**: Built with Next.js 14 for optimal performance
- **Multiple AI Providers**: Switch between Claude, Gemini, or run both for comparison
- **Emotional & Practical Appeal**: Content balances lifestyle benefits with practical solutions
- **Enterprise-Ready**: Scalable architecture suitable for high-volume content generation

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ (18+ recommended)
- npm or yarn
- API Keys:
  - [Anthropic Claude API](https://console.anthropic.com)
  - [Google Gemini API](https://ai.google.dev)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd blog-generator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example file
   cp .env.local.example .env.local
   
   # Edit .env.local with your API keys
   ANTHROPIC_API_KEY=your_key_here
   GEMINI_API_KEY=your_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 📝 How to Use

### Basic Workflow

1. **Fill in the form**:
   - **Blog Topic**: What is the post about? (e.g., "Landscape Lighting", "Outdoor Design")
   - **Location**: Geographic focus (e.g., "Charlotte, NC", "Lake Wylie")
   - **Blog Type**: Choose from pre-set categories or customize
   - **Number of Sections**: 3-7 main sections
   - **Tone**: Professional, casual, luxury, educational, or inspirational
   - **AI Provider**: Claude (recommended), Gemini, or both

2. **Click "Generate Blog"**
   - Wait for AI to generate the content (usually 10-30 seconds)
   - Content appears with full preview

3. **Review & Edit**
   - Preview the generated content
   - Click "View Raw HTML" to see the code
   - Make edits directly if needed

4. **Export**
   - **Copy HTML**: Paste into your CMS or website
   - **Download HTML**: Save as standalone file
   - **Share**: Share the link with your team

### Form Fields Explained

#### Topic
The main subject of your blog post. Examples:
- Landscape Lighting Solutions
- Outdoor Home Entertainment
- Curb Appeal & Real Estate Value
- Holiday Lighting Trends

#### Location
Geographic area the blog targets. Be specific:
- "Charlotte, NC" (broad)
- "Myers Park, Charlotte" (neighborhood specific)
- "Lake Wylie Waterfront Communities" (regional)

#### Blog Type
Pre-configured templates that shape the structure:
- **Neighborhood Guide**: Explores specific areas with practical advice
- **How-To Guide**: Step-by-step instructional content
- **Trend Report**: Latest industry trends and innovations
- **Property Showcase**: Features luxury properties or homes
- **Expert Tips**: Professional advice and best practices
- **Season-Specific Guide**: Holiday or seasonal content

#### Tone Options
Sets the voice and style of the content:
- **Professional yet Friendly**: Balance between expert and approachable
- **Casual and Conversational**: Relaxed, like talking to a friend
- **Luxury and Premium**: High-end, aspirational messaging
- **Educational and Informative**: Focus on learning and facts
- **Inspirational and Lifestyle**: Emotional, transformative angle

#### AI Provider
- **Claude (Recommended)**: Best for marketing copy and engaging narratives
- **Gemini**: Alternative provider, good for varied content styles
- **Both**: Generate with both and compare

## 🔧 Advanced Configuration

### Custom System Prompts

Edit the system prompt in `pages/api/generate-blog.ts` to customize the AI behavior:

```typescript
const systemPrompt = `You are an expert in [YOUR FIELD]...`;
```

### Adding New Blog Types

Edit `pages/index.tsx` to add new blog type options:

```typescript
<option>Your New Type</option>
```

Then update the API route to handle the new type with specific instructions.

### API Response Customization

Modify the `generateBlogContent` function to adjust:
- Max tokens (word count)
- Model selection
- Temperature (creativity level)
- Top P (diversity)

```typescript
const message = await client.messages.create({
  model: "claude-opus-4-20250805",
  max_tokens: 4000,  // Adjust this
  temperature: 0.7,   // Add this (0.0-1.0)
  top_p: 0.9,        // Add this (0.0-1.0)
  // ... rest of config
});
```

## 📊 Content Quality Tips

### For Best Results:

1. **Be Specific with Location**: "Myers Park, Charlotte" works better than "NC"
2. **Match Topic to Type**: Trend Reports work for timely topics, Guides for evergreen
3. **Choose Appropriate Tone**: Luxury tone for high-end properties, Friendly for family-focused
4. **5-6 Sections is Sweet Spot**: Provides depth without overwhelming readers
5. **Professional Tone**: Works best for converting local service clients

### Image Integration:

The generator includes `[IMAGE:description]` placeholders. Replace with:

- **Stock Photos**: Unsplash, Pexels, Pixabay
- **Professional**: Hire a photographer
- **Custom**: Use Midjourney, DALL-E, or other AI tools
- **Your Photos**: Embed actual property or work photos

### Example Image Replacement:

Search for images matching these descriptions on Unsplash:
- "landscape lighting in suburban neighborhood at night"
- "historic brick home with accent lighting"
- "outdoor family gathering with pathway lighting"

## 🌐 Deployment

### Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Then redeploy
vercel --prod
```

### Deploy to Other Platforms

#### Railway
```bash
vercel env pull
railway up
```

#### Heroku
```bash
heroku login
heroku create your-blog-generator
git push heroku main
```

#### Self-Hosted (Linux/Docker)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 💰 Cost Optimization

### API Costs
- **Claude Opus 4**: ~$0.015 per 1K input tokens, ~$0.075 per 1K output tokens
- **Gemini Pro**: Much cheaper (~$0.00025 per 1K tokens)

### Cost Reduction Strategies:

1. **Use Gemini for Draft Generation**: Switch to Gemini for initial drafts
2. **Cache Common Prompts**: Implement prompt caching for repeated requests
3. **Batch Generation**: Generate multiple posts at once
4. **Monitor Token Usage**: Check dashboard regularly

### Example Monthly Costs:
- 10 blogs/month with Claude: ~$1-2
- 50 blogs/month with Claude: ~$5-10
- 100 blogs/month with mix: ~$10-15
- 1000 blogs/month with Gemini: ~$20-30

## 🔐 Security Best Practices

1. **Never commit API keys**: Use `.env.local` (in .gitignore)
2. **Use environment variables**: For all sensitive data
3. **Rate limiting**: Add rate limiting for production
4. **Input validation**: Validate all user inputs
5. **CORS protection**: Implement proper CORS headers

## 📈 Scaling

### For High Volume:

1. **Add Database**: Store generated blogs
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```

2. **Implement Caching**: Use Redis for common requests
   ```bash
   npm install redis
   ```

3. **Queue System**: Use Bull or Resque for batch processing
   ```bash
   npm install bull
   ```

4. **CDN for Assets**: Serve images from CDN

## 🐛 Troubleshooting

### "API Key Not Found"
- Check `.env.local` exists
- Verify keys are correct in Anthropic/Google dashboards
- Restart dev server: `npm run dev`

### "Content Too Short"
- Increase `max_tokens` in API route
- Check AI provider hasn't hit rate limits
- Try different blog type or topic

### "Invalid HTML Output"
- Switch between Claude and Gemini providers
- Adjust system prompt for clearer instructions
- Check API response in browser console

### "Timeout Errors"
- Reduce `max_tokens` to speed up generation
- Use Gemini instead of Claude (faster)
- Check internet connection

## 📚 Additional Resources

- [Anthropic Claude Docs](https://docs.anthropic.com)
- [Google Gemini Docs](https://ai.google.dev/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Real Estate Marketing Guide](https://example.com)

## 💡 Ideas for Enhancement

- [ ] Database integration (save/manage blogs)
- [ ] User authentication (multiple accounts)
- [ ] Blog templates library
- [ ] AI image generation integration
- [ ] SEO optimization suggestions
- [ ] Multi-language support
- [ ] Team collaboration features
- [ ] Analytics & performance tracking
- [ ] Custom branding/white-label
- [ ] API for third-party integration

## 📄 License

MIT License - feel free to use for your projects

## 🤝 Support

Have questions? Need help?
- Check the GitHub Issues
- Review the FAQ section
- Contact support@example.com

## 🎯 Use Cases

This tool is perfect for:

- **Real Estate Agents**: Generate neighborhood guides
- **Landscape Designers**: Create service-focused content
- **Lighting Companies**: Product and service blogs
- **Property Developers**: Showcase new communities
- **Home Improvement Contractors**: Educational content
- **Agencies**: White-label content for clients

## 📝 Example Prompts

If you want specific results, try these input combinations:

### Luxury Market Blog
- Topic: "High-End Landscape Design"
- Location: "Lake Wylie, NC"
- Type: "Property Showcase"
- Tone: "Luxury and Premium"

### Educational Guide
- Topic: "Landscape Lighting 101"
- Location: "Charlotte, NC"
- Type: "How-To Guide"
- Tone: "Educational and Informative"

### Seasonal Content
- Topic: "Holiday Outdoor Entertaining"
- Location: "Huntersville, NC"
- Type: "Season-Specific Guide"
- Tone: "Inspirational and Lifestyle"

---

**Happy blogging! 🚀** Generated with ❤️ for content creators and entrepreneurs.
