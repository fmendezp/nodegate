const { execute } = require('../../entities/route');

const step1 = jest.fn(container => container);
const step2 = jest.fn(container => container);
const step3 = jest.fn(container => container);
const send = jest.fn(container => container);
const status = jest.fn(() => ({ send }));

const timedStep1 = jest.fn(container => new Promise(
  resolve => setTimeout(() => resolve({
    ...container,
    body: {
      ...container.body,
      name: 'NCC-1701-F',
    },
  }), 10),
));
const timedStep2 = jest.fn(container => new Promise(
  resolve => setTimeout(() => resolve(container), 10),
));

const request = {
  headers: {
    origin: 'https://wiki.federation.com',
  },
  body: {
    ships: [{
      name: 'NCC-1701-E',
      armaments: {
        phasers: 16,
        torpedo: 2,
      },
    }],
  },
};

describe('entities/route', () => {
  beforeEach(() => {
    step1.mockClear();
    step2.mockClear();
    step3.mockClear();
    send.mockClear();
    timedStep1.mockClear();
    timedStep2.mockClear();
  });
  describe('#execute()', () => {
    it('should call a unique pipeline step', async () => {
      await execute({ pipeline: [step1] })(request, { status });
      expect(step1.mock.calls.length).toBe(1);
      expect(step1.mock.calls[0][0].body).toBe(request.body);
      expect(send.mock.calls.length).toBe(1);
    });
    it('should call all the pipeline steps', async () => {
      await execute({ pipeline: [step1, step2, step3] })(request, { status });
      expect(step1.mock.calls.length).toBe(1);
      expect(step2.mock.calls.length).toBe(1);
      expect(step3.mock.calls.length).toBe(1);
      expect(step3.mock.calls[0][0].body).toBe(request.body);
      expect(send.mock.calls.length).toBe(1);
    });
    it('should work with asynchronous modifiers', async () => {
      await execute({ pipeline: [timedStep1, timedStep2] })(request, { status });
      expect(timedStep1.mock.calls.length).toBe(1);
      expect(timedStep2.mock.calls.length).toBe(1);
      expect(send.mock.calls.length).toBe(1);
      expect(send.mock.results[0].value.name).toEqual('NCC-1701-F');
    });
    it('should send the original request to the modifiers', async () => {
      await execute({ pipeline: [step1] })(request, { status });
      expect(step1.mock.calls.length).toBe(1);
      expect(step1.mock.calls[0][1].headers.origin).toEqual('https://wiki.federation.com');
    });
    it('should execute the beforeEach attribute', async () => {
      await execute({ pipeline: [step1] }, [step2, step3])(request, { status });
      expect(step1.mock.calls.length).toBe(1);
      expect(step2.mock.calls.length).toBe(1);
      expect(step3.mock.calls.length).toBe(1);
    });
    it('should execute the beforeEach modifiers before the pipeline', async () => {
      await execute({ pipeline: [step1] }, [() => ({ body: { value: 'before' } })])(request, { status });
      expect(step1.mock.calls[0][0].body.value).toEqual('before');
    });
    it('should respond with the container status code', async () => {
      await execute({ pipeline: [() => ({ statusCode: 201 })] })(request, { status });
    });
  });
});