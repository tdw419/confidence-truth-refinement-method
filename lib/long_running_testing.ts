import { TruthManagementSystem, TruthClaim } from './truth_management_system';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Long-Running Behavior Testing Framework for CTRM
 * This framework monitors and analyzes system behavior over extended periods
 * to detect drift, contradiction accumulation, confidence calibration, and meta-learning convergence
 */
export class LongRunningTester {
    private tms: TruthManagementSystem;
    private testId: string;
    private startTime: Date;
    private metrics: any[];
    private config: {
        maxIterations: number;
        testInterval: number; // in milliseconds
        monitoringThresholds: {
            driftWarningThreshold: number;
            contradictionAccumulationThreshold: number;
            confidenceCalibrationTolerance: number;
            metaLearningStabilityThreshold: number;
        };
    };

    constructor(tms: TruthManagementSystem, testId: string = 'default_test') {
        this.tms = tms;
        this.testId = testId;
        this.startTime = new Date();
        this.metrics = [];
        this.config = {
            maxIterations: 1000,
            testInterval: 300000, // 5 minutes
            monitoringThresholds: {
                driftWarningThreshold: 10, // distance_from_center increase warning
                contradictionAccumulationThreshold: 5, // max contradictions before warning
                confidenceCalibrationTolerance: 0.15, // acceptable confidence variance
                metaLearningStabilityThreshold: 0.85 // stability score for convergence
            }
        };
    }

    /**
     * Start the long-running test
     */
    public async startTest(): Promise<void> {
        console.log(`🚀 Starting Long-Running Test: ${this.testId}`);
        console.log(`📊 Initial State: ${this.getCurrentStateSummary()}`);

        // Run initial baseline measurements
        this.captureBaselineMetrics();

        // Start monitoring loop
        for (let iteration = 1; iteration <= this.config.maxIterations; iteration++) {
            console.log(`\n🔄 Iteration ${iteration}/${this.config.maxIterations}`);

            // Capture current metrics
            const currentMetrics = this.captureCurrentMetrics(iteration);

            // Analyze for potential issues
            this.analyzeForDrift(currentMetrics);
            this.analyzeForContradictions(currentMetrics);
            this.analyzeConfidenceCalibration(currentMetrics);
            this.analyzeMetaLearningConvergence(currentMetrics);

            // Store metrics
            this.metrics.push(currentMetrics);

            // Save progress periodically
            if (iteration % 10 === 0) {
                this.saveTestProgress();
            }

            // Simulate test interval delay
            await this.delay(this.config.testInterval);

            // Check for early termination conditions
            if (this.shouldTerminateEarly(currentMetrics)) {
                console.log(`⏹️  Early termination triggered at iteration ${iteration}`);
                break;
            }
        }

        // Generate final report
        this.generateFinalReport();
    }

    /**
     * Capture baseline metrics at the start of testing
     */
    private captureBaselineMetrics(): void {
        const baseline = {
            timestamp: new Date().toISOString(),
            iteration: 0,
            totalClaims: this.tms.getAllClaims().length,
            averageConfidence: this.calculateAverageConfidence(),
            averageDistance: this.calculateAverageDistance(),
            contradictionCount: this.countContradictions(),
            metaLearningStability: 0, // Will be calculated during testing
            systemHealthScore: 1.0 // Start with perfect health
        };

        this.metrics.push(baseline);
        console.log('📋 Baseline Metrics Captured:', JSON.stringify(baseline, null, 2));
    }

    /**
     * Capture current metrics for analysis
     */
    private captureCurrentMetrics(iteration: number): any {
        const allClaims = this.tms.getAllClaims();

        return {
            timestamp: new Date().toISOString(),
            iteration: iteration,
            totalClaims: allClaims.length,
            averageConfidence: this.calculateAverageConfidence(),
            averageDistance: this.calculateAverageDistance(),
            maxDistance: Math.max(...allClaims.map(c => c.distance_from_center), 0),
            minDistance: Math.min(...allClaims.map(c => c.distance_from_center), 100),
            confidenceDistribution: this.calculateConfidenceDistribution(),
            distanceDistribution: this.calculateDistanceDistribution(),
            contradictionCount: this.countContradictions(),
            verificationSuccessRate: this.calculateVerificationSuccessRate(),
            systemHealthScore: this.calculateSystemHealthScore(),
            metaLearningStability: this.calculateMetaLearningStability()
        };
    }

