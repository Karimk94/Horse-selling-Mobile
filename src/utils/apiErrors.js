function formatDetailEntry(entry) {
  if (!entry) {
    return null;
  }

  if (typeof entry === 'string') {
    return entry;
  }

  if (typeof entry === 'object') {
    const message = typeof entry.msg === 'string' ? entry.msg : null;
    const location = Array.isArray(entry.loc) ? entry.loc.slice(1).join('.') : null;

    if (message && location) {
      return `${location}: ${message}`;
    }

    if (message) {
      return message;
    }
  }

  return null;
}

export function extractApiErrorMessage(error, fallbackMessage) {
  const data = error?.response?.data;
  const detail = data?.detail;

  if (typeof detail === 'string' && detail.trim()) {
    return detail.trim();
  }

  if (Array.isArray(detail)) {
    const messages = detail.map(formatDetailEntry).filter(Boolean);
    if (messages.length > 0) {
      return messages.join('\n');
    }
  }

  if (detail && typeof detail === 'object') {
    const nestedMessage =
      formatDetailEntry(detail) ||
      (typeof detail.message === 'string' ? detail.message : null);
    if (nestedMessage) {
      return nestedMessage;
    }
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message.trim();
  }

  return fallbackMessage;
}