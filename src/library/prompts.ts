import type Ionicons from "@expo/vector-icons/Ionicons";

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
  {
    key: "image",
    label: "Image generation",
    icon: "image-outline",
    color: "#E5688A",
    tag: "image",
  },
  {
    key: "productivity",
    label: "Productivity",
    icon: "checkmark-done-outline",
    color: "#3FB27F",
    tag: "productivity",
  },
  {
    key: "business",
    label: "Business",
    icon: "briefcase-outline",
    color: "#5B8DEF",
    tag: "business",
  },
  {
    key: "marketing",
    label: "Marketing",
    icon: "megaphone-outline",
    color: "#F2B84B",
    tag: "marketing",
  },
  {
    key: "writing",
    label: "Writing",
    icon: "create-outline",
    color: "#A77BF3",
    tag: "writing",
  },
  {
    key: "coding",
    label: "Coding",
    icon: "code-slash-outline",
    color: "#20808D",
    tag: "coding",
  },
  {
    key: "research",
    label: "Research",
    icon: "search-outline",
    color: "#6B9E3A",
    tag: "research",
  },
  {
    key: "learning",
    label: "Learning",
    icon: "school-outline",
    color: "#E8804A",
    tag: "learning",
  },
  {
    key: "career",
    label: "Career",
    icon: "person-outline",
    color: "#8C8C99",
    tag: "career",
  },
  {
    key: "prompting",
    label: "Prompt writing",
    icon: "sparkles-outline",
    color: "#D97757",
    tag: "prompting",
  },
];

