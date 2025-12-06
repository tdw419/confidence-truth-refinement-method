import { TruthOptimizer } from './truth_optimizer';
import { TruthEmbeddingSystem } from './truth_embedding';
import { TruthClaim, TruthManagementSystem } from './truth_management_system';
import { InternalLLM } from './internal_llm';
import { LlmService } from './llm_service';

export interface TrainingMetrics {
    newTruths: number;
    avgConfidence: number;
    coherence: number;
    totalTruths: number;
    systemLoss: number;
    optimizationEpochs: number;
}

export interface ValidationMetrics {
    avgConfidence: number;
    coherence: number;
}

export class MLTrainingDaemon {
    private tms: TruthManagementSystem;
    private internalLLM: InternalLLM;
    private externalLLMService: LlmService;
    private optimizer: TruthOptimizer;
    private embeddingSystem: TruthEmbeddingSystem;

    constructor(
        tms: TruthManagementSystem,
        internalLLM: InternalLLM,
        externalLLMService: LlmService
    ) {
        this.tms = tms;
        this.internalLLM = internalLLM;
        this.externalLLMService = externalLLMService;
        this.embeddingSystem = new TruthEmbeddingSystem();
        this.optimizer = new TruthOptimizer(tms, internalLLM, externalLLMService, this.embeddingSystem);
    }

    /**
     * The full ML training cycle
     */
    async runTrainingCycle(): Promise<TrainingMetrics> {
        console.log("\n🧠 Starting ML Training Cycle...\n");

        // 1. PREPARE DATA (Gather current truths)
        const truthBase = this.tms.getAllClaims();
        console.log(`📊 Truth Base: ${truthBase.length} truths`);

        // 2. BUILD MODEL (Already built - our dual-LLM)
        console.log(`🏗️  Model: Dual-LLM Oracle`);

        // 3. TRAINING (The Magic)
        console.log(`🎯 Training Phase:`);

        // 3a. GUESS - Discover new truths using LLM service
        const discoveries = await this.externalLLMService.discoverTruths("Discover new truths to strengthen the CTRM's knowledge base");
        console.log(`  💡 Discovered ${discoveries.length} potential truths`);

        // 3b. MEASURE - Calculate loss for each
        const truthsWithLoss = await Promise.all(
            discoveries.map(async (claim: any) => {
                const loss = await this.optimizer['lossCalculator'].calculateLoss(
                    claim.claim,
                    truthBase
                );
                return { claim, loss };
            })
        );

        console.log(`  📏 Measured loss for all discoveries`);

        // 3c. ADJUST - Optimize accepted truths
        const acceptedTruths = truthsWithLoss
            .filter((t: any) => t.loss < 2.0) // Accept low-loss truths
            .map((t: any) => t.claim);

        console.log(`  ✅ Accepted ${acceptedTruths.length} truths (loss < 2.0)`);

        // Convert accepted truths to TruthClaim format and add to truth base
        const newTruthClaims: TruthClaim[] = acceptedTruths.map((truth: any, index: number) => ({
            id: `ML_DISCOVERY_${Date.now()}_${index}`,
            agent: 'MLDaemon',
            subject: truth.subject || 'MLDiscovery',
            claim: truth.claim,
            confidence: Math.min(0.8, (truth.confidence || 0.5) * 1.1), // Boost confidence for ML-discovered truths
            distance_from_center: truth.distance_from_center || 30,
            requires_verification: true,
            timestamp: new Date().toISOString(),
            reason: `Discovered through ML training cycle with loss < 2.0`
        }));

        // Add new truths to the system
        newTruthClaims.forEach(truth => {
            this.tms.proposeClaim(truth);
        });

        // Optimize the entire truth base
        const optimizationStartTime = Date.now();
        const optimizedBase = await this.optimizer.optimizeBatch(
            truthBase,
            [...truthBase, ...newTruthClaims], // Include new truths in optimization
            5 // 5 optimization epochs
        );
        const optimizationDuration = Date.now() - optimizationStartTime;

        console.log(`  🎛️  Optimized ${optimizedBase.length} truths in ${optimizationDuration}ms`);

        // 4. PREDICTION (Test on validation set)
        const validationMetrics = await this.validateModel(optimizedBase);

        // Calculate system loss
        const systemLoss = await this.optimizer['lossCalculator'].calculateSystemLoss(optimizedBase);

        console.log(`\n📈 Training Cycle Complete:`);
        console.log(`  - New Truths: ${acceptedTruths.length}`);
        console.log(`  - Avg Confidence: ${validationMetrics.avgConfidence.toFixed(3)}`);
        console.log(`  - Coherence Score: ${validationMetrics.coherence.toFixed(3)}`);
        console.log(`  - System Loss: ${systemLoss.toFixed(3)}`);
        console.log(`  - Optimization Epochs: 5`);

        return {
            newTruths: acceptedTruths.length,
            avgConfidence: validationMetrics.avgConfidence,
            coherence: validationMetrics.coherence,
            totalTruths: this.tms.getAllClaims().length, // Reflects the actual count after all operations
            systemLoss: systemLoss,
            optimizationEpochs: 5
        };
    }

