declare module "bun:test" {
  export const test: (name: string, fn: () => unknown) => void;
  export const it: typeof test;
  export const describe: (name: string, fn: () => void) => void;
  export const expect: (value: unknown) => any;
}
