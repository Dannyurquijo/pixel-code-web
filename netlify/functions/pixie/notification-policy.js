const contactFingerprint = (lead) => [lead.email, lead.phone, lead.name, lead.company].filter(Boolean).join('|') || null;

const shouldNotify = ({ event, lead, previous = {}, now = Date.now(), debounceMs = 10 * 60 * 1000 }) => {
  if (!event) return { notify: false, reason: 'no_commercial_event', contact_fingerprint: contactFingerprint(lead) };
  const fingerprint = contactFingerprint(lead);
  const lastSent = Date.parse(previous.last_sent_at || '');
  const elapsed = Number.isFinite(lastSent) ? now - lastSent : Infinity;
  const scoreIncrease = lead.lead_score - Number(previous.last_score || 0);
  const newContact = Boolean(fingerprint && fingerprint !== previous.contact_fingerprint);
  const higherPriorityEvent = event !== previous.last_event && ['contact_information_captured', 'quote_requested', 'meeting_requested', 'human_contact_requested', 'high_intent_detected'].includes(event);
  const notify = elapsed >= debounceMs || scoreIncrease >= 20 || newContact || higherPriorityEvent;
  return {
    notify,
    reason: notify ? (newContact ? 'new_contact' : scoreIncrease >= 20 ? 'score_increase' : higherPriorityEvent ? 'new_high_value_event' : 'debounce_elapsed') : 'debounced',
    contact_fingerprint: fingerprint
  };
};

module.exports = { shouldNotify, contactFingerprint };
