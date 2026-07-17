import * as service from './agent.service.js';
import { createAgentSchema, updateAgentSchema, chatAgentSchema } from './agent.schema.js';

export const create = async (req, res, next) => {
    try {
        const data = createAgentSchema.parse(req.body);
        if (req.user) data.userId = req.user.id;
        res.status(201).json(await service.createAgentSession(data));
    } catch (e) { next(e); }
};

export const get = async (req, res, next) => {
    try {
        res.json(await service.getAgentSession(req.params.id, req.user?.id));
    } catch (e) { next(e); }
};

export const list = async (req, res, next) => {
    try {
        const filters = {
            userId: req.user.id,
            pentestId: req.query.pentestId,
        };
        res.json(await service.listAgentSessions(filters));
    } catch (e) { next(e); }
};

export const update = async (req, res, next) => {
    try {
        res.json(await service.updateAgentSession(
            req.params.id,
            updateAgentSchema.parse(req.body),
            req.user?.id,
        ));
    } catch (e) { next(e); }
};

export const test = async (req, res, next) => {
    try {
        const { message } = chatAgentSchema.parse({
            message: req.body.prompt || req.body.message || 'Ping',
        });
        res.json(await service.testAgent(req.params.id, message, req.user?.id));
    } catch (e) { next(e); }
};

export const chat = async (req, res, next) => {
    try {
        const { message } = chatAgentSchema.parse(req.body);
        res.json(await service.chatWithAgent(req.params.id, message, req.user?.id));
    } catch (e) { next(e); }
};

export const chatStream = async (req, res, next) => {
    const abortController = new AbortController();
    try {
        const { message } = chatAgentSchema.parse(req.body);

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        const writeEvent = (event) => {
            res.write(`event: agent-event\n`);
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        };

        req.on('close', () => {
            abortController.abort();
        });

        const result = await service.streamChatWithAgent(
            req.params.id,
            message,
            req.user?.id,
            writeEvent,
            { signal: abortController.signal },
        );

        writeEvent({ type: 'done', ...result });
        res.end();
    } catch (e) {
        if (!res.headersSent) return next(e);
        res.write(`event: agent-event\n`);
        res.write(`data: ${JSON.stringify({ type: 'error', content: e.message || 'Stream failed' })}\n\n`);
        res.end();
    }
};

export const stop = async (req, res, next) => {
    try {
        res.json(await service.stopAgent(req.params.id, req.user?.id));
    } catch (e) { next(e); }
};

export const logs = async (req, res, next) => {
    try {
        res.json(await service.getAgentLogs(req.params.id, req.user?.id));
    } catch (e) { next(e); }
};

export const health = async (req, res, next) => {
    try {
        res.json(await service.getAgentHealth());
    } catch (e) { next(e); }
};

export const deploy = async (req, res, next) => {
    try {
        res.json(await service.deployAgent(req.params.id, req.body.pentestId, req.user?.id));
    } catch (e) { next(e); }
};
