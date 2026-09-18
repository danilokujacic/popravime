import { DataSource } from 'typeorm';
import { PRIVATE_REFERENCE_PREFIX } from '../../modules/infra/storage/storage.types';

export interface UploadMigrationStorage {
  CopyToPrivate(key: string): Promise<void>;
  DeletePublic(key: string): Promise<void>;
}

export interface PrivatizeSummary {
  rows: number;
  objects: number;
  leftInPublicBucket: string[];
}

interface UploadColumn {
  table: string;
  column: string;
  isArray: boolean;
}

interface Row {
  id: string;
  value: string | string[];
}

const UPLOAD_COLUMNS: UploadColumn[] = [
  { table: 'repair_requests', column: 'photo_urls', isArray: true },
  { table: 'messages', column: 'attachment_url', isArray: false },
  { table: 'verification_requests', column: 'document_url', isArray: false },
];

export class PrivatizeUploads {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: UploadMigrationStorage,
    private readonly publicPrefix: string,
    private readonly dryRun: boolean,
  ) {}

  async Run(): Promise<PrivatizeSummary> {
    const summary: PrivatizeSummary = {
      rows: 0,
      objects: 0,
      leftInPublicBucket: [],
    };

    for (const column of UPLOAD_COLUMNS) {
      await this.MigrateColumn(column, summary);
    }
    return summary;
  }

  private async MigrateColumn(
    column: UploadColumn,
    summary: PrivatizeSummary,
  ): Promise<void> {
    const rows = await this.SelectRows(column);

    for (const row of rows) {
      const keys = this.PublicKeys(row.value);
      summary.rows += 1;
      summary.objects += keys.length;

      if (!this.dryRun) {
        await this.MigrateRow(column, row, keys, summary);
      }
    }
  }

  private async MigrateRow(
    column: UploadColumn,
    row: Row,
    keys: string[],
    summary: PrivatizeSummary,
  ): Promise<void> {
    for (const key of keys) {
      await this.storage.CopyToPrivate(key);
    }
    await this.UpdateRow(column, row);

    for (const key of keys) {
      await this.storage.DeletePublic(key).catch(() => {
        summary.leftInPublicBucket.push(key);
      });
    }
  }

  private SelectRows(column: UploadColumn): Promise<Row[]> {
    const pattern = `${this.publicPrefix}%`;
    const statement = column.isArray
      ? `SELECT id, ${column.column} AS value FROM ${column.table}
         WHERE EXISTS (SELECT 1 FROM unnest(${column.column}) AS item WHERE item LIKE $1)`
      : `SELECT id, ${column.column} AS value FROM ${column.table}
         WHERE ${column.column} LIKE $1`;
    return this.dataSource.query<Row[]>(statement, [pattern]);
  }

  private async UpdateRow(column: UploadColumn, row: Row): Promise<void> {
    await this.dataSource.query(
      `UPDATE ${column.table} SET ${column.column} = $2 WHERE id = $1`,
      [row.id, this.Rewrite(row.value)],
    );
  }

  private Rewrite(value: string | string[]): string | string[] {
    return Array.isArray(value)
      ? value.map((item) => this.RewriteOne(item))
      : this.RewriteOne(value);
  }

  private RewriteOne(value: string): string {
    return value.startsWith(this.publicPrefix)
      ? `${PRIVATE_REFERENCE_PREFIX}${value.slice(this.publicPrefix.length)}`
      : value;
  }

  private PublicKeys(value: string | string[]): string[] {
    const values = Array.isArray(value) ? value : [value];
    return values
      .filter((item) => item.startsWith(this.publicPrefix))
      .map((item) => item.slice(this.publicPrefix.length));
  }
}
