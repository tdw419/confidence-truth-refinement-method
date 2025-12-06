import { randomUUID } from 'crypto';
/**
 * CTRM Dual-LLM Orchestra - The Conductor of the Three-Mind Architecture
 *
 * This module orchestrates the interaction between the Internal LLM (Reasoner)
 * and the External LLM (Explorer) to perform complex tasks such as
 * comprehensive discovery cycles, dual-LLM verification, and system
 * self-improvement. It acts as the central control for the "Three-Mind" system.
 */

import { InternalLLM, InternalLLMInterface, Thought, Verification, Insight, KnowledgeGap, ExplorationPlan, MetaInsight, Feedback } from './internal_llm';
import { LlmService } from './llm_service';
import { GeminiCliService } from './gemini_cli_service';
import { TruthManagementSystem, TruthClaim, TRUTH_000_DEFINITION } from './truth_management_system';
import { MLTrainingDaemon } from './ml_training_daemon';

/**
 * Interface for System Health Metrics
 */
export interface SystemHealthMetrics {
    overall_health: number; // 0-1, composite score
    internal_llm_load: number;
    external_llm_load: number;
    truth_base_integrity: number; // 0-1, based on contradictions and confidence
    knowledge_growth_rate: number; // Truths added per cycle
    verification_accuracy: number; // % of internal/external verifications agreeing
    gaps_identified: number;
    gaps_resolved: number;
    meta_learning_efficiency: number; // How often meta-learning improves the system
    performance_bottlenecks: string[];
}

/**
 * Interface for the Dual-LLM Orchestra's core capabilities
 */
export interface DualLlmOrchestraInterface {
    /**
     * Executes a full discovery cycle: plan -> explore -> verify -> learn.
     * This is the core autonomous operation of the CTRM.
     */
    runDiscoveryCycle(initialPrompt: string): Promise<Insight[]>;

    /**
     * Performs a dual-LLM verification of a claim, combining internal and external perspectives.
     * @param claim The claim to verify.
     * @returns A comprehensive verification result.
     */
    dualLlmVerify(claim: TruthClaim): Promise<Verification>;

    /**
     * Initiates a self-improvement cycle based on meta-learning.
     */
    runSelfImprovementCycle(): Promise<MetaInsight[]>;

    /**
     * Provides current system health and performance metrics.
     */
    getSystemHealth(): Promise<SystemHealthMetrics>;

    /**
     * Allows for manual input or feedback to influence the orchestra's operations.
     */
    ingestFeedback(feedback: Feedback): Promise<void>;
}

export class DualLlmOrchestra implements DualLlmOrchestraInterface {
    private internalLLM: InternalLLM;
    private externalLLMService: LlmService;
    private geminiCliService: GeminiCliService;
    private tms: TruthManagementSystem;
    private lastDiscoveryCycleTime: Date | null = null;
    private totalDiscoveryCycles: number = 0;
    private totalVerifications: number = 0;
    private successfulVerifications: number = 0;
    private knowledgeGrowthThisCycle: number = 0;
    private geminiCliUsageStats: {
        totalTokensUsed: number;
        totalRequests: number;
        lastRequestTokens: number;
    } = {
        totalTokensUsed: 0,
        totalRequests: 0,
        lastRequestTokens: 0
    };
    private mlTrainingDaemon: MLTrainingDaemon;

    constructor(tms: TruthManagementSystem, internalLLM: InternalLLM, externalLLMService: LlmService) {
        this.tms = tms;
        this.internalLLM = internalLLM;
        this.externalLLMService = externalLLMService;
        this.geminiCliService = new GeminiCliService(tms);
        this.mlTrainingDaemon = new MLTrainingDaemon(tms, internalLLM, externalLLMService);
        // Ensure the foundational truth exists.
        this.tms.ensureTruth000();
    }