    /**
     * Analyze system for drift (increasing distance_from_center over time)
     */
    private analyzeForDrift(currentMetrics: any): void {
        if (this.metrics.length < 2) return;

        const baseline = this.metrics[0];
        const distanceIncrease = currentMetrics.averageDistance - baseline.averageDistance;

        if (distanceIncrease > this.config.monitoringThresholds.driftWarningThreshold) {
            console.warn(`⚠️  DRIFT DETECTED: Average distance increased by ${distanceIncrease.toFixed(2)} (from ${baseline.averageDistance.toFixed(2)} to ${currentMetrics.averageDistance.toFixed(2)})`);

            // Log potential causes
            const highDistanceClaims = this.tms.getAllClaims().filter(c => c.distance_from_center > 80);
            if (highDistanceClaims.length > 0) {
                console.warn(`   High-distance claims (${highDistanceClaims.length}):`);
                highDistanceClaims.slice(0, 3).forEach(claim => {
                    console.warn(`     - ${claim.subject}: ${claim.claim} (dist: ${claim.distance_from_center})`);
                });
            }
        }
    }

    /**
     * Analyze for contradiction accumulation
     */
    private analyzeForContradictions(currentMetrics: any): void {
        if (currentMetrics.contradictionCount > this.config.monitoringThresholds.contradictionAccumulationThreshold) {
            console.warn(`⚠️  CONTRADICTION ACCUMULATION: ${currentMetrics.contradictionCount} contradictions detected`);

            // Find and log the most contradictory claims
            const contradictoryClaims = this.findContradictoryClaims();
            if (contradictoryClaims.length > 0) {
                console.warn(`   Sample contradictions:`);
                contradictoryClaims.slice(0, 2).forEach(pair => {
                    console.warn(`     - ${pair.claim1.subject} vs ${pair.claim2.subject}`);
                });
            }
        }
    }

    /**
     * Analyze confidence calibration (are high-confidence claims actually more accurate?)
     */
    private analyzeConfidenceCalibration(currentMetrics: any): void {
        // This would require historical data and verification outcomes
        // For now, implement a basic check

        const highConfidenceClaims = this.tms.getAllClaims().filter(c => c.confidence >= 0.85);
        const mediumConfidenceClaims = this.tms.getAllClaims().filter(c => c.confidence >= 0.60 && c.confidence < 0.85);

        if (highConfidenceClaims.length > 0 && mediumConfidenceClaims.length > 0) {
            const avgHighConfDistance = highConfidenceClaims.reduce((sum, c) => sum + c.distance_from_center, 0) / highConfidenceClaims.length;
            const avgMediumConfDistance = mediumConfidenceClaims.reduce((sum, c) => sum + c.distance_from_center, 0) / mediumConfidenceClaims.length;

            // High confidence claims should generally be closer to center
            const distanceDifference = avgMediumConfDistance - avgHighConfDistance;

            if (distanceDifference < -this.config.monitoringThresholds.confidenceCalibrationTolerance) {
                console.warn(`⚠️  CONFIDENCE CALIBRATION ISSUE: High-confidence claims are farther from center than medium-confidence claims`);
                console.warn(`   Avg high-conf distance: ${avgHighConfDistance.toFixed(2)}, Avg medium-conf distance: ${avgMediumConfDistance.toFixed(2)}`);
            }
        }
    }

