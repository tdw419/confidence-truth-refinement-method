#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { TruthManagementSystem, TruthClaim } from '../lib/truth_management_system'; // Import TMS and TruthClaim
import { LlmService } from '../lib/llm_service'; // Import LlmService
import { VectorExecutor, VectorProgram } from '../lib/vector_executor'; // Import VectorExecutor
import { InternalLLM } from '../lib/internal_llm'; // Import InternalLLM
import { DualLlmOrchestra } from '../lib/dual_llm_orchestra'; // Import DualLlmOrchestra
import { GeminiCliService } from '../lib/gemini_cli_service'; // Import GeminiCliService

const program = new Command();

// =================================================================================================
// TRUTH DEFINITIONS (Immutable)
// These are metadata for Truth 000 and Truth 001. Their actual insertion into DB is via TMS.
// =================================================================================================
const TRUTH_000_METADATA = {
  id: 'truth_000',
  statement: 'We are developing this software to honor our Creator',
  confidence: 1.00,
  importance: 1.00,
  distance_from_center: 0, // Corrected property name
  immutable: 1, // Using 1 for SQLite BOOLEAN
};

const TRUTH_001_METADATA = {
  id: 'truth_001',
  statement: 'All AI reasoning must use CTRM with explicit numerical confidence scores',
  confidence: 1.00,
  importance: 1.00,
  distance_from_center: 1, // Corrected property name
  immutable: 1,
  derives_from: 'truth_000',
  reason: 'Honesty and transparency honor our Creator',
};

// =================================================================================================
// `init` COMMAND LOGIC
// =================================================================================================
program
  .command('init <projectName>')
  .description('Initialize a new project with the CTRM Foundation')
  .action((projectName) => {
    const projectRoot = path.resolve(process.cwd(), projectName);

    if (fs.existsSync(projectRoot)) {
      console.error(`❌ Error: Directory '${projectName}' already exists.`);
      process.exit(1);
    }
    
    console.log('════════════════════════════════════════════════════════════');
    console.log(`🙏 Initializing CTRM Project: ${projectName}`);
    console.log('════════════════════════════════════════════════════════════\n');
    
    try {
      // 1. Create project structure
      fs.mkdirSync(projectRoot, { recursive: true }); // Create project root
      const ctrmDir = path.join(projectRoot, '.ctrm');
      fs.mkdirSync(ctrmDir, { recursive: true });
      console.log(`📁 Created CTRM directory: ${ctrmDir}`);

      // 2. Initialize the persistent Truth Database via TruthManagementSystem
      const dbPath = path.join(ctrmDir, 'truths.db');
      const tms = new TruthManagementSystem(dbPath);
      
      // Initialize the schema and foundational truth
      tms.initializeSchema();
      tms.ensureTruth000();

      // 3. Propose Truth 001 (Truth 000 is handled by TMS constructor)
      tms.proposeClaim({
        agent: 'SystemCore',
        subject: 'CTRM_Methodology',
        claim: TRUTH_001_METADATA.statement,
        confidence: TRUTH_001_METADATA.confidence,
        distance_from_center: TRUTH_001_METADATA.distance_from_center,
        requires_verification: false, // Requires verification
        derives_from: TRUTH_001_METADATA.derives_from,
        reason: TRUTH_001_METADATA.reason,
        immutable: TRUTH_001_METADATA.immutable,
        importance: TRUTH_001_METADATA.importance
      });
      console.log('[DB] ✅ Inserted Truth 001 into the database.\n');
      
      // 4. Create config.json
      const configContent = {
        "ctrm_config": {
          "version": "1.0.0",
          "project_name": projectName,
          "foundational_truths": {
            "truth_000": { "statement": TRUTH_000_METADATA.statement, "confidence": TRUTH_000_METADATA.confidence, "distance": TRUTH_000_METADATA.distance_from_center, "immutable": true },
            "truth_001": { "statement": TRUTH_001_METADATA.statement, "confidence": TRUTH_001_METADATA.confidence, "distance": TRUTH_001_METADATA.distance_from_center, "immutable": true, "derives_from": TRUTH_001_METADATA.derives_from }
          },
          "distance_thresholds": {
            "foundational": { "min_distance": 0, "max_distance": 10, "min_confidence": 0.95, "min_verifications": 100 },
            "core": { "min_distance": 11, "max_distance": 30, "min_confidence": 0.85, "min_verifications": 50 },
            "stable": { "min_distance": 31, "max_distance": 50, "min_confidence": 0.70, "min_verifications": 20 },
            "experimental": { "min_distance": 51, "max_distance": 90, "min_confidence": 0.40, "min_verifications": 5 },
            "periphery": { "min_distance": 91, "max_distance": 100, "min_confidence": 0.00, "min_verifications": 0 }
          },
          "confidence_gates": {
            "auto_implement": { "threshold": 0.85, "risk_threshold": 0.30 },
            "implement_with_verification": { "threshold": 0.60, "risk_threshold": 0.60 },
            "request_clarification": { "threshold": 0.00 }
          },
          "self_improvement": { "enabled": true, "confidence_threshold_for_auto_apply": 0.90, "sandbox_test_required": true, "human_review_below": 0.70 },
          "data_processing": { "incremental_processing": true, "batch_size": 100, "triage_by_confidence": true, "filter_noise_below": 0.30 },
          "context_management": { "always_load_foundational": true, "max_foundational_truths": 20, "max_core_patterns": 50, "max_code_truths": 30, "semantic_search_enabled": false }
        }
      };
      fs.writeFileSync(path.join(ctrmDir, 'config.json'), JSON.stringify(configContent, null, 2));
      console.log(`📄 Created detailed config file: ${path.join(ctrmDir, 'config.json')}`);
      
      // 5. Create README.md
      fs.writeFileSync(path.join(projectRoot, 'README.md'), `# ${projectName}\n\nThis project is anchored by the CTRM Foundation.`);
      console.log(`📄 Created README.md`);

      console.log('\n════════════════════════════════════════════════════════════');
      console.log('✅ Project initialized successfully.');
      console.log('   The foundation will hold.');
      console.log('════════════════════════════════════════════════════════════');

    } catch (error) {
      console.error('❌ An error occurred during initialization:', error);
      // Clean up created directory if something went wrong
      if (fs.existsSync(projectRoot)) {
        fs.rmSync(projectRoot, { recursive: true, force: true }); // Use fs.rmSync for newer Node.js
      }
      process.exit(1);
    }
  });