    /**
     * Executes a full discovery cycle: plan -> explore -> verify -> learn.
     * This is the core autonomous operation of the CTRM.
     */
    public async runDiscoveryCycle(initialPrompt: string = "Explore new truths to strengthen the CTRM's knowledge base and improve its capabilities."): Promise<Insight[]> {
        this.lastDiscoveryCycleTime = new Date();
        this.totalDiscoveryCycles++;
        this.knowledgeGrowthThisCycle = 0;
        console.log(`\n--- Starting Discovery Cycle #${this.totalDiscoveryCycles} ---`);

        // Phase 1: Plan
        console.log('  [Orchestra] Phase 1: Planning exploration...');
        const explorationPlan: ExplorationPlan = await this.internalLLM.planExploration();
        console.log(`    Focus Areas: ${explorationPlan.focus_areas.join(', ')}`);
        console.log(`    Query Strategies: ${explorationPlan.query_strategies.join('; ')}`);
        console.log(`    Expected Outcomes: ${explorationPlan.expected_outcomes.join('; ')}`);

        // Phase 2: Explore (using External LLM)
        console.log('  [Orchestra] Phase 2: Exploring for new truths with External LLM...');
        const discoveredTruths = await this.externalLLMService.discoverTruths(initialPrompt + ` Focus on: ${explorationPlan.focus_areas.join(', ')}. Strategies: ${explorationPlan.query_strategies.join(', ')}.`);
        console.log(`    Discovered ${discoveredTruths.length} potential new truths.`);

        const newTruthClaims: TruthClaim[] = [];
        for (const dt of discoveredTruths) {
            // Check for existence to prevent duplicates
            const existing = this.tms.getAllClaims().find(c => c.claim === dt.claim && c.subject === dt.subject);
            if (!existing) {
                newTruthClaims.push({
                    id: `CLAIM_${randomUUID()}`, // Use randomUUID for unique IDs
                    agent: 'ExternalLLM',
                    subject: dt.subject,
                    claim: dt.claim,
                    confidence: dt.confidence * 0.8, // Initial confidence from external LLM
                    distance_from_center: dt.distance_from_center,
                    requires_verification: true, // Always verify new discoveries
                    timestamp: new Date().toISOString(),
                    reason: dt.reasoning,
                });
            }
        }
        console.log(`    Added ${newTruthClaims.length} unique potential truths to the queue for verification.`);

        // Phase 3: Verify (Dual-LLM Verification)
        console.log('  [Orchestra] Phase 3: Verifying discovered truths using Dual-LLM approach...');
        const verifiedClaims: TruthClaim[] = [];
        for (const claim of newTruthClaims) {
            console.log(`    Verifying claim: "${claim.claim}"`);
            const verificationResult = await this.dualLlmVerify(claim);
            this.totalVerifications++;
            if (verificationResult.accept) {
                this.successfulVerifications++;
                const finalConfidence = Math.max(claim.confidence, verificationResult.confidence); // Take higher confidence
                const verifiedClaim: TruthClaim = {
                    ...claim,
                    confidence: finalConfidence,
                    requires_verification: false,
                    verification_count: (claim.verification_count || 0) + 1,
                    reason: `Verified by Dual-LLM. ${verificationResult.reasoning}`
                };
                this.tms.proposeClaim(verifiedClaim);
                verifiedClaims.push(verifiedClaim);
                this.knowledgeGrowthThisCycle++;
                console.log(`      ✅ Accepted claim with confidence: ${finalConfidence.toFixed(2)}`);
            } else {
                // If rejected, internal LLM learns from this
                await this.internalLLM.learnFromVerification(verificationResult);
                console.log(`      ❌ Rejected claim. Reasoning: ${verificationResult.reasoning}`);
            }
        }
        console.log(`    ${verifiedClaims.length} claims successfully verified and added to the truth base.`);

        // Phase 4: Learn & Synthesize
        console.log('  [Orchestra] Phase 4: Learning from cycle and synthesizing insights...');
        await this.internalLLM.updateWorldModel(verifiedClaims); // Update internal LLM's world model
        const synthesizedInsights = await this.internalLLM.synthesize(verifiedClaims);
        console.log(`    Generated ${synthesizedInsights.length} new insights.`);

        const metaInsights = await this.internalLLM.reflect(); // Internal LLM reflects on process
        console.log(`    Internal LLM generated ${metaInsights.length} meta-insights.`);

        console.log(`--- Discovery Cycle #${this.totalDiscoveryCycles} Complete ---`);
        return synthesizedInsights;
    }

