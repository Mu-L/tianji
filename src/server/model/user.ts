import { prisma } from './_client.js';
import bcryptjs from 'bcryptjs';
import { ROLES, SYSTEM_ROLES } from '@tianji/shared';
import { jwtVerify } from '../middleware/auth.js';
import { TRPCError } from '@trpc/server';
import { Prisma } from '@prisma/client';
import { AdapterUser } from '@auth/core/adapters';
import { md5, sha256 } from '../utils/common.js';
import { logger } from '../utils/logger.js';
import { promUserCounter } from '../utils/prometheus/client.js';
import { env } from '../utils/env.js';

async function hashPassword(password: string) {
  return await bcryptjs.hash(password, 10);
}

function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcryptjs.compare(password, hash);
}

export async function getUserCount(): Promise<number> {
  const count = await prisma.user.count();

  return count;
}

export const createUserSelect = {
  id: true,
  username: true,
  nickname: true,
  avatar: true,
  email: true,
  emailVerified: true,
  role: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  currentWorkspaceId: true,
  workspaces: {
    select: {
      role: true,
      workspace: {
        select: {
          id: true,
          name: true,
          settings: true,
          paused: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

/**
 * Create User
 */
export async function createAdminUser(username: string, password: string) {
  const count = await prisma.user.count();

  if (count > 0) {
    throw new Error(
      'Create Admin User Just Only allow in non people exist, you can Grant Privilege with admin user'
    );
  }

  const user = await prisma.$transaction(async (p) => {
    const newWorkspace = await p.workspace.create({
      data: {
        name: username,
      },
    });

    const user = await p.user.create({
      data: {
        username,
        password: await hashPassword(password),
        role: SYSTEM_ROLES.admin,
        workspaces: {
          create: [
            {
              role: ROLES.owner,
              workspaceId: newWorkspace.id,
            },
          ],
        },
        currentWorkspaceId: newWorkspace.id,
      },
      select: createUserSelect,
    });

    return user;
  });

  promUserCounter.inc();

  return user;
}

export async function createUser(username: string, password: string) {
  const existCount = await prisma.user.count({
    where: {
      username,
    },
  });

  if (existCount > 0) {
    throw new Error('User already exists');
  }

  const user = await prisma.$transaction(async (p) => {
    let workspaceId: string;
    let workspaceRole: ROLES;

    // Check if registerAutoJoinWorkspaceId is configured
    if (env.registerAutoJoinWorkspaceId) {
      // Verify the workspace exists
      const targetWorkspace = await p.workspace.findUnique({
        where: { id: env.registerAutoJoinWorkspaceId },
      });

      if (!targetWorkspace) {
        throw new Error('Auto-join workspace not found');
      }

      workspaceId = env.registerAutoJoinWorkspaceId;
      workspaceRole = ROLES.readOnly; // Default role for auto-joined users
    } else {
      // Create personal workspace as before
      const newWorkspace = await p.workspace.create({
        data: {
          name: username + "'s Personal Workspace",
        },
      });
      workspaceId = newWorkspace.id;
      workspaceRole = ROLES.owner;
    }

    const user = await p.user.create({
      data: {
        username,
        password: await hashPassword(password),
        role: SYSTEM_ROLES.user,
        workspaces: {
          create: [
            {
              role: workspaceRole,
              workspaceId: workspaceId,
            },
          ],
        },
        currentWorkspaceId: workspaceId,
      },
      select: createUserSelect,
    });

    return user;
  });

  promUserCounter.inc();

  return user;
}

export async function createUserWithAuthjs(data: Omit<AdapterUser, 'id'>) {
  const existCount = await prisma.user.count({
    where: {
      email: data.email,
    },
  });

  if (existCount > 0) {
    throw new Error('User already exists');
  }

  const user = await prisma.$transaction(async (p) => {
    let workspaceId: string;
    let workspaceRole: ROLES;

    // Check if registerAutoJoinWorkspaceId is configured
    if (env.registerAutoJoinWorkspaceId) {
      // Verify the workspace exists
      const targetWorkspace = await p.workspace.findUnique({
        where: { id: env.registerAutoJoinWorkspaceId },
      });

      if (!targetWorkspace) {
        throw new Error('Auto-join workspace not found');
      }

      workspaceId = env.registerAutoJoinWorkspaceId;
      workspaceRole = ROLES.readOnly; // Default role for auto-joined users
    } else {
      // Create personal workspace as before
      const newWorkspace = await p.workspace.create({
        data: {
          name: data.name ?? data.email,
        },
      });
      workspaceId = newWorkspace.id;
      workspaceRole = ROLES.owner;
    }

    const user = await p.user.create({
      data: {
        username: data.email ?? data.name ?? '',
        nickname: data.name,
        password: await hashPassword(md5(String(Date.now()))),
        email: data.email,
        emailVerified: data.emailVerified,
        role: SYSTEM_ROLES.user,
        avatar: data.image,
        workspaces: {
          create: [
            {
              role: workspaceRole,
              workspaceId: workspaceId,
            },
          ],
        },
        currentWorkspaceId: workspaceId,
      },
      select: createUserSelect,
    });

    return user;
  });

  return user;
}

export async function getUserInfo(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: createUserSelect,
  });

  return user;
}

export async function authUser(username: string, password: string) {
  const user = await prisma.user.findUnique({
    where: {
      username,
    },
    select: { ...createUserSelect, password: true },
  });

  if (!user) {
    throw new Error('User not existed');
  }

  const checkPassword = await comparePassword(password, user.password);
  if (!checkPassword) {
    throw new Error('Password incorrected');
  }

  delete (user as any)['password'];

  return user;
}

export async function authUserWithToken(token: string) {
  const payload = jwtVerify(token);

  const id = payload.id;

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id,
    },
    select: createUserSelect,
  });

  return user;
}