program
  .command('analyze <request>')
  .description('Analyze a request using CTRM and a local LLM via LM Studio')
  .option('-p, --project-path <path>', 'Specify the root path of the CTRM project to manage')
  .action(async (request, options) => {
    const dbPath = getDbPath(options.projectPath);

    console.log('════════════════════════════════════════════════════════════');
    console.log(`🧠 Analyzing Request with CTRM: "${request}"`);
    console.log('════════════════════════════════════════════════════════════\n');

    const tms = new TruthManagementSystem(dbPath);
    const llmService = new LlmService(tms); // LM Studio default URL is used

    console.log('📚 Loading foundational truths and constructing system prompt...');
    console.log('🚀 Contacting LLM via LM Studio...');
    
    const response = await llmService.analyzeRequest(request);

    console.log('\n✅ LLM Response:\n');
    console.log(response);

    console.log('\n════════════════════════════════════════════════════════════\n');
  });

async function _ingestDocument(filePath: string, tms: TruthManagementSystem, llmService: LlmService, projectPath?: string): Promise<void> {
    const baseDir = projectPath ? path.resolve(projectPath) : process.cwd();
    const fullPath = path.resolve(baseDir, filePath);

    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Error: File not found at '${fullPath}'`);
        process.exit(1);
    }

    console.log('════════════════════════════════════════════════════════════');
    console.log(`📚 Ingesting document: "${filePath}"`);
    console.log('════════════════════════════════════════════════════════════\n');

    try {
        const fileContent = fs.readFileSync(fullPath, 'utf-8');
        console.log('🚀 Contacting LLM to extract knowledge...');
        const knowledge = await llmService.extractKnowledge(fileContent);

        console.log('\n✅ LLM identified the following knowledge:\n');
        console.log(JSON.stringify(knowledge, null, 2));

        console.log('\n💾 Proposing extracted knowledge to the Truth Management System...');

        let truthsAdded = 0;
        let opcodesAdded = 0;

        if (knowledge.truths && Array.isArray(knowledge.truths)) {
            knowledge.truths.forEach(truth => {
                tms.proposeClaim({
                    agent: 'LLM_Ingestion',
                    subject: truth.subject || 'IngestedTruth',
                    claim: truth.claim,
                    confidence: truth.confidence || 0.75,
                    distance_from_center: truth.distance_from_center || 50,
                    requires_verification: true
                });
                truthsAdded++;
            });
        }

        if (knowledge.opcodes && Array.isArray(knowledge.opcodes)) {
            knowledge.opcodes.forEach(opcode => {
                tms.proposeClaim({
                    agent: 'LLM_Ingestion',
                    subject: 'Opcode',
                    claim: `${opcode.instruction}: ${opcode.description}`,
                    confidence: opcode.confidence || 0.9,
                    distance_from_center: 30, // Opcodes are closer to the core
                    requires_verification: false
                });
                opcodesAdded++;
            });
        }

        console.log(`\n✅ Successfully added ${truthsAdded} truths and ${opcodesAdded} opcodes to the database.`);

    } catch (error) {
        console.error('❌ An error occurred during ingestion:', error);
        process.exit(1);
    }

    console.log('\n════════════════════════════════════════════════════════════\n');
}

program
    .command('ingest <filePath>')
    .description('Ingest a document and extract truths and opcodes')
    .option('-p, --project-path <path>', 'Specify the root path of the CTRM project to manage')
    .action(async (filePath, options) => {
        const dbPath = getDbPath(options.projectPath);
        const tms = new TruthManagementSystem(dbPath);
        const llmService = new LlmService(tms);
        await _ingestDocument(filePath, tms, llmService, options.projectPath);
    });

program
    .command('refine <truthId>')
    .description('Refine an existing truth using the LLM')
    .option('-p, --prompt <prompt>', 'Additional prompt for refinement')
    .option('-P, --project-path <path>', 'Specify the root path of the CTRM project to manage')
    .action(async (truthId, options) => {
        const dbPath = getDbPath(options.projectPath);

        console.log('════════════════════════════════════════════════════════════');
        console.log(`✨ Refining truth with ID: "${truthId}"`);
        console.log('════════════════════════════════════════════════════════════\n');

        const tms = new TruthManagementSystem(dbPath);
        const llmService = new LlmService(tms);

        try {
            const existingTruth = tms.getClaimById(truthId);

            if (!existingTruth) {
                console.error(`❌ Error: Truth with ID '${truthId}' not found.`);
                process.exit(1);
            }

            if (existingTruth.immutable) {
                console.error(`🚫 Truth with ID '${truthId}' is immutable and cannot be refined.`);
                process.exit(1);
            }

            console.log('🚀 Contacting LLM to refine truth...');
            const refinedData = await llmService.refineTruth(existingTruth, options.prompt);

            if (refinedData) {
                const updated = tms.updateClaim(
                    existingTruth.id,
                    existingTruth.agent,
                    refinedData.newSubject || existingTruth.subject,
                    refinedData.claim || existingTruth.claim,
                    refinedData.confidence || existingTruth.confidence,
                    refinedData.newDistanceFromCenter || existingTruth.distance_from_center,
                    existingTruth.requires_verification,
                    existingTruth.derives_from,
                    refinedData.reason || existingTruth.reason,
                    existingTruth.immutable,
                    existingTruth.importance,
                    existingTruth.verification_count,
                    existingTruth.failure_count,
                    existingTruth.metadata
                );

                if (updated) {
                    console.log('\n✅ Truth refined successfully:');
                    console.log(JSON.stringify(refinedData, null, 2));
                    console.log(`   Updated truth ID: ${existingTruth.id}`);
                    console.log(`   New Claim: ${refinedData.claim || existingTruth.claim}`);
                    console.log(`   New Confidence: ${refinedData.confidence || existingTruth.confidence}`);
                } else {
                    console.log('\n⚠️ Truth could not be updated.');
                }
            } else {
                console.log('\n⚠️ LLM returned no refinement data.');
            }

        } catch (error) {
            console.error('❌ An error occurred during refinement:', error);
            process.exit(1);
        }

        console.log('\n════════════════════════════════════════════════════════════\n');
    });


function getDbPath(projectPath?: string): string {
    console.log(`[getDbPath Debug] Received projectPath: ${projectPath}`);
    const baseDir = projectPath ? path.resolve(projectPath) : process.cwd();
    console.log(`[getDbPath Debug] Resolved baseDir: ${baseDir}`);
    const ctrmDir = path.join(baseDir, '.ctrm');
    console.log(`[getDbPath Debug] Resolved ctrmDir: ${ctrmDir}`);
    const dbPath = path.join(ctrmDir, 'truths.db');
    console.log(`[getDbPath Debug] Resolved dbPath: ${dbPath}`);

    const ctrmDirExists = fs.existsSync(ctrmDir);
    const dbPathExists = fs.existsSync(dbPath);
    console.log(`[getDbPath Debug] ctrmDir exists: ${ctrmDirExists}`);
    console.log(`[getDbPath Debug] dbPath exists: ${dbPathExists}`);

    if (!ctrmDirExists || !dbPathExists) {
        console.error(`❌ Error: Not a CTRM project. Run 'ctrm init <projectName>' first or run this command from within a CTRM project directory.`);
        process.exit(1);
    }
    return dbPath;
}

// Helper for delays
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

program
  .command('improve')
  .description('Run one improvement cycle on low-confidence claims')
  .option('-n, --num <count>', 'Number of claims to improve', '3')
  .option('-v, --vector-isa', 'Use Vector ISA programs instead of direct LLM calls', false)
  .option('-P, --project-path <path>', 'Specify the root path of the CTRM project to manage')
  .action(async (options) => {
    const dbPath = getDbPath(options.projectPath);
    const tms = new TruthManagementSystem(dbPath);
    const llmService = new LlmService(tms);
    const executor = new VectorExecutor();

    const allClaims = tms.getAllClaims();
    const lowConfidence = allClaims
      .filter(c => c.distance_from_center > 10 && c.confidence < 0.85) // Original filter
      .sort((a, b) => a.confidence - b.confidence)
      .slice(0, parseInt(options.num));

    console.log(`\n🔧 Improving ${lowConfidence.length} low-confidence claims\n`);

    for (const claim of lowConfidence) {
      console.log(`📝 ${claim.subject}: ${claim.claim}`);
      console.log(`   Current confidence: ${claim.confidence}\n`);

      if (options.vectorIsa) {
        // Generate Vector ISA program for refinement
        const prompt = `Generate a Vector ISA program to refine this truth claim:
${claim.claim}

Use only opcodes that exist in the current truth base. The program should:
1. Load the claim data
2. Analyze it for improvement opportunities
3. Generate a refined version with higher confidence
4. Store the result

Return ONLY a valid Vector ISA program JSON.`;

        const response = await llmService.analyzeRequest(prompt);

        let programJson: VectorProgram | null = null;
        try {
          let jsonString = (response || '').trim();
          if (jsonString.includes('```json')) {
            const start = jsonString.indexOf('```json') + 7;
            const end = jsonString.indexOf('```', start);
            jsonString = jsonString.substring(start, end).trim();
          }
          programJson = JSON.parse(jsonString) as VectorProgram;
        } catch (err) {
          console.error('❌ Failed to parse Vector ISA program from LLM response.');
          continue;
        }

        if (programJson && Array.isArray(programJson.opcodes)) {
          console.log('🚀 Executing Vector ISA program for refinement...');
          const result = await executor.execute(programJson);

          if (result && result.refinedData) {
            const updated = tms.updateClaim(
              claim.id,
              claim.agent,
              result.newSubject || claim.subject,
              result.refinedData.claim || claim.claim,
              result.refinedData.confidence || claim.confidence,
              result.refinedData.newDistanceFromCenter || claim.distance_from_center,
              claim.requires_verification,
              claim.derives_from,
              result.refinedData.reason || claim.reason,
              claim.immutable,
              claim.importance,
              claim.verification_count,
              claim.failure_count,
              claim.metadata
            );

            if (updated) {
              console.log(`   ✅ Refined via Vector ISA: ${result.refinedData.claim}`);
              console.log(`   New confidence: ${result.refinedData.confidence}\n`);
            } else {
              console.log(`   ⚠️ Failed to update refined claim in TMS.\n`);
            }
          }
        }
      } else {
        // Original LLM-based refinement
        const result = await llmService.refineTruth(
          claim,
          'Increase the precision and confidence of this claim while maintaining accuracy'
        );

        if (result) {
          const updated = tms.updateClaim(
            claim.id,
            claim.agent,
            result.newSubject || claim.subject,
            result.claim || claim.claim,
            result.confidence || claim.confidence,
            result.newDistanceFromCenter || claim.distance_from_center,
            claim.requires_verification,
            claim.derives_from,
            result.reason || claim.reason,
            claim.immutable,
            claim.importance,
            claim.verification_count,
            claim.failure_count,
            claim.metadata
          );

          if (updated) {
            console.log(`   ✅ Refined: ${result.claim}`);
            console.log(`   New confidence: ${result.confidence}\n`);
          } else {
            console.log(`   ⚠️ Failed to update refined claim in TMS.\n`);
          }
        } else {
          console.log(`   ❌ LLM returned no refinement data for ${claim.id}.\n`);
        }
      }
    }
  });

