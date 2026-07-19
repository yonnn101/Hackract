import express from "express";
import { protect } from "../../middleware/Auth.middleware.js";
import prisma from "../../database/prismaClient.js";
import AppError from "../../utils/AppError.js";
import { checkLegalSignature } from "../../middleware/legalSignature.middleware.js";
import { logAction } from "../AuditLogs/auditLog.service.js";
import crypto from "crypto";

const router = express.Router();

const isOrgAdminMember = async (organizationId, user) => {
  if (!organizationId || !user?.id) return false;

  // If the user has the ORG_ADMIN role, we assume they have owner-level access to the organization
  if (user.roles?.some((r) => r.type === "ORG_ADMIN")) return true;

  const member = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId: user.id,
      role: { in: ["owner", "admin"] },
    },
  });
  return Boolean(member);
};

router.use(protect);

router.get("/", async (req, res, next) => {
  try {
    const { organizationId } = req.query;
    const where = {};

    if (organizationId) {
      where.organizationId = organizationId;
    } else {
      where.OR = [
        { organization: { members: { some: { userId: req.user.id } } } },
        { collaborators: { some: { userId: req.user.id } } },
        { leadPentesterId: req.user.id },
      ];
    }

    const projects = await prisma.pentest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        collaborators: {
          include: {
            user: { select: { id: true, fullName: true, email: true, handle: true } },
          },
        },
        workflows: { select: { id: true, name: true, updatedAt: true } },
        _count: { select: { findings: true } },
      },
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /projects/personal
 * Creates a personal (solo) pentest workspace for the requesting user.
 * No organization required. NDA gate is bypassed on this project type.
 */
router.post("/personal", async (req, res, next) => {
  try {
    const { name, description } = req.body || {};
    if (!name?.trim()) throw new AppError("Project name is required", 400);

    const project = await prisma.pentest.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        isPersonal: true,
        leadPentesterId: req.user.id,
        status: "IN_PROGRESS",
        targetDomains: [],
        ipRanges: [],
        workflows: {
          create: {
            name: `${name.trim()} — Workflow`,
            nodes: [],
            edges: [],
          },
        },
      },
      include: {
        workflows: true,
        collaborators: true,
      },
    });

    // Auto-add creator as a HACKER collaborator so they can submit findings
    await prisma.pentestCollaborator.create({
      data: { pentestId: project.id, userId: req.user.id, role: "HACKER", canEditFindings: true, canManageSessions: true },
    });

    await logAction("PERSONAL_WORKSPACE_CREATED", req.user.id, { pentestId: project.id, name }, req);

    res.status(201).json({ success: true, data: project, message: "Personal workspace created" });
  } catch (error) {
    next(error);
  }
});

router.get("/marketplace", async (req, res, next) => {
  try {
    // Marketplace shows only PLANNING projects
    // For now, filtering projects where the user isn't already a collaborator/admin
    const projects = await prisma.pentest.findMany({
      where: {
        status: "PLANNING",
        NOT: {
          OR: [
            { collaborators: { some: { userId: req.user.id } } },
            { leadPentesterId: req.user.id },
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { id: true, name: true } },
        _count: { select: { collaborators: true } },
      },
    });

    res.json({ success: true, data: projects });
  } catch (error) {
    next(error);
  }
});

router.get("/:projectId", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.pentest.findUnique({
      where: { id: projectId },
      include: {
        organization: true,
        collaborators: {
          include: {
            user: { select: { id: true, fullName: true, email: true, handle: true } },
          },
        },
        findings: { orderBy: { createdAt: "desc" } },
        workflows: { orderBy: { updatedAt: "desc" } },
      },
    });

    if (!project) {
      throw new AppError("Project not found", 404);
    }

    const canAccess =
      project.organizationId &&
      (await prisma.organizationMember.findFirst({
        where: { organizationId: project.organizationId, userId: req.user.id },
      }));
    const isCollaborator = project.collaborators.some((c) => c.userId === req.user.id);
    const isLead = project.leadPentesterId === req.user.id;

    if (!canAccess && !isCollaborator && !isLead) {
      throw new AppError("You do not have access to this project", 403);
    }

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
});

