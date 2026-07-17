const NODE_TYPE_PRIORITY = {
    note: 10,
    terminal: 20,
    agent: 30,
    ai: 40,
    startingPoint: 50,
};

const cleanText = (value) => String(value ?? '').trim();

const getNodeLabel = (node) => cleanText(node?.data?.label) || cleanText(node?.type) || 'Connected node';

const joinNonEmpty = (values, separator = '\n') => values.map(cleanText).filter(Boolean).join(separator);

const extractNodeContent = (node) => {
    if (!node || typeof node !== 'object') {
        return '';
    }

    const data = node.data || {};

    const genericContent = joinNonEmpty([
        data.output,
        data.response,
        data.text,
        data.prompt,
        data.content,
    ]);

    if (genericContent) {
        return genericContent;
    }

    if (node.type === 'terminal') {
        const terminalTranscript = joinNonEmpty([
            data.terminalTranscript,
            data.output,
            Array.isArray(data.outputLines) ? data.outputLines.join('\n') : '',
        ]);

        return joinNonEmpty([
            terminalTranscript,
            data.terminalInput ? `Current input: ${data.terminalInput}` : '',
            data.fetchingOutput ? 'Fetching terminal output...' : '',
            data.command,
            data.initialCommand,
        ]);
    }

    if (node.type === 'agent') {
        const logContent = Array.isArray(data.logs)
            ? data.logs.map((log) => log?.message).filter(Boolean).join('\n')
            : '';

        return joinNonEmpty([
            data.objective,
            data.status,
            data.fetchingOutput ? 'Fetching agent output...' : '',
            logContent,
        ]);
    }

    if (node.type === 'note') {
        return joinNonEmpty([data.text, data.content, data.prompt]);
    }

    return joinNonEmpty([data.fetchingOutput ? 'Fetching output...' : '', data.status]);
};

export const extractConnectedNodeContext = (node, index = 0, edgeId = '') => {
    if (!node) {
        return null;
    }

    const content = extractNodeContent(node);
    const label = getNodeLabel(node);

    return {
        sourceNodeId: cleanText(node.id),
        sourceNodeType: cleanText(node.type),
        sourceLabel: label,
        content,
        status: cleanText(node.data?.status),
        fetchingOutput: Boolean(node.data?.fetchingOutput),
        orderKey: [NODE_TYPE_PRIORITY[node.type] ?? 99, label.toLowerCase(), cleanText(node.id), cleanText(edgeId), index]
            .join('|'),
    };
};

export const buildWorkflowNodeContextLines = (contexts = []) => {
    return contexts
        .filter((context) => context)
        .sort((left, right) => left.orderKey.localeCompare(right.orderKey))
        .map((context, index) => {
            const meta = [
                `node id: ${context.sourceNodeId}`,
                `type: ${context.sourceNodeType}`,
                context.status ? `status: ${context.status}` : null,
                context.fetchingOutput ? 'fetching output: yes' : null,
            ].filter(Boolean).join(', ');

            const content = context.content || 'No runtime output available.';

            return `${index + 1}. ${context.sourceLabel}\n${meta}\ncontent:\n${content}`;
        });
};

export const buildWorkflowAssistantPrompt = ({ userPrompt = '', contexts = [] } = {}) => {
    const promptText = cleanText(userPrompt);
    const contextLines = buildWorkflowNodeContextLines(contexts);

    const sections = [];

    if (promptText) {
        sections.push(`User prompt:\n${promptText}`);
    }

    if (contextLines.length > 0) {
        sections.push(`Connected node context:\n${contextLines.join('\n\n')}`);
    }

    return sections.join('\n\n') || 'Respond using the connected node context.';
};

export const formatWorkflowAssistantError = (error) => {
    const message = cleanText(error?.message || error?.response?.data?.error || error?.response?.data?.message);

    if (message) {
        return message;
    }

    if (error?.cause?.code === 'ECONNABORTED') {
        return 'The AI assistant request timed out. Please try again.';
    }

    return 'The AI assistant could not be reached. Please try again.';
};

export const getAiNodeStatusLabel = (status, isLoading = false) => {
    if (isLoading || status === 'loading') {
        return 'Loading';
    }

    if (status === 'success') {
        return 'Success';
    }

    if (status === 'error') {
        return 'Error';
    }

    return 'Idle';
};