    /**
     * Validate the model after training
     */
    private async validateModel(truthBase: TruthClaim[]): Promise<ValidationMetrics> {
        // Calculate validation metrics
        const avgConfidence = truthBase.reduce((sum, t) =>
            sum + t.confidence, 0
        ) / truthBase.length;

        // Calculate coherence score using embeddings
        const embeddings = await Promise.all(
            truthBase.map(truth => this.embeddingSystem.embedTruth(truth.claim))
        );

        let totalSimilarity = 0;
        let pairCount = 0;

        // Calculate average pairwise similarity (coherence)
        for (let i = 0; i < embeddings.length; i++) {
            for (let j = i + 1; j < embeddings.length; j++) {
                const similarity = this.embeddingSystem.calculateSimilarity(
                    embeddings[i], embeddings[j]
                );
                totalSimilarity += similarity;
                pairCount++;
            }
        }

        const coherence = pairCount > 0 ? totalSimilarity / pairCount : 0.5;

        return { avgConfidence, coherence };
    }

    /**
     * Run continuous training with monitoring
     */
    async startTrainingLoop(
        intervalMs: number = 60000,
        maxCycles: number = 0 // 0 for infinite
    ): Promise<void> {
        let cycle = 0;
        while (maxCycles === 0 || cycle < maxCycles) {
            cycle++;
            try {
                console.log(`\n=== ML Training Daemon Cycle ${cycle} ===`);
                await this.runTrainingCycle();
            } catch (error) {
                console.error(`❌ Error in ML Training Daemon cycle ${cycle}:`, error);
            }
            if (maxCycles !== 0 && cycle >= maxCycles) {
                console.log(`ML Training Daemon reached max cycles (${maxCycles}).`);
                break;
            }
            console.log(`Waiting ${intervalMs / 1000}s before next ML training cycle...`);
            await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
    }

    /**
     * Get ML training statistics
     */
    async getTrainingStatistics(): Promise<{
        currentSystemLoss: number;
        truthCount: number;
        avgConfidence: number;
        coherenceScore: number;
    }> {
        const truthBase = this.tms.getAllClaims();

        const systemLoss = await this.optimizer['lossCalculator'].calculateSystemLoss(truthBase);

        const avgConfidence = truthBase.reduce((sum, t) => sum + t.confidence, 0) / truthBase.length;

        // Calculate coherence
        const embeddings = await Promise.all(
            truthBase.map(truth => this.embeddingSystem.embedTruth(truth.claim))
        );

        let coherenceScore = 0.5; // Default
        if (embeddings.length > 1) {
            let totalSimilarity = 0;
            let pairCount = 0;

            for (let i = 0; i < Math.min(20, embeddings.length); i++) {
                for (let j = i + 1; j < Math.min(20, embeddings.length); j++) {
                    totalSimilarity += this.embeddingSystem.calculateSimilarity(embeddings[i], embeddings[j]);
                    pairCount++;
                }
            }

            coherenceScore = pairCount > 0 ? totalSimilarity / pairCount : 0.5;
        }

        return {
            currentSystemLoss: systemLoss,
            truthCount: truthBase.length,
            avgConfidence: avgConfidence,
            coherenceScore: coherenceScore
        };
    }

    /**
     * Run contradiction-based optimization
     */
    async runContradictionOptimization(): Promise<{
        contradictionsFound: number;
        truthsOptimized: number;
        systemLossBefore: number;
        systemLossAfter: number;
    }> {
        const truthBase = this.tms.getAllClaims();

        // Calculate initial system loss
        const systemLossBefore = await this.optimizer['lossCalculator'].calculateSystemLoss(truthBase);

        // Find contradictions
        const contradictions: any[] = [];
        let contradictionCount = 0;

        // Simple contradiction detection
        for (let i = 0; i < truthBase.length; i++) {
            for (let j = i + 1; j < truthBase.length; j++) {
                const isContradiction = this.tms.isContradiction(truthBase[i], truthBase[j]);
                if (isContradiction) {
                    contradictions.push({
                        truth1: truthBase[i],
                        truth2: truthBase[j]
                    });
                    contradictionCount++;
                }
            }
        }

        console.log(`Found ${contradictionCount} contradictions in truth base`);

        // Optimize truths involved in contradictions
        if (contradictionCount > 0) {
            // Get all truths involved in contradictions
            const truthsToOptimize = new Set<TruthClaim>();
            contradictions.forEach(contradiction => {
                truthsToOptimize.add(contradiction.truth1);
                truthsToOptimize.add(contradiction.truth2);
            });

            const truthsArray = Array.from(truthsToOptimize);

            // Optimize these truths
            const optimizedTruths = await this.optimizer.optimizeBatch(
                truthsArray,
                truthBase,
                3 // Fewer epochs for contradiction optimization
            );

            // Update the truths in the system
            optimizedTruths.forEach(optimizedTruth => {
                this.tms.updateClaim(
                    optimizedTruth.id,
                    optimizedTruth.agent,
                    optimizedTruth.subject,
                    optimizedTruth.claim,
                    optimizedTruth.confidence,
                    optimizedTruth.distance_from_center,
                    optimizedTruth.requires_verification,
                    optimizedTruth.derives_from,
                    optimizedTruth.reason,
                    optimizedTruth.immutable,
                    optimizedTruth.importance,
                    optimizedTruth.verification_count,
                    optimizedTruth.failure_count,
                    optimizedTruth.metadata
                );
            });

            // Calculate final system loss
            const systemLossAfter = await this.optimizer['lossCalculator'].calculateSystemLoss(
                this.tms.getAllClaims()
            );

            return {
                contradictionsFound: contradictionCount,
                truthsOptimized: truthsArray.length,
                systemLossBefore: systemLossBefore,
                systemLossAfter: systemLossAfter
            };
        }

        return {
            contradictionsFound: 0,
            truthsOptimized: 0,
            systemLossBefore: systemLossBefore,
            systemLossAfter: systemLossBefore
        };
    }
}