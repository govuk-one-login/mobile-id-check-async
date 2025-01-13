# Testing

## Custom Matchers in Jest

Jest allows the definition of custom matchers to facilitate complex test assertions. For example:

```typescript
import { expect } from "@jest/globals";

const toHaveSameFirstLetterAs = function toHaveSameFirstLetterAs(
  word: string,
  target: string,
) {
  const pass = word[0] === target[0]
  return {
    pass,
    message: pass
      ? () =>
        `Expected ${word} not to have the same first letter as ${target}`
      : () =>
        `Expected ${word} to have the same first letter as ${target}`

  };
};

expect.extend({
  toHaveSameFirstLetterAs,
});

declare module "expect" {
  interface Matchers<R> {
    toHaveSameFirstLetterAs(target: string): R;
  }
}

expect('apple').toHaveSameFirstLetterAs('apricot')
expect('apple').not.toHaveSameFirstLetterAs('banana')


```

Our custom matchers are defined in `backend-api/src/functions/testUtils/matchers.ts`.

See https://jestjs.io/docs/expect#expectextendmatchers for official documentation.