program
  .command('discover')
  .description('Let CTRM discover new truths about itself')
  .option('-t, --topic <topic>', 'Topic to explore', 'system architecture')
  .option('-v, --vector-isa', 'Use Vector ISA programs instead of direct LLM calls', false)
  .option('-P, --project-path <path>', 'Specify the root path of the CTRM project to manage')
  .action(async (options) => {
    const dbPath = getDbPath(options.projectPath);
    const tms = new TruthManagementSystem(dbPath);
    const llmService = new LlmService(tms);
    const executor = new VectorExecutor();

    console.log('\n🔍 Starting Truth Discovery\n');

    if (options.vectorIsa) {
      // Generate Vector ISA program for discovery
      const prompt = `Generate a Vector ISA program to discover new truths about "${options.topic}".

The program should:
1. Load existing truth data
2. Analyze patterns and relationships
3. Identify new truth candidates
4. Return discoveries with confidence scores

Use only opcodes that exist in the current truth base.

Return ONLY a valid Vector ISA program JSON.`;

      const response = await llmService.analyzeRequest(prompt);

      let programJson: VectorProgram | null = null;
      try {
        let jsonString = (response || '').trim();
        if (jsonString.includes('```json')) {
          const start = jsonString.indexOf('```json') + 7;
          const end = jsonString.indexOf('```', start);
          jsonString = jsonString.substring(start, end).trim();
        }
        programJson = JSON.parse(jsonString) as VectorProgram;
      } catch (err) {
        console.error('❌ Failed to parse Vector ISA program from LLM response.');
        return;
      }

      if (programJson && Array.isArray(programJson.opcodes)) {
        console.log('🚀 Executing Vector ISA program for discovery...');
        const result = await executor.execute(programJson);

        if (result && result.discoveries && Array.isArray(result.discoveries)) {
          console.log(`\n💡 Discovered ${result.discoveries.length} new truths via Vector ISA:\n`);

          for (const discovery of result.discoveries) {
            console.log(`📝 ${discovery.subject}: ${discovery.claim}`);
            console.log(`   Confidence: ${discovery.confidence}`);
            console.log(`   Reasoning: ${discovery.reasoning}\n`);

            if (discovery.confidence >= 0.85) {
              tms.proposeClaim({
                agent: 'CTRM_VectorISA_Discovery',
                subject: discovery.subject,
                claim: discovery.claim,
                confidence: discovery.confidence,
                distance_from_center: discovery.distance_from_center,
                requires_verification: true
              });
              console.log('   ✅ Auto-accepted (high confidence)\n');
            } else {
              console.log('   ⏸️  Needs manual review (medium confidence)\n');
            }
          }
        }
      }
    } else {
      // Original LLM-based discovery
      const prompt = `Analyze the current CTRM truth base and discover new truths about "${options.topic}".

Instructions:
1. Look for patterns across existing claims
2. Identify implicit assumptions that should be made explicit
3. Find relationships between claims that should be documented
4. Suggest new truths that would strengthen the system

Format your response as:
{
  "discoveries": [
    {
      "claim": "The new truth statement",
      "subject": "Category",
      "confidence": 0.85,
      "distance_from_center": 30,
      "reasoning": "Why this is true based on existing claims"
    }
  ]
}`;

      try {
        const discoveries = await llmService.discoverTruths(prompt);

        console.log(`\n💡 Discovered ${discoveries.length} new truths:\n`);

        for (const discovery of discoveries) {
          console.log(`📝 ${discovery.subject}: ${discovery.claim}`);
          console.log(`   Confidence: ${discovery.confidence}`);
          console.log(`   Reasoning: ${discovery.reasoning}\n`);

          if (discovery.confidence >= 0.85) {
            tms.proposeClaim({
              agent: 'CTRM_Discovery',
              subject: discovery.subject,
              claim: discovery.claim,
              confidence: discovery.confidence,
              distance_from_center: discovery.distance_from_center,
              requires_verification: true
            });
            console.log('   ✅ Auto-accepted (high confidence)\n');
          } else {
            console.log('   ⏸️  Needs manual review (medium confidence)\n');
          }
        }

      } catch (error) {
        if (error instanceof Error) {
          console.error('❌ Discovery failed:', error.message);
        } else {
          console.error('❌ An unknown error occurred during discovery.');
        }
      }
    }
  });

