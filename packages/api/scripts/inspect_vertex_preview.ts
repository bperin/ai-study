import { VertexAI } from '@google-cloud/vertexai';

const vertexAi = new VertexAI({ project: 'test', location: 'us-central1' });
const model = vertexAi.preview.getGenerativeModel({ model: 'gemini-pro' });
console.log('GenerativeModelPreview methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(model)));