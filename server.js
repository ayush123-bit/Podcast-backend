import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { exec } from 'child_process';
import say from 'say';
import fs from 'fs';
import path from 'path';

dotenv.config();
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/generate', async (req, res) => {
  const { topic } = req.body;
  console.log('🔵 Received topic:', topic);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `
Write a podcast monologue on the topic: "${topic}". 

Keep the length limited to about 300 words.

It should sound like a natural host talking directly to the audience, without using any speaker labels like "Host:", and without any directions like "(music fades)" or "(laughs)". 

Only focus on the content of the talk itself. 

The style should be casual, engaging, and conversational, as if the host is speaking freely and telling a story, including examples, questions, and smooth transitions.

Do not include any formatting, brackets, or stage directions — just pure spoken words as they would sound in a real podcast.
`;
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const script = response.text();

    console.log('🟢 Generated script snippet:', script.substring(0, 100), '...');

    // Say.js doesn't natively save audio — we'll use a little trick using OS commands
    const outputFilePath = path.join('./', 'output.wav');

    // Use say.speak to play and record (Windows/Mac only)
    say.export(script, null, 1.0, outputFilePath, (err) => {
      if (err) {
        console.error('🔴 Say.js error:', err);
        return res.status(500).json({ error: 'Failed to generate audio.' });
      }

      // Read the file and send base64
      fs.readFile(outputFilePath, (err, audioData) => {
        if (err) {
          console.error('🔴 File Read Error:', err);
          return res.status(500).json({ error: 'Failed to read audio file.' });
        }

        const base64Audio = audioData.toString('base64');
        res.json({ script, audio: `data:audio/wav;base64,${base64Audio}` });

        // Optionally delete the file afterward
        fs.unlink(outputFilePath, (err) => {
          if (err) console.error('⚠️ Failed to delete temp audio:', err);
        });
      });
    });

  } catch (error) {
    console.error('🔴 Error:', error.message);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