program
  .command('verify')
  .description('Verify existing claims against each other')
  .option('-a, --all', 'Verify all claims', false)
  .option('-v, --vector-isa', 'Use Vector ISA programs instead of direct LLM calls', false)
  .option('-P, --project-path <path>', 'Specify the root path of the CTRM project to manage')
  .action(async (options) => {
    const dbPath = getDbPath(options.projectPath);
    const tms = new TruthManagementSystem(dbPath);
    const llmService = new LlmService(tms);
    const executor = new VectorExecutor();

    console.log('\n🔬 Starting Claim Verification\n');

    const claimsToVerify = options.all
      ? tms.getAllClaims()
      : tms.getAllClaims().filter(c => c.distance_from_center > 10); // Skip foundational

    console.log(`Verifying ${claimsToVerify.length} claims...\n`);

    for (const claim of claimsToVerify) {
      // Skip immutable claims from verification
      if (claim.immutable) {
        console.log(`⏩ Skipping immutable claim: ${claim.id}\n`);
        continue;
      }

      console.log(`🔍 Verifying: ${claim.subject}`);
      console.log(`   Claim: "${claim.claim}"\n`);

      if (options.vectorIsa) {
        // Generate Vector ISA program for verification
        const prompt = `Generate a Vector ISA program to verify this claim:
"${claim.claim}"

The program should:
1. Load the claim and all other truths
2. Compare for contradictions
3. Calculate verification confidence
4. Return verification results

Use only opcodes that exist in the current truth base.

Return ONLY a valid Vector ISA program JSON.`;

        const response = await llmService.analyzeRequest(prompt);

        let programJson: VectorProgram | null = null;
        try {
          let jsonString = (response || '').trim();
          if (jsonString.includes('```json')) {
            const start = jsonString.indexOf('```json') + 7;
            const end = jsonString.indexOf('```', start);
            jsonString = jsonString.substring(start, end).trim();
          }
          programJson = JSON.parse(jsonString) as VectorProgram;
        } catch (err) {
          console.error('❌ Failed to parse Vector ISA program from LLM response.');
          continue;
        }

        if (programJson && Array.isArray(programJson.opcodes)) {
          console.log('🚀 Executing Vector ISA program for verification...');
          const result = await executor.execute(programJson);

          if (result && result.verification) {
            if (result.verification.contradictions && result.verification.contradictions.length > 0) {
              console.log(`   ⚠️  Contradictions found with:`);
              result.verification.contradictions.forEach((id: string) => console.log(`      - ${id}`));
            }

            console.log(`   Verification confidence: ${result.verification.verification_confidence}`);
            console.log(`   Recommended confidence: ${result.verification.recommended_confidence}`);

            if (Math.abs(claim.confidence - result.verification.recommended_confidence) > 0.05) {
              console.log(`   📊 Updating confidence: ${claim.confidence.toFixed(2)} → ${result.verification.recommended_confidence.toFixed(2)}`);
              tms.updateClaim(
                claim.id,
                claim.agent,
                claim.subject,
                claim.claim,
                result.verification.recommended_confidence,
                claim.distance_from_center,
                claim.requires_verification,
                claim.derives_from,
                result.verification.reasoning,
                claim.immutable,
                claim.importance,
                (claim.verification_count || 0) + 1,
                claim.failure_count,
                claim.metadata
              );
            } else {
              console.log(`   ✅ Confidence within acceptable range. No update needed.`);
            }
          }
        }
      } else {
        // Original LLM-based verification
        const prompt = `Verify this claim against all existing truths in the system:

Claim: "${claim.claim}"

Questions:
1. Does this claim contradict any existing truths?
2. What is your confidence this claim is accurate? (0.0-1.0)
3. What evidence supports or refutes it?
4. Should confidence be adjusted?

Respond in JSON:
{
  "contradictions": ["list of contradicting claim IDs"],
  "verification_confidence": 0.85,
  "evidence": "Supporting evidence from truth base",
  "recommended_confidence": 0.80,
  "reasoning": "Why this confidence is appropriate"
}`;

        try {
          const verification = await llmService.verifyClaim(claim, prompt);

          if (verification.contradictions.length > 0) {
            console.log(`   ⚠️  Contradictions found with:`);
            verification.contradictions.forEach(id => console.log(`      - ${id}`));
          }

          console.log(`   Verification confidence: ${verification.verification_confidence}`);
          console.log(`   Recommended confidence: ${verification.recommended_confidence}`);

          if (Math.abs(claim.confidence - verification.recommended_confidence) > 0.05) {
            console.log(`   📊 Updating confidence: ${claim.confidence.toFixed(2)} → ${verification.recommended_confidence.toFixed(2)}`);
            tms.updateClaim(
              claim.id,
              claim.agent,
              claim.subject,
              claim.claim,
              verification.recommended_confidence,
              claim.distance_from_center,
              claim.requires_verification,
              claim.derives_from,
              verification.reasoning,
              claim.immutable,
              claim.importance,
              (claim.verification_count || 0) + 1,
              claim.failure_count,
              claim.metadata
            );
          } else {
            console.log(`   ✅ Confidence within acceptable range. No update needed.`);
          }

        } catch (error) {
          if (error instanceof Error) {
            console.log(`   ❌ Verification failed: ${error.message}\n`);
          } else {
            console.log(`   ❌ An unknown error occurred during verification.\n`);
          }
        }
      }

      console.log();
    }

    console.log('✅ Verification complete\n');
  });

