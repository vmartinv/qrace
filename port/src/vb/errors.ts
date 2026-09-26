// A VB run-time error (the program shows it and ends, as VB does when a
// procedure has no error handler).
export class VBError extends Error {
  constructor(public readonly code: number, message: string) {
    super(message);
  }
}

export const overflow = () => new VBError(6, "Overflow");
