/**
 * Truth Loss Calculator - ML Loss Function for CTRM
 *
 * This module calculates "loss" for truth claims, measuring how "wrong" or contradictory
 * they are relative to the existing truth base, similar to ML loss functions.
 */

import { TruthClaim } from './truth_management_system';
import { TruthEmbeddingSystem } from './truth_embedding';

export interface Contradiction {
    newClaim: string;
    existingTruth: TruthClaim;
    similarity: number;
    severity: number;
}

export class TruthLossCalculator {
    private embeddingSystem: TruthEmbeddingSystem;

    constructor(embeddingSystem: TruthEmbeddingSystem) {
        this.embeddingSystem = embeddingSystem;
    }

    /**
     * Calculate "loss" for a new claim (how wrong/contradictory it is)
     * Lower is better (like ML)
     */
    async calculateLoss(newClaim: string, truthBase: TruthClaim[]): Promise<number> {
        // 1. Find contradictions (increases loss)
        const contradictions = await this.detectContradictions(newClaim, truthBase);

        // 2. Find supporting truths (decreases loss)
        const supporting = await this.embeddingSystem.findRelatedTruths(
            newClaim,
            truthBase,
            0.8 // High similarity threshold
        );

        // 3. Calculate coherence score
        const coherenceScore = await this.calculateCoherence(newClaim, truthBase);

        // 4. Combine into loss (lower is better)
        const contradictionPenalty = contradictions.length * 10.0;
        const supportBonus = supporting.length * -2.0; // Negative because it's good
        const coherenceBonus = coherenceScore * -5.0;

        const loss = contradictionPenalty + supportBonus + coherenceBonus;

        return Math.max(0, loss); // Loss can't be negative
    }

    /**
     * Detect contradictions using embeddings + LLM
     */
    private async detectContradictions(
        newClaim: string,
        truthBase: TruthClaim[]
    ): Promise<Contradiction[]> {
        // Find semantically similar truths
        const similar = await this.embeddingSystem.findRelatedTruths(
            newClaim,
            truthBase,
            0.6 // Medium similarity - might contradict
        );

        // Check each similar truth for contradiction
        const contradictions: Contradiction[] = [];

        for (const {truth, similarity} of similar) {
            const isContradiction = await this.checkContradiction(
                newClaim,
                truth.claim
            );

            if (isContradiction) {
                contradictions.push({
                    newClaim,
                    existingTruth: truth,
                    similarity,
                    severity: this.calculateSeverity(similarity)
                });
            }
        }

        return contradictions;
    }

    /**
     * Check if two claims contradict each other
     */
    private async checkContradiction(claim1: string, claim2: string): Promise<boolean> {
        // Simple contradiction detection using embeddings
        const embedding1 = await this.embeddingSystem.embedTruth(claim1);
        const embedding2 = await this.embeddingSystem.embedTruth(claim2);

        // High similarity but opposite meaning = contradiction
        const similarity = this.embeddingSystem.calculateSimilarity(embedding1, embedding2);
        const distance = this.embeddingSystem.calculateEmbeddingDistance(embedding1, embedding2);

        // If very similar but not identical, might be contradiction
        return similarity > 0.7 && distance > 0.5;
    }

    /**
     * Calculate severity of contradiction
     */
    private calculateSeverity(similarity: number): number {
        // More similar contradictions are more severe
        return Math.min(1.0, similarity * 1.2);
    }

    /**
     * Calculate coherence score (how well the claim fits with truth base)
     */
    private async calculateCoherence(claim: string, truthBase: TruthClaim[]): Promise<number> {
        // Simple coherence calculation based on average similarity to truth base
        if (truthBase.length === 0) return 0.5;

        // Calculate average similarity to all truths
        const embeddings = await Promise.all([
            this.embeddingSystem.embedTruth(claim),
            ...truthBase.map(truth => this.embeddingSystem.embedTruth(truth.claim))
        ]);

        const claimEmbedding = embeddings[0];
        const truthEmbeddings = embeddings.slice(1);

        const similarities = truthEmbeddings.map(truthEmbedding =>
            this.embeddingSystem.calculateSimilarity(claimEmbedding, truthEmbedding)
        );

        const avgSimilarity = similarities.reduce((sum, val) => sum + val, 0) / similarities.length;

        // Normalize to 0-1 range
        return Math.min(1.0, Math.max(0.0, avgSimilarity));
    }

    /**
     * Calculate loss for entire truth base (system health metric)
     */
    async calculateSystemLoss(truthBase: TruthClaim[]): Promise<number> {
        if (truthBase.length === 0) return 0;

        // Calculate pairwise contradictions
        let totalLoss = 0;
        const processedPairs = new Set<string>();

        for (let i = 0; i < truthBase.length; i++) {
            for (let j = i + 1; j < truthBase.length; j++) {
                const pairKey = `${truthBase[i].id}-${truthBase[j].id}`;
                if (!processedPairs.has(pairKey)) {
                    processedPairs.add(pairKey);

                    const loss = await this.calculateLoss(truthBase[i].claim, [truthBase[j]]);
                    totalLoss += loss;
                }
            }
        }

        // Average loss per truth pair
        const pairCount = truthBase.length * (truthBase.length - 1) / 2;
        return totalLoss / Math.max(1, pairCount);
    }
}