import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { AIGatewayObserver } from './AIGatewayObserver';

const mocks = vi.hoisted(() => ({
  data: undefined as { items: any[]; nextCursor?: string } | undefined,
  input: undefined as Record<string, unknown> | undefined,
  t: vi.fn((key: string, values?: Record<string, unknown>) => {
    if (key === 'Gateway Log Observer') return 'Translated Gateway Observer';
    return key.replace(/\{\{(\w+)\}\}/g, (_, name) =>
      String(values?.[name] ?? '')
    );
  }),
}));

const style = document.createElement('style');

beforeAll(() => {
  style.textContent = readFileSync(
    resolve(process.cwd(), 'components/aiGateway/AIGatewayObserver.css'),
    'utf8'
  );
  document.head.append(style);
});

afterAll(() => style.remove());

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => vi.fn(),
}));

vi.mock('@i18next-toolkit/react', () => ({
  t: mocks.t,
}));

vi.mock('@/hooks/useWindowSize', () => ({
  useWindowSize: () => ({ width: 1440, height: 900 }),
}));

vi.mock('@/store/user', () => ({
  useCurrentWorkspaceId: () => 'workspace_1',
}));

vi.mock('@/components/ui/resizable', () => ({
  ResizablePanelGroup: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ResizablePanel: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ResizableHandle: () => <div />,
}));

vi.mock('@/api/trpc', () => ({
  trpc: {
    aiGateway: {
      all: {
        useQuery: () => ({ data: [{ id: 'gateway_1', name: 'Primary' }] }),
      },
      logs: {
        useQuery: (input: Record<string, unknown>) => {
          mocks.input = input;
          return {
            data: mocks.data,
            error: null,
            isLoading: !mocks.data,
            isFetching: false,
          };
        },
      },
    },
  },
}));

beforeEach(() => {
  localStorage.clear();
  mocks.data = undefined;
  mocks.input = undefined;
  mocks.t.mockClear();
});

test('renders observer copy in English through the translation function', () => {
  render(<AIGatewayObserver gatewayId="gateway_1" />);

  expect(screen.getByText('Translated Gateway Observer')).toBeInTheDocument();
  expect(document.body.textContent).not.toMatch(/[\u3400-\u9fff]/);
});

test('uses the shared non-native gateway selector', () => {
  render(<AIGatewayObserver gatewayId="gateway_1" />);

  const selector = screen.getByRole('combobox', { name: 'Select Gateway' });

  expect(selector).toHaveTextContent('Primary');
  expect(selector).not.toBeInstanceOf(HTMLSelectElement);
});

