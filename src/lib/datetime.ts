const KST_TIME_ZONE = 'Asia/Seoul';

const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: KST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatKstDate(value: string | null | undefined): string {
  const date = parseUtcDate(value);

  if (!date) {
    return '';
  }

  const parts = getParts(dateFormatter, date);
  return `${parts.year}.${parts.month}.${parts.day}`;
}

export function formatKstDateTime(value: string | null | undefined): string {
  const date = parseUtcDate(value);

  if (!date) {
    return '';
  }

  const parts = getParts(dateTimeFormatter, date);
  return `${parts.year}.${parts.month}.${parts.day} ${parts.hour}:${parts.minute}`;
}

export function formatKstDatetimeLocal(value: string | null | undefined): string {
  const date = parseUtcDate(value);

  if (!date) {
    return '';
  }

  const parts = getParts(dateTimeFormatter, date);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function parseUtcDate(value: string | null | undefined): Date | null {
  const text = value?.trim();

  if (!text) {
    return null;
  }

  const iso = text.includes('T') ? text : text.replace(' ', 'T');
  const hasTimeZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(iso);
  const date = new Date(hasTimeZone ? iso : `${iso}Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getParts(formatter: Intl.DateTimeFormat, date: Date): Record<string, string> {
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
}
