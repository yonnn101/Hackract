import dotenv from 'dotenv';
dotenv.config();

import http from "http";
import app from "./app.js";
import { connectDatabase } from "./src/database/sqlConnection.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import prisma from "./src/database/prismaClient.js";
import { upsertUserPresence } from "./src/modules/Chat/chat.repository.js";
import { setupTerminalSocket } from "./src/modules/Terminal/terminal.socket.js";
import { setupAgentSocket } from "./src/modules/AiAgent/agent.socket.js";
import { initializeStorage } from "./src/utils/s3Upload.js";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

const parseCookies = (cookieString) => {
  if (!cookieString) return {};
  return cookieString
    .split(';')
    .reduce((res, c) => {
      const parts = c.trim().split('=');
      const key = parts[0];
      const val = parts.slice(1).join('=');
      if (key && val) {
        res[key] = decodeURIComponent(val);
      }
      return res;
    }, {});
};

// Decode socket token and return user id, or null
const decodeSocketUser = async (socket) => {
  try {
    const cookies = parseCookies(socket.request?.headers?.cookie);
    const cookieToken = cookies?.accessToken;

    const token =
      socket.handshake.auth?.token ||
      cookieToken ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");
    
    if (!token) {
      console.warn("🔌 Socket: No token provided");
      return null;
    }

    // 1. Try local JWT verification
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      const userId = decoded?.id || decoded?.sub || null;
      if (userId) return userId;
    } catch (localErr) {
      // 2. If local fails, it might be an Auth0 token
      const decoded = jwt.decode(token);
      if (decoded && decoded.sub) {
        // Find user by Auth0 ID (sub) or UUID (sub)
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { auth0Id: decoded.sub },
              { id: decoded.sub }
            ]
          }
        });
        if (user) {
          console.log(`🔌 Socket: Resolved Auth0 user: ${user.id}`);
          return user.id;
        }
      }
      console.error(`🔌 Socket: Token validation failed: ${localErr.message}`);
    }
    return null;
  } catch (err) {
    console.error(`🔌 Socket: Decoding error: ${err.message}`);
    return null;
  }
};

