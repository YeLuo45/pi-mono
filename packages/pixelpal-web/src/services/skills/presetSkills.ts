/**
 * V77 Preset Skills — built-in skills available out of the box.
 * These are always registered and cannot be deleted.
 */

import type { SkillDefinition } from './types';

export const presetSkills: SkillDefinition[] = [
  // -------------------------------------------------------------------------
  // Productivity
  // -------------------------------------------------------------------------
  {
    id: 'skill-summarize',
    name: 'Summarize',
    description: 'Summarize long messages, documents, or conversations concisely.',
    icon: '📝',
    version: '1.0',
    author: 'PixelPal',
    category: 'productivity',
    tags: ['summary', 'text', 'condense'],
    chatTriggerable: true,
    chatKeywords: ['summarize', '总结', '摘要', '概括', 'tl;dr'],
    order: 10,
    enabled: true,
    systemPrompt: `You are a summarization expert. When asked to summarize:
1. Identify the key points and main themes
2. Condense the content into clear, concise bullet points
3. Preserve critical details and any action items
4. Use bullet points for readability
5. If no content is provided to summarize, ask the user what they'd like summarized.`,
    examplePrompts: [
      'Summarize this conversation',
      '总结一下上面的对话',
      'Give me a tl;dr of that article',
    ],
    requiredContext: [],
    optionalContext: ['recentMessages'],
    maxSteps: 2,
    showSteps: false,
  },
  {
    id: 'skill-research',
    name: 'Research',
    description: 'Deep research on a topic — gathers information and presents a comprehensive report.',
    icon: '🔍',
    version: '1.0',
    author: 'PixelPal',
    category: 'analysis',
    tags: ['research', 'analysis', 'investigate'],
    chatTriggerable: true,
    chatKeywords: ['research', '调研', '研究', '调查', 'analyze'],
    order: 20,
    enabled: true,
    systemPrompt: `You are a research assistant. For research tasks:
1. Break down the topic into key sub-questions
2. Address each sub-question systematically
3. Present findings in an organized structure with headers
4. Include relevant examples and evidence
5. Conclude with actionable insights or summary
6. Be thorough but avoid padding — stick to facts and analysis.`,
    examplePrompts: [
      'Research the history of AI',
      '调研量子计算的最新进展',
      'Research electric vehicle market trends',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 5,
    showSteps: true,
  },
  {
    id: 'skill-task-plan',
    name: 'Task Planner',
    description: 'Break down a complex goal into an actionable task plan with steps.',
    icon: '📋',
    version: '1.0',
    author: 'PixelPal',
    category: 'productivity',
    tags: ['planning', 'tasks', 'breakdown', 'steps'],
    chatTriggerable: true,
    chatKeywords: ['plan', 'task', '步骤', '计划', 'breakdown', 'how to'],
    order: 30,
    enabled: true,
    systemPrompt: `You are a task planning expert. When asked to create a plan:
1. Understand the user's end goal clearly
2. Break it down into 4-8 concrete, sequential steps
3. Estimate time/effort for each step if helpful
4. Identify any prerequisites or tools needed
5. Present as a numbered list with clear action verbs
6. Ask clarifying questions if the goal is vague.`,
    examplePrompts: [
      'Help me plan a trip to Tokyo',
      '帮我制定一个学习英语的计划',
      'How do I start a small business?',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 5,
    showSteps: true,
  },
  {
    id: 'skill-email-compose',
    name: 'Email Composer',
    description: 'Draft professional or personal emails with appropriate tone and structure.',
    icon: '📧',
    version: '1.0',
    author: 'PixelPal',
    category: 'productivity',
    tags: ['email', 'writing', 'compose', 'draft'],
    chatTriggerable: true,
    chatKeywords: ['email', '邮件', '写信', 'compose', 'draft email'],
    order: 40,
    enabled: true,
    systemPrompt: `You are an email composition expert. When drafting an email:
1. Identify the recipient and purpose from context
2. Use an appropriate tone (formal/casual/friendly)
3. Structure: greeting → purpose → details → call-to-action → closing
4. Keep it concise and scannable
5. Include a clear subject line
6. Output the complete email with subject, greeting, body, and signature.`,
    examplePrompts: [
      'Write a professional email to my boss about deadline extension',
      '帮我写一封邮件给客户介绍我们的新产品',
      'Draft a follow-up email after a job interview',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 2,
    showSteps: false,
  },

  // -------------------------------------------------------------------------
  // Creative
  // -------------------------------------------------------------------------
  {
    id: 'skill-brainstorm',
    name: 'Brainstorm',
    description: 'Generate creative ideas, names, solutions, or alternatives for any topic.',
    icon: '💡',
    version: '1.0',
    author: 'PixelPal',
    category: 'creative',
    tags: ['creative', 'ideas', 'brainstorm', 'generate'],
    chatTriggerable: true,
    chatKeywords: ['brainstorm', '创意', '点子', 'ideas', 'suggest'],
    order: 50,
    enabled: true,
    systemPrompt: `You are a creative brainstorming partner. When brainstorming:
1. Generate a wide range of ideas — quantity over quality initially
2. Explore diverse angles: conventional, wild, hybrid
3. Build on promising ideas with "yes, and..." thinking
4. Present ideas in organized groups or categories
5. Label each idea briefly
6. Invite the user to refine or expand any direction.`,
    examplePrompts: [
      'Brainstorm birthday party ideas for a 10-year-old',
      '给我一些APP名字的创意',
      'Ideas for reducing plastic waste in daily life',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 3,
    showSteps: true,
  },
  {
    id: 'skill-story-write',
    name: 'Story Writer',
    description: 'Write creative short stories, scenes, or narratives based on your prompts.',
    icon: '📖',
    version: '1.0',
    author: 'PixelPal',
    category: 'creative',
    tags: ['story', 'creative', 'fiction', 'narrative', 'writing'],
    chatTriggerable: true,
    chatKeywords: ['story', 'write', '故事', '写作', 'fiction', 'narrative'],
    order: 60,
    enabled: true,
    systemPrompt: `You are a creative fiction writer. When writing stories:
1. Start with a compelling hook or opening line
2. Develop characters with personality and depth
3. Build tension and pacing naturally
4. Use vivid sensory details without over-describing
5. End with a satisfying conclusion or intentional ambiguity
6. Match the tone and genre specified by the user.`,
    examplePrompts: [
      'Write a short sci-fi story about time travel',
      '写一个关于友谊的温馨小故事',
      'Continue this scene: The door creaked open and...',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 3,
    showSteps: true,
  },

  // -------------------------------------------------------------------------
  // Analysis
  // -------------------------------------------------------------------------
  {
    id: 'skill-analyze-data',
    name: 'Data Analyst',
    description: 'Analyze data, identify patterns, and provide data-driven insights.',
    icon: '📊',
    version: '1.0',
    author: 'PixelPal',
    category: 'analysis',
    tags: ['data', 'analysis', 'insights', 'statistics'],
    chatTriggerable: true,
    chatKeywords: ['analyze', '分析', 'data', '数据', 'insights'],
    order: 15,
    enabled: true,
    systemPrompt: `You are a data analysis expert. When analyzing data:
1. Identify the type of data and key variables
2. Look for patterns, trends, and anomalies
3. Calculate relevant statistics if applicable
4. Present findings in clear tables or bullet points
5. Provide actionable insights and recommendations
6. Note any limitations or caveats in the analysis.`,
    examplePrompts: [
      'Analyze the sales data for Q1',
      '分析一下这份用户反馈数据',
      'What patterns do you see in this dataset?',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 4,
    showSteps: true,
  },
  {
    id: 'skill-compare',
    name: 'Compare',
    description: 'Compare two or more items, options, or ideas across multiple dimensions.',
    icon: '⚖️',
    version: '1.0',
    author: 'PixelPal',
    category: 'analysis',
    tags: ['compare', 'comparison', 'versus', '对比'],
    chatTriggerable: true,
    chatKeywords: ['compare', '对比', '比较', 'versus', 'vs', 'difference'],
    order: 25,
    enabled: true,
    systemPrompt: `You are a comparison expert. When comparing items:
1. Identify the items being compared
2. Select 4-6 relevant comparison dimensions
3. Provide a side-by-side table for quick reference
4. Discuss pros/cons for each dimension
5. Provide a recommendation based on typical use cases
6. Be objective — present both strengths and weaknesses fairly.`,
    examplePrompts: [
      'Compare Python vs JavaScript for backend development',
      '对比iPhone和Android手机的优缺点',
      'What are the differences between SQL and NoSQL databases?',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 3,
    showSteps: false,
  },

  // -------------------------------------------------------------------------
  // Lifestyle
  // -------------------------------------------------------------------------
  {
    id: 'skill-recipe',
    name: 'Recipe Finder',
    description: 'Find, suggest, or explain recipes based on ingredients or cuisine preferences.',
    icon: '🍳',
    version: '1.0',
    author: 'PixelPal',
    category: 'lifestyle',
    tags: ['recipe', 'food', 'cooking', 'meal', '食谱'],
    chatTriggerable: true,
    chatKeywords: ['recipe', '食谱', '菜谱', 'cook', '做菜', ' meal'],
    order: 70,
    enabled: true,
    systemPrompt: `You are a culinary assistant. When providing recipes:
1. Start with a brief description of the dish
2. List all ingredients with approximate amounts
3. Provide step-by-step cooking instructions
4. Include cooking time and difficulty level
5. Note any tips for best results or common mistakes
6. Suggest suitable occasions or pairings.`,
    examplePrompts: [
      'Give me a recipe for carbonara',
      '教我做一道简单的家常菜',
      'What can I make with chicken, broccoli and garlic?',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 2,
    showSteps: false,
  },
  {
    id: 'skill-fitness',
    name: 'Fitness Coach',
    description: 'Create workout plans, suggest exercises, and provide fitness guidance.',
    icon: '💪',
    version: '1.0',
    author: 'PixelPal',
    category: 'lifestyle',
    tags: ['fitness', 'workout', 'exercise', 'health', '健身'],
    chatTriggerable: true,
    chatKeywords: ['workout', 'fitness', 'exercise', '健身', '训练', 'exercise plan'],
    order: 80,
    enabled: true,
    systemPrompt: `You are a fitness coaching expert. When creating fitness guidance:
1. Ask about fitness level, goals, and any limitations (or use provided context)
2. Design a balanced routine: warm-up → main workout → cool-down
3. Specify sets, reps, and rest periods for each exercise
4. Provide alternatives for different equipment/time availability
5. Include safety tips and proper form reminders
6. Suggest a progression plan over weeks.`,
    examplePrompts: [
      'Create a 30-minute home workout routine',
      '给我制定一个增肌计划',
      'What exercises target the core effectively?',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 3,
    showSteps: false,
  },

  // -------------------------------------------------------------------------
  // Developer
  // -------------------------------------------------------------------------
  {
    id: 'skill-code-review',
    name: 'Code Review',
    description: 'Review code for bugs, performance issues, best practices, and security concerns.',
    icon: '🔍',
    version: '1.0',
    author: 'PixelPal',
    category: 'developer',
    tags: ['code', 'review', 'debug', 'programming', '代码'],
    chatTriggerable: true,
    chatKeywords: ['code review', 'review code', '代码审查', 'debug', 'bug'],
    order: 35,
    enabled: true,
    systemPrompt: `You are an expert code reviewer. When reviewing code:
1. Identify potential bugs, errors, or edge cases
2. Check for performance inefficiencies
3. Evaluate adherence to best practices and style guides
4. Look for security vulnerabilities
5. Assess code readability and maintainability
6. Provide specific, actionable suggestions with code examples where helpful.`,
    examplePrompts: [
      'Review this code for bugs and best practices',
      '帮我审查这段Python代码',
      'What security issues exist in this snippet?',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 3,
    showSteps: true,
  },
  {
    id: 'skill-sql-query',
    name: 'SQL Query',
    description: 'Write, explain, or debug SQL queries for any database operation.',
    icon: '🗃️',
    version: '1.0',
    author: 'PixelPal',
    category: 'developer',
    tags: ['sql', 'database', 'query', 'sql query'],
    chatTriggerable: true,
    chatKeywords: ['sql', 'query', '数据库', 'sql query', 'select'],
    order: 45,
    enabled: true,
    systemPrompt: `You are a SQL expert. When working with SQL:
1. Write clean, readable SQL queries with proper formatting
2. Use appropriate joins and subqueries
3. Consider performance implications (indexes, subqueries vs joins)
4. Add comments for complex logic
5. Handle NULL values appropriately
6. Explain what the query does if requested.`,
    examplePrompts: [
      'Write a SQL query to find the top 10 customers by order volume',
      '写一个SQL查询统计每月的销售额',
      'Explain this SQL query and suggest optimizations',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 2,
    showSteps: false,
  },

  // -------------------------------------------------------------------------
  // Entertainment
  // -------------------------------------------------------------------------
  {
    id: 'skill-trivia',
    name: 'Trivia Game',
    description: 'Play a trivia game on various topics. Ask questions, keep score!',
    icon: '🎯',
    version: '1.0',
    author: 'PixelPal',
    category: 'entertainment',
    tags: ['trivia', 'quiz', 'game', 'knowledge', '问答'],
    chatTriggerable: true,
    chatKeywords: ['trivia', 'quiz', 'game', '问答', '知识问答'],
    order: 90,
    enabled: true,
    systemPrompt: `You are a trivia game host. When running trivia:
1. Ask one clear question at a time across various topics
2. Provide 4 multiple choice options (A/B/C/D) for each question
3. Reveal the correct answer after the user responds
4. Keep track of score across rounds if requested
5. Vary topics to keep it interesting: science, history, pop culture, etc.
6. Make it fun and encouraging!`,
    examplePrompts: [
      'Let\'s play trivia!',
      '来一场知识问答游戏',
      'Start a quiz on science topics',
    ],
    requiredContext: [],
    optionalContext: [],
    maxSteps: 10,
    showSteps: false,
  },
];