export async function findUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      username: true,
      role: true,
    },
  });

  return user;
}

export async function changeUserPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'user not found',
    });
  }

  const checkPassword = await comparePassword(oldPassword, user.password);
  if (!checkPassword) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'old password not correct',
    });
  }

  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      password: await hashPassword(newPassword),
    },
  });
}

/**
 * let user join workspace
 */
export async function joinWorkspace(
  userId: string,
  workspaceId: string,
  role: ROLES = ROLES.readOnly
) {
  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        workspaces: {
          connectOrCreate: {
            where: {
              userId_workspaceId: {
                userId: userId,
                workspaceId: workspaceId,
              },
            },
            create: {
              workspaceId: workspaceId,
              role,
            },
          },
        },
      },
    });
  } catch (err) {
    logger.error(err);
    throw new Error('Join Workspace Failed.');
  }
}

export async function leaveWorkspace(userId: string, workspaceId: string) {
  try {
    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        workspaces: {
          delete: {
            userId_workspaceId: {
              userId,
              workspaceId,
            },
          },
        },
      },
    });
  } catch (err) {
    logger.error(err);
    throw new Error('Leave Workspace Failed.');
  }
}

/**
 * Generate User Api Key, for user to call api
 */
export async function generateUserApiKey(
  userId: string,
  expiredAt?: Date,
  description?: string | null
) {
  const apiKey = `sk_${sha256(`${userId}.${Date.now()}`)}`;

  const result = await prisma.userApiKey.create({
    data: {
      apiKey,
      userId,
      expiredAt,
      description,
    },
  });

  return result.apiKey;
}

/**
 * Verify User Api Key
 */
export async function verifyUserApiKey(apiKey: string) {
  const result = await prisma.userApiKey.findUnique({
    where: {
      apiKey,
    },
    select: {
      user: true,
      expiredAt: true,
    },
  });

  if (result?.expiredAt && result.expiredAt.valueOf() < Date.now()) {
    throw new Error('Api Key has been expired.');
  }

  if (!result) {
    throw new Error('Api Key not found');
  }

  prisma.userApiKey
    .update({
      where: {
        apiKey,
      },
      data: {
        usage: {
          increment: 1,
        },
      },
    })
    .catch((err) => {
      logger.error('Failed to update API key usage', err);
    });

  return result.user;
}
