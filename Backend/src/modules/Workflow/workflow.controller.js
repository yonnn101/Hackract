import { PrismaClient } from '@prisma/client';
import asyncHandler from 'express-async-handler';

const prisma = new PrismaClient();

// Create a new Workflow
export const create = asyncHandler(async (req, res) => {
  const { name, pentestId, nodes, edges } = req.body;

  // Use the provided name, or auto-derive from the parent project/pentest name
  let workflowName = name;
  if (!workflowName && pentestId) {
    try {
      const pentest = await prisma.pentest.findUnique({
        where: { id: pentestId },
        select: { name: true }
      });
      workflowName = pentest?.name ? `${pentest.name} — Workflow` : undefined;
    } catch (_) { /* ignore, fall through to default */ }
  }

  const defaultNodes = [
    { id: 'node-1', type: 'startingPoint', position: { x: 50, y: 150 }, data: { label: 'Target Scope' } },
    { id: 'node-2', type: 'note', position: { x: 400, y: 50 }, data: { label: 'Passive Recon', text: 'Analyze subdomains, WHOIS, and public records.' } },
    { id: 'node-3', type: 'note', position: { x: 400, y: 250 }, data: { label: 'Active Scanning', text: 'Run Nmap, Nuclei, and Burp Suite.' } },
    { id: 'node-4', type: 'terminal', position: { x: 750, y: 150 }, data: { label: 'Vulnerability Validation' } },
    { id: 'node-5', type: 'note', position: { x: 1100, y: 150 }, data: { label: 'Final Report', text: 'Consolidate findings and generate executive summary.' } }
  ];

  const defaultEdges = [
    { id: 'edge-1-2', source: 'node-1', target: 'node-2', animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } },
    { id: 'edge-1-3', source: 'node-1', target: 'node-3', animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } },
    { id: 'edge-2-4', source: 'node-2', target: 'node-4', animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } },
    { id: 'edge-3-4', source: 'node-3', target: 'node-4', animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } },
    { id: 'edge-4-5', source: 'node-4', target: 'node-5', animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } }
  ];

  const workflow = await prisma.workflow.create({
    data: {
      name: workflowName || 'Untitled Workflow',
      pentestId,
      nodes: nodes || defaultNodes,
      edges: edges || defaultEdges
    }
  });

  res.status(201).json(workflow);
});

// Get Workflows by Pentest ID
export const getByPentest = asyncHandler(async (req, res) => {
  const { pentestId } = req.params;

  const workflows = await prisma.workflow.findMany({
    where: { pentestId },
    include: {
      _count: {
        select: { history: true }
      }
    }
  });

  res.status(200).json(workflows);
});

// Get a single Workflow by ID
export const get = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const workflow = await prisma.workflow.findUnique({
    where: { id },
    include: {
      pentest: {
        select: {
          id: true,
          name: true,
          status: true,
          findings: {
            select: { id: true, title: true, severity: true, status: true }
          },
          collaborators: {
            select: { userId: true, role: true }
          }
        }
      }
    }
  });

  if (!workflow) {
    return res.status(404).json({ error: 'Workflow not found' });
  }

  res.status(200).json(workflow);
});

// Update a Workflow
export const update = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, nodes, edges } = req.body;

  const workflow = await prisma.workflow.update({
    where: { id },
    data: { name, nodes, edges }
  });

  res.status(200).json(workflow);
});
