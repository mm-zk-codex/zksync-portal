export const isValidAmount = (amount: string) => {
  if (!amount) {
    return false;
  }
  const normalized = amount.trim();
  if (!/^\d*(\.\d+)?$/.test(normalized)) {
    return false;
  }
  return parseFloat(normalized) > 0;
};