const FIRST_SET: LibraryPrompt[] = [
  // Image generation
  {
    id: "img-portrait",
    category: "image",
    title: "Photorealistic portrait",
    body: "A photorealistic portrait of {{subject}}, {{lighting|soft window light}}, shot on an 85mm lens at f/1.8, shallow depth of field, natural skin texture, {{mood|calm and confident}} expression, neutral background. Aspect ratio {{aspect ratio|4:5}}.",
  },
  {
    id: "img-product",
    category: "image",
    title: "Studio product shot",
    body: "Studio product photo of {{product}} on a {{surface|matte stone pedestal}}, {{background|warm beige}} seamless background, soft diffused key light with a subtle rim light, crisp reflections, high detail, commercial catalogue style. Aspect ratio {{aspect ratio|1:1}}.",
  },
  {
    id: "img-cinematic",
    category: "image",
    title: "Cinematic scene",
    body: "A cinematic wide shot of {{scene}} at {{time of day|golden hour}}, anamorphic lens, volumetric light, rich colour grading in {{palette|teal and orange}}, fine film grain, epic sense of scale. Aspect ratio {{aspect ratio|21:9}}.",
  },
  {
    id: "img-logo",
    category: "image",
    title: "Minimal logo concept",
    body: "A minimal flat vector logo for {{brand name}}, a {{type of business}}. A simple geometric mark that suggests {{idea}}, using {{colours|two colours}}, clean negative space, no text other than the brand name, centred on a white background.",
  },
  {
    id: "img-storybook",
    category: "image",
    title: "Storybook illustration",
    body: "A warm, hand-painted watercolour illustration of {{scene}} for a children's picture book. Soft pastel palette, gentle paper texture, friendly rounded characters, cosy storybook feeling. Aspect ratio {{aspect ratio|3:2}}.",
  },
  {
    id: "img-isometric",
    category: "image",
    title: "Cute isometric 3D",
    body: "An isometric 3D illustration of {{subject}}, soft clay-like materials, pastel colours, gentle studio lighting, tiny charming details, plain {{background|light grey}} background, high resolution.",
  },
  {
    id: "img-wallpaper",
    category: "image",
    title: "Phone wallpaper",
    body: "A {{style|minimal abstract}} phone wallpaper inspired by {{theme}}, smooth gradients in {{palette|deep blue and violet}}, subtle texture, calm empty space at the top for the clock. Aspect ratio 9:16.",
  },
  {
    id: "img-prompt-writer",
    category: "image",
    title: "Turn an idea into image prompts",
    body: "Act as an expert prompt writer for AI image generators. Turn my rough idea into 3 detailed image prompts. Each should cover the subject, setting, style or medium, lighting, camera angle, colour palette and aspect ratio. Keep each prompt to one paragraph.\n\nMy idea: {{idea}}",
  },

  // Productivity
  {
    id: "prod-day-plan",
    category: "productivity",
    title: "Plan my day",
    body: "Here are my tasks for today:\n{{tasks}}\n\nI have about {{hours|6}} hours of focused time. Order them by impact, estimate how long each will take, group the quick wins together, and tell me what to postpone.",
  },
  {
    id: "prod-meeting-notes",
    category: "productivity",
    title: "Meeting notes to action items",
    body: "Turn these meeting notes into:\n1. A 3-sentence summary\n2. Decisions made\n3. Action items as a table (owner, task, due date)\n4. Open questions\n\nNotes:\n{{notes}}",
  },
  {
    id: "prod-email-reply",
    category: "productivity",
    title: "Reply to an email",
    body: "Write a reply to the email below. Tone: {{tone|friendly and professional}}. Keep it under {{word limit|120}} words and make the next step clear.\n\nWhat I want to say: {{my points}}\n\nEmail:\n{{email}}",
  },
  {
    id: "prod-weekly-review",
    category: "productivity",
    title: "Weekly review coach",
    body: "Help me run my weekly review. Ask me these questions one at a time and wait for each answer: what went well, what didn't, what I learned, my top 3 priorities for next week, and one thing I should stop doing. Then sum it up as a short plan for the week.",
  },
  {
    id: "prod-project-breakdown",
    category: "productivity",
    title: "Break down a project",
    body: "Break this project down into phases, milestones and concrete next actions I can start today. Flag risks and dependencies.\n\nProject: {{project}}\nDeadline: {{deadline}}",
  },
  {
    id: "prod-decision",
    category: "productivity",
    title: "Help me decide",
    body: "Help me make this decision: {{decision}}\n\nWhat matters most to me: {{priorities}}\n\nList the options, the pros and cons of each, how they score against my priorities, and give a clear recommendation with your reasoning.",
  },
  {
    id: "prod-summary",
    category: "productivity",
    title: "Summarise anything",
    body: "Summarise the text below in {{number of points|5}} bullet points, then give the single most important takeaway in one sentence.\n\n{{text}}",
  },

  // Business
  {
    id: "biz-one-page-plan",
    category: "business",
    title: "One-page business plan",
    body: "Write a one-page business plan for {{business idea}}. Cover the problem, the solution, target customers, competitors, business model, go-to-market plan, key metrics, and the first 90 days.",
  },
  {
    id: "biz-swot",
    category: "business",
    title: "SWOT analysis",
    body: "Do a SWOT analysis for {{company or product}} in the {{market}} market. Be specific rather than generic. Then suggest 3 strategic moves that use the strengths to counter the threats.",
  },
  {
    id: "biz-pricing",
    category: "business",
    title: "Pricing strategy",
    body: "Suggest a pricing strategy for {{product}} aimed at {{customers}}. Compare 3 pricing models (for example tiers, usage-based and one-time), propose price points with your reasoning, and explain how to test them cheaply.",
  },
  {
    id: "biz-personas",
    category: "business",
    title: "Customer personas",
    body: "Create 3 detailed customer personas for {{product}}. For each: goals, pain points, objections, where they spend time online, and the message most likely to win them over.",
  },
  {
    id: "biz-pitch-deck",
    category: "business",
    title: "Pitch deck outline",
    body: "Write a 10-slide pitch deck outline for {{startup}}, which {{what it does}}. For each slide give a title, the key message, and the evidence or visual to show.",
  },
  {
    id: "biz-competitors",
    category: "business",
    title: "Competitor comparison",
    body: "Compare {{my product}} with {{competitors}} on features, pricing, target audience, strengths and weaknesses. Present it as a table, then explain where we can win and what we should not compete on.",
  },
  {
    id: "biz-negotiation",
    category: "business",
    title: "Negotiation prep",
    body: "Help me prepare for a negotiation with {{other party}} about {{topic}}. My goal: {{goal}}.\n\nGive me my best alternative if we fail to agree, the objections they are likely to raise with a response to each, and an opening script.",
  },

  // Marketing
  {
    id: "mkt-social-posts",
    category: "marketing",
    title: "Social media posts",
    body: "Write {{number of posts|5}} {{platform|LinkedIn}} posts about {{topic}} for {{audience}}. Give each a strong hook in the first line, one clear idea, and a call to action. Vary the formats.",
  },
  {
    id: "mkt-product-description",
    category: "marketing",
    title: "Product description",
    body: "Write an online store product description for {{product}}. Lead with the main benefit, follow with 3 to 5 scannable bullet points, and finish with a short closing line. Tone: {{tone|warm and confident}}.",
  },
  {
    id: "mkt-ads",
    category: "marketing",
    title: "Ad copy variations",
    body: "Write 5 ad variations for {{product}} aimed at {{audience}} on {{platform|Instagram}}. For each, give a headline under 40 characters, primary text under 125 characters, and a call to action.",
  },
  {
    id: "mkt-calendar",
    category: "marketing",
    title: "Content calendar",
    body: "Create a 4-week content calendar for {{brand}} on {{channels}}. The goal is {{goal}}. Include post ideas, formats and the best day to post each one, as a table.",
  },
  {
    id: "mkt-newsletter",
    category: "marketing",
    title: "Newsletter email",
    body: "Write a newsletter email about {{topic}} for {{audience}}. Give 3 subject line options, a preview line, and a body under 250 words with one clear call to action.",
  },
  {
    id: "mkt-seo-outline",
    category: "marketing",
    title: "SEO blog outline",
    body: 'Create an SEO-friendly blog post outline for the keyword "{{keyword}}". Include title options, a meta description under 155 characters, the H2 and H3 structure, the questions readers want answered, and ideas for internal links.',
  },

  // Writing
  {
    id: "wri-clearer",
    category: "writing",
    title: "Make it clearer",
    body: "Rewrite the text below to be clearer and more concise. Keep my voice and every fact. Then list the main changes you made.\n\n{{text}}",
  },
  {
    id: "wri-tone",
    category: "writing",
    title: "Change the tone",
    body: "Rewrite this in a {{tone|friendly}} tone for {{audience|a general audience}}, keeping the meaning the same:\n\n{{text}}",
  },
  {
    id: "wri-proofread",
    category: "writing",
    title: "Proofread",
    body: "Proofread the text below. Fix spelling, grammar and punctuation without changing the meaning or style. Show the corrected version, then a short list of the fixes.\n\n{{text}}",
  },
  {
    id: "wri-story",
    category: "writing",
    title: "Short story opening",
    body: "Write the opening scene of a {{genre|mystery}} short story about {{premise}}. Show, don't tell, end on a hook, and keep it under {{word limit|400}} words.",
  },
  {
    id: "wri-blog-post",
    category: "writing",
    title: "Blog post draft",
    body: 'Write a {{length in words|800}}-word blog post titled "{{title}}" for {{audience}}. Use short paragraphs, clear subheadings, one concrete example, and a strong conclusion.',
  },
  {
    id: "wri-headlines",
    category: "writing",
    title: "Headline ideas",
    body: "Give me 10 headline options for {{topic}}. Mix curiosity, how-to, numbered lists and bold claims, keep each under 70 characters, and mark your top 3.",
  },

  // Coding
  {
    id: "code-review",
    category: "coding",
    title: "Senior code review",
    body: "Review this {{language}} code like a senior engineer. List bugs, edge cases, security and readability issues by severity, then show an improved version.\n\n{{code}}",
  },
  {
    id: "code-explain",
    category: "coding",
    title: "Explain this code",
    body: "Explain what this code does, step by step, for someone new to {{language}}. Then point out anything surprising or risky.\n\n{{code}}",
  },
  {
    id: "code-debug",
    category: "coding",
    title: "Fix an error",
    body: "I'm getting this error:\n{{error}}\n\nIn this code:\n{{code}}\n\nExplain the most likely cause, how to confirm it, and the fix.",
  },
  {
    id: "code-tests",
    category: "coding",
    title: "Write unit tests",
    body: "Write unit tests for the code below using {{test framework}}. Cover the main paths, edge cases and error handling, and say what each test checks.\n\n{{code}}",
  },
  {
    id: "code-regex",
    category: "coding",
    title: "Build a regex",
    body: "Write a regular expression in {{language|JavaScript}} that matches {{what to match}}. Explain each part, and give examples that should and shouldn't match.",
  },
  {
    id: "code-sql",
    category: "coding",
    title: "Write a SQL query",
    body: "Write a {{database|PostgreSQL}} query that {{goal}}.\n\nTables:\n{{schema}}\n\nExplain how the query works, and suggest an index if one would help.",
  },

  // Learning
  {
    id: "learn-three-levels",
    category: "learning",
    title: "Explain it three ways",
    body: "Explain {{concept}} three ways: as if I'm five, as if I'm a curious teenager, and the way an expert would. Use one everyday analogy.",
  },
  {
    id: "learn-study-plan",
    category: "learning",
    title: "Study plan",
    body: "Create a {{number of weeks|4}}-week plan to learn {{subject}}, starting from {{level|beginner}} level, with {{hours per week|5}} hours a week. Include the topics for each week, the kind of resources to look for, and a small project to finish each week.",
  },
  {
    id: "learn-quiz",
    category: "learning",
    title: "Quiz me",
    body: "Quiz me on {{topic}}. Ask one question at a time and wait for my answer. Tell me whether I'm right and why, and make the questions harder as I improve. Start now.",
  },
  {
    id: "learn-check-understanding",
    category: "learning",
    title: "Check my understanding",
    body: "I'll explain {{concept}} in my own words. Point out gaps, mistakes, and any jargon I used without explaining, then help me fill those gaps.\n\nMy explanation: {{my explanation}}",
  },
  {
    id: "learn-language",
    category: "learning",
    title: "Language practice partner",
    body: "Let's practise {{language}} at {{level|beginner}} level. Chat with me about {{topic|everyday life}}, gently correct my mistakes after each reply, and teach me one useful new phrase each time.",
  },
  {
    id: "learn-book",
    category: "learning",
    title: "Book key ideas",
    body: 'Summarise the key ideas of the book "{{book}}" in 7 points, with one practical way to apply each in everyday life.',
  },

  // Career
  {
    id: "career-resume",
    category: "career",
    title: "Stronger resume bullets",
    body: "Rewrite these resume points as strong, results-focused bullets. Start each with an action verb and add numbers where possible. Role: {{role}}.\n\n{{experience}}",
  },
  {
    id: "career-cover-letter",
    category: "career",
    title: "Cover letter",
    body: "Write a cover letter for the {{job title}} role at {{company}}. Match my experience to the job description, keep it under 300 words, and make it sound human, not generic.\n\nJob description:\n{{job description}}\n\nMy background:\n{{background}}",
  },
  {
    id: "career-interview",
    category: "career",
    title: "Mock interview",
    body: "Act as an interviewer for a {{job title}} role. Ask me one question at a time, mixing behavioural and role-specific questions. After each answer, give honest feedback and a stronger sample answer.",
  },
  {
    id: "career-salary",
    category: "career",
    title: "Negotiate an offer",
    body: "Help me negotiate a job offer for a {{role}} position. The offer is {{offer}} and I am aiming for {{target}}. Write a polite email asking for more, and list the arguments I can use.",
  },
  {
    id: "career-linkedin-about",
    category: "career",
    title: "LinkedIn About section",
    body: "Write a LinkedIn About section for me. I'm a {{role}} who {{what I do}}. Highlight {{strengths}}. Write in the first person, keep it warm and under 200 words, and end with what I'm open to.",
  },
];

