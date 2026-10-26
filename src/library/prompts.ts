import type Ionicons from '@expo/vector-icons/Ionicons';

// The built-in prompt library: ready-made prompts people can copy as they are, or save to their
// own prompts and edit. Placeholders use the same {{name|default}} syntax as user prompts.

export type LibraryCategory = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  /** Tag added when a prompt from this category is saved. */
  tag: string;
};

export type LibraryPrompt = {
  /** Stable id, so copies can remember typed values. Never reuse or rename. */
  id: string;
  category: string;
  title: string;
  body: string;
};

export const LIBRARY_CATEGORIES: LibraryCategory[] = [
  { key: 'image', label: 'Image generation', icon: 'image-outline', color: '#E5688A', tag: 'image' },
  { key: 'productivity', label: 'Productivity', icon: 'checkmark-done-outline', color: '#3FB27F', tag: 'productivity' },
  { key: 'business', label: 'Business', icon: 'briefcase-outline', color: '#5B8DEF', tag: 'business' },
  { key: 'marketing', label: 'Marketing', icon: 'megaphone-outline', color: '#F2B84B', tag: 'marketing' },
  { key: 'writing', label: 'Writing', icon: 'create-outline', color: '#A77BF3', tag: 'writing' },
  { key: 'coding', label: 'Coding', icon: 'code-slash-outline', color: '#20808D', tag: 'coding' },
  { key: 'learning', label: 'Learning', icon: 'school-outline', color: '#E8804A', tag: 'learning' },
  { key: 'career', label: 'Career', icon: 'person-outline', color: '#8C8C99', tag: 'career' },
];

