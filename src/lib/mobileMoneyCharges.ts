// Mobile Money withdrawal charges by telecom network
// Rates are approximate and based on common East/West African telecom pricing

interface ChargeResult {
  network: string;
  networkIcon: string;
  chargeAmount: number;
  chargePercent: number;
  totalWithCharge: number;
}

const TELECOM_PREFIXES: Record<string, { prefixes: string[]; name: string; icon: string }> = {
  // Uganda
  mtn_ug: { prefixes: ['+25677', '+25678', '+25676', '+25639'], name: 'MTN Uganda', icon: '🟡' },
  airtel_ug: { prefixes: ['+25670', '+25674', '+25675', '+25620'], name: 'Airtel Uganda', icon: '🔴' },
  // Kenya
  mpesa_ke: { prefixes: ['+2547', '+25411'], name: 'M-Pesa Kenya', icon: '🟢' },
  airtel_ke: { prefixes: ['+25473', '+25478', '+25410'], name: 'Airtel Kenya', icon: '🔴' },
  // Tanzania
  mpesa_tz: { prefixes: ['+25565', '+25567', '+25571'], name: 'M-Pesa Tanzania', icon: '🟢' },
  tigo_tz: { prefixes: ['+25571', '+25565'], name: 'Tigo Tanzania', icon: '🔵' },
  airtel_tz: { prefixes: ['+25568', '+25569'], name: 'Airtel Tanzania', icon: '🔴' },
  // Rwanda
  mtn_rw: { prefixes: ['+25078', '+25079'], name: 'MTN Rwanda', icon: '🟡' },
  airtel_rw: { prefixes: ['+25072', '+25073'], name: 'Airtel Rwanda', icon: '🔴' },
  // DRC
  mpesa_cd: { prefixes: ['+24381', '+24382', '+24389'], name: 'Vodacom DRC', icon: '🔴' },
  orange_cd: { prefixes: ['+24384', '+24385'], name: 'Orange DRC', icon: '🟠' },
  airtel_cd: { prefixes: ['+24399', '+24397'], name: 'Airtel DRC', icon: '🔴' },
  // Nigeria
  mtn_ng: { prefixes: ['+23480', '+23481', '+23490', '+23470', '+23471'], name: 'MTN Nigeria', icon: '🟡' },
  glo_ng: { prefixes: ['+23450', '+23451', '+23490', '+23491'], name: 'Glo Nigeria', icon: '🟢' },
  airtel_ng: { prefixes: ['+23480', '+23490', '+23470', '+23471'], name: 'Airtel Nigeria', icon: '🔴' },
  // Ghana
  mtn_gh: { prefixes: ['+23324', '+23354', '+23355', '+23359'], name: 'MTN Ghana', icon: '🟡' },
  vodafone_gh: { prefixes: ['+23320', '+23350'], name: 'Vodafone Ghana', icon: '🔴' },
  // Ethiopia
  ethio: { prefixes: ['+2519', '+2517', '+2511'], name: 'Ethio Telecom', icon: '🟢' },
  // South Africa
  vodacom_za: { prefixes: ['+2760', '+2766', '+2772', '+2782'], name: 'Vodacom SA', icon: '🔴' },
  mtn_za: { prefixes: ['+2771', '+2776', '+2778', '+2783'], name: 'MTN SA', icon: '🟡' },
  // Cameroon
  mtn_cm: { prefixes: ['+23767', '+23768', '+23765'], name: 'MTN Cameroon', icon: '🟡' },
  orange_cm: { prefixes: ['+23769', '+23755', '+23756'], name: 'Orange Cameroon', icon: '🟠' },
  // Senegal
  orange_sn: { prefixes: ['+22177', '+22178'], name: 'Orange Senegal', icon: '🟠' },
  // Cote d'Ivoire
  mtn_ci: { prefixes: ['+22505', '+22504'], name: 'MTN Côte d\'Ivoire', icon: '🟡' },
  orange_ci: { prefixes: ['+22507', '+22508'], name: 'Orange Côte d\'Ivoire', icon: '🟠' },
  // Morocco
  maroc_ma: { prefixes: ['+2126', '+2127'], name: 'Maroc Telecom', icon: '🟢' },
  // Generic fallback
  safaricom: { prefixes: ['+2547'], name: 'Safaricom', icon: '🟢' },
};

// Withdrawal charge tiers (percentage of amount)
// These approximate real telecom rates
const CHARGE_TIERS: { maxAmount: number; percent: number }[] = [
  { maxAmount: 500, percent: 0 },       // Free for very small amounts
  { maxAmount: 2500, percent: 0.5 },    // 0.5% for small amounts
  { maxAmount: 5000, percent: 1.0 },    // 1% for medium amounts
  { maxAmount: 15000, percent: 1.5 },   // 1.5%
  { maxAmount: 45000, percent: 2.0 },   // 2%
  { maxAmount: 100000, percent: 2.5 },  // 2.5% for large
  { maxAmount: 500000, percent: 3.0 },  // 3%
  { maxAmount: Infinity, percent: 3.5 },// 3.5% for very large
];

function getChargePercent(amount: number): number {
  for (const tier of CHARGE_TIERS) {
    if (amount <= tier.maxAmount) return tier.percent;
  }
  return 3.5;
}

export function detectNetwork(phoneNumber: string): { name: string; icon: string } | null {
  if (!phoneNumber) return null;
  const cleaned = phoneNumber.replace(/[\s\-()]/g, '');
  
  for (const [, network] of Object.entries(TELECOM_PREFIXES)) {
    for (const prefix of network.prefixes) {
      if (cleaned.startsWith(prefix)) {
        return { name: network.name, icon: network.icon };
      }
    }
  }
  
  // If no prefix matched but starts with +, try generic detection
  if (cleaned.startsWith('+')) return { name: 'Mobile Money', icon: '📱' };
  return null;
}

export function calculateMobileMoneyCharge(amount: number, phoneNumber?: string): ChargeResult {
  const network = phoneNumber ? detectNetwork(phoneNumber) : null;
  const percent = getChargePercent(amount);
  const chargeAmount = Math.round(amount * percent / 100);
  
  return {
    network: network?.name || 'Mobile Money',
    networkIcon: network?.icon || '📱',
    chargeAmount,
    chargePercent: percent,
    totalWithCharge: amount + chargeAmount,
  };
}
