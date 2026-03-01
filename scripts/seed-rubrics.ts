// =============================================================================
// NarrVoca 2.0 — Seed Grading Rubrics for Node 3
// Course: CSCI 6333 — Database Systems, UTRGV
//
// Seeds 4 grading rubrics for the "En el Mercado" checkpoint node (Node 3).
// The checkpoint prompt asks the learner to produce:
//   ¡Tu turno! Pregunta al vendedor: ¿Cuánto cuesta un plátano?
//
// Rubrics are grounded in the actual story content:
//   - María's model line: "¿Cuánto cuesta una manzana?"
//   - Vendor's reply:     "Una manzana cuesta dos pesos."
//   - Grammar point:      ¿Cuánto cuesta...? price-question structure
//   - Target vocabulary:  cuánto, cuesta, manzana (+ plátano as the task item)
//
// Run once:
//   npx tsx scripts/seed-rubrics.ts
//
// Requires env vars: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// Idempotent: skips insert if rubrics already exist for the checkpoint node.
// =============================================================================

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!supabaseUrl || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

// ---------------------------------------------------------------------------
// Rubric definitions — grounded in Node 3 actual story content
// ---------------------------------------------------------------------------
const RUBRICS = [
  {
    criterion: 'Uses ¿Cuánto cuesta…? price-question structure',
    weight: 0.40,
    example_correct: '¿Cuánto cuesta un plátano?',
  },
  {
    criterion: 'Names the target item — plátano (banana)',
    weight: 0.30,
    example_correct: 'un plátano',
  },
  {
    criterion: 'Article-noun gender agreement — un plátano (masculine)',
    weight: 0.20,
    example_correct: 'un plátano (not "una plátano")',
  },
  {
    criterion: 'Polite market register — includes por favor or natural phrasing',
    weight: 0.10,
    example_correct: '¿Cuánto cuesta un plátano, por favor?',
  },
] as const;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function seedRubrics() {
  console.log('Supabase URL:', supabaseUrl);
  console.log('');

  // Step 1 — Find the checkpoint node in "En el Mercado"
  console.log('Step 1 — Looking up checkpoint node in "En el Mercado"…');
  const { data: nodeRows, error: nodeError } = await supabase
    .from('story_nodes')
    .select('node_id, story_id, sequence_order, context_description, stories(title)')
    .eq('is_checkpoint', true)
    .filter('stories.title', 'eq', 'En el Mercado')
    .not('stories', 'is', null);

  if (nodeError) {
    console.error('Failed to query story_nodes:', nodeError.message);
    process.exit(1);
  }

  // Filter client-side in case the Supabase filter syntax varies
  const checkpointRows = (nodeRows ?? []).filter(
    (r: { stories: unknown }) =>
      r.stories !== null &&
      typeof r.stories === 'object' &&
      (r.stories as { title?: string }).title === 'En el Mercado'
  );

  if (checkpointRows.length === 0) {
    console.error('No checkpoint node found for "En el Mercado". Is the seed migration applied?');
    process.exit(1);
  }

  const node = checkpointRows[0] as {
    node_id: number;
    sequence_order: number;
    context_description: string;
  };

  console.log(`  Found: node_id=${node.node_id}  sequence=${node.sequence_order}`);
  console.log(`  Context: ${node.context_description}`);
  console.log('');

  // Step 2 — Check if rubrics already exist (idempotency)
  console.log('Step 2 — Checking for existing rubrics…');
  const { data: existing, error: existError } = await supabase
    .from('grading_rubrics')
    .select('rubric_id, criterion')
    .eq('node_id', node.node_id);

  if (existError) {
    console.error('Failed to query grading_rubrics:', existError.message);
    process.exit(1);
  }

  if ((existing ?? []).length > 0) {
    console.log(`  Already seeded — ${existing!.length} rubric(s) found. Skipping.`);
    for (const r of existing!) {
      console.log(`  [${r.rubric_id}] ${r.criterion}`);
    }
    console.log('');
    console.log('Run complete (no changes made).');
    return;
  }

  console.log('  None found — proceeding with insert.');
  console.log('');

  // Step 3 — Preview what will be inserted
  console.log('Step 3 — Rubrics to insert:');
  console.log('─'.repeat(72));
  for (let i = 0; i < RUBRICS.length; i++) {
    const r = RUBRICS[i];
    console.log(`  ${i + 1}. ${r.criterion}`);
    console.log(`     weight: ${r.weight}  |  example: ${r.example_correct}`);
  }
  console.log('─'.repeat(72));
  console.log(`  Total weight: ${RUBRICS.reduce((s, r) => s + r.weight, 0).toFixed(2)}`);
  console.log('');

  // Step 4 — Insert rubrics
  console.log('Step 4 — Inserting rubrics…');
  const rows = RUBRICS.map((r) => ({ node_id: node.node_id, ...r }));
  const { data: inserted, error: insertError } = await supabase
    .from('grading_rubrics')
    .insert(rows)
    .select('rubric_id, criterion, weight');

  if (insertError) {
    console.error('Insert failed:', insertError.message);
    process.exit(1);
  }

  console.log(`  Inserted ${inserted!.length} rubric(s):`);
  for (const r of inserted!) {
    const row = r as { rubric_id: number; criterion: string; weight: number };
    console.log(`  [rubric_id=${row.rubric_id}]  weight=${row.weight}  ${row.criterion}`);
  }
  console.log('');
  console.log('Seed complete.');
}

seedRubrics().catch((err: unknown) => {
  console.error('Unexpected error:', (err as Error).stack ?? err);
  process.exit(1);
});
