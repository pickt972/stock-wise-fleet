/** Stock limits constrain the step buttons, not direct entry or database rules. */
export function stockQuantityState(quantity: number, available?: number) {
  return {
    decreaseDisabled: quantity <= 1,
    increaseDisabled: available !== undefined && quantity >= available,
    exceedsStock: available !== undefined && quantity > available,
  };
}

export function stepStockQuantity(quantity: number, direction: -1 | 1, available?: number): number {
  const state = stockQuantityState(quantity, available);
  if (direction === 1 && state.increaseDisabled) return quantity;
  return Math.max(1, quantity + direction);
}