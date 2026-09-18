export const SELECT_INACTIVE_USER_IDS = `
  SELECT id FROM users
  WHERE deleted_at IS NULL
    AND role <> 'admin'
    AND last_active_at < $1
  ORDER BY last_active_at
  LIMIT $2
`;

export const SELECT_EXPIRED_REQUEST_IDS = `
  SELECT id FROM repair_requests
  WHERE (
      accepted_offer_id IS NOT NULL
      AND status IN ('completed', 'cancelled')
      AND updated_at < $1
    ) OR (
      accepted_offer_id IS NULL
      AND status IN ('cancelled', 'rejected')
      AND updated_at < $2
    )
  ORDER BY updated_at
  LIMIT $3
`;

export const SELECT_REQUEST_FILE_URLS = `
  SELECT url FROM (
    SELECT unnest(photo_urls) AS url FROM repair_requests
      WHERE id = ANY($1::uuid[])
    UNION ALL
    SELECT attachment_url FROM messages
      WHERE request_id = ANY($1::uuid[]) AND attachment_url IS NOT NULL
  ) files
`;

export const REQUEST_PURGE_STATEMENTS: string[] = [
  `DELETE FROM messages WHERE request_id = ANY($1::uuid[])`,
  `UPDATE reviews SET request_id = NULL WHERE request_id = ANY($1::uuid[])`,
  `UPDATE repair_requests SET accepted_offer_id = NULL WHERE id = ANY($1::uuid[])`,
  `DELETE FROM repair_requests WHERE id = ANY($1::uuid[])`,
];

export const SELECT_EXPIRED_INQUIRY_IDS = `
  SELECT id FROM direct_inquiries
  WHERE created_at < $1
  ORDER BY created_at
  LIMIT $2
`;

export const SELECT_INQUIRY_FILE_URLS = `
  SELECT attachment_url AS url FROM messages
  WHERE inquiry_id = ANY($1::uuid[]) AND attachment_url IS NOT NULL
`;

export const INQUIRY_PURGE_STATEMENTS: string[] = [
  `DELETE FROM messages WHERE inquiry_id = ANY($1::uuid[])`,
  `DELETE FROM direct_inquiries WHERE id = ANY($1::uuid[])`,
];

export const DELETE_ACCEPTANCE_RECORDS_OF_ERASED_USERS = `
  WITH deleted AS (
    DELETE FROM terms_acceptances
    WHERE user_id IN (
      SELECT id FROM users WHERE deleted_at IS NOT NULL AND deleted_at < $1
    )
    RETURNING id
  )
  SELECT count(*)::int AS count FROM deleted
`;

export const DELETE_EXPIRED_CONTACT_MESSAGES = `
  WITH deleted AS (
    DELETE FROM contact_messages WHERE created_at < $1 RETURNING id
  )
  SELECT count(*)::int AS count FROM deleted
`;

export const DELETE_EXPIRED_CONFIRMATIONS = `
  WITH deleted AS (
    DELETE FROM email_confirmations WHERE expires_at < now() RETURNING id
  )
  SELECT count(*)::int AS count FROM deleted
`;
