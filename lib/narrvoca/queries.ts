import { supabase } from '@/lib/supabase';
import type {
  Story,
  StoryNode,
  NodeText,
  BranchingLogic,
  FullStory,
} from '@/lib/narrvoca/types';

export async function getStories(): Promise<Story[]> {
  const { data, error } = await supabase.from('stories').select('*');
  if (error) throw new Error(error.message);
  return data as Story[];
}

export async function getStoryById(id: number): Promise<Story> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('story_id', id)
    .single();
  if (error) throw new Error(error.message);
  return data as Story;
}

export async function getNodesByStoryId(storyId: number): Promise<StoryNode[]> {
  const { data, error } = await supabase
    .from('story_nodes')
    .select('*')
    .eq('story_id', storyId)
    .order('sequence_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data as StoryNode[];
}

export async function getNodeText(nodeId: number): Promise<NodeText[]> {
  const { data, error } = await supabase
    .from('node_text')
    .select('*')
    .eq('node_id', nodeId)
    .order('display_order', { ascending: true });
  if (error) throw new Error(error.message);
  return data as NodeText[];
}

export async function getBranchingRules(nodeId: number): Promise<BranchingLogic[]> {
  const { data, error } = await supabase
    .from('branching_logic')
    .select('*')
    .eq('node_id', nodeId);
  if (error) throw new Error(error.message);
  return data as BranchingLogic[];
}

export async function getFullStory(storyId: number): Promise<FullStory> {
  const story = await getStoryById(storyId);
  const nodes = await getNodesByStoryId(storyId);
  const nodesWithTexts = await Promise.all(
    nodes.map(async (node) => ({
      ...node,
      texts: await getNodeText(node.node_id),
    }))
  );
  return { story, nodes: nodesWithTexts };
}
