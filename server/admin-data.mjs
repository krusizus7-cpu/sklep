import { createHash } from 'node:crypto';

export const revisionOf = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export const stockReasons = {
  delivery: 'Przyjęcie dostawy',
  count: 'Inwentaryzacja',
  error: 'Korekta błędu',
  damage: 'Uszkodzenie lub ubytek'
};

export function writeTransaction(db, operation) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function openAudit(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS adminAudit (
      id INTEGER PRIMARY KEY,
      at TEXT NOT NULL,
      actor TEXT NOT NULL,
      module TEXT NOT NULL,
      action TEXT NOT NULL,
      entity TEXT NOT NULL,
      detail TEXT
    );
    CREATE INDEX IF NOT EXISTS adminAuditByTime ON adminAudit(at, id);
    CREATE INDEX IF NOT EXISTS adminAuditByModule ON adminAudit(module, at, id);
  `);
  const insert = db.prepare('INSERT INTO adminAudit (at, actor, module, action, entity, detail) VALUES (?, ?, ?, ?, ?, ?)');
  return {
    write(actor, module, action, entity, detail = null) {
      if (actor) insert.run(new Date().toISOString(), actor, module, action, entity, detail === null ? null : JSON.stringify(detail));
    },
    list({module = '', from = '', until = '', offset = 0, limit = 26} = {}) {
      const clauses = [];
      const values = [];
      if (module) { clauses.push('module = ?'); values.push(module); }
      if (from) { clauses.push('at >= ?'); values.push(from); }
      if (until) { clauses.push('at < ?'); values.push(until); }
      const where = clauses.length ? ' WHERE ' + clauses.join(' AND ') : '';
      return db.prepare('SELECT id, at, actor, module, action, entity, detail FROM adminAudit' + where +
        ' ORDER BY at DESC, id DESC LIMIT ? OFFSET ?').all(...values, limit, offset);
    }
  };
}
