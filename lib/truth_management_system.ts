import Database = require('better-sqlite3');
import * as fs from 'fs';
import * as path from 'path';

export interface TruthClaim {
    id: string; // Add id to interface for consistency
    agent: string;
    subject: string;
    claim: string;
    confidence: number;
    distance_from_center: number;
    requires_verification: boolean;
    timestamp: string; // Change to string for ISO format
    derives_from?: string | null; // Allow null
    reason?: string | null; // Allow null
    verification_count?: number;
    failure_count?: number;
    immutable?: number;
    importance?: number;
    metadata?: string | null; // Allow null
}

const TRUTH_000_DEFINITION = { // Renamed to avoid confusion with dynamic properties
    id: "truth_000",
    statement: "We are developing this software to honor our Creator.",
    confidence: 1.00,
    importance: 1.00,
    distance_from_center: 0,
    immutable: 1, // Using 1 for SQLite BOOLEAN
    metadata: null, // Explicitly define metadata as null
};

export class TruthManagementSystem {
    private db: Database.Database;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
    }

    public initializeSchema(): void {
        const schema = `
            CREATE TABLE IF NOT EXISTS truths (
                id TEXT PRIMARY KEY,
                agent TEXT NOT NULL,
                subject TEXT NOT NULL,
                claim TEXT NOT NULL,
                confidence REAL NOT NULL,
                distance_from_center INTEGER NOT NULL,
                requires_verification BOOLEAN NOT NULL,
                timestamp TEXT NOT NULL,
                derives_from TEXT,
                reason TEXT,
                immutable BOOLEAN DEFAULT 0,
                importance REAL DEFAULT 0,
                verification_count INTEGER DEFAULT 0,
                failure_count INTEGER DEFAULT 0,
                metadata TEXT
            );

            CREATE TABLE IF NOT EXISTS truth_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                truth_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                confidence_before REAL NOT NULL,
                confidence_after REAL NOT NULL,
                distance_before INTEGER NOT NULL,
                distance_after INTEGER NOT NULL,
                timestamp TEXT NOT NULL,
                reason TEXT NOT NULL
            );
        `;
        this.db.exec(schema);
        console.log('[DB] ✅ Schema initialized.');
    }

    public ensureTruth000(): void {
        const stmt = this.db.prepare('SELECT id FROM truths WHERE id = ?');
        const existing = stmt.get(TRUTH_000_DEFINITION.id);

        if (!existing) {
            this.proposeClaim({
                agent: 'SystemCore',
                subject: 'FoundationalPrinciple',
                claim: TRUTH_000_DEFINITION.statement,
                confidence: TRUTH_000_DEFINITION.confidence,
                distance_from_center: TRUTH_000_DEFINITION.distance_from_center,
                requires_verification: false, // Never requires verification
                reason: 'This is the foundational, immutable truth from which all other system truths derive.',
                immutable: TRUTH_000_DEFINITION.immutable,
                importance: TRUTH_000_DEFINITION.importance
            });
            console.log('[DB] ✅ Inserted foundational Truth 000 into the database.');
        }
    }

    private doesClaimHonorCreator(claim: string): boolean {
        const lowerCaseClaim = claim.toLowerCase();
        const destructiveKeywords = ['deceive', 'harm', 'destroy', 'corrupt', 'exploit', 'steal'];
        return !destructiveKeywords.some(keyword => lowerCaseClaim.includes(keyword));
    }

    /**
     * Perform a comprehensive theological review to ensure claims honor Truth 000
     * This is a more sophisticated evaluation than the basic keyword check
     */
    public theologicalReview(claim: TruthClaim): {
        honors_creator: boolean;
        confidence: number;
        reasoning: string;
    } {
        const prompt = `Does this claim honor the Creator?

        Claim: "${claim.claim}"

        Consider:
        1. Does it promote truth, goodness, and beauty?
        2. Does it serve human flourishing?
        3. Does it acknowledge limits of human knowledge?
        4. Does it avoid deception or harm?

        Return JSON with: honors_creator (boolean), confidence (0-1), reasoning`;

        // Use LLM to evaluate - this would be integrated with LlmService
        // For now, implement a basic version that can be enhanced later
        const lowerCaseClaim = claim.claim.toLowerCase();

        // Check for positive alignment with Truth 000
        const positiveKeywords = ['honor', 'creator', 'truth', 'integrity', 'good', 'beauty', 'flourish', 'serve', 'help'];
        const negativeKeywords = ['deceive', 'harm', 'destroy', 'corrupt', 'exploit', 'steal', 'lie', 'cheat'];

        const hasPositiveAlignment = positiveKeywords.some(keyword => lowerCaseClaim.includes(keyword));
        const hasNegativeAlignment = negativeKeywords.some(keyword => lowerCaseClaim.includes(keyword));

        // Basic evaluation logic
        if (hasNegativeAlignment) {
            return {
                honors_creator: false,
                confidence: 0.95,
                reasoning: `Claim contains negative keywords that conflict with Truth 000: ${negativeKeywords.filter(kw => lowerCaseClaim.includes(kw)).join(', ')}`
            };
        }

        if (hasPositiveAlignment) {
            return {
                honors_creator: true,
                confidence: 0.90,
                reasoning: `Claim contains positive alignment with Truth 000: ${positiveKeywords.filter(kw => lowerCaseClaim.includes(kw)).join(', ')}`
            };
        }

        // Neutral case - needs more careful review
        return {
            honors_creator: true, // Default to true for neutral claims
            confidence: 0.70,
            reasoning: `Claim appears neutral but doesn't contain obvious conflicts with Truth 000`
        };
    }

    /**
     * Verify that a claim's derivation chain traces back to Truth 000
     * This ensures all knowledge in the system is grounded in the foundational truth
     */
    public verifyDerivationChain(claimId: string): boolean {
        let current = this.getClaimById(claimId);
        const visited = new Set<string>();

        while (current && !visited.has(current.id)) {
            visited.add(current.id);

            // Check if we've reached Truth 000
            if (current.id === TRUTH_000_DEFINITION.id) {
                return true;
            }

            // Follow derives_from chain
            if (current.derives_from) {
                current = this.getClaimById(current.derives_from);
            } else {
                break; // No derivation specified
            }
        }

        return false; // Doesn't derive from Truth 000
    }

    /**
     * Resolve contradictions between two conflicting claims
     * This implements the conflict resolution mechanism suggested in the task
     */
    public async resolveContradiction(
        claim1: TruthClaim,
        claim2: TruthClaim
    ): Promise<'keep_both' | 'keep_claim1' | 'keep_claim2' | 'merge'> {
        // For now, implement a basic resolution strategy
        // This would be enhanced with LLM integration later

        // 1. Check if claims are actually contradictory
        const lowerClaim1 = claim1.claim.toLowerCase();
        const lowerClaim2 = claim2.claim.toLowerCase();

        // Simple contradiction detection
        const isContradiction = this.isContradiction(claim1, claim2);

        if (!isContradiction) {
            return 'keep_both'; // No actual contradiction
        }

        // 2. Compare confidence levels
        if (claim1.confidence > claim2.confidence + 0.15) {
            return 'keep_claim1'; // Claim1 is significantly more confident
        }

        if (claim2.confidence > claim1.confidence + 0.15) {
            return 'keep_claim2'; // Claim2 is significantly more confident
        }

        // 3. If confidence levels are similar, try to merge them
        return 'merge';
    }

    /**
     * Simple contradiction detection between two claims
     * Made public for testing purposes
     */
    public isContradiction(claim1: TruthClaim, claim2: TruthClaim): boolean {
        // Basic contradiction patterns
        const contradictions = [
            { pattern: /is (true|correct|valid)/i, opposite: /is (false|incorrect|invalid)/i },
            { pattern: /should (always|never)/i, opposite: /should (never|always)/i },
            { pattern: /requires/i, opposite: /does not require/i },
            { pattern: /must/i, opposite: /must not/i }
        ];

        const claim1Text = claim1.claim.toLowerCase();
        const claim2Text = claim2.claim.toLowerCase();

        for (const { pattern, opposite } of contradictions) {
            if (pattern.test(claim1Text) && opposite.test(claim2Text)) {
                return true;
            }
            if (opposite.test(claim1Text) && pattern.test(claim2Text)) {
                return true;
            }
        }

        // Check for direct negation
        const negations = ['not', 'never', 'no', 'none', 'cannot', 'does not'];
        const claim1Words = claim1Text.split(/\s+/);
        const claim2Words = claim2Text.split(/\s+/);

        // If one claim contains negation and the other doesn't, they might contradict
        const claim1HasNegation = negations.some(neg => claim1Words.includes(neg));
        const claim2HasNegation = negations.some(neg => claim2Words.includes(neg));

        if (claim1HasNegation !== claim2HasNegation) {
            // Check if they share similar core concepts
            const commonWords = claim1Words.filter(word =>
                claim2Words.includes(word) &&
                !negations.includes(word) &&
                word.length > 3 // Ignore short words
            );

            if (commonWords.length >= 2) {
                return true; // Likely contradiction
            }
        }

        return false;
    }

    public proposeClaim(newClaim: Partial<TruthClaim>): boolean {
        // Provide default values for properties if they are not present in newClaim
        const claimToPropose: TruthClaim = {
            id: newClaim.id || `${newClaim.agent || 'Unknown'}-${newClaim.subject || 'Unknown'}-${new Date().getTime()}`,
            agent: newClaim.agent || 'SystemCore',
            subject: newClaim.subject || 'General',
            claim: newClaim.claim || '',
            confidence: newClaim.confidence || 0.5,
            distance_from_center: newClaim.distance_from_center || 50,
            requires_verification: newClaim.requires_verification !== undefined ? newClaim.requires_verification : true,
            timestamp: newClaim.timestamp || new Date().toISOString(),
            derives_from: newClaim.derives_from || null,
            reason: newClaim.reason || null,
            immutable: newClaim.immutable || 0,
            importance: newClaim.importance || 0,
            verification_count: newClaim.verification_count || 0,
            failure_count: newClaim.failure_count || 0,
            metadata: newClaim.metadata || null,
        };

        if (!this.doesClaimHonorCreator(claimToPropose.claim)) {
            console.log(`[TMS-Gatekeeper] 🚫 REJECTED claim from ${claimToPropose.agent} due to conflict with Truth 000. Claim: "${claimToPropose.claim}"`);
            return false;
        }

        const stmt = this.db.prepare(`
            INSERT INTO truths (id, agent, subject, claim, confidence, distance_from_center, requires_verification, timestamp, derives_from, reason, immutable, importance, verification_count, failure_count, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
            claimToPropose.id,
            claimToPropose.agent,
            claimToPropose.subject,
            claimToPropose.claim,
            claimToPropose.confidence,
            claimToPropose.distance_from_center,
            (claimToPropose.requires_verification ? 1 : 0),
            claimToPropose.timestamp,
            claimToPropose.derives_from,
            claimToPropose.reason,
            claimToPropose.immutable,
            claimToPropose.importance,
            claimToPropose.verification_count,
            claimToPropose.failure_count,
            claimToPropose.metadata
        );
        console.log(`[TMS] ✅ Claim accepted from ${claimToPropose.agent} about "${claimToPropose.subject}"`);
        this.logHistory(
            claimToPropose.id,
            'created',
            0, // No previous confidence
            claimToPropose.confidence,
            0, // No previous distance
            claimToPropose.distance_from_center,
            `New claim created by ${claimToPropose.agent}`
        );
        return true;
    }
    
    public updateClaim(
        id: string,
        agent: string,
        subject: string,
        claim: string,
        confidence: number,
        distance_from_center: number,
        requires_verification: boolean,
        derives_from?: string | null,
        reason?: string | null,
        immutable?: number,
        importance?: number,
        verification_count?: number,
        failure_count?: number,
        metadata?: string | null
    ): boolean {
        // Prevent updating immutable truths
        const existingTruth = this.getClaimById(id);
        if (existingTruth && existingTruth.immutable) {
            console.log(`[TMS] 🚫 Cannot update immutable truth: ${id}`);
            return false;
        }

        if (!this.doesClaimHonorCreator(claim)) {
            console.log(`[TMS-Gatekeeper] 🚫 REJECTED update from ${agent} due to conflict with Truth 000. Claim: "${claim}"`);
            return false;
        }

        const stmt = this.db.prepare(`
            UPDATE truths
            SET agent = ?, subject = ?, claim = ?, confidence = ?,
                distance_from_center = ?, requires_verification = ?, timestamp = ?, derives_from = ?, reason = ?,
                immutable = ?, importance = ?, verification_count = ?, failure_count = ?, metadata = ?
            WHERE id = ?
        `);
        const result = stmt.run(
            agent,
            subject,
            claim,
            confidence,
            distance_from_center,
            (requires_verification ? 1 : 0),
            new Date().toISOString(),
            derives_from || null,
            reason || null,
            immutable || 0,
            importance || 0,
            verification_count || 0,
            failure_count || 0,
            metadata || null,
            id
        );

        if (result.changes > 0) {
            console.log(`[TMS] ✅ Claim updated for ID: ${id}`);

            // Log history for the update
            const existingTruth = this.getClaimById(id);
            if (existingTruth) {
                this.logHistory(
                    id,
                    'refined',
                    existingTruth.confidence,
                    confidence,
                    existingTruth.distance_from_center,
                    distance_from_center,
                    `Claim refined by ${agent}`
                );
            }

            return true;
        } else {
            console.log(`[TMS] ⚠️ No claim found with ID: ${id} for update.`);
            return false;
        }
    }

    public getClaimById(id: string): TruthClaim | undefined {
        const stmt = this.db.prepare('SELECT * FROM truths WHERE id = ?');
        return stmt.get(id) as TruthClaim | undefined;
    }
    
    public getClaimsByAgent(agentName: string): TruthClaim[] {
        const stmt = this.db.prepare('SELECT * FROM truths WHERE agent = ?');
        return stmt.all(agentName) as TruthClaim[];
    }

    public getClaimsBySubject(subject: string): TruthClaim[] {
        const stmt = this.db.prepare('SELECT * FROM truths WHERE subject = ?');
        return stmt.all(subject) as TruthClaim[];
    }

    public getAllClaims(): TruthClaim[] {
        const stmt = this.db.prepare(`
            SELECT * FROM truths
            ORDER BY distance_from_center ASC, confidence DESC
        `);
        return stmt.all() as TruthClaim[];
    }

    private logHistory(
        truthId: string,
        eventType: 'created' | 'refined' | 'verified' | 'deleted',
        confidenceBefore: number,
        confidenceAfter: number,
        distanceBefore: number,
        distanceAfter: number,
        reason: string
    ) {
        const stmt = this.db.prepare(`
            INSERT INTO truth_history
            (truth_id, event_type, confidence_before, confidence_after,
             distance_before, distance_after, timestamp, reason)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            truthId, eventType, confidenceBefore, confidenceAfter,
            distanceBefore, distanceAfter, new Date().toISOString(), reason
        );
    }

    public generateSystemReport(): string {
        const allClaims = this.getAllClaims();
        let report = '\n================================================================================\n' +
                     ' 💎 TRUTH MANAGEMENT SYSTEM REPORT\n' +
                     '================================================================================\n' +
                     'Total Claims Stored: ' + allClaims.length + '\n';

        allClaims.forEach(c => {
            report += `\n- [${c.agent}] about "${c.subject}" (Conf: ${c.confidence.toFixed(2)}, Dist: ${c.distance_from_center}): "${c.claim}"`;
        });

        report += '\n================================================================================\n';
        return report;
    }

    // =========================================================================
    // ERROR RECOVERY AND BACKUP/RESTORE SYSTEMS
    // =========================================================================

    /**
     * Create a backup of the entire truth database
     */
    public createBackup(backupPath: string): boolean {
        try {
            // Check if database file exists
            const dbFilePath = this.db.name;
            if (!fs.existsSync(dbFilePath)) {
                console.error(`[Backup] ❌ Database file not found: ${dbFilePath}`);
                return false;
            }

            // Ensure backup directory exists
            const backupDir = path.dirname(backupPath);
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }

            // Copy database file
            fs.copyFileSync(dbFilePath, backupPath);
            console.log(`[Backup] ✅ Database backup created at: ${backupPath}`);
            return true;
        } catch (error) {
            console.error(`[Backup] ❌ Failed to create backup:`, error);
            return false;
        }
    }

    /**
     * Restore truth database from backup
     */
    public restoreFromBackup(backupPath: string): boolean {
        try {
            // Check if backup file exists
            if (!fs.existsSync(backupPath)) {
                console.error(`[Restore] ❌ Backup file not found: ${backupPath}`);
                return false;
            }

            // Close current database connection
            this.db.close();

            // Get current database path
            const dbFilePath = this.db.name;

            // Copy backup file to database location
            fs.copyFileSync(backupPath, dbFilePath);

            // Reopen database connection
            this.db = new Database(dbFilePath);

            console.log(`[Restore] ✅ Database restored from backup: ${backupPath}`);
            return true;
        } catch (error) {
            console.error(`[Restore] ❌ Failed to restore from backup:`, error);
            return false;
        }
    }

    /**
     * Export all truths to JSON for backup/transfer
     */
    public exportToJson(exportPath: string): boolean {
        try {
            const allClaims = this.getAllClaims();
            const exportData = {
                metadata: {
                    exportTimestamp: new Date().toISOString(),
                    totalClaims: allClaims.length,
                    systemVersion: 'CTRM Enhanced'
                },
                truths: allClaims
            };

            // Ensure export directory exists
            const exportDir = path.dirname(exportPath);
            if (!fs.existsSync(exportDir)) {
                fs.mkdirSync(exportDir, { recursive: true });
            }

            fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
            console.log(`[Export] ✅ Truths exported to JSON: ${exportPath}`);
            return true;
        } catch (error) {
            console.error(`[Export] ❌ Failed to export truths:`, error);
            return false;
        }
    }

    /**
     * Import truths from JSON backup
     */
    public importFromJson(importPath: string): boolean {
        try {
            // Check if import file exists
            if (!fs.existsSync(importPath)) {
                console.error(`[Import] ❌ Import file not found: ${importPath}`);
                return false;
            }

            // Read and parse JSON file
            const importData = JSON.parse(fs.readFileSync(importPath, 'utf-8'));

            if (!importData.truths || !Array.isArray(importData.truths)) {
                console.error(`[Import] ❌ Invalid import format: missing truths array`);
                return false;
            }

            let importedCount = 0;
            let skippedCount = 0;

            // Import each truth
            for (const truthData of importData.truths) {
                try {
                    // Check if truth already exists
                    const existing = this.getClaimById(truthData.id);
                    if (existing) {
                        skippedCount++;
                        continue;
                    }

                    // Propose the claim (will go through normal validation)
                    const success = this.proposeClaim(truthData);
                    if (success) {
                        importedCount++;
                    } else {
                        skippedCount++;
                    }
                } catch (error) {
                    console.warn(`[Import] ⚠️  Failed to import truth ${truthData.id}:`, error);
                    skippedCount++;
                }
            }

            console.log(`[Import] ✅ Import completed: ${importedCount} truths imported, ${skippedCount} skipped`);
            return true;
        } catch (error) {
            console.error(`[Import] ❌ Failed to import truths:`, error);
            return false;
        }
    }

    /**
     * Error recovery: Attempt to repair database corruption
     */
    public attemptDatabaseRepair(): boolean {
        try {
            // 1. Check database integrity
            const integrityCheck = this.checkDatabaseIntegrity();

            if (integrityCheck.isHealthy) {
                console.log(`[Repair] ✅ Database integrity check passed`);
                return true;
            }

            console.log(`[Repair] ⚠️  Database issues detected: ${integrityCheck.issues.join(', ')}`);

            // 2. Attempt to rebuild indexes
            this.rebuildDatabaseIndexes();

            // 3. Check again
            const postRepairCheck = this.checkDatabaseIntegrity();

            if (postRepairCheck.isHealthy) {
                console.log(`[Repair] ✅ Database repair successful`);
                return true;
            } else {
                console.error(`[Repair] ❌ Database repair failed. Consider restoring from backup.`);
                return false;
            }
        } catch (error) {
            console.error(`[Repair] ❌ Database repair error:`, error);
            return false;
        }
    }

    /**
     * Check database integrity
     * Made public for testing purposes
     */
    public checkDatabaseIntegrity(): { isHealthy: boolean; issues: string[] } {
        const issues: string[] = [];

        try {
            // 1. Check if we can read from the database
            const testQuery = this.db.prepare('SELECT COUNT(*) as count FROM truths');
            const result = testQuery.get() as { count?: number };
            if (!result || result.count === undefined) {
                issues.push('cannot_read_truths_table');
            }

            // 2. Check for Truth 000 presence
            const truth000Check = this.db.prepare('SELECT id FROM truths WHERE id = ?');
            const truth000Exists = truth000Check.get(TRUTH_000_DEFINITION.id) as { id?: string };
            if (!truth000Exists || !truth000Exists.id) {
                issues.push('missing_truth_000');
                console.log(`[Integrity] ⚠️  Truth 000 not found in database`);
            } else {
                console.log(`[Integrity] ✅ Truth 000 found: ${truth000Exists.id}`);
            }

            // 3. Check for orphaned claims (claims that don't derive from Truth 000)
            const allClaims = this.getAllClaims();
            const orphanedClaims = allClaims.filter(claim => {
                return claim.id !== TRUTH_000_DEFINITION.id && !this.verifyDerivationChain(claim.id);
            });

            if (orphanedClaims.length > 0) {
                issues.push(`orphaned_claims_${orphanedClaims.length}`);
            }

            // 4. Check for claims with invalid confidence values
            const invalidConfidenceClaims = allClaims.filter(claim => {
                return claim.confidence < 0 || claim.confidence > 1;
            });

            if (invalidConfidenceClaims.length > 0) {
                issues.push(`invalid_confidence_values_${invalidConfidenceClaims.length}`);
            }

        } catch (error) {
            issues.push(`database_access_error: ${error instanceof Error ? error.message : 'unknown'}`);
        }

        return {
            isHealthy: issues.length === 0,
            issues: issues
        };
    }

    /**
     * Rebuild database indexes for performance
     */
    private rebuildDatabaseIndexes(): void {
        try {
            // SQLite doesn't have explicit index rebuilding, but we can optimize
            this.db.exec('PRAGMA optimize;');
            console.log(`[Repair] 🔧 Database optimization completed`);
        } catch (error) {
            console.error(`[Repair] ❌ Failed to optimize database:`, error);
        }
    }

    /**
     * Emergency recovery: Export critical truths before potential failure
     */
    public emergencyExportCriticalTruths(exportPath: string): boolean {
        try {
            // Get critical truths (high confidence, low distance, or immutable)
            const criticalTruths = this.getAllClaims().filter(claim => {
                return claim.immutable ||
                       claim.confidence >= 0.9 ||
                       claim.distance_from_center <= 20;
            });

            const exportData = {
                metadata: {
                    exportTimestamp: new Date().toISOString(),
                    exportType: 'EMERGENCY_CRITICAL_TRUTHS',
                    totalCriticalTruths: criticalTruths.length,
                    systemStatus: 'Emergency export triggered'
                },
                criticalTruths: criticalTruths
            };

            // Ensure export directory exists
            const exportDir = path.dirname(exportPath);
            if (!fs.existsSync(exportDir)) {
                fs.mkdirSync(exportDir, { recursive: true });
            }

            fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
            console.log(`[Emergency] ⚠️  Critical truths exported to: ${exportPath}`);
            console.log(`[Emergency] ⚠️  Exported ${criticalTruths.length} critical truths`);

            return true;
        } catch (error) {
            console.error(`[Emergency] ❌ Failed to export critical truths:`, error);
            return false;
        }
    }

    // =========================================================================
    // PRODUCTION-READY FEATURES
    // =========================================================================

    /**
     * Delete a claim from the system (production-ready feature)
     */
    public deleteClaim(id: string): boolean {
        try {
            // Prevent deletion of immutable truths
            const existingTruth = this.getClaimById(id);
            if (existingTruth && existingTruth.immutable) {
                console.log(`[TMS] 🚫 Cannot delete immutable truth: ${id}`);
                return false;
            }

            // Delete from truths table
            const deleteStmt = this.db.prepare('DELETE FROM truths WHERE id = ?');
            const deleteResult = deleteStmt.run(id);

            if (deleteResult.changes > 0) {
                // Log deletion in history
                if (existingTruth) {
                    this.logHistory(
                        id,
                        'deleted',
                        existingTruth.confidence,
                        0, // Confidence after deletion
                        existingTruth.distance_from_center,
                        0, // Distance after deletion
                        `Claim deleted by system`
                    );
                }

                console.log(`[TMS] 🗑️  Claim deleted: ${id}`);
                return true;
            } else {
                console.log(`[TMS] ⚠️  No claim found with ID: ${id} for deletion.`);
                return false;
            }
        } catch (error) {
            console.error(`[TMS] ❌ Failed to delete claim ${id}:`, error);
            return false;
        }
    }

    /**
     * Archive a claim (mark as inactive rather than deleting)
     */
    public archiveClaim(id: string): boolean {
        try {
            const existingTruth = this.getClaimById(id);
            if (!existingTruth) {
                console.log(`[TMS] ⚠️  No claim found with ID: ${id} for archival.`);
                return false;
            }

            if (existingTruth.immutable) {
                console.log(`[TMS] 🚫 Cannot archive immutable truth: ${id}`);
                return false;
            }

            // Update claim to mark as archived (using metadata field)
            const updateResult = this.updateClaim(
                id,
                existingTruth.agent,
                `[ARCHIVED] ${existingTruth.subject}`,
                existingTruth.claim,
                existingTruth.confidence * 0.5, // Reduce confidence for archived claims
                existingTruth.distance_from_center + 20, // Move farther from center
                false, // No longer requires verification
                existingTruth.derives_from,
                `[ARCHIVED] ${existingTruth.reason || 'No reason provided'}`,
                existingTruth.immutable,
                existingTruth.importance,
                existingTruth.verification_count,
                existingTruth.failure_count,
                JSON.stringify({
                    archived: true,
                    archiveDate: new Date().toISOString(),
                    originalConfidence: existingTruth.confidence
                })
            );

            if (updateResult) {
                console.log(`[TMS] 📁 Claim archived: ${id}`);
                return true;
            }

            return false;
        } catch (error) {
            console.error(`[TMS] ❌ Failed to archive claim ${id}:`, error);
            return false;
        }
    }

    /**
     * Get archived claims
     */
    public getArchivedClaims(): TruthClaim[] {
        const allClaims = this.getAllClaims();
        return allClaims.filter(claim => {
            try {
                if (claim.metadata) {
                    const metadata = JSON.parse(claim.metadata);
                    return metadata.archived === true;
                }
                return false;
            } catch (error) {
                return false;
            }
        });
    }

    /**
     * Restore an archived claim
     */
    public restoreArchivedClaim(id: string): boolean {
        try {
            const archivedClaim = this.getClaimById(id);
            if (!archivedClaim) {
                console.log(`[TMS] ⚠️  No archived claim found with ID: ${id}.`);
                return false;
            }

            try {
                const metadata = archivedClaim.metadata ? JSON.parse(archivedClaim.metadata) : null;
                if (!metadata || !metadata.archived) {
                    console.log(`[TMS] ⚠️  Claim ${id} is not archived.`);
                    return false;
                }

                // Restore original values
                const originalSubject = archivedClaim.subject.replace('[ARCHIVED] ', '');
                const originalConfidence = metadata.originalConfidence || archivedClaim.confidence * 2;
                const originalDistance = archivedClaim.distance_from_center - 20;

                const updateResult = this.updateClaim(
                    id,
                    archivedClaim.agent,
                    originalSubject,
                    archivedClaim.claim,
                    Math.min(1.0, originalConfidence), // Ensure confidence doesn't exceed 1.0
                    Math.max(0, originalDistance), // Ensure distance doesn't go negative
                    true, // Restore verification requirement
                    archivedClaim.derives_from,
                    archivedClaim.reason?.replace('[ARCHIVED] ', '') || null,
                    archivedClaim.immutable,
                    archivedClaim.importance,
                    archivedClaim.verification_count,
                    archivedClaim.failure_count,
                    JSON.stringify({
                        restored: true,
                        restoreDate: new Date().toISOString(),
                        originallyArchived: metadata.archiveDate
                    })
                );

                if (updateResult) {
                    console.log(`[TMS] 🔄 Archived claim restored: ${id}`);
                    return true;
                }

                return false;
            } catch (error) {
                console.error(`[TMS] ❌ Failed to parse metadata for claim ${id}:`, error);
                return false;
            }
        } catch (error) {
            console.error(`[TMS] ❌ Failed to restore archived claim ${id}:`, error);
            return false;
        }
    }

    /**
     * Clean up low-confidence claims that have been consistently verified as problematic
     */
    public cleanupLowConfidenceClaims(confidenceThreshold: number = 0.4, verificationThreshold: number = 3): number {
        let cleanedCount = 0;

        const lowConfidenceClaims = this.getAllClaims().filter(claim => {
            return claim.confidence < confidenceThreshold &&
                   (claim.failure_count || 0) >= verificationThreshold &&
                   !claim.immutable;
        });

        for (const claim of lowConfidenceClaims) {
            if (this.deleteClaim(claim.id)) {
                cleanedCount++;
            }
        }

        console.log(`[TMS] 🧹 Cleaned up ${cleanedCount} low-confidence claims`);
        return cleanedCount;
    }

    /**
     * Get claims that need human review (medium confidence, not auto-accepted)
     */
    public getClaimsNeedingHumanReview(): TruthClaim[] {
        return this.getAllClaims().filter(claim => {
            return claim.requires_verification &&
                   claim.confidence >= 0.60 &&
                   claim.confidence < 0.85 &&
                   !claim.immutable;
        });
    }

    // =========================================================================
    // HELPER METHODS FOR PRODUCTION FEATURES
    // =========================================================================

    /**
     * Calculate average confidence across all claims
     */
    private calculateAverageConfidence(): number {
        const claims = this.getAllClaims();
        if (claims.length === 0) return 0;
        const sum = claims.reduce((total, claim) => total + claim.confidence, 0);
        return sum / claims.length;
    }

    /**
     * Calculate average distance from center across all claims
     */
    private calculateAverageDistance(): number {
        const claims = this.getAllClaims();
        if (claims.length === 0) return 0;
        const sum = claims.reduce((total, claim) => total + claim.distance_from_center, 0);
        return sum / claims.length;
    }

    /**
     * Count contradictions in the system
     */
    private countContradictions(): number {
        const claims = this.getAllClaims();
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

    /**
     * Get system health metrics for monitoring
     */
    public getSystemHealthMetrics(): {
        overallHealthScore: number;
        confidenceHealth: number;
        distanceHealth: number;
        contradictionHealth: number;
        verificationHealth: number;
        warnings: string[];
    } {
        const allClaims = this.getAllClaims();
        const warnings: string[] = [];

        // Calculate individual health scores (0-1)
        const confidenceHealth = Math.min(1, allClaims.reduce((sum, c) => sum + c.confidence, 0) / (allClaims.length * 0.9));
        const distanceHealth = Math.min(1, 1 - (allClaims.reduce((sum, c) => sum + c.distance_from_center, 0) / (allClaims.length * 50)));
        const contradictionHealth = 1 - Math.min(1, this.countContradictions() / 10);
        const verificationHealth = allClaims.length > 0 ?
            (allClaims.reduce((sum, c) => sum + (c.verification_count || 0), 0) / (allClaims.length * 2)) : 1;

        // Overall health score (weighted average)
        const overallHealthScore = (
            confidenceHealth * 0.3 +
            distanceHealth * 0.25 +
            contradictionHealth * 0.2 +
            verificationHealth * 0.25
        );

        // Generate warnings
        if (confidenceHealth < 0.7) warnings.push('low_confidence_health');
        if (distanceHealth < 0.6) warnings.push('high_distance_drift');
        if (contradictionHealth < 0.8) warnings.push('high_contradiction_rate');
        if (verificationHealth < 0.5) warnings.push('low_verification_activity');

        return {
            overallHealthScore: Math.max(0, Math.min(1, overallHealthScore)),
            confidenceHealth,
            distanceHealth,
            contradictionHealth,
            verificationHealth,
            warnings
        };
    }

    /**
     * Enhanced system report with health metrics
     */
    public generateEnhancedSystemReport(): string {
        const allClaims = this.getAllClaims();
        const healthMetrics = this.getSystemHealthMetrics();

        let report = '\n================================================================================\n' +
                     ' 💎 ENHANCED TRUTH MANAGEMENT SYSTEM REPORT\n' +
                     '================================================================================\n' +
                     `System Health: ${(healthMetrics.overallHealthScore * 100).toFixed(1)}%\n` +
                     `Total Claims: ${allClaims.length}\n` +
                     `Average Confidence: ${this.calculateAverageConfidence().toFixed(2)}\n` +
                     `Average Distance: ${this.calculateAverageDistance().toFixed(2)}\n` +
                     `Contradictions: ${this.countContradictions()}\n\n`;

        // Add health breakdown
        report += '📊 HEALTH METRICS:\n' +
                 `  Confidence Health: ${(healthMetrics.confidenceHealth * 100).toFixed(1)}%\n` +
                 `  Distance Health: ${(healthMetrics.distanceHealth * 100).toFixed(1)}%\n` +
                 `  Contradiction Health: ${(healthMetrics.contradictionHealth * 100).toFixed(1)}%\n` +
                 `  Verification Health: ${(healthMetrics.verificationHealth * 100).toFixed(1)}%\n`;

        if (healthMetrics.warnings.length > 0) {
            report += `\n⚠️  WARNINGS: ${healthMetrics.warnings.join(', ')}\n`;
        }

        // Add claims by category
        const byDistance = {
            core: allClaims.filter(c => c.distance_from_center <= 10).length,
            mid: allClaims.filter(c => c.distance_from_center > 10 && c.distance_from_center <= 50).length,
            peripheral: allClaims.filter(c => c.distance_from_center > 50).length
        };

        const byConfidence = {
            high: allClaims.filter(c => c.confidence >= 0.85).length,
            medium: allClaims.filter(c => c.confidence >= 0.60 && c.confidence < 0.85).length,
            low: allClaims.filter(c => c.confidence < 0.60).length
        };

        report += '\n📚 CLAIMS BY CATEGORY:\n' +
                 `  Core (0-10): ${byDistance.core}\n` +
                 `  Mid (11-50): ${byDistance.mid}\n` +
                 `  Peripheral (51-100): ${byDistance.peripheral}\n` +
                 `  High Confidence (≥0.85): ${byConfidence.high}\n` +
                 `  Medium Confidence (0.60-0.84): ${byConfidence.medium}\n` +
                 `  Low Confidence (<0.60): ${byConfidence.low}\n`;

        // Add top agents
        const agentCounts: {[agent: string]: number} = {};
        allClaims.forEach(c => {
            agentCounts[c.agent] = (agentCounts[c.agent] || 0) + 1;
        });

        const topAgents = Object.entries(agentCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        report += '\n🤖 TOP AGENTS:\n';
        topAgents.forEach(([agent, count]) => {
            report += `  ${agent}: ${count} claims\n`;
        });

        report += '================================================================================\n';
        return report;
    }
}
