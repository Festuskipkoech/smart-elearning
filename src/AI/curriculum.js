export const CURRICULLUM_PROMPT = (topic) => `
Create a structured learning path for a student wanting to learn about ${topic}. 
Format as JSON with this structure:
{
  "title": "Course Title",
  "steps": [
    {
      "type": "explanation|examples",
      "content": "Main content",
      "question": "(for quizzes)",
      "answer": "(correct answer)"
    }
  ]
}

Include:
1. 5-8 sequential steps mixing explanations and interactions
2. Progressively complex concepts
3. Key fundamental concepts first
4. Quizzes to verify understanding
5. Practical activities

`