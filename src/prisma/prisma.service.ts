import { Injectable } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

import 'dotenv/config';
import { env } from 'prisma/config';

@Injectable()
export class Prisma extends PrismaClient {
  constructor() {
    const connectionString = env('DATABASE_URL');
    const adapter = new PrismaPg({
      connectionString,
    });
    super({ adapter });
  }
}
