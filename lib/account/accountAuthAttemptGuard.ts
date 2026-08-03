export type AccountAuthAttemptToken = Readonly<{
  generation: number;
}>;

/**
 * Prevents a late password-auth response from overwriting a newer auth state.
 * Every auth event, replacement attempt, or unmount invalidates older tokens.
 */
export class AccountAuthAttemptGuard {
  private generation = 0;

  begin(): AccountAuthAttemptToken {
    this.generation += 1;
    return { generation: this.generation };
  }

  invalidate(): void {
    this.generation += 1;
  }

  isCurrent(token: AccountAuthAttemptToken): boolean {
    return token.generation === this.generation;
  }
}