router.patch("/:projectId", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { name, description, status, targetDomains, ipRanges, excludedAssets, startDate, endDate } = req.body || {};

    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const isLead = project.leadPentesterId === req.user.id;
    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { in: ["PROJECT_ADMIN", "PROJECT_LEAD", "admin", "lead"] } }
    });

    if (!canManage && !isProjectAdmin && !isLead) {
      throw new AppError("Only project leads, organization admins, or project admins can update project details", 403);
    }

    const updated = await prisma.pentest.update({
      where: { id: projectId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
        ...(targetDomains && { targetDomains }),
        ...(ipRanges && { ipRanges }),
        ...(excludedAssets !== undefined && { excludedAssets }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
      }
    });

    // Send notifications if status has changed to CLOSED
    if (status === "CLOSED" && project.status !== "CLOSED") {
      const collaborators = await prisma.pentestCollaborator.findMany({
        where: { pentestId: projectId }
      });
      if (req.app?.locals?.sendNotification) {
        for (const collab of collaborators) {
          if (collab.userId === req.user.id) continue;
          req.app.locals.sendNotification(collab.userId, {
            type: "INVITE_RECEIVED",
            title: "Project Closed",
            message: `The project: ${project.name} has been closed.`,
            pentestId: projectId,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // Notify organization admins if a project admin edits the project
    if (!canManage && (isProjectAdmin || isLead) && req.app?.locals?.sendNotification) {
      if (project.organizationId) {
        const orgMembers = await prisma.organizationMember.findMany({
          where: { organizationId: project.organizationId, role: { in: ['owner', 'admin'] } }
        });
        for (const member of orgMembers) {
          req.app.locals.sendNotification(member.userId, {
            type: "SYSTEM",
            title: "Project Edited",
            message: `Project Admin ${req.user.fullName || req.user.handle || 'A user'} updated the project: ${project.name}.`,
            pentestId: projectId,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    await logAction("PROJECT_UPDATED", req.user.id, { pentestId: projectId, updates: req.body }, req);

    res.json({ success: true, data: updated, message: "Project updated successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      description,
      organizationId,
      projectAdminId,
      hackerIds = [],
      targetDomains = [],
      ipRanges = [],
      excludedAssets = "",
      startDate = null,
      endDate = null
    } = req.body || {};

    if (!name || !organizationId) {
      throw new AppError("name and organizationId are required", 400);
    }

    const canManage = await isOrgAdminMember(organizationId, req.user);
    if (!canManage) {
      throw new AppError("Only organization owners, admins, or global ORG_ADMINs can create projects", 403);
    }

    const project = await prisma.pentest.create({
      data: {
        name,
        description,
        organization: { connect: { id: organizationId } },
        status: "PLANNING",
        targetDomains,
        ipRanges,
        excludedAssets,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        workflows: {
          create: {
            name: `${name} - Main Workflow`,
            nodes: [
              { id: 'node-1', type: 'startingPoint', position: { x: 50, y: 150 }, data: { label: 'Target Scope' } },
              { id: 'node-2', type: 'note', position: { x: 400, y: 50 }, data: { label: 'Passive Recon', text: 'Analyze subdomains, WHOIS, and public records.' } },
              { id: 'node-3', type: 'note', position: { x: 400, y: 250 }, data: { label: 'Active Scanning', text: 'Run Nmap, Nuclei, and Burp Suite.' } },
              { id: 'node-4', type: 'terminal', position: { x: 750, y: 150 }, data: { label: 'Vulnerability Validation' } },
              { id: 'node-5', type: 'note', position: { x: 1100, y: 150 }, data: { label: 'Final Report', text: 'Consolidate findings and generate executive summary.' } }
            ],
            edges: [
              { id: 'edge-1-2', source: 'node-1', target: 'node-2', animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } },
              { id: 'edge-1-3', source: 'node-1', target: 'node-3', animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } },
              { id: 'edge-2-4', source: 'node-2', target: 'node-4', animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } },
              { id: 'edge-3-4', source: 'node-3', target: 'node-4', animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } },
              { id: 'edge-4-5', source: 'node-4', target: 'node-5', animated: true, style: { stroke: '#00ff88', strokeWidth: 2 } }
            ],
          },
        },
        projectAgreements: {
          create: {
            title: `Standard Non-Disclosure & Rules of Engagement - ${name}`,
            version: 1,
            body: `This document outlines the standard rules of engagement and confidentiality agreements for ${name}. By signing this, you agree to not disclose any vulnerabilities found to the public until authorized.`,
            scopeSummary: `Target Domains: ${targetDomains.join(', ') || 'N/A'}\nIP Ranges: ${ipRanges.join(', ') || 'N/A'}\nExcluded: ${excludedAssets || 'None'}`,
            allowedActions: "Standard web exploitation, no destructive testing.",
            confidentiality: "Strictly confidential.",
            legalLiability: "Organization holds harmless the hacker for actions within scope.",
            createdBy: { connect: { id: req.user.id } }
          }
        }
      },
      include: { workflows: true },
    });

    const uniqueHackers = [...new Set((hackerIds || []).filter(Boolean))];
    const collaboratorRows = [
      ...(projectAdminId
        ? [{ pentestId: project.id, userId: projectAdminId, role: "PROJECT_ADMIN", canEditFindings: true, canManageSessions: true }]
        : []),
      ...uniqueHackers.map((userId) => ({ pentestId: project.id, userId, role: "HACKER", canEditFindings: true, canManageSessions: true })),
    ];

    if (collaboratorRows.length > 0) {
      await prisma.pentestCollaborator.createMany({
        data: collaboratorRows,
        skipDuplicates: true,
      });

      // Send socket notifications to the assigned collaborators
      if (req.app?.locals?.sendNotification) {
        for (const row of collaboratorRows) {
          if (row.userId === req.user.id) continue; // Avoid self-notification
          req.app.locals.sendNotification(row.userId, {
            type: 'INVITE_RECEIVED',
            title: row.role === 'PROJECT_ADMIN' ? 'Project Administrator Assigned' : 'New Mission Assignment',
            message: row.role === 'PROJECT_ADMIN'
              ? `You have been assigned as an Administrator for project: ${project.name}.`
              : `You have been added as a collaborator to project: ${project.name}.`,
            pentestId: project.id,
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    const fullProject = await prisma.pentest.findUnique({
      where: { id: project.id },
      include: {
        organization: { select: { id: true, name: true } },
        collaborators: {
          include: {
            user: { select: { id: true, fullName: true, email: true, handle: true } },
          },
        },
        workflows: true,
      },
    });

    await logAction("PROJECT_CREATED", req.user.id, {
      pentestId: project.id,
      organizationId,
      name
    }, req);

    res.status(201).json({ success: true, data: fullProject, message: "Project created successfully" });
  } catch (error) {
    next(error);
  }
});

router.patch("/:projectId/admin", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { projectAdminId } = req.body || {};
    if (!projectAdminId) throw new AppError("projectAdminId is required", 400);

    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    if (!canManage) {
      throw new AppError("Only organization owner/admin can assign project admin", 403);
    }

    // 1. Get any existing PROJECT_ADMINs to notify them of demotion
    const existingAdmins = await prisma.pentestCollaborator.findMany({
      where: { pentestId: projectId, role: "PROJECT_ADMIN" }
    });

    // Demote any existing PROJECT_ADMINs to HACKER
    await prisma.pentestCollaborator.updateMany({
      where: { pentestId: projectId, role: "PROJECT_ADMIN" },
      data: { role: "HACKER" }
    });

    // 2. Upsert the new PROJECT_ADMIN
    await prisma.pentestCollaborator.upsert({
      where: {
        pentestId_userId: { pentestId: projectId, userId: projectAdminId }
      },
      update: { role: "PROJECT_ADMIN", canEditFindings: true, canManageSessions: true },
      create: { pentestId: projectId, userId: projectAdminId, role: "PROJECT_ADMIN", canEditFindings: true, canManageSessions: true }
    });

    // 3. Update the leadPentesterId on the project
    await prisma.pentest.update({
      where: { id: projectId },
      data: { leadPentesterId: projectAdminId }
    });

    // Notify the newly assigned admin
    if (req.app?.locals?.sendNotification && projectAdminId !== req.user.id) {
      req.app.locals.sendNotification(projectAdminId, {
        type: 'INVITE_RECEIVED',
        title: 'Project Administrator Assigned',
        message: `You have been assigned as an Administrator for project: ${project.name}.`,
        pentestId: projectId,
        timestamp: new Date().toISOString()
      });
    }

    // Notify the demoted admins
    if (req.app?.locals?.sendNotification) {
      for (const oldAdmin of existingAdmins) {
        if (oldAdmin.userId === req.user.id || oldAdmin.userId === projectAdminId) continue;
        req.app.locals.sendNotification(oldAdmin.userId, {
          type: 'INVITE_RECEIVED',
          title: 'Project Administrator Designation Removed',
          message: `Your Administrator designation for project: ${project.name} has been removed.`,
          pentestId: projectId,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({ success: true, message: "Project admin assigned successfully" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:projectId/admin", async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    if (!canManage) {
      throw new AppError("Only organization owner/admin can remove project admin", 403);
    }

    const currentAdminId = project.leadPentesterId;

    // 1. Demote any existing PROJECT_ADMINs to HACKER
    await prisma.pentestCollaborator.updateMany({
      where: { pentestId: projectId, role: "PROJECT_ADMIN" },
      data: { role: "HACKER" }
    });

    // 2. Clear leadPentesterId on the project
    await prisma.pentest.update({
      where: { id: projectId },
      data: { leadPentesterId: null }
    });

    // Notify the demoted admin if there was one
    if (currentAdminId && req.app?.locals?.sendNotification && currentAdminId !== req.user.id) {
      req.app.locals.sendNotification(currentAdminId, {
        type: 'INVITE_RECEIVED',
        title: 'Project Administrator Designation Removed',
        message: `Your Administrator designation for project: ${project.name} has been removed.`,
        pentestId: projectId,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ success: true, message: "Project admin removed successfully" });
  } catch (error) {
    next(error);
  }
});


router.post("/:projectId/hackers", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { hackerIds = [] } = req.body || {};
    if (!Array.isArray(hackerIds) || hackerIds.length === 0) {
      throw new AppError("hackerIds must be a non-empty array", 400);
    }

    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    if (!canManage) {
      throw new AppError("Only organization owner/admin can add hackers", 403);
    }

    await prisma.pentestCollaborator.createMany({
      data: [...new Set(hackerIds)].map((userId) => ({ pentestId: projectId, userId, role: "HACKER", canEditFindings: true, canManageSessions: true })),
      skipDuplicates: true,
    });

    // Send notifications to the assigned hackers
    if (req.app?.locals?.sendNotification) {
      const distinctHackers = [...new Set(hackerIds)];
      for (const userId of distinctHackers) {
        if (userId === req.user.id) continue;
        req.app.locals.sendNotification(userId, {
          type: 'INVITE_RECEIVED',
          title: 'New Mission Assignment',
          message: `You have been added as a collaborator to project: ${project.name}.`,
          pentestId: projectId,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({ success: true, message: "Hackers added successfully" });
  } catch (error) {
    next(error);
  }
});

router.post("/:projectId/apply", checkLegalSignature, async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    if (project.status !== "PLANNING") {
      throw new AppError("Applications are only open for projects in PLANNING status", 400);
    }

    const existing = await prisma.pentestCollaborator.findUnique({
      where: { pentestId_userId: { pentestId: projectId, userId: req.user.id } },
    });

    if (existing) {
      throw new AppError(`You are already a ${existing.role} in this project`, 400);
    }

    await prisma.pentestCollaborator.create({
      data: {
        pentestId: projectId,
        userId: req.user.id,
        role: "APPLICANT",
      },
    });

    res.json({ success: true, message: "Application submitted successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/:projectId/applicants", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: "PROJECT_ADMIN" }
    });

    if (!canManage && !isProjectAdmin) {
      throw new AppError("Only organization admin or project admin can view applicants", 403);
    }

    const applicants = await prisma.pentestCollaborator.findMany({
      where: { pentestId: projectId, role: "APPLICANT" },
      include: {
        user: { select: { id: true, fullName: true, handle: true, email: true } },
      },
    });

    res.json({ success: true, data: applicants });
  } catch (error) {
    next(error);
  }
});

router.post("/:projectId/hire", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;
    if (!userId) throw new AppError("userId is required", 400);

    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: "PROJECT_ADMIN" }
    });

    if (!canManage && !isProjectAdmin) {
      throw new AppError("Only organization admin or project admin can hire hackers", 403);
    }

    await prisma.pentestCollaborator.update({
      where: { pentestId_userId: { pentestId: projectId, userId } },
      data: { role: "HACKER", canEditFindings: true, canManageSessions: true },
    });

    await logAction("HACKER_HIRED", req.user.id, {
      pentestId: projectId,
      hiredUserId: userId
    }, req);

    res.json({ success: true, message: "Hacker hired successfully" });
  } catch (error) {
    next(error);
  }
});

router.get("/:projectId/activity", async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await prisma.pentest.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: "PROJECT_ADMIN" }
    });

    if (!canManage && !isProjectAdmin) {
      throw new AppError("Unauthorized: Only project administrators or organization admins can view activity logs", 403);
    }

    const logs = await prisma.auditLog.findMany({
      where: { pentestId: projectId },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { fullName: true, handle: true } }
      }
    });

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});

router.post("/:projectId/kickoff", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: "PROJECT_ADMIN" }
    });

    if (!canManage && !isProjectAdmin) {
      throw new AppError("Only organization admin or project admin can perform kickoff", 403);
    }

    await prisma.pentest.update({
      where: { id: projectId },
      data: { status: "IN_PROGRESS" }
    });

    await logAction("PROJECT_KICKOFF", req.user.id, {
      pentestId: projectId
    }, req);

    res.json({ success: true, message: "Project kicked off successfully" });
  } catch (error) {
    next(error);
  }
});

