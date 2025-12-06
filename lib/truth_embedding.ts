/**
 * Truth Embedding System - ML Integration for CTRM
 *
 * This module provides numerical representations of truths using embeddings,
 * enabling ML-style operations like similarity calculation and contradiction detection.
 */

import { TruthClaim } from './truth_management_system';
import { OpenAI } from 'openai';

// Interface for truth embeddings
export interface TruthTensor {
    id: string;
    embedding: number[];      // 1536-dimensional vector
    confidence: number;      // Like a neuron's activation
    connections: string[];    // Like synaptic connections
}

// Interface for embedding results
export interface EmbeddingResult {
    truthId: string;
    embedding: number[];
    similarityScore: number;
}

export class TruthEmbeddingSystem {
    private openai: OpenAI;
    private embeddingCache: Map<string, number[]>;

    constructor() {
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
        this.embeddingCache = new Map();
    }

    /**
     * Convert truth to numerical vector (Rule #1: Everything becomes numbers)
     */
    async embedTruth(claim: string): Promise<number[]> {
        // Check cache first
        if (this.embeddingCache.has(claim)) {
            return this.embeddingCache.get(claim)!;
        }

        try {
            const response = await this.openai.embeddings.create({
                model: "text-embedding-3-small",
                input: claim,
                dimensions: 1536
            });

            const embedding = response.data[0].embedding;
            this.embeddingCache.set(claim, embedding);
            return embedding;
        } catch (error) {
            console.error(`[TruthEmbedding] Error creating embedding:`, error);
            // Fallback: create a simple hash-based embedding
            return this.createFallbackEmbedding(claim);
        }
    }

    /**
     * Create a fallback embedding when OpenAI API fails
     */
    private createFallbackEmbedding(claim: string): number[] {
        // Simple hash-based embedding for fallback
        const embedding: number[] = new Array(1536).fill(0);
        for (let i = 0; i < claim.length && i < 1536; i++) {
            embedding[i] = claim.charCodeAt(i) / 255.0; // Normalize to 0-1 range
        }
        return embedding;
    }

    /**
     * Calculate similarity between truths (like neuron activation)
     * Uses cosine similarity
     */
    calculateSimilarity(embedding1: number[], embedding2: number[]): number {
        // Dot product
        const dotProduct = embedding1.reduce((sum, val, i) =>
            sum + val * embedding2[i], 0
        );

        // Magnitudes
        const magnitude1 = Math.sqrt(embedding1.reduce((sum, val) => sum + val * val, 0));
        const magnitude2 = Math.sqrt(embedding2.reduce((sum, val) => sum + val * val, 0));

        // Cosine similarity
        return dotProduct / (magnitude1 * magnitude2);
    }

    /**
     * Find related truths (like finding connected neurons)
     */
    async findRelatedTruths(
        targetClaim: string,
        truthBase: TruthClaim[],
        threshold: number = 0.7
    ): Promise<Array<{truth: TruthClaim, similarity: number}>> {
        const targetEmbedding = await this.embedTruth(targetClaim);

        const similarities = await Promise.all(
            truthBase.map(async (truth) => {
                const truthEmbedding = await this.embedTruth(truth.claim);
                const similarity = this.calculateSimilarity(targetEmbedding, truthEmbedding);

                return { truth, similarity };
            })
        );

        return similarities
            .filter(s => s.similarity >= threshold)
            .sort((a, b) => b.similarity - a.similarity);
    }

    /**
     * Convert truth base to tensor format for ML operations
     */
    async convertToTensors(truthBase: TruthClaim[]): Promise<TruthTensor[]> {
        return Promise.all(
            truthBase.map(async (truth) => {
                const embedding = await this.embedTruth(truth.claim);

                // Find connections (related truths)
                const related = await this.findRelatedTruths(truth.claim, truthBase, 0.6);
                const connections = related.map(r => r.truth.id);

                return {
                    id: truth.id,
                    embedding: embedding,
                    confidence: truth.confidence,
                    connections: connections
                };
            })
        );
    }

    /**
     * Calculate embedding distance (Euclidean distance)
     */
    calculateEmbeddingDistance(embedding1: number[], embedding2: number[]): number {
        return Math.sqrt(
            embedding1.reduce((sum, val, i) =>
                sum + Math.pow(val - embedding2[i], 2), 0
            )
        );
    }

    /**
     * Clear embedding cache
     */
    clearCache(): void {
        this.embeddingCache.clear();
    }
}