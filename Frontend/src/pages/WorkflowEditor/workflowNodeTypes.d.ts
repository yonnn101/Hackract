export interface WorkflowNodeContext {
    sourceNodeId: string;
    sourceNodeType: string;
    sourceLabel: string;
    content: string;
    status?: string;
    fetchingOutput?: boolean;
}

export interface AiAssistantNodeData {
    label?: string;
    draft?: string;
    prompt?: string;
    messages?: Array<{
        id?: string;
        role?: 'user' | 'assistant';
        content?: string;
        source?: string;
    }>;
    response?: string;
    error?: string;
    output?: string;
    outputLines?: string[];
    terminalTranscript?: string;
    terminalInput?: string;
    status?: 'idle' | 'loading' | 'success' | 'error' | string;
    assistantId?: string;
    model?: string;
    context?: string;
    sourceNodes?: WorkflowNodeContext[];
    onDelete?: () => void;
    onTitleChange?: (value: string) => void;
    onDataChange?: (patch: Partial<AiAssistantNodeData>) => void;
    activeUsers?: Record<string, unknown>;
    workflowId?: string;
}