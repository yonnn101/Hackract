import { describe, expect, it } from 'vitest';
import {
    buildWorkflowAssistantPrompt,
    buildWorkflowNodeContextLines,
    extractConnectedNodeContext,
    getAiNodeStatusLabel,
} from './aiNodePrompt';

describe('aiNodePrompt helpers', () => {
    it('extracts node context from runtime fields', () => {
        const context = extractConnectedNodeContext({
            id: 'terminal-1',
            type: 'terminal',
            data: {
                label: 'Terminal Output',
                outputLines: ['line one', 'line two'],
                fetchingOutput: true,
            },
        });

        expect(context.sourceNodeId).toBe('terminal-1');
        expect(context.content).toContain('line one');
        expect(context.fetchingOutput).toBe(true);
    });

    it('sorts and formats context lines deterministically', () => {
        const contexts = [
            {
                sourceNodeId: 'b-node',
                sourceNodeType: 'terminal',
                sourceLabel: 'Beta',
                content: 'beta output',
                status: 'running',
                fetchingOutput: false,
                orderKey: '20|beta|b-node|edge-2|1',
            },
            {
                sourceNodeId: 'a-node',
                sourceNodeType: 'note',
                sourceLabel: 'Alpha',
                content: 'alpha output',
                status: 'idle',
                fetchingOutput: false,
                orderKey: '10|alpha|a-node|edge-1|0',
            },
            {
                sourceNodeId: 'c-node',
                sourceNodeType: 'terminal',
                sourceLabel: 'Gamma',
                content: '',
                status: 'idle',
                fetchingOutput: true,
                orderKey: '20|gamma|c-node|edge-3|2',
            },
        ];

        const lines = buildWorkflowNodeContextLines(contexts);

        expect(lines[0]).toContain('Alpha');
        expect(lines[1]).toContain('Beta');
        expect(lines[2]).toContain('Gamma');
        expect(lines[2]).toContain('No runtime output available.');
    });

    it('builds a combined prompt from user text and context', () => {
        const prompt = buildWorkflowAssistantPrompt({
            userPrompt: 'Summarize the findings',
            contexts: [
                {
                    sourceNodeId: 'node-1',
                    sourceNodeType: 'note',
                    sourceLabel: 'Note A',
                    content: 'Investigate the API gateway.',
                    status: 'idle',
                    fetchingOutput: false,
                    orderKey: '10|note a|node-1|edge-1|0',
                },
            ],
        });

        expect(prompt).toContain('User prompt');
        expect(prompt).toContain('Connected node context');
        expect(prompt).toContain('Investigate the API gateway.');
    });

    it('maps status values to display labels', () => {
        expect(getAiNodeStatusLabel('loading')).toBe('Loading');
        expect(getAiNodeStatusLabel('success')).toBe('Success');
        expect(getAiNodeStatusLabel('error')).toBe('Error');
        expect(getAiNodeStatusLabel('idle')).toBe('Idle');
    });
});