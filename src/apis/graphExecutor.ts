import { Response } from "express";
import { graph } from "../agent/graph";
import { RecipeAgentState } from "../agent/state";
import { Command } from "@langchain/langgraph";

/**
 * Graph Executor with SSE Streaming
 * 
 * Executes the recipe planning graph and streams real-time events via SSE.
 * Handles interrupts by pausing execution and waiting for resume.
 */

// Helper to send SSE event
const sendSSEEvent = (res: Response, event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
};

// Type guard for interrupt data
interface InterruptData {
    value: {
        question: string;
        options: string[];
        meals: any[];
    };
}

export const executeGraphWithSSE = async (
    res: Response,
    threadId: string,
    initialInput: typeof RecipeAgentState.State
) => {
    try {
        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        // Send initial connection event
        sendSSEEvent(res, 'connected', { 
            threadId, 
            message: 'Connected to recipe planner stream' 
        });

        // Stream graph execution with 'updates' mode to get node names
        const stream = await graph.stream(initialInput, {
            configurable: { thread_id: threadId },
            streamMode: "updates"
        });

        // Process each step in the stream
        for await (const chunk of stream) {
            // chunk is { nodeName: { stateUpdates } }
            const nodeName = Object.keys(chunk)[0];
            const updates = (chunk as any)[nodeName];

            // Emit node completion event
            sendSSEEvent(res, 'node_complete', {
                node: nodeName,
                timestamp: new Date().toISOString(),
                updates: updates
            });
        }

        // Check if execution is interrupted or completed
        const finalState = await graph.getState({ 
            configurable: { thread_id: threadId } 
        });

        console.log('[GraphExecutor] Final state check:', {
            hasNext: finalState.next && finalState.next.length > 0,
            next: finalState.next,
            hasTasks: !!(finalState as any).tasks,
            tasksLength: (finalState as any).tasks?.length
        });

        if (finalState.next && finalState.next.length > 0) {
            // Graph is interrupted (has next nodes but paused)
            const interruptData = (finalState as any).tasks?.[0]?.interrupts?.[0] as InterruptData;
            
            console.log('[GraphExecutor] Interrupt data:', interruptData ? 'Found' : 'Not found');
            
            if (interruptData) {
                console.log('[GraphExecutor] Sending interrupt event to client');
                sendSSEEvent(res, 'interrupt', {
                    threadId,
                    question: interruptData.value.question,
                    options: interruptData.value.options,
                    meals: interruptData.value.meals,
                    timestamp: new Date().toISOString()
                });
                
                console.log('[GraphExecutor] Interrupt event sent, keeping connection open');
                // Keep connection open - don't end response
                // Client will send resume request via POST endpoint
                return { interrupted: true };
            }
        }

        // Execution completed
        sendSSEEvent(res, 'complete', {
            threadId,
            finalState: finalState.values,
            timestamp: new Date().toISOString()
        });

        res.end();
        return { interrupted: false };

    } catch (error) {
        console.error('[GraphExecutor] Error:', error);
        
        sendSSEEvent(res, 'error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        
        res.end();
        throw error;
    }
};

// Resume execution after interrupt
export const resumeGraphWithSSE = async (
    res: Response,
    threadId: string,
    resumeValue: { decision: string; feedback?: string }
) => {
    try {
        console.log('[GraphExecutor] Resuming with decision:', resumeValue.decision);
        
        // Resume from interrupt with Command and continue streaming all remaining nodes
        const stream = await graph.stream(
            new Command({ resume: resumeValue }),
            {
                configurable: { thread_id: threadId },
                streamMode: "updates"
            }
        );

        // Process all nodes including the resumed one and all subsequent nodes
        for await (const chunk of stream) {
            const nodeName = Object.keys(chunk)[0];
            const updates = (chunk as any)[nodeName];

            sendSSEEvent(res, 'node_complete', {
                node: nodeName,
                timestamp: new Date().toISOString(),
                updates: updates
            });
        }

        // Check final state
        const finalState = await graph.getState({ 
            configurable: { thread_id: threadId } 
        });

        // Check for another interrupt (regeneration loop)
        if (finalState.next && finalState.next.length > 0) {
            const interruptData = (finalState as any).tasks?.[0]?.interrupts?.[0] as InterruptData;
            
            if (interruptData) {
                sendSSEEvent(res, 'interrupt', {
                    threadId,
                    question: interruptData.value.question,
                    options: interruptData.value.options,
                    meals: interruptData.value.meals,
                    timestamp: new Date().toISOString()
                });
                
                return { interrupted: true };
            }
        }

        // Execution completed
        sendSSEEvent(res, 'complete', {
            threadId,
            finalState: finalState.values,
            timestamp: new Date().toISOString()
        });

        res.end();
        return { interrupted: false };

    } catch (error) {
        console.error('[GraphExecutor] Resume error:', error);
        
        sendSSEEvent(res, 'error', {
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
        
        res.end();
        throw error;
    }
};