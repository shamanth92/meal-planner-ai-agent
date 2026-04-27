import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export const validateEnv = () => {
    const required = ['ANTHROPIC_API_KEY', 'PORT', 'SPOONACULAR_API_KEY', 'SPOONACULAR_API_HOST'];
    const missing: string[] = [];
    
    required.forEach(key => {
        if (!process.env[key]) {
            missing.push(key);
        }
    });
    
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
};

export const config = {
    get port() {
        return parseInt(process.env.PORT || '3000');
    },
    get anthropicApiKey() {
        return process.env.ANTHROPIC_API_KEY;
    },
    get spoonacularApiKey() {
        return process.env.SPOONACULAR_API_KEY;
    },
    get spoonacularApiHost() {
        return process.env.SPOONACULAR_API_HOST;
    }
};