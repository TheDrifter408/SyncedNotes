export const BCRYPT_SALT_ROUNDS = 10;

export const ENTITY_TYPE = {
  USER: 'user',
  NOTE: 'note',
  FOLDER: 'folder',
  EDGE: 'edge',
  STATUS: 'status',
  STATUS_GROUP: 'status_group',
  TASK: 'task',
} as const;

export type ENTITY_TYPE = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE];

export const OPERATION = {
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
} as const;

export type OPERATION = (typeof OPERATION)[keyof typeof OPERATION];
