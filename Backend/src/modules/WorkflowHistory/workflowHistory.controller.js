import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';
import { buildActionMessage } from '../../utils/workflowActionMessage.js';

const prisma = new PrismaClient();

// Record a new history event for a workflow
export const recordHistory = asyncHandler(async (req, res) => {
  const { workflowId } = req.params;
  const { action, message, details, isSnapshot, snapshot } = req.body;

  // Since we use 'protect' middleware, req.user holds the authenticated user details
  const userId = req.user.id;

  const finalMessage = message || buildActionMessage(action, details);

  const historyRecord = await prisma.workflowHistory.create({
    data: {
      workflowId,
      userId,
      action,
      message: finalMessage,
      details: details || {},
      isSnapshot: isSnapshot || false,
      snapshot: snapshot || null
    }
  });

  res.status(201).json(historyRecord);
});

// Retrieve history for a specific workflow
export const getHistory = asyncHandler(async (req, res) => {
  const { workflowId } = req.params;

  const history = await prisma.workflowHistory.findMany({
    where: { workflowId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { 
          id: true, 
          fullName: true, 
          email: true, 
          handle: true, 
          avatar: true,
          roles: {
            select: { type: true }
          }
        }
      }
    }
  });

  res.status(200).json(history);
});
