export const toPrice = (cents: number) => cents / 100;
export const toCents = (price: number) => Math.round(price * 100);
