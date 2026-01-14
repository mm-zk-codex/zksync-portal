type AmountValidationOptions = {
  allowEmpty?: boolean;
  decimals?: number;
};

export const getAmountError = (amount: string, decimals = 18, options: AmountValidationOptions = {}) => {
  const normalized = amount.trim();
  if (!normalized) {
    return options.allowEmpty ? null : "Enter an amount.";
  }
  if (!/^\d*(\.\d+)?$/.test(normalized)) {
    return "Amount must be a valid number.";
  }
  if (parseFloat(normalized) <= 0) {
    return "Amount must be greater than zero.";
  }
  const [, fractional] = normalized.split(".");
  if (fractional && fractional.length > decimals) {
    return `Too many decimals (max ${decimals}).`;
  }
  return null;
};

export const isValidAmount = (amount: string, decimals = 18) => !getAmountError(amount, decimals);
