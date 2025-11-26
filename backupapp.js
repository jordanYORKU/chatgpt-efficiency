causeimport express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import OpenAI from 'openai';
import { WebSocketServer } from 'ws';
import CompSec from './model/compsec.js';
import History from './model/histories.js';
import Social from './model/social.js';
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// MongoDB Connection
mongoose.connect('mongodb+srv://vincent9_db_user:gMtOnCfIs4S3y4vZ@cluster1.ma9nq2d.mongodb.net/ChatGPT_Evaluation')
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Connection Error:', err));

// ============================================================
// QUIZ TESTING FUNCTIONS
// ============================================================

const openaiOnline = false; // CHATGPT IS DOWN SO USING RAND TO TEST

const quizStats = {
  total: 0,
  right: 0
};

// FAKE CHATGPT API 
async function getRandomAnswer() {
  const start = Date.now();

  const choices = ["a", "b", "c", "d"];
  const chatgptans = choices[Math.floor(Math.random() * choices.length)];

  const fakeDelay = Math.floor(Math.random() * 300) + 50;
  await new Promise(res => setTimeout(res, fakeDelay));

  const operationTime = Date.now() - start;

  return { chatgptans, operationTime }; 
}

// ChatGPT answer generator (when openaiOnline is true)
const openai = new OpenAI({
  apiKey: "" 
});

async function getChatGPTAnswer(questionText, a, b, c, d, domain) {
  const start = Date.now();
  const prompt = `
Answer this multiple-choice question.
Respond with only one letter (a, b, c, or d).
Question: ${questionText}
Options:
a) ${a}
b) ${b}
c) ${c}
d) ${d}
Domain: ${domain}
`;
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0
  });
  const chatgptans = response.choices[0].message.content.trim().toLowerCase();
  const operationTime = Date.now() - start;
  return {chatgptans, operationTime};
}

// Validate ChatGPT response is a single letter (a, b, c, or d)
function validateChatGPTResponse(response) {
  const validAnswers = ['a', 'b', 'c', 'd','e', 'f'];
  const cleanResponse = response.trim().toLowerCase();
  
  // Check if it's exactly one character and is valid
  if (cleanResponse.length !== 1 || !validAnswers.includes(cleanResponse)) {
    return false;
  }
  return true;
}

// declare wss so other functions can broadcast
// will be assigned after HTTP server is created
let wss = null;

// wss broadcast from inside askQuestion
async function askQuestion(questionText, a, b, c, d, correctAnswer, chatgptans, operationTime) {
  chatgptans = chatgptans.toLowerCase();
  correctAnswer = correctAnswer.toLowerCase();
  quizStats.total++;
  console.log(`Q: ${questionText}`);
 
  let correct = false;
  const answerSource = openaiOnline ? "ChatGPT" : "Random";
  
  if (chatgptans === correctAnswer) {
    quizStats.right++;
    correct = true;
    console.log(`${answerSource} Ans: ${chatgptans.toUpperCase()} ✅`);
    console.log(`Operation Time: ${operationTime}ms`);
  } else {
    console.log(`${answerSource} Ans: ${chatgptans.toUpperCase()} ❌ (Correct: ${correctAnswer.toUpperCase()})`);
    console.log(`Operation Time: ${operationTime}ms`);
    correct = false;
  }

  // Broadcast to connected websocket clients (if any)
  if (wss) {
    try {
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            type: 'result',
            question: questionText,
            answer: chatgptans,
            correct,
            responseTime: operationTime
          }));
        }
      });
    } catch (err) {
      console.error('Broadcast error:', err);
    }
  }

  // ans to db
  try {
    const savedAnswer = await Answer.create({
      questionName: questionText,
      correctBoolean: correct,
      responseTimeMs: operationTime,
      domain: domain
    });
    console.log('Saved answer successfully');

    if (wss) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'db',
            message: 'Saved answer to DB'
          }));
        }
      });
    }
  } catch (err) {
    console.error('Error: ', err);
  }

  //q to db
  try {
    const savedQuestion = await Question.create({
      question: questionText,
      answer: correctAnswer,
      a: a,
      b: b,
      c: c,
      d: d,
      domain: domain
    });
    console.log('Saved question successfully');
  } catch (err) {
    console.error('Error saving question', err);
  }

  console.log(`Score so far → Right: ${quizStats.right}, Total: ${quizStats.total}\n`);
}