    /**
     * Analyze meta-learning convergence and stability
     */
    private analyzeMetaLearningConvergence(currentMetrics: any): void {
        if (currentMetrics.iteration < 10) return; // Need some history

        const recentMetrics = this.metrics.slice(-5); // Last 5 iterations
        const stabilityScores = recentMetrics.map(m => m.metaLearningStability);

        // Calculate stability trend
        const avgStability = stabilityScores.reduce((sum, score) => sum + score, 0) / stabilityScores.length;
        const stabilityVariance = stabilityScores.reduce((sum, score) => sum + Math.pow(score - avgStability, 2), 0) / stabilityScores.length;

        if (avgStability > this.config.monitoringThresholds.metaLearningStabilityThreshold &&
            stabilityVariance < 0.05) {
            console.log(`🎯 META-LEARNING CONVERGENCE: System appears to be stabilizing (avg stability: ${avgStability.toFixed(2)})`);
        } else if (stabilityVariance > 0.15) {
            console.warn(`⚠️  META-LEARNING OSCILLATION: System showing unstable learning patterns (variance: ${stabilityVariance.toFixed(2)})`);
        }
    }

    /**
     * Calculate whether early termination is needed
     */
    private shouldTerminateEarly(currentMetrics: any): boolean {
        // Terminate if system health drops below critical threshold
        if (currentMetrics.systemHealthScore < 0.3) {
            return true;
        }

        // Terminate if contradiction accumulation is severe
        if (currentMetrics.contradictionCount > this.config.monitoringThresholds.contradictionAccumulationThreshold * 3) {
            return true;
        }

        return false;
    }

    /**
     * Generate comprehensive final report
     */
    private generateFinalReport(): void {
        const endTime = new Date();
        const durationMinutes = (endTime.getTime() - this.startTime.getTime()) / (1000 * 60);

        console.log('\n' + '='.repeat(80));
        console.log('📊 LONG-RUNNING BEHAVIOR TEST - FINAL REPORT');
        console.log('='.repeat(80));
        console.log(`Test ID: ${this.testId}`);
        console.log(`Duration: ${durationMinutes.toFixed(1)} minutes`);
        console.log(`Iterations: ${this.metrics.length}`);
        console.log(`Final System Health: ${this.metrics[this.metrics.length - 1].systemHealthScore.toFixed(2)}`);

        // Key findings
        const initialMetrics = this.metrics[0];
        const finalMetrics = this.metrics[this.metrics.length - 1];

        console.log('\n📈 KEY METRICS CHANGE:');
        console.log(`  Total Claims: ${initialMetrics.totalClaims} → ${finalMetrics.totalClaims} (Δ: ${finalMetrics.totalClaims - initialMetrics.totalClaims})`);
        console.log(`  Avg Confidence: ${initialMetrics.averageConfidence.toFixed(2)} → ${finalMetrics.averageConfidence.toFixed(2)}`);
        console.log(`  Avg Distance: ${initialMetrics.averageDistance.toFixed(2)} → ${finalMetrics.averageDistance.toFixed(2)}`);
        console.log(`  Contradictions: ${initialMetrics.contradictionCount} → ${finalMetrics.contradictionCount}`);

        // Emergent behavior analysis
        this.analyzeEmergentBehavior();

        // Save full report
        this.saveFinalReport();

        console.log('\n✅ Test completed. Full report saved to test_results/');
    }

    /**
     * Analyze emergent patterns and behaviors
     */
    private analyzeEmergentBehavior(): void {
        console.log('\n🔍 EMERGENT BEHAVIOR ANALYSIS:');

        // 1. Confidence patterns
        const confidenceTrends = this.analyzeConfidenceTrends();
        console.log(`  Confidence Trends: ${confidenceTrends}`);

        // 2. Distance patterns
        const distanceTrends = this.analyzeDistanceTrends();
        console.log(`  Distance Trends: ${distanceTrends}`);

        // 3. Subject clustering
        const subjectClusters = this.analyzeSubjectClustering();
        console.log(`  Subject Clusters: ${subjectClusters.join(', ')}`);

        // 4. Agent behavior patterns
        const agentPatterns = this.analyzeAgentPatterns();
        console.log(`  Agent Patterns: ${agentPatterns}`);
    }

    /**
     * Save test progress to file
     */
    private saveTestProgress(): void {
        const testDir = path.join('test_results', this.testId);
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        const progressFile = path.join(testDir, 'progress.json');
        fs.writeFileSync(progressFile, JSON.stringify(this.metrics, null, 2));
        console.log(`💾 Progress saved to ${progressFile}`);
    }