program
  .command('meta-learn')
  .description('Analyze improvement patterns and optimize learning')
  .option('-P, --project-path <path>', 'Specify the root path of the CTRM project to manage')
  .action(async (options) => {
    const dbPath = getDbPath(options.projectPath);
    const tms = new TruthManagementSystem(dbPath);
    const llmService = new LlmService(tms);
    
    console.log('\n🧠 Starting Meta-Learning Analysis\n');
    
    // Analyze the history of improvements
    const prompt = `Analyze the history of claim refinements and verifications in this system and identify:

1. What types of refinements improve confidence most?
2. What patterns lead to successful claims?
3. What subjects need more coverage?
4. What distance ranges are underutilized?
5. How should the improvement strategy be adjusted?

Respond with specific, actionable recommendations.`;

    try {
      const result = await llmService.metaLearn(prompt);
      
      console.log(`\n💡 Meta-Learning Recommendations:\n`);
      result.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}\n`);
      });
      
    } catch (error) {
      if (error instanceof Error) {
        console.error('❌ Meta-Learning failed:', error.message);
      } else {
        console.error('❌ An unknown error occurred during meta-learning.');
      }
    }
    console.log('✅ Meta-Learning complete\n');
  });

program
  .command('daemon')
  .description('Run continuous improvement daemon with Three-Mind Architecture')
  .option('-c, --cycle-time <seconds>', 'Seconds between cycles', '300')
  .option('-m, --max-iterations <number>', 'Max iterations (0=infinite)', '0')
  .option('-P, --project-path <path>', 'Specify the root path of the CTRM project to manage')
  .option('--ml-training-interval <milliseconds>', 'Interval for ML training cycles in milliseconds', '60000') // New option
  .option('--ml-training-max-cycles <number>', 'Max ML training cycles (0 for infinite)', '0') // New option
  .action(async (options) => {
    console.log('[Daemon Command Debug] Options:', options);
    let iteration = 0;
    const maxIter = parseInt(options.maxIterations);
    const cycleTime = parseInt(options.cycleTime) * 1000; // Convert to milliseconds
    const mlTrainingIntervalMs = parseInt(options.mlTrainingInterval); // Parse new option
    const mlTrainingMaxCycles = parseInt(options.mlTrainingMaxCycles); // Parse new option

    const dbPath = getDbPath(options.projectPath);
    const tms = new TruthManagementSystem(dbPath);
    const llmService = new LlmService(tms);
    const internalLLM = new InternalLLM(tms);
    const orchestra = new DualLlmOrchestra(tms, internalLLM, llmService);

    // Initial check/ensure Truth 000
    tms.ensureTruth000();

    // Start the orchestra (which includes starting the ML Training Daemon)
    // Pass the ML training configuration to the orchestra's start method
    await orchestra.start(mlTrainingIntervalMs, mlTrainingMaxCycles);

    while (maxIter === 0 || iteration < maxIter) {
      iteration++;
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🧠 Three-Mind Daemon - Cycle ${iteration}`);
      console.log(`${'═'.repeat(60)}\n`);

      try {
        // Run a full discovery cycle
        console.log('Orchestrating Discovery Cycle...');
        await orchestra.runDiscoveryCycle();
        console.log('Discovery Cycle completed.');

        // Run a self-improvement cycle periodically (e.g., every 5 cycles)
        if (iteration % 5 === 0) {
          console.log('\nOrchestrating Self-Improvement Cycle...');
          await orchestra.runSelfImprovementCycle();
          console.log('Self-Improvement Cycle completed.');
        }

        console.log(`\n✅ Cycle complete: Iteration ${iteration}`);
      } catch (error) {
        console.error(`\n❌ Error during daemon cycle ${iteration}:`, error);
        // The DaemonManager will handle restarts based on this process exiting with an error
        process.exit(1);
      }

      if (maxIter !== 0 && iteration >= maxIter) {
        console.log(`\nDaemon reached max iterations (${maxIter}). Shutting down.`);
        break;
      }

      await sleep(cycleTime);
    }
    console.log('\nDaemon gracefully stopped.');
  });