// ────────────────────────────────────────
// NDA / Legal Authorization Gate
// ────────────────────────────────────────

/**
 * GET /:projectId/nda-status
 * Returns: { required: bool, signed: bool, agreement: {...} | null }
 * Only relevant for hackers/collaborators. Org admins are exempt.
 */
router.get("/:projectId/nda-status", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    const project = await prisma.pentest.findUnique({
      where: { id: projectId },
      select: { organizationId: true, leadPentesterId: true, isPersonal: true },
    });
    if (!project) throw new AppError("Project not found", 404);

    // Personal workspaces never require an NDA
    if (project.isPersonal) {
      return res.json({ success: true, data: { required: false, signed: true, agreement: null } });
    }

    // Lead pentester (project owner) is exempt
    if (project.leadPentesterId === userId) {
      return res.json({ success: true, data: { required: false, signed: true, agreement: null } });
    }

    // Org admins / owners are exempt
    if (project.organizationId) {
      const isOrgMember = await isOrgAdminMember(project.organizationId, req.user);
      if (isOrgMember) {
        return res.json({ success: true, data: { required: false, signed: true, agreement: null } });
      }
    }

    // Fetch the active platform NDA
    const agreement = await prisma.legalAgreement.findFirst({
      where: { type: "nda", isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!agreement) {
      return res.json({ success: true, data: { required: false, signed: true, agreement: null } });
    }

    const signature = await prisma.userSignature.findUnique({
      where: { userId_agreementId: { userId, agreementId: agreement.id } },
    });

    return res.json({
      success: true,
      data: {
        required: true,
        signed: Boolean(signature),
        agreement,
        signature: signature || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /:projectId/sign-nda
 * Body: { agreementId }
 * Signs the NDA for the given project. Logs the action.
 */
router.post("/:projectId/sign-nda", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { agreementId } = req.body;
    const userId = req.user.id;

    if (!agreementId) throw new AppError("agreementId is required", 400);

    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const agreement = await prisma.legalAgreement.findUnique({ where: { id: agreementId } });
    if (!agreement) throw new AppError("Agreement not found", 404);
    if (!agreement.isActive) throw new AppError("This agreement is no longer active", 400);

    // Idempotent — don't error if already signed
    const existing = await prisma.userSignature.findUnique({
      where: { userId_agreementId: { userId, agreementId } },
    });

    if (existing) {
      return res.json({ success: true, data: existing, message: "NDA already signed" });
    }

    const signature = await prisma.userSignature.create({
      data: {
        userId,
        agreementId,
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      },
    });

    await logAction("NDA_SIGNED", userId, { pentestId: projectId, agreementId }, req);

    res.status(201).json({ success: true, data: signature, message: "NDA signed successfully" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:projectId", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.pentest.findUnique({
      where: { id: projectId },
      select: { id: true, leadPentesterId: true, organizationId: true, name: true }
    });

    if (!project) throw new AppError("Project not found", 404);

    // RBAC: Only lead pentester or organization admin can delete
    const isLead = project.leadPentesterId === req.user.id;
    let isOrgAdmin = false;

    if (project.organizationId) {
      isOrgAdmin = await isOrgAdminMember(project.organizationId, req.user);
    }

    if (!isLead && !isOrgAdmin) {
      throw new AppError("Unauthorized: Only project leads or organization admins can delete projects", 403);
    }

    // Fetch all collaborators to notify them before deletion
    const collaborators = await prisma.pentestCollaborator.findMany({
      where: { pentestId: projectId }
    });

    if (req.app?.locals?.sendNotification) {
      for (const collab of collaborators) {
        if (collab.userId === req.user.id) continue;
        req.app.locals.sendNotification(collab.userId, {
          type: 'INVITE_REJECTED',
          title: 'Project Deleted',
          message: `The project: ${project.name} has been deleted.`,
          pentestId: projectId,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Manually delete related records to bypass constraint issues
    await prisma.pentestCollaborator.deleteMany({ where: { pentestId: projectId } });
    await prisma.workflow.deleteMany({ where: { pentestId: projectId } });
    await prisma.finding.deleteMany({ where: { pentestId: projectId } });
    await prisma.aiAgent.deleteMany({ where: { pentestId: projectId } });

    await prisma.pentest.delete({ where: { id: projectId } });

    await logAction("PROJECT_DELETED", req.user.id, {
      pentestId: projectId,
      name: project.name
    }, req);

    res.json({ success: true, message: "Project deleted successfully" });
  } catch (error) {
    next(error);
  }
});

router.delete("/:projectId/collaborators/:userId", async (req, res, next) => {
  try {
    const { projectId, userId } = req.params;

    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { in: ["PROJECT_ADMIN", "PROJECT_LEAD", "admin", "lead"] } }
    });

    if (!canManage && !isProjectAdmin && userId !== req.user.id) {
      throw new AppError("Only organization admin, project admin, or the collaborator themselves can remove collaborators", 403);
    }

    const collaborator = await prisma.pentestCollaborator.findUnique({
      where: { pentestId_userId: { pentestId: projectId, userId } }
    });

    if (!collaborator) {
      throw new AppError("Collaborator not found in this project", 404);
    }

    const isViewer = collaborator.role === "VIEWER";

    const bannedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true }
    });

    await prisma.pentestCollaborator.delete({
      where: { pentestId_userId: { pentestId: projectId, userId } }
    });

    if (req.app?.locals?.sendNotification && userId !== req.user.id) {
      req.app.locals.sendNotification(userId, {
        type: isViewer ? 'SYSTEM' : 'INVITE_REJECTED',
        title: isViewer ? 'Access Revoked' : 'Banned from Project',
        message: isViewer 
          ? `Your read-only viewer access to the project: ${project.name} has been revoked.`
          : `You have been banned from the project: ${project.name}.`,
        pentestId: projectId,
        timestamp: new Date().toISOString()
      });
    }

    // Notify organization admins AND project admins/leads
    if (req.app?.locals?.sendNotification) {
      const recipientIds = new Set();

      if (project.organizationId) {
        const orgAdmins = await prisma.organizationMember.findMany({
          where: {
            organizationId: project.organizationId,
            role: { in: ["owner", "admin"] }
          },
          select: { userId: true }
        });
        orgAdmins.forEach(admin => recipientIds.add(admin.userId));
      }

      if (project.leadPentesterId) {
        recipientIds.add(project.leadPentesterId);
      }

      const projAdmins = await prisma.pentestCollaborator.findMany({
        where: {
          pentestId: projectId,
          role: { in: ["PROJECT_ADMIN", "PROJECT_LEAD", "admin", "lead"] }
        },
        select: { userId: true }
      });
      projAdmins.forEach(pa => recipientIds.add(pa.userId));

      recipientIds.delete(req.user.id);
      recipientIds.delete(userId);

      const actorName = req.user.fullName || req.user.handle || "An administrator";
      const targetName = bannedUser?.fullName || "a collaborator";

      for (const recipientId of recipientIds) {
        req.app.locals.sendNotification(recipientId, {
          type: isViewer ? 'SYSTEM' : 'INVITE_REJECTED',
          title: isViewer ? 'Viewer Removed from Project' : 'Hacker Banned from Project',
          message: isViewer
            ? `${actorName} revoked viewer access for ${targetName} on project: ${project.name}.`
            : `${actorName} banned hacker ${targetName} from the project: ${project.name}.`,
          pentestId: projectId,
          timestamp: new Date().toISOString()
        });
      }
    }

    await logAction(isViewer ? "VIEWER_REMOVED" : "HACKER_BANNED", req.user.id, { pentestId: projectId, targetUserId: userId }, req);

    res.json({ success: true, message: isViewer ? "Viewer removed successfully" : "Hacker banned successfully from the project" });
  } catch (error) {
    next(error);
  }
});
// Add Viewer Route
router.post("/:projectId/viewers", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { userId } = req.body;

    if (!userId) throw new AppError("userId is required", 400);

    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { in: ["PROJECT_ADMIN", "PROJECT_LEAD", "admin", "lead"] } }
    });
    const isCollaborator = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { not: "VIEWER" } }
    });
    const isLead = project.leadPentesterId === req.user.id;

    if (!canManage && !isProjectAdmin && !isLead && !isCollaborator) {
      throw new AppError("Only organization admins, project admins, or project collaborators can add viewers", 403);
    }

    const collab = await prisma.pentestCollaborator.create({
      data: {
        pentestId: projectId,
        userId: userId,
        role: "VIEWER",
        canEditFindings: false,
        canManageSessions: false
      }
    });

    // Notify the viewer themselves
    if (req.app?.locals?.sendNotification) {
      req.app.locals.sendNotification(userId, {
        type: "SYSTEM",
        title: "Project Access Granted",
        message: `You have been granted read-only (viewer) access to project: ${project.name}. You can now view the workspace.`,
        pentestId: projectId,
        timestamp: new Date().toISOString()
      });
    }

    // Notify organization admins AND project admins/leads
    if (req.app?.locals?.sendNotification) {
      const recipientIds = new Set();

      if (project.organizationId) {
        const orgAdmins = await prisma.organizationMember.findMany({
          where: { organizationId: project.organizationId, role: { in: ["owner", "admin"] } },
          select: { userId: true }
        });
        orgAdmins.forEach(admin => recipientIds.add(admin.userId));
      }

      if (project.leadPentesterId) {
        recipientIds.add(project.leadPentesterId);
      }

      const projAdmins = await prisma.pentestCollaborator.findMany({
        where: {
          pentestId: projectId,
          role: { in: ["PROJECT_ADMIN", "PROJECT_LEAD", "admin", "lead"] }
        },
        select: { userId: true }
      });
      projAdmins.forEach(pa => recipientIds.add(pa.userId));

      recipientIds.delete(req.user.id);
      recipientIds.delete(userId);

      const addedByName = req.user.fullName || req.user.handle || "A project admin";
      const addedUser = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, handle: true } });
      const addedUserName = addedUser?.fullName || addedUser?.handle || "a user";

      for (const recipientId of recipientIds) {
        req.app.locals.sendNotification(recipientId, {
          type: "SYSTEM",
          title: "Viewer Added to Project",
          message: `${addedByName} granted read-only viewer access to ${addedUserName} for project: ${project.name}.`,
          pentestId: projectId,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({ success: true, data: collab, message: "Viewer added successfully" });
  } catch (error) {
    next(error);
  }
});