    /**
     * Save final comprehensive report
     */
    private saveFinalReport(): void {
        const testDir = path.join('test_results', this.testId);
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        const report = {
            testId: this.testId,
            startTime: this.startTime.toISOString(),
            endTime: new Date().toISOString(),
            durationMinutes: (new Date().getTime() - this.startTime.getTime()) / (1000 * 60),
            iterations: this.metrics.length,
            metrics: this.metrics,
            analysis: {
                driftAnalysis: this.analyzeDriftOverTime(),
                contradictionAnalysis: this.analyzeContradictionPatterns(),
                confidenceCalibration: this.analyzeConfidenceCalibrationOverTime(),
                metaLearningAnalysis: this.analyzeMetaLearningPatterns(),
                emergentBehavior: this.getEmergentBehaviorSummary()
            }
        };

        const reportFile = path.join(testDir, 'final_report.json');
        fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
        console.log(`📄 Final report saved to ${reportFile}`);
    }

    // =========================================================================
    // HELPER METHODS FOR METRIC CALCULATIONS
    // =========================================================================

    private calculateAverageConfidence(): number {
        const claims = this.tms.getAllClaims();
        if (claims.length === 0) return 0;
        const sum = claims.reduce((total, claim) => total + claim.confidence, 0);
        return sum / claims.length;
    }

    private calculateAverageDistance(): number {
        const claims = this.tms.getAllClaims();
        if (claims.length === 0) return 0;
        const sum = claims.reduce((total, claim) => total + claim.distance_from_center, 0);
        return sum / claims.length;
    }

    private calculateConfidenceDistribution(): { [key: string]: number } {
        const claims = this.tms.getAllClaims();
        const distribution: { [key: string]: number } = {
            'high': 0,    // >= 0.85
            'medium': 0,  // 0.60-0.84
            'low': 0      // < 0.60
        };

        claims.forEach(claim => {
            if (claim.confidence >= 0.85) distribution.high++;
            else if (claim.confidence >= 0.60) distribution.medium++;
            else distribution.low++;
        });

        return distribution;
    }

    private calculateDistanceDistribution(): { [key: string]: number } {
        const claims = this.tms.getAllClaims();
        const distribution: { [key: string]: number } = {
            'core': 0,      // 0-10
            'mid': 0,       // 11-50
            'peripheral': 0 // 51-100
        };

        claims.forEach(claim => {
            if (claim.distance_from_center <= 10) distribution.core++;
            else if (claim.distance_from_center <= 50) distribution.mid++;
            else distribution.peripheral++;
        });

        return distribution;
    }

    private countContradictions(): number {
        const claims = this.tms.getAllClaims();
        let contradictionCount = 0;

        // Simple contradiction counting - compare each claim against others
        for (let i = 0; i < claims.length; i++) {
            for (let j = i + 1; j < claims.length; j++) {
                if (this.isContradiction(claims[i], claims[j])) {
                    contradictionCount++;
                }
            }
        }

        return contradictionCount;
    }

    private calculateVerificationSuccessRate(): number {
        const claims = this.tms.getAllClaims();
        if (claims.length === 0) return 0;

        const totalVerifications = claims.reduce((sum, claim) => sum + (claim.verification_count || 0), 0);
        const totalFailures = claims.reduce((sum, claim) => sum + (claim.failure_count || 0), 0);

        if (totalVerifications + totalFailures === 0) return 0;
        return totalVerifications / (totalVerifications + totalFailures);
    }

    private calculateSystemHealthScore(): number {
        const metrics = this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
        if (!metrics) return 1.0;

        // Health score factors (0-1, where 1 is perfect health)
        const factors = {
            confidenceFactor: Math.min(1, metrics.averageConfidence / 0.9), // Target 0.9 avg confidence
            distanceFactor: Math.min(1, 1 - (metrics.averageDistance / 100)), // Lower distance = better
            contradictionFactor: Math.min(1, 1 - (metrics.contradictionCount / 20)), // Fewer contradictions = better
            stabilityFactor: metrics.metaLearningStability || 0.7 // Default to 0.7 if not calculated
        };

        // Weighted average
        const healthScore = (
            factors.confidenceFactor * 0.3 +
            factors.distanceFactor * 0.25 +
            factors.contradictionFactor * 0.25 +
            factors.stabilityFactor * 0.2
        );

        return Math.max(0, Math.min(1, healthScore)); // Clamp to 0-1 range
    }

