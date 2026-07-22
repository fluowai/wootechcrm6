export interface EmailValidationResult {
  email: string;
  isValid: boolean;
  status: 'valid' | 'invalid_format' | 'invalid_domain' | 'disposable' | 'typo_suggested';
  message: string;
  suggestion?: string;
  domain?: string;
  tld?: string;
  isDisposable?: boolean;
  isRoleAccount?: boolean;
  qualityScore: number; // 0 to 100
}

// Common domain typos map: typo -> correct domain
const DOMAIN_TYPOS: Record<string, string> = {
  'gmail.co': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmail.com.br': 'gmail.com',
  'hotmial.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'hotmai.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com.br',
  'yahoo.com.b': 'yahoo.com.br',
  'iclod.com': 'icloud.com',
  'icloud.co': 'icloud.com',
  'wootech.co': 'wootech.com.br',
  'wootech.com': 'wootech.com.br',
};

// Known disposable / temporary email domains
const DISPOSABLE_DOMAINS = new Set([
  'tempmail.com',
  'temp-mail.org',
  'mailinator.com',
  '10minutemail.com',
  'yopmail.com',
  'trashmail.com',
  'guerrillamail.com',
  'sharklasers.com',
  'dispostable.com',
  'getnada.com',
  'throwawaymail.com',
  'fakeinbox.com',
  'maildrop.cc'
]);

// Common role-based account prefixes
const ROLE_PREFIXES = new Set([
  'admin', 'administrator', 'contact', 'contato', 'support', 'suporte',
  'info', 'sales', 'vendas', 'comercial', 'billing', 'financeiro',
  'help', 'ajuda', 'jobs', 'rh', 'careers', 'atendimento', 'postmaster'
]);

// Common valid TLDs
const VALID_TLDS = new Set([
  'com', 'com.br', 'net', 'org', 'edu', 'gov', 'io', 'dev', 'co', 'app',
  'tech', 'store', 'br', 'adv.br', 'med.br', 'eng.br', 'org.br', 'us', 'uk'
]);

/**
 * Validates an email address for format, domain health, disposable providers, and common typos.
 */
export function validateEmail(inputEmail: string): EmailValidationResult {
  const email = (inputEmail || '').trim().toLowerCase();

  if (!email) {
    return {
      email,
      isValid: false,
      status: 'invalid_format',
      message: 'Insira um endereço de e-mail.',
      qualityScore: 0
    };
  }

  // RFC 5322 Compliant Email Standard Format Regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return {
      email,
      isValid: false,
      status: 'invalid_format',
      message: 'Formato de e-mail inválido. Deve seguir o padrão nome@dominio.com',
      qualityScore: 10
    };
  }

  const parts = email.split('@');
  if (parts.length !== 2) {
    return {
      email,
      isValid: false,
      status: 'invalid_format',
      message: 'Sintaxe inválida: deve conter exatamente um símbolo @.',
      qualityScore: 10
    };
  }

  const [username, domain] = parts;

  // Check username length & format
  if (!username || username.length > 64) {
    return {
      email,
      isValid: false,
      status: 'invalid_format',
      message: 'O nome de usuário do e-mail é inválido ou excede o limite de caracteres.',
      qualityScore: 20
    };
  }

  // Check domain structure
  const domainParts = domain.split('.');
  if (domainParts.length < 2 || domainParts.some(p => p.length === 0)) {
    return {
      email,
      isValid: false,
      status: 'invalid_domain',
      message: 'Estrutura de domínio inválida (ex: domínio.com).',
      domain,
      qualityScore: 25
    };
  }

  // Check for domain typo suggestions
  if (DOMAIN_TYPOS[domain]) {
    const correctedDomain = DOMAIN_TYPOS[domain];
    const suggestedEmail = `${username}@${correctedDomain}`;
    return {
      email,
      isValid: false,
      status: 'typo_suggested',
      message: `Possível erro de digitação no domínio '${domain}'.`,
      suggestion: suggestedEmail,
      domain,
      qualityScore: 40
    };
  }

  // Check for disposable email domain
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      email,
      isValid: false,
      status: 'disposable',
      message: 'Provedor de e-mail temporário / descartável detectado.',
      domain,
      isDisposable: true,
      qualityScore: 30
    };
  }

  // Check role-based email account
  const isRoleAccount = ROLE_PREFIXES.has(username);

  // Calculate TLD and validate
  const tld = domainParts.slice(1).join('.');
  const primaryTld = domainParts[domainParts.length - 1];

  if (primaryTld.length < 2) {
    return {
      email,
      isValid: false,
      status: 'invalid_domain',
      message: 'Extensão de domínio (TLD) inválida.',
      domain,
      qualityScore: 35
    };
  }

  // Calculate quality score
  let qualityScore = 100;
  if (isRoleAccount) qualityScore -= 15; // Corporate role accounts are slightly less personal
  if (!VALID_TLDS.has(tld) && !VALID_TLDS.has(primaryTld)) qualityScore -= 10;

  return {
    email,
    isValid: true,
    status: 'valid',
    message: isRoleAccount 
      ? 'E-mail corporativo válido (Conta genérica/departamental).' 
      : 'Formato e domínio válidos.',
    domain,
    tld,
    isDisposable: false,
    isRoleAccount,
    qualityScore
  };
}