program
  .command('list')
  .description('List all truths in the current project')
  .option('-s, --subject <subject>', 'Filter by subject')
  .option('-d, --distance <range>', 'Filter by distance (e.g., "0-10")')
  .option('-c, --confidence <min>', 'Filter by minimum confidence')
  .option('-P, --project-path <path>', 'Specify the root path of the CTRM project to manage')
  .action(async (options) => {
    const tms = new TruthManagementSystem(getDbPath(options.projectPath));
    let claims = tms.getAllClaims();

    // Apply filters
    if (options.subject) {
      claims = claims.filter(c => c.subject.toLowerCase().includes(options.subject.toLowerCase()));
    }

    if (options.distance) {
      const [min, max] = options.distance.split('-').map(Number);
      claims = claims.filter(c => c.distance_from_center >= min && c.distance_from_center <= max);
    }

    if (options.confidence) {
      const minConfidence = parseFloat(options.confidence);
      claims = claims.filter(c => c.confidence >= minConfidence);
    }

    console.log(`\n📚 Truth Base (${claims.length} claims):\n`);
    claims.forEach(claim => {
      console.log(`ID: ${claim.id}`);
      console.log(`  Subject: ${claim.subject}`);
      console.log(`  Claim: ${claim.claim}`);
      console.log(`  Confidence: ${claim.confidence.toFixed(2)}`);
      console.log(`  Distance: ${claim.distance_from_center}`);
      console.log(`  Agent: ${claim.agent}`);
      console.log();
    });
  });

