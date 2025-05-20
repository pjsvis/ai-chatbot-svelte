export interface User {
	id: string;
	email: string;
	createdAt: Date;
}

export interface AuthUser {
	id: string;
	email: string;
	password: string;
}

export interface Session {
	id: string;
	userId: string;
	expiresAt: Date;
}

export interface Chat {
	id: string;
	userId: string;
	title: string;
	messages: any[]; // TODO: Define proper message type
	createdAt: Date;
	updatedAt: Date;
	visibility: 'public' | 'private';
}

export interface Message {
	id: string;
	chatId: string;
	role: 'user' | 'assistant';
	content: string;
	createdAt: Date;
}

export interface Vote {
	id: string;
	messageId: string;
	chatId: string;
	userId: string;
	value: 1 | -1;
	createdAt: Date;
}

export interface Suggestion {
	id: string;
	documentId: string;
	content: string;
	createdAt: Date;
}
