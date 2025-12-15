import { VertexAI } from '@google-cloud/vertexai';

const vertexAi = new VertexAI({ project: 'test', location: 'us-central1' });
console.log('VertexAI methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(vertexAi)));

const model = vertexAi.getGenerativeModel({ model: 'gemini-pro' });
console.log('GenerativeModel methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(model)));