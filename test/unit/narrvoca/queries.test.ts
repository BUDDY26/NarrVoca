import {
  getStories,
  getStoryById,
  getNodesByStoryId,
  getNodeText,
  getFullStory,
  getBranchingRules,
  getNodeVocab,
} from '@/lib/narrvoca/queries';

// ---------------------------------------------------------------------------
// Mock @/lib/supabase
// The Supabase query builder is a thenable chain. We mock it so each chain
// method returns `this` and `.then` resolves to { data, error }.
// ---------------------------------------------------------------------------
const mockThen = jest.fn();

const chainMock: Record<string, jest.Mock> = {
  from: jest.fn(),
  select: jest.fn(),
  eq: jest.fn(),
  order: jest.fn(),
  single: jest.fn(),
};

// Wire every chain method to return the chain object itself
Object.keys(chainMock).forEach((key) => {
  if (key !== 'from') {
    chainMock[key].mockReturnValue({ ...chainMock, then: mockThen });
  }
});
chainMock.from.mockReturnValue({ ...chainMock, then: mockThen });

jest.mock('@/lib/supabase', () => ({
  supabase: { from: (...args: unknown[]) => chainMock.from(...args) },
}));

// Helper — set what the next supabase call resolves to
function mockResolve(data: unknown, error: unknown = null) {
  mockThen.mockImplementation((resolve: (v: unknown) => void) =>
    resolve({ data, error })
  );
}

beforeEach(() => jest.clearAllMocks());

// ---------------------------------------------------------------------------

describe('getStories', () => {
  it('returns array of stories on success', async () => {
    const stories = [{ story_id: 1, title: 'En el Mercado' }];
    mockResolve(stories);
    const result = await getStories();
    expect(result).toEqual(stories);
    expect(chainMock.from).toHaveBeenCalledWith('stories');
  });

  it('throws on DB error', async () => {
    mockResolve(null, { message: 'DB down' });
    await expect(getStories()).rejects.toThrow('DB down');
  });
});

describe('getStoryById', () => {
  it('returns a single story', async () => {
    const story = { story_id: 1, title: 'En el Mercado' };
    mockResolve(story);
    const result = await getStoryById(1);
    expect(result).toEqual(story);
    expect(chainMock.eq).toHaveBeenCalledWith('story_id', 1);
  });

  it('throws on DB error', async () => {
    mockResolve(null, { message: 'Not found' });
    await expect(getStoryById(99)).rejects.toThrow('Not found');
  });
});

describe('getNodesByStoryId', () => {
  it('returns nodes ordered by sequence_order', async () => {
    const nodes = [
      { node_id: 1, sequence_order: 1 },
      { node_id: 2, sequence_order: 2 },
    ];
    mockResolve(nodes);
    const result = await getNodesByStoryId(1);
    expect(result).toEqual(nodes);
    expect(chainMock.from).toHaveBeenCalledWith('story_nodes');
    expect(chainMock.eq).toHaveBeenCalledWith('story_id', 1);
    expect(chainMock.order).toHaveBeenCalledWith('sequence_order', { ascending: true });
  });

  it('throws on DB error', async () => {
    mockResolve(null, { message: 'err' });
    await expect(getNodesByStoryId(1)).rejects.toThrow('err');
  });
});

describe('getNodeText', () => {
  it('returns text rows for a node', async () => {
    const texts = [{ node_text_id: 1, text_content: 'Hello' }];
    mockResolve(texts);
    const result = await getNodeText(1);
    expect(result).toEqual(texts);
    expect(chainMock.from).toHaveBeenCalledWith('node_text');
    expect(chainMock.eq).toHaveBeenCalledWith('node_id', 1);
  });

  it('throws on DB error', async () => {
    mockResolve(null, { message: 'err' });
    await expect(getNodeText(1)).rejects.toThrow('err');
  });
});

describe('getBranchingRules', () => {
  it('returns branching rules for a node', async () => {
    const rules = [{ branch_id: 1, condition_type: 'default', next_node_id: 2 }];
    mockResolve(rules);
    const result = await getBranchingRules(1);
    expect(result).toEqual(rules);
    expect(chainMock.from).toHaveBeenCalledWith('branching_logic');
    expect(chainMock.eq).toHaveBeenCalledWith('node_id', 1);
  });

  it('throws on DB error', async () => {
    mockResolve(null, { message: 'err' });
    await expect(getBranchingRules(1)).rejects.toThrow('err');
  });
});

describe('getNodeVocab', () => {
  it('returns node_vocabulary rows for a node', async () => {
    const vocab = [{ node_id: 1, vocab_id: 5, is_target: true }];
    mockResolve(vocab);
    const result = await getNodeVocab(1);
    expect(result).toEqual(vocab);
    expect(chainMock.from).toHaveBeenCalledWith('node_vocabulary');
    expect(chainMock.eq).toHaveBeenCalledWith('node_id', 1);
  });

  it('throws on DB error', async () => {
    mockResolve(null, { message: 'err' });
    await expect(getNodeVocab(1)).rejects.toThrow('err');
  });
});

describe('getFullStory', () => {
  it('returns a FullStory with nodes and texts attached', async () => {
    const story = { story_id: 1, title: 'En el Mercado' };
    const nodes = [
      { node_id: 10, sequence_order: 1, story_id: 1 },
      { node_id: 11, sequence_order: 2, story_id: 1 },
    ];
    const textsNode10 = [{ node_text_id: 1, node_id: 10, text_content: 'Hola' }];
    const textsNode11 = [{ node_text_id: 2, node_id: 11, text_content: 'Adiós' }];

    // getFullStory makes 1 + 1 + N calls: getStoryById, getNodesByStoryId, getNodeText×N
    mockThen
      .mockImplementationOnce((resolve: (v: unknown) => void) => resolve({ data: story, error: null }))
      .mockImplementationOnce((resolve: (v: unknown) => void) => resolve({ data: nodes, error: null }))
      .mockImplementationOnce((resolve: (v: unknown) => void) => resolve({ data: textsNode10, error: null }))
      .mockImplementationOnce((resolve: (v: unknown) => void) => resolve({ data: textsNode11, error: null }));

    const result = await getFullStory(1);
    expect(result.story).toEqual(story);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].texts).toEqual(textsNode10);
    expect(result.nodes[1].texts).toEqual(textsNode11);
  });
});