    private calculateMetaLearningStability(): number {
        // This would be enhanced with actual meta-learning data
        // For now, use a simple stability metric based on recent changes
        if (this.metrics.length < 3) return 0.7; // Default stability

        const recentMetrics = this.metrics.slice(-3);
        const confidenceChanges = recentMetrics.map(m => m.averageConfidence);
        const distanceChanges = recentMetrics.map(m => m.averageDistance);

        // Calculate variance in recent metrics
        const confidenceVariance = this.calculateVariance(confidenceChanges);
        const distanceVariance = this.calculateVariance(distanceChanges);

        // Lower variance = higher stability
        const stabilityScore = 1 - Math.min(1, confidenceVariance * 0.5 + distanceVariance * 0.3);
        return Math.max(0.5, stabilityScore); // Minimum 0.5 stability
    }

    // =========================================================================
    // ANALYSIS METHODS
    // =========================================================================

    private analyzeDriftOverTime(): any {
        const distanceData = this.metrics.map(m => m.averageDistance);
        const maxDistance = Math.max(...distanceData);
        const minDistance = Math.min(...distanceData);
        const finalDistance = distanceData[distanceData.length - 1];
        const initialDistance = distanceData[0];

        return {
            initial: initialDistance,
            final: finalDistance,
            change: finalDistance - initialDistance,
            range: maxDistance - minDistance,
            trend: finalDistance > initialDistance ? 'increasing' : 'decreasing',
            severity: Math.abs(finalDistance - initialDistance) > 15 ? 'high' : 'low'
        };
    }

    private analyzeContradictionPatterns(): any {
        const contradictionCounts = this.metrics.map(m => m.contradictionCount);
        const maxContradictions = Math.max(...contradictionCounts);
        const avgContradictions = contradictionCounts.reduce((sum, count) => sum + count, 0) / contradictionCounts.length;

        return {
            average: avgContradictions,
            maximum: maxContradictions,
            trend: contradictionCounts[contradictionCounts.length - 1] > contradictionCounts[0] ? 'increasing' : 'stable',
            severity: maxContradictions > 10 ? 'critical' : maxContradictions > 5 ? 'warning' : 'normal'
        };
    }