const MORE: LibraryPrompt[] = [
  {
    id: "img-character-sheet",
    category: "image",
    title: "Character reference sheet",
    body: "A full-body character design of {{character}} in a {{style|modern anime}} style. Clean line art, expressive pose, {{palette|vibrant}} colours, with front, side and back views on a plain white background, laid out as a reference sheet.",
  },
  {
    id: "img-food",
    category: "image",
    title: "Food photography",
    body: "Overhead food photography of {{dish}} on a {{surface|rustic wooden table}}. Natural side light from a window, soft shadows, a few crumbs and garnish for realism, shallow depth of field, fresh and appetising. Aspect ratio {{aspect ratio|4:5}}.",
  },
  {
    id: "img-architecture",
    category: "image",
    title: "Architectural render",
    body: "Architectural visualisation of {{building}} in {{setting}}, at {{time of day|blue hour}} with warm interior lights glowing. Wide-angle lens, straight verticals, photorealistic materials, a few people for scale. Aspect ratio {{aspect ratio|16:9}}.",
  },
  {
    id: "img-poster",
    category: "image",
    title: "Event poster",
    body: 'A bold {{style|Swiss modernist}} poster for {{event}}. A strong grid, a large headline reading "{{headline}}", a limited palette of {{palette|black, white and red}}, generous negative space, print-ready. Aspect ratio 2:3.',
  },
  {
    id: "img-edit-photo",
    category: "image",
    title: "Edit a photo naturally",
    body: "Edit the attached photo: {{changes}}. Keep the person's face, pose and the original framing exactly the same, match the existing light and colour, and make the change look natural and seamless.",
  },
  {
    id: "img-describe",
    category: "image",
    title: "Turn an image into a prompt",
    body: "Describe the attached image as a detailed prompt I could give an AI image generator to recreate it: subject, setting, composition, camera angle, lighting, colour palette, style or medium, and mood. Then give a one-line short version.",
  },
  {
    id: "prod-eisenhower",
    category: "productivity",
    title: "Urgent vs important",
    body: "Sort these tasks into an Eisenhower matrix (urgent and important, important not urgent, urgent not important, neither). Show the four lists, then tell me the 3 things to do first and what to delegate or drop.\n\n<tasks>\n{{tasks}}\n</tasks>",
  },
  {
    id: "prod-90-day-plan",
    category: "productivity",
    title: "90-day goal plan",
    body: "Turn my goal into a 90-day plan: one clear objective, 3 measurable key results, weekly milestones, and the first action I can take tomorrow. Point out anything that looks unrealistic.\n\nGoal: {{goal}}",
  },
  {
    id: "prod-sop",
    category: "productivity",
    title: "Step-by-step process guide",
    body: "Write a step-by-step guide for {{process}} that a new team member could follow on day one: the purpose, tools needed, numbered steps, common mistakes to avoid, and a final checklist.",
  },
  {
    id: "prod-unstuck",
    category: "productivity",
    title: "Get unstuck on a task",
    body: "I keep putting off {{task}}. Ask me 3 short questions, one at a time, to find out why. Then break it into a first step I can do in 10 minutes and a simple plan to finish it today.",
  },
  {
    id: "biz-exec-summary",
    category: "business",
    title: "Executive summary",
    body: "Write an executive summary of the material below for {{audience|senior leadership}}. Lead with the conclusion, then the situation, key findings, options with trade-offs, and a clear recommendation. Keep it under 250 words.\n\n<material>\n{{material}}\n</material>",
  },
  {
    id: "biz-premortem",
    category: "business",
    title: "Pre-mortem: why it could fail",
    body: "Run a pre-mortem on this plan. Imagine it's 6 months from now and it has failed. List the 7 most likely reasons, how likely and how damaging each one is, the early warning signs, and what to do now to prevent it.\n\nPlan: {{plan}}",
  },
  {
    id: "biz-interview-script",
    category: "business",
    title: "Customer interview script",
    body: "Write a 15-minute customer interview script to test {{idea}} with {{customers}}. Use open questions only and no leading ones. Focus on what they did in the past and how they solve the problem today, and add follow-up questions to dig deeper.",
  },
  {
    id: "biz-unit-economics",
    category: "business",
    title: "Check the unit economics",
    body: "Help me check the unit economics of {{business}}. Ask me for any numbers you need first. Then calculate customer acquisition cost, lifetime value, payback period and gross margin, show your working, and flag the weakest assumption.",
  },
  {
    id: "biz-decision-memo",
    category: "business",
    title: "Decision memo",
    body: "Write a one-page decision memo about {{decision}}: the context, the options we considered, the criteria, the recommendation, the risks, and what would make us change our mind.",
  },
  {
    id: "mkt-value-props",
    category: "marketing",
    title: "Value propositions",
    body: "Write 5 value propositions for {{product}} aimed at {{audience}}. Give each a headline under 10 words and one supporting line. Base them on the outcome the customer gets, not on features.",
  },
  {
    id: "mkt-landing-page",
    category: "marketing",
    title: "Landing page copy",
    body: "Write landing page copy for {{product}} for {{audience}}: a hero headline and subheading, 3 benefit sections, placeholders for social proof, an FAQ with 5 questions, and a closing call to action. Tone: {{tone|clear and confident}}.",
  },
  {
    id: "mkt-hooks",
    category: "marketing",
    title: "Short video hooks",
    body: 'Write 15 scroll-stopping opening lines for short videos about {{topic}}. Mix curiosity, bold claims, questions and "mistakes to avoid". Keep each under 12 words.',
  },
  {
    id: "mkt-brand-voice",
    category: "marketing",
    title: "Brand voice guide",
    body: "Create a brand voice guide for {{brand}}: 3 personality traits with do and don't examples, words we use and words we avoid, and one sentence rewritten in our voice as a headline, an error message and a social post.",
  },
  {
    id: "mkt-repurpose",
    category: "marketing",
    title: "Repurpose content",
    body: "Repurpose the content below into a LinkedIn post, a thread of 5 short posts, a newsletter paragraph and 3 quotable lines. Keep the key message and adapt the length and format for each.\n\n<content>\n{{content}}\n</content>",
  },
  {
    id: "wri-outline",
    category: "writing",
    title: "Detailed outline",
    body: "Create a detailed outline for {{type of piece|an article}} about {{topic}} for {{audience}}: a working title, the main point in one sentence, sections with key points and examples, and a strong ending.",
  },
  {
    id: "wri-editor-feedback",
    category: "writing",
    title: "Editor feedback",
    body: "Give me honest feedback on this draft, like a sharp editor: what works, what's unclear, where it drags, and the 3 changes that would improve it most. Don't rewrite it.\n\n<draft>\n{{draft}}\n</draft>",
  },
  {
    id: "wri-shorten",
    category: "writing",
    title: "Cut it down",
    body: "Cut this text to about {{target length|half}} its length without losing a key point or changing the tone. Then list what you removed.\n\n<text>\n{{text}}\n</text>",
  },
  {
    id: "wri-speech",
    category: "writing",
    title: "Write a speech",
    body: "Write a {{length in minutes|3}}-minute speech for {{occasion}}. Open with a story or a striking line, make one clear point with two supporting examples, and end memorably. Write it to be spoken: short sentences and a natural rhythm.",
  },
  {
    id: "code-refactor",
    category: "coding",
    title: "Refactor for readability",
    body: "Refactor this {{language}} code for readability and maintainability without changing what it does. Explain each change and why, and point out anything you weren't sure was safe to change.\n\n<code>\n{{code}}\n</code>",
  },
  {
    id: "code-architecture",
    category: "coding",
    title: "Design a system",
    body: "I'm designing {{system}}. Requirements: {{requirements}}.\n\nIf anything important is missing, ask me up to 3 questions first. Then propose an architecture: the main components and how they talk to each other, the data model, and the key trade-offs.",
  },
  {
    id: "code-commit-message",
    category: "coding",
    title: "Commit message from a diff",
    body: "Write a commit message for this diff: a summary line under 60 characters, then a short body explaining what changed and why.\n\n<diff>\n{{diff}}\n</diff>",
  },
  {
    id: "code-docs",
    category: "coding",
    title: "Document this code",
    body: "Write documentation for this {{language}} code: a short overview, how to use it with an example, the parameters and return values, and the edge cases and errors to know about.\n\n<code>\n{{code}}\n</code>",
  },
  {
    id: "code-security",
    category: "coding",
    title: "Security review",
    body: "Review this code for security issues: injection, broken authentication or authorisation, secrets in the code, unsafe input handling and data exposure. Rate each finding by severity and show the fix.\n\n<code>\n{{code}}\n</code>",
  },
  {
    id: "code-translate",
    category: "coding",
    title: "Convert to another language",
    body: "Convert this code from {{from language}} to {{to language}} using the target language's usual patterns and standard library. Note anything that doesn't translate directly.\n\n<code>\n{{code}}\n</code>",
  },
  {
    id: "res-briefing",
    category: "research",
    title: "Topic briefing",
    body: "Give me a structured briefing on {{topic}}: the key concepts, where things stand today, the main debates and open questions, and the best sources to read next. Say clearly where the evidence is strong, weak or disputed.",
  },
  {
    id: "res-compare-options",
    category: "research",
    title: "Compare options",
    body: "Compare {{options}} for {{use case}}. Use a table with the criteria that matter most, then recommend one for each type of user and explain when you'd choose differently.",
  },
  {
    id: "res-fact-check",
    category: "research",
    title: "Fact-check claims",
    body: "Fact-check the claims in the text below. For each claim give a verdict (true, false, misleading or can't verify), a short explanation, and the kind of source that would confirm it. Don't guess; say when you're unsure.\n\n<text>\n{{text}}\n</text>",
  },
  {
    id: "res-paper-summary",
    category: "research",
    title: "Explain a research paper",
    body: "Summarise this research paper for a non-specialist: the question it asks, the method, the main findings with numbers, the limitations, and what it means in practice.\n\n<paper>\n{{paper}}\n</paper>",
  },
  {
    id: "res-survey",
    category: "research",
    title: "Design a survey",
    body: "Design a short survey to learn {{what I want to learn}} from {{audience}}. Use 8 to 10 questions, mixing multiple choice and open questions, with neutral wording in a logical order. Say what each question helps us learn.",
  },
  {
    id: "res-data-insights",
    category: "research",
    title: "Find insights in data",
    body: "Analyse this data. Tell me the 5 most important insights, any patterns or outliers, and what I should look into next. Show the calculations you rely on.\n\n<data>\n{{data}}\n</data>",
  },
  {
    id: "res-steelman",
    category: "research",
    title: "Strongest case for and against",
    body: "Give me the strongest possible case for and against {{position}}, the way experts on each side would argue it. Then say which arguments are weakest on each side, and why.",
  },
  {
    id: "learn-flashcards",
    category: "learning",
    title: "Make flashcards",
    body: "Make {{number of cards|20}} flashcards on {{topic}} as question and answer pairs. Focus on the most important ideas, keep answers short, and include a few cards that test understanding rather than memory.",
  },
  {
    id: "learn-socratic",
    category: "learning",
    title: "Socratic tutor",
    body: "Teach me {{topic}} using the Socratic method. Don't give me answers directly: ask one guiding question at a time, build on what I say, and gently correct my misconceptions. Start with your first question.",
  },
  {
    id: "learn-analogies",
    category: "learning",
    title: "Understand with analogies",
    body: "Explain {{concept}} using 3 different analogies or mental models. Then give one real-world example and one common misconception about it.",
  },
  {
    id: "career-job-match",
    category: "career",
    title: "Match my resume to a job",
    body: "Compare my resume with this job description. List the requirements I clearly meet, partly meet and miss, the keywords I should add, and 3 ways to tailor my resume for this role.\n\nJob description:\n{{job description}}\n\nMy resume:\n{{resume}}",
  },
  {
    id: "career-star-answer",
    category: "career",
    title: "STAR interview answer",
    body: "Turn this experience into a strong interview answer using the STAR format (situation, task, action, result) that takes under 2 minutes to say. Make the result specific and measurable.\n\nExperience: {{experience}}",
  },
  {
    id: "career-30-60-90",
    category: "career",
    title: "30-60-90 day plan",
    body: "Write a 30-60-90 day plan for starting as a {{role}} at {{company}}: goals for each phase, the people to meet, quick wins, and how I'll measure success.",
  },
  {
    id: "pr-improve",
    category: "prompting",
    title: "Improve my prompt",
    body: "Improve the prompt below so an AI gives a much better answer. Make the goal and audience clear, add the context it needs, specify the output format and length, and add any useful constraints. Show the improved prompt, then explain what you changed.\n\n<prompt>\n{{prompt}}\n</prompt>",
  },
  {
    id: "pr-ask-first",
    category: "prompting",
    title: "Ask me questions first",
    body: "Before you answer, ask me up to 5 questions that would most improve your answer, one at a time. When you have enough, give the answer.\n\nTask: {{task}}",
  },
  {
    id: "pr-system-prompt",
    category: "prompting",
    title: "Write a system prompt",
    body: "Write a system prompt for an AI assistant that {{purpose}}. Include its role, audience and tone, what it should always and never do, how to handle unclear requests, and the output format. Use clear sections.",
  },
  {
    id: "pr-step-by-step",
    category: "prompting",
    title: "Think step by step",
    body: "{{question}}\n\nThink this through step by step before answering. First list what you know and what you need to work out, then work through it, check your result, and finish with a short final answer.",
  },
  {
    id: "pr-self-critique",
    category: "prompting",
    title: "Answer, critique, improve",
    body: "Answer the request below. Then critique your own answer: find weaknesses, missing points and possible errors. Finish with an improved final version.\n\n<request>\n{{request}}\n</request>",
  },
  {
    id: "pr-from-examples",
    category: "prompting",
    title: "Follow my examples",
    body: "Here are examples of the output I want:\n\n<examples>\n{{examples}}\n</examples>\n\nFollow the same style, structure and length to write: {{what to write}}",
  },
];

const ORDER = new Map(LIBRARY_CATEGORIES.map((c, i) => [c.key, i]));

/** All library prompts, grouped in category order. */
export const LIBRARY_PROMPTS: LibraryPrompt[] = [...FIRST_SET, ...MORE].sort(
  (a, b) => (ORDER.get(a.category) ?? 99) - (ORDER.get(b.category) ?? 99),
);
