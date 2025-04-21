import axios from "axios";
import { response } from "express";

export const getGeminiAIQuestions = async (req, res) => {
  const { theme, amount } = req.body;
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_KEY_API}`,
      {
        contents: [
          {
            parts: [
              {
                text: `Wrap each Q&A section with hashtag without newline,  Create ${amount} Q&A with topic of '${theme}' (WITHOUT IT'S LETTER OPTION) wrap question inside of curly braces for marking \nFormat:
#{Question}
[Option A]
[Option B]
(Correct Option Answer)
[Option D]#`,
              },
            ],
          },
        ],
      }
    );
    const text = response?.data?.candidates[0]?.content?.parts[0]?.text;
    console.log(text);
    res.status(200).json({
      response_code: 0,
      results: createMappedExam(text, theme),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json(err);
  }
};

function createMappedExam(data, category) {
  const result = [];
  const blocks = data
    .split("#")
    .map((b) => b.trim())
    .filter(Boolean);

  for (const block of blocks) {
    const questionMatch = block.match(/\{(.*?)\}/);
    if (!questionMatch) continue;

    const question = questionMatch[1];

    // Match all incorrect answers in [ ]
    const incorrectAnswers = [...block.matchAll(/\[(.*?)\]/g)].map((m) => m[1]);

    // Match correct answer in ( )
    const correctMatch = block.match(/\((.*?)\)/);
    const correctAnswer = correctMatch ? correctMatch[1] : "";

    result.push({
      question,
      correct_answer: correctAnswer,
      incorrect_answers: incorrectAnswers,
      type: "multiple",
      category,
      difficulty: "None",
    });
  }

  return result;
}