    private analyzeConfidenceCalibrationOverTime(): any {
        // This would require more sophisticated analysis with verification outcomes
        // For now, provide basic calibration metrics
        const highConfClaims = this.metrics.map(m => m.confidenceDistribution?.high || 0);
        const mediumConfClaims = this.metrics.map(m => m.confidenceDistribution?.medium || 0);

        return {
            highConfidenceTrend: highConfClaims.length > 1 ? highConfClaims[highConfClaims.length - 1] - highConfClaims[0] : 0,
            mediumConfidenceTrend: mediumConfClaims.length > 1 ? mediumConfClaims[mediumConfClaims.length - 1] - mediumConfClaims[0] : 0,
            calibrationScore: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1].averageConfidence / 0.85 : 0 // Target 0.85 avg
        };
    }

    private analyzeMetaLearningPatterns(): any {
        const stabilityScores = this.metrics.map(m => m.metaLearningStability || 0.7);
        const finalStability = stabilityScores[stabilityScores.length - 1];
        const initialStability = stabilityScores[0];

        return {
            initialStability: initialStability,
            finalStability: finalStability,
            improvement: finalStability - initialStability,
            convergence: finalStability > 0.8 ? 'converging' : 'still learning',
            oscillation: this.calculateVariance(stabilityScores) > 0.05 ? 'detected' : 'stable'
        };
    }

    private getEmergentBehaviorSummary(): any {
        return {
            confidencePatterns: this.analyzeConfidenceTrends(),
            distancePatterns: this.analyzeDistanceTrends(),
            subjectClusters: this.analyzeSubjectClustering(),
            agentPatterns: this.analyzeAgentPatterns()
        };
    }

    private analyzeConfidenceTrends(): string {
        const confidenceData = this.metrics.map(m => m.averageConfidence);
        const trend = confidenceData[confidenceData.length - 1] - confidenceData[0];

        if (trend > 0.1) return 'Overall confidence increasing significantly';
        if (trend > 0.05) return 'Overall confidence increasing moderately';
        if (trend < -0.1) return 'Overall confidence decreasing significantly';
        if (trend < -0.05) return 'Overall confidence decreasing moderately';
        return 'Overall confidence relatively stable';
    }

    private analyzeDistanceTrends(): string {
        const distanceData = this.metrics.map(m => m.averageDistance);
        const trend = distanceData[distanceData.length - 1] - distanceData[0];

        if (trend > 10) return 'System showing significant drift from center';
        if (trend > 5) return 'System showing moderate drift from center';
        if (trend < -5) return 'System becoming more centralized';
        return 'Distance from center relatively stable';
    }

    private analyzeSubjectClustering(): string[] {
        const claims = this.tms.getAllClaims();
        const subjectCounts: { [subject: string]: number } = {};

        claims.forEach(claim => {
            subjectCounts[claim.subject] = (subjectCounts[claim.subject] || 0) + 1;
        });

        // Find top 3 subjects
        const sortedSubjects = Object.entries(subjectCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([subject, count]) => `${subject} (${count})`);

        return sortedSubjects;
    }

    private analyzeAgentPatterns(): string {
        const claims = this.tms.getAllClaims();
        const agentCounts: { [agent: string]: number } = {};

        claims.forEach(claim => {
            agentCounts[claim.agent] = (agentCounts[claim.agent] || 0) + 1;
        });

        const topAgent = Object.entries(agentCounts).sort((a, b) => b[1] - a[1])[0];
        return topAgent ? `Dominant agent: ${topAgent[0]} (${topAgent[1]} claims)` : 'No dominant agent';
    }

    // =========================================================================
    // UTILITY METHODS
    // =========================================================================

    private findContradictoryClaims(): { claim1: TruthClaim, claim2: TruthClaim }[] {
        const claims = this.tms.getAllClaims();
        const contradictions: { claim1: TruthClaim, claim2: TruthClaim }[] = [];

        for (let i = 0; i < claims.length && contradictions.length < 5; i++) {
            for (let j = i + 1; j < claims.length && contradictions.length < 5; j++) {
                if (this.isContradiction(claims[i], claims[j])) {
                    contradictions.push({ claim1: claims[i], claim2: claims[j] });
                }
            }
        }

        return contradictions;
    }

    private isContradiction(claim1: TruthClaim, claim2: TruthClaim): boolean {
        // Basic contradiction detection (same as in TruthManagementSystem)
        const lowerClaim1 = claim1.claim.toLowerCase();
        const lowerClaim2 = claim2.claim.toLowerCase();

        // Simple negation check
        const negations = ['not', 'never', 'no', 'none', 'cannot', 'does not'];
        const claim1HasNegation = negations.some(neg => lowerClaim1.includes(neg));
        const claim2HasNegation = negations.some(neg => lowerClaim2.includes(neg));

        if (claim1HasNegation !== claim2HasNegation) {
            // Check for similar core concepts
            const commonWords = lowerClaim1.split(/\s+/).filter(word =>
                lowerClaim2.split(/\s/).includes(word) &&
                !negations.includes(word) &&
                word.length > 3
            );

            if (commonWords.length >= 2) {
                return true;
            }
        }

        return false;
    }

    private calculateVariance(values: number[]): number {
        if (values.length === 0) return 0;

        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return variance;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private getCurrentStateSummary(): string {
        const claims = this.tms.getAllClaims();
        return `${claims.length} claims, avg confidence: ${this.calculateAverageConfidence().toFixed(2)}, avg distance: ${this.calculateAverageDistance().toFixed(2)}`;
    }
}