import assistantRepository from './assistant.repository.js';
import AppError from '../../utils/AppError.js';
import { AiAssistantErrorCodes } from './assistant.constants.js';

const DEFAULT_MODEL = process.env.AI_ASSISTANT_MODEL || process.env.OLLAMA_MODEL || 'qwen3:0.6b';
const DEFAULT_SYSTEM_PROMPT = process.env.AI_ASSISTANT_SYSTEM_PROMPT || 'You are a helpful AI assistant inside a workflow editor. Keep replies concise, clear, and useful.';
const DEFAULT_LLM_URL = process.env.AI_ASSISTANT_LLM_URL || process.env.OLLAMA_CHAT_URL || 'http://localhost:11434/api/chat';
const DEFAULT_TIMEOUT_MS = Number(process.env.AI_ASSISTANT_TIMEOUT_MS || 120000);

const cleanText = (value) => String(value ?? '').trim();

const normalizeSourceNodes = (sourceNodes = []) => {
    if (!Array.isArray(sourceNodes)) return [];

    return sourceNodes
        .filter((node) => node && typeof node === 'object')
        .map((node) => ({
            sourceNodeId: cleanText(node.sourceNodeId),
            sourceNodeType: cleanText(node.sourceNodeType),
            sourceLabel: cleanText(node.sourceLabel),
            content: cleanText(node.content),
            status: cleanText(node.status),
            fetchingOutput: Boolean(node.fetchingOutput),
        }))
        .filter((node) => node.sourceNodeId && node.sourceNodeType && node.sourceLabel)
        .sort((left, right) => {
            const leftLabel = left.sourceLabel.toLowerCase();
            const rightLabel = right.sourceLabel.toLowerCase();
            if (leftLabel !== rightLabel) return leftLabel.localeCompare(rightLabel);
            if (left.sourceNodeId !== right.sourceNodeId) return left.sourceNodeId.localeCompare(right.sourceNodeId);
            return left.sourceNodeType.localeCompare(right.sourceNodeType);
        });
};

const buildContextBlock = (sourceNodes) => {
    const normalized = normalizeSourceNodes(sourceNodes);

    if (!normalized.length) return '';

    return normalized.map((node, index) => {
        const statusBits = [
            node.status ? `status: ${node.status}` : null,
            node.fetchingOutput ? 'fetching output: yes' : null,
        ].filter(Boolean);

        const content = node.content || 'No runtime output available.';

        return [
            `${index + 1}. ${node.sourceLabel} (${node.sourceNodeType})`,
            `node id: ${node.sourceNodeId}`,
            statusBits.length ? statusBits.join(', ') : null,
            `content:\n${content}`,
        ].filter(Boolean).join('\n');
    }).join('\n\n');
};

const buildUserPrompt = ({ prompt, context, sourceNodes }) => {
    const promptText = cleanText(prompt);
    const contextText = cleanText(context) || buildContextBlock(sourceNodes);

    const sections = [];
    if (promptText) {
        sections.push(`User prompt:\n${promptText}`);
    }
    if (contextText) {
        sections.push(`Connected node context:\n${contextText}`);
    }

    return sections.join('\n\n') || 'Respond using the connected node context.';
};

const extractAssistantText = (payload) => {
    const candidates = [
        payload?.message?.content,
        payload?.response,
        payload?.choices?.[0]?.message?.content,
        payload?.choices?.[0]?.text,
        payload?.data?.content,
    ];

    return cleanText(candidates.find((value) => cleanText(value).length > 0));
};

const postToLlm = async ({ model, messages, timeoutMs }) => {
    const maxAttempts = 3;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(DEFAULT_LLM_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, messages, stream: false }),
                signal: controller.signal,
            });

            const payload = await response.json().catch(() => ({}));

            if (!response.ok) {
                const message = cleanText(payload?.error?.message || payload?.message || payload?.error || `LLM request failed with status ${response.status}`);
                throw new AppError(message, response.status >= 500 ? 502 : response.status);
            }

            const responseText = extractAssistantText(payload);
            if (!responseText) {
                throw new AppError('The LLM endpoint returned an empty response.', 502);
            }

            clearTimeout(timeout);
            return { responseText, raw: payload };
        } catch (error) {
            clearTimeout(timeout);
            lastError = error;

            const isAbort = error?.name === 'AbortError';
            const isServerError = error instanceof AppError ? (error.status >= 500) : true;

            if (isAbort && attempt >= maxAttempts) {
                throw new AppError(`LLM request timed out after ${Math.round(timeoutMs / 1000)}s.`, 504);
            }

            // Retry transient errors (server errors or aborts) with exponential backoff
            if (attempt < maxAttempts && (isAbort || isServerError)) {
                const backoffMs = 200 * Math.pow(2, attempt - 1);
                await new Promise((res) => setTimeout(res, backoffMs));
                continue;
            }

            // If it's a non-retryable error or we've exhausted attempts, rethrow a meaningful AppError
            if (error instanceof AppError) {
                throw error;
            }

            if (isAbort) {
                throw new AppError(`LLM request timed out after ${Math.round(timeoutMs / 1000)}s.`, 504);
            }

            throw error;
        }
    }

    // If somehow we get here, throw the last error
    throw lastError || new AppError('LLM request failed.', 502);
};

export const createAssistant = async (data) => {
    return await assistantRepository.createAssistant(data);
};

export const getAssistantById = async (id) => {
    return await assistantRepository.findById(id);
};

export const getAllAssistants = async () => {
    return await assistantRepository.findAll();
};

export const updateAssistant = async (id, data) => {
    return await assistantRepository.updateAssistant(id, data);
};

export const deleteAssistant = async (id) => {
    return await assistantRepository.deleteAssistant(id);
};

export const generateAssistantResponse = async (payload) => {
    const assistant = payload.assistantId ? await assistantRepository.findById(payload.assistantId) : null;

    if (payload.assistantId && !assistant) {
        throw new AppError('Assistant not found', 404, AiAssistantErrorCodes.NOT_FOUND);
    }

    const model = cleanText(payload.model) || assistant?.model || DEFAULT_MODEL;
    const systemPrompt = cleanText(payload.systemPrompt) || assistant?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const timeoutMs = payload.timeoutMs || Number(assistant?.timeoutMs || DEFAULT_TIMEOUT_MS);
    const userMessage = buildUserPrompt({
        prompt: payload.prompt,
        context: payload.context,
        sourceNodes: payload.sourceNodes,
    });

    const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
    ];

    const llmResult = await postToLlm({ model, messages, timeoutMs });

    return {
        response: llmResult.responseText,
        model,
        systemPrompt,
        prompt: cleanText(payload.prompt),
        context: cleanText(payload.context),
        sourceNodes: normalizeSourceNodes(payload.sourceNodes),
        assistantId: assistant?.id || payload.assistantId || null,
        raw: llmResult.raw,
    };
};
