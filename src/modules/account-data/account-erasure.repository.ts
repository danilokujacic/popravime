import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  COLLECT_FILE_URLS,
  ERASURE_STATEMENTS,
  HAS_ACTIVE_WORK,
} from './account-erasure.statements';

interface FileUrlRow {
  url: string;
}

interface ActiveWorkRow {
  active: boolean;
}

@Injectable()
export class AccountErasureRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async HasActiveWork(userId: string): Promise<boolean> {
    const rows = await this.dataSource.query<ActiveWorkRow[]>(HAS_ACTIVE_WORK, [
      userId,
    ]);
    return rows[0]?.active === true;
  }

  Erase(userId: string): Promise<string[]> {
    return this.dataSource.transaction(async (manager) => {
      const rows = await manager.query<FileUrlRow[]>(COLLECT_FILE_URLS, [
        userId,
      ]);

      for (const statement of ERASURE_STATEMENTS) {
        await manager.query(statement, [userId]);
      }

      return rows.map((row) => row.url);
    });
  }
}