// Generate Shareable Link
router.post("/:projectId/share", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { in: ["PROJECT_ADMIN", "PROJECT_LEAD", "admin", "lead"] } }
    });
    const isCollaborator = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { not: "VIEWER" } }
    });
    const isLead = project.leadPentesterId === req.user.id;

    if (!canManage && !isProjectAdmin && !isLead && !isCollaborator) {
      throw new AppError("Only organization admins, project admins, or project collaborators can generate shareable links", 403);
    }

    const token = crypto.randomBytes(32).toString("hex");

    const link = await prisma.pentestShareLink.create({
      data: {
        pentestId: projectId,
        token: token,
        createdBy: req.user.id
      }
    });

    // Notify organization admins if a project admin generates a share link
    if (!canManage && (isProjectAdmin || project.leadPentesterId === req.user.id) && project.organizationId && req.app?.locals?.sendNotification) {
      const orgAdmins = await prisma.organizationMember.findMany({
        where: { organizationId: project.organizationId, role: { in: ["owner", "admin"] } }
      });
      for (const admin of orgAdmins) {
        req.app.locals.sendNotification(admin.userId, {
          type: "SYSTEM",
          title: "Project Shared",
          message: `Project Admin ${req.user.fullName || req.user.handle || 'A user'} generated a read-only shareable link for project: ${project.name}.`,
          pentestId: projectId,
          timestamp: new Date().toISOString()
        });
      }
    }

    res.json({ success: true, data: link, message: "Shareable link generated" });
  } catch (error) {
    next(error);
  }
});

