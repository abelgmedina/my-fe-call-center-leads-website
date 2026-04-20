export type CarrierId = 'senior_life';

export type CarrierDetails = {
  id: CarrierId;
  name: string;
  agentNumber?: string;
  website?: string;
  phone?: string;
  // Keep claims conservative unless sourced.
  companyHighlights: string[];
  finalExpenseHighlights: string[];
  underwritingReminders: string[];
  scriptTalkingPoints: string[];
  notes?: string;
};

// NOTE: Keep this content factual and conservative.
// If you want precise product specs (issue ages, face amounts, waiting periods, riders),
// paste/upload the current Senior Life agent guide/brochure and we can update this.
export const CARRIERS: CarrierDetails[] = [
  {
    id: 'senior_life',
    name: 'Senior Life Insurance Company',
    agentNumber: '223781',
    website: 'https://www.seniorlifeinsurancecompany.com/',
    companyHighlights: [
      'Founded in 1970; Senior Life has been helping families with burial planning for over 50 years.',
      'We help customers and their loved ones in 40 states + the District of Columbia.',
      'We provide lifetime coverage and pay most claims within 24 hours of receiving complete paperwork.',
      'Excellent customer service staff is available to answer any questions you have throughout the process.',
    ],
    finalExpenseHighlights: [
      'Permanent whole life insurance protection with burial/final expense focus.',
      'Issue ages 0–85 and face amounts from $1,000 up to $30,000 (subject to underwriting).',
      'Accidental Death Benefit Rider is available, plus premiums do not increase and benefits do not decrease.',
      'No medical exam required—just answer a few simple health questions to qualify.',
      'Most policies go immediately to full benefit once the first premium is honored; no waiting period.',
      'Builds cash value (and loan value) with automatic premium loan provision for added flexibility.',
      'Policy cannot be cancelled by the company except for non-payment of premiums.',
      'We pay most claims within 24 hours of receiving the necessary paperwork.',
    ],
    underwritingReminders: [
      'Confirm tobacco usage accurately (carrier definitions can vary).',
      'Document major health history and current/recent medications before moving forward.',
      'If any knockout conditions come up, pause and verify guidelines before proceeding.',
    ],
    scriptTalkingPoints: [
      '“This is meant to help with final expenses so your family isn\'t stuck with the bill.”',
      '“We\'ll confirm a few basics like age, tobacco, and who you\'d want as beneficiary—then a licensed agent can finalize options.”',
      '“Do you currently have no coverage, some coverage, or are you fully covered already?”',
    ],
    notes:
      'Field guide content pulled from the Senior Life agent portal; upload any additional material if you need us to extend the spec sheet further.',
  },
];

export function getCarrier(id: CarrierId) {
  return CARRIERS.find((c) => c.id === id) || null;
}
