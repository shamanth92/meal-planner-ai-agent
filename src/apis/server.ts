import express from "express";
import cors from "cors";
import { config } from "../config/env";
import routes from "./routes";  

const app = express();

app.use(cors({
    origin: "*",
    credentials: true
}));

app.use(express.json());

// Use API routes
app.use("/api", routes);  

app.get("/health", (_req, res) => {
    res.json({ 
        status: "ok", 
        timestamp: new Date().toISOString(),
        service: "recipe-planner-api"
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 Recipe Planner API running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🍳 Recipe planner: http://localhost:${PORT}/api/recipe-plan/start`);
});

export default app;