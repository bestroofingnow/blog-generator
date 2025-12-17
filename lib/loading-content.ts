// lib/loading-content.ts
// Fun content to display while AI is generating

export const cleanJokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "I told my computer I needed a break, and now it won't stop sending me Kit-Kat ads.",
  "Why did the SEO expert cross the road? To get more traffic!",
  "What do you call a blog post that takes forever to load? A web-sloth!",
  "Why don't scientists trust atoms? Because they make up everything!",
  "I'm reading a book about anti-gravity. It's impossible to put down!",
  "Why did the content writer go to therapy? Too many unresolved issues with their drafts.",
  "What's a computer's favorite snack? Microchips!",
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
  "I would tell you a UDP joke, but you might not get it.",
  "There are only 10 types of people in the world: those who understand binary and those who don't.",
  "Why do Java developers wear glasses? Because they can't C#!",
  "A SQL query walks into a bar, walks up to two tables and asks, 'Can I join you?'",
  "Why did the blog post break up with the social media post? It needed more space!",
  "What do you call a computer that sings? A-Dell!",
  "Why was the math book sad? It had too many problems.",
  "I'm on a seafood diet. I see food and I eat it!",
  "Why don't eggs tell jokes? They'd crack each other up!",
  "What do you call a fake noodle? An impasta!",
  "Why did the scarecrow win an award? He was outstanding in his field!",
  "I used to hate facial hair, but then it grew on me.",
  "Why don't skeletons fight each other? They don't have the guts!",
  "What do you call a bear with no teeth? A gummy bear!",
  "Why did the coffee file a police report? It got mugged!",
  "I'm terrified of elevators, so I'm taking steps to avoid them.",
];

export const inspirationalQuotes = [
  { quote: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { quote: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { quote: "Stay hungry, stay foolish.", author: "Steve Jobs" },
  { quote: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { quote: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { quote: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { quote: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { quote: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { quote: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { quote: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau" },
  { quote: "Don't be afraid to give up the good to go for the great.", author: "John D. Rockefeller" },
  { quote: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson" },
  { quote: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { quote: "If you really look closely, most overnight successes took a long time.", author: "Steve Jobs" },
  { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { quote: "It's not whether you get knocked down, it's whether you get up.", author: "Vince Lombardi" },
  { quote: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { quote: "The best revenge is massive success.", author: "Frank Sinatra" },
  { quote: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas Edison" },
  { quote: "A person who never made a mistake never tried anything new.", author: "Albert Einstein" },
  { quote: "The mind is everything. What you think you become.", author: "Buddha" },
  { quote: "Strive not to be a success, but rather to be of value.", author: "Albert Einstein" },
  { quote: "Two roads diverged in a wood, and I took the one less traveled by.", author: "Robert Frost" },
];

export const funFacts = [
  "The first website ever created is still online. It was created in 1991!",
  "Google's original name was 'Backrub'. Glad they changed it!",
  "The average person spends 6 months of their lifetime waiting for red lights.",
  "Honey never spoils. Archaeologists found 3000-year-old honey in Egyptian tombs!",
  "The inventor of the Pringles can is buried in one.",
  "A group of flamingos is called a 'flamboyance'.",
  "The shortest war in history lasted 38 minutes (Britain vs Zanzibar).",
  "Octopuses have three hearts and blue blood.",
  "Bananas are berries, but strawberries aren't!",
  "A day on Venus is longer than a year on Venus.",
  "The first computer mouse was made of wood.",
  "Cows have best friends and get stressed when separated.",
  "The dot over the letters 'i' and 'j' is called a 'tittle'.",
  "Scotland's national animal is the unicorn.",
  "A cloud can weigh more than a million pounds!",
];

export const loadingMessages = [
  "Brewing your content with AI magic...",
  "Teaching robots to write poetry... almost there!",
  "Consulting the digital muses...",
  "Crafting words that Google will love...",
  "Mixing creativity with algorithms...",
  "Assembling the perfect sentences...",
  "Adding a dash of SEO sparkle...",
  "Polishing your prose to perfection...",
  "Summoning the content spirits...",
  "Building your masterpiece, one word at a time...",
  "AI neurons are firing up...",
  "Generating brilliance in progress...",
  "Creating content that converts...",
  "Weaving words into wonder...",
  "Almost there... quality takes time!",
];

export function getRandomJoke(): string {
  return cleanJokes[Math.floor(Math.random() * cleanJokes.length)];
}

export function getRandomQuote(): { quote: string; author: string } {
  return inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
}

export function getRandomFact(): string {
  return funFacts[Math.floor(Math.random() * funFacts.length)];
}

export function getRandomLoadingMessage(): string {
  return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
}

export type ContentType = "joke" | "quote" | "fact";

export function getRandomContent(): { type: ContentType; content: string; author?: string } {
  const types: ContentType[] = ["joke", "quote", "fact"];
  const type = types[Math.floor(Math.random() * types.length)];

  switch (type) {
    case "joke":
      return { type, content: getRandomJoke() };
    case "quote":
      const quote = getRandomQuote();
      return { type, content: quote.quote, author: quote.author };
    case "fact":
      return { type, content: getRandomFact() };
  }
}