// Resolve Shareable Link
router.get("/share/:token", async (req, res, next) => {
  try {
    const { token } = req.params;
    const link = await prisma.pentestShareLink.findUnique({ where: { token } });

    if (!link) throw new AppError("Invalid or expired shareable link", 404);
    if (link.isRevoked) throw new AppError("This link has been revoked", 403);

    // Track views
    await prisma.pentestShareLink.update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 } }
    });

    const project = await prisma.pentest.findUnique({
      where: { id: link.pentestId },
      include: {
        findings: true,
      }
    });

    res.json({ success: true, data: project, message: "Project accessed via shareable link" });
  } catch (error) {
    next(error);
  }
});

// Get all share links for a project
router.get("/:projectId/share", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { in: ["PROJECT_ADMIN", "PROJECT_LEAD", "admin", "lead"] } }
    });
    const isCollaborator = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { not: "VIEWER" } }
    });
    const isLead = project.leadPentesterId === req.user.id;

    if (!canManage && !isProjectAdmin && !isLead && !isCollaborator) {
      throw new AppError("Only organization admins, project admins, or project collaborators can view shareable links", 403);
    }

    const links = await prisma.pentestShareLink.findMany({
      where: { pentestId: projectId, isRevoked: false },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, data: links, message: "Shareable links fetched" });
  } catch (error) {
    next(error);
  }
});

