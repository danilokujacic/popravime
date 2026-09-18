import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { PurgeOutcome } from './retention.types';
import {
  DELETE_ACCEPTANCE_RECORDS_OF_ERASED_USERS,
  DELETE_EXPIRED_CONFIRMATIONS,
  DELETE_EXPIRED_CONTACT_MESSAGES,
  INQUIRY_PURGE_STATEMENTS,
  REQUEST_PURGE_STATEMENTS,
  SELECT_EXPIRED_INQUIRY_IDS,
  SELECT_INACTIVE_USER_IDS,
  SELECT_EXPIRED_REQUEST_IDS,
  SELECT_INQUIRY_FILE_URLS,
  SELECT_REQUEST_FILE_URLS,
} from './retention.statements';

interface IdRow {
  id: string;
}

interface FileUrlRow {
  url: string;
}

interface CountRow {
  count: number;
}

const NOTHING_PURGED: PurgeOutcome = { records: 0, fileUrls: [] };

@Injectable()
export class RetentionRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  FindInactiveUserIds(cutoff: Date, batchSize: number): Promise<string[]> {
    return this.SelectIds(this.dataSource.manager, SELECT_INACTIVE_USER_IDS, [
      cutoff,
      batchSize,
    ]);
  }

  PurgeClosedRequests(
    completedCutoff: Date,
    unacceptedCutoff: Date,
    batchSize: number,
  ): Promise<PurgeOutcome> {
    return this.dataSource.transaction(async (manager) => {
      const ids = await this.SelectIds(manager, SELECT_EXPIRED_REQUEST_IDS, [
        completedCutoff,
        unacceptedCutoff,
        batchSize,
      ]);
      return this.PurgeIds(
        manager,
        ids,
        SELECT_REQUEST_FILE_URLS,
        REQUEST_PURGE_STATEMENTS,
      );
    });
  }

  PurgeInquiries(cutoff: Date, batchSize: number): Promise<PurgeOutcome> {
    return this.dataSource.transaction(async (manager) => {
      const ids = await this.SelectIds(manager, SELECT_EXPIRED_INQUIRY_IDS, [
        cutoff,
        batchSize,
      ]);
      return this.PurgeIds(
        manager,
        ids,
        SELECT_INQUIRY_FILE_URLS,
        INQUIRY_PURGE_STATEMENTS,
      );
    });
  }

  async PurgeContactMessages(cutoff: Date): Promise<number> {
    const rows = await this.dataSource.query<CountRow[]>(
      DELETE_EXPIRED_CONTACT_MESSAGES,
      [cutoff],
    );
    return rows[0]?.count ?? 0;
  }

  async PurgeAcceptanceRecords(erasedBefore: Date): Promise<number> {
    const rows = await this.dataSource.query<CountRow[]>(
      DELETE_ACCEPTANCE_RECORDS_OF_ERASED_USERS,
      [erasedBefore],
    );
    return rows[0]?.count ?? 0;
  }

  async PurgeExpiredConfirmations(): Promise<number> {
    const rows = await this.dataSource.query<CountRow[]>(
      DELETE_EXPIRED_CONFIRMATIONS,
    );
    return rows[0]?.count ?? 0;
  }

  private async SelectIds(
    manager: EntityManager,
    statement: string,
    parameters: unknown[],
  ): Promise<string[]> {
    const rows = await manager.query<IdRow[]>(statement, parameters);
    return rows.map((row) => row.id);
  }

  private async PurgeIds(
    manager: EntityManager,
    ids: string[],
    fileUrlsStatement: string,
    purgeStatements: string[],
  ): Promise<PurgeOutcome> {
    if (ids.length === 0) {
      return NOTHING_PURGED;
    }

    const files = await manager.query<FileUrlRow[]>(fileUrlsStatement, [ids]);
    for (const statement of purgeStatements) {
      await manager.query(statement, [ids]);
    }

    return { records: ids.length, fileUrls: files.map((row) => row.url) };
  }
}