test('applies custom latency boundaries and remembers them for each gateway', () => {
  mocks.data = {
    items: [29990, 30000, 60490, 60500].map((duration) =>
      createLog(`log_${duration}`, `Solicitud ${duration}`, { duration })
    ),
  };
  const { unmount } = render(<AIGatewayObserver gatewayId="gateway_1" />);
  expect(screen.getByRole('cell', { name: '30.00s' })).toHaveClass('is-error');

  fireEvent.click(screen.getByRole('button', { name: 'Latency thresholds' }));
  fireEvent.change(screen.getByLabelText('Yellow at (seconds)'), {
    target: { value: '30' },
  });
  fireEvent.change(screen.getByLabelText('Red at (seconds)'), {
    target: { value: '60.5' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(screen.getByRole('cell', { name: '30.00s' })).toHaveClass('is-warn');
  const cells = document.querySelectorAll(
    '.observer-table tbody tr td:nth-child(2)'
  );
  expect(Array.from(cells, (cell) => cell.className)).toEqual([
    'is-error',
    'is-warn',
    'is-warn',
    '',
  ]);
  unmount();

  const restored = render(<AIGatewayObserver gatewayId="gateway_1" />);
  expect(screen.getByRole('cell', { name: '30.00s' })).toHaveClass('is-warn');
  fireEvent.click(screen.getByRole('button', { name: 'Latency thresholds' }));
  expect(screen.getByLabelText('Red at (seconds)')).toHaveValue(60.5);
  restored.unmount();

  mocks.data = {
    items: [
      createLog('log_other', 'Otra puerta', {
        gatewayId: 'gateway_2',
        duration: 30000,
      }),
    ],
  };
  render(<AIGatewayObserver gatewayId="gateway_2" />);
  expect(screen.getByRole('cell', { name: '30.00s' })).toHaveClass('is-error');
});

test.each([
  ['', '60'],
  ['0', '60'],
  ['-1', '60'],
  ['60', '30'],
  ['30', '30'],
  ['30', '1e309'],
])('rejects invalid latency thresholds (%s, %s)', (warning, error) => {
  mocks.data = { items: [createLog('log_1', 'Solicitud', { duration: 8000 })] };
  render(<AIGatewayObserver gatewayId="gateway_1" />);
  fireEvent.click(screen.getByRole('button', { name: 'Latency thresholds' }));
  fireEvent.change(screen.getByLabelText('Yellow at (seconds)'), {
    target: { value: warning },
  });
  fireEvent.change(screen.getByLabelText('Red at (seconds)'), {
    target: { value: error },
  });
  fireEvent.submit(screen.getByRole('form', { name: 'Latency thresholds' }));

  expect(screen.getByRole('alert')).toBeVisible();
  expect(screen.getByRole('cell', { name: '8.00s' })).toHaveClass('is-error');
  expect(localStorage.length).toBe(0);
});

test('uses default latency thresholds when stored values are invalid', () => {
  localStorage.setItem(
    'tianji-observer-latency-workspace_1-gateway_1',
    JSON.stringify({ warning: 60, error: 30 })
  );
  mocks.data = {
    items: [createLog('log_1', 'Solicitud', { duration: 4000 })],
  };
  render(<AIGatewayObserver gatewayId="gateway_1" />);
  expect(screen.getByRole('cell', { name: '4.00s' })).toHaveClass('is-warn');
  fireEvent.click(screen.getByRole('button', { name: 'Latency thresholds' }));
  expect(screen.getByLabelText('Yellow at (seconds)')).toHaveValue(4);
});

test('keeps a request that arrives while the first response is delayed', () => {
  const { rerender } = render(<AIGatewayObserver gatewayId="gateway_1" />);

  mocks.data = { items: [createLog('log_1', 'Arrived while opening')] };
  rerender(<AIGatewayObserver gatewayId="gateway_1" />);

  expect(screen.getAllByText('Arrived while opening')).not.toHaveLength(0);
  expect(mocks.input?.openedAt).toBeInstanceOf(Date);
});

test('accumulates logs while draining batches larger than 100', () => {
  const { rerender } = render(<AIGatewayObserver gatewayId="gateway_1" />);
  const firstBatch = Array.from({ length: 100 }, (_, index) =>
    createLog(`log_${index}`, `Request ${index}`)
  );

  mocks.data = { items: firstBatch, nextCursor: 'log_100' };
  rerender(<AIGatewayObserver gatewayId="gateway_1" />);

  expect(mocks.input?.cursor).toBe('log_100');

  mocks.data = { items: [createLog('log_100', 'Request 100')] };
  rerender(<AIGatewayObserver gatewayId="gateway_1" />);

  expect(screen.getAllByText('Request 0')).not.toHaveLength(0);
  expect(screen.getAllByText('Request 100')).not.toHaveLength(0);
  expect(screen.getByText('101 requests')).toBeInTheDocument();
});

test('replaces a pending row with its completed version', () => {
  const { rerender } = render(<AIGatewayObserver gatewayId="gateway_1" />);

  mocks.data = {
    items: [createLog('log_pending', 'Slow request', { status: 'Pending' })],
  };
  rerender(<AIGatewayObserver gatewayId="gateway_1" />);
  expect(
    screen.getByText('Streaming response in progress…')
  ).toBeInTheDocument();

  mocks.data = {
    items: [createLog('log_pending', 'Slow request', { status: 'Success' })],
  };
  rerender(<AIGatewayObserver gatewayId="gateway_1" />);

  expect(
    screen.queryByText('Streaming response in progress…')
  ).not.toBeInTheDocument();
  expect(screen.getAllByText('Success')).not.toHaveLength(0);
});

test('keeps long message content inside a scrollable height limit', async () => {
  mocks.data = {
    items: [createLog('log_long', 'Contenido extenso para revisar')],
  };
  render(<AIGatewayObserver gatewayId="gateway_1" />);

  const bubble = (
    await screen.findByText('Contenido extenso para revisar', {
      selector: '.markdown-body p',
    })
  ).closest('.observer-bubble');
  const styles = window.getComputedStyle(bubble!);

  expect(styles.maxHeight).toBe('520px');
  expect(styles.overflow).toBe('auto');
});

test('renders conversation message content as Markdown', async () => {
  mocks.data = {
    items: [
      createLog('log_markdown', '## Título\n\nTexto **importante**', {
        responsePayload: { content: 'Respuesta sencilla' },
      }),
    ],
  };
  render(<AIGatewayObserver gatewayId="gateway_1" />);

  expect(
    await screen.findByRole('heading', { name: 'Título' })
  ).toBeInTheDocument();
  expect(screen.getByText('importante').tagName).toBe('STRONG');
});

test('renders Anthropic server tools and structured tool results', () => {
  const { rerender } = render(<AIGatewayObserver gatewayId="gateway_1" />);

  mocks.data = {
    items: [
      createLog('log_anthropic', 'Anthropic request', {
        modelProvider: 'anthropic',
        requestPayload: {
          messages: [
            { role: 'user', content: 'Search the weather' },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: 'srvtoolu_1',
                  content: [{ type: 'json', json: { temperature: 27 } }],
                },
              ],
            },
          ],
        },
        responsePayload: {
          response: {
            role: 'assistant',
            content: [
              {
                type: 'server_tool_use',
                id: 'srvtoolu_1',
                name: 'web_search',
                input: { query: 'Shanghai weather' },
              },
            ],
          },
        },
      }),
    ],
  };
  rerender(<AIGatewayObserver gatewayId="gateway_1" />);

  expect(screen.getByText('web_search')).toBeInTheDocument();
  expect(screen.getByText('Result')).toBeInTheDocument();
  expect(screen.getByText('"temperature"')).toBeInTheDocument();
  expect(screen.getByText('27')).toBeInTheDocument();
});

