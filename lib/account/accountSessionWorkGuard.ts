export type AccountSessionWorkToken = Readonly<{
  generation: number;
  userId: string;
}>;

/**
 * Keeps account-owned async work bound to the session that started it.
 * A new session (including sign-out) invalidates every token from the prior
 * session, even when the same user signs in again later.
 */
export class AccountSessionWorkGuard {
  private generation = 0;
  private userId: string | null = null;

  setSession(userId: string | null): void {
    this.generation += 1;
    this.userId = userId;
  }

  invalidate(): void {
    this.setSession(null);
  }

  capture(userId = this.userId): AccountSessionWorkToken | null {
    if (!userId || userId !== this.userId) return null;
    return { generation: this.generation, userId };
  }

  isCurrent(token: AccountSessionWorkToken): boolean {
    return token.generation === this.generation && token.userId === this.userId;
  }
}