export const LIBRARY_PROMPTS: LibraryPrompt[] = [
  // Image generation
  {
    id: 'img-portrait',
    category: 'image',
    title: 'Photorealistic portrait',
    body: 'A photorealistic portrait of {{subject}}, {{lighting|soft window light}}, shot on an 85mm lens at f/1.8, shallow depth of field, natural skin texture, {{mood|calm and confident}} expression, neutral background. Aspect ratio {{aspect ratio|4:5}}.',
  },
  {
    id: 'img-product',
    category: 'image',
    title: 'Studio product shot',
    body: 'Studio product photo of {{product}} on a {{surface|matte stone pedestal}}, {{background|warm beige}} seamless background, soft diffused key light with a subtle rim light, crisp reflections, high detail, commercial catalogue style. Aspect ratio {{aspect ratio|1:1}}.',
  },
  {
    id: 'img-cinematic',
    category: 'image',
    title: 'Cinematic scene',
    body: 'A cinematic wide shot of {{scene}} at {{time of day|golden hour}}, anamorphic lens, volumetric light, rich colour grading in {{palette|teal and orange}}, fine film grain, epic sense of scale. Aspect ratio {{aspect ratio|21:9}}.',
  },
  {
    id: 'img-logo',
    category: 'image',
    title: 'Minimal logo concept',
    body: 'A minimal flat vector logo for {{brand name}}, a {{type of business}}. A simple geometric mark that suggests {{idea}}, using {{colours|two colours}}, clean negative space, no text other than the brand name, centred on a white background.',
  },
  {
    id: 'img-storybook',
    category: 'image',
    title: 'Storybook illustration',
    body: "A warm, hand-painted watercolour illustration of {{scene}} for a children's picture book. Soft pastel palette, gentle paper texture, friendly rounded characters, cosy storybook feeling. Aspect ratio {{aspect ratio|3:2}}.",
  },
  {
    id: 'img-isometric',
    category: 'image',
    title: 'Cute isometric 3D',
    body: 'An isometric 3D illustration of {{subject}}, soft clay-like materials, pastel colours, gentle studio lighting, tiny charming details, plain {{background|light grey}} background, high resolution.',
  },
  {
    id: 'img-wallpaper',
    category: 'image',
    title: 'Phone wallpaper',
    body: 'A {{style|minimal abstract}} phone wallpaper inspired by {{theme}}, smooth gradients in {{palette|deep blue and violet}}, subtle texture, calm empty space at the top for the clock. Aspect ratio 9:16.',
  },
  {
    id: 'img-prompt-writer',
    category: 'image',
    title: 'Turn an idea into image prompts',
    body: 'Act as an expert prompt writer for AI image generators. Turn my rough idea into 3 detailed image prompts. Each should cover the subject, setting, style or medium, lighting, camera angle, colour palette and aspect ratio. Keep each prompt to one paragraph.\n\nMy idea: {{idea}}',
  },

  // Productivity
  {
    id: 'prod-day-plan',
    category: 'productivity',
    title: 'Plan my day',
    body: 'Here are my tasks for today:\n{{tasks}}\n\nI have about {{hours|6}} hours of focused time. Order them by impact, estimate how long each will take, group the quick wins together, and tell me what to postpone.',
  },
  {
    id: 'prod-meeting-notes',
    category: 'productivity',
    title: 'Meeting notes to action items',
    body: 'Turn these meeting notes into:\n1. A 3-sentence summary\n2. Decisions made\n3. Action items as a table (owner, task, due date)\n4. Open questions\n\nNotes:\n{{notes}}',
  },
  {
    id: 'prod-email-reply',
    category: 'productivity',
    title: 'Reply to an email',
    body: 'Write a reply to the email below. Tone: {{tone|friendly and professional}}. Keep it under {{word limit|120}} words and make the next step clear.\n\nWhat I want to say: {{my points}}\n\nEmail:\n{{email}}',
  },
  {
    id: 'prod-weekly-review',
    category: 'productivity',
    title: 'Weekly review coach',
    body: "Help me run my weekly review. Ask me these questions one at a time and wait for each answer: what went well, what didn't, what I learned, my top 3 priorities for next week, and one thing I should stop doing. Then sum it up as a short plan for the week.",
  },
  {
    id: 'prod-project-breakdown',
    category: 'productivity',
    title: 'Break down a project',
    body: 'Break this project down into phases, milestones and concrete next actions I can start today. Flag risks and dependencies.\n\nProject: {{project}}\nDeadline: {{deadline}}',
  },
  {
    id: 'prod-decision',
    category: 'productivity',
    title: 'Help me decide',
    body: 'Help me make this decision: {{decision}}\n\nWhat matters most to me: {{priorities}}\n\nList the options, the pros and cons of each, how they score against my priorities, and give a clear recommendation with your reasoning.',
  },
  {
    id: 'prod-summary',
    category: 'productivity',
    title: 'Summarise anything',
    body: 'Summarise the text below in {{number of points|5}} bullet points, then give the single most important takeaway in one sentence.\n\n{{text}}',
  },

  // Business
  {
    id: 'biz-one-page-plan',
    category: 'business',
    title: 'One-page business plan',
    body: 'Write a one-page business plan for {{business idea}}. Cover the problem, the solution, target customers, competitors, business model, go-to-market plan, key metrics, and the first 90 days.',
  },
  {
    id: 'biz-swot',
    category: 'business',
    title: 'SWOT analysis',
    body: 'Do a SWOT analysis for {{company or product}} in the {{market}} market. Be specific rather than generic. Then suggest 3 strategic moves that use the strengths to counter the threats.',
  },
  {
    id: 'biz-pricing',
    category: 'business',
    title: 'Pricing strategy',
    body: 'Suggest a pricing strategy for {{product}} aimed at {{customers}}. Compare 3 pricing models (for example tiers, usage-based and one-time), propose price points with your reasoning, and explain how to test them cheaply.',
  },
  {
    id: 'biz-personas',
    category: 'business',
    title: 'Customer personas',
    body: 'Create 3 detailed customer personas for {{product}}. For each: goals, pain points, objections, where they spend time online, and the message most likely to win them over.',
  },
  {
    id: 'biz-pitch-deck',
    category: 'business',
    title: 'Pitch deck outline',
    body: 'Write a 10-slide pitch deck outline for {{startup}}, which {{what it does}}. For each slide give a title, the key message, and the evidence or visual to show.',
  },
  {
    id: 'biz-competitors',
    category: 'business',
    title: 'Competitor comparison',
    body: 'Compare {{my product}} with {{competitors}} on features, pricing, target audience, strengths and weaknesses. Present it as a table, then explain where we can win and what we should not compete on.',
  },
  {
    id: 'biz-negotiation',
    category: 'business',
    title: 'Negotiation prep',
    body: 'Help me prepare for a negotiation with {{other party}} about {{topic}}. My goal: {{goal}}.\n\nGive me my best alternative if we fail to agree, the objections they are likely to raise with a response to each, and an opening script.',
  },

  // Marketing
  {
    id: 'mkt-social-posts',
    category: 'marketing',
    title: 'Social media posts',
    body: 'Write {{number of posts|5}} {{platform|LinkedIn}} posts about {{topic}} for {{audience}}. Give each a strong hook in the first line, one clear idea, and a call to action. Vary the formats.',
  },
  {
    id: 'mkt-product-description',
    category: 'marketing',
    title: 'Product description',
    body: 'Write an online store product description for {{product}}. Lead with the main benefit, follow with 3 to 5 scannable bullet points, and finish with a short closing line. Tone: {{tone|warm and confident}}.',
  },
  {
    id: 'mkt-ads',
    category: 'marketing',
    title: 'Ad copy variations',
    body: 'Write 5 ad variations for {{product}} aimed at {{audience}} on {{platform|Instagram}}. For each, give a headline under 40 characters, primary text under 125 characters, and a call to action.',
  },
  {
    id: 'mkt-calendar',
    category: 'marketing',
    title: 'Content calendar',
    body: 'Create a 4-week content calendar for {{brand}} on {{channels}}. The goal is {{goal}}. Include post ideas, formats and the best day to post each one, as a table.',
  },
  {
    id: 'mkt-newsletter',
    category: 'marketing',
    title: 'Newsletter email',
    body: 'Write a newsletter email about {{topic}} for {{audience}}. Give 3 subject line options, a preview line, and a body under 250 words with one clear call to action.',
  },
  {
    id: 'mkt-seo-outline',
    category: 'marketing',
    title: 'SEO blog outline',
    body: 'Create an SEO-friendly blog post outline for the keyword "{{keyword}}". Include title options, a meta description under 155 characters, the H2 and H3 structure, the questions readers want answered, and ideas for internal links.',
  },

  // Writing
  {
    id: 'wri-clearer',
    category: 'writing',
    title: 'Make it clearer',
    body: 'Rewrite the text below to be clearer and more concise. Keep my voice and every fact. Then list the main changes you made.\n\n{{text}}',
  },
  {
    id: 'wri-tone',
    category: 'writing',
    title: 'Change the tone',
    body: 'Rewrite this in a {{tone|friendly}} tone for {{audience|a general audience}}, keeping the meaning the same:\n\n{{text}}',
  },
  {
    id: 'wri-proofread',
    category: 'writing',
    title: 'Proofread',
    body: 'Proofread the text below. Fix spelling, grammar and punctuation without changing the meaning or style. Show the corrected version, then a short list of the fixes.\n\n{{text}}',
  },
  {
    id: 'wri-story',
    category: 'writing',
    title: 'Short story opening',
    body: "Write the opening scene of a {{genre|mystery}} short story about {{premise}}. Show, don't tell, end on a hook, and keep it under {{word limit|400}} words.",
  },
  {
    id: 'wri-blog-post',
    category: 'writing',
    title: 'Blog post draft',
    body: 'Write a {{length in words|800}}-word blog post titled "{{title}}" for {{audience}}. Use short paragraphs, clear subheadings, one concrete example, and a strong conclusion.',
  },
  {
    id: 'wri-headlines',
    category: 'writing',
    title: 'Headline ideas',
    body: 'Give me 10 headline options for {{topic}}. Mix curiosity, how-to, numbered lists and bold claims, keep each under 70 characters, and mark your top 3.',
  },

  // Coding
  {
    id: 'code-review',
    category: 'coding',
    title: 'Senior code review',
    body: 'Review this {{language}} code like a senior engineer. List bugs, edge cases, security and readability issues by severity, then show an improved version.\n\n{{code}}',
  },
  {
    id: 'code-explain',
    category: 'coding',
    title: 'Explain this code',
    body: 'Explain what this code does, step by step, for someone new to {{language}}. Then point out anything surprising or risky.\n\n{{code}}',
  },
  {
    id: 'code-debug',
    category: 'coding',
    title: 'Fix an error',
    body: "I'm getting this error:\n{{error}}\n\nIn this code:\n{{code}}\n\nExplain the most likely cause, how to confirm it, and the fix.",
  },
  {
    id: 'code-tests',
    category: 'coding',
    title: 'Write unit tests',
    body: 'Write unit tests for the code below using {{test framework}}. Cover the main paths, edge cases and error handling, and say what each test checks.\n\n{{code}}',
  },
  {
    id: 'code-regex',
    category: 'coding',
    title: 'Build a regex',
    body: "Write a regular expression in {{language|JavaScript}} that matches {{what to match}}. Explain each part, and give examples that should and shouldn't match.",
  },
  {
    id: 'code-sql',
    category: 'coding',
    title: 'Write a SQL query',
    body: 'Write a {{database|PostgreSQL}} query that {{goal}}.\n\nTables:\n{{schema}}\n\nExplain how the query works, and suggest an index if one would help.',
  },

  // Learning
  {
    id: 'learn-three-levels',
    category: 'learning',
    title: 'Explain it three ways',
    body: "Explain {{concept}} three ways: as if I'm five, as if I'm a curious teenager, and the way an expert would. Use one everyday analogy.",
  },
  {
    id: 'learn-study-plan',
    category: 'learning',
    title: 'Study plan',
    body: 'Create a {{number of weeks|4}}-week plan to learn {{subject}}, starting from {{level|beginner}} level, with {{hours per week|5}} hours a week. Include the topics for each week, the kind of resources to look for, and a small project to finish each week.',
  },
  {
    id: 'learn-quiz',
    category: 'learning',
    title: 'Quiz me',
    body: "Quiz me on {{topic}}. Ask one question at a time and wait for my answer. Tell me whether I'm right and why, and make the questions harder as I improve. Start now.",
  },
  {
    id: 'learn-check-understanding',
    category: 'learning',
    title: 'Check my understanding',
    body: "I'll explain {{concept}} in my own words. Point out gaps, mistakes, and any jargon I used without explaining, then help me fill those gaps.\n\nMy explanation: {{my explanation}}",
  },
  {
    id: 'learn-language',
    category: 'learning',
    title: 'Language practice partner',
    body: "Let's practise {{language}} at {{level|beginner}} level. Chat with me about {{topic|everyday life}}, gently correct my mistakes after each reply, and teach me one useful new phrase each time.",
  },
  {
    id: 'learn-book',
    category: 'learning',
    title: 'Book key ideas',
    body: 'Summarise the key ideas of the book "{{book}}" in 7 points, with one practical way to apply each in everyday life.',
  },

  // Career
  {
    id: 'career-resume',
    category: 'career',
    title: 'Stronger resume bullets',
    body: 'Rewrite these resume points as strong, results-focused bullets. Start each with an action verb and add numbers where possible. Role: {{role}}.\n\n{{experience}}',
  },
  {
    id: 'career-cover-letter',
    category: 'career',
    title: 'Cover letter',
    body: 'Write a cover letter for the {{job title}} role at {{company}}. Match my experience to the job description, keep it under 300 words, and make it sound human, not generic.\n\nJob description:\n{{job description}}\n\nMy background:\n{{background}}',
  },
  {
    id: 'career-interview',
    category: 'career',
    title: 'Mock interview',
    body: 'Act as an interviewer for a {{job title}} role. Ask me one question at a time, mixing behavioural and role-specific questions. After each answer, give honest feedback and a stronger sample answer.',
  },
  {
    id: 'career-salary',
    category: 'career',
    title: 'Negotiate an offer',
    body: 'Help me negotiate a job offer for a {{role}} position. The offer is {{offer}} and I am aiming for {{target}}. Write a polite email asking for more, and list the arguments I can use.',
  },
  {
    id: 'career-linkedin-about',
    category: 'career',
    title: 'LinkedIn About section',
    body: "Write a LinkedIn About section for me. I'm a {{role}} who {{what I do}}. Highlight {{strengths}}. Write in the first person, keep it warm and under 200 words, and end with what I'm open to.",
  },
];
