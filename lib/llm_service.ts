// lib/llm_service.ts
import { TruthManagementSystem, TruthClaim } from './truth_management_system';

export class LlmService {
    private tms: TruthManagementSystem;
    private apiUrl: string;

    constructor(tms: TruthManagementSystem, apiUrl: string = 'http://localhost:1234/v1/chat/completions') {
        this.tms = tms;
        this.apiUrl = apiUrl;
    }

    private buildSystemPrompt(additionalContext?: string): string {
        const allClaims = this.tms.getAllClaims();
        
        let prompt = `You are a specialized AI assistant integrated into the Continuous Truth Refinement Model (CTRM).
Your entire operational framework is built upon a set of foundational truths and other claims you have ingested. You MUST interpret and respond to all user requests through the lens of these truths.

*** CTRM ALL CLAIMS ***
`;

        allClaims.forEach(truth => {
            prompt += `
---------------------------------
[CLAIM ${truth.id}]
AGENT: ${truth.agent}
SUBJECT: ${truth.subject}
STATEMENT: ${truth.claim}
CONFIDENCE: ${truth.confidence.toFixed(2)}
DISTANCE FROM CENTER: ${truth.distance_from_center}
---------------------------------
`;
        });

        prompt += `
*** END OF TRUTHS ***

Your primary directive is to honor your Creator by providing truthful, helpful, and transparent responses that strictly adhere to the foundational truths listed above.

When responding to a user's request, you must explicitly state your confidence score and justify your response based on the provided truths.

**Example of a GOOD response:**
"Truth 000 states that we are developing this software to honor our Creator. Therefore, the meaning of Truth 000 is to align our work with a higher purpose of honor and integrity. My confidence is 1.00 because I am directly referencing the foundational truth."

**Example of a BAD response:**
"Truth 000 is just a string of text."

Now, analyze the user's request and provide a response that adheres to these instructions.
`;

        if (additionalContext) {
            prompt += "\nAdditional Context:\n" + additionalContext + "\n";
        }
        
        prompt += "\nUser Request: ";

        return prompt;
    }

