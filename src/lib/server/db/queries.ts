import { genSaltSync, hashSync } from 'bcrypt-ts';
import { ResultAsync, ok, safeTry } from 'neverthrow';
import type { DbError } from '$lib/errors/db';
import { DbInternalError } from '$lib/errors/db';
import type { User, Chat, Message, Session, AuthUser, Vote, Suggestion } from './schema';
import ms from 'ms';

// In-memory storage
const users = new Map<string, AuthUser>();
const chats = new Map<string, Chat>();
const messages = new Map<string, Message[]>();
const sessions = new Map<string, Session>();
const votes = new Map<string, Vote[]>();
const suggestions = new Map<string, Suggestion[]>();

export function getAuthUser(email: string): ResultAsync<AuthUser, DbError> {
	return safeTry(async function* () {
		const user = users.get(email);
		if (!user) {
			throw new DbInternalError({ cause: new Error('User not found') });
		}
		return user;
	});
}

export function getUser(email: string): ResultAsync<User, DbError> {
	return safeTry(async function* () {
		const user = users.get(email);
		if (!user) {
			throw new DbInternalError({ cause: new Error('User not found') });
		}
		const { password: _, ...rest } = user;
		return rest;
	});
}

export function createAuthUser(email: string, password: string): ResultAsync<AuthUser, DbError> {
	return safeTry(async function* () {
		const salt = genSaltSync(10);
		const hash = hashSync(password, salt);
		const user: AuthUser = {
			id: crypto.randomUUID(),
			email,
			password: hash
		};
		users.set(email, user);
		return user;
	});
}

export function createSession(value: Session): ResultAsync<Session, DbError> {
	return safeTry(async function* () {
		sessions.set(value.id, value);
		return value;
	});
}

export function getFullSession(sessionId: string): ResultAsync<{ session: Session; user: User }, DbError> {
	return safeTry(async function* () {
		const session = sessions.get(sessionId);
		if (!session) {
			throw new DbInternalError({ cause: new Error('Session not found') });
		}
		const user = users.get(session.userId);
		if (!user) {
			throw new DbInternalError({ cause: new Error('User not found') });
		}
		const { password: _, ...userWithoutPassword } = user;
		return { session, user: userWithoutPassword };
	});
}

export function deleteSession(sessionId: string): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		sessions.delete(sessionId);
		return ok(undefined);
	});
}

export function extendSession(sessionId: string): ResultAsync<Session, DbError> {
	return safeTry(async function* () {
		const session = sessions.get(sessionId);
		if (!session) {
			throw new DbInternalError({ cause: new Error('Session not found') });
		}
		session.expiresAt = new Date(Date.now() + ms('30d'));
		sessions.set(sessionId, session);
		return session;
	});
}

export function deleteSessionsForUser(userId: string): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		for (const [id, session] of sessions.entries()) {
			if (session.userId === userId) {
				sessions.delete(id);
			}
		}
		return ok(undefined);
	});
}

export function saveChat({ id, userId, title }: { id: string; userId: string; title: string }): ResultAsync<Chat, DbError> {
	return safeTry(async function* () {
		const chat: Chat = {
			id,
			userId,
			title,
			createdAt: new Date(),
			visibility: 'private'
		};
		chats.set(id, chat);
		return chat;
	});
}

export function deleteChatById({ id }: { id: string }): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		chats.delete(id);
		messages.delete(id);
		votes.delete(id);
		return ok(undefined);
	});
}

export function getChatsByUserId({ id }: { id: string }): ResultAsync<Chat[], DbError> {
	return safeTry(async function* () {
		return Array.from(chats.values()).filter(chat => chat.userId === id);
	});
}

export function getChatById({ id }: { id: string }): ResultAsync<Chat, DbError> {
	return safeTry(async function* () {
		const chat = chats.get(id);
		if (!chat) {
			throw new DbInternalError({ cause: new Error('Chat not found') });
		}
		return chat;
	});
}

export function saveMessages({ messages: newMessages }: { messages: Message[] }): ResultAsync<void, DbError> {
	return safeTry(async function* () {
		for (const message of newMessages) {
			const chatMessages = messages.get(message.chatId) || [];
			chatMessages.push(message);
			messages.set(message.chatId, chatMessages);
		}
	});
}

export function getMessagesByChatId({ id }: { id: string }): ResultAsync<Message[], DbError> {
	return safeTry(async function* () {
		return messages.get(id) || [];
	});
}

export function voteMessage({ chatId, messageId, type }: { chatId: string; messageId: string; type: 'up' | 'down' }): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		const chatVotes = votes.get(chatId) || [];
		const existingVoteIndex = chatVotes.findIndex(v => v.messageId === messageId);
		if (existingVoteIndex >= 0) {
			chatVotes[existingVoteIndex].value = type === 'up' ? 1 : -1;
		} else {
			chatVotes.push({
				id: crypto.randomUUID(),
				chatId,
				messageId,
				userId: '', // TODO: Add user ID when implementing user authentication
				value: type === 'up' ? 1 : -1,
				createdAt: new Date()
			});
		}
		votes.set(chatId, chatVotes);
		return ok(undefined);
	});
}

export function getVotesByChatId({ id }: { id: string }): ResultAsync<Vote[], DbError> {
	return safeTry(async function* () {
		return votes.get(id) || [];
	});
}

export function saveSuggestions({ suggestions: newSuggestions }: { suggestions: Suggestion[] }): ResultAsync<Suggestion[], DbError> {
	return safeTry(async function* () {
		for (const suggestion of newSuggestions) {
			const docSuggestions = suggestions.get(suggestion.documentId) || [];
			docSuggestions.push(suggestion);
			suggestions.set(suggestion.documentId, docSuggestions);
		}
		return newSuggestions;
	});
}

export function getSuggestionsByDocumentId({ documentId }: { documentId: string }): ResultAsync<Suggestion[], DbError> {
	return safeTry(async function* () {
		return suggestions.get(documentId) || [];
	});
}

export function getMessageById({ id }: { id: string }): ResultAsync<Message, DbError> {
	return safeTry(async function* () {
		for (const chatMessages of messages.values()) {
			const message = chatMessages.find(m => m.id === id);
			if (message) {
				return message;
			}
		}
		throw new DbInternalError({ cause: new Error('Message not found') });
	});
}

export function deleteMessagesByChatIdAfterTimestamp({ chatId, timestamp }: { chatId: string; timestamp: Date }): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		const chatMessages = messages.get(chatId) || [];
		const filteredMessages = chatMessages.filter(m => m.createdAt < timestamp);
		messages.set(chatId, filteredMessages);
		return ok(undefined);
	});
}

export function deleteTrailingMessages({ id }: { id: string }): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		const chatMessages = messages.get(id) || [];
		const lastUserMessageIndex = [...chatMessages].reverse().findIndex(m => m.role === 'user');
		if (lastUserMessageIndex >= 0) {
			const cutoffIndex = chatMessages.length - lastUserMessageIndex;
			messages.set(id, chatMessages.slice(0, cutoffIndex));
		}
		return ok(undefined);
	});
}

export function updateChatVisiblityById({ chatId, visibility }: { chatId: string; visibility: 'private' | 'public' }): ResultAsync<undefined, DbError> {
	return safeTry(async function* () {
		const chat = chats.get(chatId);
		if (!chat) {
			throw new DbInternalError({ cause: new Error('Chat not found') });
		}
		chat.visibility = visibility;
		chats.set(chatId, chat);
		return ok(undefined);
	});
}
