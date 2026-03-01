/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useTutorChat } from '@/hooks/narrvoca/useTutorChat';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const BASE_OPTS = {
  uid: 'uid-abc',
  accessToken: 'test-token',
  storyId: 1,
  nodeId: 10,
  targetLanguage: 'es',
};

function makeSuccessResponse(reply: string, sessionId: number, question = 'Question?') {
  return {
    ok: true,
    json: () =>
      Promise.resolve({
        reply,
        session_id: sessionId,
        messages: [
          { role: 'user', content: question },
          { role: 'assistant', content: reply },
        ],
      }),
  };
}

beforeEach(() => {
  global.fetch = jest
    .fn()
    .mockResolvedValue(makeSuccessResponse('Great question!', 42));
});

afterEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------

describe('useTutorChat — initial state', () => {
  it('starts with empty messages, no session, empty input, and panels closed', () => {
    const { result } = renderHook(() => useTutorChat(BASE_OPTS));
    expect(result.current.messages).toEqual([]);
    expect(result.current.sessionId).toBeNull();
    expect(result.current.chatInput).toBe('');
    expect(result.current.isTyping).toBe(false);
    expect(result.current.isChatOpen).toBe(false);
  });
});

describe('useTutorChat — sendMessage', () => {
  it('after a successful send, messages contains user + assistant entries', async () => {
    const { result } = renderHook(() => useTutorChat(BASE_OPTS));
    await act(async () => {
      await result.current.sendMessage('Question?');
    });
    expect(result.current.messages).toEqual([
      { role: 'user', content: 'Question?' },
      { role: 'assistant', content: 'Great question!' },
    ]);
  });

  it('sets sessionId from server response', async () => {
    const { result } = renderHook(() => useTutorChat(BASE_OPTS));
    await act(async () => {
      await result.current.sendMessage('Question?');
    });
    expect(result.current.sessionId).toBe(42);
  });

  it('clears chatInput after sendMessage is called', async () => {
    const { result } = renderHook(() => useTutorChat(BASE_OPTS));
    act(() => {
      result.current.setChatInput('My question');
    });
    await act(async () => {
      await result.current.sendMessage('My question');
    });
    expect(result.current.chatInput).toBe('');
  });

  it('sets isTyping to false after the response arrives', async () => {
    const { result } = renderHook(() => useTutorChat(BASE_OPTS));
    await act(async () => {
      await result.current.sendMessage('Question?');
    });
    expect(result.current.isTyping).toBe(false);
  });

  it('sends the correct body to /api/narrvoca/tutor-chat', async () => {
    const { result } = renderHook(() => useTutorChat(BASE_OPTS));
    await act(async () => {
      await result.current.sendMessage('¿Qué significa?');
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/narrvoca/tutor-chat',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"question":"¿Qué significa?"'),
      })
    );
  });

  it('includes Authorization header in the request', async () => {
    const { result } = renderHook(() => useTutorChat(BASE_OPTS));
    await act(async () => {
      await result.current.sendMessage('Question?');
    });
    const [, options] = (global.fetch as jest.Mock).mock.calls[0] as [
      string,
      { headers: Record<string, string> }
    ];
    expect(options.headers['Authorization']).toBe('Bearer test-token');
  });

  it('does nothing when uid is null', async () => {
    const { result } = renderHook(() =>
      useTutorChat({ ...BASE_OPTS, uid: null })
    );
    await act(async () => {
      await result.current.sendMessage('Hello');
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does nothing when question is empty or whitespace', async () => {
    const { result } = renderHook(() => useTutorChat(BASE_OPTS));
    await act(async () => {
      await result.current.sendMessage('   ');
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('keeps isTyping false when question is empty (no-op path)', async () => {
    const { result } = renderHook(() => useTutorChat(BASE_OPTS));
    await act(async () => {
      await result.current.sendMessage('');
    });
    expect(result.current.isTyping).toBe(false);
  });
});

describe('useTutorChat — clearSession', () => {
  it('resets sessionId, messages, chatInput, and isTyping to initial values', async () => {
    const { result } = renderHook(() => useTutorChat(BASE_OPTS));
    await act(async () => {
      await result.current.sendMessage('Question?');
    });
    expect(result.current.sessionId).toBe(42);

    act(() => {
      result.current.clearSession();
    });
    expect(result.current.sessionId).toBeNull();
    expect(result.current.messages).toEqual([]);
    expect(result.current.chatInput).toBe('');
    expect(result.current.isTyping).toBe(false);
  });
});

describe('useTutorChat — isChatOpen', () => {
  it('toggles isChatOpen via setIsChatOpen', () => {
    const { result } = renderHook(() => useTutorChat(BASE_OPTS));
    act(() => {
      result.current.setIsChatOpen(true);
    });
    expect(result.current.isChatOpen).toBe(true);
    act(() => {
      result.current.setIsChatOpen(false);
    });
    expect(result.current.isChatOpen).toBe(false);
  });
});