    /**
     * Performs a dual-LLM verification of a claim, combining internal and external perspectives.
     * @param claim The claim to verify.
     * @returns A comprehensive verification result.
     */
    public async dualLlmVerify(claim: TruthClaim): Promise<Verification> {
        console.log(`    [Dual-LLM Verify] Starting verification for claim: "${claim.claim}"`);

        // Internal LLM's assessment
        const internalVerification = await this.internalLLM.verify(claim);
        console.log(`      Internal LLM Confidence: ${internalVerification.confidence.toFixed(2)}, Accepted: ${internalVerification.accept}`);

        // External LLM's assessment
        let externalVerificationConfidence = 0;
        let externalVerificationReasoning = '';
        let externalContradictions: TruthClaim[] = [];

        try {
            const externalLlmResponse = await this.externalLLMService.verifyClaim(claim, `Verify the following claim considering the CTRM truth base.`);
            externalVerificationConfidence = externalLlmResponse.verification_confidence;
            externalVerificationReasoning = externalLlmResponse.reasoning;
            // Map external contradictions (IDs) back to TruthClaim objects
            externalContradictions = externalLlmResponse.contradictions
                .map(id => this.tms.getClaimById(id))
                .filter((c): c is TruthClaim => c !== null); // Filter out nulls
            console.log(`      External LLM Confidence: ${externalVerificationConfidence.toFixed(2)}`);
        } catch (error) {
            console.error(`      Error during external LLM verification: ${error}. Falling back to internal assessment.`);
            // If external LLM fails, significantly reduce its confidence contribution
            externalVerificationConfidence = 0.1;
            externalVerificationReasoning = `External LLM failed to respond. Relying primarily on internal assessment.`;
        }

        // Get current truth count for bootstrap logic
        const truthCount = await this.tms.getTruthCount();

        // Bootstrap phase: first 50 truths, trust external more
        const internalWeight = truthCount < 50 ? 0.2 : 0.6;
        const externalWeight = 1.0 - internalWeight;

        // Combine assessments with dynamic weighting
        const combinedConfidence =
            (internalVerification.confidence * internalWeight) +
            (externalVerificationConfidence * externalWeight);

        // Lower acceptance threshold during bootstrap
        const acceptanceThreshold = truthCount < 50 ? 0.65 : 0.7; // Keep 0.7 for normal phase

        const accept = combinedConfidence >= acceptanceThreshold;

        // Combine contradictions: take all unique contradictions from both sources
        const allContradictions = Array.from(new Set([
            ...internalVerification.contradictions.map(c => c.id),
            ...externalContradictions.map(c => c.id)
        ])).map(id => this.tms.getClaimById(id)).filter((c): c is TruthClaim => c !== null);

        // Determine recommended action based on combined results
        const recommendedAction = accept ? 'accept' :
                                  (combinedConfidence < 0.5 || allContradictions.length > 0) ? 'reject' : 'refine';

        const finalReasoning = `Dual-LLM assessment: Internal confidence ${internalVerification.confidence.toFixed(2)}, External confidence ${externalVerificationConfidence.toFixed(2)}.
Combined reasoning: ${internalVerification.reasoning} | ${externalVerificationReasoning}
Contradictions found: ${allContradictions.length} (Internal: ${internalVerification.contradictions.length}, External: ${externalContradictions.length})`;

        const dualLlmResult: Verification = {
            accept: accept,
            confidence: combinedConfidence,
            contradictions: allContradictions,
            supporting_evidence: internalVerification.supporting_evidence, // Rely on internal for this for now
            reasoning: finalReasoning,
            recommended_action: recommendedAction,
        };

        await this.internalLLM.learnFromVerification(dualLlmResult); // Internal LLM learns from this combined result
        return dualLlmResult;
    }