// Revoke all share links for a project
router.delete("/:projectId/share", async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { in: ["PROJECT_ADMIN", "PROJECT_LEAD", "admin", "lead"] } }
    });
    const isCollaborator = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { not: "VIEWER" } }
    });
    const isLead = project.leadPentesterId === req.user.id;

    if (!canManage && !isProjectAdmin && !isLead && !isCollaborator) {
      throw new AppError("Only organization admins, project admins, or project collaborators can revoke shareable links", 403);
    }

    await prisma.pentestShareLink.updateMany({
      where: { pentestId: projectId, isRevoked: false },
      data: { isRevoked: true }
    });

    res.json({ success: true, message: "All shareable links revoked" });
  } catch (error) {
    next(error);
  }
});

// Revoke a specific share link
router.delete("/:projectId/share/:linkId", async (req, res, next) => {
  try {
    const { projectId, linkId } = req.params;
    const project = await prisma.pentest.findUnique({ where: { id: projectId } });
    if (!project) throw new AppError("Project not found", 404);

    const canManage = await isOrgAdminMember(project.organizationId, req.user);
    const isProjectAdmin = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { in: ["PROJECT_ADMIN", "PROJECT_LEAD", "admin", "lead"] } }
    });
    const isCollaborator = await prisma.pentestCollaborator.findFirst({
      where: { pentestId: projectId, userId: req.user.id, role: { not: "VIEWER" } }
    });
    const isLead = project.leadPentesterId === req.user.id;

    if (!canManage && !isProjectAdmin && !isLead && !isCollaborator) {
      throw new AppError("Only organization admins, project admins, or project collaborators can revoke shareable links", 403);
    }

    await prisma.pentestShareLink.update({
      where: { id: linkId },
      data: { isRevoked: true }
    });

    res.json({ success: true, message: "Shareable link revoked" });
  } catch (error) {
    next(error);
  }
});

export default router;