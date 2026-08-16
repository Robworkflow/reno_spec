// Daniko Reno Spec Sheet — n8n Webhook Configuration
// Set these URLs after creating your n8n workflows.
// Leave as empty string to use localStorage fallback (for local testing).

const WEBHOOKS = {
  // POST {record} — save full record JSON, returns {id, updatedAt}
  SAVE_RECORD: '',

  // POST {id} — load record by id, returns full record JSON
  LOAD_RECORD: '',

  // POST {record} — send spec sheet to contractor for pricing, returns {ok}
  SEND_FOR_PRICING: '',

  // POST {record} — contractor has submitted pricing, mark as priced
  MARK_PRICED: '',

  // POST {record} — contractor signature received, mark as signed
  MARK_SIGNED: '',

  // POST FormData {file, itemId, recordId} — upload product photo, returns {url}
  UPLOAD_PHOTO: '',
};