    /**
     * Initiates a self-improvement cycle based on meta-learning.
     */
    public async runSelfImprovementCycle(): Promise<MetaInsight[]> {
        console.log('\n  [Orchestra] Starting Self-Improvement Cycle...');

        // 1. Internal LLM reflects on its own performance and knowledge
        const internalMetaInsights = await this.internalLLM.reflect();
        console.log(`    Internal LLM generated ${internalMetaInsights.length} meta-insights.`);

        // 2. External LLM (meta-learning agent) analyzes system-wide history
        const externalMetaRecommendations = await this.externalLLMService.metaLearn(`Analyze system history for improvement strategies.`);
        console.log(`    External LLM provided ${externalMetaRecommendations.recommendations.length} meta-recommendations.`);

        // 2.5. Use Gemini CLI for high-value architectural recommendations (every 3rd cycle for token conservation)
        if (this.totalDiscoveryCycles % 3 === 0) {
            console.log('    [Gemini CLI] Requesting architectural recommendations...');
            try {
                const geminiRecommendations = await this.geminiCliService.generateArchitecturalRecommendations(
                    'system optimization and truth base management',
                    ['improving verification efficiency', 'enhancing knowledge discovery', 'optimizing token usage']
                );

                console.log(`    [Gemini CLI] Received ${geminiRecommendations.recommendations.length} architectural recommendations using ${geminiRecommendations.tokenUsage} tokens.`);

                // Add Gemini CLI recommendations to meta-insights
                geminiRecommendations.recommendations.forEach(rec => {
                    allMetaInsights.push({
                        insight_type: 'strategy',
                        content: `[Gemini CLI] ${rec.recommendation} (Impact: ${rec.impact}, Complexity: ${rec.implementation_complexity})`,
                        confidence: rec.confidence,
                        timestamp: new Date().toISOString(),
                    });
                });

                // Add strategic insights
                geminiRecommendations.strategic_insights.forEach(insight => {
                    allMetaInsights.push({
                        insight_type: 'knowledge',
                        content: `[Gemini CLI Insight] ${insight}`,
                        confidence: 0.85,
                        timestamp: new Date().toISOString(),
                    });
                });
            } catch (error) {
                console.error('    [Gemini CLI] Error getting architectural recommendations:', error);
            }
        }

        // 3. Synthesize meta-insights and recommendations
        const allMetaInsights: MetaInsight[] = [...internalMetaInsights];
        externalMetaRecommendations.recommendations.forEach(rec => {
            allMetaInsights.push({
                insight_type: 'strategy',
                content: rec,
                confidence: 0.9, // High confidence for external recommendations
                timestamp: new Date().toISOString(),
            });
        });

        // 4. Act on recommendations (simplified for now)
        // In a real system, this would involve adjusting parameters,
        // re-prioritizing tasks, or even generating code modifications.
        if (allMetaInsights.length > 0) {
            console.log('    Applying meta-learning recommendations (simulated actions)...');
            allMetaInsights.forEach(insight => {
                if (insight.insight_type === 'performance' || insight.insight_type === 'strategy') {
                    // Example: if external recommends to increase discovery rate, adjust internal state
                    if (insight.content.includes('increase discovery rate')) {
                        console.log('      Simulating adjustment: Increased discovery aggressiveness.');
                        // this.discoveryAggressiveness++; // Example internal state change
                    }
                }
            });
            // Internal LLM learns from the feedback of applying these recommendations
            const feedback: Feedback = {
                type: 'positive',
                content: 'Successfully completed self-improvement cycle based on meta-insights.',
                related_truths: [],
                timestamp: new Date().toISOString(),
            };
            await this.internalLLM.improveReasoning(feedback);
        } else {
            console.log('    No significant meta-insights or recommendations to apply.');
        }

        console.log('  [Orchestra] Self-Improvement Cycle Complete.');
        return allMetaInsights;
    }

    /**
     * Get Gemini CLI usage statistics
     */
    public getGeminiCliUsageStats(): {
        totalTokensUsed: number;
        totalRequests: number;
        lastRequestTokens: number;
    } {
        const stats = this.geminiCliService.getTokenUsageStats();
        this.geminiCliUsageStats = {...stats};
        return this.geminiCliUsageStats;
    }

