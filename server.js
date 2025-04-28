import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
Write a podcast monologue on the topic: "{topic}". 
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

    const voiceId = process.env.ELEVENLABS_VOICE_ID;
    const ttsResponse = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: script,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!ttsResponse.ok) {
      throw new Error('Failed to generate audio.');
    }

    const audioBuffer = await ttsResponse.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    res.json({ script, audio: `data:audio/mpeg;base64,${base64Audio}` });

  } catch (error) {
    console.error('🔴 Error:', error.message);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
