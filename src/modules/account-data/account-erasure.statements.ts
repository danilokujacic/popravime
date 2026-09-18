export const COLLECT_FILE_URLS = `
  SELECT url FROM (
    SELECT unnest(photo_urls) AS url FROM repair_requests WHERE customer_id = $1
    UNION ALL
    SELECT attachment_url FROM messages
      WHERE sender_id = $1 AND attachment_url IS NOT NULL
    UNION ALL
    SELECT g.image_url FROM provider_gallery g
      JOIN providers p ON p.id = g.provider_id WHERE p.owner_user_id = $1
    UNION ALL
    SELECT v.document_url FROM verification_requests v
      JOIN providers p ON p.id = v.provider_id WHERE p.owner_user_id = $1
  ) files
`;

export const HAS_ACTIVE_WORK = `
  SELECT (
    EXISTS (
      SELECT 1 FROM repair_requests
      WHERE customer_id = $1 AND status IN ('accepted', 'in_progress')
    )
    OR EXISTS (
      SELECT 1 FROM offers o
        JOIN providers p ON p.id = o.provider_id
        JOIN repair_requests r ON r.id = o.request_id
      WHERE p.owner_user_id = $1
        AND o.status = 'accepted'
        AND r.status IN ('accepted', 'in_progress')
    )
  ) AS active
`;

export const ERASURE_STATEMENTS: string[] = [
  `UPDATE offers SET status = 'cancelled'
    WHERE status = 'pending' AND request_id IN (
      SELECT id FROM repair_requests
      WHERE customer_id = $1
        AND status IN ('pending_review', 'open', 'offers_received')
    )`,
  `UPDATE repair_requests SET
      photo_urls = '{}',
      status = CASE
        WHEN status IN ('pending_review', 'open', 'offers_received')
          THEN 'cancelled'::request_status_enum
        ELSE status
      END,
      updated_at = now()
    WHERE customer_id = $1`,
  `UPDATE offers SET status = 'withdrawn'
    WHERE status = 'pending' AND provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = $1
    )`,
  `UPDATE messages SET attachment_url = NULL WHERE sender_id = $1`,
  `UPDATE direct_inquiries SET name = NULL, contact_email = NULL, contact_phone = NULL
    WHERE customer_id = $1`,
  `DELETE FROM provider_gallery WHERE provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = $1
    )`,
  `DELETE FROM verification_requests WHERE provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = $1
    )`,
  `DELETE FROM provider_categories WHERE provider_id IN (
      SELECT id FROM providers WHERE owner_user_id = $1
    )`,
  `UPDATE providers SET
      business_name = 'Deleted provider',
      slug = 'deleted-' || id::text,
      description = NULL,
      address = '',
      latitude = NULL,
      longitude = NULL,
      phone = NULL,
      email = NULL,
      website = NULL,
      working_hours = NULL,
      apr_registration_number = NULL,
      verification_status = 'rejected',
      is_certified = false,
      updated_at = now()
    WHERE owner_user_id = $1`,
  `DELETE FROM notifications WHERE user_id = $1`,
  `DELETE FROM email_confirmations
    WHERE email = (SELECT email FROM users WHERE id = $1)`,
  `DELETE FROM contact_messages
    WHERE lower(email) = lower((SELECT email FROM users WHERE id = $1))`,
  `UPDATE users SET
      email = 'deleted-' || id::text || '@deleted.invalid',
      full_name = 'Deleted user',
      phone = NULL,
      password_hash = '!',
      oauth_provider = NULL,
      oauth_id = NULL,
      email_verified = false,
      deleted_at = now(),
      updated_at = now()
    WHERE id = $1`,
];
