import { gogJson } from '@/lib/gog';

const DEFAULT_ACCOUNT = 'openclaw@uplineagent.com';
const DEFAULT_RANGE = 'Sheet1!A:N';

export type AgentAccessSheetRow = {
  submittedAt: string;
  requestId: string;
  status: string;
  fullName: string;
  email: string;
  phone: string;
  npn: string;
  residenceState: string;
  agencyName: string;
  salesModel: string;
  notes: string;
  decisionNotes?: string;
  buyerUsername?: string;
  buyerCode?: string;
};

type AgentAccessDecisionUpdate = {
  requestId: string;
  status: string;
  decisionNotes?: string;
  buyerUsername?: string;
  buyerCode?: string;
};

export async function appendAgentAccessRequestToSheet(row: AgentAccessSheetRow) {
  const webhookUrl = process.env.AGENT_ACCESS_REQUESTS_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Agent access sheet webhook failed: HTTP ${res.status}${body ? ` ${body.slice(0, 500)}` : ''}`);
    }
    return;
  }

  const spreadsheetId = process.env.AGENT_ACCESS_REQUESTS_SHEET_ID?.trim();
  if (!spreadsheetId) return;

  const values = [[
    row.submittedAt,
    row.requestId,
    row.status,
    row.fullName,
    row.email,
    row.phone,
    row.npn,
    row.residenceState,
    row.agencyName,
    row.salesModel,
    row.notes,
    row.decisionNotes || '',
    row.buyerUsername || '',
    row.buyerCode || '',
  ]];

  await gogJson(
    [
      'sheets',
      'append',
      spreadsheetId,
      process.env.AGENT_ACCESS_REQUESTS_SHEET_RANGE?.trim() || DEFAULT_RANGE,
      '--values-json',
      JSON.stringify(values),
      '--input',
      'USER_ENTERED',
      '--insert',
      'INSERT_ROWS',
    ],
    { account: process.env.GOG_ACCOUNT?.trim() || DEFAULT_ACCOUNT }
  );
}

export async function updateAgentAccessRequestDecisionInSheet(update: AgentAccessDecisionUpdate) {
  const webhookUrl = process.env.AGENT_ACCESS_REQUESTS_WEBHOOK_URL?.trim();
  if (webhookUrl) {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'agent_access_decision', ...update }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Agent access sheet decision webhook failed: HTTP ${res.status}${body ? ` ${body.slice(0, 500)}` : ''}`);
    }
    return;
  }

  const spreadsheetId = process.env.AGENT_ACCESS_REQUESTS_SHEET_ID?.trim();
  if (!spreadsheetId) return;

  const account = process.env.GOG_ACCOUNT?.trim() || DEFAULT_ACCOUNT;
  const lookupRange = process.env.AGENT_ACCESS_REQUESTS_SHEET_RANGE?.trim() || DEFAULT_RANGE;
  const response = await gogJson(['sheets', 'get', spreadsheetId, lookupRange], { account });
  const values = Array.isArray(response?.values) ? response.values : [];
  const rowOffset = lookupRange.includes('!') && lookupRange.split('!')[1]?.match(/\d+/)
    ? Number(lookupRange.split('!')[1].match(/\d+/)?.[0] || 1) - 1
    : 0;
  const rowIndex = values.findIndex((row: unknown) => Array.isArray(row) && String(row[1] || '') === update.requestId);
  if (rowIndex < 0) return;

  const rowNumber = rowIndex + 1 + rowOffset;
  const statusRange = `Sheet1!C${rowNumber}:N${rowNumber}`;
  const existing = values[rowIndex] || [];

  await gogJson(
    [
      'sheets',
      'update',
      spreadsheetId,
      statusRange,
      '--values-json',
      JSON.stringify([[
        update.status,
        existing[3] || '',
        existing[4] || '',
        existing[5] || '',
        existing[6] || '',
        existing[7] || '',
        existing[8] || '',
        existing[9] || '',
        existing[10] || '',
        update.decisionNotes || '',
        update.buyerUsername || '',
        update.buyerCode || '',
      ]]),
      '--input',
      'USER_ENTERED',
    ],
    { account }
  );
}
