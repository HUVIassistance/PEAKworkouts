import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { generateWorkoutWithGemini } from './src/server/workoutGenerator.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// API route to generate workout with Gemini
app.post('/api/generate-workout', async (req, res) => {
  try {
    const workout = await generateWorkoutWithGemini(req.body);
    res.json(workout);
  } catch (error: any) {
    console.error('Error generating workout:', error);
    res.status(500).json({ error: error.message || 'Impossible de générer le workout' });
  }
});

// Serve frontend assets
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(Number(PORT) || 3000, '0.0.0.0', () => {
  console.log(`TitanPulse Workout server listening on port ${PORT}`);
});