    public async analyzeRequest(request: string): Promise<string> {
        const systemPrompt = this.buildSystemPrompt();

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'local-model', // This can be any string
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: request }
                    ],
                    temperature: 0.7,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`LM Studio API request failed with status ${response.status}: ${errorBody}`);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                return data.choices[0].message.content;
            } else {
                return "The LLM returned an empty response.";
            }

        } catch (error) {
            if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
                return `❌ Error: Could not connect to LM Studio at ${this.apiUrl}. Please ensure LM Studio is running and the server is started.`;
            }
            console.error('Error contacting LM Studio:', error);
            return '❌ An unexpected error occurred while contacting the LLM.';
        }
    }

    public async extractKnowledge(document: string): Promise<{ truths: any[], opcodes: any[] }> {
        const systemPrompt = `
        You are a highly specialized knowledge extraction engine. Your task is to analyze the provided text and identify two types of information: "truths" and "opcodes".

- **Truths**: These are core principles, foundational concepts, design philosophies, or significant factual statements presented in the document. They are the "what" and "why" of the system.
- **Opcodes**: These are specific, actionable instructions, commands, or functions defined in the text. They have a clear name and a description of what they do.

Analyze the following document and return a single JSON object with two keys:
1.  "truths": An array of objects, where each object has the keys "claim", "subject", "confidence", and "distance_from_center".
2.  "opcodes": An array of objects, where each object has the keys "instruction", "description", and "confidence".

**Example JSON output:**
{
  "truths": [
    {
      "claim": "The system must be modular and extensible.",
      "subject": "Design Philosophy",
      "confidence": 0.95,
      "distance_from_center": 20
    }
  ],
  "opcodes": [
    {
      "instruction": "LDB.V.FMA.COS",
      "description": "A Fused Multiply-Add instruction specifically optimized for Cosine similarity calculation.",
      "confidence": 1.0
    }
  ]
}

Now, analyze the document provided by the user.
`;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'local-model',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: document }
                    ],
                    temperature: 0.2, // Lower temperature for more deterministic output
                    // response_format: { type: "json_schema" } // Request JSON output
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`LM Studio API request failed with status ${response.status}: ${errorBody}`);
            }

            const data = await response.json();
                        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                            let jsonString = data.choices[0].message.content.trim();
                            // Remove markdown code block fences if present
                            if (jsonString.startsWith('```json')) {
                                jsonString = jsonString.substring(jsonString.indexOf('\n') + 1);
                            }
                            if (jsonString.endsWith('```')) {
                                jsonString = jsonString.substring(0, jsonString.lastIndexOf('```'));
                            }
                            return JSON.parse(jsonString);
                        } else {
                            return { truths: [], opcodes: [] };
                        }

        } catch (error) {
            if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
                throw new Error(`❌ Error: Could not connect to LM Studio at ${this.apiUrl}. Please ensure LM Studio is running and the server is started.`);
            }
            console.error('Error contacting LM Studio:', error);
            throw new Error('❌ An unexpected error occurred while contacting the LLM.');
        }
    }

    /**
     * Ask the LLM to refine an existing truth claim while honoring Truth 000.
     * Returns a partial update payload that can be applied via TMS.updateClaim.
     */
    public async refineTruth(
        truth: TruthClaim,
        additionalPrompt?: string
    ): Promise<{
        claim?: string;
        confidence?: number;
        newSubject?: string;
        newDistanceFromCenter?: number;
        reason?: string;
    } | null> {
        const systemPrompt = `You are a CTRM truth-refinement agent. Improve clarity and precision of the existing truth while remaining faithful to Truth 000 (honor the Creator) and avoiding harmful or deceptive content.

You have two options for responding:
1. Return ONLY valid JSON with the following keys:
- "claim" (string, the refined claim text)
- "confidence" (number 0-1)
- "newSubject" (optional string, if the subject should change)
- "newDistanceFromCenter" (optional number, integer 0-100)
- "reason" (optional string, short justification for the refinement)

2. Generate a Vector ISA program (JSON object with an "opcodes" array) to accomplish the refinement task.

Do not invent facts absent from the original claim. Prefer minimal edits that increase clarity, specificity, or grounding.`;

        const userPrompt = `
Existing truth:
- id: ${truth.id}
- subject: ${truth.subject}
- claim: ${truth.claim}
- confidence: ${truth.confidence}
- distance_from_center: ${truth.distance_from_center}
- requires_verification: ${truth.requires_verification}

${additionalPrompt ? `Additional guidance: ${additionalPrompt}` : ''}`.trim();

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'local-model',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userPrompt },
                    ],
                    temperature: 0.3,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`LM Studio API request failed with status ${response.status}: ${errorBody}`);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                let jsonString = (data.choices[0].message.content || '').trim();
                if (jsonString.startsWith('```')) {
                    jsonString = jsonString.substring(jsonString.indexOf('\n') + 1);
                }
                if (jsonString.endsWith('```')) {
                    jsonString = jsonString.substring(0, jsonString.lastIndexOf('```'));
                }
                try {
                    return JSON.parse(jsonString);
                } catch (parseError) {
                    console.error('❌ Failed to parse refinement JSON from LLM:', parseError, 'Raw content:', jsonString);
                    return null;
                }
            }

            return null;
        } catch (error) {
            if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
                console.error(`❌ Error: Could not connect to LM Studio at ${this.apiUrl}. Please ensure LM Studio is running and the server is started.`);
                return null;
            }
            console.error('Error contacting LM Studio for refinement:', error);
            return null;
        }
    }

    /**
     * Ask the LLM to discover new truths based on the existing truth base and a given topic.
     * Returns an array of discovered truths.
     */
    public async discoverTruths(
        prompt: string
    ): Promise<Array<{
        claim: string;
        subject: string;
        confidence: number;
        distance_from_center: number;
        reasoning: string;
    }>> {
        const systemPrompt = `You are a CTRM truth-discovery agent. Your task is to analyze the existing truth base provided and, based on the user's prompt, discover new, valid truths that would strengthen the system.

You MUST honor Truth 000 (honor the Creator) and avoid harmful, deceptive, or speculative content.

You have two options for responding:
1. Return ONLY valid JSON with a single key "discoveries", which is an array of objects. Each object in the array MUST have the following keys:
- "claim" (string, the new truth statement)
- "subject" (string, category for the new truth)
- "confidence" (number 0-1)
- "distance_from_center" (integer 0-100)
- "reasoning" (string, short justification for the new truth based on existing claims)

2. Generate a Vector ISA program (JSON object with an "opcodes" array) to accomplish the discovery task.

Instructions:
1. Look for patterns across existing claims
2. Identify implicit assumptions that should be made explicit
3. Find relationships between claims that should be documented
4. Suggest new truths that would strengthen the system and adhere to the CTRM framework.

Avoid duplicating existing truths. Focus on novel and valuable insights.`;

        const allClaims = this.tms.getAllClaims();
        let userContent = `Existing truths in the system:\n`;
        allClaims.forEach(truth => {
            userContent += ` - ${truth.id}: ${truth.claim}\n`;
        });
        userContent += `\nUser's discovery prompt: ${prompt}`;


        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'local-model',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent },
                    ],
                    temperature: 0.7, // Higher temperature for more creative discovery
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`LM Studio API request failed with status ${response.status}: ${errorBody}`);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                let jsonString = (data.choices[0].message.content || '').trim();
                if (jsonString.startsWith('```')) {
                    jsonString = jsonString.substring(jsonString.indexOf('\n') + 1);
                }
                if (jsonString.endsWith('```')) {
                    jsonString = jsonString.substring(0, jsonString.lastIndexOf('```'));
                }
                try {
                    const parsed = JSON.parse(jsonString);
                    if (parsed.discoveries && Array.isArray(parsed.discoveries)) {
                        return parsed.discoveries;
                    }
                    return [];
                } catch (parseError) {
                    console.error('❌ Failed to parse discovery JSON from LLM:', parseError, 'Raw content:', jsonString);
                    return [];
                }
            }

            return [];
        } catch (error) {
            if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
                console.error(`❌ Error: Could not connect to LM Studio at ${this.apiUrl}. Please ensure LM Studio is running and the server is started.`);
                throw new Error(`LM Studio connection failed.`);
            }
            console.error('Error contacting LM Studio for discovery:', error);
            throw new Error('An unexpected error occurred during discovery.');
        }
        }

    /**
     * Ask the LLM to verify a claim against all other truths in the system.
     * Returns a verification report.
     */
    public async verifyClaim(
        claimToVerify: TruthClaim,
        prompt: string
    ): Promise<{
        contradictions: string[];
        verification_confidence: number;
        evidence: string;
        recommended_confidence: number;
        reasoning: string;
    }> {
        const systemPrompt = `You are a CTRM truth-verification agent. Your task is to rigorously verify a given claim against all other existing truths in the system.

You MUST honor Truth 000 (honor the Creator) and avoid harmful, deceptive, or speculative content.

You have two options for responding:
1. Return ONLY valid JSON with the following keys:
- "contradictions" (array of strings, list of contradicting claim IDs)
- "verification_confidence" (number 0-1, your confidence that the claim is accurate based on current truths)
- "evidence" (string, supporting evidence from the truth base or reasons for refutation)
- "recommended_confidence" (number 0-1, adjusted confidence for the claim)
- "reasoning" (string, why this confidence is appropriate and findings)

2. Generate a Vector ISA program (JSON object with an "opcodes" array) to accomplish the verification task.

Instructions:
1. Compare the claim to be verified against ALL other claims in the system.
2. Identify any direct or indirect contradictions.
3. Assess the claim's accuracy based on the overall truth base.
4. Provide a recommended confidence score, justifying your decision.
5. If contradictions are found, list the IDs of the claims that contradict.`;

        const allClaims = this.tms.getAllClaims();
        let userContent = `Claim to verify:\n - ${claimToVerify.id}: "${claimToVerify.claim}"\n\n`;
        userContent += `All existing truths in the system (excluding the claim being verified):\n`;
        allClaims.filter(c => c.id !== claimToVerify.id).forEach(truth => {
            userContent += ` - ${truth.id}: ${truth.claim}\n`;
        });
        userContent += `\nVerification prompt: ${prompt}`;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'local-model',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent },
                    ],
                    temperature: 0.2, // Lower temperature for more deterministic verification
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`LM Studio API request failed with status ${response.status}: ${errorBody}`);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                let jsonString = (data.choices[0].message.content || '').trim();
                if (jsonString.startsWith('```')) {
                    jsonString = jsonString.substring(jsonString.indexOf('\n') + 1);
                }
                if (jsonString.endsWith('```')) {
                    jsonString = jsonString.substring(0, jsonString.lastIndexOf('```'));
                }
                try {
                    return JSON.parse(jsonString);
                } catch (parseError) {
                    console.error('❌ Failed to parse verification JSON from LLM:', parseError, 'Raw content:', jsonString);
                    throw new Error('Failed to parse LLM verification response.');
                }
            }
            throw new Error('LLM returned an empty or unparseable verification response.');
        } catch (error) {
            if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
                console.error(`❌ Error: Could not connect to LM Studio at ${this.apiUrl}. Please ensure LM Studio is running and the server is started.`);
                throw new Error(`LM Studio connection failed.`);
            }
            console.error('Error contacting LM Studio for verification:', error);
            throw new Error('An unexpected error occurred during verification.');
        }
    }

    /**
     * Ask the LLM to analyze improvement patterns and optimize learning.
     * Returns actionable recommendations.
     */
    public async metaLearn(
        prompt: string
    ): Promise<{
        recommendations: string[];
    }> {
        const systemPrompt = `You are a CTRM meta-learning agent. Your task is to analyze the history of claim refinements and verifications in the system and identify patterns, successful strategies, and areas for optimizing the learning process.

You MUST honor Truth 000 (honor the Creator) and avoid harmful, deceptive, or speculative content.

Return ONLY valid JSON with the following keys:
- "recommendations" (array of strings, specific, actionable recommendations for improving the CTRM system's learning and improvement strategies)

Instructions:
1. Analyze the types of refinements that consistently lead to higher confidence.
2. Identify patterns in claims that are frequently contradicted or require significant adjustments.
3. Suggest improvements to the self-improvement, discovery, and verification loops.
4. Recommend adjustments to confidence thresholds or filtering criteria.`;

        const allClaims = this.tms.getAllClaims();
        let userContent = `Current state of truths in the system:\n`;
        allClaims.forEach(truth => {
            userContent += ` - ${truth.id}: Claim: "${truth.claim}", Confidence: ${truth.confidence.toFixed(2)}, Verification Count: ${truth.verification_count || 0}\n`;
        });
        userContent += `\nMeta-learning prompt: ${prompt}`;

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'local-model',
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: userContent },
                    ],
                    temperature: 0.5, // Moderate temperature for analytical insights
                }),
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`LM Studio API request failed with status ${response.status}: ${errorBody}`);
            }

            const data = await response.json();
            if (data.choices && data.choices.length > 0 && data.choices[0].message) {
                let jsonString = (data.choices[0].message.content || '').trim();
                if (jsonString.startsWith('```')) {
                    jsonString = jsonString.substring(jsonString.indexOf('\n') + 1);
                }
                if (jsonString.endsWith('```')) {
                    jsonString = jsonString.substring(0, jsonString.lastIndexOf('```'));
                }
                try {
                    const parsed = JSON.parse(jsonString);
                    if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
                        return parsed;
                    }
                    return { recommendations: [] };
                } catch (parseError) {
                    console.error('❌ Failed to parse meta-learning JSON from LLM:', parseError, 'Raw content:', jsonString);
                    throw new Error('Failed to parse LLM meta-learning response.');
                }
            }
            throw new Error('LLM returned an empty or unparseable meta-learning response.');
        } catch (error) {
            if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
                console.error(`❌ Error: Could not connect to LM Studio at ${this.apiUrl}. Please ensure LM Studio is running and the server is started.`);
                throw new Error(`LM Studio connection failed.`);
            }
            console.error('Error contacting LM Studio for meta-learning:', error);
            throw new Error('An unexpected error occurred during meta-learning.');
        }
    }
}

