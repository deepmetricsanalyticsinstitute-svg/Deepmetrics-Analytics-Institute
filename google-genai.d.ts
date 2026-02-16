declare module '@google/genai' {
    export class GoogleGenAI {
        constructor(config: { apiKey: string | undefined });
        chats: {
            create(config: { model: string; config?: any; history?: any[] }): Chat;
        };
    }
    
    export interface Chat {
        sendMessageStream(config: { message: string }): Promise<AsyncIterable<{ text: string }>>;
        sendMessage(config: { message: string }): Promise<{ text: string }>;
    }
}