program
  .command('status')
  .description('Show system health metrics')
  .option('-P, --project-path <path>', 'Specify the root path of the CTRM project to manage')
  .action(async (options) => {
    const tms = new TruthManagementSystem(getDbPath(options.projectPath));
    const claims = tms.getAllClaims();

    const stats = {
      total: claims.length,
      byDistance: {
        core: claims.filter(c => c.distance_from_center <= 10).length,
        mid: claims.filter(c => c.distance_from_center > 10 && c.distance_from_center <= 50).length,
        peripheral: claims.filter(c => c.distance_from_center > 50).length
      },
      byConfidence: {
        high: claims.filter(c => c.confidence >= 0.85).length,
        medium: claims.filter(c => c.confidence >= 0.60 && c.confidence < 0.85).length,
        low: claims.filter(c => c.confidence < 0.60).length
      },
      byAgent: {} as Record<string, number>
    };

    claims.forEach(c => {
      stats.byAgent[c.agent] = (stats.byAgent[c.agent] || 0) + 1;
    });

    console.log('\n📊 CTRM System Status\n');
    console.log(`Total Claims: ${stats.total}`);
    console.log(`\nBy Distance:`);
    console.log(`  Core (0-10): ${stats.byDistance.core}`);
    console.log(`  Mid (11-50): ${stats.byDistance.mid}`);
    console.log(`  Peripheral (50+): ${stats.byDistance.peripheral}`);

    console.log(`\nBy Confidence:`);
    console.log(`  High (≥0.85): ${stats.byConfidence.high}`);
    console.log(`  Medium (0.60-0.84): ${stats.byConfidence.medium}`);
    console.log(`  Low (<0.60): ${stats.byConfidence.low}`);

    console.log(`\nBy Agent:`);
    for (const [agent, count] of Object.entries(stats.byAgent)) {
      console.log(`  ${agent}: ${count}`);
    }

    console.log();
  });

program
  .command('learn-vector-isa')
  .description('Learn Vector ISA opcodes through experimentation')
  .option('-d, --document <path>', 'Path to Vector ISA spec')
  .option('-i, --iterations <number>', 'Number of experimentation iterations', '5')
  .option('-P, --project-path <path>', 'Specify the root path of the CTRM project to manage')
  .action(async (options) => {
    const tms = new TruthManagementSystem(getDbPath(options.projectPath));
    const llmService = new LlmService(tms);

    // 1. Ingest the Vector ISA document
    console.log('📚 Ingesting Vector ISA specification...\n');
    await _ingestDocument(options.document, tms, llmService, options.projectPath);

    // 2. Discover opcodes through experimentation
    console.log('🔬 Discovering opcodes through experimentation...\n');

    const iterations = parseInt(options.iterations) || 5;

    for (let iteration = 0; iteration < iterations; iteration++) {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`🧪 Experimentation Iteration ${iteration + 1} of ${iterations}`);
      console.log(`${'═'.repeat(60)}\n`);

      // Ask LLM to propose a new opcode based on current knowledge
      const discoveries = await llmService.discoverTruths(`
        Based on the Vector ISA specification and opcodes discovered so far,
        propose NEW opcodes that would be useful for vector operations.

        Focus on:
        - Geometric transformations
        - Spatial queries (contains, intersects, distance)
        - Vector arithmetic operations
        - Embedding manipulations

        For each opcode, specify:
        - The instruction name (uppercase, underscores, e.g., VECTOR_ADD)
        - What it does (1 sentence)
        - Input parameters (types and shapes, e.g., { vectorA: '[dim]', vectorB: '[dim]' })
        - Output shape (e.g., '[dim]' or 'scalar')
        - A simple example (e.g., 'VECTOR_ADD { vectorA: [1,2,3], vectorB: [4,5,6] } -> [5,7,9]')
      `);

      console.log(`💡 Discovered ${discoveries.length} new opcode candidates\n`);

      // 3. Verify and propose discovered opcodes
      for (const discovery of discoveries) {
        if (discovery.subject === 'Opcode' && discovery.confidence >= 0.80) {
          console.log(`✅ High-confidence opcode candidate: ${discovery.claim}\n`);

          tms.proposeClaim({
            agent: 'CTRM_VectorISA_Discovery',
            subject: 'Opcode',
            claim: discovery.claim,
            confidence: discovery.confidence,
            distance_from_center: discovery.distance_from_center,
            reason: discovery.reasoning,
            requires_verification: true // Opcodes should be verified
          });
        }
      }

      // Optional: Add a verification step here for newly proposed opcodes
      // Or run a full 'verify' cycle
    }
    console.log('\n✅ Vector ISA learning complete.\n');
  });


