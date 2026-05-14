# Recipe Planner AI Agent

AI-powered meal planning agent with weekly/daily modes, regeneration support, and SSE streaming.

## Features

- **Weekly Mode**: Generate 7-day meal plans
- **Daily Mode**: Generate single meal suggestions
- **Smart Regeneration**: Modify specific meals while preserving others
- **Real-time Streaming**: SSE for live updates
- **Human Review**: Interrupt workflow for user approval

## Tech Stack

- Node.js + Express
- TypeScript
- LangGraph (AI workflow orchestration)
- OpenAI GPT-4o-mini
- Spoonacular API (recipe data)

## Local Development

### Prerequisites

- Node.js 18+
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```env
PORT=3000
OPENAI_API_KEY=your_openai_key
SPOONACULAR_API_KEY=your_spoonacular_key
SPOONACULAR_API_HOST=spoonacular-recipe-food-nutrition-v1.p.rapidapi.com
```

3. Run development server:
```bash
npm run dev
```

4. Test the API:
```bash
curl http://localhost:3000/health
```

## Deployment to Render

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-repo-url>
git push -u origin main
```

### 2. Create Render Web Service

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `recipe-planner-api`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free or Starter

### 3. Add Environment Variables

In Render dashboard, add these environment variables:

```
OPENAI_API_KEY=<your_key>
SPOONACULAR_API_KEY=<your_key>
SPOONACULAR_API_HOST=spoonacular-recipe-food-nutrition-v1.p.rapidapi.com
PORT=10000
```

### 4. Deploy

Click **Create Web Service**. Render will:
- Install dependencies
- Build TypeScript → JavaScript
- Start the server

Your API will be live at: `https://recipe-planner-api.onrender.com`

## API Endpoints

### Start Session
```bash
POST /api/recipe-plan/start
Content-Type: application/json

{
  "mode": "weekly",
  "cuisines": ["Indian", "Italian"],
  "goal": "weight loss",
  "dietary": "vegetarian",
  "budget": 50
}

Response: { "threadId": "...", "sseUrl": "/api/recipe-plan/stream/..." }
```

### Stream Events
```bash
GET /api/recipe-plan/stream/:threadId
Accept: text/event-stream

Events:
- connected
- node_complete
- interrupt (requires user decision)
- complete
- error
```

### Resume After Interrupt
```bash
POST /api/recipe-plan/resume/:threadId
Content-Type: application/json

{
  "decision": "yes" | "no",
  "feedback": "replace chicken tikka" (required if decision is "no")
}
```

### Health Check
```bash
GET /health

Response: { "status": "ok", "timestamp": "...", "service": "recipe-planner-api" }
```

## Architecture

```
Start → MealSuggester → MealPicker → HumanReview
                                           ↓
                                    [User Decision]
                                           ↓
                        ┌──────────────────┴──────────────────┐
                        ↓                                      ↓
                  Regenerate (loop back)              RecipeFetcher → Complete
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | Yes |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `SPOONACULAR_API_KEY` | Spoonacular API key | Yes |
| `SPOONACULAR_API_HOST` | Spoonacular API host | Yes |

## License

ISC
