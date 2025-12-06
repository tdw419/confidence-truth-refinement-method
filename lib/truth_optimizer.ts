/**
 * Truth Optimizer - ML Optimizer for CTRM
 *
 * This module adjusts confidence scores based on loss, similar to gradient descent
 * in machine learning. It's the "master chef" that adjusts truths to reduce loss.
 */

import { TruthClaim, TruthManagementSystem } from './truth_management_system';
import { TruthLossCalculator } from './truth_loss';
import { InternalLLM } from './internal_llm';
import { LlmService } from './llm_service';
import { TruthEmbeddingSystem } from './truth_embedding';

interface ExtendedTruthClaim extends TruthClaim {
    lastOptimized?: Date;
    optimizationHistory?: Array<{
        loss: number;
        adjustment: number;
        timestamp: Date;
    }>;
}

export interface OptimizationResult {
    truth: TruthClaim;
    originalConfidence: number;
    newConfidence: number;
    loss: number;
    adjustment: number;
}

export class TruthOptimizer {
    private lossCalculator: TruthLossCalculator;
    private learningRate: number = 0.05; // How fast to adjust
    private momentum: number = 0.9; // Momentum for smoother adjustments

    // Accept dependencies to match MLTrainingDaemon constructor, even if not directly used here yet
    constructor(
        private tms: TruthManagementSystem,
        private internalLLM: InternalLLM,
        private externalLLMService: LlmService,
        private embeddingSystem: TruthEmbeddingSystem // Add TruthEmbeddingSystem dependency
    ) {
        this.lossCalculator = new TruthLossCalculator(embeddingSystem); // Pass the dependency
    }

    /**
     * Adjust confidence based on loss (like gradient descent)
     */
    async optimizeTruth(
        truth: TruthClaim,
        truthBase: TruthClaim[]
    ): Promise<OptimizationResult> {
        // Calculate current loss
        const loss = await this.lossCalculator.calculateLoss(
            truth.claim,
            truthBase
        );

        // Calculate adjustment
        const adjustment = this.calculateAdjustment(loss);
        const newConfidence = this.applyAdjustment(
            truth.confidence,
            adjustment
        );

        const extendedTruth: ExtendedTruthClaim = {
            ...truth,
            confidence: newConfidence,
            lastOptimized: new Date(),
            optimizationHistory: [
                ...((truth as any).optimizationHistory || []),
                { loss, adjustment, timestamp: new Date() }
            ]
        };

        return {
            truth: extendedTruth,
            originalConfidence: truth.confidence,
            newConfidence: newConfidence,
            loss: loss,
            adjustment: adjustment
        };
    }

    /**
     * Calculate adjustment based on loss (like gradient descent)
     */
    private calculateAdjustment(loss: number): number {
        // Like gradient descent: move in direction that reduces loss
        // High loss → decrease confidence
        // Low loss → increase confidence

        if (loss > 5.0) {
            return -this.learningRate * (loss / 10.0);
        } else if (loss < 1.0) {
            return this.learningRate * (1.0 - loss);
        }

        return 0; // No change for moderate loss
    }

    /**
     * Apply adjustment to confidence
     */
    private applyAdjustment(
        currentConfidence: number,
        adjustment: number
    ): number {
        const newConfidence = currentConfidence + adjustment;
        return Math.max(0.0, Math.min(1.0, newConfidence)); // Clamp [0,1]
    }

    /**
     * Batch optimization (like mini-batch gradient descent)
     */
    async optimizeBatch(
        truths: TruthClaim[],
        truthBase: TruthClaim[],
        epochs: number = 10
    ): Promise<TruthClaim[]> {
        let optimizedTruths = [...truths];

        for (let epoch = 0; epoch < epochs; epoch++) {
            console.log(`Optimization Epoch ${epoch + 1}/${epochs}`);

            // Optimize each truth
            const results = await Promise.all(
                optimizedTruths.map(truth =>
                    this.optimizeTruth(truth, truthBase)
                )
            );

            optimizedTruths = results.map(r => r.truth);

            // Calculate average loss for monitoring
            const avgLoss = await this.calculateAverageLoss(
                optimizedTruths,
                truthBase
            );

            console.log(`  Average Loss: ${avgLoss.toFixed(3)}`);

            // Early stopping if converged
            if (avgLoss < 0.1) {
                console.log(`  Converged after ${epoch + 1} epochs!`);
                break;
            }
        }

        return optimizedTruths;
    }

    /**
     * Calculate average loss for monitoring
     */
    private async calculateAverageLoss(
        truths: TruthClaim[],
        truthBase: TruthClaim[]
    ): Promise<number> {
        const losses = await Promise.all(
            truths.map(truth =>
                this.lossCalculator.calculateLoss(truth.claim, truthBase)
            )
        );

        return losses.reduce((sum, loss) => sum + loss, 0) / losses.length;
    }

    /**
     * Set learning rate
     */
    setLearningRate(rate: number): void {
        this.learningRate = Math.max(0.001, Math.min(0.5, rate)); // Clamp to reasonable range
    }

    /**
     * Set momentum
     */
    setMomentum(value: number): void {
        this.momentum = Math.max(0.0, Math.min(0.99, value)); // Clamp to reasonable range
    }

    /**
     * Optimize based on contradiction detection
     */
    async optimizeFromContradiction(
        contradiction: any,
        truthBase: TruthClaim[]
    ): Promise<TruthClaim[]> {
        // When a contradiction is found, adjust related truths
        const affectedTruths = this.findRelatedTruths(contradiction, truthBase);

        return this.optimizeBatch(
            affectedTruths,
            truthBase,
            3 // Fewer epochs for contradiction-based optimization
        );
    }

    /**
     * Find truths related to a contradiction
     */
    private findRelatedTruths(
        contradiction: any,
        truthBase: TruthClaim[]
    ): TruthClaim[] {
        // Simple implementation - find truths with similar subjects or claims
        return truthBase.filter(truth =>
            truth.subject === contradiction.subject ||
            truth.claim.includes(contradiction.keyword)
        );
    }
}