# ⚡ Quick Start (5 Minutes)

## 1️⃣ Get Your API Keys

**Claude (Required):**
1. Go to https://console.anthropic.com/account/keys
2. Click "Create Key"
3. Copy the key and save it (you won't see it again)

**Gemini (Optional):**
1. Go to https://ai.google.dev/tutorials/setup
2. Click "Get API Key"
3. Create new key in default project
4. Copy it

## 2️⃣ Set Up Locally

```bash
# Navigate to the blog-generator folder
cd blog-generator

# Install packages
npm install

# Create env file
cp .env.local.example .env.local

# Edit .env.local and paste your keys
# Mac/Linux:
nano .env.local
# Windows:
notepad .env.local

# Then paste these lines with your actual keys:
ANTHROPIC_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here (if you got one)
```

## 3️⃣ Run It

```bash
npm run dev
```

Open `http://localhost:3000` in your browser. You should see the form.

## 4️⃣ Generate Your First Blog

1. Click the "Myers Park" quick-select button (or choose another neighborhood)
2. Keep all other settings as default
3. Click "Generate Blog"
4. Wait 20-30 seconds while Claude writes the blog
5. See the preview, click "Copy HTML" or "Download HTML"

## ✅ That's It!

You now have a professional blog post ready to:
- Paste into WordPress
- Upload to your website builder
- Edit in your favorite editor
- Save as a file

---

## 🚀 Next: Deploy for Free

Pick ONE:

### **Easiest: Vercel (Recommended)**
1. Create GitHub account if you don't have one
2. Go to https://github.com/new and create a new repository
3. Follow instructions to push your blog-generator folder to GitHub
4. Go to https://vercel.com and sign up with GitHub
5. Click "New Project" → select your blog-generator repo → Add API keys → Deploy
6. You get a FREE live URL like: your-blog-generator.vercel.app

### **Also Easy: Railway**
1. Go to https://railway.app
2. Sign up
3. New Project → Deploy from GitHub (same as Vercel)
4. Follow Railway's prompts
5. Get live URL for free

### **Full Control: Self-Hosted**
1. Rent a server from DigitalOcean ($5/mo) or AWS
2. Follow the "Self-Hosted" section in DEPLOYMENT_GUIDE.md
3. Your app runs 24/7 on your own server

---

## 📝 Pro Tips

**For Best Results:**
- Use specific Charlotte neighborhoods (Myers Park, Lake Wylie, Mooresville)
- Try different blog types (Neighborhood Guide, How-To Guide, Expert Tips)
- "Professional yet friendly" tone works best for most content
- 5 sections is the sweet spot (4-6 all work well)

**Cost Tracking:**
- Each blog costs ~$0.10 with Claude
- Gemini is 80x cheaper (~$0.001) but slightly lower quality
- Free tier covers 200-300 blogs before spending

**Quality Check:**
- Look at generated HTML
- Replace [IMAGE:description] with actual image URLs
- Adjust any facts specific to neighborhoods
- Publish to your site

---

## ❓ Stuck?

| Problem | Solution |
|---|---|
| "API Key Error" | Copy/paste key again, check for spaces |
| "Connection Timeout" | Wait 30 seconds, check internet, try again |
| "Page Won't Load" | Make sure you ran `npm run dev` |
| "Want to Deploy" | Read DEPLOYMENT_GUIDE.md section "Vercel" |
| "Need More Features" | Check README.md in blog-generator folder |

---

## 🎯 Your Next Moves

1. ✅ Generate 5 blogs for different neighborhoods
2. ✅ Publish to your site and test
3. ✅ Deploy to Vercel or Railway
4. ✅ Share with your team
5. ✅ Start generating 100+ blogs per month

**That's the whole workflow!** 🎉
