/**
 * ML Integration Test
 *
 * This test validates that the ML components integrate properly with CTRM
 */

import { TruthManagementSystem, TruthClaim } from '../lib/truth_management_system';
import { TruthEmbeddingSystem } from '../lib/truth_embedding';
import { TruthLossCalculator } from '../lib/truth_loss';
import { TruthOptimizer } from '../lib/truth_optimizer';
import { MLTrainingDaemon } from '../lib/ml_training_daemon';
import { InternalLLM } from '../lib/internal_llm';
import { LlmService } from '../lib/llm_service';

// Mock the entire TruthEmbeddingSystem module
jest.mock('../lib/truth_embedding', () => {
    return {
        TruthEmbeddingSystem: jest.fn().mockImplementation(() => {
            return {
                embedTruth: jest.fn(async (claim: string) => Array(1536).fill(claim.length * 0.01)),
                calculateSimilarity: jest.fn((embedding1: number[], embedding2: number[]) => 0.8),
                calculateEmbeddingDistance: jest.fn((embedding1: number[], embedding2: number[]) => 0.2),
                findRelatedTruths: jest.fn(async (targetClaim: string, truthBase: TruthClaim[], threshold: number = 0.7) => {
                    if (truthBase.length > 0) {
                        return [{ truth: truthBase[0], similarity: 0.9 }];
                    }
                    return [];
                }),
                clearCache: jest.fn(),
            };
        }),
    };
});

describe('ML Integration Tests', () => {
    let tms: TruthManagementSystem;
    let embeddingSystem: TruthEmbeddingSystem; // Now refers to the mocked class
    let lossCalculator: TruthLossCalculator;
    let optimizer: TruthOptimizer;
    let llmService: LlmService;

    beforeAll(() => {
        // Initialize test database
        tms = new TruthManagementSystem(':memory:');
        tms.initializeSchema();
        tms.ensureTruth000();

        // Instantiate the mocked TruthEmbeddingSystem
        embeddingSystem = new TruthEmbeddingSystem();
        
        // Pass the mock embeddingSystem to TruthLossCalculator
        lossCalculator = new TruthLossCalculator(embeddingSystem);
        
        // Initialize LLM service (mock for testing)
        llmService = new LlmService(tms, 'http://localhost:1234/v1/chat/completions');

        // Mock llmService.discoverTruths
        llmService.discoverTruths = jest.fn().mockResolvedValue([
            { claim: 'Mocked ML Truth 1', subject: 'ML', confidence: 0.7, distance_from_center: 20 },
            { claim: 'Mocked ML Truth 2', subject: 'ML', confidence: 0.8, distance_from_center: 25 },
            { claim: 'Mocked ML Truth 3', subject: 'ML', confidence: 0.6, distance_from_center: 15 },
        ]);
        
        // Initialize InternalLLM
        const internalLLM = new InternalLLM(tms);

        // Initialize optimizer with its new dependencies, including the mock embeddingSystem
        optimizer = new TruthOptimizer(tms, internalLLM, llmService, embeddingSystem);
    });

    test('Truth Embedding System should create embeddings', async () => {
        const testClaim = "The system must honor the Creator in all operations";
        const embedding = await embeddingSystem.embedTruth(testClaim);

        expect(embedding).toBeDefined();
        expect(Array.isArray(embedding)).toBe(true);
        expect(embedding.length).toBeGreaterThan(0);
        expect(embeddingSystem.embedTruth).toHaveBeenCalledWith(testClaim);
    });

    test('Truth Loss Calculator should calculate loss', async () => {
        // Add some test truths
        const truth1 = {
            id: 'test_001',
            agent: 'Test',
            subject: 'SystemDesign',
            claim: 'All system operations must be transparent',
            confidence: 0.9,
            distance_from_center: 10,
            requires_verification: false,
            timestamp: new Date().toISOString()
        };

        const truth2 = {
            id: 'test_002',
            agent: 'Test',
            subject: 'SystemDesign',
            claim: 'System operations should be opaque for security',
            confidence: 0.7,
            distance_from_center: 20,
            requires_verification: true,
            timestamp: new Date().toISOString()
        };

        tms.proposeClaim(truth1);
        tms.proposeClaim(truth2);

        const truthBase = tms.getAllClaims();
        const newClaim = "System transparency is essential for trust";

        const loss = await lossCalculator.calculateLoss(newClaim, truthBase);

        expect(loss).toBeDefined();
        expect(typeof loss).toBe('number');
        expect(loss).toBeGreaterThanOrEqual(0);
        expect(embeddingSystem.findRelatedTruths).toHaveBeenCalled();
    });

    test('Truth Optimizer should adjust confidence', async () => {
        const truthBase = tms.getAllClaims();
        const testTruth = truthBase[0]; // Use first truth

        const result = await optimizer.optimizeTruth(testTruth, truthBase);

        expect(result).toBeDefined();
        expect(result.originalConfidence).toBeDefined();
        expect(result.newConfidence).toBeDefined();
        expect(result.loss).toBeDefined();
        expect(result.adjustment).toBeDefined();
        expect(embeddingSystem.embedTruth).toHaveBeenCalled();
    });

    test('ML Training Daemon should integrate components', async () => {
        const internalLLM = new InternalLLM(tms);
        const trainingDaemon = new MLTrainingDaemon(tms, internalLLM, llmService);

        // Test statistics gathering
        const stats = await trainingDaemon.getTrainingStatistics();

        expect(stats).toBeDefined();
        expect(stats.currentSystemLoss).toBeDefined();
        expect(stats.truthCount).toBeGreaterThan(0);
        expect(stats.avgConfidence).toBeGreaterThan(0);
        expect(stats.coherenceScore).toBeDefined();
    });

    test('ML Training Daemon should successfully run a training cycle', async () => {
        const internalLLM = new InternalLLM(tms);
        const trainingDaemon = new MLTrainingDaemon(tms, internalLLM, llmService);

        // Ensure there are some truths for the daemon to work with
        tms.proposeClaim({
            id: 'initial_ml_truth_0',
            agent: 'Test',
            subject: 'ML',
            claim: 'ML training improves system confidence',
            confidence: 0.7,
            distance_from_center: 20,
            requires_verification: true,
            timestamp: new Date().toISOString()
        });

        const metrics = await trainingDaemon.runTrainingCycle();

        expect(metrics).toBeDefined();
        expect(metrics.newTruths).toBeGreaterThanOrEqual(0); // Can be 0 if no new truths are discovered or accepted
        expect(metrics.avgConfidence).toBeDefined();
        expect(metrics.coherence).toBeDefined();
        expect(metrics.totalTruths).toBeGreaterThanOrEqual(tms.getAllClaims().length); // Total truths should at least not decrease
        expect(metrics.systemLoss).toBeDefined();
        expect(metrics.optimizationEpochs).toBe(5);
    }, 30000); // Increase timeout for this test as it involves LLM calls
});