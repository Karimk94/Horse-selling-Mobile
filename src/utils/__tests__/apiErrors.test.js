import { extractApiErrorMessage } from '../apiErrors';

describe('extractApiErrorMessage', () => {
  it('returns a string detail directly', () => {
    expect(
      extractApiErrorMessage(
        { response: { data: { detail: 'Only accepted offers can be marked sold' } } },
        'fallback'
      )
    ).toBe('Only accepted offers can be marked sold');
  });

  it('joins FastAPI validation detail arrays into a readable string', () => {
    expect(
      extractApiErrorMessage(
        {
          response: {
            data: {
              detail: [
                { loc: ['body', 'price'], msg: 'Input should be greater than 0' },
                { loc: ['body', 'title'], msg: 'Field required' },
              ],
            },
          },
        },
        'fallback'
      )
    ).toBe('price: Input should be greater than 0\ntitle: Field required');
  });

  it('falls back to the provided message when no structured payload exists', () => {
    expect(extractApiErrorMessage({}, 'fallback')).toBe('fallback');
  });
});