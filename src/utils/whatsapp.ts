export function formatWhatsAppNumber(raw: string): string {
  // Remove tudo que não for número
  let digits = raw.replace(/\D/g, '');

  if (digits.length === 0) return '';

  // Se o número não tem o DDI do Brasil (55), vamos checar
  if (!digits.startsWith('55') && digits.length >= 10) {
    digits = '55' + digits;
  }

  // Verifica se o nono dígito (9) está presente após o DDD para números do Brasil
  // Se for DDD e número sem o 9 (ex: 55 11 8888-8888), o tamanho é 12
  // Mas vamos manter a flexibilidade de enviar o JID bruto para o Go validar.
  return digits; // Retorna sempre só os números limpos, ex: 5548988003260
}

export function displayWhatsAppNumber(raw: string): string {
  const formatted = formatWhatsAppNumber(raw);
  return `+${formatted}`; // Padrão visual com +
}

export async function validateNumberWithGoService(number: string): Promise<boolean> {
  try {
    const formatted = formatWhatsAppNumber(number);
    const res = await fetch(`/api/whatsapp/validate?number=${formatted}`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.valid === true;
  } catch (error) {
    console.error("Erro ao validar número no serviço Go:", error);
    return false;
  }
}
