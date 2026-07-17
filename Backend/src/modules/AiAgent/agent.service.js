import agentRepository from './agent.repository.js';
import prisma from '../../database/prismaClient.js';
import AppError from '../../utils/AppError.js';
import { AgentErrorCodes } from './agent.constants.js';
import {
    checkAgentHealth,
    sendAgentMessage,
    streamAgentMessage,
    stopPythonAgent,
    getPythonSessionHistory,
} from './agent.proxy.js';

const resolveAssistantId = async (assistantId) => {
    if (assistantId) return assistantId;

    let assistant = await prisma.aiAssistant.findFirst({
        orderBy: { createdAt: 'asc' },
        select: { id: true },
    });

    if (!assistant) {
        // Keep agent creation available in fresh DBs by bootstrapping a default assistant.
        const defaultName = 'Hackract Default Assistant';
        const created = await prisma.aiAssistant.upsert({
            where: { name: defaultName },
            update: { isActive: true },
            create: {
                name: defaultName,
                model: process.env.AI_AGENT_DEFAULT_MODEL || 'gpt-4o-mini',
                systemPrompt: 'You are Hackract\'s default AI assistant for pentest workflow support.',
                capabilities: ['chat', 'workflow-support'],
                isActive: true,
            },
            select: { id: true },
        });
        assistant = created;
    }

    if (!assistant) {
        throw new AppError(
            'No AI assistant configured. Ask an admin to create one.',
            503,
            AgentErrorCodes.SERVICE_UNAVAILABLE,
        );
    }
    return assistant.id;
};

const assertAgentOwner = (agent, userId) => {
    if (!agent) throw new AppError('Agent session not found', 404, AgentErrorCodes.NOT_FOUND);
    if (userId && agent.userId !== userId) {
        throw new AppError('Agent session not found', 404, AgentErrorCodes.NOT_FOUND);
    }
};

const appendMessage = (existing, role, content) => {
    const list = Array.isArray(existing) ? [...existing] : [];
    list.push({ role, content, ts: new Date().toISOString() });
    return list;
};

export const createAgentSession = async (data) => {
    const assistantId = await resolveAssistantId(data.assistantId);
    const agent = await agentRepository.createAgent({ ...data, assistantId });

    try {
        await checkAgentHealth();
    } catch (err) {
        console.warn(`AI Agent service unreachable at create: ${err.message}`);
    }

    return agent;
};

export const getAgentSession = async (id, userId) => {
    const agent = await agentRepository.findById(id);
    assertAgentOwner(agent, userId);
    return agent;
};

export const updateAgentSession = async (id, data, userId) => {
    await getAgentSession(id, userId);
    return await agentRepository.updateAgent(id, data);
};

export const listAgentSessions = async (filters) => {
    return await agentRepository.findAll(filters);
};

export const getAgentHealth = async () => {
    try {
        return { connected: true, ...(await checkAgentHealth()) };
    } catch (err) {
        return { connected: false, status: 'offline', error: err.message };
    };
};

export const chatWithAgent = async (id, message, userId) => {
    const agent = await getAgentSession(id, userId);
    const trimmed = (message || '').trim();
    if (!trimmed) {
        throw new AppError('Message is required', 400, AgentErrorCodes.VALIDATION_ERROR);
    }

    const result = await sendAgentMessage(id, trimmed);
    const messages = appendMessage(agent.messages, 'user', trimmed);
    const updatedMessages = appendMessage(messages, 'assistant', result.response);

    await agentRepository.updateAgent(id, { messages: updatedMessages });

    return {
        agentId: id,
        response: result.response,
        session_id: result.session_id,
        timestamp: result.timestamp,
        status: 'SUCCESS',
    };
};

export const streamChatWithAgent = async (id, message, userId, onEvent, options = {}) => {
    const agent = await getAgentSession(id, userId);
    const trimmed = (message || '').trim();
    if (!trimmed) {
        throw new AppError('Message is required', 400, AgentErrorCodes.VALIDATION_ERROR);
    }

    onEvent?.({ type: 'status', content: 'Processing...' });

    const result = await streamAgentMessage(id, trimmed, {
        ...options,
        onEvent,
    });

    const messages = appendMessage(agent.messages, 'user', trimmed);
    const updatedMessages = appendMessage(messages, 'assistant', result.response);

    await agentRepository.updateAgent(id, { messages: updatedMessages });

    return {
        agentId: id,
        ...result,
    };
};

export const stopAgent = async (id, userId) => {
    await getAgentSession(id, userId);
    const result = await stopPythonAgent(id);
    return { agentId: id, ...result };
};

export const getAgentLogs = async (id, userId) => {
    const agent = await getAgentSession(id, userId);
    let pythonHistory = [];
    try {
        const history = await getPythonSessionHistory(id);
        pythonHistory = history.messages || history.history || [];
    } catch (err) {
        console.warn(`Python history unavailable for ${id}: ${err.message}`);
    }

    return {
        agentId: id,
        dbMessages: agent.messages || [],
        pythonHistory,
    };
};

export const testAgent = async (id, prompt, userId) => {
    return chatWithAgent(id, prompt || 'Hello, confirm you are online.', userId);
};

export const deployAgent = async (id, pentestId, userId) => {
    await getAgentSession(id, userId);
    return updateAgentSession(id, { isActive: true, pentestId }, userId);
};