// ============================================================
// API ENDPOINTS
// ============================================================

// POST /api/ask - Main endpoint for submitting questions
app.post('/api/ask', async (req, res) => {
  try {
    const { question, a, b, c, d, correctAnswer } = req.body;

    // inform client of new job
    if (wss) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'update',
            message: `Received question: ${question}`
          }));
        }
      });
    }
    
    let result;
    if (openaiOnline) {
      // broadcast sending to ChatGPT
      if (wss) {
        wss.clients.forEach(client => client.readyState === 1 && client.send(JSON.stringify({
          type: 'update',
          message: `Sending question to ChatGPT...`
        })));
      }

      result = await getChatGPTAnswer(question, a, b, c, d);
      
      // Validate ChatGPT response
      if (!validateChatGPTResponse(result.chatgptans)) {
        return res.status(400).json({ 
          error: 'Invalid ChatGPT response - must be a single letter (a, b, c, or d)',
          receivedResponse: result.chatgptans
        });
      }
    } else {
      // broadcast random answer simulation
      if (wss) {
        wss.clients.forEach(client => client.readyState === 1 && client.send(JSON.stringify({
          type: 'update',
          message: `Using simulated ChatGPT (random answer)...`
        })));
      }
      result = await getRandomAnswer();
    }
    
    const { chatgptans, operationTime } = result;
    
    // broadcast the received answer to client
    if (wss) {
      wss.clients.forEach(client => {
        if (client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'answer',
            message: `Answer: ${chatgptans.toUpperCase()} (Response time: ${operationTime}ms)`
          }));
        }
      });
    }

    // Call your askQuestion to save to DB and perform the scoring logic
    await askQuestion(question, a, b, c, d, correctAnswer, chatgptans, operationTime);

    // Return result to frontend
    res.json({
      answer: chatgptans,
      isCorrect: chatgptans === correctAnswer.toLowerCase(),
      responseTime: operationTime
    });
  } catch (error) {
    console.error('Error in /api/ask:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

// GET /api/add - Middleware validation demo (required by assignment)
app.get('/api/add', (req, res) => {
  const a = parseInt(req.query.a);
  const b = parseInt(req.query.b);
  
  if (isNaN(a) || isNaN(b)) {
    return res.status(400).json({ error: 'Invalid inputs - a and b must be numbers' });
  }
  
  res.json({ result: a + b });
});

// GET /api/results - Get correct/incorrect counts
app.get('/api/results', async (req, res) => {
  try {
    const correctData = await Answer.countDocuments({ correctBoolean: true });
    const falseData = await Answer.countDocuments({ correctBoolean: false });

    res.json({
      correct: correctData,
      false: falseData
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

// ============================================================
// START SERVER (with WebSocket)
// ============================================================

import { createServer } from 'http';
const server = createServer(app);

// Create WebSocket server bound to same HTTP server
wss = new WebSocketServer({ server });

// Add this debug logging:
console.log('WebSocket server created and ready');

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connected', message: 'Connected to live updates' }));
});

wss.on('error', (error) => {
  console.error('❌ WebSocket server error:', error);
});

// helper: broadcast JSON objects to every client
function broadcast(data) {
  if (!wss) return;
  const str = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(str);
    }
  });
}

// expose broadcast helper on wss
wss.broadcast = broadcast;

// Start listening
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server (HTTP + WebSocket) running on port ${PORT}`);
});