const startServer = async () => {
  await connectDatabase();
  await initializeStorage();

  const server = http.createServer(app);

  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // ── In-memory state ────────────────────────────────────────────────────────

  // { workflowId: { socketId: userInfo } }
  const workflowUsers = {};

  // { userId: socketId }   (chat presence registry)
  const onlineUsers = new Map();

  // { socketId: userId }   (reverse lookup)
  const socketToUser = new Map();

  // { conversationId: Set<socketId> }  (typing indicators)
  const typingUsers = new Map();

  // ── Connection ─────────────────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    console.log(`🔌 New client connected: ${socket.id}`);

    const userId = await decodeSocketUser(socket);

    // ── Chat: register presence ────────────────────────────────────────────
    if (userId) {
      onlineUsers.set(userId, socket.id);
      socketToUser.set(socket.id, userId);

      // Persist to DB
      upsertUserPresence(userId, true, socket.id).catch(() => { });

      // Join personal room so we can DM this socket
      socket.join(`user:${userId}`);

      // Broadcast online status to everyone (light payload)
      io.emit("chat:presence-update", { userId, isOnline: true });
    }

    // ── WORKFLOW COLLABORATION ─────────────────────────────────────────────

    socket.on("join-workflow", ({ workflowId, user, color }) => {
      socket.join(workflowId);
      if (!workflowUsers[workflowId]) workflowUsers[workflowId] = {};
      workflowUsers[workflowId][socket.id] = { id: socket.id, user, color, joinedAt: new Date() };
      socket.emit("collaborators-list", Object.values(workflowUsers[workflowId]));
      socket.to(workflowId).emit("user-joined", workflowUsers[workflowId][socket.id]);
    });

    socket.on("workflow-change", (data) => {
      socket.to(data.workflowId).emit("workflow-updated", {
        nodes: data.nodes,
        edges: data.edges,
        deletedNodeIds: data.deletedNodeIds || [],
        senderId: data.senderId || socket.id,
      });
    });

    socket.on("cursor-move", (data) => {
      socket.to(data.workflowId).emit("cursor-updated", {
        x: data.x,
        y: data.y,
        user: data.user,
        color: data.color || "#00ff41",
        socketId: socket.id,
      });
    });

    socket.on("node-focus", (data) => {
      socket.to(data.workflowId).emit("node-focused", { ...data, socketId: socket.id });
    });

    // Handle history relay
    socket.on("history-event", (data) => {
      // data: { workflowId, record: { message, action, createdAt, user } }
      socket.to(data.workflowId).emit("history-event", data.record);
    });

    const handleLeave = (workflowId) => {
      if (workflowUsers[workflowId]) {
        delete workflowUsers[workflowId][socket.id];
        if (Object.keys(workflowUsers[workflowId]).length === 0) {
          delete workflowUsers[workflowId];
        }
      }
      socket.leave(workflowId);
      socket.to(workflowId).emit("user-left", { id: socket.id });
    };

    socket.on("leave-workflow", (workflowId) => {
      handleLeave(workflowId);
    });

    // ── CHAT EVENTS ─────────────────────────────────────────────────────────

    // Join a conversation room (called when user opens a chat)
    socket.on("chat:join", ({ conversationId }) => {
      if (!userId || !conversationId) return;
      socket.join(`conv:${conversationId}`);
    });

    socket.on("chat:leave", ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conv:${conversationId}`);
    });

    // Real-time message relay — REST API saves to DB and then emits this
    // This event is fired by the server itself (see broadcastMessage helper below)
    // Clients can also optimistically use this to broadcast immediately

    // Typing indicator
    socket.on("chat:typing-start", ({ conversationId }) => {
      if (!userId || !conversationId) return;
      if (!typingUsers.has(conversationId)) typingUsers.set(conversationId, new Set());
      typingUsers.get(conversationId).add(userId);
      socket.to(`conv:${conversationId}`).emit("chat:typing", { userId, conversationId });
    });

    socket.on("chat:typing-stop", ({ conversationId }) => {
      if (!userId || !conversationId) return;
      typingUsers.get(conversationId)?.delete(userId);
      socket.to(`conv:${conversationId}`).emit("chat:stop-typing", { userId, conversationId });
    });

    // Mark messages as read — broadcast receipt to conversation
    socket.on("chat:mark-read", ({ conversationId }) => {
      if (!userId || !conversationId) return;
      socket.to(`conv:${conversationId}`).emit("chat:read-receipt", {
        conversationId,
        userId,
        readAt: new Date().toISOString(),
      });
    });

    // ── DISCONNECT ─────────────────────────────────────────────────────────

    socket.on("disconnecting", () => {
      for (const room of socket.rooms) {
        if (room !== socket.id && !room.startsWith("user:") && !room.startsWith("conv:")) {
          handleLeave(room);
        }
        if (room.startsWith("conv:")) {
          const convId = room.replace("conv:", "");
          typingUsers.get(convId)?.delete(userId);
          if (userId) {
            socket.to(room).emit("chat:stop-typing", { userId, conversationId: convId });
          }
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);

      if (userId) {
        onlineUsers.delete(userId);
        socketToUser.delete(socket.id);

        // Mark offline after a short grace period (handles page refreshes)
        setTimeout(async () => {
          // Only mark offline if no new socket for same user registered
          if (!onlineUsers.has(userId)) {
            await upsertUserPresence(userId, false).catch(() => { });
            io.emit("chat:presence-update", { userId, isOnline: false, lastSeenAt: new Date().toISOString() });
          }
        }, 5000);
      }
    });
  });

  setupTerminalSocket(io);
  setupAgentSocket(io, decodeSocketUser);

  // ── Helper: broadcast a new message to all participants in a conversation ──
  // Called from chat REST API (via the io instance attached to app)
  app.locals.broadcastChatMessage = async (conversationId, message) => {
    // 1. Emit to the conversation room (for those who have the chat open)
    io.to(`conv:${conversationId}`).emit("chat:new-message", message);

    // 2. Notify participants individually for global notifications / badges
    try {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: { select: { userId: true } } }
      });
      if (conv) {
        conv.participants.forEach(p => {
          io.to(`user:${p.userId}`).emit("chat:new-message", message);
        });
      }
    } catch (err) {
      console.error("Error in broadcastChatMessage:", err);
    }
  };

  app.locals.broadcastMessageEdit = async (conversationId, message) => {
    io.to(`conv:${conversationId}`).emit("chat:message-edited", message);
    
    // Also notify individuals so global state can update if needed
    try {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: { select: { userId: true } } }
      });
      if (conv) {
        conv.participants.forEach(p => {
          io.to(`user:${p.userId}`).emit("chat:message-edited", message);
        });
      }
    } catch (err) { }
  };

  app.locals.broadcastMessageDelete = async (conversationId, messageId) => {
    io.to(`conv:${conversationId}`).emit("chat:message-deleted", { conversationId, messageId });
    
    try {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: { select: { userId: true } } }
      });
      if (conv) {
        conv.participants.forEach(p => {
          io.to(`user:${p.userId}`).emit("chat:message-deleted", { conversationId, messageId });
        });
      }
    } catch (err) { }
  };


  app.locals.sendNotification = (userId, notification) => {
    console.log(`🔔 Sending notification to user:${userId}`, notification);
    const room = `user:${userId}`;
    const clients = io.sockets.adapter.rooms.get(room);
    console.log(`   Target room: ${room}, Active clients: ${clients ? clients.size : 0}`);
    io.to(room).emit("notification", notification);
  };

  const maxRetries = 5;
  const listenWithRetry = (port, attempt = 0) => {
    server.once('error', (err) => {
      if (err && err.code === 'EADDRINUSE') {
        console.warn(`Port ${port} in use.`);
        if (attempt < maxRetries) {
          const nextPort = Number(port) + 1;
          console.warn(`Trying port ${nextPort} (attempt ${attempt + 1}/${maxRetries})...`);
          setTimeout(() => listenWithRetry(nextPort, attempt + 1), 300);
          return;
        }
        console.error(`All retry attempts exhausted. Port ${port} still in use.`);
        process.exit(1);
      }
      // Other errors should crash
      console.error('Server error during listen:', err);
      process.exit(1);
    });

    server.listen(port, () => {
      console.log(`🚀 HackRact Server running on http://localhost:${port}`);
      console.log(`📘 Swagger Docs at http://localhost:${port}/api-docs`);
    });
  };

  listenWithRetry(PORT);
};

startServer();