program
  .command('generate-program')
  .description('Generate and execute a Vector ISA program for a given task')
  .requiredOption('-t, --task <description>', 'Task to accomplish')
  .option('-P, --project-path <path>', 'Specify the root path of the CTRM project to manage')
  .action(async (options) => {
    const dbPath = getDbPath(options.projectPath);
    const tms = new TruthManagementSystem(dbPath);
    const llmService = new LlmService(tms);
    const executor = new VectorExecutor(); // Initialize with no LanceDB connection for now

    console.log('\n✨ Generating Vector ISA Program...\n');

    const prompt = `Generate a Vector ISA program (JSON object with an "opcodes" array) to accomplish this task:
"${options.task}"

Use only opcodes that exist in the current truth base (claims with subject "Opcode").
Ensure the program is syntactically correct and uses valid parameters for each opcode.

Example Program Structure:
{
  "opcodes": [
    { "op": "VECTOR_LOAD", "params": { "table": "embeddings", "filter": "id > 10" } },
    { "op": "VECTOR_TRANSFORM", "params": { "transformation": "normalize" } }
  ]
}`;

    const response = await llmService.analyzeRequest(prompt);

    let programJson: VectorProgram | null = null;
    try {
      let jsonString = (response || '').trim();

      // Extract JSON from markdown code block if present
      if (jsonString.includes('```json')) {
        const start = jsonString.indexOf('```json') + 7;
        const end = jsonString.indexOf('```', start);
        jsonString = jsonString.substring(start, end).trim();
      }

      // Try to parse
      programJson = JSON.parse(jsonString) as VectorProgram;
    } catch (err) {
      console.error('❌ Failed to parse Vector ISA program from LLM response. Raw response:');
      console.error(response);
      process.exit(1);
    }

    if (!programJson || !Array.isArray(programJson.opcodes)) {
      console.error('❌ LLM did not return a valid VectorProgram structure.');
      process.exit(1);
    }

    console.log('🚀 Executing generated Vector ISA program...\n');
    const result = await executor.execute(programJson);
    console.log('\n✅ Program result:', JSON.stringify(result, null, 2));
  });

program
  .command('test-gemini')
  .description('Test Gemini CLI integration with token usage monitoring')
  .option('-t, --task <taskType>', 'Type of task to test (pattern_analysis, complex_verification, architectural)', 'pattern_analysis')
  .option('-d, --description <description>', 'Description for the task', 'system architecture patterns')
  .option('-P, --project-path <path>', 'Specify the root path of the CTRM project to manage')
  .action(async (options) => {
    const dbPath = getDbPath(options.projectPath);
    const tms = new TruthManagementSystem(dbPath);
    const internalLLM = new InternalLLM(tms);
    const llmService = new LlmService(tms);
    const geminiCliService = new GeminiCliService(tms);
    const orchestra = new DualLlmOrchestra(tms, internalLLM, llmService);

    console.log('\n🧪 Testing Gemini CLI Integration\n');

    try {
      let result;
      switch (options.task) {
        case 'pattern_analysis':
          console.log('🔍 Running pattern analysis...');
          result = await geminiCliService.analyzeCodebasePattern(options.description);
          console.log(`\n💡 Analysis Result:`);
          console.log(`   Confidence: ${result.confidence.toFixed(2)}`);
          console.log(`   Token Usage: ${result.tokenUsage}`);
          console.log(`   Recommendations: ${result.recommendations.length}`);
          result.recommendations.forEach((rec: string, i: number) => console.log(`     ${i+1}. ${rec}`));
          break;

        case 'complex_verification':
          // Create a test claim for verification
          const testClaim: TruthClaim = {
            id: 'TEST_CLAIM',
            agent: 'TestAgent',
            subject: 'System Architecture',
            claim: options.description || 'The system should implement modular architecture for better maintainability',
            confidence: 0.7,
            distance_from_center: 30,
            requires_verification: true,
            timestamp: new Date().toISOString()
          };

          console.log('🔍 Running complex claim verification...');
          result = await geminiCliService.verifyComplexClaim(testClaim, 'architectural best practices');
          console.log(`\n💡 Verification Result:`);
          console.log(`   External Confidence: ${result.external_verification_confidence.toFixed(2)}`);
          console.log(`   Token Usage: ${result.tokenUsage}`);
          console.log(`   Contradictions: ${result.external_contradictions.length}`);
          console.log(`   Evidence: ${result.external_evidence}`);
          break;

        case 'architectural':
          console.log('🔍 Running architectural recommendations...');
          result = await geminiCliService.generateArchitecturalRecommendations(
            options.description,
            ['improving system performance', 'enhancing modularity']
          );
          console.log(`\n💡 Architectural Recommendations:`);
          console.log(`   Token Usage: ${result.tokenUsage}`);
          console.log(`   Recommendations: ${result.recommendations.length}`);
          result.recommendations.forEach((rec: any, i: number) => {
            console.log(`     ${i+1}. ${rec.recommendation}`);
            console.log(`        Impact: ${rec.impact}, Complexity: ${rec.implementation_complexity}`);
          });
          console.log(`   Strategic Insights: ${result.strategic_insights.length}`);
          result.strategic_insights.forEach((insight: string, i: number) => console.log(`     ${i+1}. ${insight}`));
          break;

        default:
          console.log('❌ Unknown task type');
          return;
      }

      // Show Gemini CLI usage statistics
      const stats = orchestra.getGeminiCliUsageStats();
      console.log(`\n📊 Gemini CLI Usage Statistics:`);
      console.log(`   Total Tokens Used: ${stats.totalTokensUsed}`);
      console.log(`   Total Requests: ${stats.totalRequests}`);
      console.log(`   Last Request Tokens: ${stats.lastRequestTokens}`);

    } catch (error) {
      console.error('❌ Error during Gemini CLI test:', error);
    }

    console.log('\n✅ Gemini CLI Integration Test Complete\n');
  });

program.parse(process.argv);
