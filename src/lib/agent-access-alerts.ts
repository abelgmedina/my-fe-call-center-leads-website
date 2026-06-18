import { getTwilioClient, requireEnv } from '@/lib/twilio';

type AgentAccessSmsParams = {
  requestId: string;
  fullName: string;
  email: string;
  phone: string;
  npn: string;
  residenceState: string;
  agencyName: string;
  salesModel: string;
  notes: string;
};

function compact(value: string, max = 180) {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}

export async function sendAgentAccessRequestSms(params: AgentAccessSmsParams) {
  const from = requireEnv('TWILIO_SMS_FROM');
  const to = requireEnv('ALERT_TO');
  const client = getTwilioClient();
  const baseUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, '');
  const approvalUrl = baseUrl ? `${baseUrl}/ops/agent-approvals` : '/ops/agent-approvals';

  const body = [
    `New Upline Agent request #${params.requestId}`,
    `${params.fullName}`,
    `Phone: ${params.phone}`,
    `Email: ${params.email}`,
    `NPN: ${params.npn}`,
    `Home license: ${params.residenceState}`,
    `Agency: ${compact(params.agencyName, 220)}`,
    `Sales: ${params.salesModel}`,
    params.notes ? `Notes: ${compact(params.notes, 220)}` : '',
    `Review: ${approvalUrl}`,
  ].filter(Boolean).join('\n');

  await client.messages.create({ from, to, body: body.slice(0, 1500) });
}
