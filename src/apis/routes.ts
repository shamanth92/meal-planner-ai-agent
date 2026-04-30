import { Router, Request, Response } from "express";
import { executeGraphWithSSE, resumeGraphWithSSE } from "./graphExecutor";
import { RecipeQuerySchema, RecipeAgentState } from "../agent/state";
import { randomUUID } from "crypto";

/**
 * API Routes for Recipe Planner
 * 
 * Endpoints:
 * - POST /recipe-plan/start - Start new recipe planning session
 * - GET /recipe-plan/stream/:threadId - Stream events for the session
 * - POST /recipe-plan/resume/:threadId - Resume execution after interrupt
 */

// Store active sessions with their initial state
interface ActiveSession {
    threadId: string;
    initialInput: typeof RecipeAgentState.State;
    startTime: Date;
    sseResponse?: Response;
}

const activeSessions = new Map<string, ActiveSession>();

const router = Router();

/**
 * POST /recipe-plan/start
 * 
 * Creates a new recipe planning session and returns threadId.
 * Client should then connect to GET /stream/:threadId for SSE events.
 * 
 * Request Body:
 * {
 *   "mode": "daily" | "weekly",
 *   "cuisines": ["Indian", "Mexican"],
 *   "goal": "weight loss",
 *   "dietary": "vegetarian",
 *   "budget": 50,
 *   "mealTime": "dinner" (optional, required for weekly)
 * }
 * 
 * Response: { threadId, sseUrl }
 */
router.post("/recipe-plan/start", async (req: Request, res: Response) => {
    try {
        // Validate request body
        const validatedQuery = RecipeQuerySchema.parse(req.body);
        
        // Generate unique thread ID for this session
        const threadId = randomUUID();
        
        console.log(`[API] Creating new session: ${threadId}`);
        console.log(`[API] Mode: ${validatedQuery.mode}, Cuisines: ${validatedQuery.cuisines.join(", ")}`);
        
        // Store session with initial input
        activeSessions.set(threadId, {
            threadId,
            initialInput: {
                recipeQuery: validatedQuery,
                meals: undefined,
                recipes: undefined,
                groceryList: undefined,
                weeklyNutrition: undefined,
                needsRegeneration: undefined,
                userFeedback: undefined
            },
            startTime: new Date()
        });
        
        // Return threadId and SSE URL
        res.status(201).json({
            threadId,
            sseUrl: `/api/recipe-plan/stream/${threadId}`,
            message: 'Session created. Connect to sseUrl to start streaming.'
        });
        
    } catch (error) {
        console.error('[API] Start error:', error);
        
        res.status(400).json({
            error: error instanceof Error ? error.message : 'Invalid request'
        });
    }
});

/**
 * GET /recipe-plan/stream/:threadId
 * 
 * Opens SSE connection and starts graph execution for the session.
 * Streams real-time events as the graph executes.
 * 
 * URL Params:
 * - threadId: Session ID from /start endpoint
 * 
 * Response: SSE stream with events
 */
router.get("/recipe-plan/stream/:threadId", async (req: Request, res: Response) => {
    try {
        const threadId = req.params.threadId as string;
        
        // Get session
        const session = activeSessions.get(threadId);
        
        if (!session) {
            return res.status(404).json({
                error: 'Session not found or expired',
                threadId
            });
        }
        
        console.log(`[API] Starting SSE stream for session: ${threadId}`);
        
        // Store SSE response in session
        session.sseResponse = res;
        
        // Handle client disconnect
        req.on('close', () => {
            console.log(`[API] Client disconnected: ${threadId}`);
            activeSessions.delete(threadId);
        });
        
        // Execute graph with SSE streaming
        const result = await executeGraphWithSSE(res, threadId, session.initialInput);
        
        // If not interrupted, session is complete - remove from active sessions
        if (!result.interrupted) {
            activeSessions.delete(threadId);
        }
        
    } catch (error) {
        console.error('[API] Stream error:', error);
        
        // If headers not sent yet, send error response
        if (!res.headersSent) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Stream failed'
            });
        } else {
            // Headers already sent (SSE started), send error event
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ 
                message: error instanceof Error ? error.message : 'Unknown error' 
            })}\n\n`);
            res.end();
        }
    }
});

/**
 * POST /recipe-plan/resume/:threadId
 * 
 * Resumes execution after interrupt with user's decision.
 * 
 * URL Params:
 * - threadId: Session ID from interrupt event
 * 
 * Request Body:
 * {
 *   "decision": "yes" | "no",
 *   "feedback": "I want more variety" (optional, required if decision is "no")
 * }
 * 
 * Response: Continues SSE stream on existing connection
 */
router.post("/recipe-plan/resume/:threadId", async (req: Request, res: Response) => {
    try {
        const threadId = req.params.threadId as string;
        const { decision, feedback } = req.body;
        
        console.log(`[API] Resume request for session: ${threadId}`);
        console.log(`[API] Decision: ${decision}, Feedback: ${feedback || 'none'}`);
        
        // Validate decision
        if (!decision || !['yes', 'no'].includes(decision)) {
            return res.status(400).json({
                error: 'Invalid decision. Must be "yes" or "no"'
            });
        }
        
        // Get active session
        const session = activeSessions.get(threadId);
        
        if (!session) {
            return res.status(404).json({
                error: 'Session not found or expired',
                threadId
            });
        }
        
        // If decision is "no", feedback is required
        if (decision === 'no' && (!feedback || feedback.trim() === '')) {
            return res.status(400).json({
                error: 'Feedback is required when decision is "no"'
            });
        }
        
        // Check if SSE connection is established
        if (!session.sseResponse) {
            return res.status(400).json({
                error: 'SSE connection not established. Connect to /stream/:threadId first.'
            });
        }
        
        // Resume graph execution on the existing SSE connection (different response object)
        // This will stream events via SSE, not via this response
        const result = await resumeGraphWithSSE(
            session.sseResponse,
            threadId,
            { decision, feedback }
        );
        
        // If execution completed, remove from active sessions
        if (!result.interrupted) {
            activeSessions.delete(threadId);
        }
        
        // Send acknowledgment to resume request (on the resume endpoint response)
        // Send this AFTER resume completes to avoid conflicts
        res.status(200).json({
            message: 'Resume completed',
            threadId,
            decision,
            interrupted: result.interrupted
        });
        
    } catch (error) {
        console.error('[API] Resume error:', error);
        
        // Only send error if we haven't sent a response yet
        if (!res.headersSent) {
            res.status(500).json({
                error: error instanceof Error ? error.message : 'Resume failed'
            });
        }
    }
});

/**
 * GET /recipe-plan/sessions
 * 
 * Get list of active sessions (for debugging)
 */
router.get("/recipe-plan/sessions", (_req: Request, res: Response) => {
    const sessions = Array.from(activeSessions.values()).map(session => ({
        threadId: session.threadId,
        startTime: session.startTime,
        duration: Date.now() - session.startTime.getTime()
    }));
    
    res.json({
        count: sessions.length,
        sessions
    });
});

export default router;