    /**
     * Provides current system health and performance metrics.
     */
    public async getSystemHealth(): Promise<SystemHealthMetrics> {
        // Internal LLM metrics
        const internalLLMMetaInsights = await this.internalLLM.reflect();
        const knowledgeGrowthInsight = internalLLMMetaInsights.find(mi => mi.insight_type === 'knowledge' && mi.content.includes('knowledge base contains'));
        const verificationPerformanceInsight = internalLLMMetaInsights.find(mi => mi.insight_type === 'performance' && mi.content.includes('Recent verifications show'));
        const reasoningImprovementInsight = internalLLMMetaInsights.find(mi => mi.insight_type === 'process' && mi.content.includes('Verification confidence has'));

        let knowledgeGrowthRate = 0;
        if (knowledgeGrowthInsight) {
            const match = knowledgeGrowthInsight.content.match(/contains (\d+) truths/);
            if (match) {
                knowledgeGrowthRate = parseInt(match[1]) / (this.totalDiscoveryCycles || 1); // Simple approximation
            }
        }

        let verificationAccuracy = 0;
        if (this.totalVerifications > 0) {
            verificationAccuracy = this.successfulVerifications / this.totalVerifications;
        }

        let internalLlmLoad = 0.5; // Placeholder
        let externalLlmLoad = 0.5; // Placeholder

        // Truth base integrity
        const allClaims = this.tms.getAllClaims();
        const integrityScore = this._calculateTruthBaseIntegrity(allClaims);

        // Gaps identified/resolved (simplified)
        const gapsIdentified = (await this.internalLLM.identifyGaps()).length;
        const gapsResolved = 0; // Requires tracking over time

        let metaLearningEfficiency = 0.7; // Placeholder

        // Get Gemini CLI usage stats for performance monitoring
        const geminiStats = this.getGeminiCliUsageStats();
        const geminiEfficiency = geminiStats.totalRequests > 0
            ? Math.min(1, 1 - (geminiStats.totalTokensUsed / (geminiStats.totalRequests * 5000)))
            : 0;

        const health: SystemHealthMetrics = {
            overall_health: (integrityScore * 0.3) + (verificationAccuracy * 0.3) + (knowledgeGrowthRate > 0 ? 0.2 : 0) + (gapsIdentified === 0 ? 0.2 : 0),
            internal_llm_load: internalLlmLoad,
            external_llm_load: externalLlmLoad,
            truth_base_integrity: integrityScore,
            knowledge_growth_rate: knowledgeGrowthRate,
            verification_accuracy: verificationAccuracy,
            gaps_identified: gapsIdentified,
            gaps_resolved: gapsResolved,
            meta_learning_efficiency: metaLearningEfficiency,
            performance_bottlenecks: geminiStats.totalTokensUsed > 10000 ? ['High Gemini CLI token usage detected'] : [],
        };

        // Incorporate Gemini CLI efficiency into overall health (10% weight)
        health.overall_health = (health.overall_health * 0.9) + (geminiEfficiency * 0.1);

        // Normalize overall_health to 0-1
        health.overall_health = Math.min(1, Math.max(0, health.overall_health));

        return health;
    }

    /**
     * Allows for manual input or feedback to influence the orchestra's operations.
     */
    public async ingestFeedback(feedback: Feedback): Promise<void> {
        console.log(`\n  [Orchestra] Ingesting Feedback: ${feedback.type} - "${feedback.content}"`);
        await this.internalLLM.improveReasoning(feedback);
        console.log('  [Orchestra] Feedback processed by Internal LLM.');
    }

    public async start(mlTrainingIntervalMs: number = 60000, mlTrainingMaxCycles: number = 0): Promise<void> {
        console.log('[Orchestra] Starting ML Training Daemon...');
        // Start the ML training loop in the background. It manages its own cycles.
        // We don't await it to allow the main orchestra cycles to run concurrently.
        this.mlTrainingDaemon.startTrainingLoop(mlTrainingIntervalMs, mlTrainingMaxCycles).catch(error => {
            console.error('[Orchestra] ML Training Daemon crashed:', error);
            // Implement more robust error handling/restart logic if necessary
        });
        console.log('[Orchestra] ML Training Daemon initiated.');
    }

    private _calculateTruthBaseIntegrity(claims: TruthClaim[]): number {
        if (claims.length === 0) return 0;

        const sumConfidence = claims.reduce((sum, c) => sum + c.confidence, 0);
        const avgConfidence = sumConfidence / claims.length;

        // Check for direct contradictions (simplified, a full check is expensive)
        const hasContradictions = claims.some(c1 => {
            return claims.some(c2 => c1.id !== c2.id && this.internalLLM['internalReasoner']['_isContradiction'](c1, c2));
        });

        let integrity = avgConfidence;
        if (hasContradictions) {
            integrity -= 0.2; // Significant penalty for any contradiction
        }

        // Also factor in distance from center
        const sumDistanceFromCenter = claims.reduce((sum, c) => sum + c.distance_from_center, 0);
        const avgDistanceFromCenter = sumDistanceFromCenter / claims.length;
        integrity -= (avgDistanceFromCenter / 100) * 0.1; // Small penalty for being far from center

        return Math.max(0, Math.min(1, integrity));
    }
}