test('shows JSON item counts only while a branch is collapsed', () => {
  mocks.data = { items: [createLog('log_json', 'Inspect JSON')] };
  render(<AIGatewayObserver gatewayId="gateway_1" />);
  fireEvent.click(screen.getByRole('tab', { name: 'Raw' }));

  const requestViewer = screen.getByText('Request payload').closest('details');
  const branch =
    requestViewer?.querySelector<HTMLDetailsElement>('.json-branch');
  const count = branch?.querySelector('summary em');

  expect(branch).toHaveAttribute('open');
  expect(count).not.toBeVisible();

  fireEvent.click(branch!.querySelector('summary')!);
  expect(branch).not.toHaveAttribute('open');
  expect(count).toBeVisible();
});

function createLog(
  id: string,
  prompt: string,
  overrides: Record<string, unknown> = {}
) {
  return {
    id,
    workspaceId: 'workspace_1',
    gatewayId: 'gateway_1',
    modelName: 'gpt-5',
    modelProvider: 'openai',
    userId: 'user_1',
    status: 'Success',
    duration: 1250,
    inputToken: 28,
    outputToken: 9,
    cacheReadInputToken: 0,
    cacheWriteInputToken: 0,
    ttft: 320,
    tpot: 38,
    price: 0.0012,
    stream: true,
    createdAt: new Date('2026-09-03T08:00:00Z'),
    updatedAt: new Date('2026-09-03T08:00:01Z'),
    requestPayload: { messages: [{ role: 'user', content: prompt }] },
    responsePayload: { content: `Response for ${prompt}` },
    ...overrides,
  };
}
