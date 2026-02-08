
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getSafeError(e: any): string {
    if (typeof e === 'string') return e;
    if (e?.message && typeof e.message === 'string') return e.message;
    try {
        return JSON.stringify(e);
    } catch {
        return 'Unknown Error';
    }
}

export function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function isValidCPF(cpf: string): boolean {
    if (!cpf) return false;
    // Remove caracteres não numéricos
    const cleanCPF = cpf.replace(/[^\d]+/g, '');

    if (cleanCPF.length !== 11 || !!cleanCPF.match(/(\d)\1{10}/)) return false;

    const cpfArray = cleanCPF.split('').map(el => +el);
    const rest = (count: number) => (cpfArray.slice(0, count - 12)
        .reduce((soma, el, index) => (soma + el * (count - index)), 0) * 10) % 11 % 10;

    return rest(10) === cpfArray[9] && rest(11) === cpfArray[10];
}

export function formatCPF(cpf: string): string {
  if (!cpf) return '';
  const numeric = cpf.replace(/\D/g, '');
  if (numeric.length !== 11) return cpf;
  return numeric.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function cleanPhone(phone: string): string {
    return phone.replace(/[^\d()-\s+]/g, ''); // Permite dígitos, parenteses, hifen, espaço e +
}
