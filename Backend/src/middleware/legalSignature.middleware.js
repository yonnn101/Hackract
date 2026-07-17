import prisma from "../database/prismaClient.js";
import AppError from "../utils/AppError.js";

/**
 * checkLegalSignature
 * 
 * Middleware to enforce that a user has signed the active platform NDA 
 * before accessing organizational project tools or applying for an engagement.
 * 
 * Logic:
 * 1. If project is personal (isPersonal: true) -> ALLOW.
 * 2. If user is an Owner/Admin of the Project's Organization -> ALLOW.
 * 3. If user has signed the active 'nda' type agreement -> ALLOW.
 * 
 * Rejection:
 * Returns 403 LEGAL_AUTHORIZATION_REQUIRED
 */
export const checkLegalSignature = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let projectId = req.params.projectId || req.body.projectId || req.query.projectId || req.params.pentestId || req.body.pentestId;
    
    const agentId   = req.params.id || req.body.agentId || req.query.agentId;
    const findingId = req.params.id || req.body.findingId || req.query.findingId;

    // If no projectId but we have an agentId, look up the project
    if (!projectId && agentId && req.baseUrl.includes('ai-agents')) {
      const agent = await prisma.aiAgent.findUnique({
        where: { id: agentId },
        select: { pentestId: true }
      });
      projectId = agent?.pentestId;
    }

    // If no projectId but we have a findingId, look up the project
    if (!projectId && findingId && req.baseUrl.includes('findings')) {
      const finding = await prisma.finding.findUnique({
        where: { id: findingId },
        select: { pentestId: true }
      });
      projectId = finding?.pentestId;
    }

    if (!projectId) {
      return next(); // If we can't find a project context, we can't enforce NDA (allow for now)
    }

    // 1. Fetch project details
    const project = await prisma.pentest.findUnique({
      where: { id: projectId },
      select: { 
        organizationId: true, 
        isPersonal: true,
        leadPentesterId: true
      },
    });

    if (!project) {
      return next(new AppError("Project not found", 404));
    }

    // 2. Personal workspaces are exempt
    if (project.isPersonal || project.leadPentesterId === userId) {
      return next();
    }

    // 3. Org Owner/Admin of the project organization are exempt
    if (project.organizationId) {
      const orgMember = await prisma.organizationMember.findFirst({
        where: {
          organizationId: project.organizationId,
          userId,
          role: { in: ["owner", "admin"] },
        },
      });

      if (orgMember) {
        return next();
      }
    }

    // 4. Check for active platform NDA signature
    const activeNDA = await prisma.legalAgreement.findFirst({
      where: { type: "nda", isActive: true },
      orderBy: { version: "desc" },
    });

    if (!activeNDA) {
      // If the platform team hasn't set up an active NDA, we don't block users.
      console.warn("[Platform Legal]: No active NDA agreement found. Bypassing check.");
      return next();
    }

    const signature = await prisma.userSignature.findUnique({
      where: {
        userId_agreementId: {
          userId,
          agreementId: activeNDA.id,
        },
      },
    });

    if (!signature) {
      throw new AppError(
        "You must sign the platform NDA before accessing this organizational workspace.",
        403,
        "LEGAL_AUTHORIZATION_REQUIRED"
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
