const mockApiInstance = {
  interceptors: {
    request: {
      use: jest.fn(),
    },
    response: {
      use: jest.fn(),
    },
  },
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
};

jest.mock('axios', () => ({
  create: jest.fn(() => mockApiInstance),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => null),
  removeItem: jest.fn(async () => null),
}));

describe('mobile api service', () => {
  let apiModule;
  let rejectedHandler;

  beforeEach(() => {
    jest.resetModules();
    mockApiInstance.get.mockReset();
    mockApiInstance.post.mockReset();
    mockApiInstance.put.mockReset();
    mockApiInstance.interceptors.request.use.mockReset();
    mockApiInstance.interceptors.response.use.mockReset();

    apiModule = require('../api');
    rejectedHandler = mockApiInstance.interceptors.response.use.mock.calls[0][1];
  });

  it('reuses the same idempotency key for duplicate accept requests', async () => {
    await apiModule.acceptOffer('offer-1', null);
    await apiModule.acceptOffer('offer-1', null);

    expect(mockApiInstance.put).toHaveBeenCalledTimes(2);

    const firstConfig = mockApiInstance.put.mock.calls[0][2];
    const secondConfig = mockApiInstance.put.mock.calls[1][2];

    expect(firstConfig.headers['Idempotency-Key']).toBeTruthy();
    expect(secondConfig.headers['Idempotency-Key']).toBe(firstConfig.headers['Idempotency-Key']);
  });

  it('creates different idempotency keys when mutation payload changes', async () => {
    await apiModule.counterOffer('offer-1', 1000, 'first');
    await apiModule.counterOffer('offer-1', 1200, 'second');

    const firstConfig = mockApiInstance.put.mock.calls[0][2];
    const secondConfig = mockApiInstance.put.mock.calls[1][2];

    expect(secondConfig.headers['Idempotency-Key']).not.toBe(firstConfig.headers['Idempotency-Key']);
  });

  it('runs the unauthorized handler once for concurrent 401 responses', async () => {
    let resolveHandler;
    const handlerPromise = new Promise((resolve) => {
      resolveHandler = resolve;
    });
    const unauthorizedHandler = jest.fn(() => handlerPromise);
    apiModule.registerUnauthorizedHandler(unauthorizedHandler);

    const firstError = { response: { status: 401 }, config: { url: '/api/v1/profile' } };
    const secondError = { response: { status: 401 }, config: { url: '/api/v1/offers' } };

    const first = rejectedHandler(firstError).catch(() => {});
    const second = rejectedHandler(secondError).catch(() => {});

    expect(unauthorizedHandler).toHaveBeenCalledTimes(1);

    resolveHandler();
    await Promise.all([first, second]);
  });

  it('does not run the unauthorized handler for auth endpoints', async () => {
    const unauthorizedHandler = jest.fn();
    apiModule.registerUnauthorizedHandler(unauthorizedHandler);

    const error = { response: { status: 401 }, config: { url: '/auth/login' } };

    await rejectedHandler(error).catch(() => {});

    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });
});